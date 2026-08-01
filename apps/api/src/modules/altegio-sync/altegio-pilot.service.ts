import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeStatus, ShiftStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AltegioB2bClient, isAltegioInvalidCredentialsError } from './altegio-b2b.client';
import {
  ALTEGIO_SHIFT_SOURCE,
  HITEAM_SHIFT_SOURCE,
  defaultSyncWindow,
  formatDateOnly,
  groupHiteamShiftsForAltegioPush,
  matchEmployeeToAltegioStaff,
  mergeLocalTimeOnDate,
  normalizeAltegioEmail,
  normalizeAltegioPhone,
  parseDateOnlyToUtc,
  splitAltegioStaffName,
  syntheticAltegioEmail,
} from './altegio-sync.helpers';

const MAX_PILOT_LOCATIONS = 3;

@Injectable()
export class AltegioPilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly altegio: AltegioB2bClient,
  ) {}

  async authorize(tenantId: string, createdByUserId: string, login: string, password: string) {
    if (!this.altegio.hasPartnerToken()) {
      throw new ServiceUnavailableException('ALTEGIO_PARTNER_TOKEN is not configured.');
    }
    let identity: Awaited<ReturnType<AltegioB2bClient['authenticateUser']>>;
    try {
      identity = await this.altegio.authenticateUser(login, password);
    } catch (error) {
      // Altegio uses 404 for bad credentials on POST /api/v1/auth. This is an
      // invalid input to the Pilot flow, not an authentication failure of the
      // current HiTeam session (which is the only case represented by 401).
      if (isAltegioInvalidCredentialsError(error)) {
        throw new UnprocessableEntityException('Invalid Altegio login or password.');
      }
      throw error;
    }
    const locations = await this.altegio.listLocations(identity.userToken);
    const connection = await this.prisma.altegioPilotConnection.upsert({
      where: { tenantId },
      update: {
        altegioUserId: identity.id || login.trim(),
        altegioUserName: identity.name,
        altegioUserEmail: identity.email,
        userTokenCiphertext: this.encrypt(identity.userToken),
        createdByUserId,
        lastAuthenticatedAt: new Date(),
        lastError: null,
      },
      create: {
        tenantId,
        altegioUserId: identity.id || login.trim(),
        altegioUserName: identity.name,
        altegioUserEmail: identity.email,
        userTokenCiphertext: this.encrypt(identity.userToken),
        createdByUserId,
      },
    });
    return { connectionId: connection.id, user: { name: identity.name, email: identity.email }, locations };
  }

  async selectLocations(tenantId: string, locationIds: string[]) {
    const selected = [...new Set(locationIds.map((id) => id.trim()).filter(Boolean))];
    if (selected.length < 1 || selected.length > MAX_PILOT_LOCATIONS) {
      throw new BadRequestException(`Select from 1 to ${MAX_PILOT_LOCATIONS} Altegio locations.`);
    }
    const connection = await this.prisma.altegioPilotConnection.findUnique({ where: { tenantId } });
    if (!connection) throw new BadRequestException('Authorize Altegio before selecting locations.');
    const token = this.decrypt(connection.userTokenCiphertext);
    const available = await this.altegio.listLocations(token);
    const byId = new Map(available.map((location) => [location.id, location]));
    if (selected.some((id) => !byId.has(id))) {
      throw new BadRequestException('One or more selected locations are not available to this Altegio user.');
    }
    const company = await this.prisma.company.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
    if (!company) throw new BadRequestException('Create a HiTeam organization before connecting Altegio.');

    await this.prisma.$transaction(async (tx) => {
      await tx.altegioPilotLocation.deleteMany({ where: { connectionId: connection.id, altegioLocationId: { notIn: selected } } });
      for (const altegioLocationId of selected) {
        const remote = byId.get(altegioLocationId)!;
        const existing = await tx.altegioPilotLocation.findUnique({
          where: { connectionId_altegioLocationId: { connectionId: connection.id, altegioLocationId } },
        });
        if (existing) {
          await tx.altegioPilotLocation.update({ where: { id: existing.id }, data: { altegioLocationName: remote.publicName || remote.name } });
          continue;
        }
        const local = await tx.location.upsert({
          where: { tenantId_code: { tenantId, code: `ALT-${altegioLocationId}` } },
          update: { name: remote.publicName || remote.name, address: remote.address || 'Not set yet', country: remote.country, latitude: remote.latitude, longitude: remote.longitude, timezone: remote.timezone || 'UTC' },
          create: {
            tenantId,
            companyId: company.id,
            name: remote.publicName || remote.name,
            code: `ALT-${altegioLocationId}`,
            address: remote.address || 'Not set yet',
            country: remote.country,
            latitude: remote.latitude,
            longitude: remote.longitude,
            timezone: remote.timezone || 'UTC',
          },
        });
        await tx.altegioPilotLocation.create({
          data: { connectionId: connection.id, altegioLocationId, altegioLocationName: remote.publicName || remote.name, hiteamLocationId: local.id },
        });
      }
    });
    // A direct connection is useful only when it imports the chosen locations.
    // Do this after the transaction so staff links and shifts never point to a
    // location binding that was rolled back.
    const sync = await this.sync(tenantId);
    return { ...(await this.status(tenantId)), sync };
  }

  async status(tenantId: string) {
    const connection = await this.prisma.altegioPilotConnection.findUnique({
      where: { tenantId },
      include: { locations: { include: { hiteamLocation: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!connection) return { connected: false, locations: [] };
    return { connected: true, user: { name: connection.altegioUserName, email: connection.altegioUserEmail }, locations: connection.locations.map((location) => ({ id: location.id, altegioLocationId: location.altegioLocationId, name: location.altegioLocationName, hiteamLocation: location.hiteamLocation, staffLastSyncedAt: location.staffLastSyncedAt, scheduleLastSyncedAt: location.scheduleLastSyncedAt, lastError: location.lastError })) };
  }

  async disconnect(tenantId: string) {
    await this.prisma.altegioPilotConnection.deleteMany({ where: { tenantId } });
    return { connected: false };
  }

  async removeLocation(tenantId: string, pilotLocationId: string) {
    const item = await this.prisma.altegioPilotLocation.findFirst({ where: { id: pilotLocationId, connection: { tenantId } } });
    if (!item) throw new BadRequestException('Connected Altegio location was not found.');
    await this.prisma.altegioPilotLocation.delete({ where: { id: item.id } });
    return this.status(tenantId);
  }

  /** Synchronize every selected Pilot location using the encrypted user token.
   * Pilot links, rather than Employee.altegioTeamMemberId, are the source of
   * truth: one HiTeam employee may legitimately work in several salons. */
  async sync(tenantId: string, pilotLocationId?: string) {
    const connection = await this.prisma.altegioPilotConnection.findUnique({
      where: { tenantId },
      include: {
        locations: {
          where: pilotLocationId ? { id: pilotLocationId } : undefined,
          include: { hiteamLocation: { select: { id: true, timezone: true, companyId: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!connection) throw new BadRequestException('Connect Altegio before synchronizing.');
    if (pilotLocationId && connection.locations.length === 0) {
      throw new BadRequestException('Connected Altegio location was not found.');
    }

    const userToken = this.decrypt(connection.userTokenCiphertext);
    const results = [];
    for (const location of connection.locations) {
      try {
        results.push(await this.syncLocation(tenantId, location, userToken));
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
        await this.prisma.altegioPilotLocation.update({ where: { id: location.id }, data: { lastError: message } });
        throw error;
      }
    }
    return { locations: results };
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const locationId = String(payload.company_id || payload.salon_id || payload.location_id || '').trim();
    const resource = String(payload.resource || payload.entity || payload.type || '').trim().toLowerCase();
    if (!locationId || !['staff', 'master', 'schedule'].includes(resource)) {
      return { ok: true, ignored: 'unknown_event' };
    }
    const pilotLocation = await this.prisma.altegioPilotLocation.findFirst({
      where: { altegioLocationId: locationId },
      include: { connection: { select: { tenantId: true } } },
    });
    if (!pilotLocation) return { ok: true, ignored: 'unknown_location' };
    const result = await this.sync(pilotLocation.connection.tenantId, pilotLocation.id);
    return { ok: true, kind: resource, result };
  }

  /** Push a newly created HiTeam employee into every selected Pilot location
   * matching the employee's primary location. Existing staff records are not
   * overwritten: the documented B2B surface exposes staff creation, but no
   * staff profile update operation. Remote profile edits remain authoritative
   * through the staff webhook/full reconciliation path. */
  async pushEmployeeToAltegio(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        primaryLocationId: true,
        user: { select: { email: true } },
      },
    });
    if (!employee) return { skipped: true as const, reason: 'employee_missing_or_inactive' };

    const locations = await this.prisma.altegioPilotLocation.findMany({
      where: { hiteamLocationId: employee.primaryLocationId, connection: { tenantId } },
      include: { connection: { select: { userTokenCiphertext: true } } },
    });
    let created = 0;
    for (const location of locations) {
      const existing = await this.prisma.altegioPilotStaffLink.findFirst({
        where: { pilotLocationId: location.id, employeeId: employee.id },
        select: { id: true },
      });
      if (existing) continue;
      const remote = await this.altegio.createTeamMember({
        locationId: location.altegioLocationId,
        name: `${employee.lastName} ${employee.firstName}`.trim(),
        specialization: 'HiTeam',
        phone: employee.phone,
        email: employee.user.email.endsWith('@users.hiteam.local') ? null : employee.user.email,
        userToken: this.decrypt(location.connection.userTokenCiphertext),
      });
      await this.prisma.altegioPilotStaffLink.upsert({
        where: { pilotLocationId_altegioStaffId: { pilotLocationId: location.id, altegioStaffId: remote.id } },
        update: { employeeId: employee.id },
        create: { pilotLocationId: location.id, altegioStaffId: remote.id, employeeId: employee.id },
      });
      created += 1;
    }
    return { skipped: false as const, created };
  }

  /** Push a changed HiTeam-authored staff-day immediately. Passing an empty
   * day emits schedules_to_delete, so cancelled shifts cannot reappear on the
   * next Altegio pull. */
  async pushShiftDayToAltegio(tenantId: string, employeeId: string, shiftDate: Date) {
    const dayStart = new Date(shiftDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const links = await this.prisma.altegioPilotStaffLink.findMany({
      where: { employeeId, pilotLocation: { connection: { tenantId } } },
      include: {
        pilotLocation: {
          include: {
            connection: { select: { userTokenCiphertext: true } },
            hiteamLocation: { select: { timezone: true } },
          },
        },
      },
    });
    let pushed = 0;
    for (const link of links) {
      const location = link.pilotLocation;
      const shifts = await this.prisma.shift.findMany({
        where: {
          tenantId,
          employeeId,
          locationId: location.hiteamLocationId,
          source: HITEAM_SHIFT_SOURCE,
          status: ShiftStatus.PUBLISHED,
          shiftDate: { gte: dayStart, lt: dayEnd },
        },
        select: { shiftDate: true, startsAt: true, endsAt: true },
      });
      const grouped = groupHiteamShiftsForAltegioPush(
        shifts.map((shift) => ({
          altegioTeamMemberId: link.altegioStaffId,
          shiftDate: shift.shiftDate,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          timeZone: location.hiteamLocation.timezone || 'UTC',
        })),
      );
      await this.altegio.setStaffSchedule({
        locationId: location.altegioLocationId,
        schedulesToSet: grouped.map((item) => ({
          teamMemberId: item.teamMemberId,
          dates: [item.date],
          slots: item.slots,
        })),
        schedulesToDelete: grouped.length
          ? []
          : [{ teamMemberId: link.altegioStaffId, dates: [formatDateOnly(dayStart)] }],
        userToken: this.decrypt(location.connection.userTokenCiphertext),
      });
      pushed += 1;
    }
    return { skipped: false as const, pushed };
  }

  private async syncLocation(
    tenantId: string,
    pilotLocation: {
      id: string;
      altegioLocationId: string;
      hiteamLocationId: string;
      hiteamLocation: { id: string; timezone: string; companyId: string };
    },
    userToken: string,
  ) {
    const [department, position, staff, localEmployees] = await Promise.all([
      this.prisma.department.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.position.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.altegio.listTeamMembers(pilotLocation.altegioLocationId, userToken),
      this.prisma.employee.findMany({
        where: { tenantId, primaryLocationId: pilotLocation.hiteamLocationId },
        select: {
          id: true, firstName: true, lastName: true, phone: true, status: true,
          altegioTeamMemberId: true, user: { select: { email: true } },
          altegioPilotStaffLinks: { where: { pilotLocationId: pilotLocation.id }, select: { altegioStaffId: true } },
        },
      }),
    ]);
    if (!department || !position) throw new BadRequestException('Workspace org setup is incomplete (department/position).');

    const linksByStaff = new Map<string, string>();
    for (const employee of localEmployees) {
      for (const link of employee.altegioPilotStaffLinks) linksByStaff.set(link.altegioStaffId, employee.id);
    }
    const matchable = localEmployees.map((employee) => ({
      id: employee.id,
      altegioTeamMemberId: employee.altegioPilotStaffLinks[0]?.altegioStaffId ?? null,
      phone: employee.phone,
      email: employee.user.email,
    }));
    let importedEmployees = 0;
    let linkedEmployees = 0;
    const linkedLocalEmployeeIds = new Set<string>();
    for (const remote of staff) {
      const matchedId = linksByStaff.get(remote.id) ?? matchEmployeeToAltegioStaff(matchable, remote)?.id;
      let employeeId = matchedId;
      if (!employeeId) {
        employeeId = await this.createPilotEmployee(tenantId, pilotLocation, department.id, position.id, remote);
        importedEmployees += 1;
      } else {
        const name = splitAltegioStaffName(remote.name);
        await this.prisma.employee.update({
          where: { id: employeeId },
          data: { firstName: name.firstName, lastName: name.lastName, phone: normalizeAltegioPhone(remote.phone) ?? undefined, status: remote.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE },
        });
      }
      await this.prisma.altegioPilotStaffLink.upsert({
        where: { pilotLocationId_altegioStaffId: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id } },
        update: { employeeId },
        create: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id, employeeId },
      });
      linkedLocalEmployeeIds.add(employeeId);
      linkedEmployees += 1;
    }

    // Create remote staff only after importing and linking all known staff, so
    // identity matching is stable and a retry cannot create a duplicate.
    let exportedEmployees = 0;
    for (const employee of localEmployees.filter(
      (item) => item.status === EmployeeStatus.ACTIVE && !linkedLocalEmployeeIds.has(item.id),
    )) {
      const created = await this.altegio.createTeamMember({
        locationId: pilotLocation.altegioLocationId,
        name: `${employee.lastName} ${employee.firstName}`.trim(),
        specialization: 'HiTeam', phone: employee.phone,
        email: employee.user.email.endsWith('@users.hiteam.local') ? null : employee.user.email,
        userToken,
      });
      await this.prisma.altegioPilotStaffLink.create({ data: { pilotLocationId: pilotLocation.id, altegioStaffId: created.id, employeeId: employee.id } });
      exportedEmployees += 1;
    }

    const schedule = await this.syncLocationSchedule(tenantId, pilotLocation, userToken);
    await this.prisma.altegioPilotLocation.update({
      where: { id: pilotLocation.id },
      data: { staffLastSyncedAt: new Date(), scheduleLastSyncedAt: new Date(), lastError: null },
    });
    return { altegioLocationId: pilotLocation.altegioLocationId, importedEmployees, linkedEmployees, exportedEmployees, ...schedule };
  }

  private async syncLocationSchedule(tenantId: string, pilotLocation: { id: string; altegioLocationId: string; hiteamLocationId: string; hiteamLocation: { id: string; timezone: string; companyId: string } }, userToken: string) {
    const window = defaultSyncWindow();
    const links = await this.prisma.altegioPilotStaffLink.findMany({
      where: { pilotLocationId: pilotLocation.id, employee: { status: EmployeeStatus.ACTIVE } },
      select: { altegioStaffId: true, employee: { select: { id: true, positionId: true } } },
    });
    const byStaff = new Map(links.map((link) => [link.altegioStaffId, link.employee]));
    const remoteDays = await this.altegio.getStaffSchedule({ locationId: pilotLocation.altegioLocationId, startDate: formatDateOnly(window.from), endDate: formatDateOnly(window.to), staffIds: [...byStaff.keys()], userToken });
    const source = `${ALTEGIO_SHIFT_SOURCE}_PILOT_${pilotLocation.id}`;
    const template = await this.prisma.shiftTemplate.upsert({
      where: { tenantId_code: { tenantId, code: `altegio-pilot-${pilotLocation.id}` } },
      update: {},
      create: { tenantId, name: 'Altegio Pilot Import', code: `altegio-pilot-${pilotLocation.id}`, locationId: pilotLocation.hiteamLocationId, positionId: links[0]?.employee.positionId ?? (await this.prisma.position.findFirstOrThrow({ where: { tenantId }, orderBy: { createdAt: 'asc' } })).id, startsAtLocal: '09:00', endsAtLocal: '18:00', weekDaysJson: '[1,2,3,4,5]', gracePeriodMinutes: 10 },
    });
    const seen = new Set<string>(); let importedShifts = 0;
    for (const day of remoteDays) {
      const employee = byStaff.get(day.teamMemberId); if (!employee) continue;
      for (const slot of day.slots) {
        const startsAt = mergeLocalTimeOnDate(day.date, slot.from, pilotLocation.hiteamLocation.timezone || 'UTC');
        let endsAt = mergeLocalTimeOnDate(day.date, slot.to, pilotLocation.hiteamLocation.timezone || 'UTC');
        const shiftDate = parseDateOnlyToUtc(day.date);
        if (!startsAt || !endsAt || !shiftDate) continue;
        if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
        seen.add(`${employee.id}:${startsAt.toISOString()}`);
        const existing = await this.prisma.shift.findFirst({ where: { tenantId, employeeId: employee.id, source, startsAt } });
        if (existing) await this.prisma.shift.update({ where: { id: existing.id }, data: { endsAt, shiftDate, status: ShiftStatus.PUBLISHED, templateId: template.id, locationId: pilotLocation.hiteamLocationId, positionId: employee.positionId } });
        else await this.prisma.shift.create({ data: { tenantId, templateId: template.id, employeeId: employee.id, locationId: pilotLocation.hiteamLocationId, positionId: employee.positionId, shiftDate, startsAt, endsAt, status: ShiftStatus.PUBLISHED, source } });
        importedShifts += 1;
      }
    }
    const existing = await this.prisma.shift.findMany({ where: { tenantId, source, status: { not: ShiftStatus.CANCELLED }, shiftDate: { gte: window.from, lte: window.to } }, select: { id: true, employeeId: true, startsAt: true } });
    for (const shift of existing) if (!seen.has(`${shift.employeeId}:${shift.startsAt.toISOString()}`)) await this.prisma.shift.update({ where: { id: shift.id }, data: { status: ShiftStatus.CANCELLED } });

    const hiteamShifts = await this.prisma.shift.findMany({ where: { tenantId, locationId: pilotLocation.hiteamLocationId, source: HITEAM_SHIFT_SOURCE, status: ShiftStatus.PUBLISHED, shiftDate: { gte: window.from, lt: window.to }, employee: { altegioPilotStaffLinks: { some: { pilotLocationId: pilotLocation.id } } } }, select: { shiftDate: true, startsAt: true, endsAt: true, employee: { select: { altegioPilotStaffLinks: { where: { pilotLocationId: pilotLocation.id }, select: { altegioStaffId: true } } } } } });
    const grouped = groupHiteamShiftsForAltegioPush(hiteamShifts.flatMap((shift) => shift.employee.altegioPilotStaffLinks.map((link) => ({ altegioTeamMemberId: link.altegioStaffId, shiftDate: shift.shiftDate, startsAt: shift.startsAt, endsAt: shift.endsAt, timeZone: pilotLocation.hiteamLocation.timezone || 'UTC' }))));
    if (grouped.length) await this.altegio.setStaffSchedule({ locationId: pilotLocation.altegioLocationId, schedulesToSet: grouped.map((item) => ({ teamMemberId: item.teamMemberId, dates: [item.date], slots: item.slots })), userToken });
    return { remoteScheduleDays: remoteDays.length, importedShifts, exportedShiftDays: grouped.length };
  }

  private async createPilotEmployee(tenantId: string, pilotLocation: { id: string; altegioLocationId: string; hiteamLocationId: string; hiteamLocation: { companyId: string } }, departmentId: string, positionId: string, staff: import('./altegio-b2b.client').AltegioTeamMember) {
    const name = splitAltegioStaffName(staff.name);
    const email = normalizeAltegioEmail(staff.email) && !staff.email?.endsWith('@users.hiteam.local') ? normalizeAltegioEmail(staff.email)! : syntheticAltegioEmail(`${pilotLocation.id}-${staff.id}`);
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email }, include: { employee: true } });
    if (existing?.employee) return existing.employee.id;
    const role = await this.prisma.role.upsert({ where: { code: 'employee' }, update: {}, create: { code: 'employee', name: 'Employee', description: 'Standard employee access' } });
    const user = await this.prisma.user.create({ data: { tenantId, email, passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10), status: UserStatus.INVITED } });
    await this.prisma.userRole.create({ data: { userId: user.id, roleId: role.id, scopeType: 'tenant', scopeId: tenantId } });
    const employee = await this.prisma.employee.create({ data: { tenantId, userId: user.id, companyId: pilotLocation.hiteamLocation.companyId, departmentId, primaryLocationId: pilotLocation.hiteamLocationId, positionId, employeeNumber: `ALT-${pilotLocation.altegioLocationId}-${staff.id}`.slice(0, 32), firstName: name.firstName, lastName: name.lastName, phone: normalizeAltegioPhone(staff.phone), status: staff.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE, hireDate: new Date() } });
    return employee.id;
  }

  private key() {
    const value = this.config.get<string>('ALTEGIO_PILOT_ENCRYPTION_KEY')?.trim();
    if (!value) throw new ServiceUnavailableException('ALTEGIO_PILOT_ENCRYPTION_KEY is not configured.');
    return createHash('sha256').update(value).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
  }

  private decrypt(value: string) {
    const bytes = Buffer.from(value, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  }
}

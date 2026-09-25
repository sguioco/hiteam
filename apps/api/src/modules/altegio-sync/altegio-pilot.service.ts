import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeStatus, ShiftStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { withBusinessSpan } from '../../observability/tracing';
import { appendWebhookTokenToUrl } from '../billing/altegio-webhook-url';
import {
  AltegioB2bClient,
  AltegioB2bError,
  isAltegioInvalidCredentialsError,
  parseSingleTeamMemberPayload,
  type AltegioTeamMember,
} from './altegio-b2b.client';
import {
  normalizeWebhookResource,
  pilotLocationTraceAttributes,
  pilotSyncTraceAttributes,
  webhookTraceAttributes,
} from './altegio-tracing';
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
  pilotAltegioEmployeeNumber,
  pilotAltegioSyntheticEmail,
  splitAltegioStaffName,
} from './altegio-sync.helpers';

const MAX_PILOT_LOCATIONS = 3;

@Injectable()
export class AltegioPilotService {
  private readonly logger = new Logger(AltegioPilotService.name);

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
        await tx.altegioPilotLocation.upsert({
          where: { connectionId_altegioLocationId: { connectionId: connection.id, altegioLocationId } },
          update: {
            altegioLocationName: remote.publicName || remote.name,
            hiteamLocationId: local.id,
            lastError: null,
          },
          create: {
            connectionId: connection.id,
            altegioLocationId,
            altegioLocationName: remote.publicName || remote.name,
            hiteamLocationId: local.id,
          },
        });
      }
    });
    // A direct connection is useful only when it imports the chosen locations.
    // Do this after the transaction so staff links and shifts never point to a
    // location binding that was rolled back.
    let sync: Awaited<ReturnType<AltegioPilotService['sync']>> | { ok: false; error: string };
    try {
      sync = await this.sync(tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      this.logger.warn(`Pilot location selection saved but initial sync failed for tenant ${tenantId}: ${message}`);
      sync = { ok: false, error: message };
    }
    const webhooks = await this.registerPilotWebhooks(token, selected);
    return { ...(await this.status(tenantId)), sync, webhooks };
  }

  private async registerPilotWebhooks(userToken: string, altegioLocationIds: string[]) {
    const baseWebhookUrl = this.config.get<string>('ALTEGIO_WEBHOOK_URL')?.trim() || '';
    if (!baseWebhookUrl) {
      return altegioLocationIds.map((altegioLocationId) => ({
        altegioLocationId,
        ok: false,
        skipped: 'webhook_url_not_configured' as const,
      }));
    }
    const webhookUrl = appendWebhookTokenToUrl(
      baseWebhookUrl,
      this.config.get<string>('ALTEGIO_CALLBACK_TOKEN')?.trim() || '',
    );

    const results: Array<{
      altegioLocationId: string;
      ok: boolean;
      skipped?: 'webhook_url_not_configured';
      error?: string;
    }> = [];
    for (const altegioLocationId of altegioLocationIds) {
      try {
        await this.altegio.addHooksUrl({
          locationId: altegioLocationId,
          userToken,
          webhookUrl,
          active: true,
          master: true,
        });
        this.logger.log(`Registered Altegio hooks_settings for pilot location ${altegioLocationId}`);
        results.push({ altegioLocationId, ok: true });
      } catch (error) {
        const message =
          error instanceof AltegioB2bError
            ? `altegio_hooks_settings_${error.statusCode}`
            : 'webhook_registration_failed';
        this.logger.warn(
          `Altegio hooks_settings registration failed for pilot location ${altegioLocationId}: ${message}`,
        );
        results.push({ altegioLocationId, ok: false, error: message });
      }
    }
    return results;
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
    return withBusinessSpan(
      'altegio.sync.pilot',
      { 'hiteam.integration.name': 'altegio', 'hiteam.sync.mode': 'pilot' },
      () => this.syncInternal(tenantId, pilotLocationId),
      {
        attributesFromResult: pilotSyncTraceAttributes,
        successEventName: 'altegio.sync.pilot.completed',
      },
    );
  }

  private async syncInternal(tenantId: string, pilotLocationId?: string) {
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
    for (const [index, location] of connection.locations.entries()) {
      try {
        results.push(
          await withBusinessSpan(
            'altegio.sync.pilot.location',
            {
              'hiteam.integration.name': 'altegio',
              'hiteam.sync.mode': 'pilot',
              'hiteam.altegio.location.ordinal': index + 1,
            },
            () => this.syncLocation(tenantId, location, userToken),
            {
              attributesFromResult: pilotLocationTraceAttributes,
              successEventName: 'altegio.sync.pilot.location.completed',
            },
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
        await this.prisma.altegioPilotLocation.update({ where: { id: location.id }, data: { lastError: message } });
        throw error;
      }
    }
    return { locations: results };
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const resource = String(payload.resource || payload.entity || payload.type || '').trim().toLowerCase();
    return withBusinessSpan(
      'altegio.webhook.handle',
      {
        'hiteam.integration.name': 'altegio',
        'hiteam.sync.mode': 'pilot',
        'hiteam.altegio.webhook.resource': normalizeWebhookResource(resource),
      },
      () => this.handleWebhookEventInternal(payload, resource),
      {
        attributesFromResult: webhookTraceAttributes,
        successEventName: 'altegio.webhook.handled',
      },
    );
  }

  private async handleWebhookEventInternal(payload: Record<string, unknown>, resource: string) {
    const locationId = String(payload.company_id || payload.salon_id || payload.location_id || '').trim();
    const resourceId = String(payload.resource_id || payload.staff_id || payload.team_member_id || '').trim();
    const status = String(payload.status || '').trim().toLowerCase();
    if (!locationId || !['staff', 'master', 'schedule'].includes(resource)) {
      return { ok: true, ignored: 'unknown_event' };
    }
    const pilotLocation = await this.prisma.altegioPilotLocation.findFirst({
      where: { altegioLocationId: locationId },
      include: {
        connection: { select: { tenantId: true, userTokenCiphertext: true } },
        hiteamLocation: { select: { id: true, timezone: true, companyId: true } },
      },
    });
    if (!pilotLocation) return { ok: true, ignored: 'unknown_location' };
    const tenantId = pilotLocation.connection.tenantId;

    if (resource === 'staff' || resource === 'master') {
      if (!resourceId) {
        const result = await this.sync(tenantId, pilotLocation.id);
        return { ok: true, kind: resource, result, resourceId: null, mode: 'full' as const };
      }
      const result = await this.handlePilotStaffMemberIncremental(
        tenantId,
        pilotLocation,
        resourceId,
        status,
        payload.data,
      );
      return { ok: true, kind: resource, result, resourceId, mode: 'incremental' as const };
    }

    if (resource === 'schedule') {
      if (!resourceId) {
        const result = await this.sync(tenantId, pilotLocation.id);
        return { ok: true, kind: resource, result, resourceId: null, mode: 'full' as const };
      }
      const result = await this.handlePilotScheduleIncremental(tenantId, pilotLocation, resourceId);
      return { ok: true, kind: resource, result, resourceId, mode: 'incremental' as const };
    }

    return { ok: true, ignored: 'unknown_event', resource };
  }

  /** Reconcile one remote team member for one connected Pilot location and
   * mirror the full sync's import/link/terminate semantics. A deletion or fire
   * in Altegio demotes the linked local employee to INACTIVE; a live staff
   * record is linked to a matching local employee or imported as new. */
  private async handlePilotStaffMemberIncremental(
    tenantId: string,
    pilotLocation: {
      id: string;
      altegioLocationId: string;
      hiteamLocationId: string;
      hiteamLocation: { id: string; timezone: string; companyId: string };
      connection: { userTokenCiphertext: string };
    },
    resourceId: string,
    status: string,
    payloadData?: unknown,
  ) {
    const userToken = this.decrypt(pilotLocation.connection.userTokenCiphertext);
    const remote = await this.fetchPilotRemoteStaffMember(
      pilotLocation.altegioLocationId,
      resourceId,
      status,
      payloadData,
      userToken,
    );
    const existingLink = await this.prisma.altegioPilotStaffLink.findFirst({
      where: { pilotLocationId: pilotLocation.id, altegioStaffId: resourceId },
      select: { employeeId: true, employee: { select: { status: true } } },
    });

    if (!remote || remote.fired || remote.deleted) {
      if (existingLink && existingLink.employee.status !== EmployeeStatus.TERMINATED) {
        await this.prisma.employee.update({
          where: { id: existingLink.employeeId },
          data: { status: EmployeeStatus.INACTIVE },
        });
        return { resourceId, mode: 'incremental' as const, deactivatedLocal: 1 };
      }
      return { resourceId, mode: 'incremental' as const, ignored: 'no_live_local_link' };
    }

    if (existingLink) {
      if (existingLink.employee.status === EmployeeStatus.TERMINATED) {
        return { resourceId, mode: 'incremental' as const, ignored: 'linked_terminated' };
      }
      const name = splitAltegioStaffName(remote.name);
      await this.prisma.employee.update({
        where: { id: existingLink.employeeId },
        data: {
          firstName: name.firstName,
          lastName: name.lastName,
          phone: normalizeAltegioPhone(remote.phone) ?? undefined,
          status: EmployeeStatus.ACTIVE,
        },
      });
      await this.prisma.altegioPilotLocation.update({
        where: { id: pilotLocation.id },
        data: { staffLastSyncedAt: new Date(), lastError: null },
      });
      return { resourceId, mode: 'incremental' as const, linkedLocal: 1 };
    }

    // No link yet: replicate the resolution order of the full sync (employee
    // number for the pilot location, then phone/email) before creating.
    const localEmployees = await this.prisma.employee.findMany({
      where: { tenantId, primaryLocationId: pilotLocation.hiteamLocationId },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        altegioTeamMemberId: true,
        user: { select: { email: true } },
      },
    });
    const matchable = localEmployees.map((employee) => ({
      id: employee.id,
      altegioTeamMemberId: employee.altegioTeamMemberId,
      employeeNumber: employee.employeeNumber,
      phone: employee.phone,
      email: employee.user.email,
    }));
    const matched = matchEmployeeToAltegioStaff(matchable, remote, pilotLocation.altegioLocationId);
    if (matched) {
      const targetStatus = localEmployees.find((employee) => employee.id === matched.id)?.status;
      if (targetStatus === EmployeeStatus.TERMINATED) {
        return { resourceId, mode: 'incremental' as const, ignored: 'matched_terminated' };
      }
      const name = splitAltegioStaffName(remote.name);
      await this.prisma.employee.update({
        where: { id: matched.id },
        data: {
          firstName: name.firstName,
          lastName: name.lastName,
          phone: normalizeAltegioPhone(remote.phone) ?? undefined,
          status: remote.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
        },
      });
      await this.prisma.altegioPilotStaffLink.upsert({
        where: { pilotLocationId_altegioStaffId: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id } },
        update: { employeeId: matched.id },
        create: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id, employeeId: matched.id },
      });
      await this.prisma.altegioPilotLocation.update({
        where: { id: pilotLocation.id },
        data: { staffLastSyncedAt: new Date(), lastError: null },
      });
      return { resourceId, mode: 'incremental' as const, linkedLocal: 1 };
    }

    const [department, position] = await Promise.all([
      this.prisma.department.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.position.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    ]);
    if (!department || !position) throw new BadRequestException('Workspace org setup is incomplete (department/position).');
    const employeeId = await this.createPilotEmployee(tenantId, pilotLocation, department.id, position.id, remote);
    await this.prisma.altegioPilotStaffLink.upsert({
      where: { pilotLocationId_altegioStaffId: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id } },
      update: { employeeId },
      create: { pilotLocationId: pilotLocation.id, altegioStaffId: remote.id, employeeId },
    });
    await this.prisma.altegioPilotLocation.update({
      where: { id: pilotLocation.id },
      data: { staffLastSyncedAt: new Date(), lastError: null },
    });
    return { resourceId, mode: 'incremental' as const, createdLocal: 1 };
  }

  private async fetchPilotRemoteStaffMember(
    altegioLocationId: string,
    resourceId: string,
    status: string,
    payloadData: unknown,
    userToken: string,
  ): Promise<AltegioTeamMember | null> {
    if (status === 'delete') {
      return null;
    }
    if (payloadData && typeof payloadData === 'object') {
      const parsed = parseSingleTeamMemberPayload({ data: [payloadData] }, resourceId);
      if (parsed) {
        return parsed;
      }
    }
    try {
      return await this.altegio.getTeamMember({ locationId: altegioLocationId, teamMemberId: resourceId, userToken });
    } catch (error) {
      if (error instanceof AltegioB2bError && error.statusCode === 404 && !isAltegioInvalidCredentialsError(error)) {
        return null;
      }
      throw error;
    }
  }

  /** Reconcile the schedule of a single team member inside one connected Pilot
   * location, so a schedule webhook no longer re-pulls every staff member. */
  private async handlePilotScheduleIncremental(
    tenantId: string,
    pilotLocation: {
      id: string;
      altegioLocationId: string;
      hiteamLocationId: string;
      hiteamLocation: { id: string; timezone: string; companyId: string };
      connection: { userTokenCiphertext: string };
    },
    resourceId: string,
  ) {
    const userToken = this.decrypt(pilotLocation.connection.userTokenCiphertext);
    const schedule = await this.syncLocationSchedule(tenantId, pilotLocation, userToken, [resourceId]);
    await this.prisma.altegioPilotLocation.update({
      where: { id: pilotLocation.id },
      data: { scheduleLastSyncedAt: new Date(), lastError: null },
    });
    return { resourceId, mode: 'incremental' as const, ...schedule };
  }

  /** Push a created, edited or terminated HiTeam employee into every selected
   * Pilot location matching the employee's primary location. New staff records
   * are created on the remote side, already-linked staff get their display
   * name propagated (Altegio's update surface does not expose phone/email, so
   * those stay Altegio-authoritative through the staff webhook/full
   * reconciliation path). Employees terminated in HiTeam are deactivated
   * (fired) on every remote location they were linked to. */
  async pushEmployeeToAltegio(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        primaryLocationId: true,
        user: { select: { email: true } },
      },
    });
    if (!employee) return { skipped: true as const, reason: 'employee_missing' };

    if (employee.status === EmployeeStatus.TERMINATED) {
      const links = await this.prisma.altegioPilotStaffLink.findMany({
        where: { employeeId: employee.id, pilotLocation: { connection: { tenantId } } },
        include: {
          pilotLocation: { include: { connection: { select: { userTokenCiphertext: true } } } },
        },
      });
      let deactivated = 0;
      for (const link of links) {
        await this.altegio.updateTeamMember({
          locationId: link.pilotLocation.altegioLocationId,
          teamMemberId: link.altegioStaffId,
          fired: true,
          userToken: this.decrypt(link.pilotLocation.connection.userTokenCiphertext),
        });
        deactivated += 1;
      }
      return { skipped: false as const, created: 0, updated: 0, deactivated };
    }

    const locations = await this.prisma.altegioPilotLocation.findMany({
      where: { hiteamLocationId: employee.primaryLocationId, connection: { tenantId } },
      include: { connection: { select: { userTokenCiphertext: true } } },
    });
    let created = 0;
    let updated = 0;
    const name = `${employee.lastName} ${employee.firstName}`.trim();
    for (const location of locations) {
      const existing = await this.prisma.altegioPilotStaffLink.findFirst({
        where: { pilotLocationId: location.id, employeeId: employee.id },
        select: { altegioStaffId: true },
      });
      if (existing) {
        await this.altegio.updateTeamMember({
          locationId: location.altegioLocationId,
          teamMemberId: existing.altegioStaffId,
          name,
          userToken: this.decrypt(location.connection.userTokenCiphertext),
        });
        updated += 1;
        continue;
      }
      const remote = await this.altegio.createTeamMember({
        locationId: location.altegioLocationId,
        name,
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
    return { skipped: false as const, created, updated };
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
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          altegioTeamMemberId: true,
          user: { select: { email: true } },
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
      employeeNumber: employee.employeeNumber,
      phone: employee.phone,
      email: employee.user.email,
    }));
    let importedEmployees = 0;
    let linkedEmployees = 0;
    const linkedLocalEmployeeIds = new Set<string>();
    for (const remote of staff) {
      const matchedId =
        linksByStaff.get(remote.id) ??
        matchEmployeeToAltegioStaff(matchable, remote, pilotLocation.altegioLocationId)?.id;
      if (matchedId && localEmployees.find(employee => employee.id === matchedId)?.status === EmployeeStatus.TERMINATED) continue;
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
    return {
      altegioLocationId: pilotLocation.altegioLocationId,
      remoteStaff: staff.length,
      importedEmployees,
      linkedEmployees,
      exportedEmployees,
      ...schedule,
    };
  }

  private async syncLocationSchedule(
    tenantId: string,
    pilotLocation: { id: string; altegioLocationId: string; hiteamLocationId: string; hiteamLocation: { id: string; timezone: string; companyId: string } },
    userToken: string,
    staffIds?: string[],
  ) {
    const window = defaultSyncWindow();
    const links = await this.prisma.altegioPilotStaffLink.findMany({
      where: {
        pilotLocationId: pilotLocation.id,
        employee: { status: EmployeeStatus.ACTIVE },
        ...(staffIds?.length ? { altegioStaffId: { in: staffIds } } : {}),
      },
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
    const seen = new Set<string>(); let importedShifts = 0; let cancelledShifts = 0;
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
    const existing = await this.prisma.shift.findMany({
      where: {
        tenantId,
        source,
        status: { not: ShiftStatus.CANCELLED },
        shiftDate: { gte: window.from, lte: window.to },
        ...(staffIds?.length ? { employeeId: { in: links.map((link) => link.employee.id) } } : {}),
      },
      select: { id: true, employeeId: true, startsAt: true },
    });
    for (const shift of existing) {
      if (!seen.has(`${shift.employeeId}:${shift.startsAt.toISOString()}`)) {
        await this.prisma.shift.update({ where: { id: shift.id }, data: { status: ShiftStatus.CANCELLED } });
        cancelledShifts += 1;
      }
    }

    const hiteamShifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        locationId: pilotLocation.hiteamLocationId,
        source: HITEAM_SHIFT_SOURCE,
        status: ShiftStatus.PUBLISHED,
        shiftDate: { gte: window.from, lt: window.to },
        employee: {
          altegioPilotStaffLinks: {
            some: {
              pilotLocationId: pilotLocation.id,
              ...(staffIds?.length ? { altegioStaffId: { in: staffIds } } : {}),
            },
          },
        },
      },
      select: { shiftDate: true, startsAt: true, endsAt: true, employee: { select: { altegioPilotStaffLinks: { where: { pilotLocationId: pilotLocation.id }, select: { altegioStaffId: true } } } } },
    });
    const grouped = groupHiteamShiftsForAltegioPush(hiteamShifts.flatMap((shift) => shift.employee.altegioPilotStaffLinks.map((link) => ({ altegioTeamMemberId: link.altegioStaffId, shiftDate: shift.shiftDate, startsAt: shift.startsAt, endsAt: shift.endsAt, timeZone: pilotLocation.hiteamLocation.timezone || 'UTC' }))));
    if (grouped.length) await this.altegio.setStaffSchedule({ locationId: pilotLocation.altegioLocationId, schedulesToSet: grouped.map((item) => ({ teamMemberId: item.teamMemberId, dates: [item.date], slots: item.slots })), userToken });
    return {
      remoteScheduleDays: remoteDays.length,
      importedShifts,
      cancelledShifts,
      exportedShiftDays: grouped.length,
    };
  }

  private async createPilotEmployee(
    tenantId: string,
    pilotLocation: { id: string; altegioLocationId: string; hiteamLocationId: string; hiteamLocation: { companyId: string } },
    departmentId: string,
    positionId: string,
    staff: import('./altegio-b2b.client').AltegioTeamMember,
  ) {
    const name = splitAltegioStaffName(staff.name);
    const employeeNumber = pilotAltegioEmployeeNumber(pilotLocation.altegioLocationId, staff.id);
    const existingEmployee = await this.prisma.employee.findFirst({
      where: { tenantId, employeeNumber },
      select: { id: true },
    });
    if (existingEmployee) return existingEmployee.id;

    const staffEmail = normalizeAltegioEmail(staff.email);
    const email =
      staffEmail && !staffEmail.endsWith('@users.hiteam.local')
        ? staffEmail
        : pilotAltegioSyntheticEmail(pilotLocation.altegioLocationId, staff.id);
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email },
      include: { employee: true },
    });
    if (existingUser?.employee) return existingUser.employee.id;

    const role = await this.prisma.role.upsert({
      where: { code: 'employee' },
      update: {},
      create: { code: 'employee', name: 'Employee', description: 'Standard employee access' },
    });
    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          tenantId,
          email,
          passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
          status: UserStatus.INVITED,
        },
      }));
    if (!existingUser) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: role.id, scopeType: 'tenant', scopeId: tenantId },
      });
    }
    const employee = await this.prisma.employee.create({
      data: {
        tenantId,
        userId: user.id,
        companyId: pilotLocation.hiteamLocation.companyId,
        departmentId,
        primaryLocationId: pilotLocation.hiteamLocationId,
        positionId,
        employeeNumber,
        firstName: name.firstName,
        lastName: name.lastName,
        phone: normalizeAltegioPhone(staff.phone),
        status: staff.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
        hireDate: new Date(),
      },
    });
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

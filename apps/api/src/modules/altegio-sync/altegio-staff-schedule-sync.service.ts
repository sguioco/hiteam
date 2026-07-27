import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EmployeeStatus, ShiftStatus, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AltegioB2bClient, type AltegioTeamMember } from './altegio-b2b.client';
import {
  ALTEGIO_IMPORT_TEMPLATE_CODE,
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
  phoneDigits,
  splitAltegioStaffName,
  syntheticAltegioEmail,
} from './altegio-sync.helpers';

@Injectable()
export class AltegioStaffScheduleSyncService {
  private readonly logger = new Logger(AltegioStaffScheduleSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly altegioB2b: AltegioB2bClient,
  ) {}

  async getStatus(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: {
        altegioLocationId: true,
        altegioApplicationId: true,
        altegioMarketplaceActivatedAt: true,
        altegioStaffLastSyncedAt: true,
        altegioScheduleLastSyncedAt: true,
        altegioSyncLastError: true,
      },
    });

    const [linkedEmployees, totalEmployees, altegioShifts, hiteamShifts] = await Promise.all([
      this.prisma.employee.count({
        where: { tenantId, altegioTeamMemberId: { not: null }, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.employee.count({
        where: { tenantId, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.shift.count({
        where: { tenantId, source: ALTEGIO_SHIFT_SOURCE, status: { not: ShiftStatus.CANCELLED } },
      }),
      this.prisma.shift.count({
        where: { tenantId, source: HITEAM_SHIFT_SOURCE, status: ShiftStatus.PUBLISHED },
      }),
    ]);

    return {
      connected: Boolean(subscription?.altegioLocationId),
      locationId: subscription?.altegioLocationId ?? null,
      applicationId: subscription?.altegioApplicationId ?? null,
      activatedAt: subscription?.altegioMarketplaceActivatedAt?.toISOString() ?? null,
      staffLastSyncedAt: subscription?.altegioStaffLastSyncedAt?.toISOString() ?? null,
      scheduleLastSyncedAt: subscription?.altegioScheduleLastSyncedAt?.toISOString() ?? null,
      lastError: subscription?.altegioSyncLastError ?? null,
      linkedEmployees,
      totalEmployees,
      altegioShifts,
      hiteamPublishedShifts: hiteamShifts,
      b2bConfigured: this.altegioB2b.isConfigured(),
    };
  }

  async syncAll(tenantId: string) {
    const organization = await this.syncOrganization(tenantId);
    const employees = await this.syncEmployees(tenantId);
    const schedule = await this.syncSchedule(tenantId);
    return { organization, employees, schedule };
  }

  async syncOrganization(tenantId: string) {
    const ctx = await this.requireConnectedContext(tenantId);
    const local = await this.prisma.location.findFirst({
      where: { tenantId, id: ctx.primaryLocationId },
      select: {
        address: true,
        latitude: true,
        longitude: true,
      },
    });
    const unconfigured =
      !local ||
      !local.address ||
      local.address === 'Not set yet' ||
      local.address === 'Demo address' ||
      (local.latitude === 0 && local.longitude === 0);
    if (!unconfigured) {
      return { synchronized: false, reason: 'organization_already_configured' };
    }

    const remote = await this.altegioB2b.getLocationProfile(ctx.locationId);
    const address =
      remote.address ||
      [remote.city, remote.country].filter(Boolean).join(', ') ||
      'Not set yet';

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: remote.name,
          timezone: remote.timezone,
        },
      }),
      this.prisma.company.update({
        where: { id: ctx.companyId },
        data: {
          name: remote.name,
          logoUrl: remote.logoUrl,
        },
      }),
      this.prisma.location.update({
        where: { id: ctx.primaryLocationId },
        data: {
          name: remote.publicName || remote.name,
          address,
          country: remote.country,
          latitude: remote.latitude,
          longitude: remote.longitude,
          timezone: remote.timezone,
        },
      }),
    ]);

    return {
      synchronized: true,
      locationId: remote.id,
      companyName: remote.name,
      address,
      timezone: remote.timezone,
    };
  }

  async syncEmployees(tenantId: string) {
    const ctx = await this.requireConnectedContext(tenantId);
    if (!this.altegioB2b.isConfigured()) {
      throw new HttpException(
        { message: 'Altegio B2B tokens are not configured (partner + system user).' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const remoteStaff = await this.altegioB2b.listTeamMembers(ctx.locationId);
      const localEmployees = await this.prisma.employee.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          altegioTeamMemberId: true,
          positionId: true,
          user: { select: { email: true } },
        },
      });

      const matchable = localEmployees.map((employee) => ({
        id: employee.id,
        altegioTeamMemberId: employee.altegioTeamMemberId,
        phone: employee.phone,
        email: employee.user.email,
      }));

      let linked = 0;
      let createdLocal = 0;
      let updatedLocal = 0;
      let createdRemote = 0;
      const usedEmployeeIds = new Set<string>();

      for (const staff of remoteStaff) {
        const matched = matchEmployeeToAltegioStaff(matchable, {
          id: staff.id,
          phone: staff.phone,
          email: staff.email,
        });

        if (matched) {
          usedEmployeeIds.add(matched.id);
          const { firstName, lastName } = splitAltegioStaffName(staff.name);
          await this.prisma.employee.update({
            where: { id: matched.id },
            data: {
              altegioTeamMemberId: staff.id,
              altegioLinkedAt: new Date(),
              firstName,
              lastName,
              phone: normalizeAltegioPhone(staff.phone) ?? undefined,
              status: staff.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
            },
          });
          linked += 1;
          updatedLocal += 1;
          const idx = matchable.findIndex((row) => row.id === matched.id);
          if (idx >= 0) {
            matchable[idx] = {
              ...matchable[idx],
              altegioTeamMemberId: staff.id,
              phone: normalizeAltegioPhone(staff.phone),
              email: normalizeAltegioEmail(staff.email) ?? matchable[idx].email,
            };
          }
          continue;
        }

        await this.createLocalEmployeeFromAltegio(tenantId, ctx, staff);
        createdLocal += 1;
        linked += 1;
      }

      const unlinked = localEmployees.filter(
        (employee) =>
          employee.status === EmployeeStatus.ACTIVE &&
          !employee.altegioTeamMemberId &&
          !usedEmployeeIds.has(employee.id),
      );

      for (const employee of unlinked) {
        try {
          const created = await this.altegioB2b.createTeamMember({
            locationId: ctx.locationId,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            specialization: 'HiTeam',
            phone: employee.phone,
            email: employee.user.email.endsWith('@users.hiteam.local') ? null : employee.user.email,
          });
          await this.prisma.employee.update({
            where: { id: employee.id },
            data: {
              altegioTeamMemberId: created.id,
              altegioLinkedAt: new Date(),
            },
          });
          createdRemote += 1;
          linked += 1;
        } catch (error) {
          this.logger.warn(
            `Failed to push employee ${employee.id} to Altegio: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      await this.prisma.billingSubscription.update({
        where: { tenantId },
        data: {
          altegioStaffLastSyncedAt: new Date(),
          altegioSyncLastError: null,
        },
      });

      return {
        locationId: ctx.locationId,
        remoteStaff: remoteStaff.length,
        linked,
        createdLocal,
        updatedLocal,
        createdRemote,
      };
    } catch (error) {
      await this.rememberSyncError(tenantId, error);
      throw error;
    }
  }

  async syncSchedule(tenantId: string, range?: { from?: Date; to?: Date }) {
    const ctx = await this.requireConnectedContext(tenantId);
    if (!this.altegioB2b.isConfigured()) {
      throw new HttpException(
        { message: 'Altegio B2B tokens are not configured (partner + system user).' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const window = {
      from: range?.from ?? defaultSyncWindow().from,
      to: range?.to ?? defaultSyncWindow().to,
    };
    const startDate = formatDateOnly(window.from);
    const endDate = formatDateOnly(window.to);

    try {
      const linkedEmployees = await this.prisma.employee.findMany({
        where: {
          tenantId,
          altegioTeamMemberId: { not: null },
          status: EmployeeStatus.ACTIVE,
        },
        select: {
          id: true,
          positionId: true,
          primaryLocationId: true,
          altegioTeamMemberId: true,
          primaryLocation: { select: { timezone: true } },
        },
      });

      const byTeamMemberId = new Map(
        linkedEmployees
          .filter((employee) => employee.altegioTeamMemberId)
          .map((employee) => [employee.altegioTeamMemberId!, employee]),
      );

      const remoteDays = await this.altegioB2b.getStaffSchedule({
        locationId: ctx.locationId,
        startDate,
        endDate,
        staffIds: [...byTeamMemberId.keys()],
      });

      const template = await this.ensureAltegioImportTemplate(tenantId, ctx);
      let upserted = 0;
      let cancelled = 0;

      const seenKeys = new Set<string>();

      for (const day of remoteDays) {
        const employee = byTeamMemberId.get(day.teamMemberId);
        if (!employee) continue;
        const shiftDate = parseDateOnlyToUtc(day.date);
        if (!shiftDate) continue;
        const timeZone = employee.primaryLocation.timezone || 'UTC';

        for (const slot of day.slots) {
          const startsAt = mergeLocalTimeOnDate(day.date, slot.from, timeZone);
          let endsAt = mergeLocalTimeOnDate(day.date, slot.to, timeZone);
          if (!startsAt || !endsAt) continue;
          if (endsAt <= startsAt) {
            endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
          }

          const key = `${employee.id}:${startsAt.toISOString()}`;
          seenKeys.add(key);

          const existing = await this.prisma.shift.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              source: ALTEGIO_SHIFT_SOURCE,
              startsAt,
            },
          });

          if (existing) {
            if (existing.status === ShiftStatus.CANCELLED || existing.endsAt.getTime() !== endsAt.getTime()) {
              await this.prisma.shift.update({
                where: { id: existing.id },
                data: {
                  endsAt,
                  shiftDate,
                  status: ShiftStatus.PUBLISHED,
                  locationId: employee.primaryLocationId,
                  positionId: employee.positionId,
                  templateId: template.id,
                },
              });
              upserted += 1;
            }
            continue;
          }

          await this.prisma.shift.create({
            data: {
              tenantId,
              templateId: template.id,
              employeeId: employee.id,
              locationId: employee.primaryLocationId,
              positionId: employee.positionId,
              shiftDate,
              startsAt,
              endsAt,
              status: ShiftStatus.PUBLISHED,
              source: ALTEGIO_SHIFT_SOURCE,
            },
          });
          upserted += 1;
        }
      }

      const existingAltegioShifts = await this.prisma.shift.findMany({
        where: {
          tenantId,
          source: ALTEGIO_SHIFT_SOURCE,
          status: { not: ShiftStatus.CANCELLED },
          shiftDate: { gte: window.from, lte: window.to },
          employeeId: { in: linkedEmployees.map((employee) => employee.id) },
        },
        select: { id: true, employeeId: true, startsAt: true },
      });

      for (const shift of existingAltegioShifts) {
        const key = `${shift.employeeId}:${shift.startsAt.toISOString()}`;
        if (!seenKeys.has(key)) {
          await this.prisma.shift.update({
            where: { id: shift.id },
            data: { status: ShiftStatus.CANCELLED },
          });
          cancelled += 1;
        }
      }

      const pushed = await this.pushHiteamShiftsToAltegio(tenantId, ctx.locationId, window);

      await this.prisma.billingSubscription.update({
        where: { tenantId },
        data: {
          altegioScheduleLastSyncedAt: new Date(),
          altegioSyncLastError: null,
        },
      });

      return {
        locationId: ctx.locationId,
        from: startDate,
        to: endDate,
        remoteDays: remoteDays.length,
        upserted,
        cancelled,
        pushed,
      };
    } catch (error) {
      await this.rememberSyncError(tenantId, error);
      throw error;
    }
  }

  async pushEmployeeToAltegio(tenantId: string, employeeId: string) {
    const ctx = await this.findConnectedContext(tenantId);
    if (!ctx || !this.altegioB2b.isConfigured()) {
      return { skipped: true as const, reason: 'not_connected' };
    }

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        altegioTeamMemberId: true,
        user: { select: { email: true } },
      },
    });
    if (!employee) {
      return { skipped: true as const, reason: 'employee_missing' };
    }
    if (employee.altegioTeamMemberId) {
      return { skipped: true as const, reason: 'already_linked', teamMemberId: employee.altegioTeamMemberId };
    }

    try {
      const created = await this.altegioB2b.createTeamMember({
        locationId: ctx.locationId,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        specialization: 'HiTeam',
        phone: employee.phone,
        email: employee.user.email.endsWith('@users.hiteam.local') ? null : employee.user.email,
      });
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: {
          altegioTeamMemberId: created.id,
          altegioLinkedAt: new Date(),
        },
      });
      return { skipped: false as const, teamMemberId: created.id };
    } catch (error) {
      this.logger.warn(
        `pushEmployeeToAltegio failed tenantId=${tenantId} employeeId=${employeeId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { skipped: true as const, reason: 'push_failed' };
    }
  }

  async pushShiftDayToAltegio(tenantId: string, employeeId: string, shiftDate: Date) {
    const ctx = await this.findConnectedContext(tenantId);
    if (!ctx || !this.altegioB2b.isConfigured()) {
      return { skipped: true as const, reason: 'not_connected' };
    }

    const dayStart = new Date(shiftDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    try {
      const pushed = await this.pushHiteamShiftsToAltegio(tenantId, ctx.locationId, {
        from: dayStart,
        to: dayEnd,
      }, [employeeId]);
      return { skipped: false as const, pushed };
    } catch (error) {
      this.logger.warn(
        `pushShiftDayToAltegio failed tenantId=${tenantId} employeeId=${employeeId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { skipped: true as const, reason: 'push_failed' };
    }
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const resource = String(payload.resource || payload.entity || payload.type || '')
      .trim()
      .toLowerCase();
    const locationId = String(
      payload.company_id || payload.salon_id || payload.location_id || payload.salonId || '',
    ).trim();
    const resourceId = String(payload.resource_id || payload.staff_id || payload.team_member_id || '').trim();

    if (!locationId) {
      return { ok: true, ignored: 'missing_location' };
    }

    const subscription = await this.prisma.billingSubscription.findFirst({
      where: { altegioLocationId: locationId },
      select: { tenantId: true },
    });
    if (!subscription) {
      return { ok: true, ignored: 'unknown_location' };
    }

    if (resource === 'staff' || resource === 'master') {
      const result = await this.syncEmployees(subscription.tenantId);
      return { ok: true, kind: 'staff', result, resourceId: resourceId || null };
    }

    if (resource === 'schedule') {
      const result = await this.syncSchedule(subscription.tenantId);
      return { ok: true, kind: 'schedule', result, resourceId: resourceId || null };
    }

    return { ok: true, ignored: 'unknown_event', resource };
  }

  private async pushHiteamShiftsToAltegio(
    tenantId: string,
    locationId: string,
    window: { from: Date; to: Date },
    employeeIds?: string[],
  ) {
    const shifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        source: HITEAM_SHIFT_SOURCE,
        status: ShiftStatus.PUBLISHED,
        shiftDate: { gte: window.from, lt: window.to },
        ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {}),
        employee: { altegioTeamMemberId: { not: null } },
      },
      select: {
        shiftDate: true,
        startsAt: true,
        endsAt: true,
        employee: {
          select: {
            altegioTeamMemberId: true,
            primaryLocation: { select: { timezone: true } },
          },
        },
      },
    });

    const grouped = groupHiteamShiftsForAltegioPush(
      shifts
        .filter((shift) => shift.employee.altegioTeamMemberId)
        .map((shift) => ({
          altegioTeamMemberId: shift.employee.altegioTeamMemberId!,
          shiftDate: shift.shiftDate,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          timeZone: shift.employee.primaryLocation.timezone || 'UTC',
        })),
    );

    if (grouped.length === 0) {
      return 0;
    }

    // Merge same team member + same slots across dates into Altegio batch shape.
    const byMemberSlots = new Map<string, { teamMemberId: string; dates: string[]; slots: Array<{ from: string; to: string }> }>();
    for (const item of grouped) {
      const slotKey = item.slots.map((slot) => `${slot.from}-${slot.to}`).sort().join('|');
      const key = `${item.teamMemberId}::${slotKey}`;
      const existing = byMemberSlots.get(key);
      if (existing) {
        existing.dates.push(item.date);
      } else {
        byMemberSlots.set(key, {
          teamMemberId: item.teamMemberId,
          dates: [item.date],
          slots: item.slots,
        });
      }
    }

    await this.altegioB2b.setStaffSchedule({
      locationId,
      schedulesToSet: [...byMemberSlots.values()],
    });

    return grouped.length;
  }

  private async createLocalEmployeeFromAltegio(
    tenantId: string,
    ctx: {
      locationId: string;
      companyId: string;
      departmentId: string;
      primaryLocationId: string;
      positionId: string;
    },
    staff: AltegioTeamMember,
  ) {
    const { firstName, lastName } = splitAltegioStaffName(staff.name);
    const email =
      normalizeAltegioEmail(staff.email) && !staff.email?.endsWith('@users.hiteam.local')
        ? normalizeAltegioEmail(staff.email)!
        : syntheticAltegioEmail(staff.id);
    const phone = normalizeAltegioPhone(staff.phone);
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
    const employeeNumber = `ALT-${staff.id}`.slice(0, 32);

    const existingEmail = await this.prisma.user.findFirst({
      where: { tenantId, email },
      select: { id: true, employee: { select: { id: true } } },
    });
    if (existingEmail?.employee) {
      await this.prisma.employee.update({
        where: { id: existingEmail.employee.id },
        data: {
          altegioTeamMemberId: staff.id,
          altegioLinkedAt: new Date(),
          firstName,
          lastName,
          phone: phone ?? undefined,
        },
      });
      return existingEmail.employee.id;
    }

    const role = await this.prisma.role.upsert({
      where: { code: 'employee' },
      update: {},
      create: {
        code: 'employee',
        name: 'Employee',
        description: 'Standard employee access',
      },
    });

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          status: UserStatus.INVITED,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scopeType: 'tenant',
          scopeId: tenantId,
        },
      });

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          companyId: ctx.companyId,
          departmentId: ctx.departmentId,
          primaryLocationId: ctx.primaryLocationId,
          positionId: ctx.positionId,
          employeeNumber,
          firstName,
          lastName,
          phone,
          status: staff.fired ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
          hireDate: new Date(),
          altegioTeamMemberId: staff.id,
          altegioLinkedAt: new Date(),
        },
      });

      return employee.id;
    });
  }

  private async ensureAltegioImportTemplate(
    tenantId: string,
    ctx: { primaryLocationId: string; positionId: string },
  ) {
    const existing = await this.prisma.shiftTemplate.findFirst({
      where: { tenantId, code: ALTEGIO_IMPORT_TEMPLATE_CODE },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.shiftTemplate.create({
      data: {
        tenantId,
        name: 'Altegio Import',
        code: ALTEGIO_IMPORT_TEMPLATE_CODE,
        locationId: ctx.primaryLocationId,
        positionId: ctx.positionId,
        startsAtLocal: '09:00',
        endsAtLocal: '18:00',
        weekDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        gracePeriodMinutes: 10,
      },
    });
  }

  private async requireConnectedContext(tenantId: string) {
    const ctx = await this.findConnectedContext(tenantId);
    if (!ctx) {
      throw new HttpException(
        { message: 'Altegio marketplace is not connected for this workspace.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return ctx;
  }

  private async findConnectedContext(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { altegioLocationId: true },
    });
    const locationId = subscription?.altegioLocationId?.trim();
    if (!locationId) {
      return null;
    }

    const [company, department, location, position] = await Promise.all([
      this.prisma.company.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.department.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.location.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.position.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    ]);

    if (!company || !department || !location || !position) {
      throw new HttpException(
        { message: 'Workspace org setup is incomplete (company/department/location/position).' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      locationId,
      companyId: company.id,
      departmentId: department.id,
      primaryLocationId: location.id,
      positionId: position.id,
    };
  }

  private async rememberSyncError(tenantId: string, error: unknown) {
    const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    await this.prisma.billingSubscription
      .updateMany({
        where: { tenantId },
        data: { altegioSyncLastError: message },
      })
      .catch(() => undefined);
  }
}

// Keep hash helper available if we later need deterministic temp passwords.
export function hashAltegioSyncToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function sanitizePhoneDigits(value?: string | null) {
  return phoneDigits(value);
}

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { AttendanceSessionStatus, Prisma, ShiftStatus, UserStatus } from '@prisma/client';
import { AltegioStaffScheduleSyncService } from '../altegio-sync/altegio-staff-schedule-sync.service';
import { HITEAM_SHIFT_SOURCE } from '../altegio-sync/altegio-sync.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CollaborationRealtimeService } from '../collaboration/collaboration-realtime.service';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

const WORKSPACE_MANAGER_ROLE_CODES = [
  'tenant_owner',
  'hr_admin',
  'operations_admin',
  'manager',
] as const;

const CYRILLIC_TEMPLATE_CODE_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function transliterateTemplateCode(value: string) {
  return Array.from(value)
    .map((char) => CYRILLIC_TEMPLATE_CODE_MAP[char.toLowerCase()] ?? char)
    .join('');
}

function buildTemplateCodeBase(value: string) {
  const normalized = transliterateTemplateCode(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .toUpperCase()
    .slice(0, 24);

  return normalized || 'SHIFT';
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const LOCATION_SELECT = {
  id: true,
  companyId: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  geofenceRadiusMeters: true,
  timezone: true,
} satisfies Prisma.LocationSelect;

const POSITION_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.PositionSelect;

const SHIFT_EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  employeeNumber: true,
  avatarUrl: true,
} satisfies Prisma.EmployeeSelect;

const SHIFT_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  employeeNumber: true,
} satisfies Prisma.EmployeeSelect;

const SHIFT_TEMPLATE_SELECT = {
  id: true,
  name: true,
  code: true,
  startsAtLocal: true,
  endsAtLocal: true,
  weekDaysJson: true,
  gracePeriodMinutes: true,
  fixedBreakStartsAtLocal: true,
  fixedBreakDurationMinutes: true,
  fixedBreakIsPaid: true,
  createdAt: true,
  updatedAt: true,
  location: {
    select: LOCATION_SELECT,
  },
  position: {
    select: POSITION_SELECT,
  },
} satisfies Prisma.ShiftTemplateSelect;

type ShiftTemplateRecord = Prisma.ShiftTemplateGetPayload<{
  select: typeof SHIFT_TEMPLATE_SELECT;
}>;

const SHIFT_SELECT = {
  id: true,
  shiftDate: true,
  startsAt: true,
  endsAt: true,
  fixedBreakStartsAt: true,
  fixedBreakDurationMinutes: true,
  fixedBreakIsPaid: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  employeeId: true,
  locationId: true,
  positionId: true,
  templateId: true,
  employee: {
    select: SHIFT_EMPLOYEE_SELECT,
  },
  createdByEmployee: {
    select: SHIFT_AUTHOR_SELECT,
  },
  location: {
    select: LOCATION_SELECT,
  },
  position: {
    select: POSITION_SELECT,
  },
  template: {
    select: SHIFT_TEMPLATE_SELECT,
  },
} satisfies Prisma.ShiftSelect;

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly collaborationRealtimeService: CollaborationRealtimeService,
    @Optional() private readonly altegioStaffScheduleSync?: AltegioStaffScheduleSyncService,
  ) {}

  private pushShiftDayToAltegioInBackground(tenantId: string, employeeId: string, shiftDate: Date) {
    void this.altegioStaffScheduleSync?.pushShiftDayToAltegio(tenantId, employeeId, shiftDate).catch((error) => {
      this.logger.warn(
        `Unable to push shift day to Altegio tenantId=${tenantId} employeeId=${employeeId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async resolveReadableLocationIds(
    tenantId: string,
    actorUserId?: string,
  ): Promise<string[] | null> {
    if (!actorUserId) return null;
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: actorUserId },
      select: {
        scopeId: true,
        scopeType: true,
        role: { select: { code: true } },
      },
    });
    if (
      assignments.some(
        ({ role, scopeId, scopeType }) =>
          WORKSPACE_MANAGER_ROLE_CODES.includes(
            role.code as (typeof WORKSPACE_MANAGER_ROLE_CODES)[number],
          ) &&
          scopeType === 'tenant' &&
          scopeId === tenantId,
      )
    ) {
      return null;
    }

    const companyIds = assignments
      .filter(
        ({ role, scopeType }) =>
          role.code === 'manager' && scopeType === 'company',
      )
      .map(({ scopeId }) => scopeId);
    const locationIds = assignments
      .filter(
        ({ role, scopeType }) =>
          role.code === 'manager' && scopeType === 'location',
      )
      .map(({ scopeId }) => scopeId);
    if (companyIds.length > 0) {
      const companyLocations = await this.prisma.location.findMany({
        where: { tenantId, companyId: { in: companyIds }, archivedAt: null },
        select: { id: true },
      });
      locationIds.push(...companyLocations.map(({ id }) => id));
    }
    return [...new Set(locationIds)];
  }

  private async assertLocationReadable(
    tenantId: string,
    actorUserId: string,
    locationId: string,
  ) {
    const readableLocationIds = await this.resolveReadableLocationIds(
      tenantId,
      actorUserId,
    );
    if (
      readableLocationIds &&
      !readableLocationIds.includes(locationId)
    ) {
      throw new ForbiddenException(
        'You cannot manage schedules for this location.',
      );
    }
  }

  async listTemplates(tenantId: string, actorUserId?: string) {
    const readableLocationIds = await this.resolveReadableLocationIds(
      tenantId,
      actorUserId,
    );
    return this.prisma.shiftTemplate.findMany({
      where: {
        tenantId,
        ...(readableLocationIds
          ? { locationId: { in: readableLocationIds } }
          : {}),
      },
      select: SHIFT_TEMPLATE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listShifts(tenantId: string, actorUserId?: string) {
    const readableLocationIds = await this.resolveReadableLocationIds(
      tenantId,
      actorUserId,
    );
    return this.prisma.shift.findMany({
      where: {
        tenantId,
        status: { not: ShiftStatus.CANCELLED },
        ...(readableLocationIds
          ? { locationId: { in: readableLocationIds } }
          : {}),
      },
      select: SHIFT_SELECT,
      orderBy: [{ shiftDate: 'desc' }, { startsAt: 'asc' }],
      take: 50,
    });
  }

  private async resolveActorEmployeeId(tenantId: string, actorUserId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId: actorUserId },
      select: { id: true },
    });

    return employee?.id ?? null;
  }

  async createTemplate(tenantId: string, actorUserId: string, dto: CreateShiftTemplateDto) {
    const normalizedWeekDays =
      dto.weekDays && dto.weekDays.length > 0
        ? [...new Set(dto.weekDays)].sort((left, right) => left - right)
        : null;
    const codeSeed = dto.code?.trim() || dto.name;
    let code = await this.generateTemplateCode(tenantId, codeSeed);
    const readableLocationIds = await this.resolveReadableLocationIds(
      tenantId,
      actorUserId,
    );
    const locationId =
      dto.locationId ||
      readableLocationIds?.[0] ||
      (await this.resolveDefaultLocationId(tenantId));
    await this.assertLocationReadable(tenantId, actorUserId, locationId);
    const positionId = dto.positionId || (await this.resolveDefaultPositionId(tenantId));
    const fixedBreak = this.normalizeFixedBreak(
      dto.fixedBreakStartsAtLocal,
      dto.fixedBreakDurationMinutes,
      dto.fixedBreakIsPaid,
    );
    const buildCreateInput = (): Prisma.ShiftTemplateUncheckedCreateInput => ({
      tenantId,
      name: dto.name,
      code,
      locationId,
      positionId,
      startsAtLocal: dto.startsAtLocal,
      endsAtLocal: dto.endsAtLocal,
      weekDaysJson: normalizedWeekDays ? JSON.stringify(normalizedWeekDays) : null,
      gracePeriodMinutes: dto.gracePeriodMinutes ?? 10,
      fixedBreakStartsAtLocal: fixedBreak.startsAtLocal,
      fixedBreakDurationMinutes: fixedBreak.durationMinutes,
      fixedBreakIsPaid: fixedBreak.isPaid,
    });

    let template: ShiftTemplateRecord;
    try {
      template = await this.prisma.shiftTemplate.create({
        data: buildCreateInput(),
        select: SHIFT_TEMPLATE_SELECT,
      });
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }

      code = await this.generateTemplateCode(
        tenantId,
        `${codeSeed}-${Date.now().toString(36)}`,
      );
      template = await this.prisma.shiftTemplate.create({
        data: buildCreateInput(),
        select: SHIFT_TEMPLATE_SELECT,
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'shift_template',
      entityId: template.id,
      action: 'schedule.template_created',
      metadata: { code },
    });

    await this.emitScheduleWorkspaceRefreshForEmployees(
      tenantId,
      [],
      'schedule.template_created',
    );

    return template;
  }

  async createShift(tenantId: string, actorUserId: string, dto: CreateShiftDto) {
    const template = await this.prisma.shiftTemplate.findFirst({
      where: { tenantId, id: dto.templateId },
      select: {
        id: true,
        name: true,
        locationId: true,
        positionId: true,
        startsAtLocal: true,
        endsAtLocal: true,
        fixedBreakStartsAtLocal: true,
        fixedBreakDurationMinutes: true,
        fixedBreakIsPaid: true,
        location: {
          select: {
            id: true,
            companyId: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found.');
    }
    await this.assertLocationReadable(
      tenantId,
      actorUserId,
      template.locationId,
    );

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId },
      include: {
        locationAssignments: {
          where: {
            locationId: template.locationId,
            unassignedAt: null,
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }
    if (
      employee.primaryLocationId !== template.locationId &&
      employee.locationAssignments.length === 0
    ) {
      throw new BadRequestException(
        'Employee is not assigned to the template location.',
      );
    }

    const shiftDate = new Date(dto.shiftDate);
    shiftDate.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (Number.isNaN(shiftDate.getTime()) || shiftDate < todayStart) {
      throw new BadRequestException('Shift date cannot be in the past.');
    }

    const startsAt = this.mergeDateAndTime(shiftDate, template.startsAtLocal);
    const endsAt = this.mergeShiftEnd(shiftDate, template.startsAtLocal, template.endsAtLocal);
    const fixedBreak = this.resolveShiftFixedBreak(dto, template, shiftDate);
    const createdByEmployeeId = await this.resolveActorEmployeeId(tenantId, actorUserId);

    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        templateId: template.id,
        employeeId: employee.id,
        createdByEmployeeId,
        locationId: template.locationId,
        positionId: template.positionId,
        shiftDate,
        startsAt,
        endsAt,
        fixedBreakStartsAt: fixedBreak.startsAt,
        fixedBreakDurationMinutes: fixedBreak.durationMinutes,
        fixedBreakIsPaid: fixedBreak.isPaid,
        source: HITEAM_SHIFT_SOURCE,
      },
      select: SHIFT_SELECT,
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'shift',
      entityId: shift.id,
      action: 'schedule.shift_created',
      metadata: {
        employeeId: employee.id,
        employeeIds: [employee.id],
        employeeName: `${employee.lastName} ${employee.firstName}`.trim(),
        templateId: template.id,
        templateName: template.name,
        companyId: template.location.companyId,
        locationId: template.location.id,
        locationName: template.location.name,
        shiftDate: shiftDate.toISOString(),
        startsAt: shift.startsAt.toISOString(),
        endsAt: shift.endsAt.toISOString(),
        fixedBreakStartsAt: shift.fixedBreakStartsAt?.toISOString() ?? null,
        fixedBreakDurationMinutes: shift.fixedBreakDurationMinutes,
        fixedBreakIsPaid: shift.fixedBreakIsPaid,
      },
    });

    await this.emitScheduleWorkspaceRefreshForEmployees(
      tenantId,
      [employee.id],
      'schedule.shift_created',
    );

    this.pushShiftDayToAltegioInBackground(tenantId, employee.id, shiftDate);

    return shift;
  }

  async updateShift(tenantId: string, actorUserId: string, shiftId: string, dto: UpdateShiftDto) {
    const existingShift = await this.prisma.shift.findFirst({
      where: { tenantId, id: shiftId },
      select: SHIFT_SELECT,
    });

    if (!existingShift) {
      throw new NotFoundException('Shift not found.');
    }
    await this.assertLocationReadable(
      tenantId,
      actorUserId,
      existingShift.location.id,
    );

    if (existingShift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('Cancelled shift cannot be edited.');
    }

    const template = await this.prisma.shiftTemplate.findFirst({
      where: { tenantId, id: dto.templateId ?? existingShift.templateId },
      select: {
        id: true,
        name: true,
        locationId: true,
        positionId: true,
        startsAtLocal: true,
        endsAtLocal: true,
        fixedBreakStartsAtLocal: true,
        fixedBreakDurationMinutes: true,
        fixedBreakIsPaid: true,
        location: {
          select: {
            id: true,
            companyId: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found.');
    }
    await this.assertLocationReadable(
      tenantId,
      actorUserId,
      template.locationId,
    );

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId ?? existingShift.employeeId },
      include: {
        locationAssignments: {
          where: {
            locationId: template.locationId,
            unassignedAt: null,
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }
    if (
      employee.primaryLocationId !== template.locationId &&
      employee.locationAssignments.length === 0
    ) {
      throw new BadRequestException(
        'Employee is not assigned to the template location.',
      );
    }

    const shiftDate = dto.shiftDate
      ? new Date(dto.shiftDate)
      : new Date(existingShift.shiftDate);
    shiftDate.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (Number.isNaN(shiftDate.getTime()) || shiftDate < todayStart) {
      throw new BadRequestException('Shift date cannot be in the past.');
    }

    const startsAt = this.mergeDateAndTime(shiftDate, template.startsAtLocal);
    const endsAt = this.mergeShiftEnd(shiftDate, template.startsAtLocal, template.endsAtLocal);
    const hasBreakOverride =
      dto.fixedBreakStartsAtLocal !== undefined ||
      dto.fixedBreakDurationMinutes !== undefined ||
      dto.fixedBreakIsPaid !== undefined;
    const fixedBreak =
      hasBreakOverride || dto.templateId
        ? this.resolveShiftFixedBreak(dto, template, shiftDate)
        : {
            startsAt: existingShift.fixedBreakStartsAt
              ? new Date(existingShift.fixedBreakStartsAt)
              : null,
            durationMinutes: existingShift.fixedBreakDurationMinutes ?? 0,
            isPaid: Boolean(existingShift.fixedBreakIsPaid),
          };

    const shift = await this.prisma.shift.update({
      where: { id: existingShift.id },
      data: {
        templateId: template.id,
        employeeId: employee.id,
        locationId: template.locationId,
        positionId: template.positionId,
        shiftDate,
        startsAt,
        endsAt,
        fixedBreakStartsAt: fixedBreak.startsAt,
        fixedBreakDurationMinutes: fixedBreak.durationMinutes,
        fixedBreakIsPaid: fixedBreak.isPaid,
      },
      select: SHIFT_SELECT,
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'shift',
      entityId: shift.id,
      action: 'schedule.shift_updated',
      metadata: {
        employeeId: employee.id,
        employeeIds: [employee.id],
        employeeName: `${employee.lastName} ${employee.firstName}`.trim(),
        templateId: template.id,
        templateName: template.name,
        companyId: template.location.companyId,
        locationId: template.location.id,
        locationName: template.location.name,
        shiftDate: shiftDate.toISOString(),
      },
    });

    await this.emitScheduleWorkspaceRefreshForEmployees(
      tenantId,
      [existingShift.employeeId, employee.id],
      'schedule.shift_updated',
    );

    this.pushShiftDayToAltegioInBackground(tenantId, employee.id, shiftDate);

    return shift;
  }

  async cancelShift(tenantId: string, actorUserId: string, shiftId: string) {
    const existingShift = await this.prisma.shift.findFirst({
      where: { tenantId, id: shiftId },
      select: {
        id: true,
        employeeId: true,
        shiftDate: true,
        status: true,
        attendanceSessions: {
          where: {
            status: {
              in: [AttendanceSessionStatus.OPEN, AttendanceSessionStatus.ON_BREAK],
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existingShift) {
      throw new NotFoundException('Shift not found.');
    }
    const existingLocation = await this.prisma.shift.findUnique({
      where: { id: existingShift.id },
      select: { locationId: true },
    });
    if (existingLocation) {
      await this.assertLocationReadable(
        tenantId,
        actorUserId,
        existingLocation.locationId,
      );
    }

    if (existingShift.attendanceSessions.length > 0) {
      throw new BadRequestException('Shift has an open attendance session.');
    }

    const shift = await this.prisma.shift.update({
      where: { id: existingShift.id },
      data: { status: ShiftStatus.CANCELLED },
      select: SHIFT_SELECT,
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'shift',
      entityId: shift.id,
      action: 'schedule.shift_cancelled',
      metadata: {
        employeeId: existingShift.employeeId,
        employeeIds: [existingShift.employeeId],
      },
    });

    await this.emitScheduleWorkspaceRefreshForEmployees(
      tenantId,
      [existingShift.employeeId],
      'schedule.shift_cancelled',
    );

    this.pushShiftDayToAltegioInBackground(tenantId, existingShift.employeeId, existingShift.shiftDate);

    return shift;
  }

  async myShifts(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    return this.prisma.shift.findMany({
      where: { employeeId: employee.id, status: { not: ShiftStatus.CANCELLED } },
      select: SHIFT_SELECT,
      orderBy: [{ shiftDate: 'desc' }, { startsAt: 'asc' }],
      take: 30,
    });
  }

  async findNextShift(employeeId: string) {
    const now = new Date();

    return this.prisma.shift.findFirst({
      where: {
        employeeId,
        status: ShiftStatus.PUBLISHED,
        startsAt: {
          gt: now,
        },
      },
      include: {
        location: {
          select: LOCATION_SELECT,
        },
        position: {
          select: POSITION_SELECT,
        },
        template: {
          select: SHIFT_TEMPLATE_SELECT,
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findCurrentShift(employeeId: string) {
    const now = new Date();
    const startOfWindow = new Date(now);
    startOfWindow.setDate(startOfWindow.getDate() - 1);
    startOfWindow.setHours(0, 0, 0, 0);
    const endOfWindow = new Date(now);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        status: ShiftStatus.PUBLISHED,
        startsAt: {
          gte: startOfWindow,
          lte: endOfWindow,
        },
      },
      include: {
        location: {
          select: LOCATION_SELECT,
        },
        position: {
          select: POSITION_SELECT,
        },
        template: {
          select: SHIFT_TEMPLATE_SELECT,
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const activeShift = shifts.find((shift) => now >= shift.startsAt && now <= shift.endsAt);
    if (activeShift) {
      return activeShift;
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    return shifts.find((shift) => shift.shiftDate >= todayStart && shift.shiftDate <= todayEnd) ?? null;
  }

  private normalizeFixedBreak(
    startsAtLocal: string | undefined,
    durationMinutes: number | undefined,
    isPaid: boolean | undefined,
  ) {
    const duration = durationMinutes ?? 0;

    if (duration <= 0) {
      return {
        startsAtLocal: null,
        durationMinutes: 0,
        isPaid: false,
      };
    }

    if (!startsAtLocal || !this.isLocalTime(startsAtLocal)) {
      throw new BadRequestException('Fixed break start time is required.');
    }

    return {
      startsAtLocal,
      durationMinutes: duration,
      isPaid: Boolean(isPaid),
    };
  }

  private resolveShiftFixedBreak(
    dto: {
      fixedBreakStartsAtLocal?: string;
      fixedBreakDurationMinutes?: number;
      fixedBreakIsPaid?: boolean;
    },
    template: {
      fixedBreakStartsAtLocal: string | null;
      fixedBreakDurationMinutes: number;
      fixedBreakIsPaid: boolean;
    },
    shiftDate: Date,
  ) {
    const hasShiftBreakOverride =
      dto.fixedBreakStartsAtLocal !== undefined ||
      dto.fixedBreakDurationMinutes !== undefined ||
      dto.fixedBreakIsPaid !== undefined;
    const startsAtLocal = hasShiftBreakOverride
      ? dto.fixedBreakStartsAtLocal
      : template.fixedBreakStartsAtLocal ?? undefined;
    const durationMinutes = hasShiftBreakOverride
      ? dto.fixedBreakDurationMinutes
      : template.fixedBreakDurationMinutes;
    const isPaid = hasShiftBreakOverride
      ? dto.fixedBreakIsPaid
      : template.fixedBreakIsPaid;
    const fixedBreak = this.normalizeFixedBreak(
      startsAtLocal,
      durationMinutes,
      isPaid,
    );

    return {
      startsAt: fixedBreak.startsAtLocal
        ? this.mergeDateAndTime(shiftDate, fixedBreak.startsAtLocal)
        : null,
      durationMinutes: fixedBreak.durationMinutes,
      isPaid: fixedBreak.isPaid,
    };
  }

  private isLocalTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  private mergeDateAndTime(baseDate: Date, localTime: string): Date {
    const [hoursRaw, minutesRaw] = localTime.split(':');
    const merged = new Date(baseDate);
    merged.setHours(Number(hoursRaw), Number(minutesRaw), 0, 0);
    return merged;
  }

  private mergeShiftEnd(baseDate: Date, startsAtLocal: string, endsAtLocal: string): Date {
    const startsAt = this.mergeDateAndTime(baseDate, startsAtLocal);
    const endsAt = this.mergeDateAndTime(baseDate, endsAtLocal);

    if (endsAt <= startsAt) {
      endsAt.setDate(endsAt.getDate() + 1);
    }

    return endsAt;
  }

  private async emitScheduleWorkspaceRefreshForEmployees(
    tenantId: string,
    employeeIds: Array<string | null | undefined>,
    reason: string,
  ) {
    try {
      const userIds = new Set<string>();
      const uniqueEmployeeIds = Array.from(
        new Set(employeeIds.filter((id): id is string => Boolean(id))),
      );

      if (uniqueEmployeeIds.length > 0) {
        const employees = await this.prisma.employee.findMany({
          where: {
            tenantId,
            id: { in: uniqueEmployeeIds },
          },
          select: { userId: true },
        });

        for (const employee of employees) {
          if (employee.userId) {
            userIds.add(employee.userId);
          }
        }
      }

      const managerUserIds = await this.resolveWorkspaceManagerUserIds(tenantId);
      for (const userId of managerUserIds) {
        userIds.add(userId);
      }

      this.emitWorkspaceRefresh(Array.from(userIds), reason);
    } catch (error) {
      this.logger.warn(
        `Unable to resolve schedule workspace refresh audience: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async resolveWorkspaceManagerUserIds(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        workspaceAccessAllowed: true,
        roles: {
          some: {
            role: {
              code: { in: [...WORKSPACE_MANAGER_ROLE_CODES] },
            },
          },
        },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private emitWorkspaceRefresh(userIds: string[], reason: string) {
    if (userIds.length === 0) {
      return;
    }

    const refreshedAt = new Date().toISOString();

    for (const userId of new Set(userIds)) {
      void this.collaborationRealtimeService
        .fanoutWorkspaceRefresh(userId, {
          reason,
          refreshedAt,
        })
        .catch((error) => {
          this.logger.warn(
            `Unable to emit schedule workspace refresh for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    }
  }

  private async generateTemplateCode(tenantId: string, name: string) {
    const baseCode = buildTemplateCodeBase(name);
    const existingCodes = new Set(
      (
        await this.prisma.shiftTemplate.findMany({
          where: { tenantId },
          select: { code: true },
        })
      ).map((template) => template.code),
    );

    if (!existingCodes.has(baseCode)) {
      return baseCode;
    }

    let index = 2;
    while (true) {
      const suffix = `-${index}`;
      const candidate = `${baseCode.slice(0, Math.max(1, 24 - suffix.length))}${suffix}`;
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
      index += 1;
    }
  }

  private async resolveDefaultCompanyId(tenantId: string) {
    const company = await this.prisma.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (company) {
      return company.id;
    }

    const created = await this.prisma.company.create({
      data: {
        tenantId,
        name: 'General Company',
        code: 'GENERAL',
      },
    });

    return created.id;
  }

  private async resolveDefaultLocationId(tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (location) {
      return location.id;
    }

    const companyId = await this.resolveDefaultCompanyId(tenantId);
    const created = await this.prisma.location.create({
      data: {
        tenantId,
        companyId,
        name: 'Default location',
        code: `DEFAULT-${Date.now()}`,
        address: 'Not set yet',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      },
    });

    return created.id;
  }

  private async resolveDefaultPositionId(tenantId: string) {
    const position = await this.prisma.position.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (position) {
      return position.id;
    }

    const created = await this.prisma.position.create({
      data: {
        tenantId,
        name: 'Employee',
        code: 'EMPLOYEE',
      },
    });

    return created.id;
  }
}

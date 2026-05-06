import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSessionStatus, Prisma, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listTemplates(tenantId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { tenantId },
      select: SHIFT_TEMPLATE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  listShifts(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId, status: { not: ShiftStatus.CANCELLED } },
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
    const locationId = dto.locationId || (await this.resolveDefaultLocationId(tenantId));
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
      },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
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
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        templateId: template.id,
        templateName: template.name,
        shiftDate: shiftDate.toISOString(),
        startsAt: shift.startsAt.toISOString(),
        endsAt: shift.endsAt.toISOString(),
        fixedBreakStartsAt: shift.fixedBreakStartsAt?.toISOString() ?? null,
        fixedBreakDurationMinutes: shift.fixedBreakDurationMinutes,
        fixedBreakIsPaid: shift.fixedBreakIsPaid,
      },
    });

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
      },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId ?? existingShift.employeeId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
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
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        templateId: template.id,
        templateName: template.name,
        shiftDate: shiftDate.toISOString(),
      },
    });

    return shift;
  }

  async cancelShift(tenantId: string, actorUserId: string, shiftId: string) {
    const existingShift = await this.prisma.shift.findFirst({
      where: { tenantId, id: shiftId },
      select: {
        id: true,
        employeeId: true,
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

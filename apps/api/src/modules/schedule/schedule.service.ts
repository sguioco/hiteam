import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { CreateShiftDto } from './dto/create-shift.dto';

function buildTemplateCodeBase(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .toUpperCase()
    .slice(0, 24);

  return normalized || 'SHIFT';
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
} satisfies Prisma.EmployeeSelect;

const SHIFT_TEMPLATE_SELECT = {
  id: true,
  name: true,
  code: true,
  startsAtLocal: true,
  endsAtLocal: true,
  weekDaysJson: true,
  gracePeriodMinutes: true,
  createdAt: true,
  updatedAt: true,
  location: {
    select: LOCATION_SELECT,
  },
  position: {
    select: POSITION_SELECT,
  },
} satisfies Prisma.ShiftTemplateSelect;

const SHIFT_SELECT = {
  id: true,
  shiftDate: true,
  startsAt: true,
  endsAt: true,
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
      where: { tenantId },
      select: SHIFT_SELECT,
      orderBy: [{ shiftDate: 'desc' }, { startsAt: 'asc' }],
      take: 50,
    });
  }

  async createTemplate(tenantId: string, actorUserId: string, dto: CreateShiftTemplateDto) {
    const normalizedWeekDays =
      dto.weekDays && dto.weekDays.length > 0
        ? [...new Set(dto.weekDays)].sort((left, right) => left - right)
        : null;
    const code = dto.code?.trim() || (await this.generateTemplateCode(tenantId, dto.name));
    const locationId = dto.locationId || (await this.resolveDefaultLocationId(tenantId));
    const positionId = dto.positionId || (await this.resolveDefaultPositionId(tenantId));
    const createInput: Prisma.ShiftTemplateUncheckedCreateInput = {
      tenantId,
      name: dto.name,
      code,
      locationId,
      positionId,
      startsAtLocal: dto.startsAtLocal,
      endsAtLocal: dto.endsAtLocal,
      weekDaysJson: normalizedWeekDays ? JSON.stringify(normalizedWeekDays) : null,
      gracePeriodMinutes: dto.gracePeriodMinutes ?? 10,
    };

    const template = await this.prisma.shiftTemplate.create({
      data: createInput,
      select: SHIFT_TEMPLATE_SELECT,
    });

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

    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        templateId: template.id,
        employeeId: employee.id,
        locationId: template.locationId,
        positionId: template.positionId,
        shiftDate,
        startsAt,
        endsAt,
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
      },
    });

    return shift;
  }

  async myShifts(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    return this.prisma.shift.findMany({
      where: { employeeId: employee.id },
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

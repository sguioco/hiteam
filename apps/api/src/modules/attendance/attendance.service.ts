import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AttendanceCorrectionStatus,
  AttendanceEventType,
  AttendanceResult,
  AttendanceSessionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import PDFDocument = require('pdfkit');
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { AttendanceActionDto } from './dto/attendance-action.dto';
import { AttendanceAuditQueryDto } from './dto/attendance-audit-query.dto';
import { AttendanceAnomaliesQueryDto } from './dto/attendance-anomalies-query.dto';
import { AttendanceHistoryExportQueryDto } from './dto/attendance-history-export-query.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { AttendanceCorrectionActionDto } from './dto/attendance-correction-action.dto';
import { CorrectAttendanceSessionDto } from './dto/correct-attendance-session.dto';
import { CreateAttendanceCorrectionRequestDto } from './dto/create-attendance-correction-request.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleService } from '../schedule/schedule.service';
import { AttendanceRealtimeService } from './attendance-realtime.service';
import { BiometricService } from '../biometric/biometric.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesService: DevicesService,
    private readonly biometricService: BiometricService,
    private readonly auditService: AuditService,
    private readonly scheduleService: ScheduleService,
    private readonly attendanceRealtimeService: AttendanceRealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMyStatus(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { primaryLocation: true },
    });

    const [shift, policy] = await Promise.all([
      this.scheduleService.findCurrentShift(employee.id),
      this.prisma.payrollPolicy.findUnique({ where: { tenantId: employee.tenantId } }),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        startedAt: { gte: startOfDay },
      },
      include: {
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const attendanceState = this.mapAttendanceState(session?.status ?? null);
    const activeBreak = session?.breaks[0] ?? null;
    const breakPolicy = policy ?? {
      defaultBreakIsPaid: false,
      maxBreakMinutes: 60,
      mandatoryBreakThresholdMinutes: 360,
      mandatoryBreakDurationMinutes: 30,
    };
    const mandatoryBreakDue = session
      ? this.isMandatoryBreakDue(session, activeBreak, breakPolicy)
      : false;

    return {
      employeeId: employee.id,
      attendanceState,
      allowedActions: this.resolveAllowedActions(attendanceState),
      location: {
        id: shift?.location.id ?? employee.primaryLocation.id,
        name: shift?.location.name ?? employee.primaryLocation.name,
        radiusMeters: shift?.location.geofenceRadiusMeters ?? employee.primaryLocation.geofenceRadiusMeters,
      },
      shift: shift
        ? {
            id: shift.id,
            label: shift.template.name,
            startsAt: shift.startsAt.toISOString(),
            endsAt: shift.endsAt.toISOString(),
          }
        : null,
      verification: {
        locationRequired: true,
        selfieRequired: true,
        deviceMustBePrimary: true,
      },
      breakPolicy: {
        defaultBreakIsPaid: breakPolicy.defaultBreakIsPaid,
        maxBreakMinutes: breakPolicy.maxBreakMinutes,
        mandatoryBreakThresholdMinutes: breakPolicy.mandatoryBreakThresholdMinutes,
        mandatoryBreakDurationMinutes: breakPolicy.mandatoryBreakDurationMinutes,
        mandatoryBreakDue,
      },
      activeSession: session
        ? {
            id: session.id,
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt?.toISOString() ?? null,
            breakMinutes: session.breakMinutes,
            paidBreakMinutes: session.paidBreakMinutes,
            activeBreak: activeBreak
              ? {
                  id: activeBreak.id,
                  startedAt: activeBreak.startedAt.toISOString(),
                  isPaid: activeBreak.isPaid,
                }
              : null,
          }
        : null,
    };
  }

  async checkIn(userId: string, dto: AttendanceActionDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { primaryLocation: true },
    });

    const shift = await this.scheduleService.findCurrentShift(employee.id);
    if (!shift) {
      throw new BadRequestException('No scheduled shift found for today.');
    }

    const existingSession = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: [AttendanceSessionStatus.OPEN, AttendanceSessionStatus.ON_BREAK] },
      },
    });

    if (existingSession) {
      throw new BadRequestException('Employee already has an open attendance session.');
    }

    const context = await this.validateActionContext(employee, userId, dto, {
      location: shift.location,
      eventType: AttendanceEventType.CHECK_IN,
    });

    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.attendanceEvent.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          eventType: AttendanceEventType.CHECK_IN,
          result: AttendanceResult.ACCEPTED,
          occurredAt: new Date(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyMeters: dto.accuracyMeters,
          distanceMeters: context.distanceMeters,
          notes: dto.notes,
          locationId: shift.location.id,
          deviceId: context.device.id,
        },
      });

      if (context.biometricVerificationId) {
        const updated = await tx.biometricVerification.updateMany({
          where: {
            id: context.biometricVerificationId,
            employeeId: employee.id,
            attendanceEventId: null,
          },
          data: {
            attendanceEventId: createdEvent.id,
          },
        });

        if (updated.count === 0) {
          throw new ForbiddenException('Biometric verification has already been used for another attendance event.');
        }
      }

      return createdEvent;
    });

    const lateMinutes = Math.max(0, Math.round((event.occurredAt.getTime() - shift.startsAt.getTime()) / 60000));

    const session = await this.prisma.attendanceSession.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        shiftId: shift.id,
        checkInEventId: event.id,
        startedAt: event.occurredAt,
        status: AttendanceSessionStatus.OPEN,
        lateMinutes,
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'attendance_session',
      entityId: session.id,
      action: 'attendance.check_in',
      metadata: {
        eventId: event.id,
        distanceMeters: Math.round(context.distanceMeters),
        shiftId: shift.id,
        lateMinutes,
      },
    });

    await this.publishTeamSnapshot(employee.tenantId);

    return {
      eventId: event.id,
      sessionId: session.id,
      result: 'accepted',
      recordedAt: event.serverRecordedAt.toISOString(),
      distanceMeters: Math.round(context.distanceMeters),
      lateMinutes,
    };
  }

  async startBreak(userId: string, dto: AttendanceActionDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { primaryLocation: true },
    });

    const policy = await this.prisma.payrollPolicy.findUnique({
      where: { tenantId: employee.tenantId },
    });

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: AttendanceSessionStatus.OPEN,
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new BadRequestException('No active attendance session available for break start.');
    }

    if (session.breaks[0]) {
      throw new BadRequestException('Employee already has an active break.');
    }

    const context = await this.validateActionContext(employee, userId, dto, {
      location: session.shift?.location ?? employee.primaryLocation,
      eventType: AttendanceEventType.BREAK_START,
    });

    const event = await this.prisma.attendanceEvent.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        eventType: AttendanceEventType.BREAK_START,
        result: AttendanceResult.ACCEPTED,
        occurredAt: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        distanceMeters: context.distanceMeters,
        notes: dto.notes,
        locationId: context.location.id,
        deviceId: context.device.id,
      },
    });

    const attendanceBreak = await this.prisma.attendanceBreak.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        sessionId: session.id,
        startEventId: event.id,
        startedAt: event.occurredAt,
        isPaid: dto.isPaidBreak ?? policy?.defaultBreakIsPaid ?? false,
      },
    });

    await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: AttendanceSessionStatus.ON_BREAK },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'attendance_break',
      entityId: attendanceBreak.id,
      action: 'attendance.break_started',
      metadata: {
        sessionId: session.id,
        eventId: event.id,
        isPaid: attendanceBreak.isPaid,
        distanceMeters: Math.round(context.distanceMeters),
      },
    });

    await this.publishTeamSnapshot(employee.tenantId);

    return {
      breakId: attendanceBreak.id,
      sessionId: session.id,
      result: 'accepted',
      recordedAt: event.serverRecordedAt.toISOString(),
      distanceMeters: Math.round(context.distanceMeters),
      isPaid: attendanceBreak.isPaid,
    };
  }

  async endBreak(userId: string, dto: AttendanceActionDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { primaryLocation: true },
    });

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: AttendanceSessionStatus.ON_BREAK,
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new BadRequestException('No active break found.');
    }

    const activeBreak = session.breaks[0];
    if (!activeBreak) {
      throw new BadRequestException('Attendance session is in an invalid break state.');
    }

    const context = await this.validateActionContext(employee, userId, dto, {
      location: session.shift?.location ?? employee.primaryLocation,
      eventType: AttendanceEventType.BREAK_END,
    });

    const result = await this.closeBreak({
      employeeId: employee.id,
      tenantId: employee.tenantId,
      actorUserId: userId,
      sessionId: session.id,
      activeBreakId: activeBreak.id,
      activeBreakStartedAt: activeBreak.startedAt,
      activeBreakIsPaid: activeBreak.isPaid,
      dto,
      context,
      returnSessionToStatus: AttendanceSessionStatus.OPEN,
      action: 'attendance.break_ended',
    });

    await this.publishTeamSnapshot(employee.tenantId);
    return result;
  }

  async checkOut(userId: string, dto: AttendanceActionDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { primaryLocation: true },
    });

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: [AttendanceSessionStatus.OPEN, AttendanceSessionStatus.ON_BREAK] },
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new BadRequestException('No open attendance session found.');
    }

    const context = await this.validateActionContext(employee, userId, dto, {
      location: session.shift?.location ?? employee.primaryLocation,
      eventType: AttendanceEventType.CHECK_OUT,
    });

    let unpaidBreakIncrement = 0;
    let paidBreakIncrement = 0;

    if (session.status === AttendanceSessionStatus.ON_BREAK) {
      const activeBreak = session.breaks[0];
      if (!activeBreak) {
        throw new BadRequestException('Attendance session is in an invalid break state.');
      }

      const breakClose = await this.closeBreak({
        employeeId: employee.id,
        tenantId: employee.tenantId,
        actorUserId: userId,
        sessionId: session.id,
        activeBreakId: activeBreak.id,
        activeBreakStartedAt: activeBreak.startedAt,
        activeBreakIsPaid: activeBreak.isPaid,
        dto,
        context,
        returnSessionToStatus: AttendanceSessionStatus.ON_BREAK,
        action: 'attendance.break_auto_closed_on_checkout',
      });

      unpaidBreakIncrement = breakClose.unpaidBreakIncrement;
      paidBreakIncrement = breakClose.paidBreakIncrement;
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.attendanceEvent.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          eventType: AttendanceEventType.CHECK_OUT,
          result: AttendanceResult.ACCEPTED,
          occurredAt: new Date(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyMeters: dto.accuracyMeters,
          distanceMeters: context.distanceMeters,
          notes: dto.notes,
          locationId: context.location.id,
          deviceId: context.device.id,
        },
      });

      if (context.biometricVerificationId) {
        const updated = await tx.biometricVerification.updateMany({
          where: {
            id: context.biometricVerificationId,
            employeeId: employee.id,
            attendanceEventId: null,
          },
          data: {
            attendanceEventId: createdEvent.id,
          },
        });

        if (updated.count === 0) {
          throw new ForbiddenException('Biometric verification has already been used for another attendance event.');
        }
      }

      return createdEvent;
    });

    const totalMinutes = Math.max(0, Math.round((event.occurredAt.getTime() - session.startedAt.getTime()) / 60000));
    const earlyLeaveMinutes = Math.max(
      0,
      Math.round(((session.shift?.endsAt ?? event.occurredAt).getTime() - event.occurredAt.getTime()) / 60000),
    );

    const updatedSession = await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        checkOutEventId: event.id,
        endedAt: event.occurredAt,
        totalMinutes,
        earlyLeaveMinutes,
        status: AttendanceSessionStatus.CLOSED,
        breakMinutes: {
          increment: unpaidBreakIncrement,
        },
        paidBreakMinutes: {
          increment: paidBreakIncrement,
        },
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'attendance_session',
      entityId: updatedSession.id,
      action: 'attendance.check_out',
      metadata: {
        eventId: event.id,
        totalMinutes,
        distanceMeters: Math.round(context.distanceMeters),
        shiftId: session.shiftId,
        earlyLeaveMinutes,
        unpaidBreakIncrement,
        paidBreakIncrement,
      },
    });

    await this.publishTeamSnapshot(employee.tenantId);

    return {
      eventId: event.id,
      sessionId: updatedSession.id,
      result: 'accepted',
      recordedAt: event.serverRecordedAt.toISOString(),
      totalMinutes,
      distanceMeters: Math.round(context.distanceMeters),
      earlyLeaveMinutes,
      breakMinutes: updatedSession.breakMinutes,
      paidBreakMinutes: updatedSession.paidBreakMinutes,
    };
  }

  async liveTeam(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        tenantId,
        startedAt: { gte: startOfDay },
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryLocation: true,
          },
        },
        shift: {
          include: {
            template: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return sessions.map((session) => this.serializeLiveSession(session));
  }

  async myHistory(userId: string, query: AttendanceHistoryQueryDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.buildHistory(employee.tenantId, {
      ...query,
      employeeId: employee.id,
    });
  }

  async teamHistory(tenantId: string, query: AttendanceHistoryQueryDto) {
    return this.buildHistory(tenantId, query);
  }

  async teamAudit(tenantId: string, query: AttendanceAuditQueryDto) {
    const range = this.resolveRange(query.dateFrom, query.dateTo);
    const safeLimit = Math.min(Math.max(query.limit ?? 60, 1), 200);

    const [events, rejectedAttemptLogs] = await Promise.all([
      this.prisma.attendanceEvent.findMany({
        where: {
          tenantId,
          employeeId: query.employeeId,
          occurredAt: {
            gte: range.start,
            lte: range.end,
          },
        },
        include: {
          employee: {
            include: {
              department: true,
            },
          },
          location: true,
          device: true,
          biometricChecks: {
            orderBy: { capturedAt: 'desc' },
            take: 1,
            include: {
              reviewerEmployee: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          entityType: 'attendance_attempt',
          action: 'attendance.rejected_attempt',
          createdAt: {
            gte: range.start,
            lte: range.end,
          },
          ...(query.employeeId ? { entityId: query.employeeId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
    ]);

    const parsedRejectedAttemptLogs = rejectedAttemptLogs
      .map((log) => ({
        createdAt: log.createdAt,
        id: log.id,
        metadata: this.parseAuditMetadata(log.metadataJson),
      }))
      .filter((log) => !log.metadata.resolvedDeviceId);

    const rejectedAttemptEmployeeIds = Array.from(
      new Set(
        parsedRejectedAttemptLogs
          .map((log) => {
            if (typeof log.metadata.employeeId === 'string') {
              return log.metadata.employeeId;
            }
            if (typeof log.metadata.entityId === 'string') {
              return log.metadata.entityId;
            }
            return null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const rejectedAttemptLocationIds = Array.from(
      new Set(
        parsedRejectedAttemptLogs
          .map((log) =>
            typeof log.metadata.locationId === 'string' ? log.metadata.locationId : null,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const rejectedAttemptEmployees = rejectedAttemptEmployeeIds.length
      ? await this.prisma.employee.findMany({
          where: { tenantId, id: { in: rejectedAttemptEmployeeIds } },
          include: { department: true },
        })
      : [];
    const rejectedAttemptLocations = rejectedAttemptLocationIds.length
      ? await this.prisma.location.findMany({
          where: { tenantId, id: { in: rejectedAttemptLocationIds } },
        })
      : [];

    const rejectedAttemptEmployeesMap = new Map(
      rejectedAttemptEmployees.map((employee) => [employee.id, employee]),
    );
    const rejectedAttemptLocationsMap = new Map(
      rejectedAttemptLocations.map((location) => [location.id, location]),
    );

    const eventItems = events.map((event) => {
      const biometricCheck = event.biometricChecks[0] ?? null;

      return {
        eventId: event.id,
        source: 'ATTENDANCE_EVENT' as const,
        employeeId: event.employee.id,
        employeeName: `${event.employee.firstName} ${event.employee.lastName}`,
        employeeNumber: event.employee.employeeNumber,
        department: event.employee.department.name,
        eventType: event.eventType,
        result: event.result,
        occurredAt: event.occurredAt.toISOString(),
        serverRecordedAt: event.serverRecordedAt.toISOString(),
        latitude: event.latitude,
        longitude: event.longitude,
        accuracyMeters: event.accuracyMeters,
        distanceMeters: Math.round(event.distanceMeters),
        notes: event.notes,
        failureReason: event.result === AttendanceResult.REJECTED ? event.notes ?? null : null,
        location: {
          id: event.location.id,
          name: event.location.name,
          address: event.location.address,
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          geofenceRadiusMeters: event.location.geofenceRadiusMeters,
        },
        device: {
          id: event.device.id,
          name: event.device.deviceName,
          platform: event.device.platform,
          isPrimary: event.device.isPrimary,
        },
        biometricVerification: biometricCheck
          ? {
              id: biometricCheck.id,
              result: biometricCheck.result,
              manualReviewStatus: biometricCheck.manualReviewStatus,
              capturedAt: biometricCheck.capturedAt.toISOString(),
              livenessScore: biometricCheck.livenessScore,
              matchScore: biometricCheck.matchScore,
              reviewReason: biometricCheck.reviewReason,
              reviewedAt: biometricCheck.reviewedAt?.toISOString() ?? null,
              reviewerComment: biometricCheck.reviewerComment,
              reviewerEmployee: biometricCheck.reviewerEmployee
                ? {
                    id: biometricCheck.reviewerEmployee.id,
                    firstName: biometricCheck.reviewerEmployee.firstName,
                    lastName: biometricCheck.reviewerEmployee.lastName,
                  }
                : null,
            }
          : null,
      };
    });

    const logItems = parsedRejectedAttemptLogs
      .map((log) => {
        const employeeId =
          typeof log.metadata.employeeId === 'string'
            ? log.metadata.employeeId
            : typeof log.metadata.entityId === 'string'
              ? log.metadata.entityId
              : null;
        const employee = employeeId ? rejectedAttemptEmployeesMap.get(employeeId) : null;
        const location =
          typeof log.metadata.locationId === 'string'
            ? rejectedAttemptLocationsMap.get(log.metadata.locationId)
            : null;

        if (!employee || !location) {
          return null;
        }

        return {
          eventId: log.id,
          source: 'AUDIT_LOG' as const,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber,
          department: employee.department.name,
          eventType: (log.metadata.eventType as AttendanceEventType) ?? AttendanceEventType.CHECK_IN,
          result: AttendanceResult.REJECTED,
          occurredAt: log.createdAt.toISOString(),
          serverRecordedAt: log.createdAt.toISOString(),
          latitude: Number(log.metadata.latitude ?? location.latitude),
          longitude: Number(log.metadata.longitude ?? location.longitude),
          accuracyMeters: Number(log.metadata.accuracyMeters ?? 0),
          distanceMeters: Number(log.metadata.distanceMeters ?? 0),
          notes: null,
          failureReason:
            typeof log.metadata.reason === 'string' ? log.metadata.reason : 'Rejected attempt',
          location: {
            id: location.id,
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            geofenceRadiusMeters: location.geofenceRadiusMeters,
          },
          device: {
            id: null,
            name:
              typeof log.metadata.deviceFingerprint === 'string'
                ? `Unknown device (${log.metadata.deviceFingerprint})`
                : 'Unknown device',
            platform: null,
            isPrimary: null,
          },
          biometricVerification: null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const items = [...eventItems, ...logItems]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
      )
      .slice(0, safeLimit);

    return {
      range: {
        dateFrom: range.start.toISOString(),
        dateTo: range.end.toISOString(),
      },
      totals: {
        total: items.length,
        accepted: items.filter((item) => item.result === AttendanceResult.ACCEPTED).length,
        rejected: items.filter((item) => item.result === AttendanceResult.REJECTED).length,
        reviewRequired: items.filter(
          (item) =>
            item.biometricVerification?.result === 'REVIEW' ||
            item.biometricVerification?.manualReviewStatus === 'PENDING',
        ).length,
      },
      items,
    };
  }

  async employeeHistory(tenantId: string, employeeId: string, query: AttendanceHistoryQueryDto) {
    await this.prisma.employee.findFirstOrThrow({
      where: { tenantId, id: employeeId },
      select: { id: true },
    });

    return this.buildHistory(tenantId, {
      ...query,
      employeeId,
    });
  }

  async exportHistory(
    tenantId: string,
    actorUserId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    query: AttendanceHistoryExportQueryDto,
  ) {
    const payload = await this.generateHistoryExportArtifact(tenantId, format, query);
    const history = payload.history;

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'attendance_history',
      entityId: `${history.range.dateFrom}:${history.range.dateTo}`,
      action: 'attendance.history_exported',
      metadata: {
        format,
        employeeId: query.employeeId,
        dateFrom: history.range.dateFrom,
        dateTo: history.range.dateTo,
        rows: history.rows.length,
      },
    });

    return payload.file;
  }

  async generateHistoryExportArtifact(
    tenantId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    query: AttendanceHistoryExportQueryDto,
  ) {
    const history = await this.buildHistory(tenantId, query);
    const exportRows = history.rows.map((row) => ({
      'Employee Number': row.employeeNumber,
      'Employee Name': row.employeeName,
      Department: row.department,
      Location: row.location,
      Shift: row.shiftLabel ?? '',
      Status: row.status,
      'Started At': row.startedAt,
      'Ended At': row.endedAt ?? '',
      'Worked Hours': this.minutesToHours(row.workedMinutes),
      'Total Session Hours': this.minutesToHours(row.totalMinutes),
      'Unpaid Break Hours': this.minutesToHours(row.breakMinutes),
      'Paid Break Hours': this.minutesToHours(row.paidBreakMinutes),
      'Late Minutes': row.lateMinutes,
      'Early Leave Minutes': row.earlyLeaveMinutes,
      'Check In Distance Meters': row.checkInEvent.distanceMeters,
      'Check Out Distance Meters': row.checkOutEvent?.distanceMeters ?? '',
      'Break Count': row.breaks.length,
    }));
    const fileDate = `${history.range.dateFrom.slice(0, 10)}_${history.range.dateTo.slice(0, 10)}`;
    const employeeSuffix = query.employeeId ? `_employee` : '_team';

    if (format === 'csv') {
      return {
        history,
        file: {
          buffer: Buffer.from(this.toCsv(exportRows), 'utf-8'),
          fileName: `attendance_${fileDate}${employeeSuffix}.csv`,
          contentType: 'text/csv; charset=utf-8',
        },
      };
    }

    if (format === 'pdf') {
      return {
        history,
        file: {
          buffer: await this.buildAttendancePdf(history),
          fileName: `attendance_${fileDate}${employeeSuffix}.pdf`,
          contentType: 'application/pdf',
        },
      };
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    return {
      history,
      file: {
        buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
        fileName: `attendance_${fileDate}${employeeSuffix}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };
  }

  async correctSession(
    tenantId: string,
    actorUserId: string,
    actorRoleCodes: string[],
    sessionId: string,
    dto: CorrectAttendanceSessionDto,
  ) {
    if (!this.canDirectlyCorrect(actorRoleCodes)) {
      throw new ForbiddenException('Current role cannot apply attendance corrections directly.');
    }

    return this.applySessionCorrection(tenantId, actorUserId, sessionId, dto, 'attendance.session_corrected');
  }

  async createCorrectionRequest(
    tenantId: string,
    actorUserId: string,
    sessionId: string,
    dto: CreateAttendanceCorrectionRequestDto,
  ) {
    const requester = await this.prisma.employee.findUniqueOrThrow({
      where: { userId: actorUserId },
    });

    const session = await this.prisma.attendanceSession.findFirstOrThrow({
      where: { tenantId, id: sessionId },
      include: {
        employee: true,
      },
    });

    const existingPending = await this.prisma.attendanceCorrectionRequest.findFirst({
      where: {
        tenantId,
        sessionId,
        status: AttendanceCorrectionStatus.PENDING,
      },
      select: { id: true },
    });

    if (existingPending) {
      throw new BadRequestException('A pending attendance correction request already exists for this session.');
    }

    const approver = await this.resolveCorrectionApprover(tenantId, requester.id);

    const correctionRequest = await this.prisma.attendanceCorrectionRequest.create({
      data: {
        tenantId,
        sessionId: session.id,
        employeeId: session.employeeId,
        requestedByEmployeeId: requester.id,
        approverEmployeeId: approver.id,
        reason: dto.reason,
        proposedStartedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        proposedEndedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        proposedBreakMinutes: dto.breakMinutes,
        proposedPaidBreakMinutes: dto.paidBreakMinutes,
      },
      include: {
        approverEmployee: {
          include: { user: true },
        },
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'attendance_correction_request',
      entityId: correctionRequest.id,
      action: 'attendance.correction_requested',
      metadata: {
        sessionId,
        employeeId: session.employeeId,
        approverEmployeeId: approver.id,
        payload: {
          startedAt: dto.startedAt ?? null,
          endedAt: dto.endedAt ?? null,
          breakMinutes: dto.breakMinutes ?? null,
          paidBreakMinutes: dto.paidBreakMinutes ?? null,
          reason: dto.reason,
        },
      },
    });

    if (correctionRequest.approverEmployee.userId) {
      await this.notificationsService.createForUser({
        tenantId,
        userId: correctionRequest.approverEmployee.userId,
        type: NotificationType.ATTENDANCE_CORRECTION_ACTION_REQUIRED,
        title: `Attendance correction requires approval`,
        body: `${requester.firstName} ${requester.lastName} requested a correction for ${session.employee.firstName} ${session.employee.lastName}.`,
        actionUrl: '/attendance',
        metadata: {
          correctionRequestId: correctionRequest.id,
          sessionId,
          employeeId: session.employeeId,
        },
      });
    }

    return {
      success: true,
      mode: 'approval_required',
      requestId: correctionRequest.id,
      status: correctionRequest.status,
    };
  }

  async correctionInbox(userId: string) {
    const approver = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    return this.prisma.attendanceCorrectionRequest.findMany({
      where: {
        tenantId: approver.tenantId,
        approverEmployeeId: approver.id,
        status: AttendanceCorrectionStatus.PENDING,
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryLocation: true,
          },
        },
        requestedByEmployee: true,
        session: {
          include: {
            shift: {
              include: {
                template: true,
              },
            },
          },
        },
        comments: {
          include: {
            authorEmployee: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveCorrectionRequest(userId: string, requestId: string, dto: AttendanceCorrectionActionDto) {
    const approver = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { user: true },
    });

    const correctionRequest = await this.prisma.attendanceCorrectionRequest.findFirstOrThrow({
      where: {
        id: requestId,
        tenantId: approver.tenantId,
      },
      include: {
        employee: {
          include: { user: true },
        },
        requestedByEmployee: {
          include: { user: true },
        },
      },
    });

    if (correctionRequest.approverEmployeeId !== approver.id) {
      throw new ForbiddenException('Current user is not the approver for this correction request.');
    }

    if (correctionRequest.status !== AttendanceCorrectionStatus.PENDING) {
      throw new BadRequestException('Correction request is already finalized.');
    }

    const result = await this.applySessionCorrection(
      approver.tenantId,
      userId,
      correctionRequest.sessionId,
      {
        startedAt: correctionRequest.proposedStartedAt?.toISOString(),
        endedAt: correctionRequest.proposedEndedAt?.toISOString(),
        breakMinutes: correctionRequest.proposedBreakMinutes ?? undefined,
        paidBreakMinutes: correctionRequest.proposedPaidBreakMinutes ?? undefined,
        reason: correctionRequest.reason,
      },
      'attendance.correction_request_approved',
    );

    await this.prisma.attendanceCorrectionRequest.update({
      where: { id: correctionRequest.id },
      data: {
        status: AttendanceCorrectionStatus.APPROVED,
        decisionComment: dto.comment,
        finalDecisionAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId: approver.tenantId,
      actorUserId: userId,
      entityType: 'attendance_correction_request',
      entityId: correctionRequest.id,
      action: 'attendance.correction_request.approved',
      metadata: {
        sessionId: correctionRequest.sessionId,
        comment: dto.comment ?? null,
      },
    });

    await this.notifyCorrectionDecision(approver.tenantId, correctionRequest, 'approved', dto.comment);

    return {
      success: true,
      requestId: correctionRequest.id,
      sessionId: correctionRequest.sessionId,
      status: result.status,
      correctionStatus: AttendanceCorrectionStatus.APPROVED,
    };
  }

  async rejectCorrectionRequest(userId: string, requestId: string, dto: AttendanceCorrectionActionDto) {
    const approver = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const correctionRequest = await this.prisma.attendanceCorrectionRequest.findFirstOrThrow({
      where: {
        id: requestId,
        tenantId: approver.tenantId,
      },
      include: {
        employee: {
          include: { user: true },
        },
        requestedByEmployee: {
          include: { user: true },
        },
      },
    });

    if (correctionRequest.approverEmployeeId !== approver.id) {
      throw new ForbiddenException('Current user is not the approver for this correction request.');
    }

    if (correctionRequest.status !== AttendanceCorrectionStatus.PENDING) {
      throw new BadRequestException('Correction request is already finalized.');
    }

    await this.prisma.attendanceCorrectionRequest.update({
      where: { id: correctionRequest.id },
      data: {
        status: AttendanceCorrectionStatus.REJECTED,
        decisionComment: dto.comment,
        finalDecisionAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId: approver.tenantId,
      actorUserId: userId,
      entityType: 'attendance_correction_request',
      entityId: correctionRequest.id,
      action: 'attendance.correction_request.rejected',
      metadata: {
        sessionId: correctionRequest.sessionId,
        comment: dto.comment ?? null,
      },
    });

    await this.notifyCorrectionDecision(approver.tenantId, correctionRequest, 'rejected', dto.comment);

    return {
      success: true,
      requestId: correctionRequest.id,
      correctionStatus: AttendanceCorrectionStatus.REJECTED,
    };
  }

  async addCorrectionComment(userId: string, requestId: string, body: string) {
    const actor = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const correctionRequest = await this.prisma.attendanceCorrectionRequest.findFirstOrThrow({
      where: {
        id: requestId,
        tenantId: actor.tenantId,
      },
      include: {
        employee: {
          include: { user: true },
        },
        requestedByEmployee: {
          include: { user: true },
        },
        approverEmployee: {
          include: { user: true },
        },
      },
    });

    const canAccess =
      correctionRequest.requestedByEmployeeId === actor.id ||
      correctionRequest.approverEmployeeId === actor.id ||
      correctionRequest.employeeId === actor.id;

    if (!canAccess) {
      throw new ForbiddenException('Current user cannot comment on this correction request.');
    }

    const comment = await this.prisma.attendanceCorrectionComment.create({
      data: {
        tenantId: actor.tenantId,
        correctionRequestId: correctionRequest.id,
        authorEmployeeId: actor.id,
        body,
      },
      include: {
        authorEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: actor.tenantId,
      actorUserId: userId,
      entityType: 'attendance_correction_comment',
      entityId: comment.id,
      action: 'attendance.correction_comment_added',
      metadata: {
        correctionRequestId: correctionRequest.id,
      },
    });

    const recipients = new Map<string, string>();
    recipients.set(correctionRequest.requestedByEmployee.userId, '/attendance');
    recipients.set(correctionRequest.approverEmployee.userId, '/attendance');
    recipients.set(correctionRequest.employee.userId, '/employee');
    recipients.delete(actor.userId);

    for (const [recipientUserId, actionUrl] of recipients.entries()) {
      await this.notificationsService.createForUser({
        tenantId: actor.tenantId,
        userId: recipientUserId,
        type: NotificationType.ATTENDANCE_CORRECTION_ACTION_REQUIRED,
        title: 'New comment on attendance correction',
        body,
        actionUrl,
        metadata: {
          correctionRequestId: correctionRequest.id,
          commentId: comment.id,
        },
      });
    }

    return comment;
  }

  async teamAnomalies(tenantId: string, query: AttendanceAnomaliesQueryDto) {
    const day = query.dateTo ? new Date(query.dateTo) : query.date ? new Date(query.date) : query.dateFrom ? new Date(query.dateFrom) : new Date();
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const lookbackStart = new Date(day);
    lookbackStart.setDate(lookbackStart.getDate() - 30);

    const [policy, shifts, sessions, latenessSessions, requests] = await Promise.all([
      this.prisma.payrollPolicy.findUnique({ where: { tenantId } }),
      this.prisma.shift.findMany({
        where: {
          tenantId,
          employeeId: query.employeeId,
          shiftDate: {
            gte: day,
            lte: dayEnd,
          },
        },
        include: {
          employee: {
            include: {
              department: true,
              primaryLocation: true,
            },
          },
          location: true,
          template: true,
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: {
          tenantId,
          employeeId: query.employeeId,
          startedAt: {
            gte: day,
            lte: dayEnd,
          },
        },
        include: {
          employee: {
            include: {
              department: true,
              primaryLocation: true,
            },
          },
          shift: {
            include: {
              template: true,
              location: true,
            },
          },
          breaks: {
            where: { endedAt: null },
            orderBy: { startedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: {
          tenantId,
          employeeId: query.employeeId,
          startedAt: {
            gte: lookbackStart,
            lte: dayEnd,
          },
          lateMinutes: { gt: 0 },
        },
        include: {
          employee: {
            include: {
              department: true,
              primaryLocation: true,
            },
          },
        },
      }),
      this.prisma.employeeRequest.findMany({
        where: {
          tenantId,
          employeeId: query.employeeId,
          status: 'APPROVED',
          startsOn: { lte: dayEnd },
          endsOn: { gte: day },
          requestType: { in: ['LEAVE', 'SICK_LEAVE'] },
        },
      }),
    ]);

    const shiftIdToSession = new Map(sessions.filter((session) => session.shiftId).map((session) => [session.shiftId as string, session]));
    const approvedAbsenceEmployeeIds = new Set(requests.map((request) => request.employeeId));
    const latenessByEmployee = new Map<string, number>();

    for (const session of latenessSessions) {
      latenessByEmployee.set(session.employeeId, (latenessByEmployee.get(session.employeeId) ?? 0) + 1);
    }

    const anomalies: Array<{
      anomalyId: string;
      type: 'MISSED_CHECK_IN' | 'MISSED_CHECK_OUT' | 'LONG_BREAK' | 'EARLY_LEAVE' | 'REPEATED_LATENESS';
      severity: 'critical' | 'warning';
      employeeId: string;
      employeeName: string;
      employeeNumber: string;
      department: string;
      location: string;
      shiftLabel: string | null;
      detectedAt: string;
      summary: string;
      details: string;
      actionUrl: string;
    }> = [];

    const now = new Date();

    for (const shift of shifts) {
      const session = shiftIdToSession.get(shift.id);
      const employeeName = `${shift.employee.firstName} ${shift.employee.lastName}`;
      const baseMeta = {
        employeeId: shift.employee.id,
        employeeName,
        employeeNumber: shift.employee.employeeNumber,
        department: shift.employee.department.name,
        location: shift.location.name,
        shiftLabel: shift.template.name,
        actionUrl: `/employees/${shift.employee.id}`,
      };

      if (!session && !approvedAbsenceEmployeeIds.has(shift.employee.id)) {
        const graceCutoff = new Date(shift.startsAt.getTime() + shift.template.gracePeriodMinutes * 60000);
        if (now > graceCutoff) {
          anomalies.push({
            anomalyId: `missed-check-in:${shift.id}`,
            type: 'MISSED_CHECK_IN',
            severity: 'critical',
            detectedAt: now.toISOString(),
            summary: `${employeeName} did not check in for the scheduled shift.`,
            details: `Shift ${shift.template.name} started at ${shift.startsAt.toISOString()}. No attendance session was found after grace period.`,
            ...baseMeta,
          });
        }
      }

      if (session && (session.status === AttendanceSessionStatus.OPEN || session.status === AttendanceSessionStatus.ON_BREAK) && now > shift.endsAt) {
        anomalies.push({
          anomalyId: `missed-check-out:${session.id}`,
          type: 'MISSED_CHECK_OUT',
          severity: 'critical',
          detectedAt: now.toISOString(),
          summary: `${employeeName} still has an open shift after scheduled end.`,
          details: `Shift ${shift.template.name} ended at ${shift.endsAt.toISOString()}, but attendance session is still ${session.status.toLowerCase()}.`,
          ...baseMeta,
        });
      }

      if (session && session.status === AttendanceSessionStatus.ON_BREAK && session.breaks[0]) {
        const activeBreakMinutes = this.diffMinutes(session.breaks[0].startedAt, now);
        const maxBreakMinutes = policy?.maxBreakMinutes ?? 60;

        if (activeBreakMinutes > maxBreakMinutes) {
          anomalies.push({
            anomalyId: `long-break:${session.breaks[0].id}`,
            type: 'LONG_BREAK',
            severity: activeBreakMinutes > maxBreakMinutes + 15 ? 'critical' : 'warning',
            detectedAt: now.toISOString(),
            summary: `${employeeName} exceeded the allowed break duration.`,
            details: `Active ${session.breaks[0].isPaid ? 'paid' : 'unpaid'} break is ${activeBreakMinutes} minutes. Policy max is ${maxBreakMinutes} minutes.`,
            ...baseMeta,
          });
        }
      }

      if (session && session.earlyLeaveMinutes > 10) {
        anomalies.push({
          anomalyId: `early-leave:${session.id}`,
          type: 'EARLY_LEAVE',
          severity: session.earlyLeaveMinutes > 30 ? 'critical' : 'warning',
          detectedAt: session.endedAt?.toISOString() ?? now.toISOString(),
          summary: `${employeeName} left the shift early.`,
          details: `Early leave recorded: ${session.earlyLeaveMinutes} minutes before scheduled shift end.`,
          ...baseMeta,
        });
      }
    }

    for (const session of latenessSessions) {
      const occurrences = latenessByEmployee.get(session.employeeId) ?? 0;
      if (occurrences < 3) {
        continue;
      }

      if (anomalies.some((item) => item.type === 'REPEATED_LATENESS' && item.employeeId === session.employeeId)) {
        continue;
      }

      const employeeName = `${session.employee.firstName} ${session.employee.lastName}`;
      anomalies.push({
        anomalyId: `repeated-lateness:${session.employeeId}`,
        type: 'REPEATED_LATENESS',
        severity: occurrences >= 5 ? 'critical' : 'warning',
        employeeId: session.employee.id,
        employeeName,
        employeeNumber: session.employee.employeeNumber,
        department: session.employee.department.name,
        location: session.employee.primaryLocation.name,
        shiftLabel: null,
        detectedAt: now.toISOString(),
        summary: `${employeeName} has repeated lateness.`,
        details: `${occurrences} late arrivals were recorded in the last 30 days.`,
        actionUrl: `/employees/${session.employee.id}`,
      });
    }

    const sortedItems = anomalies.sort((left, right) => {
      const severityOrder = left.severity === right.severity ? 0 : left.severity === 'critical' ? -1 : 1;
      if (severityOrder !== 0) {
        return severityOrder;
      }

      return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
    });

    return {
      date: day.toISOString(),
      totals: {
        critical: sortedItems.filter((item) => item.severity === 'critical').length,
        warning: sortedItems.filter((item) => item.severity === 'warning').length,
      },
      items: sortedItems,
    };
  }

  private canDirectlyCorrect(roleCodes: string[]) {
    return roleCodes.some((role) => ['tenant_owner', 'hr_admin', 'operations_admin'].includes(role));
  }

  private async applySessionCorrection(
    tenantId: string,
    actorUserId: string,
    sessionId: string,
    dto: CorrectAttendanceSessionDto,
    auditAction: string,
  ) {
    const session = await this.prisma.attendanceSession.findFirstOrThrow({
      where: { tenantId, id: sessionId },
      include: {
        shift: true,
        checkInEvent: true,
        checkOutEvent: true,
        employee: true,
      },
    });

    const nextStartedAt = dto.startedAt ? new Date(dto.startedAt) : session.startedAt;
    const nextEndedAt = dto.endedAt ? new Date(dto.endedAt) : session.endedAt;

    if (nextEndedAt && nextEndedAt < nextStartedAt) {
      throw new BadRequestException('Corrected end time cannot be earlier than corrected start time.');
    }

    const totalMinutes = nextEndedAt ? this.diffMinutes(nextStartedAt, nextEndedAt) : session.totalMinutes;
    const breakMinutes = dto.breakMinutes ?? session.breakMinutes;
    const paidBreakMinutes = dto.paidBreakMinutes ?? session.paidBreakMinutes;

    if (breakMinutes + paidBreakMinutes > totalMinutes) {
      throw new BadRequestException('Break totals cannot exceed total session duration.');
    }

    const lateMinutes =
      dto.lateMinutes ??
      (session.shift ? Math.max(0, this.diffMinutes(session.shift.startsAt, nextStartedAt)) : session.lateMinutes);
    const earlyLeaveMinutes =
      dto.earlyLeaveMinutes ??
      (session.shift && nextEndedAt ? Math.max(0, this.diffMinutes(nextEndedAt, session.shift.endsAt)) : 0);
    const nextStatus = nextEndedAt ? AttendanceSessionStatus.CLOSED : AttendanceSessionStatus.OPEN;

    const beforeSnapshot = {
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      totalMinutes: session.totalMinutes,
      breakMinutes: session.breakMinutes,
      paidBreakMinutes: session.paidBreakMinutes,
      lateMinutes: session.lateMinutes,
      earlyLeaveMinutes: session.earlyLeaveMinutes,
      status: session.status,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      let checkOutEventId = session.checkOutEventId;

      if (nextEndedAt && session.checkOutEventId && session.checkOutEvent) {
        await tx.attendanceEvent.update({
          where: { id: session.checkOutEventId },
          data: {
            occurredAt: nextEndedAt,
            notes: session.checkOutEvent.notes
              ? `${session.checkOutEvent.notes} | manager correction`
              : 'manager correction',
          },
        });
      }

      if (nextEndedAt && !session.checkOutEventId) {
        const correctionEvent = await tx.attendanceEvent.create({
          data: {
            tenantId,
            employeeId: session.employeeId,
            eventType: AttendanceEventType.CHECK_OUT,
            result: AttendanceResult.ACCEPTED,
            occurredAt: nextEndedAt,
            latitude: session.checkInEvent.latitude,
            longitude: session.checkInEvent.longitude,
            accuracyMeters: session.checkInEvent.accuracyMeters,
            distanceMeters: session.checkInEvent.distanceMeters,
            notes: 'Manager correction check-out',
            locationId: session.checkInEvent.locationId,
            deviceId: session.checkInEvent.deviceId,
          },
        });
        checkOutEventId = correctionEvent.id;
      }

      await tx.attendanceEvent.update({
        where: { id: session.checkInEventId },
        data: {
          occurredAt: nextStartedAt,
          notes: session.checkInEvent.notes
            ? `${session.checkInEvent.notes} | manager correction`
            : 'manager correction',
        },
      });

      return tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          startedAt: nextStartedAt,
          endedAt: nextEndedAt,
          totalMinutes,
          breakMinutes,
          paidBreakMinutes,
          lateMinutes,
          earlyLeaveMinutes,
          status: nextStatus,
          checkOutEventId,
        },
      });
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'attendance_session',
      entityId: session.id,
      action: auditAction,
      metadata: {
        reason: dto.reason,
        before: beforeSnapshot,
        after: {
          startedAt: result.startedAt.toISOString(),
          endedAt: result.endedAt?.toISOString() ?? null,
          totalMinutes: result.totalMinutes,
          breakMinutes: result.breakMinutes,
          paidBreakMinutes: result.paidBreakMinutes,
          lateMinutes: result.lateMinutes,
          earlyLeaveMinutes: result.earlyLeaveMinutes,
          status: result.status,
        },
      },
    });

    await this.publishTeamSnapshot(tenantId);

    return {
      success: true,
      sessionId: result.id,
      status: result.status,
    };
  }

  private async resolveCorrectionApprover(tenantId: string, requesterEmployeeId: string) {
    const approver = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        id: {
          not: requesterEmployeeId,
        },
        user: {
          roles: {
            some: {
              role: {
                code: {
                  in: ['hr_admin', 'operations_admin', 'tenant_owner'],
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!approver) {
      throw new BadRequestException('No approver is configured for attendance correction requests.');
    }

    return approver;
  }

  private async notifyCorrectionDecision(
    tenantId: string,
    correctionRequest: {
      id: string;
      sessionId: string;
      employee: { userId: string; firstName: string; lastName: string };
      requestedByEmployee: { userId: string; firstName: string; lastName: string };
    },
    decision: 'approved' | 'rejected',
    comment?: string,
  ) {
    const recipients = new Map<string, string>();
    recipients.set(correctionRequest.requestedByEmployee.userId, '/attendance');
    recipients.set(correctionRequest.employee.userId, '/employee');

    const type =
      decision === 'approved'
        ? NotificationType.ATTENDANCE_CORRECTION_APPROVED
        : NotificationType.ATTENDANCE_CORRECTION_REJECTED;

    const title =
      decision === 'approved'
        ? 'Attendance correction approved'
        : 'Attendance correction rejected';

    const bodyBase = `${correctionRequest.employee.firstName} ${correctionRequest.employee.lastName}`;
    const body = comment
      ? `${bodyBase}: ${comment}`
      : `${bodyBase}: correction request was ${decision}.`;

    for (const [userId, actionUrl] of recipients.entries()) {
      await this.notificationsService.createForUser({
        tenantId,
        userId,
        type,
        title,
        body,
        actionUrl,
        metadata: {
          correctionRequestId: correctionRequest.id,
          sessionId: correctionRequest.sessionId,
          decision,
        },
      });
    }
  }

  private async notifyCriticalAnomalies(tenantId: string) {
    const anomalies = await this.teamAnomalies(tenantId, {});
    const criticalItems = anomalies.items.filter((item) => item.severity === 'critical');

    if (criticalItems.length === 0) {
      return;
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        tenantId,
        roles: {
          some: {
            role: {
              code: {
                in: ['tenant_owner', 'hr_admin', 'operations_admin'],
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (recipients.length === 0) {
      return;
    }

    for (const anomaly of criticalItems) {
      try {
        await this.prisma.attendanceAnomalyNotification.create({
          data: {
            tenantId,
            anomalyKey: anomaly.anomalyId,
            type: anomaly.type,
            severity: anomaly.severity,
            employeeId: anomaly.employeeId,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }

      for (const recipient of recipients) {
        await this.notificationsService.createForUser({
          tenantId,
          userId: recipient.id,
          type: NotificationType.ATTENDANCE_ANOMALY_CRITICAL,
          title: 'Critical attendance anomaly',
          body: anomaly.summary,
          actionUrl: '/attendance',
          metadata: {
            anomalyId: anomaly.anomalyId,
            type: anomaly.type,
            employeeId: anomaly.employeeId,
          },
        });
      }
    }
  }

  private mapAttendanceState(status: AttendanceSessionStatus | null) {
    if (status === AttendanceSessionStatus.OPEN) {
      return 'checked_in';
    }

    if (status === AttendanceSessionStatus.ON_BREAK) {
      return 'on_break';
    }

    if (status === AttendanceSessionStatus.CLOSED) {
      return 'checked_out';
    }

    return 'not_checked_in';
  }

  private resolveAllowedActions(
    attendanceState: 'not_checked_in' | 'checked_in' | 'on_break' | 'checked_out',
  ): Array<'check_in' | 'check_out' | 'start_break' | 'end_break'> {
    if (attendanceState === 'checked_in') {
      return ['start_break', 'check_out'];
    }

    if (attendanceState === 'on_break') {
      return ['end_break', 'check_out'];
    }

    return ['check_in'];
  }

  private async validateActionContext(
    employee: {
      id: string;
      tenantId: string;
      userId: string;
    },
    actorUserId: string,
    dto: AttendanceActionDto,
    context: {
      eventType: AttendanceEventType;
      location: {
        id: string;
        latitude: number;
        longitude: number;
        geofenceRadiusMeters: number;
      };
    },
  ) {
    const device = await this.devicesService.resolveActiveDevice(
      employee.id,
      dto.deviceFingerprint,
    );
    if (!device || !device.isPrimary) {
      await this.recordRejectedAttendanceAttempt({
        actorUserId,
        dto,
        employee,
        reason: !device
          ? 'Unregistered device fingerprint.'
          : 'Current device is not the employee primary device.',
        eventType: context.eventType,
        location: context.location,
        resolvedDevice: device,
      });
      throw new ForbiddenException('Current device is not the employee primary device.');
    }

    const distanceMeters = this.distanceMeters(
      dto.latitude,
      dto.longitude,
      context.location.latitude,
      context.location.longitude,
    );

    if (distanceMeters > context.location.geofenceRadiusMeters) {
      await this.recordRejectedAttendanceAttempt({
        actorUserId,
        dto,
        employee,
        reason: 'Employee is outside the allowed work area.',
        eventType: context.eventType,
        location: context.location,
        resolvedDevice: device,
      });
      throw new ForbiddenException('Employee is outside the allowed work area.');
    }

    let biometricVerificationId: string | null = null;

    if (context.eventType === AttendanceEventType.CHECK_IN || context.eventType === AttendanceEventType.CHECK_OUT) {
      if (!dto.biometricVerificationId) {
        await this.recordRejectedAttendanceAttempt({
          actorUserId,
          dto,
          employee,
          reason: 'A fresh biometric verification is required for this attendance action.',
          eventType: context.eventType,
          location: context.location,
          resolvedDevice: device,
        });
        throw new ForbiddenException('A fresh biometric verification is required for this attendance action.');
      }

      try {
        await this.biometricService.requireFreshAttendanceVerification(employee.id, dto.biometricVerificationId);
        biometricVerificationId = dto.biometricVerificationId;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Biometric verification failed.';
        await this.recordRejectedAttendanceAttempt({
          actorUserId,
          dto,
          employee,
          reason,
          eventType: context.eventType,
          location: context.location,
          resolvedDevice: device,
        });
        throw error;
      }
    }

    return {
      device,
      location: context.location,
      distanceMeters,
      biometricVerificationId,
    };
  }

  private async recordRejectedAttendanceAttempt(args: {
    actorUserId: string;
    dto: AttendanceActionDto;
    employee: {
      id: string;
      tenantId: string;
      userId: string;
    };
    eventType: AttendanceEventType;
    location: {
      id: string;
      latitude: number;
      longitude: number;
      geofenceRadiusMeters: number;
    };
    reason: string;
    resolvedDevice: {
      id: string;
      isPrimary: boolean;
      platform: unknown;
      deviceName: string | null;
    } | null;
  }) {
    const distanceMeters = this.distanceMeters(
      args.dto.latitude,
      args.dto.longitude,
      args.location.latitude,
      args.location.longitude,
    );

    if (args.resolvedDevice) {
      await this.prisma.attendanceEvent.create({
        data: {
          tenantId: args.employee.tenantId,
          employeeId: args.employee.id,
          eventType: args.eventType,
          result: AttendanceResult.REJECTED,
          occurredAt: new Date(),
          latitude: args.dto.latitude,
          longitude: args.dto.longitude,
          accuracyMeters: args.dto.accuracyMeters,
          distanceMeters,
          notes: args.dto.notes
            ? `${args.reason} | ${args.dto.notes}`
            : args.reason,
          locationId: args.location.id,
          deviceId: args.resolvedDevice.id,
        },
      });
    }

    await this.auditService.log({
      tenantId: args.employee.tenantId,
      actorUserId: args.actorUserId || args.employee.userId,
      entityType: 'attendance_attempt',
      entityId: args.employee.id,
      action: 'attendance.rejected_attempt',
      metadata: {
        eventType: args.eventType,
        reason: args.reason,
        latitude: args.dto.latitude,
        longitude: args.dto.longitude,
        accuracyMeters: args.dto.accuracyMeters,
        distanceMeters: Math.round(distanceMeters),
        locationId: args.location.id,
        expectedRadiusMeters: args.location.geofenceRadiusMeters,
        deviceFingerprint: args.dto.deviceFingerprint,
        biometricVerificationId: args.dto.biometricVerificationId ?? null,
        resolvedDeviceId: args.resolvedDevice?.id ?? null,
        resolvedDeviceName: args.resolvedDevice?.deviceName ?? null,
        resolvedDeviceIsPrimary: args.resolvedDevice?.isPrimary ?? null,
      },
    });
  }

  private async closeBreak(args: {
    employeeId: string;
    tenantId: string;
    actorUserId: string;
    sessionId: string;
    activeBreakId: string;
    activeBreakStartedAt: Date;
    activeBreakIsPaid: boolean;
    dto: AttendanceActionDto;
    context: {
      device: { id: string };
      location: { id: string };
      distanceMeters: number;
    };
    returnSessionToStatus: AttendanceSessionStatus;
    action: string;
  }) {
    const policy = await this.prisma.payrollPolicy.findUnique({
      where: { tenantId: args.tenantId },
    });

    const event = await this.prisma.attendanceEvent.create({
      data: {
        tenantId: args.tenantId,
        employeeId: args.employeeId,
        eventType: AttendanceEventType.BREAK_END,
        result: AttendanceResult.ACCEPTED,
        occurredAt: new Date(),
        latitude: args.dto.latitude,
        longitude: args.dto.longitude,
        accuracyMeters: args.dto.accuracyMeters,
        distanceMeters: args.context.distanceMeters,
        notes: args.dto.notes,
        locationId: args.context.location.id,
        deviceId: args.context.device.id,
      },
    });

    const breakDurationMinutes = Math.max(
      0,
      Math.round((event.occurredAt.getTime() - args.activeBreakStartedAt.getTime()) / 60000),
    );
    const exceededPolicy = breakDurationMinutes > (policy?.maxBreakMinutes ?? 60);

    await this.prisma.$transaction([
      this.prisma.attendanceBreak.update({
        where: { id: args.activeBreakId },
        data: {
          endEventId: event.id,
          endedAt: event.occurredAt,
          totalMinutes: breakDurationMinutes,
        },
      }),
      this.prisma.attendanceSession.update({
        where: { id: args.sessionId },
        data: {
          status: args.returnSessionToStatus,
          breakMinutes: args.returnSessionToStatus === AttendanceSessionStatus.OPEN && !args.activeBreakIsPaid
            ? { increment: breakDurationMinutes }
            : undefined,
          paidBreakMinutes: args.returnSessionToStatus === AttendanceSessionStatus.OPEN && args.activeBreakIsPaid
            ? { increment: breakDurationMinutes }
            : undefined,
        },
      }),
    ]);

    await this.auditService.log({
      tenantId: args.tenantId,
      actorUserId: args.actorUserId,
      entityType: 'attendance_break',
      entityId: args.activeBreakId,
      action: args.action,
      metadata: {
        eventId: event.id,
        breakDurationMinutes,
        isPaid: args.activeBreakIsPaid,
        exceededPolicy,
        maxBreakMinutes: policy?.maxBreakMinutes ?? 60,
        sessionId: args.sessionId,
        distanceMeters: Math.round(args.context.distanceMeters),
      },
    });

    return {
      eventId: event.id,
      breakDurationMinutes,
      unpaidBreakIncrement: args.activeBreakIsPaid ? 0 : breakDurationMinutes,
      paidBreakIncrement: args.activeBreakIsPaid ? breakDurationMinutes : 0,
      exceededPolicy,
      recordedAt: event.serverRecordedAt.toISOString(),
    };
  }

  private isMandatoryBreakDue(
    session: {
      startedAt: Date;
      breakMinutes: number;
      paidBreakMinutes: number;
    },
    activeBreak: {
      startedAt: Date;
      isPaid: boolean;
    } | null,
    policy: {
      mandatoryBreakThresholdMinutes: number;
      mandatoryBreakDurationMinutes: number;
    },
  ) {
    if (policy.mandatoryBreakThresholdMinutes <= 0 || policy.mandatoryBreakDurationMinutes <= 0) {
      return false;
    }

    const now = new Date();
    const activeBreakMinutes = activeBreak
      ? Math.max(0, Math.round((now.getTime() - activeBreak.startedAt.getTime()) / 60000))
      : 0;
    const totalWorkedMinutes = Math.max(
      0,
      this.diffMinutes(session.startedAt, now) - session.breakMinutes - session.paidBreakMinutes - activeBreakMinutes,
    );
    const totalBreakTaken =
      session.breakMinutes + session.paidBreakMinutes + activeBreakMinutes;

    return (
      totalWorkedMinutes >= policy.mandatoryBreakThresholdMinutes &&
      totalBreakTaken < policy.mandatoryBreakDurationMinutes
    );
  }

  private async publishTeamSnapshot(tenantId: string) {
    const sessions = await this.liveTeam(tenantId);
    await this.attendanceRealtimeService.fanout({
      tenantId,
      sessions,
    });
    await this.notifyCriticalAnomalies(tenantId);
  }

  private diffMinutes(start: Date, end: Date) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  private minutesToHours(minutes: number) {
    return Number((minutes / 60).toFixed(2));
  }

  private toCsv(rows: Array<Record<string, string | number>>) {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    return [
      headers.map(escape).join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(',')),
    ].join('\n');
  }

  private buildAttendancePdf(history: Awaited<ReturnType<AttendanceService['buildHistory']>>) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Attendance Report', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#555').text(
        `${history.range.dateFrom.slice(0, 10)} - ${history.range.dateTo.slice(0, 10)}`,
      );
      doc.fillColor('#111');
      doc.moveDown();
      doc.fontSize(11).text(
        `Sessions: ${history.totals.sessions} | Worked: ${this.minutesToHours(history.totals.workedMinutes)}h | Breaks: ${this.minutesToHours(history.totals.breakMinutes)}h | Paid breaks: ${this.minutesToHours(history.totals.paidBreakMinutes)}h`,
      );
      doc.moveDown();

      for (const row of history.rows.slice(0, 40)) {
        doc.fontSize(11).text(`${row.employeeName} (${row.employeeNumber})`, { continued: true }).fontSize(10).text(`  ${row.department} / ${row.location}`);
        doc.fontSize(9).fillColor('#444').text(
          `Status: ${row.status} | Shift: ${row.shiftLabel ?? 'Unassigned'} | Worked: ${this.minutesToHours(row.workedMinutes)}h | Breaks: ${this.minutesToHours(row.breakMinutes)}h | Late: ${row.lateMinutes}m | Early: ${row.earlyLeaveMinutes}m`,
        );
        doc.text(
          `Check-in: ${new Date(row.checkInEvent.occurredAt).toLocaleString()} | Check-out: ${row.checkOutEvent ? new Date(row.checkOutEvent.occurredAt).toLocaleString() : 'open'}`,
        );
        if (row.breaks.length > 0) {
          doc.text(
            `Break timeline: ${row.breaks
              .map((item) => `${item.isPaid ? 'paid' : 'unpaid'} ${new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${item.endedAt ? new Date(item.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'open'} (${this.minutesToHours(item.totalMinutes)}h)`)
              .join('; ')}`,
          );
        }
        doc.fillColor('#111');
        doc.moveDown(0.7);

        if (doc.y > 740) {
          doc.addPage();
        }
      }

      doc.end();
    });
  }

  private async buildHistory(tenantId: string, query: AttendanceHistoryQueryDto) {
    const range = this.resolveRange(query.dateFrom, query.dateTo);

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        tenantId,
        employeeId: query.employeeId,
        status: query.status,
        startedAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryLocation: true,
          },
        },
        shift: {
          include: {
            template: true,
            location: true,
          },
        },
        checkInEvent: true,
        checkOutEvent: true,
        breaks: {
          include: {
            startEvent: true,
            endEvent: true,
          },
          orderBy: { startedAt: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });

    return {
      range: {
        dateFrom: range.start.toISOString(),
        dateTo: range.end.toISOString(),
      },
      totals: {
        sessions: sessions.length,
        workedMinutes: sessions.reduce((sum, session) => sum + Math.max(0, session.totalMinutes - session.breakMinutes), 0),
        breakMinutes: sessions.reduce((sum, session) => sum + session.breakMinutes, 0),
        paidBreakMinutes: sessions.reduce((sum, session) => sum + session.paidBreakMinutes, 0),
        lateMinutes: sessions.reduce((sum, session) => sum + session.lateMinutes, 0),
        earlyLeaveMinutes: sessions.reduce((sum, session) => sum + session.earlyLeaveMinutes, 0),
      },
      rows: sessions.map((session) => ({
        sessionId: session.id,
        employeeId: session.employee.id,
        employeeName: `${session.employee.firstName} ${session.employee.lastName}`,
        employeeNumber: session.employee.employeeNumber,
        department: session.employee.department.name,
        location: session.shift?.location.name ?? session.employee.primaryLocation.name,
        shiftLabel: session.shift?.template.name ?? null,
        status: this.serializeSessionStatus(session.status),
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        totalMinutes: session.totalMinutes,
        workedMinutes: Math.max(0, session.totalMinutes - session.breakMinutes),
        breakMinutes: session.breakMinutes,
        paidBreakMinutes: session.paidBreakMinutes,
        lateMinutes: session.lateMinutes,
        earlyLeaveMinutes: session.earlyLeaveMinutes,
        checkInEvent: {
          occurredAt: session.checkInEvent.occurredAt.toISOString(),
          distanceMeters: Math.round(session.checkInEvent.distanceMeters),
          notes: session.checkInEvent.notes,
        },
        checkOutEvent: session.checkOutEvent
          ? {
              occurredAt: session.checkOutEvent.occurredAt.toISOString(),
              distanceMeters: Math.round(session.checkOutEvent.distanceMeters),
              notes: session.checkOutEvent.notes,
            }
          : null,
        breaks: session.breaks.map((attendanceBreak) => ({
          id: attendanceBreak.id,
          startedAt: attendanceBreak.startedAt.toISOString(),
          endedAt: attendanceBreak.endedAt?.toISOString() ?? null,
          totalMinutes: attendanceBreak.totalMinutes,
          isPaid: attendanceBreak.isPaid,
          startEvent: {
            occurredAt: attendanceBreak.startEvent.occurredAt.toISOString(),
            distanceMeters: Math.round(attendanceBreak.startEvent.distanceMeters),
          },
          endEvent: attendanceBreak.endEvent
            ? {
                occurredAt: attendanceBreak.endEvent.occurredAt.toISOString(),
                distanceMeters: Math.round(attendanceBreak.endEvent.distanceMeters),
              }
            : null,
        })),
      })),
    };
  }

  private resolveRange(dateFrom?: string, dateTo?: string) {
    const start = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = dateTo ? new Date(dateTo) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private parseAuditMetadata(raw: string | null) {
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private serializeLiveSession(session: {
    id: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      department: { name: string };
      primaryLocation: { name: string };
    };
    shift: { template: { name: string } } | null;
    status: AttendanceSessionStatus;
    startedAt: Date;
    endedAt: Date | null;
    totalMinutes: number;
    breakMinutes: number;
    paidBreakMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  }) {
    return {
      sessionId: session.id,
      employeeId: session.employee.id,
      employeeName: `${session.employee.firstName} ${session.employee.lastName}`,
      employeeNumber: session.employee.employeeNumber,
      department: session.employee.department.name,
      location: session.employee.primaryLocation.name,
      shiftLabel: session.shift?.template.name ?? null,
      status: this.serializeSessionStatus(session.status),
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      totalMinutes: session.totalMinutes,
      breakMinutes: session.breakMinutes,
      paidBreakMinutes: session.paidBreakMinutes,
      lateMinutes: session.lateMinutes,
      earlyLeaveMinutes: session.earlyLeaveMinutes,
    };
  }

  private serializeSessionStatus(status: AttendanceSessionStatus) {
    return status === AttendanceSessionStatus.OPEN
      ? 'on_shift'
      : status === AttendanceSessionStatus.ON_BREAK
        ? 'on_break'
        : 'checked_out';
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }
}

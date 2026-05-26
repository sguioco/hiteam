import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AttendanceEventType,
  AttendanceResult,
  AttendanceSessionStatus,
  NotificationType,
  RequestStatus,
  ShiftStatus,
  TaskStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly diagnosticsService: DiagnosticsService,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  @Cron('*/15 * * * *')
  async autoCloseMissedCheckouts() {
    const graceMinutes = 60;
    const now = new Date();

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        status: { in: [AttendanceSessionStatus.OPEN, AttendanceSessionStatus.ON_BREAK] },
        shift: {
          endsAt: {
            lt: new Date(now.getTime() - graceMinutes * 60000),
          },
        },
      },
      include: {
        shift: true,
        checkInEvent: true,
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      take: 50,
    });

    for (const session of sessions) {
      await this.prisma.$transaction(async (tx) => {
        const checkoutTime = session.shift?.endsAt ?? now;
        const checkoutEvent = await tx.attendanceEvent.create({
          data: {
            tenantId: session.tenantId,
            employeeId: session.employeeId,
            eventType: AttendanceEventType.CHECK_OUT,
            result: AttendanceResult.ACCEPTED,
            occurredAt: checkoutTime,
            latitude: session.checkInEvent.latitude,
            longitude: session.checkInEvent.longitude,
            accuracyMeters: session.checkInEvent.accuracyMeters,
            distanceMeters: session.checkInEvent.distanceMeters,
            notes: 'Auto check-out by scheduler',
            locationId: session.checkInEvent.locationId,
            deviceId: session.checkInEvent.deviceId,
          },
        });

        let breakMinutes = session.breakMinutes;
        let paidBreakMinutes = session.paidBreakMinutes;

        if (session.status === AttendanceSessionStatus.ON_BREAK && session.breaks[0]) {
          const activeBreak = session.breaks[0];
          const breakDurationMinutes = Math.max(
            0,
            Math.round((checkoutTime.getTime() - activeBreak.startedAt.getTime()) / 60000),
          );

          const breakEndEvent = await tx.attendanceEvent.create({
            data: {
              tenantId: session.tenantId,
              employeeId: session.employeeId,
              eventType: AttendanceEventType.BREAK_END,
              result: AttendanceResult.ACCEPTED,
              occurredAt: checkoutTime,
              latitude: session.checkInEvent.latitude,
              longitude: session.checkInEvent.longitude,
              accuracyMeters: session.checkInEvent.accuracyMeters,
              distanceMeters: session.checkInEvent.distanceMeters,
              notes: 'Auto break end by scheduler',
              locationId: session.checkInEvent.locationId,
              deviceId: session.checkInEvent.deviceId,
            },
          });

          await tx.attendanceBreak.update({
            where: { id: activeBreak.id },
            data: {
              endEventId: breakEndEvent.id,
              endedAt: checkoutTime,
              totalMinutes: breakDurationMinutes,
            },
          });

          if (activeBreak.isPaid) {
            paidBreakMinutes += breakDurationMinutes;
          } else {
            breakMinutes += breakDurationMinutes;
          }
        }

        await tx.attendanceSession.update({
          where: { id: session.id },
          data: {
            checkOutEventId: checkoutEvent.id,
            endedAt: checkoutTime,
            totalMinutes: Math.max(0, Math.round((checkoutTime.getTime() - session.startedAt.getTime()) / 60000)),
            status: AttendanceSessionStatus.CLOSED,
            breakMinutes,
            paidBreakMinutes,
          },
        });
      });

      await this.auditService.log({
        tenantId: session.tenantId,
        entityType: 'attendance_session',
        entityId: session.id,
        action: 'scheduler.auto_checked_out',
        metadata: {
          shiftId: session.shiftId,
        },
      });
    }

    if (sessions.length > 0) {
      this.logger.log(`Auto-closed ${sessions.length} missed checkout sessions.`);
    }
  }

  @Cron('0 8 * * *')
  async sendDailyDigest() {
    const today = new Date().toISOString().slice(0, 10);
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    for (const tenant of tenants) {
      const entityId = `${tenant.id}:${today}`;
      const alreadySent = await this.prisma.auditLog.findFirst({
        where: {
          entityType: 'scheduler_daily_digest',
          entityId,
          action: 'scheduler.daily_digest_sent',
        },
      });

      if (alreadySent) {
        continue;
      }

      const [criticalAnomalies, pendingApprovals, diagnosticsTrends, recipients] = await Promise.all([
        this.prisma.attendanceAnomalyNotification.count({
          where: {
            tenantId: tenant.id,
            severity: 'critical',
            createdAt: {
              gte: new Date(`${today}T00:00:00.000Z`),
            },
          },
        }),
        this.prisma.requestApprovalStep.count({
          where: {
            tenantId: tenant.id,
            status: 'PENDING',
            request: {
              status: RequestStatus.PENDING,
            },
          },
        }),
        this.diagnosticsService.trends(tenant.id, { hours: 24 }),
        this.prisma.user.findMany({
          where: {
            tenantId: tenant.id,
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
        }),
      ]);

      for (const recipient of recipients) {
        await this.notificationsService.createForUser({
          tenantId: tenant.id,
          userId: recipient.id,
          type: NotificationType.DAILY_DIGEST,
          title: `Daily digest: ${tenant.name}`,
          body: `Critical anomalies: ${criticalAnomalies}. Pending approvals: ${pendingApprovals}. Max export queue age: ${diagnosticsTrends.totals.maxExportQueueAge} min. Max biometric queue age: ${diagnosticsTrends.totals.maxBiometricQueueAge} min. Push receipt errors: ${diagnosticsTrends.totals.maxPushReceiptErrors}.`,
          actionUrl: '/',
          metadata: {
            date: today,
            criticalAnomalies,
            pendingApprovals,
            maxExportQueueAge: diagnosticsTrends.totals.maxExportQueueAge,
            maxBiometricQueueAge: diagnosticsTrends.totals.maxBiometricQueueAge,
            maxPushReceiptErrors: diagnosticsTrends.totals.maxPushReceiptErrors,
            slaBreaches: diagnosticsTrends.totals.slaBreaches,
          },
        });
      }

      await this.auditService.log({
        tenantId: tenant.id,
        entityType: 'scheduler_daily_digest',
        entityId,
        action: 'scheduler.daily_digest_sent',
        metadata: {
          recipients: recipients.length,
          criticalAnomalies,
          pendingApprovals,
          maxExportQueueAge: diagnosticsTrends.totals.maxExportQueueAge,
          maxBiometricQueueAge: diagnosticsTrends.totals.maxBiometricQueueAge,
          maxPushReceiptErrors: diagnosticsTrends.totals.maxPushReceiptErrors,
          slaBreaches: diagnosticsTrends.totals.slaBreaches,
        },
      });
    }
  }

  @Cron('*/10 * * * *')
  async reconcilePushReceipts() {
    const result = await this.pushService.reconcileReceipts();

    if (result.checked > 0) {
      this.logger.log(`Reconciled ${result.checked} Expo push receipt batches.`);
    }
  }

  @Cron('* * * * *')
  async sendUserControlledReminders() {
    const now = new Date();

    await this.sendTaskAndMeetingReminders(now);
    await this.sendShiftReminders(now);
  }

  private async sendTaskAndMeetingReminders(now: Date) {
    const catchupStart = new Date(now.getTime() - 5 * 60000);
    const lookAhead = new Date(now.getTime() + 60 * 60000);
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        dueAt: {
          gte: catchupStart,
          lte: lookAhead,
        },
      },
      include: {
        assigneeEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            user: {
              select: {
                id: true,
                notificationTaskDeadlineRemindersEnabled: true,
                notificationTaskDeadlineReminderMinutes: true,
                notificationMeetingRemindersEnabled: true,
                notificationMeetingReminderMinutes: true,
              },
            },
          },
        },
        managerEmployee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
      take: 200,
    });

    for (const task of tasks) {
      const assigneeUser = task.assigneeEmployee?.user;
      if (!task.dueAt || !assigneeUser) {
        continue;
      }

      const dueAt = task.dueAt;
      const managerName = `${task.managerEmployee.firstName} ${task.managerEmployee.lastName}`.trim();
      const isMeeting = this.isMeetingTask(task.title, task.description);

      if (isMeeting) {
        if (!assigneeUser.notificationMeetingRemindersEnabled) {
          continue;
        }

        const minutes = this.normalizeReminderMinutes(
          assigneeUser.notificationMeetingReminderMinutes,
          15,
        );
        const reminderAt = new Date(dueAt.getTime() - minutes * 60000);

        if (!this.isReminderDue(reminderAt, now)) {
          continue;
        }

        const reminderKey = `meeting:${task.id}:before:${minutes}`;
        if (await this.hasReminderNotification(assigneeUser.id, reminderKey)) {
          continue;
        }

        await this.notificationsService.createForUser({
          tenantId: task.tenantId,
          userId: assigneeUser.id,
          type: NotificationType.OPERATIONS_ALERT,
          title: `Meeting starts in ${this.formatReminderLead(minutes)}: ${task.title}`,
          body: `${managerName || 'Manager'} added this meeting to your calendar.`,
          actionUrl: '/employee/calendar',
          pushPreference: 'meetingReminders',
          metadata: {
            taskId: task.id,
            reminderKind: 'meeting_start',
            reminderKey,
          },
        });
        continue;
      }

      if (!assigneeUser.notificationTaskDeadlineRemindersEnabled) {
        continue;
      }

      const minutes = this.normalizeReminderMinutes(
        assigneeUser.notificationTaskDeadlineReminderMinutes,
        30,
      );
      const deadlineReminderAt = new Date(dueAt.getTime() - minutes * 60000);

      if (dueAt > now && this.isReminderDue(deadlineReminderAt, now)) {
        const reminderKey = `task:${task.id}:deadline:${minutes}`;
        if (!(await this.hasReminderNotification(assigneeUser.id, reminderKey))) {
          await this.notificationsService.createForUser({
            tenantId: task.tenantId,
            userId: assigneeUser.id,
            type: NotificationType.OPERATIONS_ALERT,
            title: `Task deadline in ${this.formatReminderLead(minutes)}: ${task.title}`,
            body: `${managerName || 'Manager'} is waiting for this task.`,
            actionUrl: '/employee/tasks',
            pushPreference: 'taskDeadlineReminders',
            metadata: {
              taskId: task.id,
              reminderKind: 'task_deadline',
              reminderKey,
            },
          });
        }
      }

      if (dueAt <= now && dueAt >= catchupStart) {
        const reminderKey = `task:${task.id}:overdue`;
        if (await this.hasReminderNotification(assigneeUser.id, reminderKey)) {
          continue;
        }

        await this.notificationsService.createForUser({
          tenantId: task.tenantId,
          userId: assigneeUser.id,
          type: NotificationType.OPERATIONS_ALERT,
          title: `Task is overdue: ${task.title}`,
          body: `${managerName || 'Manager'} is waiting for this task.`,
          actionUrl: '/employee/tasks',
          pushPreference: 'taskDeadlineReminders',
          metadata: {
            taskId: task.id,
            reminderKind: 'task_overdue',
            reminderKey,
          },
        });
      }
    }
  }

  private async sendShiftReminders(now: Date) {
    const eventWindowStart = new Date(now.getTime() + 10 * 60000);
    const eventWindowEnd = new Date(now.getTime() + 16 * 60000);
    const shifts = await this.prisma.shift.findMany({
      where: {
        status: ShiftStatus.PUBLISHED,
        tenant: {
          attendanceTrackingEnabled: true,
        },
        OR: [
          {
            startsAt: {
              gte: eventWindowStart,
              lte: eventWindowEnd,
            },
          },
          {
            endsAt: {
              gte: eventWindowStart,
              lte: eventWindowEnd,
            },
          },
        ],
      },
      include: {
        employee: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                notificationShiftRemindersEnabled: true,
              },
            },
          },
        },
        template: {
          select: {
            name: true,
          },
        },
        tenant: {
          select: {
            timezone: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });

    for (const shift of shifts) {
      const user = shift.employee.user;
      if (!user?.notificationShiftRemindersEnabled) {
        continue;
      }

      if (this.isReminderDue(new Date(shift.startsAt.getTime() - 15 * 60000), now)) {
        const reminderKey = `shift:${shift.id}:start`;
        if (!(await this.hasReminderNotification(user.id, reminderKey))) {
          await this.notificationsService.createForUser({
            tenantId: shift.tenantId,
            userId: user.id,
            type: NotificationType.OPERATIONS_ALERT,
            title: 'Say Hi reminder',
            body: `${shift.template.name} starts at ${this.formatTime(shift.startsAt, shift.tenant.timezone)}.`,
            actionUrl: '/employee/attendance',
            pushPreference: 'shiftReminders',
            metadata: {
              shiftId: shift.id,
              reminderKind: 'shift_start',
              reminderKey,
            },
          });
        }
      }

      if (this.isReminderDue(new Date(shift.endsAt.getTime() - 15 * 60000), now)) {
        const reminderKey = `shift:${shift.id}:end`;
        if (await this.hasReminderNotification(user.id, reminderKey)) {
          continue;
        }

        await this.notificationsService.createForUser({
          tenantId: shift.tenantId,
          userId: user.id,
          type: NotificationType.OPERATIONS_ALERT,
          title: 'Say Bye reminder',
          body: `${shift.template.name} ends at ${this.formatTime(shift.endsAt, shift.tenant.timezone)}.`,
          actionUrl: '/employee/attendance',
          pushPreference: 'shiftReminders',
          metadata: {
            shiftId: shift.id,
            reminderKind: 'shift_end',
            reminderKey,
          },
        });
      }
    }
  }

  private isReminderDue(reminderAt: Date, now: Date) {
    const catchupStart = new Date(now.getTime() - 5 * 60000);
    return reminderAt <= now && reminderAt >= catchupStart;
  }

  private normalizeReminderMinutes(value: number | null | undefined, fallback: 15 | 30) {
    return value === 15 || value === 30 || value === 60 ? value : fallback;
  }

  private formatReminderLead(minutes: number) {
    return minutes === 60 ? '1 hour' : `${minutes} minutes`;
  }

  private formatTime(value: Date, timeZone: string) {
    try {
      return value.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      });
    } catch {
      return value.toISOString().slice(11, 16);
    }
  }

  private isMeetingTask(title: string, description: string | null) {
    if (/^(meeting|встреча):/i.test(title.trim())) {
      return true;
    }

    const markerIndex = (description ?? '').lastIndexOf('[smart-task-meta]');
    if (markerIndex === -1) {
      return false;
    }

    const rawMeta = (description ?? '').slice(markerIndex + '[smart-task-meta]'.length).trim();
    try {
      const parsed = JSON.parse(rawMeta) as { kind?: string };
      return parsed.kind === 'meeting';
    } catch {
      return false;
    }
  }

  private async hasReminderNotification(userId: string, reminderKey: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        userId,
        metadataJson: {
          contains: `"reminderKey":"${reminderKey}"`,
        },
      },
      select: { id: true },
    });

    return Boolean(notification);
  }

  @Cron('5,20,35,50 * * * *')
  async captureDiagnosticsSnapshots() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.diagnosticsService.captureSnapshot(tenant.id);
    }
  }

  @Cron('0,30 * * * *')
  async sendOperationalEscalations() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    for (const tenant of tenants) {
      const policy = await this.diagnosticsService.getPolicy(tenant.id);
      const summary = await this.diagnosticsService.summary(tenant.id);
      const criticalAlerts = summary.alerts.filter((alert) => alert.severity === 'critical');

      if (criticalAlerts.length === 0) {
        continue;
      }

      const bucketStart = new Date(
        Math.floor(Date.now() / (policy.repeatIntervalMinutes * 60000)) * policy.repeatIntervalMinutes * 60000,
      );
      const bucketKey = bucketStart.toISOString();
      const roleCodes = [
        ...(policy.notifyTenantOwner ? ['tenant_owner'] : []),
        ...(policy.notifyHrAdmin ? ['hr_admin'] : []),
        ...(policy.notifyOperationsAdmin ? ['operations_admin'] : []),
        ...(policy.notifyManagers ? ['manager'] : []),
      ];

      if (roleCodes.length === 0) {
        continue;
      }

      const recipients = await this.prisma.user.findMany({
        where: {
          tenantId: tenant.id,
          roles: {
            some: {
              role: {
                code: {
                  in: roleCodes,
                },
              },
            },
          },
        },
        select: { id: true },
      });

      for (const alert of criticalAlerts) {
        const entityId = `${tenant.id}:${bucketKey}:${alert.id}`;
        const alreadySent = await this.prisma.auditLog.findFirst({
          where: {
            entityType: 'scheduler_operations_alert',
            entityId,
            action: 'scheduler.operations_alert_sent',
          },
          select: { id: true },
        });

        if (alreadySent) {
          continue;
        }

        for (const recipient of recipients) {
          await this.notificationsService.createForUser({
            tenantId: tenant.id,
            userId: recipient.id,
            type: 'OPERATIONS_ALERT' as NotificationType,
            title: `${tenant.name}: ${alert.title}`,
            body: alert.detail,
            actionUrl: '/diagnostics',
            metadata: {
              alertId: alert.id,
              severity: alert.severity,
              asOf: summary.asOf,
            },
          });
        }

        await this.auditService.log({
          tenantId: tenant.id,
          entityType: 'scheduler_operations_alert',
          entityId,
          action: 'scheduler.operations_alert_sent',
          metadata: {
            title: alert.title,
            detail: alert.detail,
            severity: alert.severity,
            recipients: recipients.length,
            asOf: summary.asOf,
            roleCodes,
            repeatIntervalMinutes: policy.repeatIntervalMinutes,
          },
        });
      }
    }
  }
}

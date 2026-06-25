import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AttendanceEventType,
  AttendanceResult,
  AttendanceSessionStatus,
  BiometricEnrollmentStatus,
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
import { StorageService } from '../storage/storage.service';

const PRIVACY_RETENTION_BATCH_SIZE = 100;
const GEOLOCATION_AUDIT_FIELDS = [
  'latitude',
  'longitude',
  'accuracyMeters',
  'distanceMeters',
] as const;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly diagnosticsService: DiagnosticsService,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
    private readonly storageService: StorageService,
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

  @Cron('30 3 * * *')
  async enforcePrivacyRetention() {
    const cutoff = this.getPrivacyRetentionCutoff();
    const [
      biometricProfiles,
      biometricArtifacts,
      biometricVerifications,
      biometricJobs,
      taskPhotoProofs,
      attendanceEvents,
      auditLogs,
    ] = await Promise.all([
      this.purgeExpiredBiometricProfiles(cutoff),
      this.purgeExpiredBiometricArtifacts(cutoff),
      this.purgeExpiredBiometricVerifications(cutoff),
      this.purgeExpiredBiometricJobs(cutoff),
      this.purgeExpiredTaskPhotoProofs(cutoff),
      this.scrubExpiredAttendanceGeolocation(cutoff),
      this.scrubExpiredGeolocationAuditLogs(cutoff),
    ]);

    const touched =
      biometricProfiles.updated +
      biometricArtifacts.deleted +
      biometricVerifications.deleted +
      biometricJobs.deleted +
      taskPhotoProofs.deleted +
      attendanceEvents.updated +
      auditLogs.updated;

    if (touched > 0) {
      this.logger.log(
        `Privacy retention cleanup completed for cutoff ${cutoff.toISOString()}: ` +
          `biometricProfiles=${biometricProfiles.updated}, ` +
          `biometricArtifacts=${biometricArtifacts.deleted}, ` +
          `biometricVerifications=${biometricVerifications.deleted}, ` +
          `biometricJobs=${biometricJobs.deleted}, ` +
          `taskPhotoProofs=${taskPhotoProofs.deleted}, ` +
          `attendanceEvents=${attendanceEvents.updated}, ` +
          `auditLogs=${auditLogs.updated}.`,
      );
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

  private getPrivacyRetentionCutoff(now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
    return cutoff;
  }

  private async purgeExpiredBiometricProfiles(cutoff: Date) {
    let updated = 0;

    while (true) {
      const profiles = await this.prisma.biometricProfile.findMany({
        where: {
          enrollmentStatus: BiometricEnrollmentStatus.ENROLLED,
          enrolledAt: { lt: cutoff },
        },
        select: {
          id: true,
          templateRef: true,
        },
        take: PRIVACY_RETENTION_BATCH_SIZE,
      });

      if (profiles.length === 0) {
        break;
      }

      const deletedKeys = await this.deleteStoredObjects(profiles.map((profile) => profile.templateRef));
      const resettableIds = profiles
        .filter((profile) => !this.isStoredObjectKey(profile.templateRef) || deletedKeys.has(profile.templateRef))
        .map((profile) => profile.id);

      if (resettableIds.length === 0) {
        this.logger.warn('Privacy retention stopped biometric profile cleanup because storage deletion failed.');
        break;
      }

      const result = await this.prisma.biometricProfile.updateMany({
        where: { id: { in: resettableIds } },
        data: {
          enrollmentStatus: BiometricEnrollmentStatus.NOT_STARTED,
          templateRef: null,
          enrolledAt: null,
          lastVerifiedAt: null,
        },
      });
      updated += result.count;
    }

    return { updated };
  }

  private async purgeExpiredBiometricArtifacts(cutoff: Date) {
    let deleted = 0;

    while (true) {
      const artifacts = await this.prisma.biometricArtifact.findMany({
        where: { createdAt: { lt: cutoff } },
        select: {
          id: true,
          storageKey: true,
        },
        orderBy: { createdAt: 'asc' },
        take: PRIVACY_RETENTION_BATCH_SIZE,
      });

      if (artifacts.length === 0) {
        break;
      }

      const deletedKeys = await this.deleteStoredObjects(artifacts.map((artifact) => artifact.storageKey));
      const removableIds = artifacts
        .filter((artifact) => !this.isStoredObjectKey(artifact.storageKey) || deletedKeys.has(artifact.storageKey))
        .map((artifact) => artifact.id);

      if (removableIds.length === 0) {
        this.logger.warn('Privacy retention stopped biometric artifact cleanup because storage deletion failed.');
        break;
      }

      const result = await this.prisma.biometricArtifact.deleteMany({
        where: { id: { in: removableIds } },
      });
      deleted += result.count;
    }

    return { deleted };
  }

  private async purgeExpiredBiometricVerifications(cutoff: Date) {
    const result = await this.prisma.biometricVerification.deleteMany({
      where: { capturedAt: { lt: cutoff } },
    });

    return { deleted: result.count };
  }

  private async purgeExpiredBiometricJobs(cutoff: Date) {
    const result = await this.prisma.biometricJob.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return { deleted: result.count };
  }

  private async purgeExpiredTaskPhotoProofs(cutoff: Date) {
    let deleted = 0;

    while (true) {
      const proofs = await this.prisma.taskPhotoProof.findMany({
        where: { createdAt: { lt: cutoff } },
        select: {
          id: true,
          storageKey: true,
        },
        orderBy: { createdAt: 'asc' },
        take: PRIVACY_RETENTION_BATCH_SIZE,
      });

      if (proofs.length === 0) {
        break;
      }

      const deletedKeys = await this.deleteStoredObjects(proofs.map((proof) => proof.storageKey));
      const removableIds = proofs
        .filter((proof) => !this.isStoredObjectKey(proof.storageKey) || deletedKeys.has(proof.storageKey))
        .map((proof) => proof.id);

      if (removableIds.length === 0) {
        this.logger.warn('Privacy retention stopped task photo cleanup because storage deletion failed.');
        break;
      }

      const result = await this.prisma.taskPhotoProof.deleteMany({
        where: { id: { in: removableIds } },
      });
      deleted += result.count;
    }

    return { deleted };
  }

  private async scrubExpiredAttendanceGeolocation(cutoff: Date) {
    const result = await this.prisma.attendanceEvent.updateMany({
      where: {
        occurredAt: { lt: cutoff },
        OR: [
          { latitude: { not: 0 } },
          { longitude: { not: 0 } },
          { accuracyMeters: { not: 0 } },
          { distanceMeters: { not: 0 } },
        ],
      },
      data: {
        latitude: 0,
        longitude: 0,
        accuracyMeters: 0,
        distanceMeters: 0,
      },
    });

    return { updated: result.count };
  }

  private async scrubExpiredGeolocationAuditLogs(cutoff: Date) {
    let updated = 0;

    while (true) {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          action: 'attendance.rejected_attempt',
          createdAt: { lt: cutoff },
          metadataJson: { contains: '"latitude"' },
        },
        select: {
          id: true,
          metadataJson: true,
        },
        orderBy: { createdAt: 'asc' },
        take: PRIVACY_RETENTION_BATCH_SIZE,
      });

      if (logs.length === 0) {
        break;
      }

      let batchUpdated = 0;

      for (const log of logs) {
        const metadata = this.parseAuditMetadata(log.metadataJson);
        if (!metadata) {
          continue;
        }

        let changed = false;
        for (const field of GEOLOCATION_AUDIT_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(metadata, field)) {
            delete metadata[field];
            changed = true;
          }
        }

        if (!changed) {
          continue;
        }

        await this.prisma.auditLog.update({
          where: { id: log.id },
          data: { metadataJson: JSON.stringify(metadata) },
        });
        batchUpdated += 1;
      }

      updated += batchUpdated;

      if (batchUpdated === 0) {
        break;
      }
    }

    return { updated };
  }

  private parseAuditMetadata(value: string | null) {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private async deleteStoredObjects(keys: Array<string | null | undefined>) {
    const successfulKeys = new Set<string>();
    const uniqueKeys = Array.from(new Set(keys.filter((key): key is string => this.isStoredObjectKey(key))));

    for (const key of uniqueKeys) {
      try {
        await this.storageService.deleteObject(key);
        successfulKeys.add(key);
      } catch (error) {
        this.logger.warn(
          `Privacy retention failed to delete stored object ${key}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return successfulKeys;
  }

  private isStoredObjectKey(value: string | null | undefined): value is string {
    return Boolean(value && !/^data:/i.test(value) && !/^https?:\/\//i.test(value));
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

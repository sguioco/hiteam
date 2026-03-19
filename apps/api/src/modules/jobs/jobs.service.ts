import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceEventType, AttendanceResult, AttendanceSessionStatus, NotificationType, RequestStatus } from '@prisma/client';
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

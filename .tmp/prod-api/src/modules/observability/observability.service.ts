import { BadRequestException, Injectable } from '@nestjs/common';
import { BiometricJobStatus, ExportJobStatus, PushDeliveryStatus, PushReceiptStatus } from '@prisma/client';
import { AttendanceGateway } from '../attendance/attendance.gateway';
import { AttendanceRealtimeService } from '../attendance/attendance-realtime.service';
import { AuditService } from '../audit/audit.service';
import { BiometricService } from '../biometric/biometric.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { ExportsService } from '../exports/exports.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diagnosticsService: DiagnosticsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsRealtimeService: NotificationsRealtimeService,
    private readonly attendanceGateway: AttendanceGateway,
    private readonly attendanceRealtimeService: AttendanceRealtimeService,
    private readonly exportsService: ExportsService,
    private readonly biometricService: BiometricService,
    private readonly pushService: PushService,
    private readonly auditService: AuditService,
  ) {}

  async summary(tenantId: string) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      summary,
      latestSnapshot,
      snapshots24h,
      exportTotal24h,
      exportFailed24h,
      biometricTotal24h,
      biometricFailed24h,
      pushTotal24h,
      pushFailed24h,
      pushReceiptErrors24h,
      exportQueueRuntime,
      biometricQueueRuntime,
      pushQueueRuntime,
    ] = await Promise.all([
      this.diagnosticsService.summary(tenantId),
      this.prisma.diagnosticsSnapshot.findFirst({
        where: { tenantId },
        orderBy: { capturedAt: 'desc' },
      }),
      this.prisma.diagnosticsSnapshot.count({
        where: {
          tenantId,
          capturedAt: { gte: last24Hours },
        },
      }),
      this.prisma.exportJob.count({
        where: {
          tenantId,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.exportJob.count({
        where: {
          tenantId,
          status: ExportJobStatus.FAILED,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.biometricJob.count({
        where: {
          tenantId,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.biometricJob.count({
        where: {
          tenantId,
          status: BiometricJobStatus.FAILED,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.pushDelivery.count({
        where: {
          tenantId,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.pushDelivery.count({
        where: {
          tenantId,
          status: PushDeliveryStatus.FAILED,
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.pushDelivery.count({
        where: {
          tenantId,
          receiptStatus: PushReceiptStatus.ERROR,
          createdAt: { gte: last24Hours },
        },
      }),
      this.exportsService.getQueueRuntime(),
      this.biometricService.getQueueRuntime(),
      this.pushService.getQueueRuntime(),
    ]);

    const notificationsRealtime = this.notificationsRealtimeService.getRuntimeStatus();
    const attendanceRealtime = this.attendanceRealtimeService.getRuntimeStatus();
    const notificationSocket = this.notificationsGateway.getStats();
    const attendanceSocket = this.attendanceGateway.getStats();

    const pushFailureRate24h = pushTotal24h > 0 ? Number(((pushFailed24h / pushTotal24h) * 100).toFixed(1)) : 0;
    const exportFailureRate24h = exportTotal24h > 0 ? Number(((exportFailed24h / exportTotal24h) * 100).toFixed(1)) : 0;
    const biometricFailureRate24h = biometricTotal24h > 0 ? Number(((biometricFailed24h / biometricTotal24h) * 100).toFixed(1)) : 0;

    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning';
      title: string;
      detail: string;
    }> = [];

    if (notificationsRealtime.transport === 'in_process' || attendanceRealtime.transport === 'in_process') {
      alerts.push({
        id: 'realtime-fallback',
        severity: 'warning',
        title: 'Realtime transport fallback',
        detail: 'At least one realtime channel is running without Redis pub/sub fanout.',
      });
    }

    if (pushFailureRate24h >= 5 || pushReceiptErrors24h > 0) {
      alerts.push({
        id: 'push-failure-rate',
        severity: pushFailureRate24h >= 15 ? 'critical' : 'warning',
        title: 'Push delivery degradation',
        detail: `Push failure rate is ${pushFailureRate24h}% in the last 24h. Receipt errors: ${pushReceiptErrors24h}.`,
      });
    }

    if (exportFailureRate24h >= 10 || biometricFailureRate24h >= 10) {
      alerts.push({
        id: 'job-failure-rate',
        severity: exportFailureRate24h >= 25 || biometricFailureRate24h >= 25 ? 'critical' : 'warning',
        title: 'Background job failure rate',
        detail: `Export failures: ${exportFailureRate24h}%. Biometric failures: ${biometricFailureRate24h}% over the last 24h.`,
      });
    }

    return {
      asOf: new Date().toISOString(),
      runtime: {
        apiUptimeSeconds: Math.round(process.uptime()),
        notificationsRealtime,
        attendanceRealtime,
        notificationSocket,
        attendanceSocket,
      },
      deliveries: {
        pushTotal24h,
        pushFailed24h,
        pushReceiptErrors24h,
        pushFailureRate24h,
      },
      jobs: {
        exportTotal24h,
        exportFailed24h,
        exportFailureRate24h,
        biometricTotal24h,
        biometricFailed24h,
        biometricFailureRate24h,
      },
      snapshots: {
        lastCapturedAt: latestSnapshot?.capturedAt.toISOString() ?? null,
        last24HoursCount: snapshots24h,
      },
      liveQueues: summary.queues,
      queueControls: {
        exports: exportQueueRuntime,
        biometric: biometricQueueRuntime,
        push: pushQueueRuntime,
      },
      alerts,
    };
  }

  async setQueueState(
    tenantId: string,
    actorUserId: string,
    queueKey: 'exports' | 'biometric' | 'push',
    action: 'pause' | 'resume',
  ) {
    if (!['exports', 'biometric', 'push'].includes(queueKey)) {
      throw new BadRequestException('Unknown queue key.');
    }

    if (!['pause', 'resume'].includes(action)) {
      throw new BadRequestException('Unknown queue action.');
    }

    let runtime;

    switch (queueKey) {
      case 'exports':
        runtime = action === 'pause' ? await this.exportsService.pauseQueue() : await this.exportsService.resumeQueue();
        break;
      case 'biometric':
        runtime = action === 'pause' ? await this.biometricService.pauseQueue() : await this.biometricService.resumeQueue();
        break;
      case 'push':
        runtime = action === 'pause' ? await this.pushService.pauseQueue() : await this.pushService.resumeQueue();
        break;
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'queue_runtime',
      entityId: queueKey,
      action: action === 'pause' ? 'queue.paused' : 'queue.resumed',
      metadata: runtime,
    });

    return {
      queueKey,
      ...runtime,
    };
  }
}

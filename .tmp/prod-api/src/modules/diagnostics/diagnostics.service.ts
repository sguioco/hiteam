import { Injectable } from '@nestjs/common';
import {
  BiometricJobStatus,
  BiometricManualReviewStatus,
  ExportJobStatus,
  PrismaClient,
  PushDeliveryStatus,
  PushReceiptStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiagnosticsTrendsQueryDto } from './dto/diagnostics-trends-query.dto';
import { UpdateDiagnosticsPolicyDto } from './dto/update-diagnostics-policy.dto';

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  getPolicy(tenantId: string) {
    return this.prisma.diagnosticsPolicy.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
  }

  async updatePolicy(tenantId: string, actorUserId: string, dto: UpdateDiagnosticsPolicyDto) {
    const policy = await this.prisma.diagnosticsPolicy.upsert({
      where: { tenantId },
      update: dto,
      create: {
        tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'diagnostics_policy',
      entityId: policy.id,
      action: 'diagnostics_policy.updated',
      metadata: { ...dto },
    });

    return policy;
  }

  async summary(tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const policy = await this.getPolicy(tenantId);

    const [
      exportQueued,
      exportProcessing,
      exportFailed,
      exportCompleted,
      oldestExportQueued,
      biometricQueued,
      biometricProcessing,
      biometricFailed,
      biometricCompleted,
      oldestBiometricQueued,
      pushQueued,
      pushProcessing,
      pushFailed,
      pushDelivered,
      pushPendingReceipts,
      pushReceiptErrors,
      criticalAnomaliesToday,
      pendingBiometricReviews,
      exportFailures24h,
      biometricFailures24h,
      pushFailures24h,
    ] = await Promise.all([
      this.prisma.exportJob.count({ where: { tenantId, status: ExportJobStatus.QUEUED } }),
      this.prisma.exportJob.count({ where: { tenantId, status: ExportJobStatus.PROCESSING } }),
      this.prisma.exportJob.count({ where: { tenantId, status: ExportJobStatus.FAILED } }),
      this.prisma.exportJob.count({ where: { tenantId, status: ExportJobStatus.COMPLETED } }),
      this.prisma.exportJob.findFirst({
        where: { tenantId, status: ExportJobStatus.QUEUED },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.biometricJob.count({ where: { tenantId, status: BiometricJobStatus.QUEUED } }),
      this.prisma.biometricJob.count({ where: { tenantId, status: BiometricJobStatus.PROCESSING } }),
      this.prisma.biometricJob.count({ where: { tenantId, status: BiometricJobStatus.FAILED } }),
      this.prisma.biometricJob.count({ where: { tenantId, status: BiometricJobStatus.COMPLETED } }),
      this.prisma.biometricJob.findFirst({
        where: { tenantId, status: BiometricJobStatus.QUEUED },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.pushDelivery.count({ where: { tenantId, status: PushDeliveryStatus.QUEUED } }),
      this.prisma.pushDelivery.count({ where: { tenantId, status: PushDeliveryStatus.PROCESSING } }),
      this.prisma.pushDelivery.count({ where: { tenantId, status: PushDeliveryStatus.FAILED } }),
      this.prisma.pushDelivery.count({ where: { tenantId, status: PushDeliveryStatus.DELIVERED } }),
      this.prisma.pushDelivery.count({ where: { tenantId, receiptStatus: PushReceiptStatus.PENDING } }),
      this.prisma.pushDelivery.count({ where: { tenantId, receiptStatus: PushReceiptStatus.ERROR } }),
      this.prisma.attendanceAnomalyNotification.count({
        where: {
          tenantId,
          severity: 'critical',
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.biometricVerification.count({
        where: {
          employee: { tenantId },
          manualReviewStatus: BiometricManualReviewStatus.PENDING,
        },
      }),
      this.prisma.exportJob.count({
        where: {
          tenantId,
          status: ExportJobStatus.FAILED,
          updatedAt: { gte: last24Hours },
        },
      }),
      this.prisma.biometricJob.count({
        where: {
          tenantId,
          status: BiometricJobStatus.FAILED,
          updatedAt: { gte: last24Hours },
        },
      }),
      this.prisma.pushDelivery.count({
        where: {
          tenantId,
          OR: [
            { status: PushDeliveryStatus.FAILED },
            { receiptStatus: PushReceiptStatus.ERROR },
          ],
          updatedAt: { gte: last24Hours },
        },
      }),
    ]);

    const exportOldestQueuedMinutes = oldestExportQueued
      ? Math.max(0, Math.round((Date.now() - oldestExportQueued.createdAt.getTime()) / 60000))
      : 0;
    const biometricOldestQueuedMinutes = oldestBiometricQueued
      ? Math.max(0, Math.round((Date.now() - oldestBiometricQueued.createdAt.getTime()) / 60000))
      : 0;

    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning';
      title: string;
      detail: string;
    }> = [];

    if (criticalAnomaliesToday > 0) {
      alerts.push({
        id: 'critical-anomalies',
        severity:
          criticalAnomaliesToday >= policy.criticalAnomaliesCriticalCount ? 'critical' : 'warning',
        title: 'Critical attendance anomalies',
        detail: `${criticalAnomaliesToday} critical attendance anomalies were detected today.`,
      });
    }

    if (
      pushReceiptErrors >= policy.pushReceiptErrorCriticalCount ||
      pushFailures24h >= policy.pushFailureCriticalCount24h
    ) {
      alerts.push({
        id: 'push-delivery-errors',
        severity: 'critical',
        title: 'Push delivery errors',
        detail: `${pushReceiptErrors} push deliveries have provider receipt errors. ${pushFailures24h} push deliveries failed in the last 24 hours.`,
      });
    }

    if (
      exportOldestQueuedMinutes >= policy.exportQueueWarningMinutes ||
      exportFailures24h >= policy.exportFailureWarningCount24h
    ) {
      alerts.push({
        id: 'export-queue-warning',
        severity:
          exportOldestQueuedMinutes >= policy.exportQueueCriticalMinutes ? 'critical' : 'warning',
        title: 'Export queue backlog',
        detail: `${exportQueued} exports are queued. Oldest queued export age: ${exportOldestQueuedMinutes} min. Failed exports in 24h: ${exportFailures24h}.`,
      });
    }

    if (
      biometricOldestQueuedMinutes >= policy.biometricQueueWarningMinutes ||
      biometricFailures24h >= policy.biometricFailureWarningCount24h
    ) {
      alerts.push({
        id: 'biometric-queue-warning',
        severity:
          biometricOldestQueuedMinutes >= policy.biometricQueueCriticalMinutes
            ? 'critical'
            : 'warning',
        title: 'Biometric processing backlog',
        detail: `${biometricQueued} biometric jobs are queued. Oldest queued biometric job age: ${biometricOldestQueuedMinutes} min. Failed jobs in 24h: ${biometricFailures24h}.`,
      });
    }

    if (pendingBiometricReviews >= policy.pendingBiometricReviewWarningCount) {
      alerts.push({
        id: 'biometric-manual-review',
        severity: 'warning',
        title: 'Manual biometric reviews pending',
        detail: `${pendingBiometricReviews} biometric verification cases are waiting for manual review.`,
      });
    }

    return {
      asOf: new Date().toISOString(),
      queues: {
        exports: {
          queued: exportQueued,
          processing: exportProcessing,
          failed: exportFailed,
          completed: exportCompleted,
          oldestQueuedMinutes: exportOldestQueuedMinutes,
        },
        biometric: {
          queued: biometricQueued,
          processing: biometricProcessing,
          failed: biometricFailed,
          completed: biometricCompleted,
          oldestQueuedMinutes: biometricOldestQueuedMinutes,
        },
        push: {
          queued: pushQueued,
          processing: pushProcessing,
          failed: pushFailed,
          delivered: pushDelivered,
          pendingReceipts: pushPendingReceipts,
          receiptErrors: pushReceiptErrors,
        },
      },
      signals: {
        criticalAnomaliesToday,
        pendingBiometricReviews,
        exportFailures24h,
        biometricFailures24h,
        pushFailures24h,
      },
      alerts,
    };
  }

  async captureSnapshot(tenantId: string) {
    const prisma = this.prisma as PrismaClient;
    const summary = await this.summary(tenantId);
    const criticalAlerts = summary.alerts.filter((alert) => alert.severity === 'critical').length;
    const warningAlerts = summary.alerts.filter((alert) => alert.severity === 'warning').length;

    return prisma.diagnosticsSnapshot.create({
      data: {
        tenantId,
        exportQueued: summary.queues.exports.queued,
        exportProcessing: summary.queues.exports.processing,
        exportFailed: summary.queues.exports.failed,
        exportCompleted: summary.queues.exports.completed,
        exportOldestQueuedMinutes: summary.queues.exports.oldestQueuedMinutes,
        biometricQueued: summary.queues.biometric.queued,
        biometricProcessing: summary.queues.biometric.processing,
        biometricFailed: summary.queues.biometric.failed,
        biometricCompleted: summary.queues.biometric.completed,
        biometricOldestQueuedMinutes: summary.queues.biometric.oldestQueuedMinutes,
        pushQueued: summary.queues.push.queued,
        pushProcessing: summary.queues.push.processing,
        pushFailed: summary.queues.push.failed,
        pushDelivered: summary.queues.push.delivered,
        pushPendingReceipts: summary.queues.push.pendingReceipts,
        pushReceiptErrors: summary.queues.push.receiptErrors,
        criticalAnomaliesToday: summary.signals.criticalAnomaliesToday,
        pendingBiometricReviews: summary.signals.pendingBiometricReviews,
        exportFailures24h: summary.signals.exportFailures24h,
        biometricFailures24h: summary.signals.biometricFailures24h,
        pushFailures24h: summary.signals.pushFailures24h,
        criticalAlerts,
        warningAlerts,
      },
    });
  }

  async trends(tenantId: string, query: DiagnosticsTrendsQueryDto) {
    const prisma = this.prisma as PrismaClient;
    const since = new Date(Date.now() - query.hours * 60 * 60 * 1000);
    let snapshots: Awaited<ReturnType<typeof prisma.diagnosticsSnapshot.findMany>> = await prisma.diagnosticsSnapshot.findMany({
      where: {
        tenantId,
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: 'asc' },
    });

    if (snapshots.length === 0) {
      await this.captureSnapshot(tenantId);
      snapshots = await prisma.diagnosticsSnapshot.findMany({
        where: {
          tenantId,
          capturedAt: { gte: since },
        },
        orderBy: { capturedAt: 'asc' },
      });
    }

    const maxExportQueueAge = snapshots.reduce(
      (max: number, item) => Math.max(max, item.exportOldestQueuedMinutes),
      0,
    );
    const maxBiometricQueueAge = snapshots.reduce(
      (max: number, item) => Math.max(max, item.biometricOldestQueuedMinutes),
      0,
    );
    const maxPushReceiptErrors = snapshots.reduce(
      (max: number, item) => Math.max(max, item.pushReceiptErrors),
      0,
    );
    const maxCriticalAlerts = snapshots.reduce(
      (max: number, item) => Math.max(max, item.criticalAlerts),
      0,
    );

    const breachCount = snapshots.reduce((count: number, item) => {
      let nextCount = count;
      if (item.criticalAlerts > 0) nextCount += 1;
      if (item.exportOldestQueuedMinutes > 0) nextCount += 1;
      if (item.biometricOldestQueuedMinutes > 0) nextCount += 1;
      if (item.pushReceiptErrors > 0) nextCount += 1;
      return nextCount;
    }, 0);

    return {
      rangeHours: query.hours,
      totals: {
        snapshots: snapshots.length,
        maxExportQueueAge,
        maxBiometricQueueAge,
        maxPushReceiptErrors,
        maxCriticalAlerts,
        slaBreaches: breachCount,
      },
      snapshots: snapshots.map((item) => ({
        capturedAt: item.capturedAt.toISOString(),
        exportOldestQueuedMinutes: item.exportOldestQueuedMinutes,
        biometricOldestQueuedMinutes: item.biometricOldestQueuedMinutes,
        pushReceiptErrors: item.pushReceiptErrors,
        criticalAlerts: item.criticalAlerts,
        warningAlerts: item.warningAlerts,
        exportFailures24h: item.exportFailures24h,
        biometricFailures24h: item.biometricFailures24h,
        pushFailures24h: item.pushFailures24h,
      })),
    };
  }
}

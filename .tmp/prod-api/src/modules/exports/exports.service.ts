import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportJobStatus, ExportJobType } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { AttendanceService } from '../attendance/attendance.service';
import { PayrollService } from '../payroll/payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateExportJobDto } from './dto/create-export-job.dto';
import { ListExportJobsQueryDto } from './dto/list-export-jobs-query.dto';

type ExportJobPayload = {
  exportJobId: string;
};

const EXPORTS_QUEUE_NAME = 'smart-exports';

@Injectable()
export class ExportsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportsService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private readonly redisUrl: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly attendanceService: AttendanceService,
    private readonly payrollService: PayrollService,
    private readonly auditService: AuditService,
  ) {
    this.redisUrl = this.configService.get<string>('REDIS_URL') ?? null;
  }

  async onModuleInit() {
    if (!this.redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Export jobs will run inline.');
      return;
    }

    const connection = this.buildBullConnection(this.redisUrl);

    this.queue = new Queue(EXPORTS_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    this.worker = new Worker(
      EXPORTS_QUEUE_NAME,
      async (job) => this.processExportJob(job),
      {
        connection,
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Export job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await Promise.all([this.worker?.close(), this.queue?.close()]);
  }

  async createAttendanceExportJob(tenantId: string, requestedByUserId: string, dto: CreateExportJobDto) {
    return this.createJob(tenantId, requestedByUserId, ExportJobType.ATTENDANCE_HISTORY, dto);
  }

  async createPayrollExportJob(tenantId: string, requestedByUserId: string, dto: CreateExportJobDto) {
    return this.createJob(tenantId, requestedByUserId, ExportJobType.PAYROLL_SUMMARY, dto);
  }

  async listJobs(tenantId: string, query: ListExportJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      tenantId,
      type: query.type ?? undefined,
      status: query.status ?? undefined,
      OR: query.search
        ? [
            { fileName: { contains: query.search, mode: 'insensitive' as const } },
            { errorMessage: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const [jobs, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return {
      items: jobs.map((job) => this.serializeJob(job)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getJob(tenantId: string, jobId: string) {
    const job = await this.prisma.exportJob.findFirstOrThrow({
      where: {
        tenantId,
        id: jobId,
      },
    });

    return this.serializeJob(job);
  }

  async getQueueRuntime() {
    if (!this.queue) {
      return {
        available: false,
        paused: false,
        mode: 'inline' as const,
      };
    }

    return {
      available: true,
      paused: await this.queue.isPaused(),
      mode: 'bullmq' as const,
    };
  }

  async pauseQueue() {
    if (!this.queue) {
      return this.getQueueRuntime();
    }

    await this.queue.pause();
    return this.getQueueRuntime();
  }

  async resumeQueue() {
    if (!this.queue) {
      return this.getQueueRuntime();
    }

    await this.queue.resume();
    return this.getQueueRuntime();
  }

  async requeueJob(tenantId: string, actorUserId: string, jobId: string) {
    const record = await this.prisma.exportJob.findFirst({
      where: {
        tenantId,
        id: jobId,
      },
    });

    if (!record) {
      throw new NotFoundException('Export job not found.');
    }

    if (record.status === ExportJobStatus.PROCESSING || record.status === ExportJobStatus.QUEUED) {
      throw new BadRequestException('Export job is already active.');
    }

    if (!this.storageService.isConfigured()) {
      throw new BadRequestException('Object storage must be configured for async exports.');
    }

    const nextJob = await this.prisma.exportJob.update({
      where: { id: record.id },
      data: {
        status: ExportJobStatus.QUEUED,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        storageKey: null,
        fileName: null,
        contentType: null,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'export_job',
      entityId: record.id,
      action: 'export.job_requeued',
      metadata: {
        previousStatus: record.status,
        type: record.type,
        format: record.format,
      },
    });

    await this.enqueueJob(nextJob.type, nextJob.id);

    return this.serializeJob(nextJob);
  }

  async bulkRequeueJobs(tenantId: string, actorUserId: string, jobIds: string[]) {
    const items = [];

    for (const jobId of jobIds) {
      items.push(await this.requeueJob(tenantId, actorUserId, jobId));
    }

    return { items };
  }

  private async createJob(
    tenantId: string,
    requestedByUserId: string,
    type: ExportJobType,
    dto: CreateExportJobDto,
  ) {
    if (!this.storageService.isConfigured()) {
      throw new BadRequestException('Object storage must be configured for async exports.');
    }

    const job = await this.prisma.exportJob.create({
      data: {
        tenantId,
        requestedByUserId,
        type,
        format: dto.format,
        parametersJson: JSON.stringify({
          dateFrom: dto.dateFrom ?? null,
          dateTo: dto.dateTo ?? null,
          employeeId: dto.employeeId ?? null,
        }),
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: requestedByUserId,
      entityType: 'export_job',
      entityId: job.id,
      action: 'export.job_created',
      metadata: {
        type,
        format: dto.format,
      },
    });

    await this.enqueueJob(type, job.id);

    return this.serializeJob(job);
  }

  private async enqueueJob(type: ExportJobType, exportJobId: string) {
    if (this.queue) {
      await this.queue.add(type, { exportJobId });
      return;
    }

    await this.processExportJob({ data: { exportJobId } } as Job<ExportJobPayload>);
  }

  private async processExportJob(job: Job<ExportJobPayload>) {
    const record = await this.prisma.exportJob.findUnique({
      where: { id: job.data.exportJobId },
    });

    if (!record) {
      return;
    }

    if (record.status === ExportJobStatus.COMPLETED) {
      return;
    }

    await this.prisma.exportJob.update({
      where: { id: record.id },
      data: {
        status: ExportJobStatus.PROCESSING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        errorMessage: null,
      },
    });

    try {
      const params = this.parseParameters(record.parametersJson);
      const artifact =
        record.type === ExportJobType.PAYROLL_SUMMARY
          ? await this.payrollService.generateSummaryExportArtifact(
              record.tenantId,
              record.format as 'csv' | 'xlsx' | 'pdf',
              params.dateFrom ?? undefined,
              params.dateTo ?? undefined,
            )
          : await this.attendanceService.generateHistoryExportArtifact(record.tenantId, record.format as 'csv' | 'xlsx' | 'pdf', {
              dateFrom: params.dateFrom ?? undefined,
              dateTo: params.dateTo ?? undefined,
              employeeId: params.employeeId ?? undefined,
              format: record.format as 'csv' | 'xlsx' | 'pdf',
            });

      const storageKey = `exports/${record.tenantId}/${record.type.toLowerCase()}/${record.id}/${artifact.file.fileName}`;
      await this.storageService.uploadBuffer(storageKey, artifact.file.buffer, artifact.file.contentType);

      await this.prisma.exportJob.update({
        where: { id: record.id },
        data: {
          status: ExportJobStatus.COMPLETED,
          storageKey,
          fileName: artifact.file.fileName,
          contentType: artifact.file.contentType,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export job failure';

      await this.prisma.exportJob.update({
        where: { id: record.id },
        data: {
          status: ExportJobStatus.FAILED,
          errorMessage: message,
        },
      });

      throw error;
    }
  }

  private parseParameters(parametersJson: string | null) {
    const parsed = parametersJson ? (JSON.parse(parametersJson) as Record<string, string | null>) : {};
    return {
      dateFrom: parsed.dateFrom ?? null,
      dateTo: parsed.dateTo ?? null,
      employeeId: parsed.employeeId ?? null,
    };
  }

  private serializeJob(job: {
    id: string;
    type: ExportJobType;
    format: string;
    status: ExportJobStatus;
    fileName: string | null;
    contentType: string | null;
    storageKey: string | null;
    errorMessage: string | null;
    attempts: number;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      type: job.type,
      format: job.format,
      status: job.status,
      fileName: job.fileName,
      contentType: job.contentType,
      downloadUrl: job.storageKey ? this.storageService.getObjectUrl(job.storageKey) : null,
      errorMessage: job.errorMessage,
      attempts: job.attempts,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  private buildBullConnection(redisUrl: string) {
    const parsed = new URL(redisUrl);
    const db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) : undefined;

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: Number.isFinite(db) ? db : undefined,
      family: 0 as const,
      maxRetriesPerRequest: null as null,
    };
  }
}

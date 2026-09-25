import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { AltegioPilotService } from './altegio-pilot.service';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';

const ALTEGIO_WEBHOOK_QUEUE_NAME = 'altegio-webhooks';

export type AltegioWebhookJobPayload = {
  payload: Record<string, unknown>;
  receivedAt: number;
};

export type AltegioWebhookEnqueueResult =
  | { ok: true; queued: true; jobId: string }
  | { ok: true; queued: false; result: Record<string, unknown> }
  | { ok: false; reason: 'queue_backpressure'; queueLength: number };

@Injectable()
export class AltegioWebhookQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AltegioWebhookQueueService.name);
  private readonly redisUrl: string | null;
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly altegioStaffScheduleSync: AltegioStaffScheduleSyncService,
    private readonly altegioPilot: AltegioPilotService,
  ) {
    this.redisUrl = this.configService.get<string>('REDIS_URL') ?? null;
  }

  async onModuleInit() {
    if (!this.redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Altegio webhooks will process inline.');
      return;
    }

    const connection = this.buildBullConnection(this.redisUrl);

    this.queue = new Queue(ALTEGIO_WEBHOOK_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: this.intEnv('ALTEGIO_WEBHOOK_QUEUE_ATTEMPTS', 1),
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 200,
      },
    });

    this.worker = new Worker(
      ALTEGIO_WEBHOOK_QUEUE_NAME,
      async (job) => this.dispatch(job),
      {
        connection,
        concurrency: this.intEnv('ALTEGIO_WEBHOOK_QUEUE_CONCURRENCY', 2),
        limiter: {
          max: this.intEnv('ALTEGIO_WEBHOOK_RATE_LIMIT_MAX', 10),
          duration: this.intEnv('ALTEGIO_WEBHOOK_RATE_LIMIT_DURATION_MS', 1000),
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Altegio webhook job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      );
    });
  }

  async onModuleDestroy() {
    await Promise.all([this.worker?.close(), this.queue?.close()]);
  }

  async enqueue(payload: Record<string, unknown>): Promise<AltegioWebhookEnqueueResult> {
    if (!this.queue) {
      const result = await this.dispatchNow(payload);
      return { ok: true, queued: false, result };
    }

    const [waiting, active] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
    ]);
    const maxBacklog = this.intEnv('ALTEGIO_WEBHOOK_QUEUE_MAX_BACKLOG', 500);
    if (waiting + active >= maxBacklog) {
      return { ok: false, reason: 'queue_backpressure', queueLength: waiting + active };
    }

    const job = await this.queue.add('webhook', {
      payload,
      receivedAt: Date.now(),
    } satisfies AltegioWebhookJobPayload);
    return { ok: true, queued: true, jobId: job.id ?? '' };
  }

  private async dispatch(job: Job<AltegioWebhookJobPayload>) {
    return this.dispatchNow(job.data.payload);
  }

  /** Marketplace first, then Pilot fallback for locations only known to Pilot. */
  private async dispatchNow(payload: Record<string, unknown>) {
    const marketplace = await this.altegioStaffScheduleSync.handleWebhookEvent(payload);
    if (marketplace.ignored !== 'unknown_location' || !this.altegioPilot) {
      return marketplace;
    }
    return this.altegioPilot.handleWebhookEvent(payload);
  }

  private intEnv(key: string, fallback: number): number {
    const raw = Number((this.configService.get<string>(key) ?? '').trim());
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
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
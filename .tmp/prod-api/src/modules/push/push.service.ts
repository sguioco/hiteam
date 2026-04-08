import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DevicePlatform, PushDeliveryStatus, PushProvider, PushReceiptStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { ListPushDeliveriesQueryDto } from './dto/list-push-deliveries-query.dto';

@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Push deliveries will use inline processing.');
      return;
    }

    const connection = this.buildBullConnection(redisUrl);

    this.queue = new Queue('smart-push-deliveries', {
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
      'smart-push-deliveries',
      async (job) => this.processDelivery(job.data.deliveryId),
      {
        connection,
        concurrency: 5,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async register(userId: string, tenantId: string, dto: RegisterPushDeviceDto) {
    return this.prisma.pushDevice.upsert({
      where: { token: dto.token },
      update: {
        tenantId,
        userId,
        platform: dto.platform as DevicePlatform,
        isEnabled: true,
        lastRegisteredAt: new Date(),
      },
      create: {
        tenantId,
        userId,
        provider: PushProvider.EXPO,
        platform: dto.platform as DevicePlatform,
        token: dto.token,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.pushDevice.findMany({
      where: { userId, isEnabled: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listDeliveries(userId: string) {
    return this.prisma.pushDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async listTenantDeliveries(tenantId: string, query: ListPushDeliveriesQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      tenantId,
      status: query.status ?? undefined,
      receiptStatus: query.receiptStatus ?? undefined,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { errorMessage: { contains: query.search, mode: 'insensitive' as const } },
            { user: { email: { contains: query.search, mode: 'insensitive' as const } } },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.pushDelivery.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pushDelivery.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async requeueDelivery(tenantId: string, actorUserId: string, deliveryId: string) {
    const delivery = await this.prisma.pushDelivery.findFirst({
      where: {
        tenantId,
        id: deliveryId,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Push delivery not found.');
    }

    if (delivery.status === PushDeliveryStatus.QUEUED || delivery.status === PushDeliveryStatus.PROCESSING) {
      throw new BadRequestException('Push delivery is already active.');
    }

    const nextDelivery = await this.prisma.pushDelivery.update({
      where: { id: delivery.id },
      data: {
        status: PushDeliveryStatus.QUEUED,
        receiptStatus: PushReceiptStatus.PENDING,
        errorMessage: null,
        deliveredAt: null,
        ticketsJson: null,
        receiptsJson: null,
        receiptsCheckedAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        entityType: 'push_delivery',
        entityId: delivery.id,
        action: 'push.delivery_requeued',
        metadataJson: JSON.stringify({
          previousStatus: delivery.status,
          previousReceiptStatus: delivery.receiptStatus,
        }),
      },
    });

    await this.enqueueDelivery(nextDelivery.id);

    return nextDelivery;
  }

  async bulkRequeueDeliveries(tenantId: string, actorUserId: string, deliveryIds: string[]) {
    const items = [];

    for (const deliveryId of deliveryIds) {
      items.push(await this.requeueDelivery(tenantId, actorUserId, deliveryId));
    }

    return { items };
  }

  async retryReceiptCheck(tenantId: string, actorUserId: string, deliveryId: string) {
    const delivery = await this.prisma.pushDelivery.findFirst({
      where: {
        tenantId,
        id: deliveryId,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Push delivery not found.');
    }

    if (delivery.status !== PushDeliveryStatus.DELIVERED) {
      throw new BadRequestException('Receipt checks are only available for delivered push requests.');
    }

    const updated = await this.reconcileDeliveryReceipts(delivery.id);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        entityType: 'push_delivery',
        entityId: delivery.id,
        action: 'push.receipt_check_retried',
        metadataJson: JSON.stringify({
          previousReceiptStatus: delivery.receiptStatus,
          nextReceiptStatus: updated.receiptStatus,
        }),
      },
    });

    return updated;
  }

  async bulkRetryReceiptCheck(tenantId: string, actorUserId: string, deliveryIds: string[]) {
    const items = [];

    for (const deliveryId of deliveryIds) {
      items.push(await this.retryReceiptCheck(tenantId, actorUserId, deliveryId));
    }

    return { items };
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

  async queueDelivery(params: {
    tenantId: string;
    userId: string;
    notificationId?: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }) {
    const delivery = await this.prisma.pushDelivery.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        notificationId: params.notificationId,
        title: params.title,
        body: params.body,
        payloadJson: params.data ? JSON.stringify(params.data) : undefined,
        receiptStatus: PushReceiptStatus.PENDING,
      },
    });

    await this.enqueueDelivery(delivery.id);

    return delivery;
  }

  private async enqueueDelivery(deliveryId: string) {
    if (this.queue) {
      await this.queue.add('push-delivery', { deliveryId });
      return;
    }

    await this.processDelivery(deliveryId);
  }

  private async processDelivery(deliveryId: string) {
    const delivery = await this.prisma.pushDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.status === PushDeliveryStatus.DELIVERED) {
      return { sent: 0 };
    }

    await this.prisma.pushDelivery.update({
      where: { id: deliveryId },
      data: {
        status: PushDeliveryStatus.PROCESSING,
        attempts: { increment: 1 },
        errorMessage: null,
      },
    });

    const params = {
      userId: delivery.userId,
      title: delivery.title,
      body: delivery.body ?? undefined,
      data: delivery.payloadJson ? (JSON.parse(delivery.payloadJson) as Record<string, unknown>) : undefined,
    };

    try {
      const result = await this.sendToUser(params);
      await this.prisma.pushDelivery.update({
        where: { id: deliveryId },
        data: {
          status: PushDeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          ticketsJson: result.tickets ? JSON.stringify(result.tickets) : undefined,
          receiptStatus: result.tickets.length > 0 ? PushReceiptStatus.PENDING : null,
        },
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push delivery failed.';
      await this.prisma.pushDelivery.update({
        where: { id: deliveryId },
        data: {
          status: PushDeliveryStatus.FAILED,
          errorMessage: message,
        },
      });
      throw error;
    }
  }

  async sendToUser(params: {
    userId: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }) {
    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: params.userId,
        provider: PushProvider.EXPO,
        isEnabled: true,
        platform: { in: [DevicePlatform.IOS, DevicePlatform.ANDROID] },
      },
    });

    if (devices.length === 0) {
      return { sent: 0, tickets: [] };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        devices.map((device) => ({
          to: device.token,
          title: params.title,
          body: params.body,
          data: params.data,
        })),
      ),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };

    if (payload.data) {
      await Promise.all(
        payload.data.map(async (item, index) => {
          if (item.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.updateMany({
              where: { token: devices[index]?.token },
              data: { isEnabled: false },
            });
          }
        }),
      );
    }

    return { sent: devices.length, tickets: payload.data ?? [] };
  }

  async reconcileReceipts() {
    const deliveries = await this.prisma.pushDelivery.findMany({
      where: {
        status: PushDeliveryStatus.DELIVERED,
        receiptStatus: PushReceiptStatus.PENDING,
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (deliveries.length === 0) {
      return { checked: 0 };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let checked = 0;

    for (const delivery of deliveries) {
      await this.reconcileDeliveryReceipts(delivery.id, headers);
      checked += 1;
    }

    return { checked };
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

  private async reconcileDeliveryReceipts(deliveryId: string, presetHeaders?: Record<string, string>) {
    const delivery = await this.prisma.pushDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Push delivery not found.');
    }

    const tickets = delivery.ticketsJson ? (JSON.parse(delivery.ticketsJson) as Array<{ id?: string }>) : [];
    const receiptIds = tickets.map((ticket) => ticket.id).filter((id): id is string => Boolean(id));

    if (receiptIds.length === 0) {
      return this.prisma.pushDelivery.update({
        where: { id: delivery.id },
        data: {
          receiptStatus: PushReceiptStatus.ERROR,
          errorMessage: delivery.errorMessage ?? 'Expo ticket ids are missing.',
          receiptsCheckedAt: new Date(),
        },
      });
    }

    const headers =
      presetHeaders ??
      (() => {
        const nextHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
        if (accessToken) {
          nextHeaders.Authorization = `Bearer ${accessToken}`;
        }
        return nextHeaders;
      })();

    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: receiptIds }),
    });

    if (!response.ok) {
      this.logger.warn(`Expo receipts request failed with status ${response.status}.`);
      throw new BadRequestException(`Expo receipts request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      data?: Record<string, { status?: string; message?: string; details?: { error?: string } }>;
    };

    const receipts = payload.data ?? {};
    const receiptEntries = Object.entries(receipts);
    const hasError = receiptEntries.some(([, item]) => item.status === 'error');

    const updated = await this.prisma.pushDelivery.update({
      where: { id: delivery.id },
      data: {
        receiptStatus: hasError ? PushReceiptStatus.ERROR : PushReceiptStatus.OK,
        receiptsJson: JSON.stringify(receipts),
        receiptsCheckedAt: new Date(),
        errorMessage: hasError
          ? receiptEntries
              .map(([id, item]) => `${id}: ${item.details?.error ?? item.message ?? item.status ?? 'error'}`)
              .join('; ')
          : delivery.errorMessage,
      },
    });

    if (hasError) {
      const hasDeviceNotRegistered = receiptEntries.some(([, item]) => item.details?.error === 'DeviceNotRegistered');
      if (hasDeviceNotRegistered) {
        await this.prisma.pushDevice.updateMany({
          where: {
            userId: delivery.userId,
            provider: PushProvider.EXPO,
          },
          data: {
            isEnabled: false,
          },
        });
      }
    }

    return updated;
  }
}

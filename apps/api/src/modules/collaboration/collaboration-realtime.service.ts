import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { CollaborationGateway } from './collaboration.gateway';
import {
  COLLABORATION_REDIS_CHANNEL,
  CollaborationRealtimeEnvelope,
} from './collaboration-realtime.types';

@Injectable()
export class CollaborationRealtimeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CollaborationRealtimeService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private redisEnabled = false;

  constructor(private readonly collaborationGateway: CollaborationGateway) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is not configured. Collaboration realtime will use in-process delivery only.',
      );
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        family: 0,
      });
      this.subscriber = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        family: 0,
      });

      this.publisher.on('error', (error: Error) => {
        this.logger.warn(`Redis publisher error: ${error.message}`);
      });
      this.subscriber.on('error', (error: Error) => {
        this.logger.warn(`Redis subscriber error: ${error.message}`);
      });

      await this.publisher.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(COLLABORATION_REDIS_CHANNEL);
      this.subscriber.on('message', (_channel: string, rawMessage: string) => {
        this.handleMessage(rawMessage);
      });

      this.redisEnabled = true;
      this.logger.log('Collaboration realtime is using Redis pub/sub transport.');
    } catch (error) {
      this.logger.warn(
        `Redis pub/sub initialization failed. Falling back to in-process delivery. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.redisEnabled = false;
      await this.closeClients();
    }
  }

  async onModuleDestroy() {
    await this.closeClients();
  }

  async fanoutWorkspaceRefresh(userId: string, payload: unknown) {
    await this.fanout({
      type: 'workspace.refresh',
      userId,
      payload,
    });
  }

  async fanoutThreadUpdated(userId: string, payload: unknown) {
    await this.fanout({
      type: 'chat.thread-updated',
      userId,
      payload,
    });
  }

  async fanoutThreadMessage(threadId: string, payload: unknown) {
    await this.fanout({
      type: 'chat.message',
      threadId,
      payload,
    });
  }

  getRuntimeStatus() {
    return {
      redisEnabled: this.redisEnabled,
      publisherStatus: this.publisher?.status ?? 'disabled',
      subscriberStatus: this.subscriber?.status ?? 'disabled',
      transport: this.redisEnabled ? 'redis' : 'in_process',
    } as const;
  }

  private async fanout(message: CollaborationRealtimeEnvelope) {
    if (this.redisEnabled && this.publisher) {
      try {
        await this.publisher.publish(
          COLLABORATION_REDIS_CHANNEL,
          JSON.stringify(message),
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Redis publish failed. Falling back to in-process delivery. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.dispatch(message);
  }

  private handleMessage(rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage) as CollaborationRealtimeEnvelope;
      this.dispatch(message);
    } catch (error) {
      this.logger.warn(
        `Failed to parse collaboration realtime message. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private dispatch(message: CollaborationRealtimeEnvelope) {
    if (message.type === 'workspace.refresh') {
      this.collaborationGateway.emitWorkspaceRefresh(
        message.userId,
        message.payload,
      );
      return;
    }

    if (message.type === 'chat.thread-updated') {
      this.collaborationGateway.emitThreadUpdated(
        message.userId,
        message.payload,
      );
      return;
    }

    this.collaborationGateway.emitThreadMessage(
      message.threadId,
      message.payload,
    );
  }

  private async closeClients() {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => this.subscriber?.disconnect());
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit().catch(() => this.publisher?.disconnect());
      this.publisher = null;
    }
  }
}

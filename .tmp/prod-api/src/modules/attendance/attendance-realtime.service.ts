import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AttendanceGateway } from './attendance.gateway';
import { ATTENDANCE_REDIS_CHANNEL, AttendanceRealtimeEnvelope } from './attendance-realtime.types';

@Injectable()
export class AttendanceRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceRealtimeService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private redisEnabled = false;

  constructor(private readonly attendanceGateway: AttendanceGateway) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Attendance realtime will use in-process delivery only.');
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, family: 0 });
      this.subscriber = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, family: 0 });

      this.publisher.on('error', (error: Error) => {
        this.logger.warn(`Redis publisher error: ${error.message}`);
      });
      this.subscriber.on('error', (error: Error) => {
        this.logger.warn(`Redis subscriber error: ${error.message}`);
      });

      await this.publisher.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(ATTENDANCE_REDIS_CHANNEL);
      this.subscriber.on('message', (_channel: string, rawMessage: string) => {
        this.handleMessage(rawMessage);
      });

      this.redisEnabled = true;
      this.logger.log('Attendance realtime is using Redis pub/sub transport.');
    } catch (error) {
      this.logger.warn(
        `Redis pub/sub initialization failed. Falling back to in-process delivery. ${error instanceof Error ? error.message : String(error)}`,
      );
      this.redisEnabled = false;
      await this.closeClients();
    }
  }

  async onModuleDestroy() {
    await this.closeClients();
  }

  async fanout(message: AttendanceRealtimeEnvelope) {
    if (this.redisEnabled && this.publisher) {
      try {
        await this.publisher.publish(ATTENDANCE_REDIS_CHANNEL, JSON.stringify(message));
        return;
      } catch (error) {
        this.logger.warn(
          `Redis publish failed. Falling back to in-process delivery. ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.dispatch(message);
  }

  getRuntimeStatus() {
    return {
      redisEnabled: this.redisEnabled,
      publisherStatus: this.publisher?.status ?? 'disabled',
      subscriberStatus: this.subscriber?.status ?? 'disabled',
      transport: this.redisEnabled ? 'redis' : 'in_process',
    } as const;
  }

  private handleMessage(rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage) as AttendanceRealtimeEnvelope;
      this.dispatch(message);
    } catch (error) {
      this.logger.warn(`Failed to parse attendance realtime message. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private dispatch(message: AttendanceRealtimeEnvelope) {
    this.attendanceGateway.emitTeamLive(message.tenantId, message.sessions);
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

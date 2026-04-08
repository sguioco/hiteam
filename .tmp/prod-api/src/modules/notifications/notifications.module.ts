import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PushModule } from '../push/push.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [JwtModule.register({}), PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationsRealtimeService],
  exports: [NotificationsService, NotificationsGateway, NotificationsRealtimeService],
})
export class NotificationsModule {}

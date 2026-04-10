import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TranslationModule } from '../translation/translation.module';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationController } from './collaboration.controller';
import { CollaborationScheduler } from './collaboration.scheduler';
import { CollaborationService } from './collaboration.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule, StorageModule, TranslationModule, JwtModule.register({})],
  controllers: [CollaborationController],
  providers: [CollaborationService, CollaborationGateway, CollaborationScheduler],
  exports: [CollaborationService],
})
export class CollaborationModule {}

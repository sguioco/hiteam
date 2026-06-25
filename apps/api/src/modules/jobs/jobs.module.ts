import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DiagnosticsModule } from '../diagnostics/diagnostics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';
import { StorageModule } from '../storage/storage.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [AuditModule, DiagnosticsModule, NotificationsModule, PushModule, StorageModule],
  providers: [JobsService],
})
export class JobsModule {}

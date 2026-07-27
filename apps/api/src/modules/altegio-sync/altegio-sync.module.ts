import { Module } from '@nestjs/common';
import { AltegioB2bClient } from './altegio-b2b.client';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';
import { AltegioSyncController } from './altegio-sync.controller';

@Module({
  controllers: [AltegioSyncController],
  providers: [AltegioB2bClient, AltegioStaffScheduleSyncService],
  exports: [AltegioStaffScheduleSyncService, AltegioB2bClient],
})
export class AltegioSyncModule {}

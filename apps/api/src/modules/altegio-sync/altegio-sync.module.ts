import { Module } from '@nestjs/common';
import { AltegioB2bClient } from './altegio-b2b.client';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';
import { AltegioSyncController } from './altegio-sync.controller';
import { AltegioPilotController } from './altegio-pilot.controller';
import { AltegioPilotService } from './altegio-pilot.service';

@Module({
  controllers: [AltegioSyncController, AltegioPilotController],
  providers: [AltegioB2bClient, AltegioStaffScheduleSyncService, AltegioPilotService],
  exports: [AltegioStaffScheduleSyncService, AltegioPilotService, AltegioB2bClient],
})
export class AltegioSyncModule {}

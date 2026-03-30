import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { BiometricController } from './biometric.controller';
import { BiometricProviderService } from './biometric-provider.service';
import { BiometricService } from './biometric.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [BiometricController],
  providers: [BiometricService, BiometricProviderService],
  exports: [BiometricService],
})
export class BiometricModule {}

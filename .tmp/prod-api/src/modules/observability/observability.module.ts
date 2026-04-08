import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuditModule } from '../audit/audit.module';
import { BiometricModule } from '../biometric/biometric.module';
import { DiagnosticsModule } from '../diagnostics/diagnostics.module';
import { ExportsModule } from '../exports/exports.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';

@Module({
  imports: [AttendanceModule, DiagnosticsModule, NotificationsModule, ExportsModule, BiometricModule, PushModule, AuditModule],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
})
export class ObservabilityModule {}

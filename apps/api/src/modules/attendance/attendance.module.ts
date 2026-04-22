import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { BiometricModule } from '../biometric/biometric.module';
import { DevicesModule } from '../devices/devices.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { AttendanceGateway } from './attendance.gateway';
import { AttendanceRealtimeService } from './attendance-realtime.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [DevicesModule, AuditModule, NotificationsModule, ScheduleModule, BiometricModule, LeaderboardModule, JwtModule.register({})],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway, AttendanceRealtimeService],
  exports: [AttendanceService, AttendanceGateway, AttendanceRealtimeService],
})
export class AttendanceModule {}

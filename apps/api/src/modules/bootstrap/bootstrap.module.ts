import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { BiometricModule } from '../biometric/biometric.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { EmployeesModule } from '../employees/employees.module';
import { OrgModule } from '../org/org.module';
import { RequestsModule } from '../requests/requests.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [
    AuditModule,
    AttendanceModule,
    BiometricModule,
    CollaborationModule,
    EmployeesModule,
    OrgModule,
    RequestsModule,
    ScheduleModule,
  ],
  controllers: [BootstrapController],
  providers: [BootstrapService],
})
export class BootstrapModule {}

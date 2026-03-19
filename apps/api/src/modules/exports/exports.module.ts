import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { PayrollModule } from '../payroll/payroll.module';
import { StorageModule } from '../storage/storage.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [AuditModule, StorageModule, AttendanceModule, PayrollModule],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeesController } from './employees.controller';
import { EmployeeInvitationsMailerService } from './employee-invitations.mailer';
import { EmployeesService } from './employees.service';

@Module({
  imports: [ConfigModule, AuditModule, BillingModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeInvitationsMailerService],
  exports: [EmployeesService],
})
export class EmployeesModule {}

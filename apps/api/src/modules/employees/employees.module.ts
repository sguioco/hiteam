import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeesController } from './employees.controller';
import { EmployeeInvitationsMailerService } from './employee-invitations.mailer';
import { EmployeesService } from './employees.service';

@Module({
  imports: [ConfigModule, AuditModule, BillingModule, CollaborationModule, MailModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeInvitationsMailerService],
  exports: [EmployeesService, EmployeeInvitationsMailerService],
})
export class EmployeesModule {}

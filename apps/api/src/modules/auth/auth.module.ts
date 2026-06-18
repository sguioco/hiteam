import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { EmployeesModule } from '../employees/employees.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgModule } from '../org/org.module';
import { AuthMailerService } from './auth-mailer.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    AuditModule,
    EmployeesModule,
    MailModule,
    OrgModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthMailerService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

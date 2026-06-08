import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { LifecycleEmailService } from './lifecycle-email.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [LifecycleEmailService],
  exports: [LifecycleEmailService],
})
export class MailModule {}

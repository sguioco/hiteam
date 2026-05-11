import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { KommoController } from './kommo.controller';
import { KommoWebhookController } from './kommo-webhook.controller';
import { KommoService } from './kommo.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [KommoController, KommoWebhookController],
  providers: [KommoService],
  exports: [KommoService],
})
export class KommoModule {}

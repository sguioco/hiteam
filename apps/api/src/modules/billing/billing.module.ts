import { Module } from '@nestjs/common';
import { AltegioCallbackController } from './altegio-callback.controller';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';
import { AltegioMarketplaceClient } from './altegio-marketplace.client';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController, BillingWebhookController, AltegioCallbackController],
  providers: [BillingService, AltegioMarketplaceClient, AltegioMarketplaceBillingService],
  exports: [BillingService, AltegioMarketplaceBillingService],
})
export class BillingModule {}

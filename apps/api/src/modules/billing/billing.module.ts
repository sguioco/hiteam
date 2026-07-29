import { Module, forwardRef } from '@nestjs/common';
import { AltegioSyncModule } from '../altegio-sync/altegio-sync.module';
import { AltegioCallbackController } from './altegio-callback.controller';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';
import { AltegioMarketplaceClient } from './altegio-marketplace.client';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingController } from './billing.controller';
import { BillingStatsController } from './billing-stats.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [forwardRef(() => AltegioSyncModule)],
  controllers: [BillingController, BillingWebhookController, AltegioCallbackController, BillingStatsController],
  providers: [BillingService, AltegioMarketplaceClient, AltegioMarketplaceBillingService],
  exports: [BillingService, AltegioMarketplaceBillingService],
})
export class BillingModule {}

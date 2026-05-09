import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';

type StripeWebhookRequest = Request & {
  body: Buffer;
};

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  webhook(
    @Req() request: StripeWebhookRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billingService.handleStripeWebhook(request.body, signature);
  }
}

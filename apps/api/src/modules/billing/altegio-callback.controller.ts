import { All, Controller, Headers, HttpException, HttpStatus, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';

@Controller('altegio')
export class AltegioCallbackController {
  constructor(private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService) {}

  @All('callback')
  async callback(
    @Req() request: Request,
    @Query() query: Record<string, string>,
    @Headers('x-altegio-callback-token') headerToken?: string,
  ) {
    const expected = (process.env.ALTEGIO_CALLBACK_TOKEN || '').trim();
    if (expected) {
      const got = String(headerToken || query.token || '').trim();
      if (got !== expected) {
        throw new HttpException({ message: 'invalid_callback_token' }, HttpStatus.UNAUTHORIZED);
      }
    }

    const body =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>)
        : {};
    const payload: Record<string, unknown> = {
      ...body,
      ...query,
    };
    return this.altegioMarketplaceBilling.handleExternalCallback(payload);
  }
}

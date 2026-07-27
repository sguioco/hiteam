import { All, Controller, Headers, HttpException, HttpStatus, Optional, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AltegioStaffScheduleSyncService } from '../altegio-sync/altegio-staff-schedule-sync.service';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';

@Controller('altegio')
export class AltegioCallbackController {
  constructor(
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
    @Optional() private readonly altegioStaffScheduleSync?: AltegioStaffScheduleSyncService,
  ) {}

  @All('callback')
  async callback(
    @Req() request: Request,
    @Query() query: Record<string, string>,
    @Headers('x-altegio-callback-token') headerToken?: string,
  ) {
    this.assertCallbackToken(headerToken, query);
    const payload = this.mergePayload(request, query);
    return this.altegioMarketplaceBilling.handleExternalCallback(payload);
  }

  @All('webhooks')
  async webhooks(
    @Req() request: Request,
    @Query() query: Record<string, string>,
    @Headers('x-altegio-callback-token') headerToken?: string,
  ) {
    this.assertCallbackToken(headerToken, query);
    const payload = this.mergePayload(request, query);
    if (!this.altegioStaffScheduleSync) {
      return { ok: true, ignored: 'sync_service_unavailable' };
    }
    return this.altegioStaffScheduleSync.handleWebhookEvent(payload);
  }

  private assertCallbackToken(headerToken: string | undefined, query: Record<string, string>) {
    const expected = (process.env.ALTEGIO_CALLBACK_TOKEN || '').trim();
    if (!expected) {
      return;
    }
    const got = String(headerToken || query.token || '').trim();
    if (got !== expected) {
      throw new HttpException({ message: 'invalid_callback_token' }, HttpStatus.UNAUTHORIZED);
    }
  }

  private mergePayload(request: Request, query: Record<string, string>) {
    const body =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>)
        : {};
    return {
      ...body,
      ...query,
    } as Record<string, unknown>;
  }
}

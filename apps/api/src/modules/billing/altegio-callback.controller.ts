import {
  All,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Optional,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AltegioB2bClient } from '../altegio-sync/altegio-b2b.client';
import { AltegioStaffScheduleSyncService } from '../altegio-sync/altegio-staff-schedule-sync.service';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';
import { AltegioMarketplaceClient } from './altegio-marketplace.client';

@Controller('altegio')
export class AltegioCallbackController {
  constructor(
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
    private readonly altegioMarketplaceClient: AltegioMarketplaceClient,
    private readonly altegioB2bClient: AltegioB2bClient,
    @Optional() private readonly altegioStaffScheduleSync?: AltegioStaffScheduleSyncService,
  ) {}

  @Get('onboarding/preview')
  async onboardingPreview(@Query() query: Record<string, string>) {
    const locationId = String(query.locationId || query.salon_id || '').trim();
    const applicationId = String(
      query.applicationId || query.app_id || this.altegioMarketplaceClient.applicationId(),
    ).trim();
    if (!/^\d+$/.test(locationId) || !/^\d+$/.test(applicationId)) {
      throw new HttpException({ message: 'invalid_altegio_entry' }, HttpStatus.BAD_REQUEST);
    }
    if (applicationId !== this.altegioMarketplaceClient.applicationId()) {
      throw new HttpException({ message: 'unsupported_application' }, HttpStatus.BAD_REQUEST);
    }

    const statusPayload = await this.altegioMarketplaceClient.getIntegrationStatus({
      locationId,
      applicationId,
    });
    const data =
      statusPayload.data && typeof statusPayload.data === 'object'
        ? (statusPayload.data as Record<string, unknown>)
        : {};
    const connection =
      data.connection_status && typeof data.connection_status === 'object'
        ? (data.connection_status as Record<string, unknown>)
        : {};
    const status = String(connection.status || '').trim().toLowerCase();
    if (status !== 'pending') {
      throw new HttpException(
        { message: 'altegio_marketplace_consent_required' },
        HttpStatus.FORBIDDEN,
      );
    }

    const location = await this.altegioB2bClient.getLocationProfile(locationId);
    return {
      applicationId,
      connectionStatus: status,
      location,
    };
  }

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

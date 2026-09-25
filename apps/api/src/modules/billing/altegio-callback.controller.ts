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
import { AltegioPilotService } from '../altegio-sync/altegio-pilot.service';
import { AltegioWebhookQueueService } from '../altegio-sync/altegio-webhook-queue.service';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';
import { AltegioMarketplaceClient } from './altegio-marketplace.client';
import { verifyAltegioInstallClaim } from './altegio-install-claim';
import { classifyMarketplaceLifecycleEvent } from './altegio-marketplace.helpers';
import { isUserDataSignValid } from './altegio-webhook-signature';

@Controller('altegio')
export class AltegioCallbackController {
  constructor(
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
    private readonly altegioMarketplaceClient: AltegioMarketplaceClient,
    private readonly altegioB2bClient: AltegioB2bClient,
    private readonly altegioWebhookQueue: AltegioWebhookQueueService,
    @Optional() private readonly altegioStaffScheduleSync?: AltegioStaffScheduleSyncService,
    @Optional() private readonly altegioPilot?: AltegioPilotService,
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

    // A signed install claim proves the visitor really arrived from Altegio for
    // this salon, so the preview does not act as an unauthenticated PII oracle.
    const partnerKey = this.altegioMarketplaceClient.partnerKey();
    if (partnerKey) {
      const claim = verifyAltegioInstallClaim({
        userData: String(query.user_data ?? '').trim(),
        userDataSign: String(query.user_data_sign ?? '').trim(),
        claimedLocationId: locationId,
        partnerKey,
      });
      if (!claim.claim || !("valid" in claim)) {
        throw new HttpException(
          { message: 'invalid_altegio_install_claim' },
          HttpStatus.FORBIDDEN,
        );
      }
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
    const payload = this.mergePayload(request, query);
    this.assertCallbackToken(headerToken, payload);
    return this.altegioMarketplaceBilling.handleExternalCallback(payload) as Promise<
      Record<string, unknown>
    >;
  }

  @All('webhooks')
  async webhooks(
    @Req() request: Request,
    @Query() query: Record<string, string>,
    @Headers('x-altegio-callback-token') headerToken?: string,
  ) {
    const payload = this.mergePayload(request, query);
    this.assertCallbackToken(headerToken, payload);
    // Altegio allows a single webhook URL per application, so marketplace
    // lifecycle events can arrive on the entity webhook endpoint as well.
    if (this.isMarketplaceLifecycleEvent(payload)) {
      return this.altegioMarketplaceBilling.handleExternalCallback(payload) as Promise<
        Record<string, unknown>
      >;
    }
    if (!this.altegioStaffScheduleSync) {
      return { ok: true, ignored: 'sync_service_unavailable' };
    }
    const enqueued = await this.altegioWebhookQueue.enqueue(payload);
    if (!enqueued.ok) {
      throw new HttpException(
        { message: 'webhook_queue_backpressure', queueLength: enqueued.queueLength },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (enqueued.queued) {
      return { ok: true, queued: true, jobId: enqueued.jobId };
    }
    return enqueued.result;
  }

  private isMarketplaceLifecycleEvent(payload: Record<string, unknown>) {
    const event = classifyMarketplaceLifecycleEvent(payload.event);
    return event === 'uninstall' || event === 'freeze';
  }

  private assertCallbackToken(headerToken: string | undefined, payload: Record<string, unknown>) {
    if (this.assertUserDataSign(payload)) {
      return;
    }
    // Marketplace lifecycle webhooks authenticate with the developer partner token in the body.
    const partnerToken = this.altegioMarketplaceClient.partnerToken();
    const partnerCandidate = String(payload.partner_token ?? '').trim();
    if (partnerCandidate) {
      if (partnerToken && partnerCandidate === partnerToken) {
        return;
      }
      throw new HttpException({ message: 'invalid_partner_token' }, HttpStatus.UNAUTHORIZED);
    }

    const expected = (process.env.ALTEGIO_CALLBACK_TOKEN || '').trim();
    if (!expected) {
      // Never accept anonymous deliveries: a missing shared token is a
      // deployment error, not an authorization grant.
      throw new HttpException(
        { message: 'callback_token_not_configured' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const got = String(headerToken || payload.token || '').trim();
    if (got !== expected) {
      throw new HttpException({ message: 'invalid_callback_token' }, HttpStatus.UNAUTHORIZED);
    }
  }

  private assertUserDataSign(payload: Record<string, unknown>): boolean {
    const partnerKey = this.altegioMarketplaceClient.partnerKey();
    if (!partnerKey) {
      return false;
    }
    const userData = String(payload.user_data ?? '').trim();
    const sign = String(payload.user_data_sign ?? '').trim();
    if (!userData && !sign) {
      return false;
    }
    if (!userData || !sign || !isUserDataSignValid(userData, sign, partnerKey)) {
      throw new HttpException({ message: 'invalid_user_data_sign' }, HttpStatus.UNAUTHORIZED);
    }
    return true;
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class AltegioMarketplaceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'AltegioMarketplaceError';
  }
}

@Injectable()
export class AltegioMarketplaceClient {
  private readonly logger = new Logger(AltegioMarketplaceClient.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(this.partnerToken() && this.applicationId());
  }

  applicationId() {
    return (this.configService.get<string>('ALTEGIO_MARKETPLACE_APPLICATION_ID') ?? '').trim();
  }

  partnerToken() {
    return this.configService.get<string>('ALTEGIO_PARTNER_TOKEN')?.trim() || '';
  }

  systemUserToken() {
    return (this.configService.get<string>('ALTEGIO_MARKETPLACE_SYSTEM_USER_TOKEN') ?? '').trim();
  }

  async activateIntegration(args: {
    locationId: string;
    applicationId?: string;
    webhookUrl?: string;
  }) {
    const applicationId = (args.applicationId || this.applicationId()).trim();
    const salonId = this.toInt(args.locationId);
    const applicationIdInt = this.toInt(applicationId);
    if (salonId === null || applicationIdInt === null) {
      throw new AltegioMarketplaceError('marketplace_activation_input_missing', 400);
    }

    const payload: Record<string, unknown> = {
      salon_id: salonId,
      application_id: applicationIdInt,
    };
    const webhook = (args.webhookUrl || '').trim();
    if (webhook) {
      payload.webhook_urls = [webhook];
    }

    return this.request('POST', 'https://app.alteg.io/marketplace/partner/callback', payload);
  }

  async getIntegrationStatus(args: { locationId: string; applicationId: string }) {
    const locationId = args.locationId.trim();
    const applicationId = args.applicationId.trim();
    return this.request(
      'GET',
      `https://app.alteg.io/marketplace/salon/${encodeURIComponent(locationId)}/application/${encodeURIComponent(applicationId)}`,
    );
  }

  async uninstallIntegration(args: { locationId: string; applicationId: string }) {
    const salonId = this.toInt(args.locationId);
    const applicationIdInt = this.toInt(args.applicationId);
    if (salonId === null || applicationIdInt === null) {
      throw new AltegioMarketplaceError('marketplace_uninstall_input_missing', 400);
    }

    return this.request(
      'POST',
      `https://app.alteg.io/marketplace/salon/${salonId}/application/${applicationIdInt}/uninstall`,
    );
  }

  async notifyPayment(args: {
    locationId: string;
    applicationId: string;
    paymentSum: number;
    currencyIso: string;
    paymentDate: string;
    periodFrom: string;
    periodTo: string;
  }) {
    const salonId = this.toInt(args.locationId);
    const applicationIdInt = this.toInt(args.applicationId);
    if (salonId === null || applicationIdInt === null) {
      throw new AltegioMarketplaceError('marketplace_payment_input_missing', 400);
    }

    return this.request('POST', 'https://app.alteg.io/marketplace/partner/payment', {
      salon_id: salonId,
      application_id: applicationIdInt,
      payment_sum: Number(args.paymentSum),
      currency_iso: args.currencyIso.trim().toUpperCase(),
      payment_date: args.paymentDate,
      period_from: args.periodFrom,
      period_to: args.periodTo,
    });
  }

  private toInt(value: string) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async request(method: 'GET' | 'POST', url: string, json?: Record<string, unknown>) {
    const partnerToken = this.partnerToken();
    if (!partnerToken) {
      throw new AltegioMarketplaceError('altegio_partner_token_missing', 503);
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.api.v2+json',
      Authorization: `Bearer ${partnerToken}`,
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: json ? JSON.stringify(json) : undefined,
    });

    const rawText = await response.text();
    let payload: unknown = null;
    if (rawText.trim()) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { error: 'invalid_json', response_text: rawText.slice(0, 500) };
      }
    } else if (response.status >= 200 && response.status < 300) {
      payload = { success: true, data: null };
    }

    if (response.status >= 400) {
      this.logger.warn(
        `Altegio marketplace ${method} ${url} -> ${response.status}: ${rawText.slice(0, 400)}`,
      );
      throw new AltegioMarketplaceError(
        `Altegio marketplace request failed with ${response.status}`,
        response.status,
        payload,
      );
    }

    return (payload && typeof payload === 'object' ? payload : { success: true, data: payload }) as Record<
      string,
      unknown
    >;
  }
}

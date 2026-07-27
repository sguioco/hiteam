import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AltegioMarketplaceClient, AltegioMarketplaceError } from './altegio-marketplace.client';
import {
  formatAltegioMarketplaceDatetime,
  parseMarketplaceSubscriptionSnapshot,
  resolveMarketplaceStatusFromSnapshot,
  shouldPushLocalPeriodToAltegio,
  type MarketplaceSubscriptionSnapshot,
} from './altegio-marketplace.helpers';

type BillingSubscriptionRow = {
  id: string;
  tenantId: string;
  paidSeats: number;
  status: string;
  firstPaidAt: Date | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodStart: Date | null;
  stripeCurrentPeriodEnd: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialSource: string | null;
  altegioLocationId: string | null;
  altegioApplicationId: string | null;
  altegioMarketplaceActivatedAt: Date | null;
};

@Injectable()
export class AltegioMarketplaceBillingService {
  private readonly logger = new Logger(AltegioMarketplaceBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly altegioClient: AltegioMarketplaceClient,
  ) {}

  isMarketplaceBilled(subscription: Pick<BillingSubscriptionRow, 'altegioLocationId' | 'altegioApplicationId'>) {
    return Boolean(
      (subscription.altegioLocationId || '').trim() && (subscription.altegioApplicationId || '').trim(),
    );
  }

  async connectMarketplace(args: {
    tenantId: string;
    locationId: string;
    applicationId?: string | null;
  }) {
    if (!this.altegioClient.isConfigured()) {
      throw new HttpException(
        { message: 'Altegio marketplace is not configured.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const locationId = String(args.locationId || '').trim();
    const configuredAppId = this.altegioClient.applicationId();
    const applicationId = String(args.applicationId || configuredAppId || '').trim();

    if (!locationId) {
      throw new HttpException({ message: 'locationId is required.' }, HttpStatus.BAD_REQUEST);
    }
    if (!applicationId) {
      throw new HttpException(
        { message: 'ALTEGIO_MARKETPLACE_APPLICATION_ID is not configured.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (configuredAppId && applicationId !== configuredAppId) {
      throw new HttpException(
        {
          message: 'This HiTeam marketplace listing only supports a single application id.',
          expectedApplicationId: configuredAppId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingByLocation = await this.prisma.billingSubscription.findFirst({
      where: {
        altegioLocationId: locationId,
        NOT: { tenantId: args.tenantId },
      },
      select: { tenantId: true },
    });
    if (existingByLocation) {
      throw new HttpException(
        { message: 'This Altegio salon is already connected to another HiTeam workspace.' },
        HttpStatus.CONFLICT,
      );
    }

    try {
      await this.altegioClient.activateIntegration({
        locationId,
        applicationId,
      });
    } catch (error) {
      if (error instanceof AltegioMarketplaceError && error.statusCode === 409) {
        this.logger.log(
          `Altegio marketplace already installed tenantId=${args.tenantId} locationId=${locationId}`,
        );
      } else {
        this.logger.warn(
          `Altegio marketplace activation failed tenantId=${args.tenantId} locationId=${locationId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw new HttpException(
          {
            message: 'Failed to activate Altegio marketplace integration.',
            reason: error instanceof AltegioMarketplaceError ? error.payload : undefined,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    const now = new Date();
    await this.prisma.billingSubscription.upsert({
      where: { tenantId: args.tenantId },
      update: {
        altegioLocationId: locationId,
        altegioApplicationId: applicationId,
        altegioMarketplaceActivatedAt: now,
      },
      create: {
        tenantId: args.tenantId,
        paidSeats: 0,
        status: 'TRIALING',
        altegioLocationId: locationId,
        altegioApplicationId: applicationId,
        altegioMarketplaceActivatedAt: now,
      },
    });

    await this.syncWithMarketplace(args.tenantId, { source: 'connect' });

    return this.getMarketplaceSummary(args.tenantId);
  }

  async disconnectMarketplace(tenantId: string) {
    await this.prisma.billingSubscription.updateMany({
      where: { tenantId },
      data: {
        altegioLocationId: null,
        altegioApplicationId: null,
        altegioMarketplaceActivatedAt: null,
      },
    });
    return { disconnected: true };
  }

  async handleExternalCallback(payload: Record<string, unknown>) {
    const locationId = this.pickFirstString(
      payload.location_id,
      payload.company_id,
      payload.salon_id,
      payload.business_id,
      payload.id,
    );
    if (!locationId) {
      throw new HttpException({ message: 'location_id_required' }, HttpStatus.BAD_REQUEST);
    }

    const subscription = await this.prisma.billingSubscription.findFirst({
      where: { altegioLocationId: locationId },
    });
    if (!subscription) {
      return { ok: true, updated: false };
    }

    const status = this.pickFirstString(
      payload.status_to,
      payload.status,
      payload.event,
      payload.action,
      payload.type,
    ).toLowerCase();
    const applicationId =
      this.pickFirstString(payload.application_id, payload.marketplace_application_id, payload.app_id) ||
      subscription.altegioApplicationId ||
      '';

    const connectStatuses = new Set([
      'active',
      'connected',
      'connect',
      'installed',
      'install',
      'enabled',
      'enable',
    ]);
    const disconnectStatuses = new Set([
      'uninstalled',
      'uninstall',
      'disconnected',
      'disconnect',
      'disabled',
      'disable',
      'deleted',
      'delete',
      'freezed',
      'frozen',
      'inactive',
      'canceled',
      'cancelled',
    ]);

    if (connectStatuses.has(status)) {
      const configuredAppId = this.altegioClient.applicationId();
      const nextAppId = (applicationId || configuredAppId).trim();
      await this.prisma.billingSubscription.update({
        where: { id: subscription.id },
        data: {
          altegioApplicationId: nextAppId || subscription.altegioApplicationId,
          altegioMarketplaceActivatedAt: new Date(),
        },
      });
      await this.syncWithMarketplace(subscription.tenantId, { source: 'altegio_callback_connect' });
      return { ok: true, updated: true, status: 'connected' };
    }

    if (disconnectStatuses.has(status)) {
      const currentApp = (subscription.altegioApplicationId || '').trim();
      const callbackApp = (applicationId || '').trim();
      if (currentApp && callbackApp && currentApp !== callbackApp) {
        return { ok: true, updated: false, ignored: 'stale_disconnect' };
      }
      await this.disconnectMarketplace(subscription.tenantId);
      return { ok: true, updated: true, status: 'disconnected' };
    }

    return { ok: true, updated: false, ignored: 'unknown_status' };
  }

  async getMarketplaceSummary(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });
    if (!subscription) {
      return {
        connected: false,
        locationId: null,
        applicationId: null,
        activatedAt: null,
      };
    }

    return {
      connected: this.isMarketplaceBilled(subscription),
      locationId: subscription.altegioLocationId,
      applicationId: subscription.altegioApplicationId,
      activatedAt: subscription.altegioMarketplaceActivatedAt?.toISOString() ?? null,
    };
  }

  async syncWithMarketplace(
    tenantId: string,
    args?: {
      source?: string;
      paymentSum?: number | null;
      currencyIso?: string | null;
      paymentDate?: Date | null;
    },
  ) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });
    if (!subscription || !this.isMarketplaceBilled(subscription)) {
      return { pulled: false, pushed: false };
    }

    const source = args?.source || 'sync';
    const snapshot = await this.fetchSnapshot(subscription);
    let pulled = false;
    if (snapshot) {
      pulled = await this.applySnapshot(subscription, snapshot, source);
    }

    const refreshed = await this.prisma.billingSubscription.findUniqueOrThrow({
      where: { tenantId },
    });
    const pushed = await this.pushLocalPeriod(refreshed, {
      source,
      snapshot,
      paymentSum: args?.paymentSum,
      currencyIso: args?.currencyIso,
      paymentDate: args?.paymentDate,
    });

    return { pulled, pushed };
  }

  async notifyPaymentAfterStripe(args: {
    tenantId: string;
    paymentSum?: number | null;
    currencyIso?: string | null;
    paymentDate?: Date | null;
  }) {
    try {
      return await this.syncWithMarketplace(args.tenantId, {
        source: 'stripe_webhook',
        paymentSum: args.paymentSum,
        currencyIso: args.currencyIso,
        paymentDate: args.paymentDate,
      });
    } catch (error) {
      this.logger.warn(
        `Altegio payment notify failed tenantId=${args.tenantId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { pulled: false, pushed: false };
    }
  }

  private async fetchSnapshot(subscription: BillingSubscriptionRow) {
    const locationId = (subscription.altegioLocationId || '').trim();
    const applicationId = (subscription.altegioApplicationId || '').trim();
    if (!locationId || !applicationId) {
      return null;
    }

    try {
      const payload = await this.altegioClient.getIntegrationStatus({
        locationId,
        applicationId,
      });
      return parseMarketplaceSubscriptionSnapshot(payload);
    } catch (error) {
      this.logger.warn(
        `Altegio marketplace status fetch failed locationId=${locationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async applySnapshot(
    subscription: BillingSubscriptionRow,
    snapshot: MarketplaceSubscriptionSnapshot,
    source: string,
  ) {
    const now = Date.now();
    const previousEnd = subscription.stripeCurrentPeriodEnd;
    const currentStatus = String(subscription.status || '').trim().toUpperCase();
    const localPeriodIsActive = Boolean(
      previousEnd &&
        previousEnd.getTime() > now &&
        (currentStatus === 'ACTIVE' || currentStatus === 'TRIALING'),
    );
    const hasStripeSubscription = Boolean((subscription.stripeSubscriptionId || '').trim());
    const preserveLocalTrialPeriod = Boolean(
      snapshot.isTrial &&
        localPeriodIsActive &&
        snapshot.periodEnd &&
        previousEnd &&
        snapshot.periodEnd.getTime() < previousEnd.getTime(),
    );
    const preserveStripePaidPeriod = Boolean(
      hasStripeSubscription &&
        currentStatus === 'ACTIVE' &&
        !snapshot.isTrial &&
        snapshot.periodEnd &&
        previousEnd &&
        snapshot.periodEnd.getTime() < previousEnd.getTime(),
    );

    const nextStatus = resolveMarketplaceStatusFromSnapshot({
      snapshot,
      localStatus: subscription.status,
      localPeriodEnd: previousEnd,
      hasStripeSubscription,
    });

    const data: {
      status?: string;
      stripeCurrentPeriodEnd?: Date | null;
      stripeCurrentPeriodStart?: Date | null;
      trialEndsAt?: Date | null;
      trialStartedAt?: Date | null;
      trialSource?: string | null;
    } = {};

    if (snapshot.periodEnd) {
      let nextEnd: Date | null = snapshot.periodEnd;
      if (
        preserveLocalTrialPeriod ||
        preserveStripePaidPeriod ||
        (previousEnd && previousEnd.getTime() > nextEnd.getTime() && localPeriodIsActive)
      ) {
        nextEnd = previousEnd;
      }
      if (nextEnd && (!previousEnd || nextEnd.getTime() !== previousEnd.getTime())) {
        data.stripeCurrentPeriodEnd = nextEnd;
      }
    } else if (snapshot.connectionStatus === 'freezed') {
      data.stripeCurrentPeriodEnd = new Date();
    }

    if (snapshot.periodStart && !subscription.stripeCurrentPeriodStart) {
      data.stripeCurrentPeriodStart = snapshot.periodStart;
    }

    // Marketplace trial can extend local HiTeam trial before first Stripe payment.
    if (snapshot.isTrial && snapshot.periodEnd && !subscription.firstPaidAt && !hasStripeSubscription) {
      if (!subscription.trialEndsAt || snapshot.periodEnd.getTime() > subscription.trialEndsAt.getTime()) {
        data.trialEndsAt = snapshot.periodEnd;
        data.trialStartedAt = snapshot.periodStart ?? subscription.trialStartedAt ?? new Date();
        data.trialSource = 'ALTEGIO_MARKETPLACE';
      }
    }

    if (
      nextStatus &&
      nextStatus !== currentStatus &&
      !preserveLocalTrialPeriod &&
      !preserveStripePaidPeriod &&
      !localPeriodIsActive
    ) {
      data.status = nextStatus;
    }

    if (Object.keys(data).length === 0) {
      return false;
    }

    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data,
    });
    this.logger.log(
      `marketplace billing sync applied source=${source} tenantId=${subscription.tenantId} status=${
        data.status ?? currentStatus
      } periodEnd=${(data.stripeCurrentPeriodEnd ?? previousEnd)?.toISOString() ?? 'null'} trial=${snapshot.isTrial}`,
    );
    return true;
  }

  private async pushLocalPeriod(
    subscription: BillingSubscriptionRow,
    args: {
      source: string;
      snapshot: MarketplaceSubscriptionSnapshot | null;
      paymentSum?: number | null;
      currencyIso?: string | null;
      paymentDate?: Date | null;
    },
  ) {
    if (!this.isMarketplaceBilled(subscription)) {
      return false;
    }

    const localEnd =
      subscription.stripeCurrentPeriodEnd ||
      (!subscription.firstPaidAt ? subscription.trialEndsAt : null);
    if (!localEnd || localEnd.getTime() <= Date.now()) {
      return false;
    }

    const status = String(subscription.status || '').trim().toUpperCase();
    const active = status === 'ACTIVE' || status === 'TRIALING';
    if (!active && !subscription.trialEndsAt) {
      return false;
    }

    const altegioEnd = args.snapshot?.periodEnd ?? null;
    if (
      !shouldPushLocalPeriodToAltegio({
        localEnd,
        altegioEnd,
        alignIfMismatch: true,
      })
    ) {
      return false;
    }

    const isTrial =
      status === 'TRIALING' ||
      Boolean(!subscription.firstPaidAt && subscription.trialEndsAt && subscription.trialEndsAt > new Date());

    let paymentSum = args.paymentSum;
    if (paymentSum == null) {
      paymentSum = isTrial ? 0 : await this.resolveRegionalPaymentSum(subscription.tenantId);
    }

    const currencyIso =
      (args.currencyIso || '').trim().toUpperCase() ||
      (await this.resolveRegionalCurrency(subscription.tenantId));

    const periodStart =
      args.snapshot?.periodStart ||
      subscription.stripeCurrentPeriodStart ||
      subscription.trialStartedAt ||
      new Date();

    try {
      await this.altegioClient.notifyPayment({
        locationId: subscription.altegioLocationId!,
        applicationId: subscription.altegioApplicationId!,
        paymentSum,
        currencyIso,
        paymentDate: formatAltegioMarketplaceDatetime(args.paymentDate || new Date()),
        periodFrom: formatAltegioMarketplaceDatetime(periodStart),
        periodTo: formatAltegioMarketplaceDatetime(localEnd),
      });
      this.logger.log(
        `marketplace billing push applied source=${args.source} tenantId=${subscription.tenantId} localEnd=${localEnd.toISOString()} sum=${paymentSum} ${currencyIso}`,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `marketplace billing push failed tenantId=${subscription.tenantId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async resolveRegionalPaymentSum(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { paidSeats: true, stripeCurrency: true },
    });
    const seats = Math.max(1, subscription?.paidSeats ?? 1);
    const unitAmount = Number(
      this.configService.get<string>('ALTEGIO_MARKETPLACE_FALLBACK_UNIT_AMOUNT') || '3',
    );
    return seats * (Number.isFinite(unitAmount) ? unitAmount : 3);
  }

  private async resolveRegionalCurrency(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { stripeCurrency: true },
    });
    return (
      subscription?.stripeCurrency?.trim().toUpperCase() ||
      this.configService.get<string>('ALTEGIO_MARKETPLACE_PAYMENT_CURRENCY')?.trim().toUpperCase() ||
      'USD'
    );
  }

  private pickFirstString(...values: unknown[]) {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) {
        return text;
      }
    }
    return '';
  }
}

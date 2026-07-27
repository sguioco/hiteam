import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationStatus, EmployeeStatus } from '@prisma/client';
import StripeClient from 'stripe';
import type { Stripe } from 'stripe/cjs/stripe.core';
import { KommoService } from '../kommo/kommo.service';
import { PrismaService } from '../prisma/prisma.service';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';

type BillingCurrency = 'AED' | 'USD' | 'EUR';
type BillingPlanMonths = 1 | 6 | 12;
type BillingPaymentStatus = 'PAID' | 'FAILED';
type BillingPaymentRecordResult = {
  isNew: boolean;
  status: BillingPaymentStatus;
  reason: string;
  previousStatus?: string | null;
  previousReason?: string | null;
};

export type BillingCheckoutRequest = {
  seats?: number;
  planMonths?: BillingPlanMonths;
};

export type BillingPaymentHistoryItem = {
  id: string;
  source: string;
  status: string;
  reason: string;
  amountMinor: number | null;
  currency: string | null;
  planMonths: number | null;
  accessMonths: number | null;
  targetSeats: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string;
  stripeCheckoutSessionId: string | null;
  stripeInvoiceId: string | null;
};

type BillingPriceRule = {
  code: string;
  label: string;
  currency: BillingCurrency;
  unitAmount: number;
  approxUsd?: number;
  stripeLookupKey: string;
  matchers: string[];
  timeZones?: string[];
};

const ACTIVE_INVITATION_STATUSES = [
  EmployeeInvitationStatus.INVITED,
  EmployeeInvitationStatus.PENDING_APPROVAL,
  EmployeeInvitationStatus.APPROVED,
];

const PRICE_RULES: BillingPriceRule[] = [
  {
    code: 'middle_east',
    label: 'Middle East',
    currency: 'AED',
    unitAmount: 11,
    approxUsd: 3,
    stripeLookupKey: 'hiteam_seat_middle_east_monthly',
    matchers: [
      'united arab emirates',
      'uae',
      'emirates',
      'saudi arabia',
      'qatar',
      'kuwait',
      'bahrain',
      'oman',
      'jordan',
      'lebanon',
      'israel',
      'palestine',
      'iraq',
      'iran',
      'yemen',
      'turkey',
    ],
    timeZones: [
      'Asia/Dubai',
      'Asia/Riyadh',
      'Asia/Qatar',
      'Asia/Kuwait',
      'Asia/Bahrain',
      'Asia/Muscat',
      'Asia/Amman',
      'Asia/Beirut',
      'Asia/Jerusalem',
      'Asia/Baghdad',
      'Asia/Tehran',
      'Asia/Aden',
      'Europe/Istanbul',
    ],
  },
  {
    code: 'us_uk',
    label: 'USA / United Kingdom',
    currency: 'USD',
    unitAmount: 5,
    stripeLookupKey: 'hiteam_seat_us_uk_monthly',
    matchers: [
      'united states',
      'usa',
      'u.s.',
      'america',
      'united kingdom',
      'great britain',
      'england',
      'scotland',
      'wales',
      'northern ireland',
    ],
    timeZones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
    ],
  },
  {
    code: 'spain_france',
    label: 'Spain / France',
    currency: 'EUR',
    unitAmount: 3,
    stripeLookupKey: 'hiteam_seat_spain_france_monthly',
    matchers: ['spain', 'españa', 'france'],
    timeZones: ['Europe/Madrid', 'Europe/Paris'],
  },
  {
    code: 'uzbekistan',
    label: 'Uzbekistan',
    currency: 'USD',
    unitAmount: 1,
    stripeLookupKey: 'hiteam_seat_uzbekistan_monthly',
    matchers: ['uzbekistan', 'uzbek'],
    timeZones: ['Asia/Tashkent'],
  },
  {
    code: 'kazakhstan',
    label: 'Kazakhstan',
    currency: 'USD',
    unitAmount: 2,
    stripeLookupKey: 'hiteam_seat_kazakhstan_monthly',
    matchers: ['kazakhstan'],
    timeZones: ['Asia/Almaty', 'Asia/Aqtau', 'Asia/Aqtobe', 'Asia/Atyrau', 'Asia/Oral', 'Asia/Qostanay'],
  },
  {
    code: 'kyrgyzstan',
    label: 'Kyrgyzstan',
    currency: 'USD',
    unitAmount: 1,
    stripeLookupKey: 'hiteam_seat_kyrgyzstan_monthly',
    matchers: ['kyrgyzstan', 'kyrgyz'],
    timeZones: ['Asia/Bishkek'],
  },
  {
    code: 'armenia',
    label: 'Armenia',
    currency: 'USD',
    unitAmount: 2,
    stripeLookupKey: 'hiteam_seat_armenia_monthly',
    matchers: ['armenia'],
    timeZones: ['Asia/Yerevan'],
  },
];

const FALLBACK_PRICE_RULE: BillingPriceRule = {
  code: 'standard',
  label: 'Standard',
  currency: 'USD',
  unitAmount: 3,
  stripeLookupKey: 'hiteam_seat_standard_monthly',
  matchers: [],
};

const BILLING_SEAT_PLANS: Array<{
  paidMonths: BillingPlanMonths;
  accessMonths: number;
  label: string;
}> = [
  { paidMonths: 1, accessMonths: 1, label: 'Monthly' },
  { paidMonths: 6, accessMonths: 7, label: 'Semi Annual' },
  { paidMonths: 12, accessMonths: 14, label: 'Annual' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly kommoService: KommoService,
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
  ) {}

  async getSummary(tenantId: string, options?: { syncMarketplace?: boolean }) {
    if (options?.syncMarketplace) {
      const preliminary = await this.buildSummary(tenantId);
      if (preliminary.altegio.connected) {
        try {
          await this.altegioMarketplaceBilling.syncWithMarketplace(tenantId, {
            source: 'billing_summary',
            paymentSum: preliminary.trialActive ? 0 : preliminary.monthlyTotal,
            currencyIso: preliminary.price.currency,
          });
        } catch (error) {
          this.logger.warn(
            `Altegio marketplace sync skipped tenantId=${tenantId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
    return this.buildSummary(tenantId);
  }

  private async buildSummary(tenantId: string) {
    const subscription = await this.ensureSubscription(tenantId);
    const activePaidPeriod = this.getActivePaidPeriod(subscription);
    const [{ activeEmployeeCount, pendingInvitationCount, usedSeats, billableSeats }, pricing] =
      await Promise.all([this.countSeatUsage(tenantId), this.resolvePricing(tenantId)]);

    const paidSeats = activePaidPeriod ? subscription.paidSeats : 0;
    const requiredSeats = Math.max(paidSeats, billableSeats);
    const rawMissingSeats = Math.max(0, requiredSeats - paidSeats);
    const trialActive = this.isTrialActive(subscription);
    const futureTrialEndsAt =
      subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now()
        ? subscription.trialEndsAt
        : null;
    const missingSeats = trialActive ? 0 : rawMissingSeats;
    const firstPaidAt = await this.ensureFirstPaidAt(subscription, rawMissingSeats);
    const stripeConnected = Boolean(
      (subscription.stripeCustomerId && firstPaidAt) ||
        subscription.stripeSubscriptionId ||
        subscription.stripeSubscriptionItemId,
    );
    const nextBillingAt =
      activePaidPeriod?.end ??
      futureTrialEndsAt ??
      null;
    const serviceActive =
      trialActive ||
      (Boolean(activePaidPeriod) &&
        rawMissingSeats === 0 &&
        !this.isStripeBlockingStatus(subscription.status));
    const status = trialActive ? 'TRIALING' : serviceActive ? subscription.status : 'PAYMENT_REQUIRED';
    const trialDaysRemaining = trialActive && subscription.trialEndsAt
      ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0;
    const history = await this.listPaymentHistory(tenantId, pricing.currency);

    return {
      status,
      paidSeats,
      requiredSeats,
      usedSeats,
      billableSeats,
      availableSeats: Math.max(0, paidSeats - usedSeats),
      missingSeats,
      activeEmployeeCount,
      pendingInvitationCount,
      monthlyTotal: requiredSeats * pricing.unitAmount,
      amountDue: missingSeats * pricing.unitAmount,
      billingStartedAt: firstPaidAt?.toISOString() ?? null,
      currentPeriodStart: activePaidPeriod?.start.toISOString() ?? null,
      currentPeriodEnd: activePaidPeriod?.end.toISOString() ?? null,
      nextBillingAt: nextBillingAt?.toISOString() ?? null,
      serviceActive,
      stripeConnected,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeSubscriptionStatus: subscription.status,
      stripeCancelAtPeriodEnd: subscription.stripeCancelAtPeriodEnd,
      stripeCurrentPeriodStart: subscription.stripeCurrentPeriodStart?.toISOString() ?? null,
      stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd?.toISOString() ?? null,
      trialActive,
      trialStartedAt: subscription.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      trialDaysRemaining,
      trialSource: subscription.trialSource,
      promoCode: subscription.promoCode,
      price: pricing,
      history,
      altegio: {
        connected: this.altegioMarketplaceBilling.isMarketplaceBilled(subscription),
        locationId: subscription.altegioLocationId,
        applicationId: subscription.altegioApplicationId,
        activatedAt: subscription.altegioMarketplaceActivatedAt?.toISOString() ?? null,
      },
    };
  }

  async connectAltegioMarketplace(
    tenantId: string,
    args: { locationId: string; applicationId?: string },
  ) {
    await this.altegioMarketplaceBilling.connectMarketplace({
      tenantId,
      locationId: args.locationId,
      applicationId: args.applicationId,
    });
    return this.getSummary(tenantId, { syncMarketplace: true });
  }

  async disconnectAltegioMarketplace(tenantId: string) {
    await this.altegioMarketplaceBilling.disconnectMarketplace(tenantId);
    return this.getSummary(tenantId);
  }

  async syncAltegioMarketplace(tenantId: string) {
    const summary = await this.getSummary(tenantId);
    const paymentSum = summary.trialActive ? 0 : summary.monthlyTotal;
    await this.altegioMarketplaceBilling.syncWithMarketplace(tenantId, {
      source: 'manual_sync',
      paymentSum,
      currencyIso: summary.price.currency,
    });
    return this.getSummary(tenantId, { syncMarketplace: true });
  }

  async assertCanAddSeatOccupant(tenantId: string) {
    const summary = await this.getSummary(tenantId);

    if (!summary.trialActive && summary.usedSeats + 1 > summary.paidSeats) {
      throw this.buildPaymentRequiredException();
    }

    return summary;
  }

  async isServiceActive(tenantId: string) {
    const summary = await this.getSummary(tenantId);
    return summary.serviceActive;
  }

  buildPaymentRequiredException() {
    return new HttpException(
      {
        message: 'Необходимо оплатить недостающие места в Billing, чтобы сотрудники могли пользоваться сервисом.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async createCheckoutSession(
    tenantId: string,
    userId: string,
    request: BillingCheckoutRequest = {},
  ) {
    const subscription = await this.ensureSubscription(tenantId);
    const summary = await this.getSummary(tenantId);
    const customerId = await this.ensureStripeCustomer(tenantId, userId);
    const plan = this.resolveSeatPlan(request.planMonths);
    const requestedSeats = this.normalizeSeatCount(request.seats);
    const targetSeats = Math.max(
      1,
      summary.requiredSeats,
      summary.usedSeats,
      summary.billableSeats,
      requestedSeats ?? summary.requiredSeats,
    );
    const purchase = this.calculateSeatPurchase({
      currentPaidSeats: summary.paidSeats,
      currentPeriodEnd: summary.currentPeriodEnd,
      plan,
      targetSeats,
      unitAmount: summary.price.unitAmount,
    });

    const stripe = this.getStripe();
    const urlBase = this.getWebBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: summary.price.currency.toLowerCase(),
            product_data: {
              name: `HiTeam ${targetSeats} seats - ${plan.label}`,
              metadata: {
                tenantId,
                planMonths: String(plan.paidMonths),
                accessMonths: String(plan.accessMonths),
              },
            },
            unit_amount: purchase.amountDue * 100,
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: false,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      client_reference_id: tenantId,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      metadata: {
        billingMode: 'seat_purchase',
        tenantId,
        targetSeats: String(targetSeats),
        planMonths: String(plan.paidMonths),
        accessMonths: String(plan.accessMonths),
        periodStart: purchase.periodStart.toISOString(),
        paidThrough: purchase.paidThrough.toISOString(),
        amountDue: String(purchase.amountDue),
        proratedAmount: String(purchase.proratedAmount),
        renewalAmount: String(purchase.renewalAmount),
        currency: summary.price.currency,
        regionCode: summary.price.regionCode,
        priceLookupKey: summary.price.stripeLookupKey,
        altegioLocationId: subscription.altegioLocationId ?? '',
        altegioApplicationId: subscription.altegioApplicationId ?? '',
      },
      payment_intent_data: {
        metadata: {
          billingMode: 'seat_purchase',
          tenantId,
          targetSeats: String(targetSeats),
          planMonths: String(plan.paidMonths),
          accessMonths: String(plan.accessMonths),
          paidThrough: purchase.paidThrough.toISOString(),
          regionCode: summary.price.regionCode,
          priceLookupKey: summary.price.stripeLookupKey,
          altegioLocationId: subscription.altegioLocationId ?? '',
          altegioApplicationId: subscription.altegioApplicationId ?? '',
        },
      },
      success_url: `${urlBase}/billing?stripe=success`,
      cancel_url: `${urlBase}/billing?stripe=cancelled`,
    });

    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        stripeCustomerId: customerId,
        stripePriceLookupKey: summary.price.stripeLookupKey,
        stripeCurrency: summary.price.currency,
      },
    });
    this.kommoService.recordBillingUpdated(tenantId, 'checkout_session_created');

    return {
      mode: 'checkout' as const,
      url: checkoutSession.url,
    };
  }

  async createPortalSession(tenantId: string) {
    const subscription = await this.ensureSubscription(tenantId);

    if (!subscription.stripeCustomerId) {
      throw new HttpException(
        { message: 'Stripe customer is not connected yet.' },
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    const portalSession = await this.getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.getWebBaseUrl()}/billing`,
    });

    return {
      mode: 'portal' as const,
      url: portalSession.url,
    };
  }

  async disconnectStripe(tenantId: string) {
    const subscription = await this.ensureSubscription(tenantId);

    if (
      subscription.stripeSubscriptionId &&
      !['CANCELED', 'INCOMPLETE_EXPIRED'].includes(this.normalizeStripeStatus(subscription.status))
    ) {
      try {
        await this.getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (error) {
        const stripeError = error as { code?: string; raw?: { code?: string } };
        const code = stripeError.code ?? stripeError.raw?.code;
        if (code !== 'resource_missing') {
          throw new ServiceUnavailableException('Unable to disconnect Stripe subscription.');
        }
      }
    }

    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        paidSeats: 0,
        status: 'PAYMENT_REQUIRED',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
        stripePriceLookupKey: null,
        stripeCurrency: null,
        stripeCurrentPeriodStart: null,
        stripeCurrentPeriodEnd: null,
        stripeCancelAtPeriodEnd: false,
      },
    });
    this.kommoService.recordBillingUpdated(tenantId, 'stripe_disconnected');

    return this.getSummary(tenantId);
  }

  async syncStripeSeatQuantity(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeSubscriptionItemId) {
      return null;
    }

    const [{ billableSeats }, pricing] = await Promise.all([
      this.countSeatUsage(tenantId),
      this.resolvePricing(tenantId),
    ]);
    const quantity = Math.max(1, billableSeats);
    const price = await this.getStripePriceByLookupKey(pricing.stripeLookupKey);

    const item = await this.getStripe().subscriptionItems.update(
      subscription.stripeSubscriptionItemId,
      {
        price: price.id,
        quantity,
        proration_behavior: 'none',
        metadata: {
          tenantId,
          regionCode: pricing.regionCode,
          priceLookupKey: pricing.stripeLookupKey,
        },
      },
    );
    const stripeSubscriptionId = typeof item.subscription === 'string' ? item.subscription : null;

    if (stripeSubscriptionId) {
      const stripeSubscription = await this.getStripe().subscriptions.retrieve(
        stripeSubscriptionId,
        { expand: ['items.data.price'] },
      );
      await this.applyStripeSubscription(stripeSubscription, tenantId);
    } else {
      await this.prisma.billingSubscription.update({
        where: { tenantId },
        data: {
          paidSeats: quantity,
          stripePriceId: price.id,
          stripePriceLookupKey: pricing.stripeLookupKey,
          stripeCurrency: price.currency.toUpperCase(),
        },
      });
    }
    this.kommoService.recordBillingUpdated(tenantId, 'stripe_seats_synced');

    return { quantity };
  }

  async handleStripeWebhook(payload: Buffer | string, signature: string | undefined) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();

    if (!webhookSecret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    if (!signature) {
      throw new HttpException({ message: 'Missing Stripe signature.' }, HttpStatus.BAD_REQUEST);
    }

    let event: Stripe.Event;
    try {
      event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new HttpException({ message: 'Invalid Stripe signature.' }, HttpStatus.BAD_REQUEST);
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.applyStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.applyStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.finalization_failed':
        await this.handleInvoiceFinalizationFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async ensureSubscription(tenantId: string) {
    const existing = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.billingSubscription.create({
      data: {
        tenantId,
        paidSeats: 0,
      },
    });
  }

  private async ensureFirstPaidAt(
    subscription: {
      id: string;
      paidSeats: number;
      firstPaidAt: Date | null;
      updatedAt: Date;
    },
    missingSeats: number,
  ) {
    if (subscription.firstPaidAt || subscription.paidSeats <= 0 || missingSeats > 0) {
      return subscription.firstPaidAt;
    }

    const updated = await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { firstPaidAt: subscription.updatedAt },
      select: { firstPaidAt: true },
    });

    return updated.firstPaidAt;
  }

  private async listPaymentHistory(
    tenantId: string,
    fallbackCurrency: BillingCurrency,
  ): Promise<BillingPaymentHistoryItem[]> {
    const payments = await this.prisma.billingPayment.findMany({
      where: { tenantId },
      orderBy: { paidAt: 'desc' },
      take: 24,
    });

    return payments.map((payment) => ({
      id: payment.id,
      source: payment.source,
      status: payment.status,
      reason: payment.reason,
      amountMinor: payment.amountMinor,
      currency: payment.currency ?? fallbackCurrency,
      planMonths: payment.planMonths,
      accessMonths: payment.accessMonths,
      targetSeats: payment.targetSeats,
      periodStart: payment.periodStart?.toISOString() ?? null,
      periodEnd: payment.periodEnd?.toISOString() ?? null,
      paidAt: payment.paidAt.toISOString(),
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripeInvoiceId: payment.stripeInvoiceId,
    }));
  }

  private isTrialActive(subscription: {
    trialEndsAt: Date | null;
    firstPaidAt: Date | null;
  }) {
    return Boolean(
      !subscription.firstPaidAt &&
        subscription.trialEndsAt &&
        subscription.trialEndsAt.getTime() > Date.now(),
    );
  }

  private getStripe() {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!secretKey) {
      throw new ServiceUnavailableException('STRIPE_SECRET_KEY is not configured.');
    }

    this.stripeClient = new StripeClient(secretKey);
    return this.stripeClient;
  }

  private getWebBaseUrl() {
    return (
      this.configService.get<string>('WEB_ADMIN_BASE_URL') ??
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('APP_BASE_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private async ensureStripeCustomer(tenantId: string, userId: string) {
    const subscription = await this.ensureSubscription(tenantId);

    if (subscription.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    const [tenant, user] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { email: true },
      }),
    ]);
    const customer = await this.getStripe().customers.create({
      name: tenant.name,
      email: user?.email ?? undefined,
      metadata: { tenantId },
    });

    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private async getStripePriceByLookupKey(lookupKey: string) {
    const prices = await this.getStripe().prices.list({
      active: true,
      lookup_keys: [lookupKey],
      limit: 1,
    });
    const price = prices.data[0];

    if (!price) {
      throw new ServiceUnavailableException(
        `Stripe price with lookup_key "${lookupKey}" was not found.`,
      );
    }

    return price;
  }

  private readStripeTimestamp(value: unknown) {
    return typeof value === 'number' ? new Date(value * 1000) : null;
  }

  private normalizeStripeStatus(status: string | null | undefined) {
    return (status || 'UNKNOWN').toUpperCase();
  }

  private isStripeBlockingStatus(status: string | null | undefined) {
    return [
      'CANCELED',
      'INCOMPLETE',
      'INCOMPLETE_EXPIRED',
      'PAST_DUE',
      'PAYMENT_FAILED',
      'INVOICE_FINALIZATION_FAILED',
      'UNPAID',
    ].includes(this.normalizeStripeStatus(status));
  }

  private getActivePaidPeriod(
    subscription: {
      firstPaidAt: Date | null;
      paidSeats: number;
      stripeCurrentPeriodStart: Date | null;
      stripeCurrentPeriodEnd: Date | null;
      updatedAt: Date;
    },
    referenceDate = new Date(),
  ) {
    if (subscription.paidSeats <= 0) {
      return null;
    }

    if (
      subscription.stripeCurrentPeriodStart &&
      subscription.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd > referenceDate
    ) {
      return {
        start: subscription.stripeCurrentPeriodStart,
        end: subscription.stripeCurrentPeriodEnd,
      };
    }

    if (subscription.stripeCurrentPeriodEnd) {
      return null;
    }

    const candidateFirstPaidAt =
      subscription.firstPaidAt ?? (subscription.paidSeats > 0 ? subscription.updatedAt : null);
    const legacyPeriod = this.getBillingPeriod(candidateFirstPaidAt, referenceDate);

    return legacyPeriod?.end && legacyPeriod.end > referenceDate ? legacyPeriod : null;
  }

  private resolveSeatPlan(planMonths: unknown) {
    const normalizedPlanMonths = Number(planMonths);
    return (
      BILLING_SEAT_PLANS.find((plan) => plan.paidMonths === normalizedPlanMonths) ??
      BILLING_SEAT_PLANS[0]
    );
  }

  private normalizeSeatCount(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return Math.max(1, Math.floor(numeric));
  }

  private calculateSeatPurchase(args: {
    currentPaidSeats: number;
    currentPeriodEnd: string | null;
    plan: (typeof BILLING_SEAT_PLANS)[number];
    targetSeats: number;
    unitAmount: number;
  }) {
    const now = new Date();
    const currentPeriodEnd = args.currentPeriodEnd ? new Date(args.currentPeriodEnd) : null;
    const currentPaidThrough =
      currentPeriodEnd && !Number.isNaN(currentPeriodEnd.getTime()) && currentPeriodEnd > now
        ? currentPeriodEnd
        : null;
    const remainingDays = currentPaidThrough
      ? Math.max(0, (currentPaidThrough.getTime() - now.getTime()) / DAY_MS)
      : 0;
    const additionalSeats = currentPaidThrough
      ? Math.max(0, args.targetSeats - args.currentPaidSeats)
      : 0;
    const proratedAmount =
      additionalSeats > 0
        ? Math.ceil(additionalSeats * args.unitAmount * (remainingDays / 30))
        : 0;
    const renewalAmount = args.targetSeats * args.unitAmount * args.plan.paidMonths;
    const extensionStart = currentPaidThrough ?? now;
    const paidThrough = this.addUtcMonths(extensionStart, args.plan.accessMonths);

    return {
      additionalSeats,
      amountDue: Math.max(1, proratedAmount + renewalAmount),
      paidThrough,
      periodStart: now,
      proratedAmount,
      renewalAmount,
    };
  }

  private readMetadataDate(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private readMetadataInteger(value: string | null | undefined) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.floor(numberValue) : null;
  }

  private readStripeObjectId(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id?: unknown }).id;
      return typeof id === 'string' ? id : null;
    }

    return null;
  }

  private normalizeCurrency(value: string | null | undefined) {
    return value?.trim().toUpperCase() || null;
  }

  private async recordBillingPayment(args: {
    tenantId: string;
    source: string;
    status: BillingPaymentStatus;
    reason: string;
    billingMode?: string | null;
    amountMinor?: number | null;
    currency?: string | null;
    planMonths?: number | null;
    accessMonths?: number | null;
    targetSeats?: number | null;
    paidSeatsBefore?: number | null;
    paidSeatsAfter?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    paidAt?: Date | null;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeInvoiceId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
  }): Promise<BillingPaymentRecordResult> {
    const data = {
      tenantId: args.tenantId,
      source: args.source,
      status: args.status,
      reason: args.reason,
      billingMode: args.billingMode ?? null,
      amountMinor: args.amountMinor ?? null,
      currency: this.normalizeCurrency(args.currency),
      planMonths: args.planMonths ?? null,
      accessMonths: args.accessMonths ?? null,
      targetSeats: args.targetSeats ?? null,
      paidSeatsBefore: args.paidSeatsBefore ?? null,
      paidSeatsAfter: args.paidSeatsAfter ?? null,
      periodStart: args.periodStart ?? null,
      periodEnd: args.periodEnd ?? null,
      paidAt: args.paidAt ?? new Date(),
      stripeCheckoutSessionId: args.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: args.stripePaymentIntentId ?? null,
      stripeInvoiceId: args.stripeInvoiceId ?? null,
      stripeSubscriptionId: args.stripeSubscriptionId ?? null,
      stripeCustomerId: args.stripeCustomerId ?? null,
    };

    if (args.stripeCheckoutSessionId) {
      const existing = await this.prisma.billingPayment.findUnique({
        where: { stripeCheckoutSessionId: args.stripeCheckoutSessionId },
        select: { id: true, status: true, reason: true },
      });

      await this.prisma.billingPayment.upsert({
        where: { stripeCheckoutSessionId: args.stripeCheckoutSessionId },
        update: data,
        create: data,
      });
      return {
        isNew: !existing,
        status: args.status,
        reason: args.reason,
        previousStatus: existing?.status ?? null,
        previousReason: existing?.reason ?? null,
      };
    }

    if (args.stripeInvoiceId) {
      const existing = await this.prisma.billingPayment.findUnique({
        where: { stripeInvoiceId: args.stripeInvoiceId },
        select: { id: true, status: true, reason: true },
      });

      await this.prisma.billingPayment.upsert({
        where: { stripeInvoiceId: args.stripeInvoiceId },
        update: data,
        create: data,
      });
      return {
        isNew: !existing,
        status: args.status,
        reason: args.reason,
        previousStatus: existing?.status ?? null,
        previousReason: existing?.reason ?? null,
      };
    }

    await this.prisma.billingPayment.create({ data });
    return {
      isNew: true,
      status: args.status,
      reason: args.reason,
    };
  }

  private shouldNotifyBillingPaymentEvent(result: BillingPaymentRecordResult) {
    return (
      result.isNew ||
      result.previousStatus !== result.status ||
      result.previousReason !== result.reason
    );
  }

  private async recordInvoicePayment(
    tenantId: string,
    invoice: Stripe.Invoice,
    status: BillingPaymentStatus,
    reason: string,
  ): Promise<BillingPaymentRecordResult> {
    const invoiceValue = invoice as Stripe.Invoice & {
      amount_due?: number | null;
      amount_paid?: number | null;
      amount_remaining?: number | null;
      created?: number | null;
      lines?: {
        data?: Array<{
          period?: {
            start?: number | null;
            end?: number | null;
          } | null;
        }>;
      };
    };
    const firstLinePeriod = invoiceValue.lines?.data?.[0]?.period;
    const paidAt =
      status === 'PAID' && invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : invoiceValue.created
          ? new Date(invoiceValue.created * 1000)
          : new Date();
    const amountMinor =
      status === 'PAID'
        ? invoiceValue.amount_paid ?? null
        : invoiceValue.amount_due ?? invoiceValue.amount_remaining ?? null;

    return this.recordBillingPayment({
      tenantId,
      source: 'stripe_invoice',
      status,
      reason,
      amountMinor,
      currency: invoice.currency,
      periodStart: firstLinePeriod?.start ? new Date(firstLinePeriod.start * 1000) : null,
      periodEnd: firstLinePeriod?.end ? new Date(firstLinePeriod.end * 1000) : null,
      paidAt,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: this.getSubscriptionIdFromInvoice(invoice),
      stripeCustomerId: this.getCustomerIdFromInvoice(invoice),
    });
  }

  private async applySeatPurchaseCheckout(session: Stripe.Checkout.Session) {
    if (
      session.payment_status &&
      !['paid', 'no_payment_required'].includes(session.payment_status)
    ) {
      return;
    }

    const metadata = session.metadata ?? {};
    const tenantId = session.client_reference_id ?? metadata.tenantId;
    const targetSeats = this.normalizeSeatCount(metadata.targetSeats);
    const periodStart = this.readMetadataDate(metadata.periodStart) ?? new Date();
    const paidThrough = this.readMetadataDate(metadata.paidThrough);
    const planMonths = this.readMetadataInteger(metadata.planMonths);
    const accessMonths = this.readMetadataInteger(metadata.accessMonths);
    const amountDue = this.readMetadataInteger(metadata.amountDue);
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    if (!tenantId || !targetSeats || !paidThrough) {
      this.logger.warn(`Unable to apply Stripe seat purchase checkout ${session.id}.`);
      return;
    }

    const current = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { firstPaidAt: true, paidSeats: true },
    });
    const paidAt = session.created ? new Date(session.created * 1000) : new Date();
    const amountMinor =
      typeof session.amount_total === 'number'
        ? session.amount_total
        : amountDue !== null
          ? amountDue * 100
          : null;

    await this.prisma.billingSubscription.upsert({
      where: { tenantId },
      update: {
        paidSeats: targetSeats,
        status: 'ACTIVE',
        firstPaidAt: current?.firstPaidAt ?? paidAt,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
        stripePriceLookupKey: metadata.priceLookupKey ?? `seat_purchase_${metadata.planMonths ?? '1'}m`,
        stripeCurrency: session.currency?.toUpperCase() ?? metadata.currency ?? null,
        stripeCurrentPeriodStart: periodStart,
        stripeCurrentPeriodEnd: paidThrough,
        stripeCancelAtPeriodEnd: false,
      },
      create: {
        tenantId,
        paidSeats: targetSeats,
        status: 'ACTIVE',
        firstPaidAt: paidAt,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
        stripePriceLookupKey: metadata.priceLookupKey ?? `seat_purchase_${metadata.planMonths ?? '1'}m`,
        stripeCurrency: session.currency?.toUpperCase() ?? metadata.currency ?? null,
        stripeCurrentPeriodStart: periodStart,
        stripeCurrentPeriodEnd: paidThrough,
        stripeCancelAtPeriodEnd: false,
      },
    });
    const paymentRecord = await this.recordBillingPayment({
      tenantId,
      source: 'stripe_checkout',
      status: 'PAID',
      reason: 'seat_purchase_paid',
      billingMode: metadata.billingMode ?? 'seat_purchase',
      amountMinor,
      currency: session.currency ?? metadata.currency ?? null,
      planMonths,
      accessMonths,
      targetSeats,
      paidSeatsBefore: current?.paidSeats ?? 0,
      paidSeatsAfter: targetSeats,
      periodStart,
      periodEnd: paidThrough,
      paidAt,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: this.readStripeObjectId(session.payment_intent),
      stripeCustomerId: customerId,
    });
    if (this.shouldNotifyBillingPaymentEvent(paymentRecord)) {
      this.kommoService.recordBillingUpdated(tenantId, 'seat_purchase_paid');
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.metadata?.billingMode === 'seat_purchase') {
      await this.applySeatPurchaseCheckout(session);
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const stripeSubscription = await this.getStripe().subscriptions.retrieve(
      subscriptionId,
      { expand: ['items.data.price'] },
    );
    await this.applyStripeSubscription(
      stripeSubscription,
      session.client_reference_id ?? session.metadata?.tenantId ?? undefined,
    );

    const tenantId = session.client_reference_id ?? session.metadata?.tenantId ?? null;
    if (tenantId) {
      const amountTotal =
        typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
      await this.notifyAltegioAfterStripePayment({
        tenantId,
        paymentSum: amountTotal,
        currencyIso: session.currency?.toUpperCase() ?? null,
      });
    }
  }

  private getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
    const invoiceValue = invoice as unknown as {
      subscription?: string | { id?: string } | null;
      parent?: {
        subscription_details?: {
          subscription?: string | null;
        } | null;
      } | null;
    };
    const subscription = invoiceValue.subscription;

    if (typeof subscription === 'string') {
      return subscription;
    }

    return subscription?.id ?? invoiceValue.parent?.subscription_details?.subscription ?? null;
  }

  private getCustomerIdFromInvoice(invoice: Stripe.Invoice) {
    const customer = invoice.customer;

    if (typeof customer === 'string') {
      return customer;
    }

    return customer?.id ?? null;
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    const stripeSubscription = await this.getStripe().subscriptions.retrieve(
      subscriptionId,
      { expand: ['items.data.price'] },
    );
    const tenantId = await this.applyStripeSubscription(stripeSubscription);

    if (!tenantId) {
      return;
    }

    const current = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { firstPaidAt: true },
    });

    await this.prisma.billingSubscription.update({
      where: { tenantId },
      data: {
        status: 'ACTIVE',
        firstPaidAt:
          current?.firstPaidAt ??
          (invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date()),
      },
    });
    const paymentRecord = await this.recordInvoicePayment(tenantId, invoice, 'PAID', 'invoice_paid');
    if (this.shouldNotifyBillingPaymentEvent(paymentRecord)) {
      this.kommoService.recordBillingUpdated(tenantId, 'invoice_paid');
    }
    await this.notifyAltegioAfterStripePayment({
      tenantId,
      paymentSum: typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : null,
      currencyIso: invoice.currency?.toUpperCase() ?? null,
      paymentDate: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    const tenantId = await this.findTenantIdForStripeObject({ subscriptionId });

    if (!tenantId) {
      return;
    }

    await this.prisma.billingSubscription.update({
      where: { tenantId },
      data: { status: 'PAYMENT_FAILED' },
    });
    const paymentRecord = await this.recordInvoicePayment(tenantId, invoice, 'FAILED', 'invoice_payment_failed');
    if (this.shouldNotifyBillingPaymentEvent(paymentRecord)) {
      this.kommoService.recordBillingUpdated(tenantId, 'invoice_payment_failed');
    }
  }

  private async handleInvoiceFinalizationFailed(invoice: Stripe.Invoice) {
    const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
    const customerId = this.getCustomerIdFromInvoice(invoice);
    const tenantId = await this.findTenantIdForStripeObject({ subscriptionId, customerId });

    if (!tenantId) {
      this.logger.warn(`Unable to map failed Stripe invoice finalization ${invoice.id} to tenant.`);
      return;
    }

    await this.prisma.billingSubscription.update({
      where: { tenantId },
      data: { status: 'INVOICE_FINALIZATION_FAILED' },
    });
    const paymentRecord = await this.recordInvoicePayment(tenantId, invoice, 'FAILED', 'invoice_finalization_failed');
    if (this.shouldNotifyBillingPaymentEvent(paymentRecord)) {
      this.kommoService.recordBillingUpdated(tenantId, 'invoice_finalization_failed');
    }
  }

  private async applyStripeSubscription(
    stripeSubscription: Stripe.Subscription,
    fallbackTenantId?: string | null,
  ) {
    const subscriptionValue = stripeSubscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };
    const item = stripeSubscription.items.data[0];
    const itemValue = item as unknown as {
      current_period_start?: number;
      current_period_end?: number;
    };
    const price = item?.price;
    const customerId =
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id ?? null;
    const tenantId =
      stripeSubscription.metadata?.tenantId ??
      fallbackTenantId ??
      (await this.findTenantIdForStripeObject({
        subscriptionId: stripeSubscription.id,
        customerId,
      }));

    if (!tenantId) {
      this.logger.warn(`Unable to map Stripe subscription ${stripeSubscription.id} to tenant.`);
      return null;
    }

    const currentPeriodStart =
      this.readStripeTimestamp(subscriptionValue.current_period_start) ??
      this.readStripeTimestamp(itemValue.current_period_start);
    const currentPeriodEnd =
      this.readStripeTimestamp(subscriptionValue.current_period_end) ??
      this.readStripeTimestamp(itemValue.current_period_end);
    const normalizedStatus = this.normalizeStripeStatus(stripeSubscription.status);
    const cancelAtPeriodEnd = Boolean(subscriptionValue.cancel_at_period_end);

    await this.prisma.billingSubscription.upsert({
      where: { tenantId },
      update: {
        paidSeats: item?.quantity ?? 0,
        status: normalizedStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id ?? null,
        stripePriceId: price?.id ?? null,
        stripePriceLookupKey: price?.lookup_key ?? null,
        stripeCurrency: price?.currency?.toUpperCase() ?? null,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeCancelAtPeriodEnd: cancelAtPeriodEnd,
      },
      create: {
        tenantId,
        paidSeats: item?.quantity ?? 0,
        status: normalizedStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id ?? null,
        stripePriceId: price?.id ?? null,
        stripePriceLookupKey: price?.lookup_key ?? null,
        stripeCurrency: price?.currency?.toUpperCase() ?? null,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeCancelAtPeriodEnd: cancelAtPeriodEnd,
      },
    });
    this.kommoService.recordBillingUpdated(
      tenantId,
      normalizedStatus === 'CANCELED' || cancelAtPeriodEnd
        ? 'subscription_cancelled'
        : 'stripe_subscription_updated',
    );

    return tenantId;
  }

  private async findTenantIdForStripeObject(args: {
    subscriptionId?: string | null;
    customerId?: string | null;
  }) {
    if (!args.subscriptionId && !args.customerId) {
      return null;
    }

    const billingSubscription = await this.prisma.billingSubscription.findFirst({
      where: {
        OR: [
          ...(args.subscriptionId
            ? [{ stripeSubscriptionId: args.subscriptionId }]
            : []),
          ...(args.customerId ? [{ stripeCustomerId: args.customerId }] : []),
        ],
      },
      select: { tenantId: true },
    });

    return billingSubscription?.tenantId ?? null;
  }

  private async countSeatUsage(tenantId: string) {
    const [
      activeEmployeeCount,
      pendingInvitationCount,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId,
          status: {
            not: EmployeeStatus.TERMINATED,
          },
        },
      }),
      this.prisma.employeeInvitation.count({
        where: {
          tenantId,
          userId: null,
          status: {
            in: ACTIVE_INVITATION_STATUSES,
          },
        },
      }),
    ]);

    return {
      activeEmployeeCount,
      pendingInvitationCount,
      usedSeats: activeEmployeeCount + pendingInvitationCount,
      billableSeats: activeEmployeeCount + pendingInvitationCount,
    };
  }

  private getBillingPeriod(firstPaidAt: Date | null, referenceDate = new Date()) {
    if (!firstPaidAt) {
      return null;
    }

    let monthOffset =
      (referenceDate.getUTCFullYear() - firstPaidAt.getUTCFullYear()) * 12 +
      (referenceDate.getUTCMonth() - firstPaidAt.getUTCMonth());
    let start = this.addUtcMonths(firstPaidAt, monthOffset);

    if (start > referenceDate) {
      monthOffset -= 1;
      start = this.addUtcMonths(firstPaidAt, monthOffset);
    }

    let end = this.addUtcMonths(firstPaidAt, monthOffset + 1);

    if (referenceDate >= end) {
      monthOffset += 1;
      start = end;
      end = this.addUtcMonths(firstPaidAt, monthOffset + 1);
    }

    return { start, end };
  }

  private addUtcMonths(anchor: Date, monthOffset: number) {
    const targetMonth = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + monthOffset,
        1,
        anchor.getUTCHours(),
        anchor.getUTCMinutes(),
        anchor.getUTCSeconds(),
        anchor.getUTCMilliseconds(),
      ),
    );
    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(
        targetMonth.getUTCFullYear(),
        targetMonth.getUTCMonth(),
        Math.min(anchor.getUTCDate(), lastDayOfTargetMonth),
        anchor.getUTCHours(),
        anchor.getUTCMinutes(),
        anchor.getUTCSeconds(),
        anchor.getUTCMilliseconds(),
      ),
    );
  }

  private async notifyAltegioAfterStripePayment(args: {
    tenantId: string;
    paymentSum?: number | null;
    currencyIso?: string | null;
    paymentDate?: Date | null;
  }) {
    const summary = await this.buildSummary(args.tenantId);
    const paymentSum =
      args.paymentSum != null && args.paymentSum > 0 ? args.paymentSum : summary.monthlyTotal;
    await this.altegioMarketplaceBilling.notifyPaymentAfterStripe({
      tenantId: args.tenantId,
      paymentSum: summary.trialActive ? 0 : paymentSum,
      currencyIso: args.currencyIso || summary.price.currency,
      paymentDate: args.paymentDate,
    });
  }

  private async resolvePricing(tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        address: true,
        country: true,
        latitude: true,
        longitude: true,
        timezone: true,
      },
    });

    const locationConfigured = Boolean(
      location &&
        location.address !== 'Not set yet' &&
        !(location.latitude === 0 && location.longitude === 0),
    );
    const country = locationConfigured
      ? location?.country?.trim() || this.inferCountryFromAddress(location?.address)
      : null;
    const haystack = `${country ?? ''} ${location?.address ?? ''}`.toLowerCase();
    const matchedRule =
      (locationConfigured
        ? PRICE_RULES.find((rule) =>
            rule.matchers.some((matcher) => haystack.includes(matcher.toLowerCase())),
          ) ??
          PRICE_RULES.find((rule) =>
            Boolean(location?.timezone && rule.timeZones?.includes(location.timezone)),
          )
        : null) ??
      FALLBACK_PRICE_RULE;

    return {
      regionCode: matchedRule.code,
      regionLabel: matchedRule.label,
      country,
      currency: matchedRule.currency,
      unitAmount: matchedRule.unitAmount,
      approxUsd: matchedRule.approxUsd ?? null,
      stripeLookupKey: matchedRule.stripeLookupKey,
      locationConfigured,
    };
  }

  private inferCountryFromAddress(address?: string | null) {
    if (!address) {
      return null;
    }

    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return parts[parts.length - 1] ?? null;
  }
}

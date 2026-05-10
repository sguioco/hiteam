import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationStatus, EmployeeStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

type BillingCurrency = 'AED' | 'USD' | 'EUR';

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

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(tenantId: string) {
    const subscription = await this.ensureSubscription(tenantId);
    const candidateFirstPaidAt =
      subscription.firstPaidAt ?? (subscription.paidSeats > 0 ? subscription.updatedAt : null);
    const billingPeriod = this.getBillingPeriod(candidateFirstPaidAt);
    const usagePeriod = billingPeriod ?? this.getCalendarMonthPeriod();
    const [{ activeEmployeeCount, pendingInvitationCount, usedSeats, billableSeats }, pricing] =
      await Promise.all([this.countSeatUsage(tenantId, usagePeriod), this.resolvePricing(tenantId)]);

    const paidSeats = subscription.paidSeats;
    const requiredSeats = Math.max(paidSeats, billableSeats);
    const missingSeats = Math.max(0, requiredSeats - paidSeats);
    const firstPaidAt = await this.ensureFirstPaidAt(subscription, missingSeats);
    const activeBillingPeriod = this.getBillingPeriod(firstPaidAt);
    const serviceActive =
      Boolean(firstPaidAt) &&
      missingSeats === 0 &&
      !this.isStripeBlockingStatus(subscription.status);
    const status = serviceActive ? subscription.status : 'PAYMENT_REQUIRED';

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
      currentPeriodStart: activeBillingPeriod?.start.toISOString() ?? null,
      currentPeriodEnd: activeBillingPeriod?.end.toISOString() ?? null,
      serviceActive,
      stripeConnected: Boolean(subscription.stripeCustomerId),
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeSubscriptionStatus: subscription.status,
      stripeCancelAtPeriodEnd: subscription.stripeCancelAtPeriodEnd,
      stripeCurrentPeriodStart: subscription.stripeCurrentPeriodStart?.toISOString() ?? null,
      stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd?.toISOString() ?? null,
      price: pricing,
    };
  }

  async assertCanAddSeatOccupant(tenantId: string) {
    const summary = await this.getSummary(tenantId);
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

  async createCheckoutSession(tenantId: string, userId: string) {
    const subscription = await this.ensureSubscription(tenantId);
    const summary = await this.getSummary(tenantId);
    const customerId = await this.ensureStripeCustomer(tenantId, userId);

    if (subscription.stripeSubscriptionId && subscription.stripeSubscriptionItemId) {
      await this.syncStripeSeatQuantity(tenantId);
      return this.createPortalSession(tenantId);
    }

    const stripe = this.getStripe();
    const price = await this.getStripePriceByLookupKey(summary.price.stripeLookupKey);
    const quantity = Math.max(1, summary.requiredSeats);
    const urlBase = this.getWebBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity,
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
        tenantId,
        regionCode: summary.price.regionCode,
        priceLookupKey: summary.price.stripeLookupKey,
      },
      subscription_data: {
        metadata: {
          tenantId,
          regionCode: summary.price.regionCode,
          priceLookupKey: summary.price.stripeLookupKey,
        },
      },
      success_url: `${urlBase}/billing?stripe=success`,
      cancel_url: `${urlBase}/billing?stripe=cancelled`,
    });

    await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        stripeCustomerId: customerId,
        stripePriceId: price.id,
        stripePriceLookupKey: summary.price.stripeLookupKey,
        stripeCurrency: price.currency.toUpperCase(),
      },
    });

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

  async syncStripeSeatQuantity(tenantId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeSubscriptionItemId) {
      return null;
    }

    const candidateFirstPaidAt =
      subscription.firstPaidAt ?? (subscription.paidSeats > 0 ? subscription.updatedAt : null);
    const billingPeriod = this.getBillingPeriod(candidateFirstPaidAt);
    const usagePeriod = billingPeriod ?? this.getCalendarMonthPeriod();
    const [{ billableSeats }, pricing] = await Promise.all([
      this.countSeatUsage(tenantId, usagePeriod),
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
    const stripeSubscriptionId =
      typeof item.subscription === 'string' ? item.subscription : item.subscription?.id;

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

  private getStripe() {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!secretKey) {
      throw new ServiceUnavailableException('STRIPE_SECRET_KEY is not configured.');
    }

    this.stripeClient = new Stripe(secretKey);
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

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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

    await this.prisma.billingSubscription.upsert({
      where: { tenantId },
      update: {
        paidSeats: item?.quantity ?? 0,
        status: this.normalizeStripeStatus(stripeSubscription.status),
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id ?? null,
        stripePriceId: price?.id ?? null,
        stripePriceLookupKey: price?.lookup_key ?? null,
        stripeCurrency: price?.currency?.toUpperCase() ?? null,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeCancelAtPeriodEnd: Boolean(subscriptionValue.cancel_at_period_end),
      },
      create: {
        tenantId,
        paidSeats: item?.quantity ?? 0,
        status: this.normalizeStripeStatus(stripeSubscription.status),
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id ?? null,
        stripePriceId: price?.id ?? null,
        stripePriceLookupKey: price?.lookup_key ?? null,
        stripeCurrency: price?.currency?.toUpperCase() ?? null,
        stripeCurrentPeriodStart: currentPeriodStart,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeCancelAtPeriodEnd: Boolean(subscriptionValue.cancel_at_period_end),
      },
    });

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

  private async countSeatUsage(
    tenantId: string,
    period: { start: Date; end: Date },
  ) {
    const [
      activeEmployeeCount,
      recentlyTerminatedEmployeeCount,
      pendingInvitationCount,
      recentStandaloneInvitationCount,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId,
          status: {
            not: EmployeeStatus.TERMINATED,
          },
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          status: EmployeeStatus.TERMINATED,
          updatedAt: {
            gte: period.start,
            lt: period.end,
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
      this.prisma.employeeInvitation.count({
        where: {
          tenantId,
          userId: null,
          employeeId: null,
          invitedAt: {
            gte: period.start,
            lt: period.end,
          },
        },
      }),
    ]);
    const billableInvitationCount = Math.max(
      pendingInvitationCount,
      recentStandaloneInvitationCount,
    );

    return {
      activeEmployeeCount,
      pendingInvitationCount,
      usedSeats: activeEmployeeCount + pendingInvitationCount,
      billableSeats:
        activeEmployeeCount + recentlyTerminatedEmployeeCount + billableInvitationCount,
    };
  }

  private getCalendarMonthPeriod(referenceDate = new Date()) {
    const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1));

    return { start, end };
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

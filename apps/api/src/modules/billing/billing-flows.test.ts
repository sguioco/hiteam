import assert from 'node:assert/strict';
import { BillingService } from './billing.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

type FakeBillingSubscription = {
  id: string;
  tenantId: string;
  paidSeats: number;
  status: string;
  firstPaidAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionItemId: string | null;
  stripePriceId: string | null;
  stripePriceLookupKey: string | null;
  stripeCurrency: string | null;
  stripeCurrentPeriodStart: Date | null;
  stripeCurrentPeriodEnd: Date | null;
  stripeCancelAtPeriodEnd: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialSource: string | null;
  promoCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FakeBillingPayment = {
  id: string;
  tenantId: string;
  source: string;
  status: string;
  reason: string;
  billingMode: string | null;
  amountMinor: number | null;
  currency: string | null;
  planMonths: number | null;
  accessMonths: number | null;
  targetSeats: number | null;
  paidSeatsBefore: number | null;
  paidSeatsAfter: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
};

function pickSelect<T extends Record<string, unknown>>(
  value: T | null,
  select?: Record<string, boolean>,
) {
  if (!value || !select) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, value[key]]),
  );
}

function buildService() {
  const tenantId = 'tenant-1';
  const now = new Date('2026-06-21T10:00:00.000Z');
  const state: {
    subscription: FakeBillingSubscription;
    payments: FakeBillingPayment[];
    kommoCalls: Array<{ tenantId: string; reason: string }>;
  } = {
    subscription: {
      id: 'billing-subscription-1',
      tenantId,
      paidSeats: 1,
      status: 'PAYMENT_REQUIRED',
      firstPaidAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionItemId: null,
      stripePriceId: null,
      stripePriceLookupKey: null,
      stripeCurrency: null,
      stripeCurrentPeriodStart: null,
      stripeCurrentPeriodEnd: null,
      stripeCancelAtPeriodEnd: false,
      trialStartedAt: null,
      trialEndsAt: null,
      trialSource: null,
      promoCode: null,
      createdAt: now,
      updatedAt: now,
    },
    payments: [],
    kommoCalls: [],
  };

  const prisma = {
    billingSubscription: {
      findUnique: async (args: {
        where: { tenantId?: string };
        select?: Record<string, boolean>;
      }) => {
        if (args.where.tenantId !== tenantId) {
          return null;
        }

        return pickSelect(state.subscription as unknown as Record<string, unknown>, args.select);
      },
      upsert: async (args: {
        update: Partial<FakeBillingSubscription>;
        create: Partial<FakeBillingSubscription>;
      }) => {
        state.subscription = {
          ...state.subscription,
          ...args.update,
          updatedAt: now,
        };
        return state.subscription;
      },
      update: async (args: { data: Partial<FakeBillingSubscription> }) => {
        state.subscription = {
          ...state.subscription,
          ...args.data,
          updatedAt: now,
        };
        return state.subscription;
      },
    },
    billingPayment: {
      findUnique: async (args: {
        where: { stripeCheckoutSessionId?: string; stripeInvoiceId?: string };
        select?: Record<string, boolean>;
      }) => {
        const existing = state.payments.find((payment) =>
          args.where.stripeCheckoutSessionId
            ? payment.stripeCheckoutSessionId === args.where.stripeCheckoutSessionId
            : payment.stripeInvoiceId === args.where.stripeInvoiceId,
        );

        return pickSelect(existing as unknown as Record<string, unknown> | null, args.select);
      },
      upsert: async (args: {
        where: { stripeCheckoutSessionId?: string; stripeInvoiceId?: string };
        update: Omit<FakeBillingPayment, 'id'>;
        create: Omit<FakeBillingPayment, 'id'>;
      }) => {
        const existing = state.payments.find((payment) =>
          args.where.stripeCheckoutSessionId
            ? payment.stripeCheckoutSessionId === args.where.stripeCheckoutSessionId
            : payment.stripeInvoiceId === args.where.stripeInvoiceId,
        );

        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }

        const created = {
          id: `payment-${state.payments.length + 1}`,
          ...args.create,
        };
        state.payments.push(created);
        return created;
      },
      create: async (args: { data: Omit<FakeBillingPayment, 'id'> }) => {
        const created = {
          id: `payment-${state.payments.length + 1}`,
          ...args.data,
        };
        state.payments.push(created);
        return created;
      },
      findMany: async () => [...state.payments].sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime()),
    },
    employee: {
      count: async () => 2,
    },
    employeeInvitation: {
      count: async () => 0,
    },
    location: {
      findFirst: async () => ({
        address: 'Dubai, United Arab Emirates',
        country: 'United Arab Emirates',
        latitude: 25.2048,
        longitude: 55.2708,
        timezone: 'Asia/Dubai',
      }),
    },
  };
  const kommoService = {
    recordBillingUpdated: (callTenantId: string, reason: string) => {
      state.kommoCalls.push({ tenantId: callTenantId, reason });
    },
  };
  const altegioMarketplaceBilling = {
    isMarketplaceBilled: () => false,
    configuredApplicationId: () => null,
    notifyPaymentAfterStripe: async () => null,
  };
  const service = new BillingService(
    prisma as never,
    new FakeConfigService({}) as never,
    kommoService as never,
    altegioMarketplaceBilling as never,
  );

  return { service, state, tenantId };
}

async function applySeatPurchase(service: BillingService) {
  const session = {
    id: 'cs_test_seat_purchase',
    payment_status: 'paid',
    client_reference_id: 'tenant-1',
    customer: 'cus_test',
    currency: 'aed',
    amount_total: 7700,
    payment_intent: 'pi_test',
    created: Math.floor(new Date('2026-06-21T12:00:00.000Z').getTime() / 1000),
    metadata: {
      billingMode: 'seat_purchase',
      tenantId: 'tenant-1',
      targetSeats: '3',
      planMonths: '6',
      accessMonths: '7',
      periodStart: '2026-06-21T12:00:00.000Z',
      paidThrough: '2027-01-21T12:00:00.000Z',
      amountDue: '77',
      currency: 'AED',
      priceLookupKey: 'hiteam_seat_middle_east_monthly',
    },
  };

  await (service as unknown as {
    applySeatPurchaseCheckout(checkoutSession: typeof session): Promise<void>;
  }).applySeatPurchaseCheckout(session);
}

async function testSeatPurchasePersistsHistoryAndKommoReason() {
  const { service, state } = buildService();

  await applySeatPurchase(service);
  await applySeatPurchase(service);

  assert.equal(state.subscription.status, 'ACTIVE');
  assert.equal(state.subscription.paidSeats, 3);
  assert.equal(state.subscription.stripeCurrentPeriodEnd?.toISOString(), '2027-01-21T12:00:00.000Z');
  assert.equal(state.payments.length, 1);
  assert.equal(state.payments[0].amountMinor, 7700);
  assert.equal(state.payments[0].currency, 'AED');
  assert.equal(state.payments[0].planMonths, 6);
  assert.equal(state.payments[0].accessMonths, 7);
  assert.equal(state.payments[0].targetSeats, 3);
  assert.deepEqual(state.kommoCalls, [{ tenantId: 'tenant-1', reason: 'seat_purchase_paid' }]);
}

async function testSummaryReturnsPaymentHistory() {
  const { service } = buildService();

  await applySeatPurchase(service);

  const summary = await service.getSummary('tenant-1');

  assert.equal(summary.serviceActive, true);
  assert.equal(summary.paidSeats, 3);
  assert.equal(summary.history.length, 1);
  assert.equal(summary.history[0].amountMinor, 7700);
  assert.equal(summary.history[0].planMonths, 6);
  assert.equal(summary.history[0].periodEnd, '2027-01-21T12:00:00.000Z');
}

async function main() {
  await testSeatPurchasePersistsHistoryAndKommoReason();
  await testSummaryReturnsPaymentHistory();
  console.log('billing flow tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

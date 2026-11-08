import assert from 'node:assert/strict';
import { BillingStatsController } from './billing-stats.controller';

async function main() {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000);
  let paymentRange: any;
  const prisma = {
    billingSubscription: { findMany: async () => [
      { status: 'ACTIVE', firstPaidAt: now, stripeCurrentPeriodEnd: future, trialEndsAt: null, tenant: { name: 'Paid', slug: 'paid' } },
      { status: 'TRIALING', firstPaidAt: null, stripeCurrentPeriodEnd: null, trialEndsAt: future, tenant: { name: 'Trial', slug: 'trial' } },
    ] },
    billingPayment: { findMany: async (query: any) => { paymentRange = query.where.paidAt; return [{ amountMinor: 15000, currency: 'EUR' }, { amountMinor: 2200, currency: 'AED' }]; } },
    tenant: { count: async () => 2 },
  };
  const controller = new BillingStatsController(prisma as any, { get: () => 'test-key' } as any);
  await assert.rejects(() => controller.summary('ü'), /invalid_admin_token/);
  const month = await controller.summary('test-key', undefined, 'mtd');
  assert.equal(paymentRange.gte.getUTCDate(), 1);
  assert.equal(paymentRange.gte.getUTCHours(), 0);
  assert.equal(month.period, 'mtd');
  assert.deepEqual(month.revenueByCurrency, { EUR: 15000, AED: 2200 });
  assert.equal(month.paidSubscriptions, 1);
  assert.equal(month.trialSubscriptions, 1);
  assert.equal(month.newConnectionsThisMonth, 2);
  await controller.summary('test-key', undefined, 'all');
  assert.equal(paymentRange.gte.getTime(), 0);
  await assert.rejects(() => controller.summary('test-key', undefined, 'invalid'), /invalid_period/);
  console.log('Billing stats tests passed');
}
void main();

import assert from 'node:assert/strict';
import {
  classifyMarketplaceLifecycleEvent,
  formatAltegioMarketplaceDatetime,
  parseAltegioMarketplaceDatetime,
  parseMarketplaceSubscriptionSnapshot,
  resolveMarketplaceStatusFromSnapshot,
  shouldPushLocalPeriodToAltegio,
} from '../src/modules/billing/altegio-marketplace.helpers';

function testParseSnapshotTrial() {
  const snapshot = parseMarketplaceSubscriptionSnapshot({
    success: true,
    data: {
      connection_status: { status: 'active' },
      payments: [
        {
          payment_sum: 0,
          is_refunded: false,
          period_from: '2026-06-23 00:00:00',
          period_to: '2026-06-29 23:59:59',
        },
      ],
    },
  });
  assert.equal(snapshot.connectionStatus, 'active');
  assert.equal(snapshot.isTrial, true);
  assert.equal(
    snapshot.periodEnd?.toISOString(),
    parseAltegioMarketplaceDatetime('2026-06-29 23:59:59')?.toISOString(),
  );
}

function testParseSnapshotPicksLatestPayment() {
  const snapshot = parseMarketplaceSubscriptionSnapshot({
    data: {
      connection_status: { status: 'active' },
      payments: [
        {
          payment_sum: 0,
          is_refunded: false,
          period_from: '2026-06-01 00:00:00',
          period_to: '2026-06-04 00:00:00',
        },
        {
          payment_sum: 99,
          is_refunded: false,
          period_from: '2026-06-04 00:00:00',
          period_to: '2026-07-04 00:00:00',
        },
      ],
    },
  });
  assert.equal(snapshot.isTrial, false);
  assert.equal(
    snapshot.periodEnd?.toISOString(),
    parseAltegioMarketplaceDatetime('2026-07-04 00:00:00')?.toISOString(),
  );
}

function testShouldPushLocalPeriod() {
  const localEnd = new Date('2099-12-31T00:00:00.000Z');
  const shortAltegio = new Date('2026-07-01T00:00:00.000Z');
  assert.equal(
    shouldPushLocalPeriodToAltegio({ localEnd, altegioEnd: shortAltegio }),
    true,
  );
  assert.equal(
    shouldPushLocalPeriodToAltegio({ localEnd, altegioEnd: localEnd }),
    false,
  );
  assert.equal(shouldPushLocalPeriodToAltegio({ localEnd, altegioEnd: null }), true);
}

function testResolveStatus() {
  const periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  assert.equal(
    resolveMarketplaceStatusFromSnapshot({
      snapshot: {
        connectionStatus: 'active',
        periodStart: new Date(),
        periodEnd,
        isTrial: true,
        paymentSum: 0,
      },
      localStatus: null,
      localPeriodEnd: null,
      hasStripeSubscription: false,
    }),
    'TRIALING',
  );
  assert.equal(
    resolveMarketplaceStatusFromSnapshot({
      snapshot: {
        connectionStatus: 'freezed',
        periodStart: null,
        periodEnd: null,
        isTrial: false,
        paymentSum: null,
      },
      localStatus: 'ACTIVE',
      localPeriodEnd: periodEnd,
      hasStripeSubscription: true,
    }),
    'CANCELED',
  );
}

function testClassifyLifecycleEvent() {
  assert.equal(classifyMarketplaceLifecycleEvent('uninstall'), 'uninstall');
  assert.equal(classifyMarketplaceLifecycleEvent('uninstalled'), 'uninstall');
  assert.equal(classifyMarketplaceLifecycleEvent('freeze'), 'freeze');
  assert.equal(classifyMarketplaceLifecycleEvent('freezed'), 'freeze');
  assert.equal(classifyMarketplaceLifecycleEvent('Active'), 'connect');
  assert.equal(classifyMarketplaceLifecycleEvent('pending'), 'unknown');
  assert.equal(classifyMarketplaceLifecycleEvent(undefined), 'unknown');
}

function testFormatDatetime() {
  const formatted = formatAltegioMarketplaceDatetime(new Date('2026-07-27T10:15:30.000Z'));
  assert.equal(formatted, '2026-07-27 10:15:30');
}

testParseSnapshotTrial();
testParseSnapshotPicksLatestPayment();
testShouldPushLocalPeriod();
testResolveStatus();
testClassifyLifecycleEvent();
testFormatDatetime();
console.log('altegio marketplace helpers: ok');

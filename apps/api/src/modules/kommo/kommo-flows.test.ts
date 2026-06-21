import { strict as assert } from 'node:assert';
import { KommoService } from './kommo.service';

function createKommoService(options: {
  config?: Record<string, string | null | undefined>;
  previousPaymentEvent?: { id: string } | null;
  latestPaidBillingPayment?: {
    id: string;
    stripeCheckoutSessionId?: string | null;
    stripeInvoiceId?: string | null;
    stripePaymentIntentId?: string | null;
  } | null;
  lifecycleEmailService?: {
    isEnabled: () => boolean;
    sendLifecycleEmail?: (params: { tenantId: string; event: string }) => Promise<unknown>;
  };
} = {}) {
  const prisma = {
    kommoAutomationLog: {
      findFirst: async (args?: { where?: { key?: { startsWith?: string } | string } }) => {
        const key = args?.where?.key;
        if (typeof key === 'object' && key?.startsWith === 'lifecycle:payment_successful:') {
          return options.previousPaymentEvent ?? null;
        }
        return null;
      },
      create: async () => ({ id: 'automation-log-1' }),
    },
    billingPayment: {
      findFirst: async () => options.latestPaidBillingPayment ?? null,
    },
  };
  const configService = {
    get: (key: string) => options.config?.[key] ?? null,
  };
  const lifecycleEmailService = options.lifecycleEmailService ?? {
    isEnabled: () => false,
  };

  return new KommoService(
    prisma as never,
    configService as never,
    lifecycleEmailService as never,
  );
}

async function testSeatPurchaseReasonRoutesToPaymentLifecycle() {
  const service = createKommoService();
  let resolved = false;
  const called = new Promise<void>((resolve) => {
    (service as unknown as {
      enqueuePaymentSuccessful: (tenantId: string) => Promise<void>;
    }).enqueuePaymentSuccessful = async (tenantId: string) => {
      assert.equal(tenantId, 'tenant-1');
      resolved = true;
      resolve();
    };
  });

  service.recordBillingUpdated('tenant-1', 'seat_purchase_paid');

  await called;
  assert.equal(resolved, true);
}

async function testPaymentSuccessSyncsAllContacts() {
  const service = createKommoService({
    latestPaidBillingPayment: {
      id: 'payment-1',
      stripeCheckoutSessionId: 'cs_paid_first',
      stripeInvoiceId: null,
      stripePaymentIntentId: 'pi_paid_first',
    },
  });
  let captured:
    | {
        tenantId: string;
        event: string;
        key?: string;
        stageName?: string;
        syncAllContacts?: boolean;
      }
    | null = null;

  (service as unknown as {
    syncLifecycleEvent: (
      tenantId: string,
      event: string,
      options: { key?: string; stageName?: string; syncAllContacts?: boolean },
    ) => Promise<void>;
  }).syncLifecycleEvent = async (tenantId, event, options) => {
    captured = {
      tenantId,
      event,
      key: options.key,
      stageName: options.stageName,
      syncAllContacts: options.syncAllContacts,
    };
  };

  await (service as unknown as {
    enqueuePaymentSuccessful: (tenantId: string) => Promise<void>;
  }).enqueuePaymentSuccessful('tenant-1');

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    event: 'payment_successful',
    key: 'lifecycle:payment_successful:cs_paid_first',
    stageName: 'New Customer',
    syncAllContacts: true,
  });
}

async function testRenewedPaymentUsesLatestPaymentKey() {
  const service = createKommoService({
    previousPaymentEvent: { id: 'automation-log-existing' },
    latestPaidBillingPayment: {
      id: 'payment-2',
      stripeCheckoutSessionId: 'cs_paid_second_same_day',
      stripeInvoiceId: null,
      stripePaymentIntentId: 'pi_paid_second_same_day',
    },
  });
  let captured:
    | {
        event: string;
        key?: string;
        stageName?: string;
        syncAllContacts?: boolean;
      }
    | null = null;

  (service as unknown as {
    syncLifecycleEvent: (
      tenantId: string,
      event: string,
      options: { key?: string; stageName?: string; syncAllContacts?: boolean },
    ) => Promise<void>;
  }).syncLifecycleEvent = async (_tenantId, event, options) => {
    captured = {
      event,
      key: options.key,
      stageName: options.stageName,
      syncAllContacts: options.syncAllContacts,
    };
  };

  await (service as unknown as {
    enqueuePaymentSuccessful: (tenantId: string) => Promise<void>;
  }).enqueuePaymentSuccessful('tenant-1');

  assert.deepEqual(captured, {
    event: 'payment_successful',
    key: 'lifecycle:payment_successful:cs_paid_second_same_day',
    stageName: 'Renewed',
    syncAllContacts: true,
  });
}

async function testSystemBackfillSyncsAllTenantContacts() {
  const service = createKommoService();
  const calls: Array<{
    tenantId: string;
    syncAllContacts?: boolean;
    reason?: string;
  }> = [];

  (service as unknown as {
    prisma: {
      tenant: {
        findMany: () => Promise<Array<{ id: string }>>;
      };
    };
  }).prisma.tenant = {
    findMany: async () => [{ id: 'tenant-1' }, { id: 'tenant-2' }, { id: 'tenant-3' }],
  };

  (service as unknown as {
    syncTenant: (
      tenantId: string,
      options: { reason?: string; syncAllContacts?: boolean },
    ) => Promise<{ skipped?: boolean; leadId?: number; syncedEmployeeContacts?: number }>;
  }).syncTenant = async (tenantId, options) => {
    calls.push({
      tenantId,
      reason: options.reason,
      syncAllContacts: options.syncAllContacts,
    });
    if (tenantId === 'tenant-2') {
      throw new Error('Kommo unavailable');
    }

    return {
      leadId: tenantId === 'tenant-1' ? 101 : 103,
      syncedEmployeeContacts: tenantId === 'tenant-1' ? 4 : 2,
    };
  };

  const result = await service.syncAllTenants({ limit: 10 });

  assert.deepEqual(calls, [
    { tenantId: 'tenant-1', reason: 'system_backfill', syncAllContacts: true },
    { tenantId: 'tenant-2', reason: 'system_backfill', syncAllContacts: true },
    { tenantId: 'tenant-3', reason: 'system_backfill', syncAllContacts: true },
  ]);
  assert.equal(result.total, 3);
  assert.equal(result.synced, 2);
  assert.equal(result.errors, 1);
  assert.equal(result.items[1].status, 'error');
}

async function testFailedLifecycleEmailDoesNotBlockKommoSync() {
  const failedEmailResult = {
    event: 'payment_successful',
    status: 'failed',
    provider: 'resend',
    sender: 'info@hiteam.net',
    replyTo: 'info@hiteam.net',
    recipients: ['owner@example.com'],
    recipientCount: 1,
    recordedAt: '2026-06-21T12:00:00.000Z',
    subject: 'Payment received',
    preview: 'Payment failed to send',
    errorMessage: 'Resend rejected request',
  };
  const service = createKommoService({
    config: {
      KOMMO_ENABLED: 'true',
    },
    lifecycleEmailService: {
      isEnabled: () => true,
      sendLifecycleEmail: async (params) => {
        assert.deepEqual(params, {
          tenantId: 'tenant-1',
          event: 'payment_successful',
        });
        return failedEmailResult;
      },
    },
  });
  let captured:
    | {
        tenantId: string;
        reason?: string;
        stageName?: string;
        lifecycleEmailResult?: unknown;
      }
    | null = null;

  (service as unknown as {
    syncTenant: (
      tenantId: string,
      options: {
        reason?: string;
        stageName?: string;
        lifecycleEmailResult?: unknown;
      },
    ) => Promise<{ leadId?: number }>;
  }).syncTenant = async (tenantId, options) => {
    captured = {
      tenantId,
      reason: options.reason,
      stageName: options.stageName,
      lifecycleEmailResult: options.lifecycleEmailResult,
    };
    return { leadId: 101 };
  };

  await (service as unknown as {
    syncLifecycleEvent: (
      tenantId: string,
      event: string,
      options: { stageName: string; note: string },
    ) => Promise<void>;
  }).syncLifecycleEvent('tenant-1', 'payment_successful', {
    stageName: 'New Customer',
    note: 'First payment received.',
  });

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    reason: 'payment_successful',
    stageName: 'New Customer',
    lifecycleEmailResult: failedEmailResult,
  });
}

async function testDisabledLifecycleEmailIsVisibleInKommoSync() {
  const disabledEmailResult = {
    event: 'payment_successful',
    status: 'disabled',
    provider: 'disabled',
    sender: 'info@hiteam.net',
    replyTo: 'info@hiteam.net',
    recipients: [],
    recipientCount: 0,
    recordedAt: '2026-06-21T12:00:00.000Z',
  };
  const service = createKommoService({
    config: {
      KOMMO_ENABLED: 'true',
    },
    lifecycleEmailService: {
      isEnabled: () => false,
      sendLifecycleEmail: async (params) => {
        assert.deepEqual(params, {
          tenantId: 'tenant-1',
          event: 'payment_successful',
        });
        return disabledEmailResult;
      },
    },
  });
  let captured:
    | {
        tenantId: string;
        reason?: string;
        lifecycleEmailResult?: unknown;
      }
    | null = null;

  (service as unknown as {
    syncTenant: (
      tenantId: string,
      options: {
        reason?: string;
        lifecycleEmailResult?: unknown;
      },
    ) => Promise<{ leadId?: number }>;
  }).syncTenant = async (tenantId, options) => {
    captured = {
      tenantId,
      reason: options.reason,
      lifecycleEmailResult: options.lifecycleEmailResult,
    };
    return { leadId: 101 };
  };

  await (service as unknown as {
    syncLifecycleEvent: (
      tenantId: string,
      event: string,
      options: { stageName: string; note: string },
    ) => Promise<void>;
  }).syncLifecycleEvent('tenant-1', 'payment_successful', {
    stageName: 'New Customer',
    note: 'First payment received.',
  });

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    reason: 'payment_successful',
    lifecycleEmailResult: disabledEmailResult,
  });
}

async function testLeadLinksMissingCompanyAndEmployeeContacts() {
  const service = createKommoService();
  const calls: Array<{
    method: string;
    path: string;
    body?: unknown;
  }> = [];

  (service as unknown as {
    request: (method: string, path: string, body?: unknown) => Promise<unknown>;
  }).request = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === 'GET' && path === '/api/v4/leads/555/links') {
      return {
        _embedded: {
          links: [
            {
              to_entity_id: 201,
              to_entity_type: 'contacts',
            },
          ],
        },
      };
    }

    return {};
  };

  await (service as unknown as {
    ensureLeadEntityLinks: (
      leadId: number,
      companyId: number,
      contactIds: number[],
    ) => Promise<void>;
  }).ensureLeadEntityLinks(555, 101, [201, 202, 202, 203]);

  assert.deepEqual(calls, [
    {
      method: 'GET',
      path: '/api/v4/leads/555/links',
      body: undefined,
    },
    {
      method: 'POST',
      path: '/api/v4/leads/555/link',
      body: [
        {
          to_entity_id: 101,
          to_entity_type: 'companies',
        },
        {
          to_entity_id: 202,
          to_entity_type: 'contacts',
        },
        {
          to_entity_id: 203,
          to_entity_type: 'contacts',
        },
      ],
    },
  ]);
}

async function main() {
  await testSeatPurchaseReasonRoutesToPaymentLifecycle();
  await testPaymentSuccessSyncsAllContacts();
  await testRenewedPaymentUsesLatestPaymentKey();
  await testSystemBackfillSyncsAllTenantContacts();
  await testFailedLifecycleEmailDoesNotBlockKommoSync();
  await testDisabledLifecycleEmailIsVisibleInKommoSync();
  await testLeadLinksMissingCompanyAndEmployeeContacts();
  console.log('kommo flow tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

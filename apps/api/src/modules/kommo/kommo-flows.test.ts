import { strict as assert } from 'node:assert';
import { KommoService } from './kommo.service';

function createKommoService() {
  const prisma = {
    kommoAutomationLog: {
      findFirst: async () => null,
    },
  };
  const configService = {
    get: () => null,
  };
  const lifecycleEmailService = {
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
  const service = createKommoService();
  let captured:
    | {
        tenantId: string;
        event: string;
        syncAllContacts?: boolean;
      }
    | null = null;

  (service as unknown as {
    syncLifecycleEvent: (
      tenantId: string,
      event: string,
      options: { syncAllContacts?: boolean },
    ) => Promise<void>;
  }).syncLifecycleEvent = async (tenantId, event, options) => {
    captured = {
      tenantId,
      event,
      syncAllContacts: options.syncAllContacts,
    };
  };

  await (service as unknown as {
    enqueuePaymentSuccessful: (tenantId: string) => Promise<void>;
  }).enqueuePaymentSuccessful('tenant-1');

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    event: 'payment_successful',
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

async function main() {
  await testSeatPurchaseReasonRoutesToPaymentLifecycle();
  await testPaymentSuccessSyncsAllContacts();
  await testSystemBackfillSyncsAllTenantContacts();
  console.log('kommo flow tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

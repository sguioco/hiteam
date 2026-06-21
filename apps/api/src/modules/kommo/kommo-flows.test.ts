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

async function main() {
  await testSeatPurchaseReasonRoutesToPaymentLifecycle();
  await testPaymentSuccessSyncsAllContacts();
  console.log('kommo flow tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

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

async function testOrganizationRegistrationIncludesManagerEmailDeliveryInKommoNote() {
  const service = createKommoService();
  const calls: Array<{
    tenantId: string;
    event: string;
    options: {
      note?: string;
      stageName?: string;
      syncAllContacts?: boolean;
    };
  }> = [];
  const called = new Promise<void>((resolve) => {
    (service as unknown as {
      syncLifecycleEvent: (
        tenantId: string,
        event: string,
        options: {
          note?: string;
          stageName?: string;
          syncAllContacts?: boolean;
        },
      ) => Promise<void>;
    }).syncLifecycleEvent = async (tenantId, event, options) => {
      calls.push({ tenantId, event, options });
      if (calls.length === 2) {
        resolve();
      }
    };
  });

  service.recordOrganizationRegistered('tenant-1', {
    status: 'failed',
    provider: 'none',
    recipients: ['manager@example.com'],
    recordedAt: '2026-06-21T12:00:00.000Z',
    actionUrl: 'https://hiteam.net/join/manager/token',
    errorMessage: 'Email provider is disabled.',
  });

  await called;

  assert.equal(calls.length, 2);
  assert.equal(calls[0].tenantId, 'tenant-1');
  assert.equal(calls[0].event, 'user_registered');
  assert.equal(calls[0].options.stageName, 'New Registration');
  assert.equal(calls[0].options.syncAllContacts, true);
  assert.match(calls[0].options.note ?? '', /Client registered in HiTeam\./);
  assert.match(calls[0].options.note ?? '', /\[HiTeam Employee Email\] FAILED/);
  assert.match(calls[0].options.note ?? '', /Action: manager_setup_email/);
  assert.match(calls[0].options.note ?? '', /Provider: none/);
  assert.match(calls[0].options.note ?? '', /Recipients: manager@example\.com/);
  assert.match(calls[0].options.note ?? '', /Action URL: https:\/\/hiteam\.net\/join\/manager\/token/);
  assert.match(calls[0].options.note ?? '', /Error: Email provider is disabled\./);
  assert.equal(calls[1].event, 'trial_started');
  assert.doesNotMatch(calls[1].options.note ?? '', /manager_setup_email/);
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

async function testRecurringTaskUpdateBuildsKommoNote() {
  const service = createKommoService({
    config: {
      KOMMO_ENABLED: 'true',
    },
  });
  const serviceInternals = service as unknown as {
    prisma: {
      taskTemplate: {
        findFirst: (args: unknown) => Promise<unknown>;
      };
      employee: {
        findFirst: (args: unknown) => Promise<unknown>;
      };
      taskCompletion: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    };
    enqueueSync: (
      tenantId: string,
      options: {
        reason: string;
        note?: string;
        employeeId?: string;
        syncAllContacts?: boolean;
      },
    ) => void;
  };

  serviceInternals.prisma.taskTemplate = {
    findFirst: async (args) => {
      assert.deepEqual(args, {
        where: {
          id: 'template-1',
          tenantId: 'tenant-1',
        },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueTimeLocal: true,
          requiresPhoto: true,
          group: { select: { name: true } },
          managerEmployee: {
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true,
              user: { select: { email: true } },
            },
          },
        },
      });
      return {
        id: 'template-1',
        title: 'Open the cafe',
        description: 'Morning setup checklist.',
        priority: 'HIGH',
        dueTimeLocal: '09:00',
        requiresPhoto: true,
        group: { name: 'Operations' },
        managerEmployee: {
          firstName: 'Mary',
          lastName: 'Manager',
          employeeNumber: 'M-001',
          user: { email: 'manager@example.com' },
        },
      };
    },
  };
  serviceInternals.prisma.employee = {
    findFirst: async () => ({
      firstName: 'Ivan',
      lastName: 'Worker',
      employeeNumber: 'E-001',
      user: { email: 'ivan@example.com' },
    }),
  };
  serviceInternals.prisma.taskCompletion = {
    findUnique: async () => ({
      status: 'DONE',
      completedAt: new Date('2026-06-21T12:30:00.000Z'),
    }),
  };

  const captures: Array<{
    tenantId: string;
    reason: string;
    note?: string;
    employeeId?: string;
    syncAllContacts?: boolean;
  }> = [];
  const called = new Promise<void>((resolve) => {
    serviceInternals.enqueueSync = (tenantId, options) => {
      captures.push({
        tenantId,
        ...options,
      });
      resolve();
    };
  });

  service.recordRecurringTaskUpdated('tenant-1', {
    taskTemplateId: 'template-1',
    assigneeEmployeeId: 'employee-1',
    occurrenceDate: new Date('2026-06-21T00:00:00.000Z'),
    reason: 'task_completion_status_done',
    status: 'DONE',
  });

  await called;

  const captured = captures[0];
  assert.ok(captured);
  assert.equal(captured.tenantId, 'tenant-1');
  assert.equal(captured.reason, 'task_completion_status_done');
  assert.equal(captured.employeeId, 'employee-1');
  assert.equal(captured.syncAllContacts, false);
  assert.match(captured.note ?? '', /HiTeam recurring task updated: task_completion_status_done\./);
  assert.match(captured.note ?? '', /Task: Open the cafe/);
  assert.match(captured.note ?? '', /Occurrence: 2026-06-21/);
  assert.match(captured.note ?? '', /Status: DONE/);
  assert.match(captured.note ?? '', /Assignee: Ivan Worker \(E-001, ivan@example\.com\)/);
  assert.match(captured.note ?? '', /Manager: Mary Manager \(M-001, manager@example\.com\)/);
}

async function testTaskTemplateCreateBuildsKommoNote() {
  const service = createKommoService({
    config: {
      KOMMO_ENABLED: 'true',
    },
  });
  const serviceInternals = service as unknown as {
    prisma: {
      taskTemplate: {
        findFirst: (args: unknown) => Promise<unknown>;
      };
    };
    enqueueSync: (
      tenantId: string,
      options: {
        reason: string;
        note?: string;
        employeeId?: string;
        syncAllContacts?: boolean;
      },
    ) => void;
  };

  serviceInternals.prisma.taskTemplate = {
    findFirst: async (args) => {
      assert.deepEqual(args, {
        where: { id: 'template-1', tenantId: 'tenant-1' },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          assigneeEmployeeId: true,
          managerEmployeeId: true,
          requiresPhoto: true,
          expandOnDemand: true,
          frequency: true,
          weekDaysJson: true,
          dayOfMonth: true,
          startDate: true,
          endDate: true,
          dueAfterDays: true,
          dueTimeLocal: true,
          isActive: true,
          group: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
          assigneeEmployee: {
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true,
              user: { select: { email: true } },
            },
          },
          managerEmployee: {
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true,
              user: { select: { email: true } },
            },
          },
        },
      });
      return {
        id: 'template-1',
        title: 'Open the cafe',
        description: 'Morning setup checklist.',
        priority: 'HIGH',
        assigneeEmployeeId: 'employee-1',
        managerEmployeeId: 'manager-1',
        requiresPhoto: true,
        expandOnDemand: false,
        frequency: 'WEEKLY',
        weekDaysJson: '["MONDAY","WEDNESDAY"]',
        dayOfMonth: null,
        startDate: new Date('2026-06-21T00:00:00.000Z'),
        endDate: new Date('2026-08-21T00:00:00.000Z'),
        dueAfterDays: 1,
        dueTimeLocal: '09:00',
        isActive: true,
        group: { name: 'Operations' },
        department: { name: 'Kitchen' },
        location: { name: 'Downtown' },
        assigneeEmployee: {
          firstName: 'Ivan',
          lastName: 'Worker',
          employeeNumber: 'E-001',
          user: { email: 'ivan@example.com' },
        },
        managerEmployee: {
          firstName: 'Mary',
          lastName: 'Manager',
          employeeNumber: 'M-001',
          user: { email: 'manager@example.com' },
        },
      };
    },
  };

  const captures: Array<{
    tenantId: string;
    reason: string;
    note?: string;
    employeeId?: string;
    syncAllContacts?: boolean;
  }> = [];
  const called = new Promise<void>((resolve) => {
    serviceInternals.enqueueSync = (tenantId, options) => {
      captures.push({
        tenantId,
        ...options,
      });
      resolve();
    };
  });

  service.recordTaskTemplateCreated('tenant-1', 'template-1');

  await called;

  const captured = captures[0];
  assert.ok(captured);
  assert.equal(captured.tenantId, 'tenant-1');
  assert.equal(captured.reason, 'task_template_created');
  assert.equal(captured.employeeId, 'employee-1');
  assert.equal(captured.syncAllContacts, false);
  assert.match(captured.note ?? '', /HiTeam recurring task template created: task_template_created\./);
  assert.match(captured.note ?? '', /Task: Open the cafe/);
  assert.match(captured.note ?? '', /Template ID: template-1/);
  assert.match(captured.note ?? '', /Frequency: WEEKLY/);
  assert.match(captured.note ?? '', /Week days: MONDAY, WEDNESDAY/);
  assert.match(captured.note ?? '', /Start: 2026-06-21/);
  assert.match(captured.note ?? '', /End: 2026-08-21/);
  assert.match(captured.note ?? '', /Assignee: Ivan Worker \(E-001, ivan@example\.com\)/);
  assert.match(captured.note ?? '', /Manager: Mary Manager \(M-001, manager@example\.com\)/);
  assert.match(captured.note ?? '', /Group: Operations/);
  assert.match(captured.note ?? '', /Department: Kitchen/);
  assert.match(captured.note ?? '', /Location: Downtown/);
}

async function testTaskTemplateDeleteBuildsKommoNote() {
  const service = createKommoService();
  let captured:
    | {
        tenantId: string;
        reason?: string;
        note?: string;
        employeeId?: string;
        syncAllContacts?: boolean;
      }
    | null = null;

  (service as unknown as {
    enqueueSync: (
      tenantId: string,
      options: {
        reason?: string;
        note?: string;
        employeeId?: string;
        syncAllContacts?: boolean;
      },
    ) => void;
  }).enqueueSync = (tenantId, options) => {
    captured = {
      tenantId,
      ...options,
    };
  };

  service.recordTaskTemplateDeleted('tenant-1', {
    id: 'template-1',
    title: 'Open the cafe',
    assigneeEmployeeId: null,
    managerEmployeeId: 'manager-1',
    group: { name: 'Operations' },
    department: null,
    location: { name: 'Downtown' },
    assigneeEmployee: null,
    managerEmployee: {
      firstName: 'Mary',
      lastName: 'Manager',
      employeeNumber: 'M-001',
      user: { email: 'manager@example.com' },
    },
  });

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    reason: 'task_template_deleted',
    employeeId: undefined,
    syncAllContacts: false,
    note: [
      'HiTeam recurring task template deleted: task_template_deleted.',
      'Task: Open the cafe',
      'Template ID: template-1',
      'Assignee: unassigned',
      'Manager: Mary Manager (M-001, manager@example.com)',
      'Group: Operations',
      'Department: n/a',
      'Location: Downtown',
    ].join('\n'),
  });
}

async function testEmployeeEmailDeliveryIsVisibleInKommoNote() {
  const service = createKommoService();
  let captured:
    | {
        tenantId: string;
        reason?: string;
        note?: string;
        invitationId?: string;
        syncAllContacts?: boolean;
      }
    | null = null;

  (service as unknown as {
    enqueueSync: (
      tenantId: string,
      options: {
        reason?: string;
        note?: string;
        invitationId?: string;
        syncAllContacts?: boolean;
      },
    ) => void;
  }).enqueueSync = (tenantId, options) => {
    captured = {
      tenantId,
      ...options,
    };
  };

  service.recordEmployeeInvited('tenant-1', 'invitation-1', {
    status: 'failed',
    provider: 'none',
    recipients: ['worker@example.com'],
    recordedAt: '2026-06-21T12:00:00.000Z',
    actionUrl: 'https://hiteam.net/join/token',
    errorMessage: 'Email provider is disabled.',
  });

  assert.deepEqual(captured, {
    tenantId: 'tenant-1',
    reason: 'employee_invited',
    invitationId: 'invitation-1',
    syncAllContacts: true,
    note: [
      '[HiTeam Employee Email] FAILED',
      'Action: employee_invited',
      'Provider: none',
      'Recipients: worker@example.com',
      'Action URL: https://hiteam.net/join/token',
      'Recorded at: 2026-06-21T12:00:00.000Z',
      'Error: Email provider is disabled.',
    ].join('\n'),
  });
}

async function main() {
  await testSeatPurchaseReasonRoutesToPaymentLifecycle();
  await testOrganizationRegistrationIncludesManagerEmailDeliveryInKommoNote();
  await testPaymentSuccessSyncsAllContacts();
  await testRenewedPaymentUsesLatestPaymentKey();
  await testSystemBackfillSyncsAllTenantContacts();
  await testFailedLifecycleEmailDoesNotBlockKommoSync();
  await testDisabledLifecycleEmailIsVisibleInKommoSync();
  await testLeadLinksMissingCompanyAndEmployeeContacts();
  await testRecurringTaskUpdateBuildsKommoNote();
  await testTaskTemplateCreateBuildsKommoNote();
  await testTaskTemplateDeleteBuildsKommoNote();
  await testEmployeeEmailDeliveryIsVisibleInKommoNote();
  console.log('kommo flow tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

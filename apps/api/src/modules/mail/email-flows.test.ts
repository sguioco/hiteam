import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthMailerService } from '../auth/auth-mailer.service';
import { AuthService } from '../auth/auth.service';
import { EmployeeInvitationsMailerService } from '../employees/employee-invitations.mailer';
import {
  LifecycleEmailService,
  type LifecycleEmailEvent,
} from './lifecycle-email.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

function buildLifecycleEmailService(
  config: Record<string, string | undefined>,
  prisma: unknown = {},
) {
  return new LifecycleEmailService(prisma as never, new FakeConfigService(config) as never);
}

async function testResendEnablesTransactionalEmail() {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: unknown }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });

    return {
      ok: true,
      text: async () => '',
      json: async () => ({}),
    } as Response;
  }) as typeof fetch;

  try {
    const service = buildLifecycleEmailService({
      RESEND_API_KEY: 'resend-key',
      EMAIL_FROM: 'HiTeam <mail@example.com>',
    });

    assert.equal(service.isEnabled(), true);

    const result = await service.sendTransactionalEmail({
      to: 'User@Example.com',
      subject: 'Reset',
      html: '<p>Reset</p>',
      text: 'Reset',
    });

    assert.equal(result.status, 'accepted');
    assert.equal(result.provider, 'resend');
    assert.deepEqual(result.recipients, ['user@example.com']);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.deepEqual((calls[0].body as { to: string[] }).to, ['user@example.com']);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testGraphFallsBackToResend() {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    urls.push(String(url));

    if (String(url).includes('login.microsoftonline.com')) {
      return {
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
        json: async () => ({ error_description: 'bad graph credentials' }),
      } as Response;
    }

    if (String(url) === 'https://api.resend.com/emails') {
      assert.ok(init?.headers);
      return {
        ok: true,
        text: async () => '',
        json: async () => ({}),
      } as Response;
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  }) as typeof fetch;

  try {
    const service = buildLifecycleEmailService({
      MICROSOFT_GRAPH_TENANT_ID: 'tenant',
      MICROSOFT_GRAPH_CLIENT_ID: 'client',
      MICROSOFT_GRAPH_CLIENT_SECRET: 'secret',
      MICROSOFT_GRAPH_SENDER: 'graph@example.com',
      RESEND_API_KEY: 'resend-key',
    });

    const result = await service.sendTransactionalEmail({
      to: 'user@example.com',
      subject: 'Fallback',
      html: '<p>Fallback</p>',
      text: 'Fallback',
    });

    assert.equal(result.status, 'accepted');
    assert.equal(result.provider, 'resend');
    assert.equal(urls.some((url) => url.includes('login.microsoftonline.com')), true);
    assert.equal(urls.includes('https://api.resend.com/emails'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testGraphRetriesTransientFailures() {
  const originalFetch = globalThis.fetch;
  let graphSendAttempts = 0;

  globalThis.fetch = (async (url: string | URL | Request) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'token', expires_in: 3600 }),
      } as Response;
    }

    if (String(url).includes('graph.microsoft.com')) {
      graphSendAttempts += 1;
      if (graphSendAttempts < 3) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Too Many Requests',
        } as Response;
      }

      return {
        ok: true,
        status: 202,
        text: async () => '',
      } as Response;
    }

    throw new Error(`Unexpected fetch URL: ${String(url)}`);
  }) as typeof fetch;

  try {
    const service = buildLifecycleEmailService({
      MICROSOFT_GRAPH_TENANT_ID: 'tenant',
      MICROSOFT_GRAPH_CLIENT_ID: 'client',
      MICROSOFT_GRAPH_CLIENT_SECRET: 'secret',
      MICROSOFT_GRAPH_SENDER: 'graph@example.com',
    });

    const result = await service.sendTransactionalEmail({
      to: 'user@example.com',
      subject: 'Retry',
      html: '<p>Retry</p>',
      text: 'Retry',
    });

    assert.equal(result.status, 'accepted');
    assert.equal(result.provider, 'microsoft_graph');
    assert.equal(graphSendAttempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testPaymentSuccessfulLifecycleEmailIncludesBillingDetails() {
  const originalFetch = globalThis.fetch;
  const bodies: Array<{
    to: string[];
    subject: string;
    html: string;
    text: string;
  }> = [];
  const prisma = {
    tenant: {
      findUnique: async () => ({
        id: 'tenant-1',
        name: 'Mary FY',
        slug: 'mary-fy',
        locale: 'en',
        users: [
          {
            email: 'Owner@Example.com',
            preferredLocale: 'en',
            createdAt: new Date('2026-06-20T10:00:00.000Z'),
            roles: [{ role: { code: 'tenant_owner' } }],
          },
        ],
        companies: [{ name: 'Mary FY LLC' }],
        employeeInvitations: [],
        billingSubscription: {
          trialEndsAt: null,
          stripeCurrentPeriodEnd: new Date('2027-01-21T12:00:00.000Z'),
          stripePriceLookupKey: 'hiteam_seat_middle_east_monthly',
          stripeCurrency: 'AED',
        },
        billingPayments: [
          {
            amountMinor: 7700,
            currency: 'AED',
            planMonths: 6,
            accessMonths: 7,
            targetSeats: 3,
            periodEnd: new Date('2027-01-21T12:00:00.000Z'),
            paidAt: new Date('2026-06-21T12:00:00.000Z'),
          },
        ],
      }),
    },
  };

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));

    return {
      ok: true,
      text: async () => '',
      json: async () => ({}),
    } as Response;
  }) as typeof fetch;

  try {
    const service = buildLifecycleEmailService(
      {
        RESEND_API_KEY: 'resend-key',
        EMAIL_FROM: 'HiTeam <mail@example.com>',
        WEB_ADMIN_BASE_URL: 'https://hiteam.net',
      },
      prisma,
    );

    const result = await service.sendLifecycleEmail({
      tenantId: 'tenant-1',
      event: 'payment_successful',
    });

    assert.equal(result.status, 'accepted');
    assert.equal(result.provider, 'resend');
    assert.deepEqual(result.recipients, ['owner@example.com']);
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].subject, 'HiTeam payment successful');

    const text = bodies[0].text.replace(/\u00a0/g, ' ');
    assert.match(text, /Payment: AED\s*77/);
    assert.match(text, /Semi Annual: pay 6 mo, access 7 mo/);
    assert.match(text, /3 seats/);
    assert.match(text, /access until/);
    assert.match(text, /Open workspace: https:\/\/hiteam\.net\/app\?tenant=mary-fy/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testPasswordResetCreatesHashedTokenAndSendsEmail() {
  const createdTokens: Array<{ data: { tokenHash: string; userId: string } }> = [];
  const mailCalls: Array<{ email: string; resetToken: string }> = [];
  const auditCalls: unknown[] = [];
  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    preferredLocale: 'en',
  };
  const prisma = {
    user: {
      findMany: async () => [user],
    },
    passwordResetToken: {
      deleteMany: async () => ({ count: 0 }),
      create: async (args: { data: { tokenHash: string; userId: string } }) => {
        createdTokens.push(args);
        return { id: 'reset-token-1', ...args.data };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  };
  const authMailer = {
    sendPasswordResetEmail: async (params: { email: string; resetToken: string }) => {
      mailCalls.push(params);
      return {
        status: 'accepted',
        provider: 'resend',
        recipients: [params.email],
        recipientCount: 1,
        sender: 'info@hiteam.net',
        replyTo: 'info@hiteam.net',
        recordedAt: new Date().toISOString(),
      };
    },
  };
  const audit = {
    log: async (params: unknown) => {
      auditCalls.push(params);
    },
  };
  const service = new AuthService(
    prisma as never,
    {} as never,
    audit as never,
    {} as never,
    {} as never,
    authMailer as never,
  );

  await service.requestPasswordReset({
    email: 'USER@example.com',
    locale: 'en',
  });

  assert.equal(createdTokens.length, 1);
  assert.equal(mailCalls.length, 1);
  assert.equal(auditCalls.length, 1);
  assert.equal(mailCalls[0].email, 'user@example.com');
  assert.notEqual(createdTokens[0].data.tokenHash, mailCalls[0].resetToken);
  assert.equal(createdTokens[0].data.tokenHash.length, 64);
}

async function testPasswordResetFallsBackFromStaleTenantSlug() {
  const lookupWheres: unknown[] = [];
  const createdTokens: Array<{ data: { tokenHash: string; userId: string } }> = [];
  const mailCalls: Array<{ email: string; resetToken: string }> = [];
  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    preferredLocale: 'en',
  };
  const prisma = {
    user: {
      findMany: async (args: { where: unknown }) => {
        lookupWheres.push(args.where);
        return lookupWheres.length === 1 ? [] : [user];
      },
    },
    passwordResetToken: {
      deleteMany: async () => ({ count: 0 }),
      create: async (args: { data: { tokenHash: string; userId: string } }) => {
        createdTokens.push(args);
        return { id: 'reset-token-1', ...args.data };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  };
  const authMailer = {
    sendPasswordResetEmail: async (params: { email: string; resetToken: string }) => {
      mailCalls.push(params);
      return {
        status: 'accepted',
        provider: 'microsoft_graph',
        recipients: [params.email],
        recipientCount: 1,
        sender: 'info@hiteam.net',
        replyTo: 'info@hiteam.net',
        recordedAt: new Date().toISOString(),
      };
    },
  };
  const service = new AuthService(
    prisma as never,
    {} as never,
    { log: async () => undefined } as never,
    {} as never,
    {} as never,
    authMailer as never,
  );

  await service.requestPasswordReset({
    email: 'USER@example.com',
    tenantSlug: 'stale-workspace',
    locale: 'en',
  });

  assert.equal(lookupWheres.length, 2);
  assert.match(JSON.stringify(lookupWheres[0]), /stale-workspace/);
  assert.doesNotMatch(JSON.stringify(lookupWheres[1]), /tenant/);
  assert.equal(createdTokens.length, 1);
  assert.equal(mailCalls.length, 1);
  assert.equal(mailCalls[0].email, 'user@example.com');
}

async function testTransactionalTemplatesUseConfiguredPublicUrl() {
  const deliveries: Array<{
    to: string | string[] | null | undefined;
    subject: string;
    html: string;
    text: string;
  }> = [];
  const deliveryService = {
    sendTransactionalEmail: async (params: {
      to: string | string[] | null | undefined;
      subject: string;
      html: string;
      text: string;
    }) => {
      deliveries.push(params);
      const recipients = Array.isArray(params.to) ? params.to : [params.to as string];
      return {
        status: 'accepted',
        provider: 'microsoft_graph',
        sender: 'info@hiteam.net',
        replyTo: 'info@hiteam.net',
        recipients,
        recipientCount: recipients.length,
        recordedAt: new Date().toISOString(),
      };
    },
  };
  const config = new FakeConfigService({
    WEB_ADMIN_BASE_URL: 'https://hiteam.net',
  });
  const authMailer = new AuthMailerService(
    config as never,
    deliveryService as never,
  );
  const employeeMailer = new EmployeeInvitationsMailerService(
    config as never,
    deliveryService as never,
  );

  await authMailer.sendPasswordResetEmail({
    email: 'user@example.com',
    resetToken: 'reset-token',
    locale: 'en',
  });
  await authMailer.sendPasswordChangedEmail({
    email: 'user@example.com',
    locale: 'ru',
  });
  await employeeMailer.sendInvitationEmail({
    email: 'worker@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    token: 'invite-token',
    locale: 'en',
  });
  await employeeMailer.sendManagerSetupEmail({
    email: 'manager@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    setupUrl: 'https://hiteam.net/join/manager-token',
    locale: 'ru',
  });
  await employeeMailer.sendInvitationStatusEmail({
    email: 'worker@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    status: 'PENDING_APPROVAL',
    locale: 'en',
  });
  await employeeMailer.sendInvitationStatusEmail({
    email: 'worker@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    status: 'APPROVED',
    locale: 'ru',
  });
  await employeeMailer.sendInvitationStatusEmail({
    email: 'worker@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    status: 'REJECTED',
    rejectedReason: 'Profile mismatch',
    locale: 'en',
  });
  await employeeMailer.sendGeneratedCredentialsEmail({
    email: 'worker@example.com',
    companyName: 'Example LLC',
    tenantName: 'Example',
    password: 'temporary-password',
    locale: 'ru',
  });

  assert.equal(deliveries.length, 8);
  for (const delivery of deliveries) {
    assert.ok(delivery.subject.trim());
    assert.doesNotMatch(delivery.html, /localhost|nip\.io/);
    assert.doesNotMatch(delivery.text, /localhost|nip\.io/);
    assert.match(`${delivery.html}\n${delivery.text}`, /https:\/\/hiteam\.net\//);
  }
}

async function testEmployeeEmailsRespectGlobalDeliverySwitch() {
  let directFetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    directFetchCalled = true;
    throw new Error('Employee mailer must not bypass LifecycleEmailService.');
  }) as typeof fetch;

  try {
    const employeeMailer = new EmployeeInvitationsMailerService(
      new FakeConfigService({
        WEB_ADMIN_BASE_URL: 'https://hiteam.net',
        RESEND_API_KEY: 'configured-but-disabled',
      }) as never,
      {
        sendTransactionalEmail: async () => ({
          status: 'disabled',
          provider: 'disabled',
          sender: 'info@hiteam.net',
          replyTo: 'info@hiteam.net',
          recipients: ['worker@example.com'],
          recipientCount: 1,
          recordedAt: new Date().toISOString(),
        }),
      } as never,
    );

    const result = await employeeMailer.sendInvitationStatusEmail({
      email: 'worker@example.com',
      companyName: 'Example LLC',
      tenantName: 'Example',
      status: 'APPROVED',
      locale: 'en',
    });

    assert.equal(result.status, 'disabled');
    assert.equal(result.provider, 'none');
    assert.equal(directFetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testAllLifecycleTemplatesUseConfiguredPublicUrl() {
  const originalFetch = globalThis.fetch;
  const bodies: Array<{ subject: string; html: string; text: string }> = [];
  let locale: 'en' | 'ru' = 'en';
  const prisma = {
    tenant: {
      findUnique: async () => ({
        id: 'tenant-1',
        name: 'Example',
        slug: 'example',
        locale,
        users: [
          {
            email: 'owner@example.com',
            preferredLocale: locale,
            createdAt: new Date('2026-06-20T10:00:00.000Z'),
            roles: [{ role: { code: 'tenant_owner' } }],
          },
        ],
        companies: [{ name: 'Example LLC' }],
        employeeInvitations: [],
        billingSubscription: {
          trialEndsAt: new Date('2026-08-05T10:00:00.000Z'),
          stripeCurrentPeriodEnd: new Date('2026-09-05T10:00:00.000Z'),
          stripePriceLookupKey: 'monthly',
          stripeCurrency: 'USD',
        },
        billingPayments: [
          {
            amountMinor: 9900,
            currency: 'USD',
            planMonths: 1,
            accessMonths: 1,
            targetSeats: 5,
            periodEnd: new Date('2026-09-05T10:00:00.000Z'),
            paidAt: new Date('2026-07-29T10:00:00.000Z'),
          },
        ],
      }),
    },
  };
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return {
      ok: true,
      text: async () => '',
      json: async () => ({}),
    } as Response;
  }) as typeof fetch;
  const events: LifecycleEmailEvent[] = [
    'user_registered',
    'trial_started',
    'activation_started',
    'trial_ending_soon',
    'trial_expired',
    'payment_successful',
    'payment_failed',
    'subscription_renewal_upcoming',
    'subscription_cancelled',
    'inactive_3_days',
    'key_feature_not_used',
  ];

  try {
    const service = buildLifecycleEmailService(
      {
        RESEND_API_KEY: 'resend-key',
        EMAIL_FROM: 'HiTeam <info@hiteam.net>',
        WEB_ADMIN_BASE_URL: 'https://hiteam.net',
      },
      prisma,
    );

    for (locale of ['en', 'ru'] as const) {
      for (const event of events) {
        const result = await service.sendLifecycleEmail({
          tenantId: 'tenant-1',
          event,
        });
        assert.equal(result.status, 'accepted');
      }
    }

    assert.equal(bodies.length, events.length * 2);
    for (const body of bodies) {
      assert.ok(body.subject.trim());
      assert.doesNotMatch(body.html, /localhost|nip\.io/);
      assert.doesNotMatch(body.text, /localhost|nip\.io/);
      assert.match(`${body.html}\n${body.text}`, /https:\/\/hiteam\.net\//);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function testManagerSetupEmailStatusIsSyncedToKommo() {
  const source = readFileSync(join(__dirname, '../auth/auth.service.ts'), 'utf8');
  const start = source.indexOf('async registerOrganization(');
  assert.notEqual(start, -1, 'registerOrganization must exist.');
  const nextMethod = source.indexOf('\n  async ', start + 1);
  const registerOrganization = source.slice(start, nextMethod === -1 ? source.length : nextMethod);

  assert.match(
    registerOrganization,
    /let managerEmailDelivery: EmployeeEmailDeliveryResult/,
    'Manager setup email delivery result must keep full delivery metadata.',
  );
  assert.match(
    registerOrganization,
    /recordOrganizationRegistered\(result\.tenantId, managerEmailDelivery\)/,
    'Organization registration must sync manager setup email delivery status to Kommo.',
  );
}

function testManagerEmailCanBeUsedInMultipleWorkspaces() {
  const source = readFileSync(join(__dirname, '../auth/auth.service.ts'), 'utf8');

  assert.doesNotMatch(
    source,
    /assertWorkspaceEmailAvailability|Manager email is already used in another workspace/,
    'Organization registration must not reject an email used in another workspace.',
  );
}

async function main() {
  await testResendEnablesTransactionalEmail();
  await testGraphFallsBackToResend();
  await testGraphRetriesTransientFailures();
  await testPaymentSuccessfulLifecycleEmailIncludesBillingDetails();
  await testPasswordResetCreatesHashedTokenAndSendsEmail();
  await testPasswordResetFallsBackFromStaleTenantSlug();
  await testTransactionalTemplatesUseConfiguredPublicUrl();
  await testEmployeeEmailsRespectGlobalDeliverySwitch();
  await testAllLifecycleTemplatesUseConfiguredPublicUrl();
  testManagerSetupEmailStatusIsSyncedToKommo();
  testManagerEmailCanBeUsedInMultipleWorkspaces();
  console.log('email flow tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

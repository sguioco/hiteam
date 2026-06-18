import assert from 'node:assert/strict';
import { AuthService } from '../auth/auth.service';
import { LifecycleEmailService } from './lifecycle-email.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

function buildLifecycleEmailService(config: Record<string, string | undefined>) {
  return new LifecycleEmailService({} as never, new FakeConfigService(config) as never);
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

async function main() {
  await testResendEnablesTransactionalEmail();
  await testGraphFallsBackToResend();
  await testPasswordResetCreatesHashedTokenAndSendsEmail();
  console.log('email flow tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

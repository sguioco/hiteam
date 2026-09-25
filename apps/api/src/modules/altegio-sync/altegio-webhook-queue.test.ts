import assert from 'node:assert/strict';
import { AltegioWebhookQueueService } from './altegio-webhook-queue.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

type SyncCall = { payload: Record<string, unknown> };

function buildService(
  env: Record<string, string | undefined>,
  marketplaceResult: unknown,
  pilotResult: unknown,
) {
  const marketplaceCalls: SyncCall[] = [];
  const pilotCalls: SyncCall[] = [];
  const service = new AltegioWebhookQueueService(
    new FakeConfigService(env) as never,
    {
      handleWebhookEvent: async (payload: Record<string, unknown>) => {
        marketplaceCalls.push({ payload });
        return marketplaceResult;
      },
    } as never,
    {
      handleWebhookEvent: async (payload: Record<string, unknown>) => {
        pilotCalls.push({ payload });
        return pilotResult;
      },
    } as never,
  );
  return { service, marketplaceCalls, pilotCalls };
}

async function testInlineDispatchWithoutRedis() {
  const payload = { event: 'staff', resource: 'staff', resource_id: '100', status: 'update' };
  const { service, marketplaceCalls, pilotCalls } = buildService(
    { REDIS_URL: '' },
    { ok: true, kind: 'staff', resourceId: '100', mode: 'incremental' },
    { ok: true, kind: 'staff' },
  );

  const result = await service.enqueue(payload);

  assert.deepEqual(result, {
    ok: true,
    queued: false,
    result: { ok: true, kind: 'staff', resourceId: '100', mode: 'incremental' },
  });
  assert.equal(marketplaceCalls.length, 1);
  assert.equal(pilotCalls.length, 0);
  assert.equal(marketplaceCalls[0].payload, payload);
}

async function testInlinePilotFallbackOnUnknownLocation() {
  const payload = { event: 'master', resource: 'master', resource_id: 'remote-1', status: 'update' };
  const { service, marketplaceCalls, pilotCalls } = buildService(
    { REDIS_URL: undefined },
    { ok: true, ignored: 'unknown_location' },
    { ok: true, kind: 'staff', result: { imported: 1 }, resourceId: 'remote-1', mode: 'incremental' },
  );

  const result = await service.enqueue(payload);

  assert.equal(result.ok, true);
  if (!result.ok || result.queued) {
    throw new Error('expected inline pilot dispatch');
  }
  assert.equal(result.result.kind, 'staff');
  assert.equal(marketplaceCalls.length, 1);
  assert.equal(pilotCalls.length, 1);
}

async function testMissingLocationIsNotRoutedToPilot() {
  const { service, marketplaceCalls, pilotCalls } = buildService(
    { REDIS_URL: '' },
    { ok: true, ignored: 'missing_location' },
    { ok: true, kind: 'staff' },
  );

  const result = await service.enqueue({ event: 'staff', resource: 'staff' });

  assert.equal(result.ok, true);
  if (!result.ok || result.queued) {
    throw new Error('expected inline dispatch');
  }
  assert.deepEqual(result.result, { ok: true, ignored: 'missing_location' });
  assert.equal(pilotCalls.length, 0);
}

async function testEnqueueReturnsQueuedWhenQueueActive() {
  const env = { REDIS_URL: 'redis://localhost:6379' };
  const { service, marketplaceCalls } = buildService(env, { ok: true }, { ok: true });
  (service as unknown as { queue: unknown }).queue = {
    getWaitingCount: async () => 0,
    getActiveCount: async () => 1,
    add: async () => ({ id: 'webhook-job-42' }),
  };

  const result = await service.enqueue({ event: 'staff', resource: 'staff', resource_id: '100' });

  assert.deepEqual(result, { ok: true, queued: true, jobId: 'webhook-job-42' });
  assert.equal(marketplaceCalls.length, 0);
}

async function testBackpressureWhenQueueFull() {
  const env = { REDIS_URL: 'redis://localhost:6379' };
  const { service, marketplaceCalls } = buildService(env, { ok: true }, { ok: true });
  (service as unknown as { queue: unknown }).queue = {
    getWaitingCount: async () => 600,
    getActiveCount: async () => 40,
    add: async () => ({ id: 'webhook-job-1' }),
  };

  const result = await service.enqueue({ event: 'staff', resource: 'staff', resource_id: '100' });

  assert.deepEqual(result, { ok: false, reason: 'queue_backpressure', queueLength: 640 });
  assert.equal(marketplaceCalls.length, 0);
}

async function testBackpressureLimitHonorsEnv() {
  const env = {
    REDIS_URL: 'redis://localhost:6379',
    ALTEGIO_WEBHOOK_QUEUE_MAX_BACKLOG: '20',
  };
  const { service, marketplaceCalls } = buildService(env, { ok: true }, { ok: true });
  (service as unknown as { queue: unknown }).queue = {
    getWaitingCount: async () => 20,
    getActiveCount: async () => 0,
    add: async () => ({ id: 'webhook-job-1' }),
  };

  const result = await service.enqueue({ event: 'schedule', resource: 'schedule', resource_id: '100' });

  assert.equal(result.ok, false);
  assert.equal(marketplaceCalls.length, 0);
}

async function testSeveralCustomersFitUnderBacklog() {
  const env = { REDIS_URL: 'redis://localhost:6379' };
  const { service, marketplaceCalls } = buildService(env, { ok: true }, { ok: true });
  (service as unknown as { queue: unknown }).queue = {
    getWaitingCount: async () => 490,
    getActiveCount: async () => 3,
    add: async () => ({ id: 'webhook-job-1' }),
  };

  const result = await service.enqueue({ event: 'staff', resource: 'staff', resource_id: '100' });

  assert.deepEqual(result, { ok: true, queued: true, jobId: 'webhook-job-1' });
  assert.equal(marketplaceCalls.length, 0);
}

async function main() {
  await testInlineDispatchWithoutRedis();
  await testInlinePilotFallbackOnUnknownLocation();
  await testMissingLocationIsNotRoutedToPilot();
  await testEnqueueReturnsQueuedWhenQueueActive();
  await testBackpressureWhenQueueFull();
  await testBackpressureLimitHonorsEnv();
  await testSeveralCustomersFitUnderBacklog();
  console.log('altegio webhook queue tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
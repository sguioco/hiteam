import assert from 'node:assert/strict';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AltegioCallbackController } from './altegio-callback.controller';
import { AltegioMarketplaceClient } from './altegio-marketplace.client';
import { AltegioWebhookQueueService } from '../altegio-sync/altegio-webhook-queue.service';
import {
  computeUserDataSign,
  isUserDataSignValid,
} from './altegio-webhook-signature';

const PARTNER_KEY = 'test-partner-key-01';
const USER_DATA = 'eyJzYWxvbl9pZCI6IjEyMzQ1NiJ9';

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

type SyncCall = { payload: Record<string, unknown> };

function errorBody(error: unknown) {
  assert.ok(error instanceof HttpException);
  return {
    status: error.getStatus(),
    message: (error.getResponse() as { message?: string }).message,
  };
}

function buildController(env: Record<string, string | undefined>) {
  const syncCalls: SyncCall[] = [];
  const billingCalls: Record<string, unknown>[] = [];
  const syncService = {
    handleWebhookEvent: async (payload: Record<string, unknown>) => {
      syncCalls.push({ payload });
      return { ok: true, kind: 'staff' };
    },
  } as never;
  const controller = new AltegioCallbackController(
    {
      handleExternalCallback: async (payload: Record<string, unknown>) => {
        billingCalls.push(payload);
        return { ok: true };
      },
    } as never,
    new AltegioMarketplaceClient(new FakeConfigService(env) as never) as never,
    {} as never,
    new AltegioWebhookQueueService(
      new FakeConfigService(env) as never,
      syncService,
      undefined as never,
    ) as never,
    syncService,
    undefined,
  );
  return { controller, syncCalls, billingCalls };
}

function webhookRequest(payload: Record<string, unknown>) {
  return { body: payload } as never;
}

async function testSignatureHelperFunctions() {
  const sign = computeUserDataSign(USER_DATA, PARTNER_KEY);
  assert.equal(sign.length, 64);
  assert.match(sign, /^[0-9a-f]{64}$/);
  assert.equal(isUserDataSignValid(USER_DATA, sign, PARTNER_KEY), true);
  assert.equal(
    isUserDataSignValid(USER_DATA, 'f'.repeat(64), PARTNER_KEY),
    false,
  );
  assert.equal(isUserDataSignValid(USER_DATA, sign, 'another-key'), false);
  assert.equal(isUserDataSignValid(USER_DATA, sign, ''), false);
  assert.equal(isUserDataSignValid('tampered-data', sign, PARTNER_KEY), false);
  assert.equal(isUserDataSignValid(USER_DATA, 'abc', PARTNER_KEY), false);
  assert.equal(isUserDataSignValid('', sign, PARTNER_KEY), false);
}

async function testValidSignaturePassesEntityWebhook() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller, syncCalls } = buildController(env);
  const sign = computeUserDataSign(USER_DATA, PARTNER_KEY);

  const result = await controller.webhooks(
    webhookRequest({
      event: 'staff',
      resource: 'staff',
      resource_id: '100',
      status: 'update',
      user_data: USER_DATA,
      user_data_sign: sign,
    }),
    {},
    undefined,
  );

  assert.equal(result.ok, true);
  assert.equal(syncCalls.length, 1);
}

async function testTamperedUserDataRejected() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller, syncCalls } = buildController(env);
  const sign = computeUserDataSign(USER_DATA, PARTNER_KEY);

  await assert.rejects(
    () =>
      controller.webhooks(
        webhookRequest({
          event: 'staff',
          resource: 'staff',
          resource_id: '100',
          status: 'update',
          user_data: 'tampered-data',
          user_data_sign: sign,
        }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 401, message: 'invalid_user_data_sign' }),
  );
  assert.equal(syncCalls.length, 0);
}

async function testWrongSignatureRejected() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller, syncCalls } = buildController(env);

  await assert.rejects(
    () =>
      controller.webhooks(
        webhookRequest({
          event: 'staff',
          resource: 'staff',
          resource_id: '100',
          status: 'update',
          user_data: USER_DATA,
          user_data_sign: 'f'.repeat(64),
        }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 401, message: 'invalid_user_data_sign' }),
  );
  assert.equal(syncCalls.length, 0);
}

async function testPartialSignatureRejected() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller, syncCalls } = buildController(env);

  await assert.rejects(
    () =>
      controller.webhooks(
        webhookRequest({
          event: 'staff',
          resource: 'staff',
          resource_id: '100',
          status: 'update',
          user_data: USER_DATA,
        }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 401, message: 'invalid_user_data_sign' }),
  );
  assert.equal(syncCalls.length, 0);
}

async function testMissingSignatureFallsBackToPartnerToken() {
  const env = {
    ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY,
    ALTEGIO_PARTNER_TOKEN: 'partner-token-01',
  };
  const { controller, syncCalls, billingCalls } = buildController(env);

  const result = await controller.webhooks(
    webhookRequest({ event: 'uninstall', partner_token: 'partner-token-01' }),
    {},
    undefined,
  );

  assert.equal(result.ok, true);
  assert.equal(billingCalls.length, 1);
  assert.equal(syncCalls.length, 0);
}

async function testInvalidPartnerTokenStillRejectedWithoutSignature() {
  const env = {
    ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY,
    ALTEGIO_PARTNER_TOKEN: 'partner-token-01',
  };
  const { controller } = buildController(env);

  await assert.rejects(
    () =>
      controller.webhooks(
        webhookRequest({ event: 'uninstall', partner_token: 'wrong' }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 401, message: 'invalid_partner_token' }),
  );
}

async function testWebhookRejectedWhenNoAuthenticationConfigured() {
  const env = {};
  const { controller, syncCalls } = buildController(env);
  const sign = computeUserDataSign(USER_DATA, PARTNER_KEY);

  // No partner key (signature is ignored), no partner token and no shared
  // callback token: the delivery must not be accepted anonymously.
  await assert.rejects(
    () =>
      controller.webhooks(
        webhookRequest({
          event: 'staff',
          resource: 'staff',
          resource_id: '100',
          status: 'update',
          user_data: USER_DATA,
          user_data_sign: sign,
        }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({
        status: 503,
        message: 'callback_token_not_configured',
      }),
  );
  assert.equal(syncCalls.length, 0);
}

async function testCallbackTokenStillAcceptedForEntityWebhook() {
  const env = {};
  const { controller, syncCalls } = buildController(env);
  const previous = process.env.ALTEGIO_CALLBACK_TOKEN;
  process.env.ALTEGIO_CALLBACK_TOKEN = 'shared-callback-token';

  try {
    const result = await controller.webhooks(
      webhookRequest({ event: 'staff', resource: 'staff', resource_id: '100', status: 'update' }),
      { token: 'shared-callback-token' },
      undefined,
    );

    assert.equal(result.ok, true);
    assert.equal(syncCalls.length, 1);
  } finally {
    process.env.ALTEGIO_CALLBACK_TOKEN = previous;
  }
}

async function testCallbackEndpointRejectsInvalidSignature() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller } = buildController(env);

  await assert.rejects(
    () =>
      controller.callback(
        webhookRequest({
          event: 'uninstall',
          user_data: USER_DATA,
          user_data_sign: 'f'.repeat(64),
        }),
        {},
        undefined,
      ),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 401, message: 'invalid_user_data_sign' }),
  );
}

async function testCallbackEndpointAcceptsValidSignature() {
  const env = { ALTEGIO_MARKETPLACE_PARTNER_KEY: PARTNER_KEY };
  const { controller, billingCalls } = buildController(env);
  const sign = computeUserDataSign(USER_DATA, PARTNER_KEY);

  const result = await controller.callback(
    webhookRequest({
      event: 'uninstall',
      user_data: USER_DATA,
      user_data_sign: sign,
    }),
    {},
    undefined,
  );

  assert.equal(result.ok, true);
  assert.equal(billingCalls.length, 1);
}

async function main() {
  const hadCallbackToken = process.env.ALTEGIO_CALLBACK_TOKEN;
  process.env.ALTEGIO_CALLBACK_TOKEN = '';

  try {
    await testSignatureHelperFunctions();
    await testValidSignaturePassesEntityWebhook();
    await testTamperedUserDataRejected();
    await testWrongSignatureRejected();
    await testPartialSignatureRejected();
    await testMissingSignatureFallsBackToPartnerToken();
    await testInvalidPartnerTokenStillRejectedWithoutSignature();
    await testWebhookRejectedWhenNoAuthenticationConfigured();
    await testCallbackTokenStillAcceptedForEntityWebhook();
    await testCallbackEndpointRejectsInvalidSignature();
    await testCallbackEndpointAcceptsValidSignature();
  } finally {
    process.env.ALTEGIO_CALLBACK_TOKEN = hadCallbackToken;
  }
  console.log('altegio webhook signature tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
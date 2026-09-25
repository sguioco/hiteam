import assert from 'node:assert/strict';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AltegioCallbackController } from './altegio-callback.controller';
import {
  extractSalonIdFromUserData,
  verifyAltegioInstallClaim,
} from './altegio-install-claim';
import { computeUserDataSign } from './altegio-webhook-signature';
import { appendWebhookTokenToUrl } from './altegio-webhook-url';

const PARTNER_KEY = 'test-partner-key-01';
const SALON_ID = '123456';
const USER_DATA = JSON.stringify({ salon_id: SALON_ID, user: 'owner@salon.test' });

function sign(userData = USER_DATA) {
  return computeUserDataSign(userData, PARTNER_KEY);
}

function errorBody(error: unknown) {
  assert.ok(error instanceof HttpException);
  return {
    status: error.getStatus(),
    message: (error.getResponse() as { message?: string }).message,
  };
}

async function testClaimNotPresentWhenBothEmpty() {
  const verdict = verifyAltegioInstallClaim({
    userData: '',
    userDataSign: '',
    claimedLocationId: SALON_ID,
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: false, reason: 'not_present' });
}

async function testClaimPartialRejected() {
  const verdict = verifyAltegioInstallClaim({
    userData: USER_DATA,
    userDataSign: '',
    claimedLocationId: SALON_ID,
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: true, error: 'partial' });
}

async function testClaimInvalidSignatureRejected() {
  const verdict = verifyAltegioInstallClaim({
    userData: USER_DATA,
    userDataSign: 'f'.repeat(64),
    claimedLocationId: SALON_ID,
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: true, error: 'invalid_signature' });
}

async function testClaimValid() {
  const verdict = verifyAltegioInstallClaim({
    userData: USER_DATA,
    userDataSign: sign(),
    claimedLocationId: SALON_ID,
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: true, valid: true });
}

async function testClaimSalonMismatchRejected() {
  const verdict = verifyAltegioInstallClaim({
    userData: USER_DATA,
    userDataSign: sign(),
    claimedLocationId: '999999',
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: true, error: 'salon_mismatch' });
}

async function testClaimValidWithoutEmbeddedSalon() {
  const verdict = verifyAltegioInstallClaim({
    userData: 'owner@salon.test',
    userDataSign: sign('owner@salon.test'),
    claimedLocationId: SALON_ID,
    partnerKey: PARTNER_KEY,
  });
  assert.deepEqual(verdict, { claim: true, valid: true });
}

async function testExtractSalonIdFromUserData() {
  assert.equal(extractSalonIdFromUserData(USER_DATA), SALON_ID);
  assert.equal(
    extractSalonIdFromUserData('{"location_id":"777"}'),
    '777',
  );
  assert.equal(
    extractSalonIdFromUserData('salon_id=555'),
    '555',
  );
  assert.equal(extractSalonIdFromUserData('plain-login-string'), null);
  assert.equal(extractSalonIdFromUserData(''), null);
}

function buildPreviewController(partnerKey: string, status = 'pending') {
  const marketplaceClient = {
    applicationId: () => '2147',
    partnerKey: () => partnerKey,
    getIntegrationStatus: async () => ({
      data: { connection_status: { status } },
    }),
  };
  const b2bClient = {
    getLocationProfile: async () => ({ id: SALON_ID, name: 'Salon One' }),
  };
  const queue = {
    enqueue: async () => ({ ok: true, queued: false, result: { ok: true } }),
  };
  const billing = { handleExternalCallback: async () => ({ ok: true }) };
  return new AltegioCallbackController(
    billing as never,
    marketplaceClient as never,
    b2bClient as never,
    queue as never,
    undefined,
    undefined,
  );
}

async function testPreviewRejectedWithoutClaimWhenKeyConfigured() {
  const controller = buildPreviewController(PARTNER_KEY);

  await assert.rejects(
    () =>
      controller.onboardingPreview({
        locationId: SALON_ID,
        applicationId: '2147',
      }),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 403, message: 'invalid_altegio_install_claim' }),
  );
}

async function testPreviewRejectedWithInvalidClaimWhenKeyConfigured() {
  const controller = buildPreviewController(PARTNER_KEY);

  await assert.rejects(
    () =>
      controller.onboardingPreview({
        locationId: SALON_ID,
        applicationId: '2147',
        user_data: USER_DATA,
        user_data_sign: 'f'.repeat(64),
      }),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 403, message: 'invalid_altegio_install_claim' }),
  );
}

async function testPreviewAcceptedWithValidClaimWhenKeyConfigured() {
  const controller = buildPreviewController(PARTNER_KEY);

  const result = await controller.onboardingPreview({
    locationId: SALON_ID,
    applicationId: '2147',
    user_data: USER_DATA,
    user_data_sign: sign(),
  });

  assert.equal(result.applicationId, '2147');
  assert.equal(result.connectionStatus, 'pending');
  assert.equal((result.location as { name?: string }).name, 'Salon One');
}

async function testPreviewAcceptedWithoutClaimWhenKeyNotConfigured() {
  const controller = buildPreviewController('');

  const result = await controller.onboardingPreview({
    locationId: SALON_ID,
    applicationId: '2147',
  });

  assert.equal(result.applicationId, '2147');
  assert.equal(result.connectionStatus, 'pending');
}

async function testPreviewClaimBindRedirectsTamperedSalonAway() {
  const controller = buildPreviewController(PARTNER_KEY);
  const signForOtherSalon = computeUserDataSign(
    JSON.stringify({ salon_id: '999999', user: 'other@salon.test' }),
    PARTNER_KEY,
  );

  await assert.rejects(
    () =>
      controller.onboardingPreview({
        locationId: SALON_ID,
        applicationId: '2147',
        user_data: JSON.stringify({ salon_id: '999999', user: 'other@salon.test' }),
        user_data_sign: signForOtherSalon,
      }),
    (error: unknown) =>
      JSON.stringify(errorBody(error)) ===
      JSON.stringify({ status: 403, message: 'invalid_altegio_install_claim' }),
  );
}

async function testAppendWebhookTokenToUrl() {
  assert.equal(
    appendWebhookTokenToUrl('https://api.hiteam.net/api/v1/altegio/webhooks', 'tok'),
    'https://api.hiteam.net/api/v1/altegio/webhooks?token=tok',
  );
  assert.equal(
    appendWebhookTokenToUrl('https://api.hiteam.net/webhooks?v=1', 'tok'),
    'https://api.hiteam.net/webhooks?v=1&token=tok',
  );
  assert.equal(
    appendWebhookTokenToUrl('https://api.hiteam.net/webhooks?token=existing&v=1', 'tok'),
    'https://api.hiteam.net/webhooks?token=existing&v=1',
  );
  assert.equal(appendWebhookTokenToUrl('', 'tok'), '');
  assert.equal(appendWebhookTokenToUrl('https://api.hiteam.net/webhooks', ''), 'https://api.hiteam.net/webhooks');
}

async function main() {
  await testClaimNotPresentWhenBothEmpty();
  await testClaimPartialRejected();
  await testClaimInvalidSignatureRejected();
  await testClaimValid();
  await testClaimSalonMismatchRejected();
  await testClaimValidWithoutEmbeddedSalon();
  await testExtractSalonIdFromUserData();
  await testPreviewRejectedWithoutClaimWhenKeyConfigured();
  await testPreviewRejectedWithInvalidClaimWhenKeyConfigured();
  await testPreviewAcceptedWithValidClaimWhenKeyConfigured();
  await testPreviewAcceptedWithoutClaimWhenKeyNotConfigured();
  await testPreviewClaimBindRedirectsTamperedSalonAway();
  await testAppendWebhookTokenToUrl();
  console.log('altegio install claim tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
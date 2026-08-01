import assert from 'node:assert/strict';
import { config } from 'dotenv';

// This file performs real writes in both systems. It is deliberately opt-in and
// requires a disposable HiTeam tenant plus an Altegio test location.
config({ path: '.env.e2e.local' });

const required = (key: string) => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required in .env.e2e.local`);
  return value;
};

async function request<T>(
  baseUrl: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload as T;
}

type LoginResult = { accessToken: string };
type PilotStatus = {
  connected: boolean;
  locations: Array<{
    id: string;
    altegioLocationId: string;
    staffLastSyncedAt: string | null;
    scheduleLastSyncedAt: string | null;
    lastError: string | null;
  }>;
};

async function main() {
  assert.equal(
    process.env.ALTEGIO_E2E_ENABLED,
    'true',
    'Refusing to run real Altegio E2E. Set ALTEGIO_E2E_ENABLED=true.',
  );

  const baseUrl = (process.env.ALTEGIO_E2E_API_URL || 'http://localhost:4000/api/v1').replace(
    /\/$/,
    '',
  );
  const expectedLocationId = required('ALTEGIO_E2E_LOCATION_ID');
  const login = await request<LoginResult>(baseUrl, '/auth/login', {
    body: {
      identifier: required('ALTEGIO_E2E_HITEAM_IDENTIFIER'),
      password: required('ALTEGIO_E2E_HITEAM_PASSWORD'),
      tenantSlug: required('ALTEGIO_E2E_HITEAM_TENANT_SLUG'),
    },
  });

  const before = await request<PilotStatus>(baseUrl, '/altegio/pilot', { token: login.accessToken });
  assert.equal(
    before.connected,
    false,
    'The E2E tenant already has a Pilot connection. Use a disposable test tenant.',
  );

  const authorized = await request<{ locations: Array<{ id: string }> }>(
    baseUrl,
    '/altegio/pilot/authorize',
    {
      token: login.accessToken,
      body: {
        login: required('ALTEGIO_E2E_LOGIN'),
        password: required('ALTEGIO_E2E_PASSWORD'),
      },
    },
  );
  assert.ok(
    authorized.locations.some((location) => location.id === expectedLocationId),
    `Altegio test account cannot access location ${expectedLocationId}.`,
  );

  await request<PilotStatus>(baseUrl, '/altegio/pilot/locations', {
    token: login.accessToken,
    body: { locationIds: [expectedLocationId] },
  });
  await request(baseUrl, '/altegio/pilot/sync', { token: login.accessToken, body: {} });

  const after = await request<PilotStatus>(baseUrl, '/altegio/pilot', { token: login.accessToken });
  const location = after.locations.find((item) => item.altegioLocationId === expectedLocationId);
  assert.ok(location, 'Pilot location binding was not created.');
  assert.ok(location.staffLastSyncedAt, 'Pilot staff synchronization did not finish.');
  assert.ok(location.scheduleLastSyncedAt, 'Pilot schedule synchronization did not finish.');
  assert.equal(location.lastError, null, `Pilot sync reported an error: ${location.lastError}`);

  console.log(`Altegio Pilot E2E: ok (location ${expectedLocationId})`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

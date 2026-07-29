const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const authPanelSource = readFileSync(
  join(__dirname, '../components/auth-panel.tsx'),
  'utf8',
);
const authSource = readFileSync(join(__dirname, '../lib/auth.ts'), 'utf8');

const handlerStart = authPanelSource.indexOf(
  'async function handleForgotPasswordSubmit',
);
const handlerEnd = authPanelSource.indexOf(
  '\n  async function ',
  handlerStart + 1,
);
const handlerSource = authPanelSource.slice(handlerStart, handlerEnd);

assert.notEqual(handlerStart, -1, 'Password reset handler must exist.');
assert.match(
  handlerSource,
  /getExplicitTenantSlug\(\)/,
  'Password reset may use only a tenant selected by URL or hostname.',
);
assert.doesNotMatch(
  handlerSource,
  /\bgetTenantSlug\(\)/,
  'Password reset must not use a stale tenant stored by a previous session.',
);

const explicitTenantStart = authSource.indexOf(
  'export function getExplicitTenantSlug',
);
const tenantGetterStart = authSource.indexOf(
  'export function getTenantSlug',
  explicitTenantStart + 1,
);
const explicitTenantSource = authSource.slice(
  explicitTenantStart,
  tenantGetterStart,
);

assert.notEqual(
  explicitTenantStart,
  -1,
  'Explicit tenant resolver must exist.',
);
assert.doesNotMatch(
  explicitTenantSource,
  /readBrowserStorageItem|getDefaultTenantSlug/,
  'Explicit tenant resolution must not fall back to cached or default workspaces.',
);

console.log('password reset flow tests passed');

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

const ts = require('typescript');
const vm = require('node:vm');
const middlewareSource = readFileSync(join(__dirname, '../middleware.ts'), 'utf8');
const context = { exports: {}, Headers, require: (name) => {
  if (name === 'next/server') return { NextResponse: { next: (options) => ({ next: true, options }), redirect: (url) => ({ redirect: String(url) }) } };
  if (name === '@/lib/request-origin') return { getPublicRequestUrl: (request, path) => new URL(path, request.nextUrl) };
  if (name === '@/lib/session-cookie') return { decodeSessionCookie: () => null, SESSION_COOKIE_NAME: 'session' };
  throw new Error(name);
} };
vm.runInNewContext(ts.transpileModule(middlewareSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
for (const agent of ['Desktop', 'iPhone']) {
  const result = context.exports.middleware({ nextUrl: new URL('https://hiteam.net/reset-password?token=valid'), headers: new Headers({ 'user-agent': agent }), cookies: { get: () => undefined } });
  assert.equal(result.next, true, 'Reset link must remain accessible without a session, including phones');
  assert.equal(result.options.request.headers.get('x-smart-public-route'), '1');
}
const protectedResult = context.exports.middleware({ nextUrl: new URL('https://hiteam.net/app'), headers: new Headers(), cookies: { get: () => undefined } });
assert.match(protectedResult.redirect, /login/);
console.log('Password reset middleware regression tests passed');

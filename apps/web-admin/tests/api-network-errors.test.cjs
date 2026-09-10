const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8');
let calls = 0;
let traceHeaderCalls = 0;
const context = { process: { env: {} }, exports: {}, Headers, FormData, AbortController, TypeError, Error, setTimeout, clearTimeout,
  fetch: async () => { calls++; throw new TypeError('Failed to fetch'); },
  require: (name) => {
    if (name === './trace-context') {
      return { addTraceparentHeader: () => { traceHeaderCalls++; } };
    }

    return {
      getRuntimeLocale: () => 'ru', shouldUseDemoApi: () => false, getSession: () => null,
    };
  },
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
(async () => {
  await assert.rejects(context.exports.apiRequest('/auth/password-reset/confirm', { method: 'POST', body: '{}' }), /Не удалось получить ответ/);
  assert.equal(calls, 1, 'A password mutation must not be retried automatically');
  assert.equal(traceHeaderCalls, 1, 'The API request must receive a trace context before fetching');
  context.fetch = async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); };
  await assert.rejects(context.exports.apiRequest('/auth/password-reset/confirm', { method: 'POST' }), /Не удалось получить ответ/);
  console.log('API network error tests passed');
})();

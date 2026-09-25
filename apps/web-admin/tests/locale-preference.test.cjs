const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'locale-preference.ts'), 'utf8');
const localeExports = {};
const writes = [];
const document = { cookie: '' };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: localeExports,
  document,
  require(name) {
    assert.equal(name, './browser-storage');
    return { writeBrowserStorageItem: (key, value) => writes.push([key, value]) };
  },
});

assert.equal(localeExports.resolveInitialLocale('en-US,en;q=0.9', 'ru', false, 'en'), 'ru');
assert.equal(localeExports.resolveInitialLocale('ru-RU,ru;q=0.9', 'en', false, 'ru'), 'en');
assert.equal(localeExports.resolveInitialLocale('ru-RU', undefined, false, 'en'), 'en');
assert.equal(localeExports.resolveInitialLocale('ru-RU', undefined, true, 'en'), 'ru');
assert.equal(localeExports.resolveInitialLocale(null, undefined, false), 'en');

localeExports.persistBrowserLocalePreference('ru');
assert.deepEqual(writes, [
  ['smart-admin-locale', 'ru'],
  ['hiteam-landing-locale', 'ru'],
]);
assert.match(document.cookie, /hiteam-landing-locale=ru/);

console.log('locale preference tests passed');

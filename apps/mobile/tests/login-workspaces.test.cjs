const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/AuthScreen.tsx'), 'utf8');
const start = source.indexOf('  async function handleSignIn()');
const end = source.indexOf('  async function handleForgotPassword()', start);
const handler = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const calls = []; let choices = []; let completed = false;
const context = { identifier: ' user@example.com ', password: ' password with spaces ', loginTenant: '', language: 'ru',
  hapticError() {}, hapticSuccess() {}, setMessage() {}, setSubmitting() {}, Keyboard: { dismiss() {} }, t: k => k,
  getLoginWorkspaces: async (email,password) => { assert.equal(email,'user@example.com'); assert.equal(password,' password with spaces '); return [{slug:'a',name:'A'},{slug:'b',name:'B'}]; },
  setLoginWorkspaces: rows => { choices = rows; },
  signInWithEmail: async (...args) => { calls.push(args); return {}; },
  completeAuthenticatedEntry: async () => { completed = true; },
};
vm.createContext(context); vm.runInContext(handler, context);
(async () => {
  await context.handleSignIn();
  assert.equal(choices.length,2); assert.equal(calls.length,0); assert.equal(completed,false);
  context.loginTenant = 'b'; await context.handleSignIn();
  assert.equal(calls[0][2],'b'); assert.equal(calls[0][1],' password with spaces '); assert.equal(completed,true);
  context.loginTenant = ''; context.getLoginWorkspaces = async () => [{slug:'only',name:'Only'}];
  await context.handleSignIn(); assert.equal(calls[1][2],'only');
  console.log('Mobile workspace selection tests passed');
})();

const apiSource = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8');
const messageStart = apiSource.indexOf('function humanizeApiMessage(');
const messageEnd = apiSource.indexOf('function resolveRequestTimeoutMs(', messageStart);
const messageContext = { getRuntimeBackendLocale: () => 'ru' };
vm.createContext(messageContext);
vm.runInContext(ts.transpileModule(apiSource.slice(messageStart, messageEnd), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, messageContext);
assert.match(messageContext.humanizeApiMessage('Multiple workspaces found for this account. Contact support or use a direct invite link.'), /Выберите компанию/);
assert.equal(messageContext.humanizeApiMessage('Invalid password.'), 'Неверный пароль.');
console.log('Mobile login error messages passed');

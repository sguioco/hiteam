const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../lib/time-input.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const testModule = { exports: {} };
new Function('module', 'exports', outputText)(testModule, testModule.exports);
const { usesTwelveHourClock, displayHour, clockPeriod, parseTimeInput } = testModule.exports;

assert.equal(usesTwelveHourClock('ru-RU'), false);
assert.equal(usesTwelveHourClock('en-US'), true);
assert.equal(displayHour(0, true), 12);
assert.equal(displayHour(13, true), 1);
assert.equal(clockPeriod(12), 'PM');
assert.deepEqual(parseTimeInput('12', '00', true, 'AM'), { hour: 0, minute: 0 });
assert.deepEqual(parseTimeInput('12', '00', true, 'PM'), { hour: 12, minute: 0 });
assert.deepEqual(parseTimeInput('01', '05', true, 'PM'), { hour: 13, minute: 5 });
assert.deepEqual(parseTimeInput('23', '59', false, 'AM'), { hour: 23, minute: 59 });
assert.deepEqual(parseTimeInput('١٣', '۰۵', false, 'AM'), { hour: 13, minute: 5 });
for (const [hour, minute, twelveHour] of [
  ['24', '00', false], ['00', '00', true], ['13', '00', true],
  ['12', '60', true], ['', '30', false], ['3', '', false],
  ['1.5', '30', false],
]) {
  assert.equal(parseTimeInput(hour, minute, twelveHour, 'AM'), null);
}
console.log('mobile time input tests passed');

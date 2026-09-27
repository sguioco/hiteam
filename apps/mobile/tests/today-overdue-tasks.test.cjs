const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', 'module', code)(
    name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name),
    module.exports, module,
  );
  cache.set(file, module.exports);
  return module.exports;
}
const { isTaskOverdue } = load(path.resolve(__dirname, '../lib/task-utils.ts'));
const { countOverdueTodayTasks, getTodayNavBadgeState } = load(path.resolve(__dirname, '../lib/today-task-state.ts'));
const now = new Date('2026-09-27T10:00:00Z');
const task = (id, dueAt, status = 'TODO') => ({ id, title: id, dueAt, status, photoProofs: [], updatedAt: now.toISOString() });
const overdueToday = task('coffee', '2026-09-27T09:00:00Z');
const future = task('later', '2026-09-27T12:00:00Z');
const done = task('completed', '2026-09-27T08:00:00Z', 'DONE');
const cancelled = task('cancelled', '2026-09-26T08:00:00Z', 'CANCELLED');
assert.equal(isTaskOverdue(overdueToday, now), true);
assert.equal(isTaskOverdue(future, now), false);
assert.equal(isTaskOverdue(done, now), false);
assert.equal(isTaskOverdue(cancelled, now), false);
assert.equal(isTaskOverdue(task('exact', now.toISOString()), now), false);
assert.equal(isTaskOverdue(task('invalid', 'invalid'), now), false);
assert.equal(isTaskOverdue(task('missing', null), now), false);
assert.equal(countOverdueTodayTasks([overdueToday, future, done, cancelled], now), 1);
// A photo is evidence, not a replacement for the canonical completion status.
assert.equal(isTaskOverdue({ ...overdueToday, photoProofs: [{ url: 'photo.jpg' }] }, now), true);
assert.equal(getTodayNavBadgeState([overdueToday, done], 'Asia/Novosibirsk', now).overdueCount, 1);
assert.equal(countOverdueTodayTasks([{ ...overdueToday, status: 'DONE' }], now), 0);
assert.equal(countOverdueTodayTasks([task('offset', '2026-09-27T16:59:00+07:00')], now), 1);
console.log('today overdue tasks: same-day deadlines, statuses, photos and time zones passed');

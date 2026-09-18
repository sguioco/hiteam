const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(output, { exports, require(name) {
    if (name === '@/lib/task-meta') return load('lib/task-meta.ts');
    // Render dialog content without the browser-only portal; retain actual component logic.
    if (name === '@/components/ui/dialog') return new Proxy({}, { get: () => ({ children }) => React.createElement('div', null, children) });
    return require(name);
  } });
  return exports;
}
const { TaskDetailsDialog } = load('components/task-details-dialog.tsx');
const person = { firstName: 'Anna', lastName: 'Smith' };
const task = {
  id: 'task-1', description: 'Clean the desk', status: 'TODO', dueAt: null,
  managerEmployee: person, assigneeEmployee: person, group: null,
  checklistItems: [{ id: 'item', title: 'Wipe desk', sortOrder: 0, isCompleted: true }],
  photoProofs: [
    { id: 'active', url: 'https://example.com/current.jpg', deletedAt: null, supersededByProofId: null },
    { id: 'deleted', url: 'https://example.com/deleted.jpg', deletedAt: '2026-01-01', supersededByProofId: null },
    { id: 'old', url: 'https://example.com/old.jpg', deletedAt: null, supersededByProofId: 'active' },
  ],
  activities: [{ id: 'comment', kind: 'COMMENT', body: 'Please check', createdAt: '2026-01-01T12:00:00Z', actorEmployee: person }],
};
const render = (value, locale = 'en') => renderToStaticMarkup(React.createElement(TaskDetailsDialog, { task: value, title: 'Desk task', locale, onClose() {} }));
const html = render(task);
for (const text of ['Desk task', 'Clean the desk', 'To do', 'No due date', 'Anna Smith', 'Wipe desk', 'Please check', 'current.jpg']) assert.ok(html.includes(text), text);
for (const text of ['deleted.jpg', 'old.jpg']) assert.ok(!html.includes(text), text);
assert.ok(render({ ...task, status: 'DONE' }, 'ru').includes('Выполнена'));
assert.ok(render({ ...task, photoProofs: [], requiresPhoto: true }).includes('Photo required'));
assert.doesNotThrow(() => render(null));

const { taskActionAvailability } = load('lib/task-actions.ts');
const ownTask = { ...task, managerEmployee: { ...person, id: 'creator' }, assigneeEmployeeId: 'worker', groupId: 'team' };
const group = { id: 'team', memberships: [{ employeeId: 'member' }] };
for (const id of ['creator', 'worker', 'member']) {
  const permissions = taskActionAvailability(ownTask, id, [group]);
  assert.equal(permissions.allowed, true, id);
  assert.equal(permissions.comment, true);
  assert.equal(permissions.reschedule, true);
}
assert.equal(taskActionAvailability(ownTask, 'outsider', [group]).allowed, false);
assert.equal(taskActionAvailability(ownTask, null, [group]).allowed, false);
for (const status of ['DONE', 'CANCELLED']) assert.equal(taskActionAvailability({ ...ownTask, status }, 'creator', []).reschedule, false);
const recurring = { ...ownTask, id: 'recurring:template:worker:2026-09-18' };
assert.equal(taskActionAvailability(recurring, 'creator', [group]).allowed, false);
assert.equal(taskActionAvailability(recurring, 'member', [group]).allowed, false);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).allowed, true);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).comment, false);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true, photoProofs: task.photoProofs.slice(1) }, 'creator', []).complete, false);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true }, 'creator', []).complete, true);
console.log('task details rendering tests passed');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, overrides = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(output, { exports, require(name) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
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
assert.equal(taskActionAvailability(recurring, 'worker', [group]).checklist, false);
assert.equal(taskActionAvailability(ownTask, 'worker', []).checklist, true);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true, photoProofs: task.photoProofs.slice(1) }, 'creator', []).complete, false);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true }, 'creator', []).complete, true);
console.log('task details rendering tests passed');

// Exercise the actual checkbox handler: one in-flight request, server-confirmed
// state only, visible failure, and a subsequent successful attempt.
(async () => {
  const state = ['worker', true];
  let cursor = 0;
  const lock = { current: false };
  const requests = [];
  let complete, fail, updated;
  const { TaskActions } = load('components/task-actions.tsx', {
    react: {
      useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
      useRef: () => lock,
      useEffect() {},
    },
    '@/lib/task-actions': { taskActionAvailability },
    '@/lib/api': { apiRequest(url, options) { requests.push({ url, options }); return new Promise((resolve, reject) => { complete = resolve; fail = reject; }); } },
  });
  function renderActions() {
    cursor = 0;
    return TaskActions({ task: ownTask, token: 'test-token', groups: [], locale: 'en', onUpdated: (id, value) => { updated = { id, value }; } });
  }
  function findCheckbox(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'input' && node.props.type === 'checkbox') return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = findCheckbox(child); if (found) return found; }
    return null;
  }
  const checkbox = findCheckbox(renderActions());
  assert.ok(checkbox);
  checkbox.props.onChange();
  checkbox.props.onChange();
  assert.equal(requests.length, 1, 'Duplicate clicks must not toggle twice');
  assert.equal(requests[0].url, '/collaboration/tasks/task-1/checklist/item/toggle');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(updated, undefined, 'No optimistic checkbox update before server response');
  fail(new Error('Access denied'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state[3], false, 'Busy state cleared after failure');
  assert.ok(state[2], 'Failure is surfaced');
  assert.equal(findCheckbox(renderActions()).props.checked, true, 'Failure preserves server checkbox value');
  findCheckbox(renderActions()).props.onChange();
  const response = { ...ownTask, checklistItems: [{ ...ownTask.checklistItems[0], isCompleted: false }] };
  complete(response);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updated.id, ownTask.id);
  assert.equal(updated.value, response);
  console.log('task checklist interaction tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

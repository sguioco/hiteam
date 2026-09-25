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
  vm.runInNewContext(output, { exports, URLSearchParams, require(name) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === '@/lib/task-meta') return load('lib/task-meta.ts');
    if (name === '@/components/ui/workspace-patterns') return load('components/ui/workspace-patterns.tsx', { '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') } });
    if (name === './billing-countries') return load('lib/billing-countries.ts');
    // Render dialog content without the browser-only portal; retain actual component logic.
    if (name === '@/components/ui/dialog') return new Proxy({}, { get: () => ({ children }) => React.createElement('div', null, children) });
    return require(name);
  } });
  return exports;
}
const { TaskDetailsDialog } = load('components/task-details-dialog.tsx');
const patterns = load('components/ui/workspace-patterns.tsx', { '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') } });
assert.match(renderToStaticMarkup(React.createElement(patterns.WorkspacePageHeader, { title: 'A very long workspace title', description: 'Context' })), /break-words/);
assert.match(renderToStaticMarkup(React.createElement(patterns.WorkspaceFeedback, { title: 'Request failed', tone: 'error' })), /role="alert"/);
assert.match(renderToStaticMarkup(React.createElement(patterns.WorkspaceFeedback, { title: 'No tasks', tone: 'empty' })), /role="status"/);
assert.match(renderToStaticMarkup(React.createElement(patterns.WorkspaceStatus, { tone: 'danger' }, 'Overdue')), /Overdue/);
const { retainVisibleEmployees } = load('lib/employee-selection.ts');
const { filterInvitations, invitationPage, INVITATIONS_PER_PAGE } = load('lib/invitation-list.ts');
const inviteItems = Array.from({ length: INVITATIONS_PER_PAGE + 2 }, (_, index) => ({ email: `person${index}@example.com`, phone: null, status: index % 2 ? 'INVITED' : 'PENDING_APPROVAL' }));
assert.equal(filterInvitations(inviteItems, 'PERSON1', 'all').length, 1);
assert.equal(filterInvitations(inviteItems, '', 'INVITED').every(item => item.status === 'INVITED'), true);
assert.equal(invitationPage(inviteItems, 1).items.length, INVITATIONS_PER_PAGE);
assert.equal(invitationPage(inviteItems, 99).currentPage, 2);
const employeesSource = fs.readFileSync(path.join(__dirname, '..', 'components/Employees.tsx'), 'utf8');
assert.match(employeesSource, /MoreHorizontal/);
assert.match(employeesSource, /min-w-\[960px\]/);
assert.equal((employeesSource.match(/openMoveDialog\(employee\)/g) || []).length, 1, 'Team assignment must have one row action entry point');
const selectedEmployees = new Set(['a', 'b']);
assert.equal(retainVisibleEmployees(selectedEmployees, ['a', 'b', 'c']), selectedEmployees);
assert.deepEqual([...retainVisibleEmployees(selectedEmployees, ['b', 'c'])], ['b']);
assert.equal(retainVisibleEmployees(selectedEmployees, []).size, 0);
assert.deepEqual([...selectedEmployees], ['a', 'b'], 'Filtering must not mutate the original selection');
const { CalendarFilterSummary } = load('components/calendar-filter-summary.tsx');
assert.equal(CalendarFilterSummary({ labels: [], locale: 'ru', onReset() {} }), null);
let calendarResets = 0;
const filterSummary = CalendarFilterSummary({ labels: ['Dubai', 'Shifts'], locale: 'en', onReset: () => calendarResets++ });
filterSummary.props.children[1].props.onClick();
assert.equal(calendarResets, 1);
for (const locale of ['ru', 'en']) {
  const markup = renderToStaticMarkup(React.createElement(CalendarFilterSummary, { labels: ['Dubai', 'Shifts'], locale, onReset() {} }));
  assert.match(markup, /Dubai/);
  assert.match(markup, /Shifts/);
  assert.match(markup, locale === 'ru' ? /Сбросить фильтры/ : /Clear filters/);
}
const { EmptyStateAction } = load('components/dashboard/empty-state-action.tsx');
assert.equal(EmptyStateAction({}), null, 'No action is exposed without permission from the parent');
let emptyActionCalls = 0;
const emptyButton = EmptyStateAction({ action: { label: 'Create task', onClick: () => emptyActionCalls++ } });
assert.equal(emptyButton.props.type, 'button');
emptyButton.props.onClick();
assert.equal(emptyActionCalls, 1);
const emptyLink = renderToStaticMarkup(React.createElement(EmptyStateAction, { action: { label: 'Open calendar', href: '/schedule?date=2026-09-19' } }));
assert.match(emptyLink, /href="\/schedule\?date=2026-09-19"/);
const { calendarDayHref, WeekCalendarNavigation } = load('components/dashboard/week-calendar-navigation.tsx', { '../../lib/admin-routes': { toAdminHref: value => value } });
const localDay = new Date(2026, 11, 29, 0, 15);
assert.equal(calendarDayHref(localDay), '/schedule?date=2026-12-29');
assert.equal(calendarDayHref(localDay, 'branch/a'), '/schedule?date=2026-12-29&locationId=branch%2Fa');
const { inDashboardLocation } = load('lib/dashboard-location.ts');
assert.equal(inDashboardLocation({}, ''), true);
assert.equal(inDashboardLocation({}, 'a'), false);
assert.equal(inDashboardLocation({ location: 'Same name' }, 'a'), false);
assert.equal(inDashboardLocation({ locationId: 'a', location: 'Same name' }, 'a'), true);
assert.equal(inDashboardLocation({ locationId: 'b', location: 'Same name' }, 'a'), false);
assert.equal(inDashboardLocation({ location: { id: 'a' } }, 'a'), true);
assert.equal(inDashboardLocation({ locationId: 'b', location: { id: 'a' } }, 'a'), false);
for (const locale of ['ru', 'en']) {
  const html = renderToStaticMarkup(React.createElement(WeekCalendarNavigation, { start: localDay, locale, locationId: 'branch-a' }));
  assert.equal((html.match(/locationId=branch-a/g) || []).length, 3);
  assert.match(html, /date=2026-12-22/);
  assert.match(html, /date=2027-01-05/);
  assert.match(html, /date=2026-12-29/);
}
const { onboardingDraftKey, encodeOnboardingDraft, decodeOnboardingDraft } = load('lib/onboarding-draft.ts');
const draftDefaults = { companyName: '', latitude: '', attendanceTrackingEnabled: true, geofenceRadiusMeters: 100, companyLogoUrl: '', details: null };
const savedDraft = encodeOnboardingDraft({ ...draftDefaults, companyName: 'Salon', latitude: '25', attendanceTrackingEnabled: false, companyLogoUrl: 'private-image', details: { address: 'provider-data' } }, 2, 1000);
const recoveredDraft = decodeOnboardingDraft(savedDraft, draftDefaults, 2000);
assert.equal(recoveredDraft.step, 2);
assert.equal(recoveredDraft.draft.companyName, 'Salon');
assert.equal(recoveredDraft.draft.attendanceTrackingEnabled, false);
assert.equal(recoveredDraft.draft.companyLogoUrl, '');
assert.equal(recoveredDraft.draft.details, null);
assert.equal(decodeOnboardingDraft(savedDraft, draftDefaults, 1000 + 86400001), null);
assert.equal(decodeOnboardingDraft('{broken', draftDefaults), null);
assert.equal(decodeOnboardingDraft(JSON.stringify({ version: 1, savedAt: 1000, step: 2, fields: { attendanceTrackingEnabled: 'false' } }), draftDefaults, 2000), null);
assert.notEqual(onboardingDraftKey('a', 'user', 'company', 'location'), onboardingDraftKey('b', 'user', 'company', 'location'));
assert.notEqual(onboardingDraftKey('a', 'user', 'company', 'location'), onboardingDraftKey('a', 'other', 'company', 'location'));
assert.notEqual(onboardingDraftKey('a', 'user', 'company', 'location'), onboardingDraftKey('a', 'user', 'company', 'other'));
const { OrganizationNextSteps } = load('components/organization-next-steps.tsx', { '../lib/admin-routes': { toAdminHref: value => value } });
for (const locale of ['ru', 'en']) {
  const tasksOnly = renderToStaticMarkup(React.createElement(OrganizationNextSteps, { attendance: false, locale }));
  assert.match(tasksOnly, /href="\/employees\?focusAddEmployee=1"/);
  assert.match(tasksOnly, /href="\/tasks"/);
  assert.doesNotMatch(tasksOnly, /href="\/schedule"/);
  const full = renderToStaticMarkup(React.createElement(OrganizationNextSteps, { attendance: true, locale }));
  assert.match(full, /href="\/schedule"/);
  assert.match(full, /setup-next-steps/);
}
const { validateOrganizationSetup, validateOrganizationName } = load('lib/organization-validation.ts');
assert.equal(validateOrganizationName('Company', 'en'), null);
assert.equal(validateOrganizationName('   ', 'ru').field, 'companyName');
assert.equal(validateOrganizationName('', 'en').message, 'Enter the organization name.');
const setupDraft = { companyName: 'Company', locationName: 'Office', address: 'Address', latitude: '0', longitude: '0' };
assert.equal(validateOrganizationSetup({ ...setupDraft, attendanceTrackingEnabled: false, billingCountry: 'AE', address: '', latitude: '', longitude: '' }, 'update', true, 'en'), null);
assert.equal(validateOrganizationSetup({ ...setupDraft, attendanceTrackingEnabled: false, billingCountry: 'XX' }, 'update', false, 'en').field, 'billingCountry');
assert.equal(validateOrganizationSetup({ ...setupDraft, attendanceTrackingEnabled: true, billingCountry: 'AE', latitude: '' }, 'update', false, 'en').field, 'map');
assert.equal(validateOrganizationSetup(setupDraft, 'create', false, 'en'), null);
assert.equal(validateOrganizationSetup({ ...setupDraft, companyName: ' ' }, 'create', false, 'ru').field, 'companyName');
assert.equal(validateOrganizationSetup({ ...setupDraft, locationName: '' }, 'create-location', false, 'en').field, 'locationName');
assert.equal(validateOrganizationSetup(setupDraft, 'create', true, 'en').field, 'map');
for (const invalid of [{ address: '' }, { latitude: '' }, { latitude: 'NaN' }, { longitude: '181' }]) {
  assert.equal(validateOrganizationSetup({ ...setupDraft, ...invalid }, 'create', false, 'en').field, 'map');
}
const { readActivityContext } = load('lib/activity-context.ts');
const { activityReturnHref, taskHref, employeeHref, safeActivityReturnHref } = load('lib/activity-task-navigation.ts', { '@/lib/admin-routes': { toAdminHref: value => value } });
const returnHref = activityReturnHref({ dateFrom: '2026-09-01', dateTo: '2026-09-18', companyId: 'c1', locationId: 'l1' });
const linkedHref = taskHref('task/a', returnHref);
assert.equal(safeActivityReturnHref(new URL(linkedHref, 'https://hiteam.net').search), returnHref);
assert.match(linkedHref, /taskId=task%2Fa/);
assert.equal(safeActivityReturnHref(new URL(employeeHref('employee/a', returnHref), 'https://hiteam.net').search), returnHref);
assert.equal(safeActivityReturnHref('?returnTo=https%3A%2F%2Fevil.example'), null);
const defaults = { dateFrom: '2026-09-01', dateTo: '2026-09-18' };
const restored = readActivityContext('?dateFrom=2026-08-01&dateTo=2026-08-31&companyId=c1&locationId=l1', defaults);
assert.equal(restored.dateFrom, '2026-08-01');
assert.equal(restored.dateTo, '2026-08-31');
assert.equal(restored.companyId, 'c1');
assert.equal(restored.locationId, 'l1');
assert.equal(restored.preset, 'custom');
for (const query of ['', '?dateFrom=2026-02-30&dateTo=2026-03-01', '?dateFrom=2026-09-19&dateTo=2026-09-01']) {
  assert.equal(readActivityContext(query, defaults).dateFrom, defaults.dateFrom);
  assert.equal(readActivityContext(query, defaults).dateTo, defaults.dateTo);
}
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
assert.equal(taskActionAvailability(ownTask, 'creator', []).edit, true);
assert.equal(taskActionAvailability(ownTask, 'worker', []).edit, false);
for (const status of ['DONE', 'CANCELLED']) assert.equal(taskActionAvailability({ ...ownTask, status }, 'creator', []).reschedule, false);
for (const status of ['DONE', 'CANCELLED']) assert.equal(taskActionAvailability({ ...ownTask, status }, 'creator', []).edit, false);
const recurring = { ...ownTask, id: 'recurring:template:worker:2026-09-18' };
assert.equal(taskActionAvailability(recurring, 'creator', [group]).allowed, false);
assert.equal(taskActionAvailability(recurring, 'member', [group]).allowed, false);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).allowed, true);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).comment, false);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).edit, false);
assert.equal(taskActionAvailability(recurring, 'worker', [group]).checklist, false);
assert.equal(taskActionAvailability(ownTask, 'worker', []).checklist, true);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true, photoProofs: task.photoProofs.slice(1) }, 'creator', []).complete, false);
assert.equal(taskActionAvailability({ ...ownTask, requiresPhoto: true }, 'creator', []).complete, true);
console.log('task details rendering tests passed');

const { TaskList } = load('components/task-list.tsx');
const listTasks = [
  { ...task, id: 'unassigned', title: 'Unassigned job', assigneeEmployee: null, group: null, locationId: 'north', location: { id: 'north', name: 'North' } },
  { ...task, id: 'team-task', title: 'Team job', assigneeEmployee: null, group: { name: 'Kitchen' }, locationId: 'south', location: { id: 'south', name: 'South' } },
];
const renderList = (locationId, query) => renderToStaticMarkup(React.createElement(TaskList, {
  tasks: listTasks, locale: 'en', locationId, query, onQueryChange() {}, getTitle: value => value.title, onOpen() {},
}));
assert.ok(renderList('', '').includes('Unassigned job'));
assert.ok(renderList('', '').includes('Team job'));
assert.ok(!renderList('north', '').includes('Team job'));
assert.ok(renderList('', 'Kitchen').includes('Team job'));
assert.ok(!renderList('', 'Kitchen').includes('Unassigned job'));
assert.ok(renderList('', 'missing').includes('No matching tasks'));
assert.ok(renderList('missing', '').includes('No tasks in the selected period'));

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
    '@/components/task-details-editor': { TaskDetailsEditor: () => null },
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

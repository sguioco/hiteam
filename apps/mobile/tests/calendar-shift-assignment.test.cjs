const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/pages/CalendarScreen.tsx'), 'utf8');
const tree = ts.createSourceFile('CalendarScreen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate, node = tree) {
  if (predicate(node)) return node;
  let result;
  ts.forEachChild(node, child => { if (!result) result = find(predicate, child); });
  return result;
}
function evaluate(code, context) {
  const { outputText } = ts.transpileModule(`const tested = ${code};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  return new Function(...Object.keys(context), `${outputText}\nreturn tested;`)(...Object.values(context));
}
function handler(name, context) {
  const node = find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name);
  return evaluate(node.getText(tree), context);
}
function stateContext() {
  const state = {};
  const context = { t: key => key };
  const setters = new Set(source.match(/\bset[A-Z]\w+/g));
  for (const setter of setters) context[setter] = value => {
    state[setter] = typeof value === 'function' ? value(state[setter] ?? []) : value;
  };
  return { state, context };
}

async function run() {
  const employees = [
    { id: 'a', firstName: 'Анна', lastName: 'Иванова', employeeNumber: '10', position: { name: 'Повар' } },
    { id: 'b', firstName: 'Борис', lastName: 'Петров', employeeNumber: '20' },
    { id: 'c', firstName: 'Анна', lastName: 'Сидорова', employeeNumber: '30' },
  ];
  const filter = find(n => ts.isVariableDeclaration(n) && n.name.getText(tree) === 'assignShiftEmployeeOptions').initializer.arguments[0];
  const options = (query, group) => evaluate(filter.getText(tree), {
    assignEmployeeSearch: query, assignGroupFilter: group, sortedManagerEmployees: employees,
    managerGroups: [{ id: 'team', memberships: [{ employeeId: 'a' }, { employeeId: 'b' }] }],
  })().map(({ id }) => id);
  assert.deepEqual(options(' АННА ', ''), ['a', 'c']);
  assert.deepEqual(options('Анна', 'team'), ['a']);
  assert.deepEqual(options('20', ''), ['b']);
  assert.deepEqual(options('повар', ''), ['a']);
  assert.deepEqual(options('нет совпадений', ''), []);

  const bulkButton = find(n => ts.isArrowFunction(n) && n.body.getText(tree).includes('const ids = assignShiftEmployeeOptions.map'));
  let selected = ['c'];
  const toggle = evaluate(bulkButton.getText(tree), {
    assignShiftEmployeeOptions: employees.slice(0, 2),
    setAssignShiftEmployeeIds: update => { selected = update(selected); },
  });
  toggle();
  assert.deepEqual(selected, ['c', 'a', 'b']);
  toggle();
  assert.deepEqual(selected, ['c']);

  const { state, context } = stateContext();
  let payload;
  Object.assign(context, {
    templateLocationId: '',
    templateDraft: { name: ' Вечер ', startsAt: { hour: 15, minute: 30 }, endsAt: { hour: 23, minute: 0 }, weekDays: [2], fixedBreakEnabled: true, fixedBreakStartsAt: { hour: 19, minute: 0 }, fixedBreakDurationMinutes: '45' },
    buildClientTemplateCode: name => name,
    formatLocalTime: ({ hour, minute }) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    parseLocalTime: () => ({ hour: 19, minute: 0 }),
    createDefaultShiftTemplateDraft: () => ({}),
    createManagerShiftTemplate: async value => { payload = value; return { ...value, id: 'new' }; },
  });
  await handler('submitShiftTemplateCreation', context)();
  assert.equal(payload.name, 'Вечер');
  assert.equal(payload.locationId, undefined);
  assert.equal(payload.startsAtLocal, '15:30');
  assert.equal(payload.endsAtLocal, '23:00');
  assert.equal(payload.fixedBreakDurationMinutes, 45);
  assert.deepEqual(payload.weekDays, [2]);
  assert.equal(state.setAssignShiftTemplateId, 'new');
  assert.equal(state.setAssignShiftBreakDurationMinutes, '45');
  payload = null;
  context.templateDraft.weekDays = [];
  await handler('submitShiftTemplateCreation', context)();
  assert.equal(payload, null);
  assert.equal(state.setAssignShiftError, 'calendar.shiftTemplateValidation');
  context.templateDraft.weekDays = [1];
  context.templateDraft.fixedBreakDurationMinutes = '241';
  await handler('submitShiftTemplateCreation', context)();
  assert.equal(payload, null);
  assert.equal(state.setAssignShiftError, 'calendar.fixedBreakValidation');

  Object.assign(context, {
    assignShiftEmployeeIds: ['a', 'b'], assignShiftTemplateId: 'new',
    assignShiftBreakDurationMinutes: '0', assignShiftBreakEnabled: false,
    canAssignShiftForSelectedDay: true, editingShiftId: null, selectedDayKey: '2026-10-01',
    createManagerShift: async ({ employeeId }) => {
      if (employeeId === 'b') throw new Error('Unavailable');
      return { id: 'shift-a', employeeId };
    },
  });
  await handler('submitManagerShiftAssignment', context)();
  assert.deepEqual(state.setManagerShifts, [{ id: 'shift-a', employeeId: 'a' }]);
  assert.deepEqual(state.setAssignShiftEmployeeIds, ['b']);
  assert.equal(state.setAssignShiftSheetVisible, undefined);
  assert.equal(state.setAssignShiftSubmitting, false);

  // Time editing must stay inside the assignment's native modal.
  const assignment = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(tree) === 'BottomSheetModal' && n.openingElement.getText(tree).includes('visible={assignShiftSheetVisible}'));
  assert.ok(assignment);
  const panel = find(n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(tree) === 'TimeWheelPickerPanel', assignment);
  const apply = panel.attributes.properties.find(n => n.name?.getText(tree) === 'onApply').initializer.expression;
  for (const [target, field] of [['start', 'startsAt'], ['end', 'endsAt'], ['break', 'fixedBreakStartsAt']]) {
    let draft = { startsAt: { hour: 9, minute: 0 }, endsAt: { hour: 18, minute: 0 }, fixedBreakStartsAt: { hour: 13, minute: 0 } };
    const value = { hour: 16, minute: 25 };
    evaluate(apply.getText(tree), {
      templateTimePickerTarget: target,
      setTemplateDraft: update => { draft = update(draft); },
      setTemplateTimePickerTarget: next => assert.equal(next, null),
    })(value);
    assert.deepEqual(draft[field], value);
  }
  assert.equal((assignment.getText(tree).match(/<TimeWheelPickerPanel/g) ?? []).length, 4);
  assert.doesNotMatch(assignment.getText(tree), /<TimeWheelPicker\s/);
  assert.match(assignment.getText(tree), /keyboardShouldPersistTaps="handled"/);
  assert.match(assignment.getText(tree), /const nextId = isSelected \? "" : template.id/);
  assert.doesNotMatch(source, /if \(!assignShiftTemplateId && shiftTemplates\[0\]\)/);
  console.log('calendar shift assignment regression tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });

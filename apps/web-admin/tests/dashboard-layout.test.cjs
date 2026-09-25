const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const activityPageSource = readFileSync(join(__dirname, "../app/activity/activity-page-client.tsx"), "utf8");
const leaderboardSource = readFileSync(join(__dirname, "../components/leaderboard-center.tsx"), "utf8");
const employeesSource = readFileSync(join(__dirname, "../components/Employees.tsx"), "utf8");
const scheduleSource = readFileSync(join(__dirname, "../components/Schedule.tsx"), "utf8");
const taskDialogSource = readFileSync(join(__dirname, "../components/task-details-dialog.tsx"), "utf8");
const dashboardHomeSource = readFileSync(join(__dirname, "../components/dashboard-home.tsx"), "utf8");
const dashboardTasksSource = readFileSync(join(__dirname, "../components/dashboard/TasksSidebar.tsx"), "utf8");

assert.match(activityPageSource, /<WorkspacePageHeader description=/, "Activity must leave its page title to AdminShell.");
assert.match(leaderboardSource, /<WorkspacePageHeader\s+description=/, "Leaderboard must leave its page title to AdminShell.");
assert.match(leaderboardSource, /aria-label=\{localize\(locale, "Предыдущий месяц", "Previous month"\)\}/, "Leaderboard month navigation needs an accessible previous label.");
assert.match(leaderboardSource, /aria-label=\{localize\(locale, "Следующий месяц", "Next month"\)\}/, "Leaderboard month navigation needs an accessible next label.");
assert.match(employeesSource, /<WorkspacePageHeader\s+description=/, "Employees must leave its page title to AdminShell.");
assert.match(scheduleSource, /<WorkspacePageHeader\s+description=/, "Calendar must leave its page title to AdminShell.");
assert.match(scheduleSource, /aria-label=\{day\.toLocaleDateString\(locale === "ru"/, "Calendar day controls need a complete localized date as their accessible name.");
assert.match(taskDialogSource, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?returnFocusRef\.current\.focus\(\)/, "Task dialog must return focus to its opening control.");
assert.match(dashboardHomeSource, /tasks=\{personalTasks\}\s+showTeamTasksLink=\{!isEmployeeMode\}/, "The personal task widget must offer managers a route to the team task list.");
assert.match(dashboardTasksSource, /"Мои задачи", "My tasks"/, "The personal task widget must identify its scope.");
assert.match(dashboardTasksSource, /aria-label=\{localize\(locale, "Фильтр типов задач", "Task type filter"\)\}/, "The task kind filter must have an accessible name.");

function hasDeclaration(selector, declaration) {
  let start = source.indexOf(`${selector} {`);

  assert.notEqual(start, -1, `${selector} rule must exist.`);

  while (start !== -1) {
    const end = source.indexOf("\n}", start);
    const rule = source.slice(start, end + 2);
    if (declaration.test(rule)) {
      return true;
    }
    start = source.indexOf(`${selector} {`, start + selector.length + 1);
  }

  return false;
}

assert.ok(
  hasDeclaration(".dashboard-main-card", /min-width:\s*0;/),
  "The dashboard grid item must be allowed to shrink instead of expanding past the viewport.",
);
assert.ok(
  hasDeclaration(".dashboard-activity-shell", /min-width:\s*0;/),
  "The nested activity grid must not impose its content width on the parent grid.",
);
assert.ok(
  hasDeclaration(".today-attendance-head", /flex-wrap:\s*wrap;/),
  "Attendance controls must wrap before the attendance count can overflow horizontally.",
);
assert.ok(
  hasDeclaration(".today-attendance-panel", /grid-template-rows:\s*auto auto minmax\(0, 1fr\);/),
  "Attendance summary must have its own row above the scrolling employee list.",
);
assert.ok(hasDeclaration(".page-shell", /min-width:\s*0;/), "Page content must shrink within a mobile viewport.");
assert.ok(hasDeclaration(".team-tasks-page", /grid-template-rows:\s*auto auto minmax\(0, 1fr\);/), "Task view controls must have a compact row separate from the list.");
assert.ok(hasDeclaration(".team-tasks-page > .team-tasks-view-switch", /grid-row:\s*2;/), "Task view controls must not occupy the scrolling list row.");
assert.ok(hasDeclaration(".team-tasks-page:has(.warning-banner) > .team-tasks-view-switch", /grid-row:\s*3;/), "Task view controls must stay below errors without stretching.");
assert.ok(hasDeclaration(".team-tasks-table-shell.leaderboard-table-shell", /overflow-x:\s*auto;/), "Wide leaderboard tables must scroll inside their card.");
assert.match(leaderboardSource, /flex min-h-0 min-w-0 flex-col gap-5/, "Leaderboard content must shrink inside the page grid.");
const tasksSource = readFileSync(join(__dirname, "../components/manager-tasks-page.tsx"), "utf8");
assert.match(tasksSource, /apiRequest<OrganizationLocationSummary\[\]>\("\/org\/locations"/, "Task location choices must come from the authorized organization directory.");
assert.match(tasksSource, /availableLocations\.map\(\(location\) => \(\{ value: location\.id, label: location\.name \}\)\)/, "Task locations must not depend on employee assignments.");
const adminShellSource = readFileSync(join(__dirname, "../components/admin-shell.tsx"), "utf8");
assert.match(adminShellSource, /if \(!accountMenuOpen && window\.matchMedia\("\(max-width: 1180px\)"\)\.matches\) \{\s*setCompactSidebarOpen\(true\);\s*\}/, "The account menu must open inside the expanded compact sidebar.");

const overviewSource = readFileSync(join(__dirname, "../lib/attendance-overview.ts"), "utf8");
const overviewExports = {};
vm.runInNewContext(ts.transpileModule(overviewSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: overviewExports });
const counts = overviewExports.summarizeAttendance([
  { hasSession: true, isActive: true, isLate: false },
  { hasSession: true, isActive: false, isLate: true },
  { hasSession: false, isActive: false, isLate: false },
]);
assert.equal(counts.active, 1);
assert.equal(counts.checked, 2);
assert.equal(counts.late, 1);
assert.equal(counts.missing, 1);

const dashboardSource = readFileSync(join(__dirname, "../components/dashboard-home.tsx"), "utf8");
assert.ok(dashboardSource.indexOf("<TodayAttendancePanel") < dashboardSource.indexOf("<DailyActivityPanel"), "Attendance must appear before activity on the manager dashboard.");

console.log("dashboard layout tests passed");

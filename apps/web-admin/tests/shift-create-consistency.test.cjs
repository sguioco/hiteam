const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const headerDialog = fs.readFileSync(
  path.join(root, "components", "header-shift-create-dialog.tsx"),
  "utf8",
);
const schedule = fs.readFileSync(
  path.join(root, "components", "Schedule.tsx"),
  "utf8",
);
const dashboard = fs.readFileSync(
  path.join(root, "components", "dashboard-home.tsx"),
  "utf8",
);

assert.match(headerDialog, /schedule-shift-dialog-actions/);
assert.match(headerDialog, /"Шаблоны", "Templates"/);
assert.match(headerDialog, /"Создать смену", "Create shift"/);
assert.match(headerDialog, /mx-auto flex size-7[\s\S]*fontSize: 9/);
assert.match(headerDialog, /apiRequest<NamedEntityOption\[]>\("\/org\/locations"/);

assert.match(schedule, /editingShiftId \? ui\.saveShift : ui\.createShift/);
assert.match(schedule, /mx-auto flex size-7[\s\S]*fontSize: 9/);
assert.doesNotMatch(dashboard, /DashboardCreateShiftDraft/);
assert.doesNotMatch(dashboard, /openDashboardCreateShift/);

console.log("shift create dialog consistency checks passed");

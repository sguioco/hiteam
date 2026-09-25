const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(join(__dirname, "../lib/activity-task-navigation.ts"), "utf8");
const navigationExports = {};
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  {
    exports: navigationExports,
    URLSearchParams,
    require: (id) => {
      assert.equal(id, "@/lib/admin-routes");
      return { toAdminHref: (path) => path };
    },
  },
);

const context = {
  dateFrom: "2026-09-11",
  dateTo: "2026-09-24",
  companyId: "company-one",
  locationId: "location-two",
};
const returnTo = navigationExports.activityReturnHref(context);
assert.equal(returnTo, "/activity?dateFrom=2026-09-11&dateTo=2026-09-24&companyId=company-one&locationId=location-two");

const task = new URL(navigationExports.taskHref("task-one", returnTo), "https://hiteam.test");
assert.equal(task.pathname, "/tasks");
assert.equal(task.searchParams.get("taskId"), "task-one");
assert.equal(navigationExports.safeActivityReturnHref(task.search), returnTo);

const employee = new URL(navigationExports.employeeHref("employee-one", returnTo), "https://hiteam.test");
assert.equal(employee.pathname, "/employees/employee-one");
assert.equal(navigationExports.safeActivityReturnHref(employee.search), returnTo);

assert.equal(navigationExports.safeActivityReturnHref("?returnTo=https%3A%2F%2Fevil.test"), null);
assert.equal(navigationExports.safeActivityReturnHref("?returnTo=%2F%2Fevil.test%2Factivity%3FdateFrom%3Dx"), null);
assert.equal(new URL(navigationExports.taskHref("task-one", "https://evil.test"), "https://hiteam.test").searchParams.has("returnTo"), false);

console.log("activity task navigation tests passed");

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertContains(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function testMobileTaskApiUsesSharedBackend() {
  const source = read("lib/api.ts");

  assert.match(
    source,
    /export async function updateMyTaskStatus[\s\S]*authRequest<TaskItem>\(`\/collaboration\/tasks\/\$\{taskId\}\/status`,\s*\{[\s\S]*method:\s*"POST"[\s\S]*body:\s*JSON\.stringify\(\{\s*status\s*\}\)/,
    "Mobile task status updates must hit the shared backend collaboration endpoint.",
  );
  assert.match(
    source,
    /export async function createManagerTask[\s\S]*authRequest<TaskItem>\("\/collaboration\/tasks",\s*\{[\s\S]*method:\s*"POST"[\s\S]*body:\s*JSON\.stringify\(payload\)/,
    "Mobile one-off task creation must hit the shared backend collaboration endpoint.",
  );
  assert.match(
    source,
    /export async function createManagerTaskTemplate[\s\S]*authRequest<TaskTemplateItem>\("\/collaboration\/task-templates",\s*\{[\s\S]*method:\s*"POST"[\s\S]*body:\s*JSON\.stringify\(payload\)/,
    "Mobile recurring task creation must hit the shared backend task-template endpoint.",
  );
}

function testMobileScreensUseSharedTaskApi() {
  const today = read("src/pages/TodayScreen.tsx");
  const calendar = read("src/pages/CalendarScreen.tsx");
  const managerCreateTask = read("app/manager/create-task.tsx");

  assertContains(
    today,
    "updateMyTaskStatus",
    "Today screen must update task status through the shared backend API helper.",
  );
  assertContains(
    calendar,
    "updateMyTaskStatus",
    "Calendar screen must update task status through the shared backend API helper.",
  );
  assertContains(
    managerCreateTask,
    "createManagerTask({",
    "Mobile manager one-off task creation must use the shared backend API helper.",
  );
  assertContains(
    managerCreateTask,
    "createManagerTaskTemplate({",
    "Mobile manager recurring task creation must use the shared backend API helper.",
  );
}

testMobileTaskApiUsesSharedBackend();
testMobileScreensUseSharedTaskApi();

console.log("mobile launch flow tests passed");

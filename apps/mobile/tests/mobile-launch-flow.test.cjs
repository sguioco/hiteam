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

function testMobileOwnerRegistrationUsesSharedBackend() {
  const api = read("lib/api.ts");
  const authScreen = read("src/pages/AuthScreen.tsx");

  assertContains(
    api,
    "export async function registerOrganizationOwner(",
    "Mobile owner registration must expose a dedicated API helper.",
  );
  assertContains(
    api,
    'fetchWithTimeout("/api/v1/auth/register-owner"',
    "Mobile owner registration must call the shared backend registration endpoint.",
  );
  assertContains(
    api,
    'employeeNumber: "OWNER-0001"',
    "Mobile owner registration must provide the backend-only owner employee number.",
  );
  assertContains(
    authScreen,
    "registerOrganizationOwner(",
    "The mobile sign-up form must submit through the shared backend helper.",
  );
  assert.match(
    authScreen,
    /mode === ['"]signup['"]/,
    "The mobile auth screen must include the sign-up mode.",
  );
}

testMobileTaskApiUsesSharedBackend();
testMobileScreensUseSharedTaskApi();
testMobileOwnerRegistrationUsesSharedBackend();

console.log("mobile launch flow tests passed");

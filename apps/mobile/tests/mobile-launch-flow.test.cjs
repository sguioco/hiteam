const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
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
    /export async function createManagerTask[\s\S]*authRequest<TaskItem>\("\/collaboration\/tasks",\s*\{[\s\S]*method:\s*"POST"[\s\S]*locationId:\s*payload\.locationId \?\? getWorkspaceScope\(\)\?\.locationId/,
    "Mobile one-off task creation must hit the shared backend collaboration endpoint.",
  );
  assert.match(
    source,
    /export async function createManagerTaskTemplate[\s\S]*authRequest<TaskTemplateItem>\("\/collaboration\/task-templates",\s*\{[\s\S]*method:\s*"POST"[\s\S]*locationId:\s*payload\.locationId \?\? getWorkspaceScope\(\)\?\.locationId/,
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
  assertContains(
    authScreen,
    "completeAuthenticatedEntry(session, 'organization')",
    "A newly registered owner must immediately enter organization setup.",
  );
  assertContains(
    authScreen,
    "localAsUtc - currentSecond",
    "Timezone labels must calculate offsets without shortOffset support.",
  );
  assert.match(
    api,
    /response\.status === 409[\s\S]*return await authenticateSession/,
    "Registration must recover when the account was created before a retry conflict.",
  );
  assert.match(
    authScreen,
    /mode === ['"]signup['"]/,
    "The mobile auth screen must include the sign-up mode.",
  );
}

function testMobileOrganizationSetupUsesSharedBackend() {
  const api = read("lib/api.ts");
  const setupFlow = read("lib/workspace-setup.ts");
  const organization = read("app/onboarding/organization.tsx");

  assertContains(
    api,
    'authRequest<MobileOrganizationSetup>("/org/setup")',
    "Mobile organization onboarding must load setup state from the shared backend.",
  );
  assertContains(
    api,
    'authRequest<MobileOrganizationSetup>("/org/setup", {',
    "Mobile organization onboarding must save workplace settings to the shared backend.",
  );
  assertContains(
    organization,
    "createManagerTeam({",
    "Mobile organization onboarding must create the first team through the shared backend.",
  );
  assertContains(
    organization,
    "createManagerShiftTemplate({",
    "Mobile organization onboarding must create a reusable shift template.",
  );
  assertContains(
    setupFlow,
    "return 'organization';",
    "Incomplete organization setup must route owners to mobile organization onboarding.",
  );
  assertContains(
    setupFlow,
    "organizationSetup?.attendanceTrackingEnabled === false",
    "Tasks-only organizations must skip biometric and location onboarding.",
  );
  assertContains(
    organization,
    "const MIN_RADIUS_METERS = 50;",
    "Mobile organization onboarding must allow a 50 meter geofence radius.",
  );
  assertContains(
    organization,
    "const DEFAULT_RADIUS_METERS = 100;",
    "Mobile organization onboarding must keep the default radius at 100 meters.",
  );
  assert.match(
    organization,
    /WEEK_DAYS\.map[\s\S]*containerClassName="flex-1"[\s\S]*setTimeField\('start'\)[\s\S]*containerClassName="flex-1"[\s\S]*setTimeField\('end'\)/,
    "Organization schedule controls must apply flex sizing to the outer PressableScale container.",
  );
}

function testMobileManagerCanCreateTeamsAfterOnboarding() {
  const api = read("lib/api.ts");
  const manager = read("src/pages/ManagerScreen.tsx");
  const createTeam = read("app/manager/create-team.tsx");

  assertContains(
    manager,
    '"/manager/create-team"',
    "The mobile manager create menu must expose team creation after onboarding.",
  );
  assertContains(
    createTeam,
    "createManagerTeam({",
    "The mobile create-team screen must use the shared backend API helper.",
  );
  assertContains(
    createTeam,
    "memberEmployeeIds: selectedMemberIds",
    "The mobile create-team screen must submit the selected employees.",
  );
  assert.match(
    api,
    /export async function createManagerTeam[\s\S]*memberEmployeeIds\?: string\[\][\s\S]*authRequest<WorkGroupItem>\("\/collaboration\/teams"/,
    "Mobile team creation must submit members to the shared collaboration endpoint.",
  );
}

function testExpoImagePickerMatchesExpoSdk() {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(
    packageJson.dependencies["expo-image-picker"],
    "~17.0.11",
    "Expo SDK 54 must use the compatible expo-image-picker 17 native module.",
  );
}

function testExpoNativeDependenciesMatchSdk54() {
  const packageJson = JSON.parse(read("package.json"));
  const expectedDependencies = {
    expo: "~54.0.37",
    "expo-constants": "~18.0.14",
    "expo-file-system": "~19.0.24",
    "expo-font": "~14.0.12",
    "expo-image-picker": "~17.0.11",
    "expo-linking": "~8.0.12",
    "expo-localization": "~17.0.9",
    "expo-notifications": "~0.32.17",
    "expo-router": "~6.0.24",
    "expo-updates": "~29.0.20",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-svg": "15.12.1",
  };

  for (const [dependency, expectedVersion] of Object.entries(
    expectedDependencies,
  )) {
    assert.equal(
      packageJson.dependencies[dependency],
      expectedVersion,
      `${dependency} must stay compatible with Expo SDK 54.`,
    );
  }
  assert.equal(
    packageJson.devDependencies["@types/react"],
    "~19.1.10",
    "@types/react must stay compatible with Expo SDK 54.",
  );
}

function testExpoConfigHasOneSourceOfTruth() {
  const appConfig = read("app.config.js");
  const baseConfig = JSON.parse(read("app.base.json"));

  assert.equal(
    existsSync(join(root, "app.json")),
    false,
    "Expo must not load competing app.json and app.config.js files.",
  );
  assertContains(
    appConfig,
    "require('./app.base.json').expo",
    "The dynamic Expo config must load the shared base config.",
  );
  assert.equal(baseConfig.expo.userInterfaceStyle, "light");
}

function testAllPhotoFlowsUseSharedSdkCompatibleImagePicker() {
  const photoFlowFiles = [
    "app/auth/register/[token].tsx",
    "app/onboarding/organization.tsx",
    "src/components/TaskList.tsx",
    "src/pages/AuthScreen.tsx",
    "src/pages/CreateNewsScreen.tsx",
  ];

  for (const file of photoFlowFiles) {
    assertContains(
      read(file),
      "expo-image-picker",
      `${file} must use the shared SDK-compatible expo-image-picker dependency.`,
    );
  }
}

function testAndroidBirthDateUsesSpinnerPicker() {
  const invitedEmployeeRegistration = read("app/auth/register/[token].tsx");
  const authScreen = read("src/pages/AuthScreen.tsx");

  assert.match(
    invitedEmployeeRegistration,
    /birthDatePickerVisible[\s\S]*<DateTimePicker[\s\S]*display="spinner"[\s\S]*mode="date"/,
    "Invited employee registration must use the spinner birth date picker on Android.",
  );
  assert.match(
    authScreen,
    /Platform\.OS === ['"]ios['"][\s\S]*display="spinner"[\s\S]*joinProfileDatePickerVisible[\s\S]*<DateTimePicker[\s\S]*display="spinner"/,
    "The join profile flow must use the spinner birth date picker on both iOS and Android.",
  );
}

function testMobileLocationQualityControls() {
  const location = read("lib/location.ts");
  const organization = read("app/onboarding/organization.tsx");
  const packageJson = JSON.parse(read("package.json"));
  const appConfig = JSON.parse(read("app.base.json"));

  assertContains(
    location,
    "export const SETUP_LOCATION_COLLECTION_DURATION_MS = 12_000;",
    "Organization setup must collect location samples for 12 seconds.",
  );
  assertContains(
    location,
    "export const MAX_SETUP_LOCATION_ACCURACY_METERS = 100;",
    "Organization setup must reject GPS accuracy worse than 100 meters.",
  );
  assertContains(
    location,
    "Location.watchPositionAsync(",
    "Mobile location capture must collect multiple GPS samples.",
  );
  assertContains(
    location,
    "durationMs: ATTENDANCE_LOCATION_COLLECTION_DURATION_MS",
    "Attendance capture must use the multi-sample location helper.",
  );
  assertContains(
    location,
    'permissions.checkLocationAccuracy()',
    "iOS onboarding must read the real Full/Reduced Accuracy authorization.",
  );
  assertContains(
    location,
    'permissions.requestLocationAccuracy({',
    "iOS must be able to request temporary precise location access.",
  );
  assert.doesNotMatch(
    location,
    /Platform\.OS === "ios"[\s\S]{0,160}accuracyMeters > 500/,
    "A weak indoor GPS fix must not be mistaken for a disabled iOS permission.",
  );
  assert.equal(
    packageJson.dependencies["react-native-permissions"],
    "5.6.1",
    "The native iOS accuracy authorization API must be pinned.",
  );
  assert.deepEqual(
    appConfig.expo.ios.infoPlist.NSLocationTemporaryUsageDescriptionDictionary,
    {
      attendanceVerification:
        "HiTeam needs precise location temporarily to confirm that you are inside the approved workplace when starting or ending a shift.",
    },
    "iOS must declare the temporary precise-location purpose key.",
  );
  assert.ok(
    appConfig.expo.plugins.some(
      (plugin) =>
        Array.isArray(plugin) &&
        plugin[0] === "react-native-permissions" &&
        plugin[1]?.iosPermissions?.includes("LocationAccuracy"),
    ),
    "The iOS native build must include the LocationAccuracy permission handler.",
  );
  assertContains(
    organization,
    "captureBestLocationOverTime({",
    "Organization setup must choose the best collected GPS sample.",
  );
  assertContains(
    organization,
    "mapRef.current?.fitToCoordinates(",
    "Organization setup map must fit the geofence boundary.",
  );
  assertContains(
    organization,
    "pendingLocation",
    "Organization setup must require confirmation for ambiguous addresses.",
  );
  assertContains(
    organization,
    "PLUS_CODE_PATTERN",
    "Organization setup must detect Plus Code addresses.",
  );
}

function testWorkspaceReadyRequiresARealSession() {
  const api = read("lib/api.ts");
  const authFlow = read("lib/auth-flow.ts");
  const workspaceReady = read("app/onboarding/workspace-ready.tsx");
  const invitedEmployeeRegistration = read("app/auth/register/[token].tsx");

  assert.match(
    api,
    /export async function getDemoSession[\s\S]*handleUnauthorized\(\);[\s\S]*Not authenticated\. Sign in again\./,
    "Missing persisted sessions must reset auth state instead of leaving onboarding open.",
  );
  assert.match(
    authFlow,
    /export function signInLocally[\s\S]*const session = getCachedDemoSession\(\);[\s\S]*if \(!session\)[\s\S]*return false;/,
    "Local auth state must never become authenticated without a real API session.",
  );
  assert.match(
    invitedEmployeeRegistration,
    /if \(signInLocally\(\{ workspaceSetupStep: 'location' \}\)\)[\s\S]*workspace-ready[\s\S]*router\.replace\('\/'/,
    "Biometric return must fall back to sign-in when its API session is gone.",
  );
  assertContains(
    workspaceReady,
    "disabled={locationStatus.status !== 'ready' || finishing}",
    "Workspace Continue must prevent duplicate requests while finishing.",
  );
}

function testRootStartupNeverStaysBlank() {
  const rootLayout = read("app/_layout.tsx");

  assertContains(
    rootLayout,
    "export function ErrorBoundary",
    "Mobile routes must render a recoverable error screen instead of a white screen.",
  );
  assertContains(
    rootLayout,
    "setStartupDeadlineReached(true)",
    "Mobile startup must have a deadline when an initializer hangs.",
  );
  assertContains(
    rootLayout,
    "<ActivityIndicator",
    "Mobile startup must render visible progress instead of returning null.",
  );
  assert.doesNotMatch(
    rootLayout,
    /if \(!fontsLoaded[\s\S]{0,300}return null;/,
    "Mobile startup must not return a permanent blank screen while fonts load.",
  );
}

testMobileTaskApiUsesSharedBackend();
testMobileScreensUseSharedTaskApi();
testMobileOwnerRegistrationUsesSharedBackend();
testMobileOrganizationSetupUsesSharedBackend();
testMobileManagerCanCreateTeamsAfterOnboarding();
testExpoImagePickerMatchesExpoSdk();
testExpoNativeDependenciesMatchSdk54();
testExpoConfigHasOneSourceOfTruth();
testAllPhotoFlowsUseSharedSdkCompatibleImagePicker();
testAndroidBirthDateUsesSpinnerPicker();
testMobileLocationQualityControls();
testWorkspaceReadyRequiresARealSession();
testRootStartupNeverStaysBlank();

console.log("mobile launch flow tests passed");

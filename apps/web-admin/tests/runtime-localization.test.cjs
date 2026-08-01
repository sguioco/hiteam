const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const api = fs.readFileSync(path.join(root, "lib", "api.ts"), "utf8");
const liveTranslation = fs.readFileSync(
  path.join(root, "lib", "live-translation.ts"),
  "utf8",
);
const dashboard = fs.readFileSync(
  path.join(root, "components", "dashboard-home.tsx"),
  "utf8",
);
const validation = fs.readFileSync(
  path.join(root, "lib", "humanize-validation-error.ts"),
  "utf8",
);
const authSurfaces = [
  path.join(root, "components", "auth-panel.tsx"),
  path.join(root, "components", "login-form.tsx"),
  path.join(root, "components", "signup-form.tsx"),
  path.join(root, "components", "create-organization-panel.tsx"),
  path.join(root, "app", "hi-team", "create-organization", "page.tsx"),
].map((file) => fs.readFileSync(file, "utf8"));
const i18n = fs.readFileSync(path.join(root, "lib", "i18n.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
const landing = fs.readFileSync(
  path.join(root, "components", "sales-landing-page.tsx"),
  "utf8",
);
const mobileApi = fs.readFileSync(
  path.resolve(root, "..", "mobile", "lib", "api.ts"),
  "utf8",
);
const mobileI18n = fs.readFileSync(
  path.resolve(root, "..", "mobile", "lib", "i18n.tsx"),
  "utf8",
);
const adminShell = fs.readFileSync(
  path.join(root, "components", "admin-shell.tsx"),
  "utf8",
);
const todayAttendance = fs.readFileSync(
  path.join(root, "components", "dashboard", "TodayAttendancePanel.tsx"),
  "utf8",
);
const globalStyles = fs.readFileSync(
  path.join(root, "app", "globals.css"),
  "utf8",
);

assert.match(
  validation,
  /Password must contain at least \$\{minLength\} characters/,
);
assert.match(validation, /humanizeSingleValidationError\(item, locale\)/);
assert.match(api, /humanizeValidationError\(payload\.message, locale\)/);
assert.match(api, /API_ERROR_LOCALIZATIONS/);
assert.match(api, /warmImageCacheFromPayload\(payload\)/);
assert.match(liveTranslation, /const providers = \[[\s\S]*translateViaLibreTranslate[\s\S]*translateViaMyMemory[\s\S]*translateViaGoogleGtx/);
assert.match(dashboard, /const completedAt = status === "DONE"[\s\S]*setTaskBoard[\s\S]*catch \(requestError\)/);

for (const source of authSurfaces) {
  assert.match(source, /useI18n\(\)/);
  assert.doesNotMatch(source, /writeBrowserStorageItem\(['"]smart-admin-locale['"]/);
}

assert.match(i18n, /writeBrowserStorageItem\(STORAGE_KEY, locale\)/);
assert.match(i18n, /writeBrowserStorageItem\("hiteam-landing-locale", locale\)/);
assert.match(layout, /smart-admin-locale[\s\S]*hiteam-landing-locale/);
assert.match(landing, /LANDING_LOCALE_OPTIONS = \["en", "ru"\]/);
assert.doesNotMatch(landing, /useState<LandingLocale>/);

assert.match(mobileApi, /export function setApiLanguage/);
assert.match(mobileApi, /humanizeValidationMessage\(message, locale\)/);
assert.match(mobileI18n, /setApiLanguage\(language\)/);
assert.match(adminShell, /function LocaleFlagIcon/);
assert.doesNotMatch(adminShell, /\/(?:ru|en)\.png/);
assert.match(
  todayAttendance,
  /today-attendance-row-metrics[\s\S]*today-attendance-row-lines[\s\S]*today-attendance-row-side[\s\S]*row\.note[\s\S]*row\.time/,
);
assert.match(
  globalStyles,
  /\.today-attendance-row-metrics\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) max-content/,
);

console.log("runtime localization checks passed");

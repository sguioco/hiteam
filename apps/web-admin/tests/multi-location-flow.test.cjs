const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const organization = fs.readFileSync(
  path.join(root, "app/organization/organization-page-client.tsx"),
  "utf8",
);
const employees = fs.readFileSync(
  path.join(root, "components/Employees.tsx"),
  "utf8",
);
const schedule = fs.readFileSync(
  path.join(root, "components/Schedule.tsx"),
  "utf8",
);
const bootstrap = fs.readFileSync(
  path.resolve(root, "..", "api", "src", "modules", "bootstrap", "bootstrap.service.ts"),
  "utf8",
);
const chunkRecovery = fs.readFileSync(
  path.join(root, "lib", "chunk-load-recovery.ts"),
  "utf8",
);
const adminShell = fs.readFileSync(
  path.join(root, "components", "admin-shell.tsx"),
  "utf8",
);
const profilePage = fs.readFileSync(
  path.join(root, "app", "profile", "page.tsx"),
  "utf8",
);
const employeeDetail = fs.readFileSync(
  path.join(root, "app", "employees", "[employeeId]", "employee-detail-page-client.tsx"),
  "utf8",
);
const analytics = fs.readFileSync(
  path.join(root, "app", "analytics", "analytics-page-client.tsx"),
  "utf8",
);

assert.match(organization, /\/org\/companies/);
assert.match(organization, /startAddLocation/);
assert.match(organization, /organization-studio-scope-actions/);
assert.match(organization, /ADD_LOCATION_SELECT_VALUE/);
assert.match(organization, /Location name/);
assert.match(
  organization,
  /<EmployeeDropdown[\s\S]*searchPlaceholder=[\s\S]*selectedEmployeeIds=/,
  "Location employee assignment must use the searchable, bounded dropdown.",
);
assert.doesNotMatch(
  organization,
  />\s*\{locale === "ru" \? "Адрес" : "Address"\}\s*<\/Button>/,
  "Location creation belongs in the location switcher, not a duplicate header action.",
);
assert.match(
  bootstrap,
  /async organization\(user: JwtUser\)[\s\S]*companies,[\s\S]*locations,[\s\S]*employees,/,
  "Organization must be delivered as one backend bootstrap payload.",
);
assert.doesNotMatch(
  chunkRecovery,
  /\/\\\/_next\\\/static\\\/chunks\\\//,
  "A normal runtime stack from a Next chunk must not trigger a hard reload.",
);
assert.doesNotMatch(
  adminShell,
  /window\.location\.assign\(pendingHref\)/,
  "Slow in-app navigation must retry softly instead of hard-reloading the page.",
);
assert.match(
  profilePage,
  /serverApiRequestWithSession<ProfileEmployee \| null>[\s\S]*\/employees\/me/,
  "Profile data must be prepared on the server before hydration.",
);
assert.match(
  employeeDetail,
  /initialData\?\.locations \?\? \[\]/,
  "Employee detail must hydrate locations from its backend bootstrap.",
);
assert.doesNotMatch(
  analytics,
  /apiRequest<[^>]*>\('\/org\/locations'/,
  "Analytics must not create a separate locations waterfall after mount.",
);
assert.match(
  bootstrap,
  /async analytics\([\s\S]*listLocations\([\s\S]*locations,[\s\S]*period:/,
  "Analytics bootstrap must include readable locations in the first response.",
);
assert.match(employees, /\/employees\/\$\{employeeId\}\/location/);
assert.match(schedule, /templateLocationId/);
assert.doesNotMatch(
  schedule,
  /const location = locations\[0\]/,
  "Template creation must not silently use the first location.",
);

process.stdout.write("web multi-location flow tests passed\n");

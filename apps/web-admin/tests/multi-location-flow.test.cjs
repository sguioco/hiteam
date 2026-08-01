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

assert.match(organization, /\/org\/companies/);
assert.match(organization, /startAddLocation/);
assert.match(organization, /organization-studio-scope-actions/);
assert.match(employees, /\/employees\/\$\{employeeId\}\/location/);
assert.match(schedule, /templateLocationId/);
assert.doesNotMatch(
  schedule,
  /const location = locations\[0\]/,
  "Template creation must not silently use the first location.",
);

process.stdout.write("web multi-location flow tests passed\n");

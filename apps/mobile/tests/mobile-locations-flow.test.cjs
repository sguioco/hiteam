const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const locations = fs.readFileSync(
  path.join(root, "app/locations/index.tsx"),
  "utf8",
);
const profile = fs.readFileSync(
  path.join(root, "src/pages/ProfileScreen.tsx"),
  "utf8",
);
const manager = fs.readFileSync(
  path.join(root, "src/pages/ManagerScreen.tsx"),
  "utf8",
);
const calendar = fs.readFileSync(
  path.join(root, "src/pages/CalendarScreen.tsx"),
  "utf8",
);

assert.match(profile, /router\.push\("\/locations"/);
assert.match(manager, /router\.push\("\/locations"/);
assert.match(locations, /createMobileCompany/);
assert.match(locations, /createMobileLocation/);
assert.match(locations, /capturePreciseAttendanceLocation/);
assert.match(calendar, /templateLocationId/);

process.stdout.write("mobile locations flow tests passed\n");

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = readFileSync(
  join(__dirname, "..", "app", "organization", "organization-page-client.tsx"),
  "utf8",
);

assert.match(
  source,
  /const MIN_GEOFENCE_RADIUS_METERS = 50;/,
  "Organization settings must allow a 50 meter geofence radius.",
);
assert.match(
  source,
  /const DEFAULT_GEOFENCE_RADIUS_METERS = 100;/,
  "The default geofence radius must remain 100 meters.",
);

console.log("web organization geofence radius tests passed");

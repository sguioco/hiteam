const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const picker = readFileSync(
  join(root, "components", "location-map-picker.tsx"),
  "utf8",
);
const organization = readFileSync(
  join(root, "app", "organization", "organization-page-client.tsx"),
  "utf8",
);

assert.match(
  picker,
  /const LOCATION_COLLECTION_DURATION_MS = 12_000;/,
  "Web location setup must collect readings for 12 seconds.",
);
assert.match(
  picker,
  /const MAX_SETUP_LOCATION_ACCURACY_METERS = 100;/,
  "Web location setup must reject readings worse than 100 meters.",
);
assert.match(
  picker,
  /navigator\.geolocation\.watchPosition\(/,
  "Web location setup must collect multiple browser location readings.",
);
assert.match(
  picker,
  /mapRef\.current\.fitBounds\(bounds, 44\)/,
  "Web map must fit the configured geofence instead of forcing a fixed zoom.",
);
assert.doesNotMatch(
  picker,
  /setZoom\(16\)/,
  "Web map must not force zoom level 16.",
);
assert.match(
  picker,
  /requiresManualAddressConfirmation\(result\)/,
  "Plus Codes and incomplete addresses must require explicit confirmation.",
);
assert.match(
  organization,
  /onConfirmationRequiredChange=\{setLocationConfirmationPending\}/,
  "Organization setup must block saving while map confirmation is pending.",
);
assert.match(
  picker,
  /A persisted address with persisted coordinates was already confirmed\.[\s\S]*if \(address\.trim\(\)\)[\s\S]*return;/,
  "A saved location must not ask for the same map confirmation after hydration.",
);
assert.match(
  picker,
  /confirmationPhase[\s\S]*onConfirmedSelectRef[\s\S]*setConfirmationPhase\("closing"\)/,
  "Confirmed points must show saving feedback and animate out after persistence.",
);
assert.match(
  organization,
  /persistConfirmedLocation[\s\S]*\/org\/locations\/\$\{selectedLocationId\}[\s\S]*method: "PATCH"/,
  "Confirming an existing location must persist it immediately.",
);

console.log("web location quality tests passed");

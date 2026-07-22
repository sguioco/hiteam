const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const links = read("lib/mobile-app-links.ts");
const sharedButtons = read("components/landing-page.tsx");
const mobilePage = read("app/mobile/page.tsx");
const salesLanding = read("components/sales-landing-page.tsx");

assert.ok(
  links.includes("https://apps.apple.com/us/app/hiteam/id6769683295"),
  "The shared iOS link must point to the published HiTeam App Store page.",
);
assert.ok(
  links.includes("https://play.google.com/store/apps/details?id=com.HiTeam"),
  "The shared Android link must point to the published HiTeam Play Store page.",
);

for (const [name, source] of [
  ["shared store buttons", sharedButtons],
  ["mobile download page", mobilePage],
  ["sales landing page", salesLanding],
]) {
  assert.ok(
    source.includes("IOS_APP_STORE_URL"),
    `${name} must use the shared iOS store URL.`,
  );
  assert.ok(
    source.includes("GOOGLE_PLAY_STORE_URL"),
    `${name} must use the shared Google Play URL.`,
  );
}

assert.ok(
  !sharedButtons.includes('href="#"'),
  "Shared store buttons must never use a placeholder link.",
);

console.log("web-admin mobile app link tests passed");

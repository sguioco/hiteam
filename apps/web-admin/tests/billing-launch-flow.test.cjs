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

function testBillingPageShowsBackendHistoryAndSeatCheckout() {
  const source = read("app/billing/billing-page-client.tsx");

  assertContains(
    source,
    "history?: BillingPaymentHistoryItem[];",
    "Billing summary must keep backend payment history in the client contract.",
  );
  assertContains(
    source,
    "const history = summary.history ?? [];",
    "Billing invoice rows must prefer backend payment history.",
  );
  assertContains(
    source,
    "<BillingHistoryList invoiceRows={invoiceRows} locale={locale} />",
    "Billing history tab must render the computed invoice rows.",
  );
  assert.match(
    source,
    /apiRequest<BillingRedirectResponse>\("\/billing\/checkout",\s*\{[\s\S]*body:\s*JSON\.stringify\(\{[\s\S]*planMonths:\s*selectedPlan\.paidMonths,[\s\S]*seats:\s*purchasePreview\.targetSeats,[\s\S]*\}\),[\s\S]*method:\s*"POST"/,
    "Billing checkout must send selected plan and target seat count to the backend.",
  );
  assertContains(
    source,
    ': "Buy seats"',
    "Billing page must expose the seat purchase button.",
  );
  assertContains(
    source,
    "openAltegioMarketplace",
    "Unconnected workspaces must be able to start Altegio Marketplace consent.",
  );
  assertContains(
    source,
    "altegioDialogOpen",
    "Altegio connection must use a dedicated dialog.",
  );
  assertContains(
    source,
    "/altegio-logo.png",
    "Altegio connection dialog must display the Altegio logo.",
  );
  assertContains(
    source,
    "buildAltegioMarketplaceConnectUrl",
    "Altegio connection must use the published marketplace short-link.",
  );
  assertContains(
    source,
    "confirmAltegioDisconnect",
    "Connected workspaces must be able to disconnect Altegio.",
  );
  assertContains(
    source,
    '/billing/altegio/disconnect',
    "Disconnect must call the Altegio disconnect API.",
  );
  assertContains(
    source,
    ': "Disconnect"',
    "Connected Altegio card must expose a Disconnect action.",
  );
}

function testSeatLimitDialogLinksEmployeesToBilling() {
  const source = read("components/Employees.tsx");

  assertContains(
    source,
    "Add a seat in Billing before inviting another employee.",
    "Seat-limit copy must tell the user how to resolve missing paid seats.",
  );
  assertContains(
    source,
    'router.push(toAdminHref("/billing"));',
    "Seat-limit dialog must navigate directly to Billing.",
  );
  assertContains(
    source,
    '"Open Billing"',
    "Seat-limit dialog must expose an Open Billing action.",
  );
}

function testDemoBillingMatchesProductionContracts() {
  const source = read("lib/demo-api.ts");

  assertContains(
    source,
    'pathname === "/billing/summary" && method === "GET"',
    "Demo API must keep the billing summary endpoint available.",
  );
  assertContains(
    source,
    'pathname === "/billing/checkout" && method === "POST"',
    "Demo API must keep the billing checkout endpoint available.",
  );
  assertContains(
    source,
    "history: buildDemoBillingHistory({",
    "Demo billing summary must include payment history rows.",
  );
}

function testAltegioRegistrationPrefillsOrganization() {
  const authSource = read("components/auth-panel.tsx");
  const createSource = read("components/create-organization-panel.tsx");
  const organizationSource = read("app/organization/organization-page-client.tsx");
  const signupSource = read("app/signup/page.tsx");
  const marketplaceSource = read("lib/altegio-marketplace.ts");

  assertContains(
    authSource,
    "/altegio/onboarding/preview",
    "Marketplace registration must preview the selected Altegio location.",
  );
  assertContains(
    authSource,
    "setOrganizationName(preview.location.name)",
    "Marketplace registration must prefill the organization name.",
  );
  assertContains(
    createSource,
    "/altegio/onboarding/preview",
    "/create registration must also preview the Altegio location.",
  );
  assertContains(
    createSource,
    "resolvePostLoginRouteWithAltegio",
    "/create must keep the Altegio connect redirect after signup.",
  );
  assertContains(
    signupSource,
    "redirect(suffix ? `/create?${suffix}` : \"/create\")",
    "/signup must preserve Altegio query params when redirecting to /create.",
  );
  assertContains(
    marketplaceSource,
    "buildAltegioMarketplaceConnectUrl",
    "Existing accounts must open the published Altegio short-link for consent.",
  );
  assertContains(
    organizationSource,
    "buildAltegioMarketplaceConnectUrl",
    "Organization setup must link directly to the published Altegio application.",
  );
  assertContains(
    organizationSource,
    "/altegio-logo.png",
    "Organization setup must show the Altegio logo.",
  );
}

testBillingPageShowsBackendHistoryAndSeatCheckout();
testSeatLimitDialogLinksEmployeesToBilling();
testDemoBillingMatchesProductionContracts();
testAltegioRegistrationPrefillsOrganization();

console.log("web-admin billing launch flow tests passed");

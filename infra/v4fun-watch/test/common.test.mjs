import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteSnapshot,
  diffSnapshots,
  extractArtifacts,
  extractTokenRecords,
  isSafeReadEndpoint
} from "../src/common.mjs";

test("extractArtifacts finds scripts, APIs and EVM addresses", () => {
  const result = extractArtifacts(`
    <script src="/_next/static/chunks/app.js"></script>
    const api = "/api/tokens?limit=20";
    const ws = "wss://api.v4.fun/live";
    const factory = "0x1234567890abcdef1234567890abcdef12345678";
  `, "https://www.v4.fun/");
  assert.deepEqual(result.scripts, ["https://www.v4.fun/_next/static/chunks/app.js"]);
  assert.ok(result.endpoints.includes("https://www.v4.fun/api/tokens?limit=20"));
  assert.ok(result.endpoints.includes("wss://api.v4.fun/live"));
  assert.deepEqual(result.evmAddresses, ["0x1234567890abcdef1234567890abcdef12345678"]);
});

test("site diff recognizes waiting to live transition", () => {
  const oldSnapshot = buildSiteSnapshot({
    status: 200,
    finalUrl: "https://www.v4.fun/",
    headers: { etag: "old" },
    body: '<div id="countdown">Markets, but programmable</div><script>const LAUNCH=1</script>',
    latencyMs: 20
  });
  const newSnapshot = buildSiteSnapshot({
    status: 200,
    finalUrl: "https://www.v4.fun/",
    headers: { etag: "new" },
    body: '<script src="/_next/static/app.js"></script>',
    latencyMs: 20
  });
  const diff = diffSnapshots(oldSnapshot, newSnapshot);
  assert.equal(diff.changed, true);
  assert.equal(diff.launchLikely, true);
});

test("token extraction recursively finds named contracts", () => {
  const records = extractTokenRecords({ data: [{ tokenName: "First", ticker: "ONE", contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }] }, "api");
  assert.deepEqual(records, [{
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    name: "First",
    symbol: "ONE",
    source: "api"
  }]);
});

test("token extraction supports the Canopy instant activity shape", () => {
  const records = extractTokenRecords({ items: [{ kind: "new", name: "First", symbol: "ONE", token: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }] }, "agen");
  assert.deepEqual(records, [{
    address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    name: "First",
    symbol: "ONE",
    source: "agen"
  }]);
});

test("only read-only API candidates are polled", () => {
  assert.equal(isSafeReadEndpoint("https://api.v4.fun/v1/tokens"), true);
  assert.equal(isSafeReadEndpoint("https://www.v4.fun/api/create-token"), false);
  assert.equal(isSafeReadEndpoint("wss://api.v4.fun/live"), false);
});

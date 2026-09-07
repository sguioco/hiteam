import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import {
  atomicWriteJson,
  errorMessage,
  extractArtifacts,
  extractTokenRecords,
  fetchLimited,
  formatList,
  isSafeReadEndpoint,
  numberEnv,
  readJson,
  requiredEnv,
  sha256,
  sleep,
  telegramSend
} from "./common.mjs";
import { startHealthServer } from "./health.mjs";

const intervalMs = numberEnv("API_SCAN_INTERVAL_MS", 500, 250);
const timeoutMs = numberEnv("API_REQUEST_TIMEOUT_MS", 1500, 300);
const maxPollEndpoints = numberEnv("API_MAX_POLL_ENDPOINTS", 6, 1);
const seedEndpoints = (process.env.API_SEED_ENDPOINTS?.trim() || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const factoryRpcUrls = (process.env.FACTORY_RPC_URLS?.trim() || process.env.FACTORY_RPC_URL?.trim() || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const factoryAddress = process.env.FACTORY_ADDRESS?.trim().toLowerCase();
const factoryEventTopic = process.env.FACTORY_EVENT_TOPIC?.trim().toLowerCase();
const programmableRegistryAddress = process.env.PROGRAMMABLE_REGISTRY_ADDRESS?.trim().toLowerCase();
const programmableRegistryEventTopic = process.env.PROGRAMMABLE_REGISTRY_EVENT_TOPIC?.trim().toLowerCase();
const factoryWatches = [
  { label: "InstantFactory", address: factoryAddress, topic: factoryEventTopic },
  { label: "ProgrammableRegistry", address: programmableRegistryAddress, topic: programmableRegistryEventTopic }
].filter(({ address, topic }) => address && topic);
const dataDir = process.env.DATA_DIR?.trim() || "/data";
const threadId = Number(requiredEnv("API_TELEGRAM_THREAD_ID"));
const siteSnapshotPath = resolve(dataDir, "site-latest.json");
const siteBodyPath = resolve(dataDir, "site-body.html");
const statePath = resolve(dataDir, "api-runtime.json");

let state = await readJson(statePath, {
  announced: false,
  lastSiteHash: undefined,
  seenAssets: [],
  seenEndpoints: [],
  seenAddresses: [],
  seenTokens: [],
  endpointHashes: {},
  seedBaselinePending: [],
  factoryLastBlock: undefined
});
state.seedBaselinePending ??= [];
for (const endpoint of seedEndpoints) {
  if (!state.seenEndpoints.includes(endpoint)) {
    state.seenEndpoints.push(endpoint);
    state.seedBaselinePending.push(endpoint);
  }
}
let running = true;
let lastStartedAt;
let lastCompletedAt;
let lastError;
let lastRpcError;
let scans = 0;
let endpointPolls = 0;
let rpcCursor = 0;

startHealthServer(numberEnv("HEALTH_PORT", 8112, 1), () => ({
  worker: "api",
  running,
  intervalMs,
  lastStartedAt,
  lastCompletedAt,
  lastError,
  lastRpcError,
  scans,
  endpointPolls,
  discoveredAssets: state.seenAssets.length,
  discoveredEndpoints: state.seenEndpoints.length,
  discoveredAddresses: state.seenAddresses.length,
  discoveredTokens: state.seenTokens.length,
  factoryLastBlock: state.factoryLastBlock
}));

async function tick() {
  const started = Date.now();
  lastStartedAt = new Date(started).toISOString();
  try {
    const siteSnapshot = await readJson(siteSnapshotPath, undefined);
    if (siteSnapshot?.bodyHash && siteSnapshot.bodyHash !== state.lastSiteHash) {
      await scanSiteSnapshot(siteSnapshot);
      state.lastSiteHash = siteSnapshot.bodyHash;
    }
    try {
      await pollFactory();
      lastRpcError = undefined;
    } catch (error) {
      lastRpcError = errorMessage(error);
      console.warn("factory polling failed", lastRpcError);
    }
    await pollKnownEndpoints();
    if (!state.announced) {
      await telegramSend(
        `✅ v4.fun: API/token worker запущен\nИнтервал проверки: ${intervalMs} мс\nБезопасный режим: только GET по обнаруженным read-only endpoints.`,
        threadId
      );
      state.announced = true;
    }
    await atomicWriteJson(statePath, state);
    lastError = undefined;
  } catch (error) {
    lastError = errorMessage(error);
    console.error("api worker tick failed", lastError);
  } finally {
    scans += 1;
    lastCompletedAt = new Date().toISOString();
    const waitMs = Math.max(0, intervalMs - (Date.now() - started));
    if (running) setTimeout(tick, waitMs);
  }
}

async function pollFactory() {
  if (!factoryRpcUrls.length || !factoryWatches.length) return;
  const latestHex = await rpcCall("eth_blockNumber", []);
  const latest = BigInt(latestHex);
  if (!state.factoryLastBlock) {
    state.factoryLastBlock = latestHex;
    console.log("factory baseline captured", factoryWatches.map(({ address }) => address).join(","), latestHex);
    return;
  }

  let from = BigInt(state.factoryLastBlock) + 1n;
  if (from > latest) return;
  if (latest - from > 500n) from = latest - 500n;
  const logs = await rpcCall("eth_getLogs", [{
    fromBlock: `0x${from.toString(16)}`,
    toBlock: latestHex,
    address: factoryWatches.map(({ address }) => address),
    topics: [factoryWatches.map(({ topic }) => topic)]
  }]);
  for (const log of logs) {
      const watch = factoryWatches.find(({ address, topic }) =>
        address === log?.address?.toLowerCase() && topic === log?.topics?.[0]?.toLowerCase()
      );
      if (!watch) continue;
      const tokenTopic = log?.topics?.[2];
      if (!/^0x[a-fA-F0-9]{64}$/u.test(tokenTopic ?? "")) continue;
      const address = `0x${tokenTopic.slice(-40)}`.toLowerCase();
      if (state.seenTokens.includes(address)) continue;
      const creatorTopic = log?.topics?.[3];
      const creator = /^0x[a-fA-F0-9]{64}$/u.test(creatorTopic ?? "")
        ? `0x${creatorTopic.slice(-40)}`.toLowerCase()
        : undefined;
      const [name, symbol] = await Promise.all([
        readErc20String(address, "0x06fdde03"),
        readErc20String(address, "0x95d89b41")
      ]);
      await telegramSend([
        `🚨 Canopy ${watch.label}: новый рынок`,
        `${name || "Без названия"}${symbol ? ` (${symbol})` : ""}`,
        `Контракт: ${address}`,
        creator ? `Создатель: ${creator}` : undefined,
        `Блок: ${Number(BigInt(log.blockNumber))}`,
        `https://robinhoodchain.blockscout.com/token/${address}`
      ].filter(Boolean).join("\n"), threadId);
      state.seenTokens.push(address);
      if (!state.seenAddresses.includes(address)) state.seenAddresses.push(address);
  }
  state.factoryLastBlock = latestHex;
}

async function readErc20String(address, selector) {
  try {
    const encoded = await rpcCall("eth_call", [{ to: address, data: selector }, "latest"]);
    return decodeAbiString(encoded);
  } catch {
    return undefined;
  }
}

function decodeAbiString(encoded) {
  if (!/^0x[a-fA-F0-9]+$/u.test(encoded ?? "")) return undefined;
  const data = encoded.slice(2);
  if (data.length === 64) {
    const direct = Buffer.from(data, "hex").toString("utf8").replace(/\0+$/u, "").trim();
    return direct || undefined;
  }
  if (data.length < 128) return undefined;
  const offset = Number.parseInt(data.slice(0, 64), 16) * 2;
  if (!Number.isSafeInteger(offset) || offset + 64 > data.length) return undefined;
  const length = Number.parseInt(data.slice(offset, offset + 64), 16);
  const start = offset + 64;
  const end = start + length * 2;
  if (!Number.isSafeInteger(length) || end > data.length) return undefined;
  return Buffer.from(data.slice(start, end), "hex").toString("utf8").trim() || undefined;
}

async function rpcCall(method, params) {
  let lastError;
  for (let attempt = 0; attempt < factoryRpcUrls.length; attempt += 1) {
    const index = (rpcCursor + attempt) % factoryRpcUrls.length;
    const url = factoryRpcUrls[index];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error?.message ?? `RPC HTTP ${response.status}`);
      rpcCursor = (index + 1) % factoryRpcUrls.length;
      return payload.result;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("all RPC endpoints failed");
}

async function scanSiteSnapshot(siteSnapshot) {
  const body = await readFile(siteBodyPath, "utf8");
  const siteArtifacts = extractArtifacts(body, siteSnapshot.finalUrl);
  const newlySeen = { assets: [], endpoints: [], addresses: [] };
  mergeNew(state.seenEndpoints, siteArtifacts.endpoints, newlySeen.endpoints);
  mergeNew(state.seenAddresses, siteArtifacts.evmAddresses, newlySeen.addresses);

  const assetQueue = [...siteArtifacts.scripts];
  for (const endpoint of siteArtifacts.endpoints) {
    if (/\.(?:js|mjs)(?:\?|$)/iu.test(endpoint)) assetQueue.push(endpoint);
  }
  for (const assetUrl of [...new Set(assetQueue)].slice(0, 150)) {
    if (state.seenAssets.includes(assetUrl)) continue;
    state.seenAssets.push(assetUrl);
    newlySeen.assets.push(assetUrl);
    try {
      const result = await fetchLimited(assetUrl, { timeoutMs: Math.max(timeoutMs, 3000) });
      if (result.status < 200 || result.status >= 300) continue;
      const artifacts = extractArtifacts(result.body, result.finalUrl);
      mergeNew(state.seenEndpoints, artifacts.endpoints, newlySeen.endpoints);
      mergeNew(state.seenAddresses, artifacts.evmAddresses, newlySeen.addresses);
    } catch (error) {
      console.warn("asset scan failed", assetUrl, errorMessage(error));
    }
  }

  if (newlySeen.assets.length || newlySeen.endpoints.length || newlySeen.addresses.length) {
    const lines = ["🧭 v4.fun: новые технические данные"];
    if (newlySeen.assets.length) lines.push(`JS/assets:\n${formatList(newlySeen.assets)}`);
    if (newlySeen.endpoints.length) lines.push(`API/WS кандидаты:\n${formatList(newlySeen.endpoints, 12)}`);
    if (newlySeen.addresses.length) lines.push(`EVM-адреса:\n${formatList(newlySeen.addresses, 20)}`);
    await telegramSend(lines.join("\n"), threadId);
  }
}

async function pollKnownEndpoints() {
  const endpoints = state.seenEndpoints.filter(isSafeReadEndpoint).slice(0, maxPollEndpoints);
  for (const endpoint of endpoints) {
    try {
      const result = await fetchLimited(endpoint, { timeoutMs, maxBytes: 4 * 1024 * 1024 });
      endpointPolls += 1;
      if (result.status < 200 || result.status >= 300 || !result.body) continue;
      const hash = sha256(result.body);
      const changed = state.endpointHashes[endpoint] && state.endpointHashes[endpoint] !== hash;
      const suppressFirstNotification = !state.endpointHashes[endpoint]
        && state.seedBaselinePending.includes(endpoint);
      state.endpointHashes[endpoint] = hash;

      let parsed;
      try { parsed = JSON.parse(result.body); } catch { parsed = undefined; }
      const tokens = parsed ? extractTokenRecords(parsed, endpoint) : [];
      const newTokens = tokens.filter((token) => !state.seenTokens.includes(token.address));
      const rawAddresses = extractArtifacts(result.body, endpoint).evmAddresses;
      const newAddresses = rawAddresses.filter((address) => !state.seenAddresses.includes(address));
      mergeNew(state.seenAddresses, rawAddresses, []);
      for (const token of newTokens) state.seenTokens.push(token.address);

      if (suppressFirstNotification) {
        state.seedBaselinePending = state.seedBaselinePending.filter((value) => value !== endpoint);
        console.log("endpoint baseline captured", endpoint, hash.slice(0, 12));
        continue;
      }

      if (newTokens.length || newAddresses.length) {
        const lines = [`🚨 v4.fun: найдены ${newTokens.length ? "токены" : "новые контракты"}`, `Источник: ${endpoint}`];
        for (const token of newTokens.slice(0, 20)) {
          lines.push(`• ${token.name ?? "Без названия"}${token.symbol ? ` (${token.symbol})` : ""}\n  ${token.address}`);
        }
        if (!newTokens.length) lines.push(formatList(newAddresses, 20));
        await telegramSend(lines.join("\n"), threadId);
      } else if (changed) {
        console.log("endpoint changed", endpoint, hash.slice(0, 12));
      }
    } catch (error) {
      console.warn("endpoint poll failed", endpoint, errorMessage(error));
    }
    await sleep(10);
  }
}

function mergeNew(target, values, newlySeen) {
  const set = new Set(target);
  for (const value of values) {
    if (set.has(value)) continue;
    set.add(value);
    target.push(value);
    newlySeen.push(value);
  }
}

process.on("SIGTERM", () => { running = false; });
process.on("SIGINT", () => { running = false; });
void tick();

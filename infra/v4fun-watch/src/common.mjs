import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const EPHEMERAL_HEADERS = new Set([
  "age",
  "date",
  "server-timing",
  "set-cookie",
  "x-request-id",
  "x-vercel-id"
]);

const WRITE_KEYWORDS = /(?:^|[\/_-])(buy|sell|swap|order|create|mint|submit|claim|login|logout|auth|webhook|upload)(?:[\/_-]|$)/iu;
const READ_KEYWORDS = /(?:api|graphql|trpc|token|launch|market|pool|feed|list|search|discover)/iu;
const STATIC_EXTENSIONS = /\.(?:avif|css|gif|ico|jpe?g|map|mp3|mp4|pdf|png|svg|webm|webp|woff2?)(?:\?|$)/iu;

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function numberEnv(name, fallback, minimum = Number.NEGATIVE_INFINITY) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return Math.max(minimum, value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("aborted"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchLimited(url, options = {}) {
  const {
    timeoutMs = 1200,
    maxBytes = 8 * 1024 * 1024,
    headers = {},
    method = "GET"
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "accept": "text/html,application/json,text/javascript,application/javascript,*/*;q=0.5",
        "accept-encoding": "gzip, deflate, br",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "user-agent": "ChainToolzBot-v4fun-watch/1.0",
        ...headers
      },
      signal: controller.signal
    });
    let body = "";
    if (method !== "HEAD" && response.status !== 304) {
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > maxBytes) throw new Error(`body too large: ${length} bytes`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) throw new Error(`body too large: ${buffer.byteLength} bytes`);
      body = buffer.toString("utf8");
    }
    return {
      status: response.status,
      finalUrl: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      latencyMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(timer);
  }
}

export function stableHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) => !EPHEMERAL_HEADERS.has(key.toLowerCase()))
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

export function extractArtifacts(input, baseUrl = "https://www.v4.fun/") {
  const text = String(input ?? "").replaceAll("\\/", "/");
  const absoluteUrls = matches(text, /\b(?:https?|wss?):\/\/[^\s"'<>\\)\]]+/giu)
    .map(cleanUrl)
    .filter(Boolean);
  const relativeCandidates = matches(
    text,
    /["'`](\/(?:api|graphql|trpc|v[1-9]|_next\/data)(?:\/[A-Za-z0-9._~!$&()*+,;=:@%?\[\]-]*)?)["'`]/giu,
    1
  );
  const scriptCandidates = matches(text, /<script\b[^>]*\bsrc=["']([^"']+)["']/giu, 1);
  const evmAddresses = unique(matches(text, /\b0x[a-fA-F0-9]{40}\b/gu).map((value) => value.toLowerCase()));

  const scripts = unique(scriptCandidates.map((value) => toAbsolute(value, baseUrl)).filter(Boolean));
  const endpoints = unique([
    ...absoluteUrls.filter((value) => /^(?:https?|wss?):/iu.test(value)),
    ...relativeCandidates.map((value) => toAbsolute(value, baseUrl)).filter(Boolean)
  ]).filter((value) => !STATIC_EXTENSIONS.test(value));

  return {
    scripts: scripts.slice(0, 300),
    endpoints: endpoints.slice(0, 500),
    evmAddresses: evmAddresses.slice(0, 500)
  };
}

export function buildSiteSnapshot(result, previous = undefined) {
  const body = result.status === 304 ? previous?.body ?? "" : result.body;
  const artifacts = extractArtifacts(body, result.finalUrl);
  const headers = stableHeaders(result.headers);
  const waiting = /\bconst\s+LAUNCH\b|id=["']countdown["']|Markets, but programmable/iu.test(body)
    && !/(?:__NEXT_DATA__|\/_next\/static\/|<script[^>]+src=)/iu.test(body);
  const signature = {
    status: result.status === 304 ? previous?.status ?? 200 : result.status,
    finalUrl: result.finalUrl || previous?.finalUrl,
    headers,
    bodyHash: sha256(body),
    bodyBytes: Buffer.byteLength(body),
    scripts: artifacts.scripts,
    endpoints: artifacts.endpoints,
    evmAddresses: artifacts.evmAddresses,
    waiting
  };
  return {
    ...signature,
    signatureHash: sha256(JSON.stringify(signature)),
    checkedAt: new Date().toISOString(),
    latencyMs: result.latencyMs,
    body
  };
}

export function diffSnapshots(previous, current) {
  if (!previous) return { changed: false, launchLikely: false, addedScripts: [], addedEndpoints: [], addedAddresses: [] };
  const addedScripts = difference(current.scripts, previous.scripts);
  const addedEndpoints = difference(current.endpoints, previous.endpoints);
  const addedAddresses = difference(current.evmAddresses, previous.evmAddresses);
  const changed = current.signatureHash !== previous.signatureHash;
  return {
    changed,
    launchLikely: previous.waiting && !current.waiting,
    statusChanged: previous.status !== current.status,
    bodyChanged: previous.bodyHash !== current.bodyHash,
    headersChanged: sha256(JSON.stringify(previous.headers)) !== sha256(JSON.stringify(current.headers)),
    addedScripts,
    removedScripts: difference(previous.scripts, current.scripts),
    addedEndpoints,
    removedEndpoints: difference(previous.endpoints, current.endpoints),
    addedAddresses,
    removedAddresses: difference(previous.evmAddresses, current.evmAddresses)
  };
}

export function isSafeReadEndpoint(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/u.test(url.protocol)) return false;
    const decoded = decodeURIComponent(`${url.pathname}${url.search}`);
    if (WRITE_KEYWORDS.test(decoded) || STATIC_EXTENSIONS.test(decoded)) return false;
    if (/[{}<>$*]|\[[A-Za-z_:][^\]]*\]/u.test(decoded)) return false;
    return READ_KEYWORDS.test(decoded) || url.hostname.startsWith("api.");
  } catch {
    return false;
  }
}

export function extractTokenRecords(value, source = "unknown") {
  const records = new Map();
  const seen = new Set();

  function visit(node, depth = 0) {
    if (depth > 20 || node === null || node === undefined) return;
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node.slice(0, 10000)) visit(item, depth + 1);
      return;
    }

    const entries = Object.entries(node);
    const addressEntry = entries.find(([key, item]) =>
      /^(?:address|ca|contract|contractAddress|mint|token|tokenAddress)$/iu.test(key)
      && typeof item === "string"
      && /^0x[a-fA-F0-9]{40}$/u.test(item)
    );
    if (addressEntry) {
      const address = String(addressEntry[1]).toLowerCase();
      const name = findString(entries, /^(?:name|tokenName|displayName)$/iu);
      const symbol = findString(entries, /^(?:symbol|ticker|tokenSymbol)$/iu);
      records.set(address, { address, name, symbol, source });
    }
    for (const [, item] of entries) visit(item, depth + 1);
  }

  visit(value);
  return [...records.values()];
}

export async function telegramSend(text, threadId) {
  const token = requiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv("TELEGRAM_CHAT_ID");
  const payload = {
    chat_id: chatId,
    text: String(text).slice(0, 4096),
    disable_web_page_preview: "true"
  };
  if (threadId) payload.message_thread_id = String(threadId);
  return telegramCall(token, "sendMessage", payload);
}

export async function telegramCall(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)]))
  });
  const data = await response.json();
  if (!data.ok) {
    const error = new Error(`Telegram ${method}: ${data.description ?? response.status}`);
    error.retryAfter = data.parameters?.retry_after;
    throw error;
  }
  return data.result;
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return fallback;
    throw error;
  }
}

export async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, content);
  await rename(temp, path);
}

export async function atomicWriteJson(path, value) {
  await atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function formatList(items, limit = 8) {
  const visible = items.slice(0, limit);
  const suffix = items.length > limit ? `\n…ещё ${items.length - limit}` : "";
  return visible.map((item) => `• ${item}`).join("\n") + suffix;
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function matches(text, pattern, group = 0) {
  return [...text.matchAll(pattern)].map((match) => match[group]).filter(Boolean);
}

function cleanUrl(value) {
  return value.replace(/[),.;]+$/u, "");
}

function toAbsolute(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function difference(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function findString(entries, pattern) {
  const entry = entries.find(([key, value]) => pattern.test(key) && typeof value === "string");
  return entry ? String(entry[1]).slice(0, 160) : undefined;
}

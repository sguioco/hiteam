import { resolve } from "node:path";
import {
  atomicWrite,
  atomicWriteJson,
  buildSiteSnapshot,
  diffSnapshots,
  errorMessage,
  fetchLimited,
  formatList,
  numberEnv,
  readJson,
  requiredEnv,
  telegramSend
} from "./common.mjs";
import { startHealthServer } from "./health.mjs";

const targetUrl = process.env.TARGET_URL?.trim() || "https://www.v4.fun/";
const intervalMs = numberEnv("SITE_POLL_INTERVAL_MS", 500, 250);
const timeoutMs = numberEnv("SITE_REQUEST_TIMEOUT_MS", 1200, 300);
const dataDir = process.env.DATA_DIR?.trim() || "/data";
const threadId = Number(requiredEnv("SITE_TELEGRAM_THREAD_ID"));
const snapshotPath = resolve(dataDir, "site-latest.json");
const bodyPath = resolve(dataDir, "site-body.html");
const runtimePath = resolve(dataDir, "site-runtime.json");

let running = true;
let previous = await readJson(snapshotPath, undefined);
let runtime = await readJson(runtimePath, { announced: false, consecutiveErrors: 0 });
let lastStartedAt;
let lastCompletedAt;
let lastError;
let polls = 0;
let changes = 0;

startHealthServer(numberEnv("HEALTH_PORT", 8111, 1), () => ({
  worker: "site",
  running,
  intervalMs,
  targetUrl,
  lastStartedAt,
  lastCompletedAt,
  lastError,
  polls,
  changes,
  bodyHash: previous?.bodyHash,
  waiting: previous?.waiting
}));

async function tick() {
  const started = Date.now();
  lastStartedAt = new Date(started).toISOString();
  try {
    const headers = previous?.headers?.etag ? { "if-none-match": previous.headers.etag } : {};
    const result = await fetchLimited(targetUrl, { timeoutMs, headers });
    const snapshot = buildSiteSnapshot(result, previous ? { ...previous, body: await readBody() } : undefined);
    polls += 1;

    if (!previous) {
      await persistSnapshot(snapshot);
      previous = withoutBody(snapshot);
      if (!runtime.announced) {
        await telegramSend(
          `✅ v4.fun: мониторинг сайта запущен\nИнтервал: ${intervalMs} мс\nHTTP: ${snapshot.status}\nОжидание: ${snapshot.waiting ? "да" : "нет"}\nSHA: ${snapshot.bodyHash.slice(0, 12)}\n${targetUrl}`,
          threadId
        );
        runtime.announced = true;
      }
    } else if (result.status !== 304) {
      const diff = diffSnapshots(previous, snapshot);
      if (diff.changed) {
        changes += 1;
        await persistSnapshot(snapshot);
        await notifyChange(previous, snapshot, diff);
        previous = withoutBody(snapshot);
      }
    }

    if (runtime.consecutiveErrors >= 3) {
      await telegramSend(`✅ v4.fun снова отвечает после ${runtime.consecutiveErrors} ошибок подряд.`, threadId);
    }
    runtime.consecutiveErrors = 0;
    lastError = undefined;
  } catch (error) {
    polls += 1;
    lastError = errorMessage(error);
    runtime.consecutiveErrors = Number(runtime.consecutiveErrors ?? 0) + 1;
    if (runtime.consecutiveErrors === 3 || runtime.consecutiveErrors % 20 === 0) {
      try {
        await telegramSend(`⚠️ v4.fun: ${runtime.consecutiveErrors} ошибок подряд\n${lastError}`, threadId);
      } catch (telegramError) {
        console.error("telegram notification failed", errorMessage(telegramError));
      }
    }
  } finally {
    lastCompletedAt = new Date().toISOString();
    await atomicWriteJson(runtimePath, runtime).catch((error) => console.error("runtime persist failed", errorMessage(error)));
    const waitMs = Math.max(0, intervalMs - (Date.now() - started));
    if (running) setTimeout(tick, waitMs);
  }
}

async function persistSnapshot(snapshot) {
  await atomicWrite(bodyPath, snapshot.body);
  await atomicWriteJson(snapshotPath, withoutBody(snapshot));
  await atomicWriteJson(resolve(dataDir, "events", `${Date.now()}-${snapshot.bodyHash.slice(0, 12)}.json`), withoutBody(snapshot));
}

async function notifyChange(oldSnapshot, snapshot, diff) {
  const title = diff.launchLikely ? "🚨 v4.fun ПЕРЕШЁЛ В LIVE" : "🔄 v4.fun изменился";
  const lines = [
    title,
    `HTTP: ${oldSnapshot.status} → ${snapshot.status}`,
    `Размер: ${oldSnapshot.bodyBytes} → ${snapshot.bodyBytes} байт`,
    `SHA: ${oldSnapshot.bodyHash.slice(0, 10)} → ${snapshot.bodyHash.slice(0, 10)}`,
    `ETag: ${oldSnapshot.headers?.etag ?? "—"} → ${snapshot.headers?.etag ?? "—"}`,
    `Задержка ответа: ${snapshot.latencyMs} мс`
  ];
  if (diff.addedScripts.length) lines.push(`Новые JS:\n${formatList(diff.addedScripts)}`);
  if (diff.addedEndpoints.length) lines.push(`Новые endpoints:\n${formatList(diff.addedEndpoints)}`);
  if (diff.addedAddresses.length) lines.push(`Адреса в странице:\n${formatList(diff.addedAddresses)}`);
  lines.push(targetUrl);
  await telegramSend(lines.join("\n"), threadId);
}

async function readBody() {
  try {
    return await (await import("node:fs/promises")).readFile(bodyPath, "utf8");
  } catch {
    return "";
  }
}

function withoutBody(snapshot) {
  const { body: _body, ...rest } = snapshot;
  return rest;
}

process.on("SIGTERM", () => { running = false; });
process.on("SIGINT", () => { running = false; });
void tick();

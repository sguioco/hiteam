import { readFile, writeFile } from "node:fs/promises";
import { telegramCall, sleep } from "../src/common.mjs";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const maxId = Number(process.argv[2]);
const statePath = process.argv[3] || "/tmp/v4fun-topic-cleanup.json";
if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");
if (!Number.isInteger(maxId) || maxId < 2) throw new Error("Usage: cleanup-topics.mjs <max-message-id> [state-file]");

let state = await readState();
const batchSize = 6;
while (state.nextId <= maxId) {
  const ids = Array.from({ length: Math.min(batchSize, maxId - state.nextId + 1) }, (_, index) => state.nextId + index);
  const results = await Promise.all(ids.map(deleteTopic));
  for (const result of results) {
    if (result.deleted) {
      state.deleted.push(result.id);
      process.stdout.write(`deleted topic ${result.id}\n`);
    }
  }
  state.nextId = ids.at(-1) + 1;
  await writeFile(statePath, `${JSON.stringify(state)}\n`);
  if (state.nextId % 300 === 0) process.stdout.write(`progress ${state.nextId}/${maxId}, deleted=${state.deleted.length}\n`);
  await sleep(300);
}
process.stdout.write(`${JSON.stringify({ complete: true, scanned: maxId - 1, deleted: state.deleted }, null, 2)}\n`);

async function deleteTopic(id) {
  for (;;) {
    try {
      await telegramCall(token, "deleteForumTopic", { chat_id: chatId, message_thread_id: id });
      return { id, deleted: true };
    } catch (error) {
      if (error.retryAfter) {
        await sleep((Number(error.retryAfter) + 1) * 1000);
        continue;
      }
      if (/message thread not found|TOPIC_ID_INVALID|forum topic not found|can't be deleted|Bad Request/iu.test(error.message)) {
        return { id, deleted: false };
      }
      throw error;
    }
  }
}

async function readState() {
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8"));
    return { nextId: Math.max(2, Number(parsed.nextId) || 2), deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [] };
  } catch {
    return { nextId: 2, deleted: [] };
  }
}

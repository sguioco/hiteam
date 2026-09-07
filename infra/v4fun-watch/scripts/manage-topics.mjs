import { telegramCall } from "../src/common.mjs";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");

const site = await telegramCall(token, "createForumTopic", {
  chat_id: chatId,
  name: "v4.fun — сайт"
});
const api = await telegramCall(token, "createForumTopic", {
  chat_id: chatId,
  name: "v4.fun — API и токены"
});

process.stdout.write(`${JSON.stringify({
  SITE_TELEGRAM_THREAD_ID: site.message_thread_id,
  API_TELEGRAM_THREAD_ID: api.message_thread_id
}, null, 2)}\n`);

#!/usr/bin/env node
// Register/set Telegram bot webhook with secret_token.
// Usage: node scripts/register-webhook.mjs [url] [secret]
// Defaults: url from env or https://menu.smart-link.ly/api/telegram/webhook
//           secret from TELEGRAM_WEBHOOK_SECRET env

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("FATAL: TELEGRAM_BOT_TOKEN not set");
  process.exit(1);
}

const url = process.argv[2] || process.env.WEBHOOK_URL || "https://menu.smart-link.ly/api/telegram/webhook";
const secret = process.argv[3] || process.env.TELEGRAM_WEBHOOK_SECRET;

if (!secret) {
  console.error("FATAL: TELEGRAM_WEBHOOK_SECRET not set (pass as arg 2 or env)");
  process.exit(1);
}

const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

const body = { url, secret_token: secret, allowed_updates: ["message", "callback_query"] };

fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})
  .then((r) => r.json())
  .then((json) => {
    if (json.ok) {
      console.log("Webhook registered:", json.description);
      console.log("URL:", url);
    } else {
      console.error("Failed:", json.description);
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });

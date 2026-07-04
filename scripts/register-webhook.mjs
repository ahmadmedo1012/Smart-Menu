#!/usr/bin/env node
/**
 * Telegram Webhook Registration Utility
 *
 * Usage:
 *   export TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
 *   export TELEGRAM_WEBHOOK_SECRET="your-secret"
 *   node scripts/register-webhook.mjs https://your-app.vercel.app
 *
 * This registers (or re-registers) the webhook URL with Telegram,
 * passing secret_token for origin verification on every POST.
 */

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: node scripts/register-webhook.mjs https://your-domain.com");
  process.exit(1);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!secret) {
  console.error("❌ TELEGRAM_WEBHOOK_SECRET is not set — webhook will be registered without secret_token");
  console.error("   Set it now, re-run, or expect the webhook to reject all requests.");
}

const webhookUrl = `${domain.replace(/\/$/, "")}/api/telegram/webhook`;

async function main() {
  // 1. Set the webhook
  const params = new URLSearchParams({ url: webhookUrl });
  if (secret) params.set("secret_token", secret);

  console.log(`📍 Registering webhook: ${webhookUrl}`);
  const setRes = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    { method: "POST", body: params },
  );
  const setBody = await setRes.json();
  if (!setBody.ok) {
    console.error("❌ setWebhook failed:", setBody.description ?? JSON.stringify(setBody));
    process.exit(1);
  }
  console.log("✅ setWebhook:", setBody.description);

  // 2. Verify the webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const infoBody = await infoRes.json();
  if (!infoBody.ok) {
    console.error("❌ getWebhookInfo failed:", infoBody.description ?? JSON.stringify(infoBody));
    process.exit(1);
  }

  const info = infoBody.result;
  console.log("\n📋 Webhook info:");
  console.log(`   URL:             ${info.url}`);
  console.log(`   has_custom_cert: ${info.has_custom_cert}`);
  console.log(`   pending_updates: ${info.pending_update_count ?? 0}`);
  console.log(`   max_connections: ${info.max_connections ?? 40}`);
  console.log(`   secret_token:    ${info.secret_token ? "✅ SET" : "❌ NOT SET"}`);
  console.log(`   last_error_date: ${info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : "none"}`);
  console.log(`   last_error_message: ${info.last_error_message ?? "none"}`);

  if (info.url !== webhookUrl) {
    console.warn("\n⚠️  Webhook URL doesn't match expected URL!");
  }

  if (!info.secret_token) {
    console.warn("\n⚠️  secret_token is NOT SET — webhook is vulnerable to forged requests.");
  }

  console.log("\n✅ Registration complete.");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

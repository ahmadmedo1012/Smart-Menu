#!/usr/bin/env node
/**
 * Telegram Webhook Registration Utility
 *
 * Usage:
 *   export TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
 *   export TELEGRAM_WEBHOOK_SECRET="your-secret"
 *   node scripts/register-webhook.mjs https://your-app.vercel.app
 *
 * Registers /api/telegram/webhook with secret_token.
 * Verifies by sending a test request (with and without token).
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
  console.error("❌ TELEGRAM_WEBHOOK_SECRET is not set");
  process.exit(1);
}

const webhookUrl = `${domain.replace(/\/$/, "")}/api/telegram/webhook`;

async function main() {
  // 1. Delete any existing webhook first (Telegram refuses to update secret_token)
  console.log("🗑️  Deleting existing webhook...");
  const delRes = await fetch(
    `https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=true`,
    { method: "POST" },
  );
  const delBody = await delRes.json();
  console.log(delBody.ok ? "   Deleted." : "   Delete failed (ok to ignore):", delBody.description ?? "");

  // 2. Set webhook with JSON body (URLSearchParams may not pass secret_token reliably)
  console.log(`📍 Registering webhook: ${webhookUrl}`);
  const setRes = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    },
  );
  const setBody = await setRes.json();
  if (!setBody.ok) {
    console.error("❌ setWebhook failed:", setBody.description ?? JSON.stringify(setBody));
    process.exit(1);
  }
  console.log("✅ setWebhook:", setBody.description);

  // 3. Verify by fetching webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const infoBody = await infoRes.json();
  const info = infoBody.result || {};

  console.log("\n📋 Webhook info:");
  console.log(`   URL:             ${info.url ?? "N/A"}`);
  console.log(`   pending_updates: ${info.pending_update_count ?? 0}`);
  console.log(`   allowed_updates: ${info.allowed_updates ? info.allowed_updates.join(", ") : "all"}`);
  console.log(`   last_error:      ${info.last_error_message ?? "none"}`);

  // Note: getWebhookInfo may not echo secret_token (varies by Bot API version).
  // We verify it's enforced by an actual HTTP test below.

  // 4. Active verification — test WITHOUT secret token (should 403)
  console.log("\n🔍 Testing secret_token enforcement...");
  const testNoToken = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ update_id: 99999 }),
  });
  if (testNoToken.status === 403) {
    console.log("   ✅ Without token → 403 (correct — token is enforced)");
  } else if (testNoToken.status === 500) {
    console.log("   ⚠️  Without token → 500 (server misconfigured)");
  } else {
    console.log(`   ⚠️  Without token → ${testNoToken.status} (unexpected, token may not be enforced)`);
  }

  // 5. Test WITH secret token (should 200)
  const testWithToken = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secret,
    },
    body: JSON.stringify({ update_id: 99999 }),
  });
  if (testWithToken.status === 200) {
    console.log("   ✅ With token    → 200 (webhook accepts valid requests)");
  } else {
    console.log(`   ⚠️  With token    → ${testWithToken.status} (check deployment)`);
  }

  if (testNoToken.status === 403 && testWithToken.status === 200) {
    console.log("\n✅ Registration complete. secret_token is enforced.");
  } else {
    console.log("\n⚠️  Registration done, but verification shows unexpected status codes.");
    console.log("   Check that the app is deployed and TELEGRAM_WEBHOOK_SECRET matches.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

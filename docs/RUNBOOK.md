# Smart Menu — Operations Runbook

## Telegram Interactive Engine

### Prerequisites

Every Telegram user ID listed in `TELEGRAM_ADMIN_IDS` must have pressed **Start** on the bot at least once. Telegram rejects `sendMessage` to any user who hasn't opened a chat with the bot ("chat not found"). Without this, the inline keyboard messages will fail silently (logged server-side only).

**To verify a user has started the bot:** ask them to open `t.me/<bot_username>` and tap `/start`. Once they've done that once, the bot can send them messages indefinitely.

### Setting up the webhook

1. Set `TELEGRAM_BOT_TOKEN` in deployment environment.
2. Set `TELEGRAM_WEBHOOK_SECRET` to a random string.
3. Re-register the webhook with the secret token:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<domain>/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. Verify the webhook is healthy:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
5. Confirm unauthorized requests are rejected:
   ```bash
   curl -X POST https://<domain>/api/telegram/webhook -d '{}'
   # → 403 Forbidden (without secret_token header)
   ```

### Admin approval flow

- When a user completes checkout → interactive message sent to all `TELEGRAM_ADMIN_IDS` with Approve/Reject buttons.
- Tap **موافقة** → atomic transaction creates restaurant + promotes user + strips buttons.
- Tap **رفض** → payment cancelled, user notified via SSE.
- Double-tap prevention: second tap shows "already processed" toast, no state change.
- Non-admin taps: shows "لا تمتلك الصلاحية" alert, no state change.

# S3 — Telegram bot audit, round r119 (remaining surface beyond r116–r118)

**Agent:** S3 · **Mode:** READ-ONLY (no repo changes) · **Repo:** /home/z/my-project/repos/Smart-Menu @ `92611477` (clean tree)
**Scope:** callback_data lifecycle · webhook robustness (dedup/status/timeouts/malformed updates) · message rendering edges · command surface · panel↔bot sync & rate limits · token lifecycle · raw-fetch sweep · test-coverage gaps.
**Context read:** docs/ENGINEERING_STATE.md r116/r117/r118/r119 + worklog tail. r116 (idempotent replays, toast-first, panel keyboard sync), r117 (P2025 race losers, sendPlainMessage 10s AbortController, /start hardening), r118-B1 (cancel-race false rejection, admin token save, approver authority guards, last raw fetches → hardened transport) — all verified present at HEAD before hunting NEW surface.

---

## P1 — none found

The money-path (approve/reject) is now well defended: r116 replay/conflict semantics, r117 race losers, r118 false-rejection + self-approval guard all verified in code and tests (`subscription-decisions.ts:95-121`, `webhook/route.ts:100-192`, `tests/unit/subscription-decisions.ts:479-541`, `tests/unit/r92-telegram-webhook-gate.test.ts:805-927`).

---

## P2 findings (real-world failure modes)

### P2-1 · DB blip → webhook 429 → Telegram redelivery amplification & dropped updates
- **Where:** `src/app/api/telegram/webhook/route.ts:219-220` + `src/lib/rate-limit.ts:92-110`.
- **Evidence:** the webhook limiter (`createDbRateLimiter`, 120/30s) **fails closed** on DB error (`rate-limit.ts:107-110`: both upsert and read-back failed → `count = max+1` → `success:false`). The route then returns `429 Too Many Requests` — a non-2xx. Telegram redelivers every non-200 update ("a reasonable amount of times"). During a Neon autosuspend-cold-start/failover: every update → limiter DB error → 429 → retry; when the DB recovers, the redelivery burst itself can trip the 120/30s cap → more 429s → some updates permanently dropped (a `/start verify_` link attempt is lost with no feedback to the user). r116 made redeliveries *idempotent* but nothing here dedups or survives the limiter being down. The 429 also carries no `Retry-After` header.
- **Fix:** for the webhook only, treat a limiter *infrastructure error* as allowed (fail-open — this traffic is already secret-token-gated, the only legit caller is Telegram): catch the limiter's own failure state and return 200, or key an in-memory limiter for verified traffic. At minimum add `Retry-After: 30` to the 429 and log the dropped `update_id`.

### P2-2 · Token rotation trap: env `TELEGRAM_BOT_TOKEN` silently overrides the panel-saved DB token
- **Where:** `src/lib/config.ts:53-56` (`if (envToken) return envToken;` before the DB read), duplicated inline at `src/lib/subscription-decisions.ts:33`.
- **Evidence:** r118 fixed the admin UI so a newly typed token is actually *saved* (`admin/telegram/page.tsx:149-161`), and `telegram/config/route.ts:96-100` registers the webhook **with the new token**. But `getDecryptedBotToken()` still prefers the env var: with `TELEGRAM_BOT_TOKEN` set in the deployment, every send (webhook replies, broadcasts, approval keyboards, user notifications) keeps using the **stale env token**. Rotation via BotFather (`/revoke`) is exactly when this bites: old token dead → all `sendMessage`/`editMessageText` 401 → failures are `logWarn` only (`telegram-api.ts:88-92,127-135`), `diagnose` reports `hasToken:true` regardless of source (`telegram/diagnose/route.ts:72`) → approvals silently stop reaching admins while the panel says "saved".
- **Fix:** prefer the DB token when one exists (env becomes bootstrap-only), or at minimum surface the active source + a 401 counter in `/api/telegram/diagnose`, and document that rotation requires updating the env var when set.

### P2-3 · Restaurant deleted while its upgrade payment is pending → payment becomes un-approvable (money-path dead-end)
- **Where:** `src/lib/subscription-decisions.ts:147-156` (upgrade branch `tx.restaurant.update({ where: { id: meta.upgradeRestaurantId } })`) → P2025 when the restaurant row is gone → caught at `:202-211` → `isPrismaRecordNotFound` → `raceResolvedResult` (`:50-59`) re-reads the payment, **still pending** (tx rolled back) → returns `null` → generic `«حدث خطأ أثناء ترقية الخطة»`. The webhook classifies that as *retryable* (`webhook/route.ts:146-150`) → keyboard stays live forever; every later 🟢 tap fails identically. The only exit is 🔴, which sends the payer a **false rejection** («تم رفض طلب تفعيل حسابك», `:459-463`) for money already transferred.
- **Reachability:** the DELETE guard is orders-only — `src/app/api/restaurants/[id]/route.ts:279` («لا يمكن حذف مطعم لديه طلبات مسجلة»); a fresh restaurant (no orders yet) with a pending upgrade payment deletes cleanly (super_admin full-trust path, r118-B2). Same dead-end shape if the paying `User` row is deleted first (new-user branch `tx.user.update` at `:297-306` → same generic-error fallthrough).
- **Fix:** (a) distinguish the *source* of P2025 — pre-check the restaurant/user exists inside the tx and return a dedicated **non-retryable** reason (e.g. «المطعم المستهدف محذوف — يلزم التسوية يدوياً») so the webhook strips the keyboard and alerts instead of keeping it live; and/or (b) extend the restaurant DELETE guard to 409 when `metadata.upgradeRestaurantId` matches a pending payment.

### P2-4 · login/register AWAIT the Telegram broadcast → Telegram hang = user-facing login latency up to ~10s / 504
- **Where:** `src/app/api/auth/login/route.ts:163-167`, `src/app/api/auth/register/route.ts:99-103` (`await notifyEvent(...)` before returning the response) → `broadcastToAll` (`telegram-broadcast.ts:74-99`) sends chunk-by-chunk, each send abort-bounded at 10s (`telegram-api.ts:26-27`).
- **Evidence:** r118-A1-F1 bounded the transport (was: unbounded hang) but **kept the await**. With Telegram hanging (not failing fast) and >10 admin targets (2 chunks), the login response waits ~20s; the function has no `maxDuration` (vercel.json only raises the two cron routes) → on the 10s Hobby default the login/register request 504s. All other Telegram call sites are correctly fire-and-forget (`.catch`, e.g. `subscription-decisions.ts:199,363`).
- **Fix:** wrap in `waitUntil()` (`@vercel/functions`) or fire-and-forget with `.catch()` — these ops notifications are best-effort by design and must never sit in the auth critical path.

### P2-5 · `telegramConfig.chatId` (the UI's "معرف المحادثة" field) is stored but consumed by NOTHING
- **Where:** saved at `src/app/api/telegram/config/route.ts:48-68`, returned at `:26-33` — but every delivery path ignores it: `gatherTargets` (`telegram-broadcast.ts:50-72`) uses only `telegramBroadcastTarget` rows + linked users; the keyboard fallbacks use env `TELEGRAM_CHAT_ID`/`TELEGRAM_GROUP_IDS` only (`subscriptions/route.ts:139-145`, `upgrade/route.ts:183-189`); the "اختبار الإرسال" button calls `broadcastToAll` (`telegram/test/route.ts:10-13`), which also ignores it.
- **Evidence:** grep for `config.chatId` consumers returns zero outside the config route itself. The admin UI's own 4-step setup guide ends with «أدخل المعرف في حقل معرف المحادثة واحفظ الإعدادات» (`admin/telegram/page.tsx:359`) — following it produces **zero notifications**, silently (broadcasts return `{sent:0, failed:[]}` with no error).
- **Fix:** include `config.chatId` as an implicit broadcast target in `gatherTargets` (cheapest, matches user expectation), or remove the field + rewrite the guide to point at "جهات الإرسال" (Broadcast Targets).

---

## P3 findings (hardening / observability)

### P3-1 · No 429/Retry-After handling or retry in `apiCall` — flood-limited edits silently skipped
`telegram-api.ts:13-47` never inspects `res.status===429` or `parameters.retry_after`; `editMessageText`/`editMessageReplyMarkup` failures are `logWarn`-and-skip (`:127-135`, `:106-114`). Under Telegram flood control, keyboard copies stay live with outdated text — self-healing via r116 replay semantics, but the admin sees a stale message. `sendToChat` parses `retry_after` for logs only (`telegram-broadcast.ts:36-45`) and `broadcastToAll` paces chunks at a fixed 60ms (`:98`) — no dynamic backoff. **Fix:** honor `retry_after` (single bounded retry for edits; delay the next chunk by `retry_after` ms), and surface a SystemEvent when a cleanup edit fails so stale keyboards are observable.

### P3-2 · Webhook cleanup is sequential per copy with no `maxDuration` — Vercel timeout kills mid-cleanup
`webhook/route.ts:176-184` loops `meta.telegramMessages` doing `editMessageText` + `editMessageReplyMarkup` **sequentially** (2 × 10s ceiling per copy; N copies ⇒ up to 2N×10s), while the panel path parallelizes the identical work (`telegram-payment-sync.ts:48-53`). No `export const maxDuration` on the route; `vercel.json` raises only the two cron routes → default (10s Hobby / 15s Pro). Timeout → 504 → Telegram redelivery → re-edits → benign `message is not modified` 400s spam logs. **Fix:** `Promise.all` the cleanup (mirror payment-sync), add `maxDuration`, skip the edit when the target text is already final.

### P3-3 · `/start verify_<token>` in a GROUP links the user's *personal* notifications to the whole group
`webhook/route.ts:316-326` stores `chatId` into `user.telegramChatId` without checking `chat.type === 'private'` (the type is read at `:244` only for logging). A user running the link command in a shared group makes every later personal message — «✅ تم تفعيل حسابك…» / «❌ عذراً، تم رفض طلب تفعيل حسابك» (`subscription-decisions.ts:365-370, 459-463`) — land in that group. **Fix:** accept `verify_` only when `chat.type === 'private'`; otherwise answer with a hint. (Also the plain `/start` ID-echo answers with the *group* id in groups — misleading; same guard helps.)

### P3-4 · Toast is answered AFTER the decision — a slow DB re-creates the r116 dead-spinner
Ordering is `resolveSubscriptionPayment` (`webhook/route.ts:100`) → toast (`:157`) → edits. r116 moved the toast ahead of the *Telegram edits*; it still sits behind the DB transaction (Neon cold start + `FOR UPDATE` + multi-restaurant creation + 4× category seeding, `subscription-decisions.ts:254-295`). If that exceeds Telegram's callback-answer window (~10s), the admin sees the exact dead-spinner symptom that caused the original incident and re-taps (now harmless — replay semantics — but confusing). **Fix:** answer an immediate «جارٍ التنفيذ…» toast when the DB call is expected slow, with the outcome riding on the message edit; or set a `Promise.race` deadline of ~7s on the decision before answering a generic toast.

### P3-5 · Command surface: no `/help`, no unknown-command feedback, `/start@BotName` ignored
Only `/start` (`webhook/route.ts:251-262`) and `/start verify_…` (`:264-267`) are handled; everything else — `/help`, `/stop`, any text — returns 200 silently. In groups, Telegram delivers `/start@BotName` which fails the `text === '/start'` equality → no reply. Deep links other than `verify_` (e.g. `start=menu_x`) are silently ignored (no web-app links exist — fine). **Fix:** add `/help` (Arabic: what the bot does, how to get your ID, how linking works), strip an optional `@botname` suffix from `/start`, and reply once to unknown commands in private chats («أمر غير معروف — /help»).

---

## P4 findings (polish / pins)

- **P4-1 · `plan.nameAr` unescaped in the approval-keyboard messages** — `subscriptions/route.ts:152`, `upgrade/route.ts:196` build `parse_mode=Markdown` messages with the plan name interpolated raw. Admin/seed-controlled only (phishing-in-admin-channel is self-inflicted), but the identical value IS escaped one layer down (`r93` lock). Fix: reuse `escMarkdown` for consistency.
- **P4-2 · No token format validation at save** — `telegram/config/route.ts:12` (`z.string().min(1).optional()`). A pasted malformed token (trailing space, "test") is encrypted and stored; `getDecryptedBotToken` then rejects it on every read (`config.ts:60-68` → null) and the bot silently dies. The setWebhook step does return a Telegram 401 error toast, but the bad token is already persisted. Fix: `.regex(/^\d+:[\w-]+$/)` in the upsert schema.
- **P4-3 · No pin test for the 64-byte `callback_data` cap** — format is `sub_app:${payment.id}` (`subscriptions/route.ts:171-172`, `upgrade/route.ts:217-218`): 8 + ≤10 digits = ≤18 bytes, safe by construction forever (int32 serial). Add a one-line pin test so a future payload change can't silently cross 64 bytes.
- **P4-4 · `notifyEvent`'s own escaper/gating never tested unmocked** — every test mocks `@/lib/telegram` (`r92-telegram-webhook-gate.test.ts`, `login-lockout.test.ts:39`, …); the r93 suite locks the *copy* of `escMarkdown` inside subscription-decisions, not `telegram.ts:40`'s `esc()` / `toStringArray` (`telegram.ts:10-12, 40-45`) — drift risk on the path that broadcasts **user-controlled** username/name to admin channels. Also no 4096-cap guard anywhere (current max caller payload ≈1.6KB: 5 menus × (200-char name + 100-char slug) — safe by construction, unasserted).
- **P4-5 · Webhook doesn't log `update_id`** — impossible to correlate Telegram redeliveries in logs when diagnosing P2-1-style storms (`webhook/route.ts:241-247` logs chatId/username only). One-line observability win.

---

## CHECKED-CLEAN (verified, no action)

1. **`callback_data` size ≤64B** — `sub_app:`/`sub_rej:` + int32 serial ⇒ ≤18 bytes (`telegram-callback.ts:9-18` parses defensively anyway: non-numeric/≤0/no-colon → «بيانات غير صالحة», tested `telegram-webhook.test.ts:30-54`).
2. **Stale-message taps (payment resolved elsewhere / unknown id)** — every terminal state produces a correct toast + text + keyboard strip; unknown payment strips dead buttons (`webhook/route.ts:142-150`, r116 semantics; tests `r92-telegram-webhook-gate.test.ts:805-927`). No path crashes on a 3-day-old tap. (The one true dead-end is P2-3 above.)
3. **`secret_token` validation** — fail-closed 403 when unset, timing-safe compare, trimmed env, probes don't burn the limiter (`webhook/route.ts:199-215`, `secure-compare.ts:22-27`; tests `r92-…test.ts:198-274`).
4. **Malformed update variants** — non-JSON (setWebhook probe) → 200; JSON without message/callback → 200; missing `callback_query.message` → decision still processed, edits skipped (`webhook/route.ts:159-162`); `edited_message`/`channel_post`/`my_chat_member` fall through the optional-chaining to 200; `allowed_updates: ['message','callback_query']` set at registration (`telegram/config/route.ts:99`); `request.json()` throw → catch → 200 (`:338-341`, test `:929-930`). Handler exceptions can't leak a 500 (round92-wave3-1 `await` pattern, tested).
5. **Markdown rendering of user input** — phone regex-locked `^09\d{8}$` (`payment-schema.ts:26`), plan/amount numeric, temp restaurant names/slugs/username escaped on every decision message (`subscription-decisions.ts:16, 360-362, 456`), notifyEvent escapes `_*[]`()`\` — complete for legacy `Markdown` mode (V2-only specials like `~>|{}.!` are inert in legacy mode); locked by `r93-subscription-markdown-escape.test.ts`. Empty-cart / 100-char-name / Arabic-only: item names never reach Telegram at all (orders go to WhatsApp only — verified: zero telegram imports in `api/orders/*`).
6. **4096-char cap** — largest possible current message ≈1.6KB (see P4-4); approval keyboard msg ~200B; `sendToChat` failures on 400 are collected, never thrown (`telegram-broadcast.ts:102-127`).
7. **Masked-token UI** — GET returns `botTokenMasked` as a boolean, never the token (`telegram/config/route.ts:26-33`, test `r118-config-masking-and-caps.test.ts:47-80`); the `••••••••` placeholder is never echoed back (`page.tsx:141-161`); POST response excludes the ciphertext (`:70-73`); no log line prints the token (`telegram-api.ts` logs method/status/sliced-body only; `config.ts:60-68` logs a format error without the value). **No leak found.**
8. **Raw `fetch` to api.telegram.org** — production `src/` has exactly one transport (`telegram-api.ts`, 10s AbortController + synthetic non-ok, tests `telegram-api.test.ts:109-168`); `proxy.ts` mentions the host in CSP only; `scripts/register-webhook.mjs` uses a raw fetch but is a local CLI tool (acceptable; note in passing). **Zero unhardened production call sites remain.**
9. **Two-owner panel race** — loser gets 409 + `alreadyStatus` → panel surfaces the reason toast and refreshes (`admin/subscriptions/page.tsx:114-142`, `api/admin/subscriptions/route.ts:71-84`); Telegram copies stripped in parallel by the winner's sync (`telegram-payment-sync.ts:48-53`). No double-restaurant, no false rejection (r117-F1/r118-A1-F2 verified).
10. **`/start verify_` link flow** — HMAC constant-time verify, expiry, atomic anti-replay, userId binding — 12+ unit tests (`r92-…test.ts:378-545`, `round94-telegram-verify-binding.test.ts`, `telegram-verify-anti-replay.test.ts`).
11. **Self-approval guard + approver authority** — `webhook/route.ts:86-98` + `subscription-decisions.ts:70-80`; allowlist = env ∪ DB approvers, deduped (`telegram-admin.ts:3-19`).

## Untested handlers (unit level)

| Surface | Status |
|---|---|
| `POST /api/telegram/config` save paths (masked-save keep-token, new-token, setWebhook failure, bad-format acceptance) | ❌ only GET masked is unit-tested; e2e covers 401/405 only (`tests/e2e/api-sweep.test.ts:299-334`) |
| `GET /api/telegram/diagnose` (dryRun, per-target test, configExists:false shape) | ❌ no unit tests |
| `POST /api/telegram/test` | ❌ no unit tests |
| `GET/POST /api/telegram/broadcast-targets` + `[id]` PATCH/DELETE | ❌ no unit tests |
| Webhook limiter-DB-failure → 429 (P2-1) & redelivery semantics | ❌ limiter always mocked-allow in the gate suite |
| Group-chat `verify_` linking (P3-3) | ❌ |
| Real `notifyEvent` escaping/gating (P4-4) | ❌ always mocked |
| `callback_data` 64-byte pin (P4-3) | ❌ |

**Well-tested (for contrast):** webhook gates/ordering/r116 semantics (~40 cases), subscription-decisions all branches + races, telegram-api transport, broadcast chunking/pruning, payment-sync, verify/link/approvers family.

## Top-3 most probable real-world failure scenarios

1. **BotFather token revoked while `TELEGRAM_BOT_TOKEN` is set in the env** (P2-2): admin rotates via the panel, UI toasts success, webhook re-registers — but every send still uses the dead env token → approval keyboards and notifications silently stop (401s are logWarn-only, diagnose shows `hasToken:true`). Payments pile up pending until a paying customer complains.
2. **Neon blip during an approval tap** (P2-1): limiter fails closed → 429 → Telegram redelivers → recovery burst trips the 120/30s cap → the admin's tap (or a user's `verify_` link) is dropped with a dead spinner — a partial replay of the original r116 incident report under DB-degraded conditions.
3. **Empty restaurant deleted while its upgrade payment is pending** (P2-3): 3 days later the owner taps 🟢 → generic error, keyboard stays live, every retry fails; the only exit sends a *false rejection* to a customer who already paid — money-path dead-end reachable through the super_admin delete path today.

---
*Evidence: all citations are file:line at HEAD `92611477`. No repo files were modified; no Telegram API calls were made; no tokens were printed.*

# Smart Menu — Professional Hardening Plan

**Date**: 2026-07-04
**Status**: Draft — based on direct repo audit of `main` at commit `3457949`
**Scope**: (1) verification of the just-merged Telegram interactive approval engine, (2) a critical secrets-exposure finding unrelated to that feature, (3) broader gaps standing between this codebase and a "professional, complete" production SaaS.

Findings are ordered by severity. Section 1 is a fire.

---

## 1. 🔴 CRITICAL — Real secrets committed to the repository

`git ls-files` confirms `.env`, `.env.local`, `.env.prod`, and `.env.development` are tracked in git — not just `.env.example`. `.gitignore` already lists `.env*`, meaning these were added to git *before* the ignore rule existed and have never been removed. Contents (keys only, confirmed present):

- `.env` → `DATABASE_URL`, `JWT_SECRET`
- `.env.local` → `DATABASE_URL`, `VERCEL_OIDC_TOKEN`, `NEXT_PUBLIC_DOMAIN`, `DATABASE_SCHEMA`
- `.env.prod` → `DATABASE_URL`, `AUTH_SECRET`, plus Vercel deployment metadata
- `.env.development` → `DATABASE_SCHEMA`, `NEXT_PUBLIC_DOMAIN`, `VERCEL_OIDC_TOKEN`

`JWT_SECRET`/`AUTH_SECRET` sign session tokens and the Telegram account-linking HMAC (`src/app/api/telegram/webhook/route.ts`, `/start verify_` path) and are also the fallback key for `encryptValue()` in `src/lib/config.ts`. `DATABASE_URL` typically embeds the DB username/password. If the repository has ever been publicly readable (it was clonable anonymously during this audit), treat all of these as **compromised now**, independent of anything else in this document.

### Required actions, in order

1. **Rotate every credential above today**: DB password, `JWT_SECRET`, `AUTH_SECRET`, and revoke/regenerate the Vercel OIDC token. Update the real deployment's environment variables (Vercel dashboard or wherever they're set) — not the files in git.
2. Remove the files from tracking going forward:
   ```bash
   git rm --cached .env .env.local .env.prod .env.development
   git commit -m "chore: stop tracking environment files"
   ```
3. Purge them from git **history** (rotation in step 1 is what actually neutralizes the exposure; this step limits future/incidental exposure from anyone who already has or later gets repo access):
   ```bash
   # after installing git-filter-repo
   git filter-repo --path .env --path .env.local --path .env.prod --path .env.development --invert-paths
   git push --force origin main
   ```
   Coordinate this with anyone else who has a local clone — a force-push rewrites history and their clones will need to be re-fetched.
4. Confirm `.gitignore` still covers these (it does) and add a pre-commit or CI check that fails the build if any `.env*` file other than `.env.example` is staged.

This is not optional or schedulable — do this before any of the sections below.

---

## 2. Verification of the Telegram interactive engine (commits `16eb710`, `3457949`)

Direct code review, not the agent's self-report. Overall: **solidly implemented**, matches the hardened v2 plan on the points that mattered most (CSRF exemption, `paymentId`-keyed callbacks, admin-only targeting, shared `resolveSubscriptionPayment`, null-`userId` guard). One real bug found, plus three polish items.

### 2.1 🟠 Bug: webhook secret-token check is soft-fail, not hard-fail

`src/app/api/telegram/webhook/route.ts`:

```ts
const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (expectedSecret) {
  const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (incomingSecret !== expectedSecret) {
    return new Response("Forbidden", { status: 403 });
  }
}
```

If `TELEGRAM_WEBHOOK_SECRET` is simply never set on the real deployment (easy to miss — it's a brand-new env var, and `.env.example` only documents it as commented-out), this check silently no-ops with no log line, and the endpoint reverts to the exact unauthenticated state Section 0.2 of the v2 plan was written to close. A misconfiguration should never look identical to "this is intentionally fine."

**Fix**: make it fail closed and loud.

```ts
const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!expectedSecret) {
  console.error("[webhook] TELEGRAM_WEBHOOK_SECRET is not set — refusing all webhook traffic");
  return new Response("Server misconfigured", { status: 500 });
}
const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
if (incomingSecret !== expectedSecret) {
  return new Response("Forbidden", { status: 403 });
}
```

Then actually set `TELEGRAM_WEBHOOK_SECRET` in the real deployment env and re-register the webhook with `secret_token` — verify with a raw `curl` that a request *without* the header now gets `500`/`403`, not `200`.

### 2.2 🟡 Duplicate notifications to linked admins

`payments/claim/route.ts` still calls `notifyEvent("payment_claimed", ...)` (plain text, via `broadcastToAll` → `gatherTargets()`) *and* separately sends the new interactive keyboard message to the admin allowlist. Any admin whose Telegram is also linked via `telegramChatId` (the same mechanism regular restaurant owners use) gets **two** messages for the same event — one they can't act on, one they can. Minor UX noise, not a correctness bug.

**Fix (pick one)**: either exclude admin-allowlisted chat IDs from the `notifyEvent` broadcast for this specific event type, or drop the plain-text `notifyEvent` call for `payment_claimed` entirely now that the interactive message carries the same information plus actions.

### 2.3 🟡 Pre-existing scope note: `gatherTargets()` isn't admin-only

Worth flagging while in this code: `telegram-broadcast.ts`'s `gatherTargets()` includes *any* `User` row with a non-null `telegramChatId` — this is any restaurant owner who linked Telegram for their own order notifications, not necessarily a platform admin. `notifyEvent("payment_claimed", ...)` (and other event types gated only by `TelegramConfig.events`) will broadcast new-signup phone numbers and payment amounts to that entire set. This predates the current feature, but since this audit is now touching payment-notification plumbing anyway, it's a reasonable time to scope `notifyEvent` broadcasts to admin/staff recipients only, separate from the per-owner order-notification use case.

### 2.4 🟢 Confirm operationally: admins must `/start` the bot once

`payments/claim/route.ts`'s fallback path sends directly to an admin's numeric Telegram ID as `chat_id` when they have no `telegramChatId` linked. Telegram will reject `sendMessage` to a user who has never opened a chat with the bot ("chat not found"). This isn't a code bug, but it's an operational prerequisite that needs to be written down: **every ID in `TELEGRAM_ADMIN_IDS` must have pressed Start on the bot at least once**, or they'll silently receive nothing (the `sendMessageWithKeyboard` failure is logged server-side but not surfaced anywhere else). Document this in the deployment runbook.

### 2.5 🟢 Edge case, working as designed but worth a follow-up: orphaned restaurant on anonymous approval

`resolveSubscriptionPayment` correctly avoids crashing on `userId: null` (the `/api/subscriptions` anonymous path) by skipping the `User.update` step — but it still runs `Restaurant.create`, producing a restaurant with no owner attached. There's currently no visible admin-panel flow to later attach an owner to an orphaned restaurant. Not urgent, but track it — otherwise these rows are dead ends that someone has to fix by hand in the DB.

---

## 3. Broader "professional, complete project" gaps

Independent of the Telegram feature, a repo-wide pass surfaced these standing gaps:

### 3.1 Tests exist but aren't wired to anything

`package.json` only defines `dev`, `build`, `start`, `lint` — **no `test` script**, despite a substantial `tests/` directory: `tests/unit/`, `tests/e2e/`, `tests/security/rbac-penetration.spec.ts`, `tests/visual/visual-regression.spec.ts`, `tests/alerts/live-alerts.spec.ts`, and more. These only run if someone remembers the exact Playwright/Vitest invocation by hand.

**Fix**: add explicit scripts (`"test": "vitest run"`, `"test:e2e": "playwright test"`, etc. — match whatever runner these files actually target) so `npm test` is a real, memorable command.

### 3.2 No CI gate before merging to `main`

`.github/workflows/` contains only `keep_alive.yml` (a cron ping). There is no workflow that runs `lint`/`build`/tests on push or PR. The Telegram feature just merged straight to `main` on the strength of a local `npm run lint && npm run build` run — for a project handling real payments, that's a thin safety net.

**Fix**: add a `ci.yml` workflow: on push/PR to `main`, run `npm ci`, `npm run lint`, `npm run build`, and `npm test` (once 3.1 exists). Treat it as a required check before merge.

### 3.3 No error monitoring/observability

No Sentry or equivalent in `package.json`. Webhook and payment-approval failures currently only surface via `console.error` — visible in server logs if someone is watching, invisible otherwise. For a flow that now auto-creates restaurants and grants paid access, silent failures are expensive to discover late.

**Fix**: add a minimal error-tracking integration (Sentry or similar) at least around the payment-claim, admin-subscriptions, and telegram-webhook routes, so a failed `$transaction` or a Telegram API error surfaces as an alert, not just a log line.

### 3.4 Secrets hygiene beyond the `.env` files (Section 1)

Once Section 1 is fixed, add a lightweight guard so it can't happen again — e.g., a CI step or pre-commit hook (`gitleaks`, `detect-secrets`, or even a simple `git diff --cached --name-only | grep -E '^\.env($|\.)'` check) that blocks a commit containing anything matching `.env*` other than `.env.example`.

---

## 4. Priority order for execution

1. **Section 1** — rotate secrets, untrack `.env*`, purge history. Not schedulable.
2. **Section 2.1** — webhook secret-token hard-fail, then actually set `TELEGRAM_WEBHOOK_SECRET` + `TELEGRAM_ADMIN_IDS` on the real deployment and verify with `curl`.
3. **Section 2.2–2.5** — polish items on the feature just shipped; low risk, do together.
4. **Section 3.1–3.2** — test script + CI gate; do before the next feature merges to `main`, not after.
5. **Section 3.3–3.4** — observability and secrets-hygiene automation; ongoing hardening.

---

## Execution prompt (for the coding agent)

> نفّذ هذا الملف (`2026-07-04-smart-menu-professional-hardening-plan.md`) بالترتيب الموجود بقسم "Priority order for execution"، وليس بأي ترتيب تاني:
>
> 1. **ابدأ بقسم 1 فوراً وبمعزل عن أي شي تاني.** لا تلمس أي كود تاني قبل ما تخلص منه: احذف `.env`, `.env.local`, `.env.prod`, `.env.development` من تتبع git (`git rm --cached`)، اعمل commit، ثم أخبرني أنا شخصياً بالنتيجة *قبل* ما تكمل — لأن تدوير الأسرار (rotate) خطوة يدوية لازم أسويها أنا بلوحة تحكم Vercel/قاعدة البيانات، مو أنت. لا تحاول تدوّر أي سر بنفسك ولا تكتب قيم جديدة بأي ملف env.
> 2. بعد ما أأكد لك إني دورت الأسرار، اعمل تنظيف تاريخ git بـ`git filter-repo` زي الموصوف بقسم 1، وأرسل لي أوامر الـforce-push بالضبط قبل ما تنفذها — هذي عملية مدمرة وتحتاج موافقتي الصريحة.
> 3. طبّق تصحيح قسم 2.1 (fail closed على `TELEGRAM_WEBHOOK_SECRET`) كـcommit منفصل. اعمل `npm run lint && npm run build` وأرسل النتيجة.
> 4. طبّق 2.2 و2.4 (التوثيق التشغيلي بالـREADME أو runbook) كـcommit واحد.
> 5. لا تنفذ 2.3 و2.5 و3.x بهذا التفاعل — هذي عناصر متابعة (follow-up)، اذكرها لي كملخص فقط وانتظر تعليماتي قبل أي تنفيذ فعلي لها.
> 6. بعد كل commit، اعرض لي `git diff` كامل للملفات المتغيرة هون بالمحادثة — مو بس ملخص جدول — قبل ما تنتقل للخطوة التالية.

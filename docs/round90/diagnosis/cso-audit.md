# Round90 — g90-D1: تدقيق أمني شامل (CSO / gstack methodology)

> **Agent:** الوكيل D1 «مدقق الأمن الأعلى (CSO)» · **Mode:** comprehensive (عتبة ثقة 2/10)
> **Scope:** full — Phases 0→14 · **Base:** commit `0d50bb1f` (إغلاق الجولة 89)
> **التاريخ:** 2026-09-06 · **الطابع الزمني للفحص:** جلسة g90-D1
> **قيود:** تشخيص فقط — لا تعديل كود · لا هجمات على الإنتاج (تحقق سلوكي بقراءة الكود وتشغيل فحوص محلية فقط)
> **بيئة الفحص:** PostgreSQL محلي على :5434 عند الحاجة (`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/smartmenu" SKIP_ENV_CHECK=true`) — لم تلزم لأي فحص في هذه الجولة (كل الفحوص git/كود/سكربتات).

---

## Phase 0 — نموذج معماري ذهني + كشف المكدس

### Stack detection (مُثبت بالأوامر)
- **Node/TypeScript**: `package.json` + `tsconfig.json` ✓
- **Framework:** **Next.js 16.2.12** (App Router — التسمية `src/proxy.ts` هي اصطلاح Next 16 للميدل‑وير) · React 19.2.4
- **DB:** Prisma 7.8.0 + PostgreSQL (Neon في الإنتاج، pooler + `channel_binding=require`)
- **Auth:** جلسات مخصّصة (كوكيز `smart-menu-session` httpOnly + توكن UUID يُخزَّن **مُهشَّرًا SHA-256** في جدول `Session`) — لا NextAuth فعليًا رغم ذكره في التكليف؛ النظام مكتوب يدويًا
- **Package manager:** pnpm 11.9.0 (lockfile مُتتبَّع في git · `allowBuilds` صريح · `minimumReleaseAge` 24h)
- **Deploy:** Vercel (نشر تلقائي عند الدفع) + Vercel Blob للصور + Vercel Cron

### المكونات وحدود الثقة
```
[Browser/客] → [Vercel Edge + src/proxy.ts (matcher مُصلَح B-1)]
   ├─ CSP ثلاث الطبقات (API صارمة / صفحات عامة static+unsafe-inline موثّق / محمية nonce+strict-dynamic)
   ├─ Origin + double-submit CSRF (timing-safe B-5)
   └─ فحص كوكيز إيجابي لـ/admin,/owner (التحقق النهائي في route handlers)
        ↓
   [65 API route] — سلم RBAC: guest→USER→owner(بعضهم multi-restaurant عبر UserRestaurant)→sub_admin(permissions[])→admin(legacy)→super_admin
        ├─ auth.ts: requireAuth/requirePermission (401 غير مصادق / 403 بلا صلاحية)
        ├─ zod لكل مدخل + createDbRateLimiter (DB-backed) على كل مسار عام حساس
        └─ Prisma parameterized ($queryRaw tagged templates فقط)
        ↓
   [PostgreSQL/Neon] — بيانات: مستخدمون/مطاعم/طلبات/ولاء/اشتراكات/تدقيق
   [Telegram API] — webhook واحد سرّي (x-telegram-bot-api-secret-token timing-safe fail-closed) + إرسالات صادرة ثابتة إلى api.telegram.org
   [Vercel Blob] — رفع مصادَق (5MB, magic-bytes, مسار tenant-marked)
   [CI: ci.yml + keep_alive.yml] — push/PR→main · صلاحيات contents:read
```
**الفرضيات الحاكمة (invariants):** الخادم وحده مصدر التسعير (orders POST يعيد الحساب) · التوكنات حساسة زمنيًا (timing-safe في كل المقارنات) · الأدوار هرمية مع استثناء MANAGE_USERS لـ super_admin فقط.

---

## Phase 1 — إحصاء سطح الهجوم

```
ATTACK SURFACE MAP (معدود فعليًا)
══════════════════
CODE SURFACE
  API route files:            65 (route.ts)
  Public (unauth by design):  10  — health · plans · public/featured · public/stats · loyalty GET/POST
                                   referrals/claim · subscriptions/validate · auth/login · auth/register · auth/logout
  Public-writable:            4   — orders POST (30/min) · items/[id]/reviews POST (5/min+30/hr/item) · loyalty POST (20/min) · referrals/claim (10/min)
  Secret-gated (machine):     3   — telegram/webhook (TELEGRAM_WEBHOOK_SECRET) · cron/cleanup · cron/subscription-expiry (CRON_SECRET Bearer)
  Authed user-level:          ~14 — auth/me · subscriptions POST/upgrade/status · user/events · upload · whatsapp/generate …
  Owner/tenant-scoped:        ~14 — orders GET/PUT · items · categories · settings · stats · loyalty/stats/redeem · owner/restaurants · owner/reviews …
  Admin-gated (permission):   ~20 — admin/* (stats, config, admins, reset-password, subscriptions, audit-logs, telegram/*, system-events, notification-preferences, profile, events/trigger …)
  File upload points:         1   — /api/upload (Vercel Blob; مصادَق + rate 5/min + magic bytes + 5MB)
  Webhook receivers:          1   — /api/telegram/webhook
  Background jobs:            2   — Vercel Cron (cleanup أسبوعي · subscription-expiry يومي)
  WebSocket/SSE:              0   (polling فقط، محصور 120/min — B-4)
  Raw SQL sites:              15  — كلها $queryRaw tagged (parameterized) — لا Unsafe
  dangerouslySetInnerHTML:    4   — كلها ثوابت ثابتة/JSON-LD مهرَّب (< → \u003c) — لا مدخل مستخدم

INFRASTRUCTURE SURFACE
  CI/CD workflows:            2   (ci.yml · keep_alive.yml) — push/PR main · لا pull_request_target
  Container configs:          1   Dockerfile (USER app · multi-stage · .dockerignore يستثني .env*)
  IaC:                        0
  Deploy target:              Vercel (auto-deploy عند الدفع — لا يعتمد على اخضرار CI)
  Secret management:          Vercel env vars · TELEGRAM_BOT_TOKEN مشفَّر AES-GCM في DB
  git history:                1008 commits · مستودع خاص (round79) · بات جPAT مضمّن في remote URL (انظر Finding 4)
```

---

## Phase 2 — آثار الأسرار (Secrets Archaeology) — نتائج الأوامر الفعلية

| الفحص (أُمر فعليًا) | النتيجة |
|---|---|
| `git log --all -G "ghp_\|gho_\|github_pat_"` | صفر (توكنات GitHub ليست في تاريخ git — فقط في .git/config الحالي، انظر Finding 4) |
| `git log --all -G "AKIA\|xoxb-\|sk_live_\|sk-ant-\|BEGIN.*PRIVATE KEY"` (للبادئات الحية) | صفر بادئات حية؛ مطابقات PRIVATE KEY السابقة = أمثلة توثيق dotenv (موثّقة round79) |
| `git ls-files '*.env'` | `.env.example` فقط (قيمه placeholders — مستبعد FP) · `.gitignore:14-20,87` يحجب `.env`/`.env*` |
| `git rev-list --all \| (ls-tree .env.local)` | **95 commit تتضمن `.env.local`** — أُدخل `c42c3223` (2026-06-19) وأُزيل من التتبع `6696ac6b` (2026-07-04) |
| `git show 5b477044:.env.local` | **`DATABASE_URL="postgresql://neondb_owner:[REDACTED]@ep-shiny-silence-atooifxr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"`** + 3 توكنات `VERCEL_OIDC_TOKEN` (JWT عمرها 12 ساعة، منتهية منذ يوليو 2026) |
| نمط توكن تيليجرام `[0-9]{8,10}:[A-Za-z0-9_-]{34,}` عبر `-G` | صفر عبر التاريخ كله |
| مقارنة كلمة مرور Neon التاريخية مع `.env` الحالي (بصمة sha256 فقط) | لا تتطابق (الـ.env المحلي الحالي يشير إلى 127.0.0.1:5434 — بيئة معاد بناؤها؛ **حالة تدوير الإنتاج غير قابلة للتحقق محليًا**) |
| `pnpm audit --json` (717 حزمة) | **صفر ثغرات** (info/low/moderate/high/critical = 0) |
| `node scripts/check-secrets.mjs` (بوابة CI) | **exit 1** — انظر Finding 2 |

**سياق مربوط:** `docs/round79-phaseF-security.md` زعم «أسرار .env الفعلية لم تُرحّل قط» — الزعم **غير دقيق**: فحصه لم يشمل `.env.local` المتتبَّع حينها. الوثيقة نفسها (§7.2) أمرت بتدوير كلمة مرور Neon — والجولة 89 (w6-closure) ما تزال تعدّها «فعل مالك حرج» معلقًا → البند **معروف (known) ومفتوح**.

---

## Phase 3 — سلسلة التوريد (Dependency Supply Chain)

- `pnpm audit`: **0 advisories** (250 prod + 430 dev + 140 optional) — أُمر فعليًا.
- `pnpm-lock.yaml` **مُتتبَّع في git** ✓ (تطبيق rule 10: finding للعكس فقط).
- **install scripts:** محصورة بـ `pnpm-workspace.yaml:1-6` `allowBuilds` صريح: `@prisma/engines, esbuild, prisma, sharp, unrs-resolver` — سلوك متوقع لمورّدين أساسيين (واسطة pnpm للحجب الافتراضي للسكربتات).
- **`minimumReleaseAge`** (نشر ≥24h) + **overrides** مثبّتة لتحديثات استشارية معروفة (`fast-uri`, `mysql2`, `brace-expansion`, `js-yaml`…) — دفاع عمودي ممتاز (round86-D7).
- prisma `preinstall` = `node scripts/preinstall-entry.js` (فحص إصدار عياري) — مستبعد كـ FP.
- **النتيجة: نظيف.** لا finding.

## Phase 4 — أمن CI/CD

- **لا `pull_request_target`** في أي workflow (ci.yml:3-8 push/pull_request/dispatch فقط) → هجوم fork-PR غير ممكن.
- **لا حقن سكربت:** لا `${{ github.event.* }}` داخل `run:` — المستخدمات الآمنة فقط (`github.ref`, `hashFiles()`, `env.*`, `runner.os`).
- **لا أسرار إطلاقًا في CI** (لا secrets.* في أي env) → لا كشف ممكن.
- صلاحيات أقل امتيازًا `contents: read` (ci.yml:19-20) ✓ · concurrency يلغي التراكم ✓.
- عيوب: **إجراءات غير مثبّتة بـ SHA** (ci.yml:41,46,48,67,170,243,272,289 + keep_alive بلا إجراءات) → Finding 3 · **لا CODEOWNERS** → Finding 5 · **بوابة secrets معطّلة** → Finding 2.
- keep_alive.yml: curl لنبض الإنتاج كل 12 دقيقة — لا سطح هجوم.

## Phase 5 — الظل البنيوي (Infrastructure Shadow)

- **Dockerfile** (round87-D6): multi-stage، `USER app` (سطر 34)، لا ARG أسرار، لا COPY .env (`.dockerignore` يستثني `.env*`)، HEALTHCHECK — **نظيف**.
- لا docker-compose/IaC/K8s في الشجرة الحالية (docker-compose.yml تاريخي بـ `${DATABASE_URL}` متغير فقط — مستبعد FP precedent 12).
- بحث DB URLs في src: صفر خارج localhost/test:test — نظيف.
- vercel.json: crons تشير لمسارات محمية بـ CRON_SECRET ✓.

## Phase 6 — الويبهوك والتكاملات

- **`/api/telegram/webhook` (route.ts:147-167):** تحقق توقيع عبر `x-telegram-bot-api-secret-token` + `timingSafeEqualStrings` + **fail-closed عند غياب السر** (403 موحّد، لا 503 كاشف للحالة) — **سليم**. مسار CSRF-exempt مبرر (csrf.ts:8-14).
- Callback القرارات المالية: بوابة 1 allowlist معرفات أدمن التيليجرام (webhook:49-64) + قرار ذري `updateMany({where:{status:'pending'}})` (subscription-decisions.ts:159-162,270-274) — **لا إعادة إنفاق**.
- توكن ربط الحساب: HMAC-SHA256 + timing-safe + **anti-replay spend-mark** ذري (webhook:258-266 · admin/telegram/verify:68-76 — نفس namespace `link-token:`) — سليم (B-6).
- TLS: لا `rejectUnauthorized:false` ولا `NODE_TLS_REJECT_UNAUTHORIZED` في src — نظيف.
- OAuth: لا يوجد. الإرسالات الصادرة كلها إلى `https://api.telegram.org` ثابت — لا SSRF.

## Phase 7 — LLM/AI

صفر أنماط: لا مفاتيح `sk-`/openai/anthropic، لا بناء system prompts، لا تقييم مخرجات نموذج. المكونات الوحيدة المشابهة: `InstallPrompt` (PWA UI) و`prompt` عابرة — **غير منطبق**.

## Phase 8 — سلسلة توريد المهارات

- المستودع: **لا `.claude/` ولا `.agents/` في الشجرة الحالية** (كانت `.agents/skills/*` تاريخيًا ثم أزيلت) — Tier 1 نظيف.
- Tier 2 (مهارات عالمية خارج المستودع): خارج نطاق التكليف — لم تُفحص (تطلب موافقة صريحة وفق المنهجية).

---

## Phase 9 — OWASP Top 10 (A01→A10)

| الفئة | الفحص | الحكم |
|---|---|---|
| **A01 تفويض** | `node scripts/check-api-auth.mjs` → **PASS** (كل handler مقفول/سرّي/عام موثق) · عيّنات مقروءة: users/[id] (MANAGE_USERS + قيد super_admin للتعيين الدور:30-38) · orders/[id] (owner scoped عبر UserRestaurant:39-53) · settings (owner scoped:48-58) · loyalty/redeem (transactional + atomic guard:56-77) · whatsapp/generate (رتبة أدوار كاملة:38-56) | **سليم** — لا IDOR عثور عليه |
| **A02 تشفير** | PBKDF2-SHA512 600k (hash.ts:8) + ترقية legacy عند الدخول · AES-256-GCM+HKDF لبو تيليجرام (config.ts/keys.ts) · توكنات الجلسة مُهشَّرة SHA-256 (session.ts:19-21) · أرضيات أسرار 64/32 (env.ts:10,17 ✓ round89-A5) | **سليم** |
| **A03 حقن** | 15 موقع `$queryRaw` — كلها tagged templates مُعاملات (stats/advanced:64-133 · menu/[slug]:148-174 · admin/stats · sitemap) · لا `$queryRawUnsafe` في كود التطبيق · لا child_process/eval · 4 مواضع dangerouslySetInnerHTML كلها ثوابت/JSON-LD مهرَّب | **سليم** |
| **A04 تصميم** | حدود تردد: login 10/min+20/15min-account (login:17-25) · register 5/min · reset 5/min · orders 30/min · reviews 5/min+30/hr/item · loyalty 20/min · webhook 120/30s · قفل حساب موثّق بSystemEvent (`auth.lockout` login:71-84) · منطق الأعمال: تسعير الخادم + خصم يفرض صفر (orders:245-248) · TOCTOU خطط داخل tx (orders:236-244) | **سليم** (انظر KNOWN-DEFERRED سقف image) |
| **A05 تهيئة** | لا CORS إطلاقًا (لا Access-Control headers — نفس الأصل) · CSP ثلاث طبقات + HSTS مشروط إنتاجًا+https · COOP/CORP · XFO DENY · nosniff · Referrer-Policy · `poweredByHeader:false` · handleError يبتلع الأخطاء الداخلية (api-helpers:99-133) | **سليم** |
| **A06 مكونات** | pnpm audit 0 · انظر Phase 3 | **سليم** |
| **A07 مصادقة/جلسات** | كوكيز httpOnly+secure(prod)+lax · سقف مطلق 7 أيام (session.ts:14) · حد 5 جلسات/مستخدم · إبطال الجلسات عند reset-password (route:30) · min password 8 | **سليم + ثغرة صغرى**: Timing enumeration (Finding 6) · لا MFA للأدمن (ملحق) |
| **A08 سلامة** | بوابات CI (تعرّض كسرها Finding 2) · بيانات خارجية: تيليجرام فقط عبر تحقق توقيع · lockfile مُتتبَّع | **انظر Findings 2,3** |
| **A09 تسجيل** | AuditLog: دخول/إنشاء/تحديث/حذف مستخدمين/reset/telegram-link (login:100 · users/[id]:57,130 · reset:32 · verify:87) · SystemEvent: قفل حساب، تغيير دور، قرارات دفع · الرفض 403 نفسه غير مُدوَّد عمومًا (استبعاد 16: ليس ثغرة) | **جيد** |
| **A10 SSRF** | كل fetch الخادم إلى `api.telegram.org` ثابت (telegram-api.ts:21, broadcast:26, decisions:24, config:90) · webhookUrl يُبنى من NEXT_PUBLIC_DOMAIN (env موثوق) · لا URL من مدخل مستخدم | **سليم** |

### تحقق حالة الإصلاحات السابقة (طلب التكليف)
| الإصلاح المدّعى | الدليل | الحالة |
|---|---|---|
| CSP+nonce matcher proxy | proxy.ts:197-216 (`.*\.ext$` مثبتة بالفحص) | ✅ قائم |
| frame-ancestors/COOP/CORP | proxy.ts:79-80,112,152 + next.config.ts:69-70 | ✅ قائم |
| سقف جلسة 7 أيام | session.ts:14,144-150,167-170 | ✅ قائم |
| CSRF timing-safe | csrf.ts:94-99 | ✅ قائم |
| anti-replay تيليجرام | webhook:258-266 + verify:68-76 (namespace موحّد) | ✅ قائم |
| rate-limit على auth | login:17-25 · register:18 | ✅ قائم |
| RBAC 401/403 | auth.ts:56,63,70 | ✅ قائم |
| سقف items=50 | orders:35 | ✅ قائم |
| سقف image 200k | items/route.ts:18 فقط — **PUT بقي 7M** (items/[id]:114) | ⚠️ **إصلاح ناقص** (موثق round89-E4 انحراف نطاق) |
| أرضيات أسرار 32/64 | env.ts:10,17 | ✅ قائم |

---

## SECURITY FINDINGS
═════════════════

| # | Sev | Conf | Status | Category | Finding | Phase | File:Line |
|---|-----|------|--------|----------|---------|-------|-----------|
| 1 | CRITICAL | 10/10 | VERIFIED | Secrets | اعتماد قاعدة Neon الإنتاجية بكلمة مرورها في تاريخ git (95 commit) — دون تدوير | P2 | (history) .env.local:3 |
| 2 | HIGH | 9/10 | VERIFIED | CI/CD | بوابة secrets في CI معطّلة: check-secrets.mjs يفشل (exit 1) على HEAD — CI أحمر ونشر Vercel لا ينتظره | P4/P2 | scripts/check-secrets.mjs + tests/unit/demo-seed-envelope.test.ts:72 |
| 3 | HIGH | 8/10 | VERIFIED | CI/CD | إجراءات workflow غير مثبّتة بـ SHA — وpnpm/action-setup@v4 إجراء طرف ثالث بعلامة قابلة لإعادة التوجيه | P4 | .github/workflows/ci.yml:46 |
| 4 | MEDIUM | 8/10 | VERIFIED | Secrets | PAT مضمّن نصًا في رابط remote بـ.git/config (صلاحيات 664) — مختلف عن توكن round79 | P2 | .git/config remote.origin.url |
| 5 | MEDIUM | 9/10 | VERIFIED | CI/CD | لا ملف CODEOWNERS يحمي workflows | P4 | .github/ (missing) |
| 6 | LOW | 8/10 | VERIFIED | OWASP A07 | فاصل زمني يميّز وجود اسم المستخدم في login | P9 | api/auth/login/route.ts:54-58 |
| 7 | MEDIUM | 9/10 | VERIFIED | OWASP A04 (known-deferred) | سقف صورة PUT = 7M مقابل 200k في POST (إصلاح round89-E4 ناقص) | P9 | api/items/[id]/route.ts:114 |
| 8 | LOW | 9/10 | KNOWN-ACCEPTED | OWASP A01 | فهرس هواتف ولاء عام (200/404) — مخفّف 20/min (round85-A2) | P9 | api/loyalty/route.ts:110-116 |
| 9 | LOW | 10/10 | VERIFIED | Secrets | توكنات Vercel OIDC منتهية في نفس ملف التاريخ | P2 | (history) .env.local:5 |

---

### Finding 1: [CRITICAL] — اعتماد Neon الإنتاجية في تاريخ git دون تدوير
* **Severity:** CRITICAL · **Confidence:** 10/10 · **Status:** VERIFIED (وجودًا) / تدويره غير مُتحقق (فعل مالك معلق)
* **Phase:** 2 — Secrets Archaeology · **Category:** Secrets
* **Evidence:** `git show 5b477044:.env.local` (و863806ed, dafcbb37):
  `DATABASE_URL="postgresql://neondb_owner:[REDACTED]@ep-shiny-silence-atooifxr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"`
  الملف متتبَّع في **95 commit**؛ أُدخل `c42c3223` (2026-06-19) وأُزيل من التتبع `6696ac6b` (2026-07-04) — لكن التاريخ خالد. (التكليف ذكر ~80؛ العد الفعلي 95.)
* **Description:** كلمة مرور مستخدم `neondb_owner` لقاعدة الإنتاج مكشوفة لأي نسخة/clone من المستودع (خاص منذ round79 — لكن fork/clone سابق أو أي تسريب نسخة يكفي). أمر التدوير مذكور منذ round79-phaseF §7.2 وأعيد في ختام الجولة 89 كفعل مالك حرج — **لا دليل على تنفيذه** (البيئة المحلية أُعيد بناؤها على PostgreSQL محلي فلا سبيل للتحقق).
* **Exploit scenario:** (1) يحصل خصم على نسخة المستودع (clone قديم، نسخة احتياطية، تعاون سابق) → (2) `git show <sha>:.env.local` يستخرج الاعتماد → (3) اتصال مباشر بمضيف pooler الإنتاجي (إن سمحت قواعد IP لـNeon) → (4) قراءة/تعديل كامل: مستخدمون، جلسات، طلبات، أرقام هواتف، قرارات دفع؛ حقن أدمن عبر جدول User (hash معروف الخوارزمية) → (5) استمرار الوصول حتى التدوير.
* **Impact:** تسريب قاعدة الإنتاج بالكامل (PII + سلامة مالية: تفعيل اشتراكات عبر تعديل الصفوف).
* **Recommendation (IR playbook):** 1) **Revoke/Rotate فورًا**: Neon console → reset password لمستخدم neondb_owner (وتحديث Vercel env ثم Redeploy). 2) تدقيق سجلات Neon للاتصالات من IPs غير معروفة منذ 2026-06-19. 3) (اختياري بعد التدوير) `git filter-repo` لتنقية التاريخ + force-push (المستودع خاص والقيمة الإسعافية أقل من قيمة التدوير). 4) توثيق أن round79-phaseF §1 ادّعى «لم تُرحّل قط» — تصحيح السجل.

### Finding 2: [HIGH] — بوابة فحص الأسرار في CI معطّلة عند HEAD
* **Severity:** HIGH · **Confidence:** 9/10 · **Status:** VERIFIED (تشغيل محلي: exit 1)
* **Phase:** 4/P2 — CI/CD · **Category:** CI/CD (A08 Software & Data Integrity)
* **Evidence:** `node scripts/check-secrets.mjs` → `exit=1` مطابقًا واحدًا: `tests/unit/demo-seed-envelope.test.ts:72 [pg] postgres…(23 chars)` — السطر fixture وهمي `'…connection refused to postgres://user:secret@host/db'` يختبر ألا يتسرب خطأ Prisma الخام للعميل. الملف أُضيف `da5d2f05` (round89-wave1) و**ليس في FILE_ALLOWLIST** (scripts/check-secrets.mjs:50-75) — الخطوة في ci.yml:61-62 تعمل قبل install، فتفشل المهمة كلها.
* **Exploit scenario:** (1) كل دفعة لـmain منذ da5d2f05 تفشل عند «Secrets scan» → (2) CI أحمر دائمًا → (3) **Vercel ينشر تلقائيًا عند الدفع بغض النظر عن CI** → الإنتاج يُحدَّث بلا أي بوابة (لا اختبارات، لا audit، لا migrate parity) → (4) تسريب سر حقيقي مستقبلاً يذوب في الضجيج الأحمر المعتاد — البوابة الأمنية الأولى عمليًا ميتة.
* **Impact:** تعطيل كامل لخط دفاع الكشف (detective control) + نشر بلا بوابات (وقد يكون كاملاً منذ آخر 6 دفعات لجولة 89 ما لم يُعالج أحد يدويًا).
* **Recommendation:** إمّا إضافة قائمة سماح موثّقة: `{file:'tests/unit/demo-seed-envelope.test.ts', id:'pg', reason:'fixture URL asserting raw Prisma errors never reach clients — not a credential'}` أو تغيير السلسلة الوهمية لصيغة غير مطابقة (`postgres://user:secret@host/db` → `postgres://«redacted»`). (لا يمكنني تعديل الكود — توصية فقط.)

### Finding 3: [HIGH] — إجراءات workflow غير مثبّتة بـSHA (طرف ثالث ضمنها)
* **Severity:** HIGH · **Confidence:** 8/10 · **Status:** VERIFIED (قراءة YAML)
* **Phase:** 4 — CI/CD · **Category:** CI/CD (Supply chain)
* **Evidence:** ci.yml:46 `uses: pnpm/action-setup@v4` (طرف ثالث — علامة قابلة لإعادة توجيه) + actions/checkout@v4:41 · setup-node@v48 · cache@v4:67,272 · upload-artifact@v4:170,243,289 (طرف أول — MEDIUM بحكم المنهجية لكنها نفس النمط).
* **Exploit scenario:** خصم يخترق مستودع action (أو يعيد توجيه علامة v4 بعد سرقة صلاحية ناشر) → الدفعة القادمة لـmain تسحب النسخة الخبيثة → تنفيذ كود داخل CI بصلاحية GITHUB_TOKEN (contents:read) وقراءة كامل الشجرة + أي future secrets. (الخطر شرطي: يتطلب اختراق upstream — لكن الاستثناء الصريح بالمنهجية: الإجراءات غير المثبتة خطر ملموس لا «تحصين مفقود».)
* **Impact:** تنفيذ شيفرة اعتباطية في خط النشر؛ أثر مباشر على سرية المستودع.
* **Recommendation:** تثبيت SHA-256 كامل لكل `uses:` (البدء بـ pnpm/action-setup ثم actions/*): `pnpm/action-setup@<sha> # v4.x.y`.

### Finding 4: [MEDIUM] — PAT مضمّن نصًا في remote URL
* **Severity:** MEDIUM · **Confidence:** 8/10 · **Status:** VERIFIED (قراءة .git/config دون كشف القيمة)
* **Phase:** 2 — Secrets · **Category:** Secrets
* **Evidence:** `.git/config` → `url = https://ghp_98aa…@github.com/ahmadmedo1012/Smart-Menu.git` (توكن 40 حرفًا كلاسيكي)؛ صلاحيات الملف **664** (مقروء جماعيًا/عالميًا محليًا). التوكن **مختلف** عن ghp_0U3x… الموثّق في round79 §7.3 (المفروض إبطاله) → على الأقل توكنان مرّا، وحالة إبطال القديم غير مؤكدة.
* **Exploit scenario:** أي عملية/نسخة احتياطية/إضافة على محطة العمل تقرأ .git/config → توكن دفع للمستودع → دفع مباشر لـmain → **Vercel ينشر تلقائيًا** → كود اعتباطي في الإنتاج.
* **Impact:** سلسلة محطة-عمل→إنتاج كاملة بلا مقاومة.
* **Recommendation:** `git remote set-url origin https://github.com/ahmadmedo1012/Smart-Menu.git` ثم `gh auth login`/credential-helper؛ إبطال أي PAT غير مستخدم (GitHub → Developer settings)؛ تدقيق PATs النشطة.
* **ملاحظة FP:** ليس «سرًّا مؤمّنًا على قرص» (استبعاد 2) — نص خام قابل للقراءة بـ664 وغير مشفّر.

### Finding 5: [MEDIUM] — لا CODEOWNERS على ملفات workflows
* **Confidence:** 9/10 · VERIFIED (`.github/` لا يحوي CODEOWNERS)
* **Phase 4 · CI/CD** — أي متعاون (مع صلاحية فرع) يعدّل ci.yml/keep_alive.yml بلا مالك إلزامي/مراجعة محجوزة.
* **Fix:** `.github/CODEOWNERS`: `/.github/workflows/ @maintainer` + فرع محمي يتطلب review.
* (استثناء المنهجية 6: CODEOWNERS الغائب على workflows خطر ملموس — لا يُستبعد.)

### Finding 6: [LOW] — فاصل زمني يكشف وجود اسم المستخدم في login
* **Confidence:** 8/10 · VERIFIED (قراءة الشيفرة)
* **Phase 9 · OWASP A07** — **Evidence:** login:54-56 يعيد 401 فورًا عند غياب المستخدم، بينما login:58 ينفّذ PBKDF2‑SHA512 600k (~290ms — hash.ts:5) عند خطأ كلمة المرور → فارق زمني قابل للقياس يميّز أسماء المستخدمين الصحيحة.
* **تخفيف قائم:** حدّان للتردد (10/min ip:user + 20/15min acct) يعقّدان القياس؛ والتسجيل مفتوح (register:46 يكشف وجود الاسم برسالة 409 صريحة أصلًا، وsubscriptions/validate:33-34 كذلك) → **الأثر المتبقي منخفض** (تأكيد وجود حساب قابل للتخمين أصلًا عبر قنوات أخرى عامة).
* **Fix (توصية):** عند غياب المستخدم نفّذ `verifyHash(password, dummyStoredHash)` ثم أعد 401 — يساوي الزمن.

### Finding 7: [MEDIUM — KNOWN-DEFERRED] — سقف صورة PUT غير موحّد
* **Confidence:** 9/10 · VERIFIED: `items/[id]/route.ts:114` `image: z.string().max(7000000)` مقابل `items/route.ts:18` (200k — round89-E4). انحراف نطاق موثّق في worklog جولة 89 («توصية للمنسق: توحيد السقف في PUT لاحقًا») — ما زال مفتوحًا.
* **الأثر:** مالك مصادَق واحد يستطيع كتابة ~5MB نص base64 لكل صنف (انتفاخ صفوف/ذاكرة استعلامات لاحقة) — ليس ثغرة حقن (القيمة تُخزَّن/تُعرض كنص/URL صورة عبر React escaping). بحكم استبعاد DoS (قاعدة 1) أُدرج «معروف-مؤجل» لا حرجًا.
* **Fix:** `.max(200_000, '…')` نفس POST + نقل الرسالة لملف مشترك.

### Finding 8: [LOW — KNOWN/ACCEPTED] — فهرس هواتف الولاء العام
* loyalty/route.ts:91-129: 200/404 يميّز وجود بطاقة لرقم هاتف (PII اسم/هاتف مُنزَعان :121). خُفّف بـ20/min/ip+restaurant (round85-A2) — البند **مُصلَح بالحدّ** ويُبقى كسلوك مقصود (استعلام كشك) مع بقايا تعداد بطيء (~28 ألف/يوم/IP). لا يُعاد الإبلاغ كثغرة جديدة؛ يوثّق كخطر مقبول.

### Finding 9: [LOW] — توكنات Vercel OIDC منتهية في التاريخ
* نفس `.env.local` التاريخي حمل 3 `VERCEL_OIDC_TOKEN` (JWT عمر 12 ساعة — كلها exp≈يوليو 2026 → منتهية الآن). لا إجراء ممكن؛ تُوثَّق لاستكمال جرد الأثر (نافذة التسريب نفسها Finding 1).

---

## Phase 10 — تقييم STRIDE (لكل مكوّن رئيسي)

| المكوّن | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| **proxy.ts (Edge)** | مقاوم: Origin مُرسّل بمنطّق platform-truth لا رؤوس مرسِل (csrf.ts:24-34) | يعدّل الطلبات؟ nonce لكل طلب + matcher مُثبت | سجل correlation id (D6) | لا أسرار فيه | matcher يخ(skip) الأصول — خفيف | لا صلاحيات |
| **جلسات/مصادقة** | توكن UUID مُهشَّر SHA-256 + httpOnly+secure+lax · **البقية: كوكيز بلا __Host- prefix (تحصين)** | تحديث ذري sliding+cap 7d | AuditLog دخول/قفل/إبطال | لا تسريب توكن في الاستجابات | PBKDF2 600k + حدّان | سلم أدوار + MANAGE_USERS لsuper_admin فقط (auth.ts:57-66) |
| **API العامة** (orders/reviews/loyalty) | لا هوية مطلوبة (by design) | تسعير الخادم + خصم=0 + idempotency-minimal (orders:216-227) | سجل + rate entries | PII منزوعة من loyalty العام | DB-backed rate limiter (فاشل مغلق) | لا سلطة تُمنح |
| **Telegram webhook** | **توقيع سرّي timing-safe fail-closed** (route:151-167) | قرارات ذرية pending→verified | SystemEvent لكل قرار | لا يردّ أسرارًا (403 موحّد) | 120/30s بعد التحقق | allowlist معرفات الأدمن (gate 1) |
| **Prisma/DB** | اتصال مُعاملات bcrypt-like | tagged raw فقط | AuditLog في DB | **PaaS: اعتماد مكشوف تاريخيًا (F1)** | pool مقيد | عبر Prisma فقط (لا SQL خام من مدخل) |
| **CI/CD** | GITHUB_TOKEN contents:read فقط | **إجراءات غير SHA (F3) + بوابة معطلة (F2)** | logs Actions | لا أسرار في CI | timeout+concurrency | لا pull_request_target |
| **Vercel Blob** | put يتطلب جلسة | مسار tenant-marked (upload:50) | — | عمومي بالقراءة (صور) | 5/min + 5MB + magic bytes | حذف مقيد بالبادئة (blob.ts TENANT_PREFIX_RE) |
| **محطة العمل/remote** | **PAT نصّي بـ664 (F4)** | — | — | — | — | دفع→نشر تلقائي |

**صافي STRIDE:** أخطر خيطين هما **I للـDB (F1)** و**T لخط النشر (F3+F4 → نشر تلقائي بلا بوابة عاملة F2)** — الثلاثة يتقاطعون في «سلسلة توريد الوصول للإنتاج».

## Phase 11 — تصنيف البيانات

```
RESTRICTED (خرق = مسؤولية قانونية):
  - كلمات المرور: User.password — PBKDF2-SHA512 600k مملّح (hash.ts) ✅
  - بيانات دفع: SubscriptionPayment (مبالغ/محافظ/هاتف metadata) — نص صريح في DB (لا PCI: تدفق تحويل يدوي بلا أرقام بطاقات)
  - PII عملاء: Order.customerPhone/Name · LoyaltyCard.customerPhone/Name · Review.customerPhone — نص صريح؛ السياسات: لا انكشاف عام (loyalty ي نزع PII :121) · الملاك يرون بيانات مطاعمهم
  - توكنات الجلسة: Session.token — SHA-256 فقط ✅
CONFIDENTIAL:
  - TELEGRAM_BOT_TOKEN: AES-256-GCM+HKDF في DB (config.ts) ✅ مع fallback legacy نصي (config.ts:66-68 — بقايا تُهضم بالتدوير)
  - JWT_SECRET/AUTH_SECRET/CRON_SECRET/TELEGRAM_WEBHOOK_SECRET: Vercel env ✅
  - DATABASE_URL (Neon): **مكشوفة تاريخيًا (F1)** ⚠️
  - AuditLog/SystemEvent: سجلات داخلية (أدمن فقط)
INTERNAL: logs المهيكلة (logger.ts — لا أسرار رصدت)، configs تشغيلية
PUBLIC: المنيوهات، المطاعم، الخطط، public/stats، landing
```

---

## Phase 12 — تصفية الإيجابيات الكاذبة + التحقق النشط (ما استُبعد ولماذا)

| المرشّح | القرار | السبب (رقم القاعدة/السابقة) |
|---|---|---|
| قيم `.env.example` (your_/0000…) | مستبعد | placeholders (FP rule) |
| `postgres://test:test@localhost` في ci.yml وseeds | مستبعد | حاويات اختبار لكل تشغيل + localhost (precedent 12) |
| fixture `postgres://user:secret@host/db` في اختبار | مستبعد كـ**سر** (rule 10: fixture اختبار) — لكن **أُبقي كبند CI (F2)** لأنه يعطّل البوابة نفسها |
| بادئات PRIVATE KEY التاريخية في README dotenv | مستبعد | أمثلة توثيق مكتبة (موثّق round79 §1) |
| 14 ثابتًا hex أبجديًا في bundles قديمة | مستبعد | كود مكتبات مجمّعة أزيل (round79 §1) |
| بقايا DoS/موارد (استطلاعات، صور كبيرة) | مستبعد كثغرات (rule 1) — عدا ما هو تناسق سقوف موثق (F7) |
| عدم MFA للأدمن + لا فحص كلمات مسرّبة | ملحق تحصيني | rule 6: ممارسة غائبة لا ثغرة ملموسة |
| CSP 'unsafe-inline' بالصفحات العامة القابلة للكاش | مستبعد | مقايضة موثقة داخل proxy.ts:88-97 (static prerender بلا nonce) — لا مدخل مستخدم في أي escape hatch |
| img-src 'https' في CSP | مستبعد | خيار تصميم (unsplash/blob) — مصادر الصور يضبطها المالك/الأدمن فقط |
| تسرّب وجود username عبر register/validate 409 | مستبعد | سلوك UX مقصود للتسجيل المفتوح + محدود التردد |
| loyalty enumeration | KNOWN/مُخفّف (F8) | الإصلاح (rate limit) قائم — لا يُعاد كثغرة جديدة |
| skill supply chain (Tier 2 عالمي) | غير مفحوص | خارج نطاق المستودع (يتطلب إذنًا) |

**التحقق النشط المنفّذ (كله قراءة/تشغيل محلي آمن):**
1. أسرار: بصمات sha256 للمقارنة فقط، لا استعلام لأي API حي ✅ (قاعدة «لا اختبار ضد APIs حية»).
2. Webhook: تتبّع كامل سلسلة الوسائط (proxy CSRF-exempt → secret gate → allowlist → atomic decision) ✅ بلا أي HTTP.
3. SSRF: تتبّع كل fetch الخادم — ثابتة إلى api.telegram.org ✅.
4. CI: فتح YAML وتأكيد غياب pull_request_target/github.event ✅، وتشغيل check-secrets فعليًا ✅ (F2).
5. Dependencies: pnpm audit فعلي (0) + قراءة allowBuilds/minimumReleaseAge ✅.
6. **التحقق المتوازي:** لا يتوفر Agent tool منفصل في هذه البيئة — self-verified بعين ناقدة: أُعيد فحص كل finding بقراءة الشيفرة المُحفِّزة (pre-emit gate #1539 — السطور مقتبسة أعلاه لكل بند).

## اتجاه الموقف (Trend) مقابل round79-phaseF
- **Resolved منذ round79:** .env* untracked (6696ac6b) · بوابة committed-env بالـCI · rate limits شاملة · RBAC سليم · CSRF+headers+جلسات محصّنة (كلها تحققت قائمة).
- **Persistent:** **F1 (Neon)** — كان أمرًا للمالك في round79 §7.2 وما زال مفتوحًا (وإنكار round79 لوجوده أصحَح هنا).
- **New:** F2 (بوابة CI معطلة — انحدار من da5d2f05) · F3 (SHA pinning لم يُطلب سابقًا) · F4 (PAT جديد في remote) · F5 (CODEOWNERS).
- **الاتجاه:** ↓ Degrading في طبقة النشر/الأسرار التشغيلية (رغم أن كود التطبيق نفسه ↑ IMPROVING بثبات عبر الجولات 85-89).

## خارطة المعالجة المقترحة (أولوية)
1. **الآن (فعل مالك):** تدوير كلمة مرور Neon (F1) — 10 دقائق تنهي البند الأخطر.
2. **الآن (رمز):** قائمة سماح/تعديل fixture ل check-secrets (F2) — يُعيد CI الأخضر فورًا.
3. **هذا الأسبوع:** SHA-pinning لpnpm/action-setup ثم بقية actions (F3) · CODEOWNERS (F5) · git remote بلا PAT (F4) + إبطال PATs غير المستخدمة.
4. **لاحقًا:** توحيد سقف PUT (F7) · dummy-hash في login (F6).

---
*وقّع: g90-D1 «CSO» — كل دليل file:line أو أمر مُلحق أعلاه؛ التقرير تشخيصي بلا أي تعديل كود.*

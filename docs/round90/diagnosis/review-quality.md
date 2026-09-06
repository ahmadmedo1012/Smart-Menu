# g90-D3 — جيش المراجعة «تخصصات الجودة» (performance · testing · maintainability · simplification)

**النوع:** تشخيص فقط — لا تعديل كود.
**النطاق:** الشجرة كاملة (src/** · tests/** · prisma/schema.prisma).
**القاعدة المقاسة حيًّا:** vitest 1082/1082 ✅ · تغطية v8 فعلية: 61.62/56.5/62.28/63.53 (تتجاوز عتبات D2: 59/54/60/61) · tsc 0 · eslint 0 أخطاء.
**ملاحظة سياق:** هذا تشخيص شجرة كاملة لا مراجعة PR — لذا عدد النتائج أعلى بطبيعته من مراجعة diff، وصيغة النتيجة أدناه محسوبة بالمنهجية كما هي.

---

## 1) performance — الوكيل الأول

### ما فُحص
- **N+1:** مسح `\.map\(async` وكل حلقات `for/forEach/while` في src (باستثناء generated) — النتيجة: نظيف عمومًا. `telegram/diagnose:57` يغلّف بـ `Promise.allSettled` · المنيو العام (السخن) يستعمل include هرميًا واحدًا للمعدِّلات (w3-f1) بلا round-trips لكل صنف · list-counts/`orderItemCountByOrder` تجمع العد بـ groupBy واحد (r88-A2).
- **استعلامات بلا حدود:** فُحصت كل 58 موقع `findMany` في app/lib — كل المسارات العامة والقصوى مُقيَّدة (`take`/`parsePagination`/cursor `sinceId`): user/events (take 50) · audit-logs · system-events (pageSize) · owner/reviews · orders · stats (take 5/10) · admin/stats (take 10/15، مرصوف داخل كاش). `sitemap` يحمل كل المطاعم النشطة بطبيعته (لازم لخريطة الموقع). cron/subscription-expiry بلا take لكنه cron بمجموعة نتائج PAID طبيعيًا محدودة — لم يُعدّ إيجادًا.
- **الفهارس:** prisma/schema.prisma مقارنة عمودًا بعمود مع أعمدة where الساخنة — مغطى ببراعة عبر جولات 86-B13/88-A2/89-A1: `Order(restaurantId,status,createdAt)` · `Referral(orderId)` · `RewardTransaction(orderId)` · `Review(menuItemId,createdAt)` · فهرس تعبير مكتوب يدويًا لـ `SystemEvent(metadata->userId, id)` يخدم استطلاع user/events. **لا فجوة فهرس حقيقية وُجدت.**
- **الكاش:** unstable_cache(60s + tag admin-stats) على admin/stats يعمل كما صُمم (r89-C1) · landing ISR 60s يخبز stats+featured server-side · public/stats مع `revalidate=60`. المرشح الوحيد المتبقي غير المكاش: لا شيء ذو أولوية (المسارات الساخنة الأخرى محمية بمحددات 120/min من B-4).
- **frontend:** `usePollWhenVisible` موحّد مع visibilitychange وinFlightGuard · probe-then-refetch (0.6KB/تكة) في owner/admin · OptimizedImage يمرر `sizes` دقيقة لكل موضع (r88-A2) مع lazy إلا LCP · الديالوجات الثقيلة في المسار العام lazy (`next/dynamic` ssr:false) · المخططات SVG مكتوبة يدويًا بلا recharts.

### النتائج (3 حرجة/معلوماتية — انظر JSON النهائي)
| # | الموقع | الخلاصة |
|---|---|---|
| P2 ‏[CRITICAL] | `src/app/api/items/[id]/route.ts:114` | سقف صورة PUT ‏`max(7000000)` مقابل `max(200_000)` في POST `items/route.ts:72` — انحراف r89-E4 المؤجل ما زال حاضرًا: مالك مصادق يستطيع تخزين data-URL بطول 7M حرفًا في عمود image، والعمود **مُحدَّد في select المنيو العام** (`menu/[slug]/page.tsx:96`) فينتقل للحمولة الأعلى حرارة في المنصة (علّة 7MB موثقة أصلًا في تعليق print: `round86-B10`). الإصلاح سطر واحد + اختبار سقف. |
| P1 [INFO] | `src/app/(protected)/admin/orders/page.tsx:118` | شلال إعادة جلب تسلسلي: عند تغيّر الـprobe تُجلب الصفحات `1..pageRef.current` بـ`await` تتابعي (N round-trip) بدل Promise.all ثم setOrders مرة واحدة. |
| P3 [INFO 5] | `src/app/api/settings/route.ts:204` | حذف صور المعرض المزالة بحلقة `await deleteBlob` تتابعية — deleteBlob لا يرمي أبدًا (blob.ts:47 catch داخلي) فيمكن allSettled فورًا. |
| P4 [INFO 5] | `src/app/(public)/menu/[slug]/page.tsx:201` | مسح خطي متداخل: `featuredData.filter(f => items.some(...))` ‏O(F×I) + بناء JSON-LD `categories.map(c => items.filter(...))` ‏O(C×I) — popularIds صُنع Set (سطر 198) لكن featuredMap/jsonLd لا؛ الخلل مقيد بحدود صغيرة لكنه نمط مكرر سهل الإصلاح بـSet/Map مرة واحدة. |

---

## 2) testing — الوكيل الثاني

### ما فُحص
- **تغطية v8 حية** (تُ Coverage-include = src/lib + src/app/api): 27 مسار API بصفر% أسطر + 8 مسارات جزئية، مقاطعة مع مسح مراجع كل مسار في tests/** (unit + e2e) لتمييز «صفر unit لكن e2e يغطيه» (مثل auth/register — api-sweep/persona) عن «صفر في أي مكان».
- **skips:** 12 موقع `test.skip` كلها مشروطة وموثقة (HSTS على Vercel فقط · rate-limit على IP مشترك · بدون مجنّد محلي) — لا skips اعتباطية.
- **اختبارات بلا assertions:** كل ملفات unit فيها expect ≥ 6 — لا اختبارات فارغة.
- **العزل:** env يُستعاد بـafterEach (lib.test.ts:254) · vi.hoisted/vi.mock هو النمط القياسي · session.test:121 ينام 350ms حقيقية لفترة إعادة المحاولة 300ms (بطيء قليلًا لكنه حتمي).
- **فلَيكر:** useFakeTimers مستعمل حيث يلزم (rate-limit/session/telegram-broadcast).

### البحيرات (أعلى قيمة → أدنى)
| # | الموقع | الخلاصة |
|---|---|---|
| T1 ‏[CRITICAL] | `src/app/api/upload/route.ts:12-45` | **صفر تغطية في أي مكان** (لا unit ولا e2e — grep مؤكد) لمسار فيه 8 حواجز أمنية: content-length مبكر · فحص BLOB_READ_WRITE_TOKEN · auth · rate-limit 5/min · File؟ · الحجم 5MB بالضبط · نوع MIME · **magic bytes** (jpeg/png/webp/avif). أي انحدار في magic-byte validation يمر بصمت. |
| T2 ‏[CRITICAL] | `src/app/api/whatsapp/generate/route.ts:38-55` | **صفر تغطية في أي مكان** لسلم أدوار كامل: owner عبر مطعم آخر → 401 · owner مطعمه → مسموح · sub_admin/bلا APPROVE_ORDERS → 403 · USER → 403 · super_admin → يمر (إصلاح r86-A11) · ثم `update whatsappSent`. انحدار هنا يسرّب إيصالات عبر المستأجرين بصمت. |
| T3 [INFO 8] | `src/app/api/admin/system-events/route.ts:67,91,121` | 29.5% أسطر — POST/PUT/DELETE (كتابات مقيدة بصلاحية VIEW_ANALYTICS + zod) غير مختبرة وحدتها؛ D2 غطى stats/config/profile/notification-preferences فقط. |
| T4 [INFO 8] | `src/app/api/telegram/broadcast-targets/route.ts:18` + `[id]:7` | صفر في أي مكان — CRUD أهداف البث التي تتغذى عليها fanout تيليجرام (telegram-broadcast.ts:41). |
| T12 [INFO 8] | `src/lib/telegram.ts:27-32` | **escaping مضاد التصيّد (r86-A5)** — `esc()` لملء `_*[`\\` في القيم المُرسلة لقناة الأدمن — يُmock في كل مواضع الاستدعاء (audit-events/login-lockout) ولا اختبار مباشر واحد لسلوك التهريب. ملف 7.14% تغطية. |
| T5 [INFO 7] | `src/app/api/admin/create-owner/route.ts:15` | صفر في أي مكان — ينشئ مستخدمي owner: مسار 409 (اسم مستخدم مكرر) و403 بلا MANAGE_RESTAURANTS غير مثبتين. |
| T6 [INFO 7] | `src/app/api/cron/cleanup/route.ts:9` | صفر في أي مكان — حارس CRON_SECRET بثابت-الوقت + نافذتا احتفاظ (جلسات 7d / سجلات تدقيق 90d) — csrf.test يذكر المسار كسلسلة أصل فقط. |
| T7 [INFO 7] | `src/lib/config.ts:53-70` | getDecryptedBotToken ‏52.9% — فروع غير مختبرة: توكن مُفكًّا بصيغة خاطئة → null · fallback النص الصريح القديم · أولوية env. أمن تيليجرام يمر عبر هذه الفروع. |
| T8 [INFO 7] | `src/lib/rate-limit.ts:75-93` | فرع سباق القيد الفريد (upsert فشل → findUnique احتياطي) + **fail-closed** (count=max+1 عند فشل القراءتين) — أسطر 75-93 غير مغطاة؛ خطأ هنا يغلق كل المستخدمين أو يفتح المحدد كله. |
| T9 [INFO 6] | `src/app/api/restaurants/route.ts:128` | 34% أسطر — منطق إنشاء المطاعم (slug مكرر/معاملة قوائم متعددة/قيود الخطة) غير مغطى unit (e2e يغطي 401/403/422 فقط في api-sweep:218-248). |

### قائمة اختبارات قابلة للإضافة فورًا (بحيرات، بالنمط القياسي vi.hoisted)
1. **upload.test.ts:** magic-bytes مزيف (مثل: text/plain بجسد HTML) → 400 · حجم بالضبط 5MB+1 → 413 · محتوى jpeg صحيح بلا token → 500 · ضيف → 401 قبل أي put · 6 طلبات بالدقيقة → 429 · مسار المستأجر `restaurants/{id}/` في اسم blob.
2. **whatsapp-generate.test.ts:** مصفوفة (owner×own/other · sub_admin بدون/مع APPROVE_ORDERS · USER · super_admin) × (401/200/403) + توقيت update whatsappSent يحدث مرة.
3. **system-events-writes.test.ts:** sub_admin بلا صلاحية POST → 403 · zod غائب → 422 مغلف · PUT لمعرّف غير موجود → 404.
4. **notifyEvent-escape.test.ts:** اسم مستخدم `[click here](https://evil.com)` يصل للرسالة مرمّزًا (`\[click here\]...`) — يثبّت r86-A5.
5. **config-bot-token.test.ts:** decryptValue(encryptValue('123:abc')) يعيد الأصل · توكن مُفكًّا بصيغة سيئة → null وليس رميًا · fallback نص صريح مطابق للـregex.
6. **rate-limit-race.test.ts:** mock upsert يرمي → findUnique يُقرأ · كلاهما يفشل → success=false (فشل مغلق).

---

## 3) maintainability — الوكيل الثالث

### ما فُحص
- **Dead exports:** مسح آلي لكل تصديرات src/lib (52 ملفًا) مع عدّ المستهلكين عبر src+tests. tsconfig يفعّل noUnusedLocals/noUnusedParameters (الواردات/المتغيرات الميتة ممنوعة بالفعل — tsc 0). المتبقي: أنواع مرسلة للتوثيق فقط + الاكتشافات أدناه.
- **التعليقات المتقادمة:** مسح TODO/FIXME → صفر (مطابقات placeholder هاتف فقط). التعليقات المرصوفة بالجولات دقيقة ومطابقة للكود (تحقّقت عينات: restaurants:62، session.ts:151-161، menu-queries.ts:4-9). **لا إيجاب كاذب دُفع.**
- **DRY:** مقارنة diff حرفية بين كتل الإشعارات.

| # | الموقع | الخلاصة |
|---|---|---|
| M1 [INFO 9] | `src/app/api/subscriptions/route.ts:117-162` مقابل `src/app/api/subscriptions/upgrade/route.ts:160-205` | **~46 سطرًا مكررًا حرفيًا** لكل السباكة: بناء chatIds (adminIds + broadcastTargets + fallback TELEGRAM_CHAT_ID/GROUP_IDS) → تقسيم 10 → allSettled → تسامح فشل كل محادثة → لوحة مفاتيح inline. الفروق كلها نص الرسالة وتسميات الأزرار (diff مؤكد: 66/66 سطرًا متطابقًا إلا الرسائل). مساعد واحد (مثل `notifyApproversPayment(msg, buttons)` في lib) يحذف ~80 سطرًا صافيًا ويوحّد سلوك الفشل. |
| M2 [INFO 8] | `src/app/(protected)/admin/orders/page.tsx:99-120` | نسخة inline من probe-then-refetch تكرّر use-orders-polling.ts (المُستخرجة لصفحة owner في r89-G) — نفس توقيع probe حرفيًا `total:id:updatedAt` في الملفين (use-orders-polling.ts:56 مقابل page.tsx:111). التعميم بمعامل استراتيجية refetch يوحّدهما. |
| M3 [INFO 8] | `src/lib/telegram.ts:36` | `sendTelegramMessage = sendTelegramNotification` — alias «للتوافق الخلفي» بصفر مستهلكين (grep عبر src+tests: لا شيء). |

---

## 4) simplification (advisory — لا يُحتسب في الدرجة ولا يُطبق آليًا أبدًا)

| # | الموقع | الوسم | الخلاصة | lines_removable |
|---|---|---|---|---|
| S2 | `src/app/(public)/menu/[slug]/page.tsx:147-195` | speculative | سلسلة fallback ثلاثية (showcaseTags → أعمدة قاعدة r79 → `[]`) لنافذة «DB متأخر المخطط» أُغلقت نهائيًا: هجرة 18 أسقطت العمود القديم وهجرة 19 مطبقة في الإنتاج (131 فحصًا حيًا في r89-closure) وقاعدة محلية عليها 19/19. فحص عمود مفقود P2022 صار مستحيلًا — يبقى `.catch` واحد للتسامح مع أخطاء التشغيل العابرة. **لا يُحذف مسار خطأ حي — يُحذف فرع تخميني لنافذة هجرة منتهية فقط.** | ~30 |
| S3 | `src/lib/arabic-plural.ts:27-36` | native | `arabicNumberState` يعيد اشتقاق تصنيف الأعداد العربية الذي توفره المنصة: `new Intl.PluralRules('ar').select(n)` يعيد zero/one/two/few/many/other بذات القواعد (3-10 few · 11-99 many · ‏100+ other) — والخريطة المخصصة تحوّل 100+ إلى many = نفس صيغة المفرد الناتجة. تبقى خرائط الكلمات (صنفان/أصناف...) — يستبدل المصنّف فقط. | ~8 |

**net: -38 lines possible** (S2+S3 فقط — M1/M3 غير محسوبة هنا لأنها ملك maintainability).

---

## 5) الدمج (Step 4.6 من review-army)

- **dispatched:** performance (4 نتائج: 1 CRITICAL · 3 INFORMATIONAL) · testing (10: 2 CRITICAL · 8 INFORMATIONAL) · maintainability (3 INFORMATIONAL) · simplification (2 advisory).
- **التصديق المتقاطع:** P2 (performance) هو الوجه التشغيلي لانحراف r89-E4 الموثق — الأولوية القصوى للأسطول لأن إصلاحه سطر واحد.
- **بوابات الثقة:** كل النتائج ≥ 5 — عرض عادي (5-6 تُقرن بتحذير «ثقة متوسطة»: P1, P3, P4, T9).

### القائمة النهائية (سطر-JSON لكل نتيجة)

```json
{"severity":"CRITICAL","confidence":8,"path":"src/app/api/items/[id]/route.ts","line":114,"category":"performance","summary":"سقف صورة PUT هو max(7000000) بينما POST الموازن max(200_000) (items/route.ts:72) — انحراف r89-E4 المؤجل: مالك مصادق يخزن data-URL بطول 7M في عمود image المُحدَّد في select المنيو العام (menu/[slug]/page.tsx:96) فتنتفخ أثقل حمولة عامة في المنصة (تعليق print/page.tsx:28-29 يوثق 7MB/صنف كخطر معروف)","fix":"وحّد السقف: z.string().max(200_000, 'الصورة كبيرة جداً — الحد الأقصى حوالي 150 كيلوبايت بعد الضغط') + اختبار سقف PUT بالنمط الموجود في plan-limit.test.ts:212","fingerprint":"src/app/api/items/[id]/route.ts:114:performance","specialist":"performance"}
{"severity":"CRITICAL","confidence":9,"path":"src/app/api/upload/route.ts","line":12,"category":"testing","summary":"صفر تغطية في أي مكان (grep tests/ = 0) لمسار فيه 8 حواجز: content-length مبكر (16) · غياب BLOB token (18) · auth (22) · rate-limit 5/min (28) · صلاحية File (33) · حجم 5MB (34) · MIME (35) · magic bytes (40-45) — أي انحدار في التحقق من بايتات الملف يمر بصمت","fix":"tests/unit/upload-route.test.ts بنمط vi.hoisted + vi.mock لـ@vercel/blob put: magic-bytes مزيفة → 400 · حجم 5MB+1 → 413 · ضيف → 401 قبل أي put · حد 429 بعد 5 · اسم blob يحمل restaurants/{id}/","test_stub":"vi.mock('@vercel/blob', () => ({ put: vi.fn(async (f, b) => ({ url: 'https://x.vercel-storage.com/' + f })) })); it('يرفض ملفًا برأس JPEG ومحتوى HTML', async () => { const file = new File([Buffer.from('<html>')], 'a.jpg', { type: 'image/jpeg' }); const res = await POST(reqWith(file)); expect(res.status).toBe(400); })","fingerprint":"src/app/api/upload/route.ts:12:testing","specialist":"testing"}
{"severity":"CRITICAL","confidence":8,"path":"src/app/api/whatsapp/generate/route.ts","line":38,"category":"testing","summary":"صفر تغطية في أي مكان لسلم الأدوار (38-55): owner عبر مطعم غير مملوك → 401 عبر userRestaurant · owner مطعمه → 200 · super_admin يمر (إصلاح r86-A11) · admin/sub_admin بلا APPROVE_ORDERS → 403 · USER → 403 — ثم update whatsappSent (77)؛ انحدار التفويض هنا يسرّب إيصالات عبر المستأجرين بصمت","fix":"tests/unit/whatsapp-generate.test.ts بمصفوفة (role × own/other restaurant) بنمط rbac-matrix الحالي + تأكيد update { whatsappSent: true } مرة واحدة","test_stub":"it.each([[ 'owner', 'other', 401 ], [ 'owner', 'own', 200 ], [ 'sub_admin', 'any', 403 ], [ 'USER', 'any', 403 ], [ 'super_admin', 'any', 200 ]])('%s على %s → %i', async (role, which, code) => { ... expect(res.status).toBe(code) })","fingerprint":"src/app/api/whatsapp/generate/route.ts:38:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/(protected)/admin/orders/page.tsx","line":118,"category":"performance","summary":"شلال إعادة جلب تسلسلي: عند كشف تغيّر الـprobe تُجلب الصفحات 1..pageRef.current بحلقة await تتابعية (N round-trip متتالية بكل تكة استقصاء ناجحة) بينما يمكن Promise.all ثم setOrders مرة واحدة","fix":"const pages = await Promise.all(range(1, pageRef.current).map(p => fetchPage(p))) ثم دمجها بالترتيب في setOrders واحدة","fingerprint":"src/app/(protected)/admin/orders/page.tsx:118:performance","specialist":"performance"}
{"severity":"INFORMATIONAL","confidence":5,"path":"src/app/api/settings/route.ts","line":204,"category":"performance","summary":"حذف صور المعرض المزالة بحلقة await deleteBlob تتابعية — deleteBlob لا يرمي أبدًا (blob.ts:47-49 catch داخلي) فالتسلسل بلا مبرر","fix":"await Promise.allSettled(removed.map((url) => deleteBlob(url, { restaurantId })))","fingerprint":"src/app/api/settings/route.ts:204:performance","specialist":"performance"}
{"severity":"INFORMATIONAL","confidence":5,"path":"src/app/(public)/menu/[slug]/page.tsx","line":201,"category":"performance","summary":"مسح خطي متداخل في المسار العام: featuredData.filter(f => items.some(...)) بـ O(F×I) (201) وبناء JSON-LD بـ O(C×I) عبر categories.map + items.filter (275-290) — بينما popularIds بُني Set (198) — نمط مكرر قابلة للتبديل بجملة Set/Map واحدة","fix":"const itemIds = new Set(items.map(i => i.id)) قبل الفلترة، و Map<categoryId, items[]> مبنية مرة واحدة لدورة JSON-LD","fingerprint":"src/app/(public)/menu/[slug]/page.tsx:201:performance","specialist":"performance"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/app/api/admin/system-events/route.ts","line":67,"category":"testing","summary":"29.5% أسطر فقط — كتابات POST/PUT/DELETE (67/91/121) المقيدة بـVIEW_ANALYTICS مع zod غير مختبرة وحدتها (D2 غطى stats/config/profile/notification-preferences فقط)","fix":"tests/unit/system-events-writes.test.ts: sub_admin بلا صلاحية → 403 · body غائب → 422 مغلّف · PUT لمعرف غير موجود → 404","fingerprint":"src/app/api/admin/system-events/route.ts:67:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/app/api/telegram/broadcast-targets/route.ts","line":18,"category":"testing","summary":"صفر تغطية في أي مكان لـCRUD أهداف البث (route + [id]) التي تتغذى عليها fanout تيليجرام (telegram-broadcast.ts:41 يقرأ isActive فقط)","fix":"tests/unit/broadcast-targets.test.ts بنمط admin-routes: 401/403/422 + تأكيد isActive:false يزيل الهدف من المستلمين","fingerprint":"src/app/api/telegram/broadcast-targets/route.ts:18:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/lib/telegram.ts","line":27,"category":"testing","summary":"escaping مضاد التصيّد (r86-A5) في notifyEvent يرمّز _*[`\\ في القيم المُرسلة لقناة الأدمن — يُmock في كل مواضع الاستدعاء (audit-events.test.ts:47, login-lockout.test.ts:29) ولا اختبار مباشر واحد يثبّت سلوكه؛ الملف 7.14% تغطية","fix":"tests/unit/notify-event-escape.test.ts: prisma.mock + config نشط → notifyEvent('evt', { name: '[click](https://evil.com)' }) → جسم الرسالة عبر sendMessage يحتوي \\[click\\] وليس رابطًا خامًا","fingerprint":"src/lib/telegram.ts:27:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/admin/create-owner/route.ts","line":15,"category":"testing","summary":"صفر تغطية في أي مكان لمسار ينشئ مستخدمي owner: فرعا 403 (بلا MANAGE_RESTAURANTS) و409 (اسم مستخدم مكرر) غير مثبتين","fix":"tests/unit/create-owner.test.ts: 403 لغير المصرح · 409 عند findUnique موجب · 201 + hashPassword مستدعى","fingerprint":"src/app/api/admin/create-owner/route.ts:15:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/cron/cleanup/route.ts","line":9,"category":"testing","summary":"صفر تغطية في أي مكان — حارس CRON_SECRET بثابت-الوقت (15) ونافذتا الاحتفاظ (جلسات 7d · سجلات 90d) غير مختبرتين (csrf.test.ts:128 يذكر المسار كسلسلة أصل فقط)","fix":"tests/unit/cron-cleanup.test.ts: بلا CRON_SECRET → 401 · bearer خاطئ → 401 · صحيح → deleteMany مرتين بعدد النوافذ الصحيح","fingerprint":"src/app/api/cron/cleanup/route.ts:9:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/lib/config.ts","line":53,"category":"testing","summary":"getDecryptedBotToken ‏52.9% أسطر — الفروع غير المغطاة (54-70): أولوية env · توكن مُفك تشفيره بصيغة خاطئة → null مع logError · fallback النص الصريح القديم المتوافق مع regex — كل أمن تيليجرام يمر من هنا","fix":"tests/unit/config-bot-token.test.ts: env يسبق DB · decryptValue(encryptValue('123:abc')) دورة كاملة · فك فاسد → null لا رمي · قيمة نصية قديمة صحيحة الصيغة تُقبل","fingerprint":"src/lib/config.ts:53:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/lib/rate-limit.ts","line":75,"category":"testing","summary":"فرع سباق القيد الفريد (upsert يرمي → findUnique احتياطي 79-88) وفرع fail-closed (90-93: count=max+1 يمنع الجميع عند فشل القراءتين) غير مغطيين — خطأ هنا يغلق المنصة كلها أو يعطّل كل المحددات","fix":"tests/unit/rate-limit-race.test.ts: mock upsert يرمي P2002 → findUnique يُقرأ → success صحيح · كلاهما يفشل → success:false (المفتاح: الفشل المغلق) · destroy يوقف interval","fingerprint":"src/lib/rate-limit.ts:75:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/api/restaurants/route.ts","line":128,"category":"testing","summary":"34% أسطر — منطق إنشاء المطاعم (معاملة menus متعددة · slug مكرر · قيود الخطة، الأسطر 124-268) بلا اختبار unit؛ e2e api-sweep يغطي 401/403/422 فقط (218-248)","fix":"tests/unit/restaurants-create.test.ts بال mock القياسي: slug مكرر → 409 · create متعدد داخل $transaction · رفض بلا بيانات منيو (refine:55)","fingerprint":"src/app/api/restaurants/route.ts:128:testing","specialist":"testing"}
{"severity":"INFORMATIONAL","confidence":9,"path":"src/app/api/subscriptions/route.ts","line":117,"category":"maintainability","summary":"~46 سطرًا مكررة حرفيًا (diff مؤكد) مع subscriptions/upgrade/route.ts:160-205: بناء chatIds (adminIds + broadcastTargets + env fallback) → تقسيم 10 → allSettled → تسامح فشل كل محادثة → لوحة inline؛ الفروق نص الرسالة وتسميات الأزرار فقط","fix":"مساعد مشترك (مثل notifyApproversPayment(msg, buttons) في lib) يحذف ~80 سطرًا صافيًا ويوحّد سلوك الفشل بين الملفين","fingerprint":"src/app/api/subscriptions/route.ts:117:maintainability","specialist":"maintainability"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/app/(protected)/admin/orders/page.tsx","line":99,"category":"maintainability","summary":"نسخة inline من probe-then-refetch تكرر use-orders-polling.ts المستخرجة لصفحة owner في r89-G — توقيع probe مطابق حرفيًا (total:id:updatedAt) في page.tsx:111 و use-orders-polling.ts:56","fix":"عمّم hook بمعامل استراتيجية refetch (owner: صفحة 1 · admin: كل الصفحات المحملة) واعتمده في الصفحتين","fingerprint":"src/app/(protected)/admin/orders/page.tsx:99:maintainability","specialist":"maintainability"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/lib/telegram.ts","line":36,"category":"maintainability","summary":"export const sendTelegramMessage = sendTelegramNotification — alias التوافق الخلفي بصفر مستهلكين عبر src+tests (grep مؤكد)","fix":"احذف السطر — لا مستوردون لتحديثهم","fingerprint":"src/lib/telegram.ts:36:maintainability","specialist":"maintainability"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/(public)/menu/[slug]/page.tsx","line":163,"category":"speculative","summary":"سلسلة fallback ثلاثية (showcaseTags → أعمدة قاعدة → []) تحمي نافذة هجرة أُغلقت: هجرة 18 أسقطت العمود القديم و19 مطبقة إنتاجيًا (131 فحصًا حيًا r89-closure) وP2022 صار مستحيلًا — الفرع التخميني لا مسار خطأ حي (يُبقى .catch واحد للتسامم العابر)","fix":"استبدل السلسلة باستعلام showcaseTags واحد + .catch(() => [])","lines_removable":30,"advisory":true,"fingerprint":"src/app/(public)/menu/[slug]/page.tsx:163:speculative","specialist":"simplification"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/lib/arabic-plural.ts","line":27,"category":"native","summary":"arabicNumberState يعيد اشتقاق تصنيف أعداد العربية الذي توفره المنصة: new Intl.PluralRules('ar').select(n) (zero/one/two/few/many/other بذات القواعد؛ 100+ other تحوّل لنفس صيغة المفرد التي يعطيها many هنا) — خرائط الكلمات نفسها تبقى","fix":"const state = new Intl.PluralRules('ar').select(count) مع خريطة other→many؛ الاختبارات القائمة تبقى حارسًا","lines_removable":8,"advisory":true,"fingerprint":"src/lib/arabic-plural.ts:27:native","specialist":"simplification"}
```

### الحساب النهائي

- **SPECIALIST REVIEW: 17 non-advisory findings (3 critical, 14 informational) from 4 specialists** + 2 advisory (simplification).
- **PR Quality Score: 0/10** — بالمعادلة `max(0, 10 - (3×2 + 14×0.5))` = max(0, -3). **توضيح إلزامي:** المعادلة مصممة لمراجعة PR واحدة، وهنا شُغّل التخصص على **الشجرة كاملة** بعد 89 جولة — النتيجة 0 تعكس حجم النطاق لا سوء الجودة؛ أدلة الصحة: 1082/1082 اختبارًا أخضر، تغطية فوق العتبات، صفر أخطاء tsc/eslint، وفهرسة وتقسيم صفحات ممتازان.
- **net: -38 lines possible** (simplification advisory فقط).

### الأولويات المقترحة لأسطول الإصلاح (خارج منهجية الدمج — إرشاد للمنسق)
1. **P2** (سطر واحد + اختبار) — يغلق انحراف r89-E4 المؤجل بحجة أداء حقيقية على أحرج مسار.
2. **T1+T2** — بحيرتا اختبار صفرية بمسارين أمنيين، قابلتان للكتابة فورًا بالنمط القياسي (انظر test_stub).
3. **M1** — تقليص ~80 سطرًا مكررة في مسار الدفع (أقل مخاطرة: سلوك مقفول باختبارات subscriptions-family/upgrade القائمة).
4. البقية بحسب سعة الموجة.

---

## ملاحق — أدلة المسح (للتكرار)

- N+1: `rg '\.map\(async' src` → موقع واحد (diagnose) مغلّف بـ allSettled · حلقات for → كل الحلقات على مصفوفات محدودة أو مكسورة بbreak/attempts.
- التغطية: `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/smartmenu" SKIP_ENV_CHECK=true npx vitest run --coverage` → 1082/1082 · 61.62/56.5/62.28/63.53 (الملف الكامل: /tmp/coverage-full.txt).
- Dead exports: مسح آلي (python) لكل `^export` في src/lib ثم عدّ الكلمات عبر src+tests مطروحًا ملف التعريف → 24 مرشحًا، 21 منها أنواع/داخلية، الفعلي: telegram.ts:36.
- skips: 12 موقعًا مشروطًا (HSTS/rate-limit/seed) — لا اعتباطية.

/**
 * W6-B3 (G-1 من تدقيق W6-A3): توليد رموز QR لكل طاولة — التحليل والبناء،
 * بمعزل عن الصفحة كي يُختبر مباشرة (نفس سبب وجود lib/table-session.ts:
 * منطق قابل للاختبار بمعزل، وصفحة الواجهة تظل رقيقة).
 *
 * العقد مع الجانب العميلي (r135، lib/table-session.ts):
 * - الرمز يرمّز رابط المنيو العام + ‎?table=N‎ بأرقام غربية (URLSearchParams
 *   يقرأها ثم Number() → عدد صحيح).
 * - النطاق الصالح 1..999 — أي رقم خارج النطاق يُتجاهل عند الزبون كتشويش،
 *   فتوليد رمز خارج النطاق = رمز لا يعمل؛ نرفضه هنا قبل الطباعة.
 * - السلة تلحق «طاولة: N» بملاحظات الطلب — فتصل التذكرة/الواتساب موقّعة
 *   بالطاولة.
 *
 * قواعد الإدخال (عائلة r138 للهاتف/الدفع): المالك العربي يكتب «٣» كما
 * يكتب «3» — الأرقام الشرقية تُطوى إلى غربية قبل التحقق، والقيمة المخزنة
 * غربية دائماً (قانون الأرقام في lib/format.ts: ما يقرؤه المستخدم أرقام
 * غربية، وما يُدخله يقبل الشكلين).
 */

/** الحد الأعلى لرقم الطاولة — مرآة TABLE_MAX في table-session.ts (r135). */
const TABLE_MAX = 999;

/**
 * سقف الدفعة الواحدة: كل رمز يُولَّد PNG بعرض 1000px (حدّة 300dpi عند 65mm)
 * في الشجرة — 40 رمزاً = 5 صفحات A4 بمقياس شبكة 2×4، وزمن توليد معقول
 * (~50ms للرمز)، وبلا ضغط ذاكرة على جوال المالك. المطعم الأكبر يقسّم إلى
 * دفعات (من 41 إلى 80…) — رسالة الخطأ تقول ذلك صراحة.
 */
const MAX_BATCH = 40;

/** طي الأرقام الشرقية (٠-٩) إلى غربية — نسخة محلية من عائلة phone.ts. */
function normalizeDigits(s: string): string {
        return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export type TableRangeResult =
        | { ok: true; tables: number[] }
        | { ok: false; error: string };

/**
 * تحليل مدخلي «من الطاولة / إلى الطاولة» إلى قائمة أرقام جاهزة للتوليد.
 *
 * - يقبل الأرقام الشرقية والغربية ومسافات المحيط (تقليم).
 * - يرفض: حقولاً فارغة/غير رقمية، خارج 1..999، من > إلى، ودفعة أطول من
 *   سقف MAX_BATCH — برسالة عربية سببية واحدة (رسالة الخطأ نفسها تظهر
 *   تحت الحقل في الصفحة).
 * - النتيجة صاعدة دائماً [من..إلى] — المالك يرى الأرقام بترتيب الطباعة.
 */
export function parseTableRange(fromRaw: string, toRaw: string): TableRangeResult {
        const from = Number(normalizeDigits(fromRaw.trim()));
        const to = Number(normalizeDigits(toRaw.trim()));
        if (!fromRaw.trim() || !toRaw.trim() || !Number.isFinite(from) || !Number.isFinite(to)) {
                return { ok: false, error: 'أدخل رقمي الطاولة (من / إلى)' };
        }
        if (!Number.isInteger(from) || !Number.isInteger(to)) {
                return { ok: false, error: 'رقم الطاولة يجب أن يكون عدداً صحيحاً' };
        }
        if (from < 1 || to < 1 || from > TABLE_MAX || to > TABLE_MAX) {
                return { ok: false, error: 'أرقام الطاولات بين 1 و 999' };
        }
        if (from > to) {
                return { ok: false, error: 'رقم «من» يجب أن يكون أصغر من أو يساوي رقم «إلى»' };
        }
        const count = to - from + 1;
        if (count > MAX_BATCH) {
                return { ok: false, error: `الحد الأقصى ${MAX_BATCH} رمزاً في الدفعة — قسّم الطاولات إلى دفعات` };
        }
        const tables: number[] = [];
        for (let n = from; n <= to; n++) tables.push(n);
        return { ok: true, tables };
}

/**
 * رابط رمز الطاولة N — الشكل الحرفي الذي يقرأه captureTableFromUrl
 * (r135): مسار المنيو العام + ‎?table=N‎. أصل الرابط يمرَّر كما هو من
 * الصفحة (window.location.origin — نفس مصدر الرمز المفرد القائم).
 */
export function tableMenuUrl(origin: string, slug: string, table: number): string {
        return `${origin}/menu/${slug}?table=${table}`;
}

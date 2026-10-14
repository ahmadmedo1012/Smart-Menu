/**
 * r93-N2 (F3/H-2 من تقرير التفتيش 1-c) — المصدر الوحيد لخطط الاشتراك الافتراضية.
 *
 * الخلل كان ازدواجية المصدر: نصوص الخطط معرفة مرتين — في مسار
 * /api/seed (route.ts) وفي scripts/ci-seed.mjs — فأصلح r92 نص ci-seed فقط
 * («أصناف غير محدودة» → «أصناف حتى 9999» مع maxItems=9999) بينما بقي مسار
 * API يحمل الكذبة القديمة، وupsertه يعيد إدخالها فوق أي قاعدة بُذرت عبره
 * (هجرة r92 للنصوص no-op على قاعدة فارغة تُبذر بعدها).
 *
 * الحل: البيانات في default-plans.json (مصدر واحد) — يستورده هذا الملف
 * لمسار البذرة API، ويقرؤه ci-seed.mjs مباشرة عبر readFileSync (سكربت .mjs
 * لا يستورد TS). اختبار r92-plan-texts يطابق النسختين حرفيًا (deep-equal)
 * فيصبح افتراقهما مستحيلًا دون إخفار الاختبار.
 *
 * ملاحظة r92-A3/A4: النص يتبع السقف المُنفَّذ فعليًا (حارس PlanLimitError) —
 * لا وعد «غير محدودة» في أي خطة.
 *
 * P13-2b (T2) — إعادة محاذاة السلّم مع الإنتاج (قاعدة بيانات الإنتاج هي
 * مصدر الحقيقة ولا تُمسّ): كان الملف يحمل خطتين فقط (مجاني + Premium
 * بالقيمة الحارسة maxMenus=9999) بينما الإنتاج يعرض سلّم الخطط الخمس
 * (هجرة r92 للنصوص + zz_round120 للحدود): Free 0 (1/10/100) · Basic 19
 * (1/50/500) · Premium 29 (2/100/1000) · Pro 129 (3/9999/99999) ·
 * Enterprise 299 (10/9999/99999)، كلها periodDays=30. القيم الحارسة
 * 9999/99999 تبقى فقط في Pro/Enterprise (حارس فعلي يرفض ما بعده — وفق
 * قانون r92 يُذكر العدد نفسه في النص). هذه بيانات بذرة للبيئات
 * المحلية/CI — بيانات الإنتاج صحيحة أصلًا ولا تُلمس.
 */
import rawPlans from './default-plans.json';

export interface DefaultPlan {
        name: string;
        nameAr: string;
        price: number;
        periodDays: number;
        maxMenus: number;
        maxItems: number;
        maxOrders: number;
        sortOrder: number;
        features: string[];
}

/** الخطط الافتراضية (السلّم الخماسي المطابق للإنتاج — P13-2b T2) — نفس الثوابت التي يكتبها ci-seed حرفيًا. */
export const DEFAULT_PLANS: DefaultPlan[] = rawPlans;

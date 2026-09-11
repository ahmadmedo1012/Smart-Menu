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
 * ملاحظة r92-A3/A4: النص يتبع السقف المُنفَّذ فعليًا (maxItems=9999 حارس
 * PlanLimitError) — لا وعد «غير محدودة» في أي خطة.
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

/** الخطط الافتراضية (مجاني + مدفوعة) — نفس الثوابت التي يكتبها ci-seed حرفيًا. */
export const DEFAULT_PLANS: DefaultPlan[] = rawPlans;

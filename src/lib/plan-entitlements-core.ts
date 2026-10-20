/**
 * W7-B — G-4 من تدقيق W6-A3 (المؤجل عمدًا في W6-B6): مصدر واحد لحقوق
 * الميزات حسب الخطة (plan FEATURE entitlements) — حتى الآن لم تُفرض سوى
 * سقوف العدد (maxMenus/maxItems/maxOrders عبر PlanLimitError).
 *
 * مبدأ العائلة (نمط W6-B6 `isOwnerSubscriptionActive`):
 *   - القرار من صف الخطة نفسه (Restaurant.planId → SubscriptionPlan)
 *     عبر sortOrder — نفس الرتبة التي تحكم ترقية الاشتراك
 *     (subscriptions/upgrade:100 «newPlan.sortOrder <= currentPlan.sortOrder»).
 *   - المالك وحده يُخضع للبوابة؛ عائلة الأدمن (super_admin/sub_admin/admin)
 *     تتجاوز (مشغّلو المنصة) — نفس دلالات حارس الانتهاء حرفيًا.
 *   - planId فارغ = خطة مجانية (نفس قراءة owner/restaurants:196
 *     `plan: result.planId ? 'paid' : 'free'`) → تحت كل سقف ميزة.
 *   - سقف الميزة fail-closed: خطة مجهولة/محذوفة لا تفتح ميزة (هذه
 *     بوابات منتج لا مسارات مال — الحرمان الخاطئ تذكرة دعم لا خسارة مال؛
 *     عكس حارس الانتهاء الذي يفتح لقيم null عمدًا لأنه يوقف الكتابة).
 *
 * قرارات الموجة (موثقة في ENGINEERING_STATE — W7-B):
 *   - advancedStats  («إحصائيات متقدمة»): بريميوم فأعلى — الوعد الحقيقي
 *     الوحيد المختلف بين «إحصائيات أساسية» (تبويب نظرة عامة، مفتوح) و
 *     «إحصائيات متقدمة» (تبويب التحليلات + /api/stats/advanced).
 *   - csvExport («تصدير CSV»): الاحترافية فأعلى — مسار تشغيلي (تصدير
 *     بيانات الطلبات) يُفرض في مسار خادم مخصص /api/orders/export.
 *   - referralProgram («برنامج الإحالات»): الاحترافية فأعلى — بوّابات
 *     الإنشاء (loyalty/referral POST + referrals/claim). برنامج الولاء
 *     الأساسي (النقاط/الطوابع/الاستبدال/المستويات) يبقى عالميًا عمدًا:
 *     وجهة العميل التي تقود الطلبات — قفلها يكسر رحلة زبائن مطاعم
 *     المجاني (قرار منتج موثق).
 */

/** الميزات المبوّبة (كل ميزة: رتبة الخطة الدنيا + اسمها العربي للنسخة). */
export type PlanFeatureKey = 'advancedStats' | 'csvExport' | 'referralProgram';

export interface PlanFeatureDef {
        /** الدنيا بـ sortOrder من صف الخطة (رتبة السلّم: مجاني 1 … الشركات 5). */
        minSortOrder: number;
        /** اسم الخطة الدنيا كما في بذرة السلّم (default-plans) — للنسخة العربية. */
        minPlanNameAr: string;
        /** التسمية العربية للميزة (واجهات القفل). */
        labelAr: string;
}

export const PLAN_FEATURES: Record<PlanFeatureKey, PlanFeatureDef> = {
        advancedStats: { minSortOrder: 3, minPlanNameAr: 'بريميوم', labelAr: 'الإحصائيات المتقدمة' },
        csvExport: { minSortOrder: 4, minPlanNameAr: 'الاحترافية', labelAr: 'تصدير CSV' },
        referralProgram: { minSortOrder: 4, minPlanNameAr: 'الاحترافية', labelAr: 'برنامج الإحالات' },
};

/** الحد الأدنى من معلومات صف الخطة اللازمة للقرار (يُستهلك من أي قراءة). */
export type PlanTier = { name: string | null; nameAr: string | null; sortOrder: number | null } | null | undefined;

/** قرار نقي: هل خطة بهذه الرتبة تفتح الميزة؟ (خطة مجهولة/فارغة → لا). */
export function planAllowsFeature(plan: PlanTier, feature: PlanFeatureKey): boolean {
        return (plan?.sortOrder ?? 0) >= PLAN_FEATURES[feature].minSortOrder;
}

/** خريطة كل الميزات دفعة واحدة (لواجهة القفل: /api/owner/entitlements). */
export function entitlementsForPlan(plan: PlanTier): Record<PlanFeatureKey, boolean> {
        return {
                advancedStats: planAllowsFeature(plan, 'advancedStats'),
                csvExport: planAllowsFeature(plan, 'csvExport'),
                referralProgram: planAllowsFeature(plan, 'referralProgram'),
        };
}

/**
 * نسخة عائلة رفض الميزة — حرفية واحدة لكل ميزة عبر كل المواقع (نمط
 * «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» من W6-B6: النسخة توحَّد في
 * المصدر ويُقرأ عهدها من ملفات المسار).
 */
export function planFeatureDeniedCopy(feature: PlanFeatureKey): string {
        const { minPlanNameAr } = PLAN_FEATURES[feature];
        return `هذه الميزة متوفرة في خطة «${minPlanNameAr}» فأعلى. قم بالترقية للمتابعة.`;
}

/** جملة القفل القصيرة لواجهات الأزرار المقفلة (مع رابط /subscribe بجانبها). */
export function planFeatureLockLabel(feature: PlanFeatureKey): string {
        const { minPlanNameAr } = PLAN_FEATURES[feature];
        return `متوفرة في خطة ${minPlanNameAr} — قم بالترقية`;
}

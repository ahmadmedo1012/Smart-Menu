import { NextRequest } from 'next/server';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { resolveRestaurantScope } from '@/lib/stats-queries';
import { getRestaurantPlanTier, entitlementsForPlan } from '@/lib/plan-entitlements';

/**
 * W7-B (G-4): قراءة الحقيقة الخادمية لحقوق ميزات الخطة — القراءة
 * «الخفيفة المخصصة» التي تستهلكها أسطح القفل الثلاثة (زر تصدير CSV في
 * صفحة الطلبات، تبويب التحليلات في لوحة المالك، أقسام الإحالات في صفحة
 * الولاء): استعلام واحد على مفتاح أساسي، مرة واحدة لكل تحميل صفحة (لا
 * يُستقصى في مسارات الاقتراع).
 *
 * العقد: الأعلام مشتقة من المصدر الواحد plan-entitlements.ts نفسه الذي
 * تفرض به الحارسات 403 (csvExport: /api/orders/export · advancedStats:
 * /api/stats/advanced · referralProgram: loyalty/referral + claim) —
 * الواجهة تعرض القفل والخادم يرفض؛ العلم تفضيل لا تعزيز.
 *
 * سلّم النطاق: resolveRestaurantScope نفسه الذي تستخدمه مسارات
 * الإحصاءات (owner→ملكية/رابط، admin/super_admin كامل، sub_admin
 * VIEW_ANALYTICS، USER مرفوض).
 */
export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { searchParams } = new URL(request.url);
                const scope = await resolveRestaurantScope(auth, searchParams);
                if (!scope.ok) return scope.response;

                const plan = await getRestaurantPlanTier(scope.restaurantId);

                return success({
                        plan: plan ? { name: plan.name, nameAr: plan.nameAr, sortOrder: plan.sortOrder } : null,
                        features: entitlementsForPlan(plan),
                });
        } catch (e) {
                return handleError(e);
        }
}

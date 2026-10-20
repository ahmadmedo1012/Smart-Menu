/**
 * W7-B (G-4) — النصف الخادمي لحقوق ميزات الخطة: الجلب والبوابة فقط.
 * القرار النقي والنسخ والخريطة يعيشون في plan-entitlements-core.ts
 * (خالٍ من prisma — تستهلكه مكونات الواجهة أيضًا دون سحب قاعدة
 * البيانات إلى حزمة العميل).
 */
import { prisma } from '@/lib/db';
import { error } from '@/lib/api-helpers';
import type { NextResponse } from 'next/server';
import { planAllowsFeature, planFeatureDeniedCopy, type PlanFeatureKey } from './plan-entitlements-core';

export * from './plan-entitlements-core';

/** صف الخطة لفلتر المطعم الواحد (قراءة مفهرسة واحدة على المفتاح الأساسي). */
export async function getRestaurantPlanTier(restaurantId: number): Promise<
        { name: string | null; nameAr: string | null; sortOrder: number | null } | null
> {
        const row = await prisma.restaurant.findUnique({
                where: { id: restaurantId },
                select: { plan: { select: { name: true, nameAr: true, sortOrder: true } } },
        });
        return row?.plan ?? null;
}

export type EntitlementAuth = { role: string; userId?: number | null; restaurantId?: number | null };

export type EntitlementResult =
        | { ok: true; plan: { name: string | null; nameAr: string | null; sortOrder: number | null } | null }
        | { ok: false; response: NextResponse };

/**
 * بوابة الميزة لمسارات المالك: عائلة الأدمن (super_admin/sub_admin/
 * admin — نفس إصرار isOwnerSubscriptionActive) تتجاوز دائمًا؛ المالك
 * يُفحص من صف خطته. تُستدعى بعد حل نطاق المستأجر وقبل أي عمل قاعدة
 * بيانات للميزة نفسها.
 */
export async function requirePlanFeature(
        auth: EntitlementAuth,
        restaurantId: number,
        feature: PlanFeatureKey
): Promise<EntitlementResult> {
        if (auth.role !== 'owner') {
                // عائلة الأدمن تتجاوز (مشغّلو المنصة) — نفس دلالات حارس الانتهاء.
                return { ok: true, plan: null };
        }
        const plan = await getRestaurantPlanTier(restaurantId);
        if (!planAllowsFeature(plan, feature)) {
                // النسخة من المصدر الواحد (core) — نفس حرفية 403 في كل المواقع.
                return { ok: false, response: error(planFeatureDeniedCopy(feature), 403) };
        }
        return { ok: true, plan };
}

import { prisma } from "@/lib/db";

export type SubscriptionCheck = {
  subscriptionStatus?: string | null;
  planEnd?: Date | string | null;
};

/**
 * Lazy subscription-expiry enforcement.
 *
 * الاشتراك غير نشط إذا:
 * - subscriptionStatus === 'EXPIRED' ، أو
 * - planEnd (تاريخ انتهاء الخطة) مضى عن الآن.
 * القيم غير المعروفة (null/undefined) لا تُسقط الاشتراك.
 */
export function isSubscriptionActive(user: SubscriptionCheck | null | undefined): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === "EXPIRED") return false;
  if (user.planEnd) {
    const end = user.planEnd instanceof Date ? user.planEnd : new Date(user.planEnd);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return false;
  }
  return true;
}

/**
 * يجلب حالة اشتراك المالك من قاعدة البيانات:
 * - subscriptionStatus من User
 * - planEnd = أقرب تاريخ انتهاء بين جميع منيواته (multi-menu):
 *   انتهاء أي منيو يعني انتهاء الاشتراك.
 */
export async function getUserSubscriptionState(userId: number): Promise<SubscriptionCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      restaurants: {
        select: { restaurant: { select: { planEnd: true } } },
      },
    },
  });
  if (!user) return { subscriptionStatus: null, planEnd: null };

  const ends = user.restaurants
    .map((r) => r.restaurant.planEnd)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  const planEnd = ends.length > 0 ? new Date(Math.min(...ends.map((d) => d.getTime()))) : null;

  return { subscriptionStatus: user.subscriptionStatus, planEnd };
}

/**
 * حارس الاشتراك لمسارات المالك (owner/*):
 * - الأدمن (super_admin / sub_admin / admin) يتجاوزون الحارس.
 * - المالك: يُفحص بموقع قاعدة البيانات (lazy enforcement).
 */
export async function isOwnerSubscriptionActive(
  auth: { userId: number; role: string } | null | undefined,
): Promise<boolean> {
  if (!auth) return false;
  if (auth.role === "super_admin" || auth.role === "sub_admin" || auth.role === "admin") {
    return true;
  }
  return isSubscriptionActive(await getUserSubscriptionState(auth.userId));
}
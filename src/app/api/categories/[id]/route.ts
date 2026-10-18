import { NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { success, error, notFound, handleError } from "@/lib/api-helpers";
import { isOwnerSubscriptionActive } from "@/lib/subscription-guard";

import { requireAuth, requirePermission } from "@/lib/auth";
import { revalidateMenu } from "@/lib/menu-cache";
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // r103-F7: same bounds as the create schema (was the only unbounded pair).
  nameAr: z.string().max(100).nullable().optional(),
  icon: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    /* W6-B6 (G-5 — تدقيق W6-A3): حارس الاشتراك المنتهي — نفس عائلة
       items (r138) وowner/* (c661e707): تحرير الأقسام مالك متوقف بعد
       الانتهاء (لافتة OwnerShell تقول «تعديل الأصناف والأسعار متوقف» —
       الأقسام جزء من تحرير المنيو). الموظفون يتجاوزون داخل الحارس. */
    if (!(await isOwnerSubscriptionActive(auth))) {
      // single quotes = byte-identical with the family (items r138 / owner/* c661e707)
      return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
    }

    const { id } = await params;
    const catId = Number(id);
    if (Number.isNaN(catId)) return error("معرّف غير صالح", 400); // round90-F6
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.menuCategory.findUnique({ where: { id: catId } });
    if (!existing) return notFound("القسم"); // round90-F6: كان "Category" — كلمة إنجليزية تصل للعميل

    // Owners can only update categories of restaurants they manage — multi-menu
    // aware via UserRestaurant links (same check as settings/route.ts & items)
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      const link = await prisma.userRestaurant.findUnique({
        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.restaurantId } },
      });
      if (!link) return error("غير مصرح", 403);
    }
    // Staff roles (admin/sub_admin — super_admin passes automatically) may only
    // update arbitrary restaurants' categories when they hold MANAGE_RESTAURANTS
    if (auth.role !== "owner") {
      const perm = await requirePermission("MANAGE_RESTAURANTS");
      if (!perm.authorized) return error(perm.error, perm.status);
    }

    const data = await prisma.menuCategory.update({ where: { id: catId }, data: body });
    logAudit({
      action: "update",
      actorId: auth.userId,
      targetType: "menuCategory",
      targetId: catId,
      metadata: { restaurantId: existing.restaurantId, fields: Object.keys(body) },
    }).catch(() => {});
    // round85-B9: purge the ISR cache so the category edit is live instantly
    await revalidateMenu(existing.restaurantId);
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    /* W6-B6 (G-5): حذف قسم = تحرير منيو — نفس الحارس ونفس نسخ العائلة
       (الأقسام تُبث للمنيو العام عبر revalidateMenu). */
    if (!(await isOwnerSubscriptionActive(auth))) {
      // single quotes = byte-identical with the family (items r138 / owner/* c661e707)
      return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
    }

    const { id } = await params;
    const catId = Number(id);
    if (Number.isNaN(catId)) return error("معرّف غير صالح", 400); // round90-F6
    const existing = await prisma.menuCategory.findUnique({ where: { id: catId } });
    if (!existing) return notFound("القسم"); // round90-F6: كان "Category" — كلمة إنجليزية تصل للعميل

    // Owners can only delete categories of restaurants they manage — multi-menu
    // aware via UserRestaurant links (same check as settings/route.ts & items)
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      const link = await prisma.userRestaurant.findUnique({
        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.restaurantId } },
      });
      if (!link) return error("غير مصرح", 403);
    }
    // Staff roles (admin/sub_admin — super_admin passes automatically) may only
    // delete arbitrary restaurants' categories when they hold MANAGE_RESTAURANTS
    if (auth.role !== "owner") {
      const perm = await requirePermission("MANAGE_RESTAURANTS");
      if (!perm.authorized) return error(perm.error, perm.status);
    }

    // r121-D7: the cascade into MenuItem dies on the r119-S7 RESTRICT FKs
    // (OrderItem_itemId_fkey / Review_menuItemId_fkey — financial-history
    // stance) whenever the category holds an ever-ordered or reviewed item.
    // That P2003 used to fall to handleError's generic 400 («بيانات مرتبطة لا
    // يمكن حذفها») with no hint of the blocker or the remedy — map it to the
    // same honest 409 family the restaurant DELETE paths use. Any P2003 from
    // this delete IS the history case (MenuCategory's only RESTRICT children
    // are the item's order/review links), so no field_name disambiguation is
    // needed; the DB constraint stays the backstop.
    try {
      await prisma.menuCategory.delete({ where: { id: catId } });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2003") {
        return error(
          "لا يمكن حذف قسم يحتوي أصنافاً لها طلبات أو تقييمات مسجلة — انقل الأصناف إلى قسم آخر أولاً",
          409
        );
      }
      throw e;
    }
    logAudit({
      action: "delete",
      actorId: auth.userId,
      targetType: "menuCategory",
      targetId: catId,
      metadata: { restaurantId: existing.restaurantId, name: existing.name },
    }).catch(() => {});
    // round85-B9: purge the ISR cache so the deletion is live instantly
    await revalidateMenu(existing.restaurantId);
    return success({ id: catId });
  } catch (e) {
    return handleError(e);
  }
}

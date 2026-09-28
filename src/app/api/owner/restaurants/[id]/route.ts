import { NextRequest } from 'next/server';
import { logAudit } from "@/lib/audit";
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { deleteBlob } from '@/lib/blob';
import { z } from 'zod';

// r119-S7: مواضّح لحالة P2003 من Order_restaurantId_fkey (RESTRICT الآن) —
// حذف مطعم لديه طلبات مرفوض على مستوى قاعدة البيانات نفسها؛ هذا النوع
// يحوّل الخطأ إلى نفس 409 الودية التي يعطيها الفحص المسبق.
class OrdersPresentError extends Error {}

const patchSchema = z.object({
        isPrimary: z.boolean().optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
});

// isPrimary is a UserRestaurant column (the owner's link to this restaurant).
// Admins (super_admin/admin/sub_admin) have no UserRestaurant link row — writing
// isPrimary for them would throw record-not-found inside the tx. Admins update
// restaurant fields only; isPrimary stays an owner-only concern.
const adminPatchSchema = patchSchema.omit({ isPrimary: true });

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);
                // Subscription guard: expired → 403
                if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                const { id } = await params;
                const restaurantId = Number(id);
                if (!restaurantId) return error('معرف غير صالح', 400);

                // Verify ownership (or staff with full trust).
                // round92-wave3-2: توحيد البوابة مع نمط المنصة (requirePermission):
                // admin/super_admin ثقة كاملة (أدمن legacy بعمود permissions فارغ —
                // من هجرة قديمة — لم يعد محجوبًا من إدارة المطاعم)، sub_admin
                // يتطلب MANAGE_RESTAURANTS، وغيرهم يسقط لفحص ملكية الرابط أدناه
                // (إصلاح تصعيد r90 باقٍ لsub_admin).
                const isAdmin = auth.role === 'super_admin' ||
                        auth.role === 'admin' ||
                        (auth.role === 'sub_admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS'));

                const body: z.infer<typeof patchSchema> = (isAdmin ? adminPatchSchema : patchSchema).parse(await _request.json());

                if (!isAdmin) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                        });
                        if (!link) return error('غير مصرح', 403);
                }

                const result = await prisma.$transaction(async (tx) => {
                        // Set primary: clear others first — only reachable for non-admin body
                        // (admins' schema strips isPrimary, so it can never appear here)
                        if (body.isPrimary === true && auth.userId) {
                                await tx.userRestaurant.updateMany({
                                        where: { userId: auth.userId },
                                        data: { isPrimary: false },
                                });
                                await tx.userRestaurant.update({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                        data: { isPrimary: true },
                                });
                                // Mirror on User.restaurantId for backward compat
                                await tx.user.update({
                                        where: { id: auth.userId },
                                        data: { restaurantId },
                                });
                        }
                        const restaurant = await tx.restaurant.update({
                                where: { id: restaurantId },
                                data: {
                                        ...(body.name !== undefined ? { name: body.name } : {}),
                                        ...(body.description !== undefined ? { description: body.description } : {}),
                                        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
                                },
                        });
                        return restaurant;
                });

                return success(result);
        } catch (e) {
                return handleError(e);
        }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);
                // Subscription guard: expired → 403
                if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                const { id } = await params;
                const restaurantId = Number(id);
                if (!restaurantId) return error('معرف غير صالح', 400);

                // Only super_admin/admin (full trust), or sub_admin with
                // MANAGE_RESTAURANTS, may delete arbitrary restaurants.
                // round92-wave3-2: أدمن legacy بpermissions فارغة يمر (نمط requirePermission
                // الموحد) · sub_admin بدونه يسقط لفحص الرابط أدناه (إصلاح r90 باقٍ).
                const isAdmin = auth.role === 'super_admin' ||
                        auth.role === 'admin' ||
                        (auth.role === 'sub_admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS'));
                if (!isAdmin) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                        });
                        if (!link) return error('غير مصرح', 403);
                        if (link.isPrimary) return error('لا يمكن حذف المنيو الأساسي. عيّن منيو آخر كأساسي أولاً.', 400);
                }

                // r118-A7-P3: orders are financial records — a restaurant that ever took
                // an order is NOT hard-deletable by owners/admins (one click erased the
                // whole tenant irreversibly). super_admin keeps full trust (still audited).
                const orderCount = await prisma.order.count({ where: { restaurantId } });
                if (orderCount > 0 && auth.role !== 'super_admin') {
                        return error('لا يمكن حذف مطعم لديه طلبات مسجلة — تواصل مع الدعم للاحتفاظ بسجل الطلبات', 409);
                }

                // r118-A2-P3: tenant deletion was the only unaudited destructive family
                // (every sibling delete audits) — capture the row BEFORE the cascade.
                // r121-D6: capture logo/gallery + item images too (admin-path parity —
                // this owner path never cleaned Vercel Blob, so every owner-side
                // delete leaked the tenant's blobs silently).
                const [restRow, items] = await Promise.all([
                        prisma.restaurant.findUnique({
                                where: { id: restaurantId },
                                select: { name: true, slug: true, logo: true, gallery: true },
                        }),
                        prisma.menuItem.findMany({
                                where: { category: { is: { restaurantId } } },
                                select: { image: true },
                        }),
                ]);

                // Delete the link, then the restaurant (cascade removes categories/items/orders)
                await prisma.$transaction(async (tx) => {
                        if (!isAdmin) {
                                await tx.userRestaurant.delete({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                        }
                        // r93-N1 (F2/H-1): قيد Review_menuItemId_fkey=Restrict لا يُحذف
                        // التقييمات أي cascade — مطعم لديه تقييم واحد كان يفشل حذفه
                        // نهائيًا (P2003→400). التقييمات هنا PII مرتبطة بأصناف المطعم
                        // المحذوفة أصلًا (لا معنى لبقائها يتيمة أصلًا) فتُحذف صراحة
                        // داخل المعاملة نفسها قبل restaurant.delete — بنمط حذف
                        // المستخدم الذي يزيل PII المرتبطة قبل الحذف الجذري.
                        await tx.review.deleteMany({
                                where: { menuItem: { category: { restaurantId } } },
                        });
                        await tx.restaurant.delete({ where: { id: restaurantId } });
                }).catch((e: { code?: string; meta?: { field_name?: string } }) => {
                        // r119-S7: Order_restaurantId_fkey صار RESTRICT — قاعدة البيانات ترفض
                        // حذف مطعم لديه طلبات (كان الـcascade يمحو التاريخ المالي بصمت).
                        // P2003 لا يحدد القيد بنفسه — نفحص field_name: قيد الطلبات فقط
                        // يتحول إلى 409 الودية؛ أي قيد آخر (مثل تقييمات r93-N1) يبقى على
                        // مسار handleError القديم.
                        if (e?.code === 'P2003' && String(e?.meta?.field_name ?? '').includes('Order_restaurantId_fkey')) {
                                throw new OrdersPresentError();
                        }
                        throw e;
                });

                logAudit({
                        action: 'delete',
                        actorId: auth.userId ?? undefined,
                        targetType: 'restaurant',
                        targetId: restaurantId,
                        metadata: { name: restRow?.name, slug: restRow?.slug, source: 'owner-api', orderCount },
                }).catch(() => {});

                // r121-D6: blob cleanup strictly AFTER the DB tx succeeded (admin-path
                // shape — round86-A3 tenant-scoped deletes, best-effort per URL).
                for (const item of items) deleteBlob(item.image, { restaurantId });
                if (restRow) {
                        deleteBlob(restRow.logo, { restaurantId });
                        if (Array.isArray(restRow.gallery)) {
                                restRow.gallery.forEach((u: string) => deleteBlob(u, { restaurantId }));
                        }
                }

                return success({ deleted: true });
        } catch (e) {
                if (e instanceof OrdersPresentError) {
                        return error('لا يمكن حذف مطعم لديه طلبات مسجلة — تواصل مع الدعم للاحتفاظ بسجل الطلبات', 409);
                }
                return handleError(e);
        }
}

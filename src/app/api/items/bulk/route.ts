import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { revalidateMenu } from '@/lib/menu-cache';
import { ItemStatus } from '@/generated/prisma/enums';

/**
 * P43 SM-1c — عمليات جماعية على الأصناف (تحديد متعدد في صفحة المنيو):
 *
 *   * set-status: إخفاء/إظهار دفعة (يستبدل تسلسل W6-B6 PUT-per-item —
 *     كان محدودًا بسقف items PUT 20/min ويتوقف عند أول فشل).
 *   * archive: أرشفة دفعة — نفس دلالات PUT المفرد (archivedAt=now، غير
 *     تدميري، الاسترجاع من لوحة «المؤرشفة»)، لا يتجاوز شيئًا (الأرشفة
 *     تنقص المجموعة الحية — لا فحص سقف أصلاً؛ الاسترجاع المفرد يفحص).
 *   * move: نقل دفعة إلى تصنيف آخر — نفس حارس المستأجر الوجهة في PUT
 *     المفرد (r121-E1): الوجهة يجب أن تملكها نفس المطاعم المالكة للأصناف
 *     (نقل عابر للمطاعم يغيّر محاسبة سقف الخطة → مرفوض بصراحة 422).
 *
 * الملكية: كل صنف يجب أن يعود لمطعم يملكه الطالب (owner عبر UserRestaurant
 * متعدد المنيوهات؛ عائلة الأدمن تحت MANAGE_RESTAURANTS). سقف الدفعة 100
 * (حجم صفحة معقول للقسم الواحد؛ أعلى منه = إساءة). AuditLog واحد لكل
 * عملية (metadata بالعدد + الأنواع، لا قائمة معرفات كاملة — السجل يبقى
 * صغيرًا؛ المعرفات الكاملة قابلة للاستنتاج من التدقيق التفصيلي عند الحاجة).
 */

// round91-F-B family: كتابة جماعية واحدة بدل 20 PUT — 10/min لكل مستخدم
// (الاستخدام الشرط: نقرات محرر صاحب القائمة).
const bulkLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

const itemStatusValues = Object.values(ItemStatus) as [string, ...string[]];

const bulkSchema = z
        .object({
                action: z.enum(['set-status', 'archive', 'move'], { message: 'نوع العملية الجماعية غير صالح' }),
                ids: z
                        .array(z.number().int().positive())
                        .min(1, 'حدد صنفًا واحدًا على الأقل')
                        .max(100, 'الحد الأقصى 100 صنف في العملية الواحدة'),
                // set-status فقط.
                status: z.enum(itemStatusValues, { message: 'حالة الصنف غير صالحة' }).optional(),
                // move فقط.
                categoryId: z.number().int().positive().optional(),
        })
        .superRefine((v, ctx) => {
                if (v.action === 'set-status' && v.status === undefined) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'حالة الصنف مطلوبة لهذه العملية' });
                }
                if (v.action === 'move' && v.categoryId === undefined) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['categoryId'], message: 'التصنيف الهدف مطلوب لهذه العملية' });
                }
        });

/** سلّم الملكية: كل restaurantId في المجموعة يجب أن يكون مملوكًا للطالب. */
async function callerOwnsAll(
        auth: { authorized: boolean; role: string; userId: number | null; restaurantId: number | null },
        restaurantIds: number[]
): Promise<boolean> {
        if (auth.role === 'owner') {
                for (const rid of new Set(restaurantIds)) {
                        if (rid === auth.restaurantId) continue;
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: rid } },
                        });
                        if (!link) return false;
                }
                return true;
        }
        // عائلة الأدمن: MANAGE_RESTAURANTS تفتح المنصة (نفس دلالات items PUT).
        const perm = await requirePermission('MANAGE_RESTAURANTS');
        return perm.authorized;
}

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { success: allowed } = await bulkLimiter.check(`items-bulk:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                // r138 family rule: حارس الاشتراك المنتهي على كل كتابة مالك.
                if (!(await isOwnerSubscriptionActive(auth))) {
                        return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                }

                const parsed = bulkSchema.safeParse(await request.json());
                if (!parsed.success) return error(parsed.error.issues[0].message, 422);
                const body = parsed.data;

                // جلب الأصناف + مطاعمها (عبر الفئة) — كل المعرفات يجب أن توجد.
                const items = await prisma.menuItem.findMany({
                        where: { id: { in: body.ids } },
                        select: { id: true, categoryId: true, category: { select: { restaurantId: true } } },
                });
                if (items.length !== new Set(body.ids).size) {
                        return error('أحد الأصناف المحددة غير موجود — حدّث الصفحة وحاول مجدداً', 404);
                }

                const restaurantIds = [...new Set(items.map((i) => i.category.restaurantId))];
                if (!(await callerOwnsAll(auth, restaurantIds))) {
                        return error('غير مصرح', 403);
                }

                let updatedCount = 0;
                let targetRestaurantIds = restaurantIds;

                if (body.action === 'move') {
                        // r121-E1 family: حارس المستأجر الوجهة — النقل داخل مطعم
                        // الأصناف نفسه فقط (عبر المطاعم يغيّر محاسبة السقف).
                        const destCategory = await prisma.menuCategory.findUnique({
                                where: { id: body.categoryId! },
                                select: { id: true, restaurantId: true },
                        });
                        if (!destCategory) return error('التصنيف الهدف غير موجود', 404);
                        if (restaurantIds.length > 1 || restaurantIds[0] !== destCategory.restaurantId) {
                                return error('النقل الجماعي متاح داخل تصنيفات المطعم نفسه فقط', 422);
                        }
                        // W6-B6 عقد menu-reorder: النقل يكتب ترتيبًا ذيليًا متسلسلًا
                        // بعد آخر صنف في الوجهة (لا حشر في منتصف ترتيب موجود).
                        const maxSort = await prisma.menuItem.aggregate({
                                where: { categoryId: destCategory.id },
                                _max: { sortOrder: true },
                        });
                        let nextSort = (maxSort._max.sortOrder ?? -1) + 1;
                        // تحديث فردي داخل معاملة: كل صنف يأخذ sortOrder صاعدًا خاصًا
                        // به (updateMany لا تدعم تفاوت قيم العمود بين الصفوف).
                        const result = await prisma.$transaction(async (tx) => {
                                let done = 0;
                                for (const id of body.ids) {
                                        await tx.menuItem.update({
                                                where: { id },
                                                data: { categoryId: destCategory.id, sortOrder: nextSort++ },
                                        });
                                        done++;
                                }
                                return done;
                        });
                        updatedCount = result;
                        targetRestaurantIds = [destCategory.restaurantId];
                } else if (body.action === 'archive') {
                        const res = await prisma.menuItem.updateMany({
                                where: { id: { in: body.ids } },
                                data: { archivedAt: new Date() },
                        });
                        updatedCount = res.count;
                } else {
                        const res = await prisma.menuItem.updateMany({
                                where: { id: { in: body.ids } },
                                data: { status: body.status as ItemStatus },
                        });
                        updatedCount = res.count;
                }

                logAudit({
                        action: 'update',
                        actorId: auth.userId,
                        targetType: 'menuItem',
                        metadata: {
                                bulk: true,
                                operation: body.action,
                                count: updatedCount,
                                restaurants: restaurantIds,
                                ...(body.action === 'move' ? { toCategoryId: body.categoryId } : {}),
                        },
                }).catch(() => {});

                // round85-B9 family: تطهير ISR لكل مطعم متأثر (الحالات المعتادة مطعم
                // واحد؛ await كي يرى المالك التغيير في الطلب التالي مباشرة).
                for (const rid of new Set(targetRestaurantIds)) {
                        await revalidateMenu(rid);
                }

                return success({ updated: updatedCount, action: body.action });
        } catch (e) {
                return handleError(e);
        }
}

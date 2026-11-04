import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { modifierGroupSchema } from '@/lib/modifier-schema';

/**
 * P43 SM-1b — قوالب الإضافات القابلة لإعادة الاستخدام (ModifierTemplate).
 *
 * لقطة (groupsJson) لكل مطعم: «حفظ كقالب» من محرر الصنف يخزّن المجموعات
 * الحالية، و«إدراج من قوالب» ينسخها إلى صنف آخر — لا ربط إطلاقًا (تعديلات
 * القالب اللاحقة لا تؤثر على الأصناف المُدرج فيها؛ موثّق في الواجهة).
 *
 * الملكية: نفس سُلّم items (المالك عبر UserRestaurant متعدد المنيوهات؛
 * عائلة الأدمن تحت MANAGE_RESTAURANTS). لا سقف خطة جديد — المعدِّلات
 * نفسها غير مسقوفة في أي خطة (plan-entitlements-core.ts لم يتغير عمدًا).
 * سقوف البنية من modifierGroupSchema نفسه (≤6 مجموعات، ≤20 خيارًا،
 * min/max ≤10) — نفس عقد items POST/PUT حرفيًا.
 */

// round91-F-B family: صاحب القائمة يفتح المحرر مرات عديدة في الجلسة —
// 60/min قراءة لكل مستخدم، و20/min كتابة (نفس items PUT).
const templatesGetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });
const templatesWriteLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });

/** سلّم الملكية المشترك (المساران): مالك مرتبط أو أدمن بصلاحية المطاعم. */
async function resolveOwnership(
        auth: { authorized: boolean; role: string; userId: number | null; restaurantId: number | null },
        restaurantId: number
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
        if (auth.role === 'owner' && auth.restaurantId !== restaurantId) {
                const link = await prisma.userRestaurant.findUnique({
                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                });
                if (!link) return { ok: false, status: 403, message: 'غير مصرح' };
        }
        if (auth.role !== 'owner') {
                const perm = await requirePermission('MANAGE_RESTAURANTS');
                if (!perm.authorized) return { ok: false, status: perm.status, message: perm.error };
        }
        return { ok: true };
}

const createSchema = z.object({
        restaurantId: z.number().int().positive('معرف المطعم غير صالح'),
        // trim قبل حدود الطول: الاسم المسافي فقط يُرفض (لا يُخزَّن فارغًا)
        nameAr: z.string().trim().min(1, 'اسم القالب مطلوب').max(60, 'اسم القالب يجب ألا يتجاوز 60 حرفًا'),
        name: z.string().trim().max(60).optional(),
        // نفس عقد المجموعات في items POST/PUT — السقوف من modifier-schema.ts.
        groups: z.array(modifierGroupSchema).min(1, 'القالب يحتاج مجموعة واحدة على الأقل').max(6, 'الحد الأقصى 6 مجموعات خيارات لكل قالب'),
});

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { searchParams } = new URL(request.url);
                const restaurantId = Number(searchParams.get('restaurantId'));
                if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
                        return error('معرف المطعم غير صالح', 400);
                }

                const { success: allowed } = await templatesGetLimiter.check(`mod-tpl:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const ownership = await resolveOwnership(auth, restaurantId);
                if (!ownership.ok) return error(ownership.message, ownership.status);

                const rows = await prisma.modifierTemplate.findMany({
                        where: { restaurantId },
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, nameAr: true, name: true, groupsJson: true, createdAt: true },
                });

                // الحمولة خفيفة عمدًا: القائمة كلها تُرسل (الإدراج نسخة محلية
                // بلا جولة إضافية) — القوالب لكل مطعم عشرات على الأكثر وكل
                // قالب ≤6 مجموعات × ≤20 خيارًا.
                return success(rows);
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { success: allowed } = await templatesWriteLimiter.check(`mod-tpl-write:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                // r138 family rule: حارس الاشتراك المنتهي على كل كتابة مالك.
                if (!(await isOwnerSubscriptionActive(auth))) {
                        return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                }

                const parsed = createSchema.safeParse(await request.json());
                if (!parsed.success) return error(parsed.error.issues[0].message, 422);
                const body = parsed.data;

                const restaurant = await prisma.restaurant.findUnique({
                        where: { id: body.restaurantId },
                        select: { id: true, slug: true },
                });
                if (!restaurant) return error('المطعم غير موجود', 404);

                const ownership = await resolveOwnership(auth, body.restaurantId);
                if (!ownership.ok) return error(ownership.message, ownership.status);

                // اللقطة تُخزَّن كما تحقّقت Zod — إسقاط المعرفات العابرة (ids
                // المجموعات/الخيارات تخص أصنافًا أخرى؛ الإدراج يتجاهلها).
                const snapshot = body.groups.map((g) => ({
                        nameAr: g.nameAr,
                        name: g.name ?? '',
                        minSelect: g.minSelect ?? 0,
                        maxSelect: g.maxSelect ?? 1,
                        required: g.required ?? false,
                        sortOrder: g.sortOrder ?? 0,
                        options: (g.options ?? []).map((o) => ({
                                nameAr: o.nameAr,
                                name: o.name ?? '',
                                priceDelta: o.priceDelta ?? 0,
                                isAvailable: o.isAvailable ?? true,
                                sortOrder: o.sortOrder ?? 0,
                        })),
                }));

                const created = await prisma.modifierTemplate.create({
                        data: {
                                restaurantId: body.restaurantId,
                                nameAr: body.nameAr.trim(),
                                name: body.name?.trim() ?? '',
                                groupsJson: JSON.stringify(snapshot),
                        },
                        select: { id: true, nameAr: true, name: true, groupsJson: true, createdAt: true },
                });

                logAudit({
                        action: 'create',
                        actorId: auth.userId,
                        targetType: 'modifierTemplate',
                        targetId: created.id,
                        metadata: {
                                restaurantId: body.restaurantId,
                                nameAr: created.nameAr,
                                groups: snapshot.length,
                        },
                }).catch(() => {});

                return success(created, 201);
        } catch (e) {
                return handleError(e);
        }
}

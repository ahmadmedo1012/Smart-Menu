import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, notFound, error, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { createDbRateLimiter } from '@/lib/rate-limit';

/**
 * P43 SM-1b — إدارة قالب واحد: إعادة تسمية (PUT) وحذف (DELETE).
 * نفس سلّم ملكية المجموعة (route.ts) — المالك عبر UserRestaurant، والأدمن
 * تحت MANAGE_RESTAURANTS. الحذف لا يمس أي صنف (الإدراج نسخة — لا روابط).
 */

const templateWriteLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });

const renameSchema = z.object({
        // trim قبل حدود الطول: الاسم المسافي فقط يُرفض
        nameAr: z.string().trim().min(1, 'اسم القالب مطلوب').max(60, 'اسم القالب يجب ألا يتجاوز 60 حرفًا'),
});

async function resolveTemplateOwnership(
        auth: { authorized: boolean; role: string; userId: number | null; restaurantId: number | null },
        templateRestaurantId: number
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
        if (auth.role === 'owner' && auth.restaurantId !== templateRestaurantId) {
                const link = await prisma.userRestaurant.findUnique({
                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: templateRestaurantId } },
                });
                if (!link) return { ok: false, status: 403, message: 'غير مصرح' };
        }
        if (auth.role !== 'owner') {
                const perm = await requirePermission('MANAGE_RESTAURANTS');
                if (!perm.authorized) return { ok: false, status: perm.status, message: perm.error };
        }
        return { ok: true };
}

async function loadTemplate(id: number) {
        return prisma.modifierTemplate.findUnique({
                where: { id },
                select: { id: true, nameAr: true, restaurantId: true },
        });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { success: allowed } = await templateWriteLimiter.check(`mod-tpl-write:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                if (!(await isOwnerSubscriptionActive(auth))) {
                        return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                }

                const { id } = await params;
                const templateId = Number(id);
                if (Number.isNaN(templateId)) return error('معرف غير صالح', 400);

                const parsed = renameSchema.safeParse(await request.json());
                if (!parsed.success) return error(parsed.error.issues[0].message, 422);

                const existing = await loadTemplate(templateId);
                if (!existing) return notFound('القالب');

                const ownership = await resolveTemplateOwnership(auth, existing.restaurantId);
                if (!ownership.ok) return error(ownership.message, ownership.status);

                const updated = await prisma.modifierTemplate.update({
                        where: { id: templateId },
                        data: { nameAr: parsed.data.nameAr.trim() },
                        select: { id: true, nameAr: true, name: true, groupsJson: true, createdAt: true },
                });

                logAudit({
                        action: 'update',
                        actorId: auth.userId,
                        targetType: 'modifierTemplate',
                        targetId: templateId,
                        metadata: { restaurantId: existing.restaurantId, renamed: true },
                }).catch(() => {});

                return success(updated);
        } catch (e) {
                return handleError(e);
        }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { success: allowed } = await templateWriteLimiter.check(`mod-tpl-write:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                if (!(await isOwnerSubscriptionActive(auth))) {
                        return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                }

                const { id } = await params;
                const templateId = Number(id);
                if (Number.isNaN(templateId)) return error('معرف غير صالح', 400);

                const existing = await loadTemplate(templateId);
                if (!existing) return notFound('القالب');

                const ownership = await resolveTemplateOwnership(auth, existing.restaurantId);
                if (!ownership.ok) return error(ownership.message, ownership.status);

                await prisma.modifierTemplate.delete({ where: { id: templateId } });

                logAudit({
                        action: 'delete',
                        actorId: auth.userId,
                        targetType: 'modifierTemplate',
                        targetId: templateId,
                        metadata: { restaurantId: existing.restaurantId, nameAr: existing.nameAr },
                }).catch(() => {});

                return success({ id: templateId });
        } catch (e) {
                return handleError(e);
        }
}

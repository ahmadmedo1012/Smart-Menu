import { NextRequest } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, error, handleError, paginated, parsePagination } from '@/lib/api-helpers';
import { revalidateMenu } from '@/lib/menu-cache';
import { itemCountByCategory } from '@/lib/list-counts';

const createSchema = z.object({
        name: z.string().min(1).max(100),
        nameAr: z.string().nullable().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
        restaurantId: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
        try {
                const url = new URL(request.url);
                const { searchParams } = url;
                const restaurantId = Number(searchParams.get('restaurantId'));
                if (!restaurantId) return error('معرف المطعم مطلوب', 400);

                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                // Owners can only read their own restaurant's categories — allow ANY
                // restaurant the user owns (multi-menu support via UserRestaurant)
                if (auth.role === 'owner') {
                        if (auth.restaurantId !== restaurantId) {
                                // Check UserRestaurant link (owner may manage multiple menus)
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                                if (!link) return error('غير مصرح', 403);
                        }
                } else if (auth.role === 'sub_admin') {
                        // round92-wave3-3: قراءة sub_admin تتطلب MANAGE_RESTAURANTS — اتساقًا
                        // مع بوابة B1 للطلبات وPOST هذا المسار (كان يمر كالأدمن بلا أي إذن).
                        // لا يوجد إذن قراءة قوائم في enum الصلاحيات، فاختير الأقرب دلاليًا
                        // الموحد مع فحص الكتابة أدناه — الاتساق الحاسم على إذن مثالي.
                        if (!(auth.permissions ?? []).includes('MANAGE_RESTAURANTS')) {
                                return error('لا تملك الصلاحية', 403);
                        }
                } else if (!['admin', 'super_admin'].includes(auth.role)) {
                        return error('غير مصرح', 403);
                }

                const { page, pageSize } = parsePagination(url);
                const where = { restaurantId };
                const [rows, total] = await Promise.all([
                        // round88-A2: _count left the findMany (Prisma compiled it into
                        // a full-table LEFT JOIN aggregate over MenuItem — 1.2ms / 12
                        // buffers per page on the round88 perf DB, growing with
                        // platform-wide items). Now one grouped index-only COUNT over
                        // the fetched page ids (0.01ms) — see src/lib/list-counts.ts.
                        prisma.menuCategory.findMany({
                                where,
                                orderBy: { sortOrder: 'asc' },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                        }),
                        prisma.menuCategory.count({ where }),
                ]);
                const itemCounts = await itemCountByCategory(rows.map((r) => r.id));
                const data = rows.map((r) => ({ ...r, _count: { items: itemCounts.get(r.id) ?? 0 } }));
                return paginated(data, total, page, pageSize);
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const body = createSchema.parse(await request.json());
                const rid = body.restaurantId;

                // Owners can only add categories to their own restaurant (multi-menu aware)
                if (auth.role === 'owner' && auth.restaurantId !== rid) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: rid } },
                        });
                        if (!link) return error('غير مصرح', 403);
                }

                // round86-A1: non-owner roles must hold MANAGE_RESTAURANTS (mirrors the
                // items routes). Previously USER passed straight through here and could
                // write a category into ANY tenant's live menu (defacement via ISR purge).
                if (auth.role !== 'owner') {
                        const perm = await requirePermission('MANAGE_RESTAURANTS');
                        if (!perm.authorized) return error(perm.error, perm.status);
                }

                const restaurant = await prisma.restaurant.findUnique({
                        where: { id: rid },
                        select: { plan: { select: { maxItems: true } } },
                });
                if (!restaurant) return error('المطعم غير موجود', 404);

                // Categories are organizational containers — unlimited. The real plan
                // limits are enforced on ITEMS (maxItems) and ORDERS (maxOrders).
                // Previously maxMenus (menu count) was wrongly used here as a category
                // cap, which blocked users from adding more than N categories.
                const existingCount = await prisma.menuCategory.count({ where: { restaurantId: rid } });
                const maxCategories = 1000; // generous organizational ceiling
                if (existingCount >= maxCategories) {
                        return error(
                                `لقد وصلت للحد الأقصى للأقسام (${maxCategories}).`,
                                403
                        );
                }

                const data = await prisma.menuCategory.create({
                        data: {
                                name: body.name,
                                nameAr: body.nameAr ?? null,
                                icon: body.icon ?? '',
                                sortOrder: body.sortOrder ?? 0,
                                isActive: body.isActive ?? true,
                                restaurantId: rid,
                        },
                });
                logAudit({
                        action: 'create',
                        actorId: auth.userId,
                        targetType: 'menuCategory',
                        targetId: data.id,
                        metadata: { restaurantId: rid, name: body.name },
                }).catch(() => {});
                // round85-B9: purge the ISR cache so the new category is live instantly
                await revalidateMenu(rid);
                return success(data, 201);
        } catch (e) {
                return handleError(e);
        }
}

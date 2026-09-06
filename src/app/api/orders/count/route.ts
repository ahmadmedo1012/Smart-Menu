import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError, isValidOrderStatusFilter } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';

/**
 * round85-B3 — lightweight order COUNT endpoint.
 *
 * The owner dashboard's order notifier polls every 5s. It used to call the full
 * GET /api/orders list — every poll materialized complete order rows with
 * items + restaurant includes (and a parallel count) just to count new orders:
 * ~17k joined queries/day for one always-open dashboard tab. This endpoint
 * answers the same question with a single indexed COUNT.
 */
export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                const { searchParams } = new URL(request.url);
                let restaurantId = Number(searchParams.get('restaurantId')) || undefined;

                // Same authorization matrix as GET /api/orders: owners are scoped to
                // their own (or UserRestaurant-linked) restaurants; staff pass; the
                // USER role has no order visibility at all.
                if (auth.role === 'owner') {
                        if (restaurantId && restaurantId !== auth.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
                        } else {
                                restaurantId = auth.restaurantId ?? undefined;
                        }
                        if (!restaurantId) return apiError('لا يوجد مطعم مرتبط', 400);
                } else if (auth.role !== 'admin' && auth.role !== 'super_admin' && auth.role !== 'sub_admin') {
                        return apiError('غير مصرح', 403);
                }

                const status = searchParams.get('status') || 'new';
                // round88-B4: same enum whitelist as GET /api/orders — a garbage
                // status must 400 here too, not surface as Prisma noise.
                if (!isValidOrderStatusFilter(status)) {
                        return apiError('حالة غير صحيحة', 400);
                }
                const where: Record<string, unknown> = { status };
                if (restaurantId) where.restaurantId = restaurantId;

                const count = await prisma.order.count({ where });

                // round86-B11: defense-in-depth — a 5s poll response must never be
                // cached by intermediaries (Next's dynamic default is no-store, but
                // make it explicit)
                const res = success({ count, status, restaurantId: restaurantId ?? null });
                res.headers.set('Cache-Control', 'no-store');
                return res;
        } catch (e) {
                return handleError(e);
        }
}

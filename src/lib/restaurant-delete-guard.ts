import { prisma } from '@/lib/db';

/**
 * r121-A-10: the restaurant-DELETE business rules that used to live as two
 * diverging copies in api/owner/restaurants/[id]/route.ts and
 * api/restaurants/[id]/route.ts (same conditions, drifted Arabic copy):
 *
 *   - r118-A7-P3: orders are financial records — a restaurant that ever took
 *     an order is NOT hard-deletable by owners/admins (super_admin keeps full
 *     trust, still audited by the callers).
 *   - r119-S7: the database itself now RESTRICTs Order_restaurantId_fkey, so
 *     the concurrent-race loser surfaces as P2003 — mapped here to the same
 *     friendly 409 the pre-check gives.
 *
 * The 409 copy is unified (A-10): the admin wording wins — it states the true
 * invariant (records kept for accounting) instead of the owner path's
 * «تواصل مع الدعم», which only made sense for the owner audience.
 */
export const ORDERS_PRESENT_MESSAGE =
        'لا يمكن حذف مطعم لديه طلبات مسجلة — يُحتفظ بسجل الطلبات لأغراض المحاسبة';

/** Signal type for the P2003 race-loser (owner path throws; admin path returns). */
export class OrdersPresentError extends Error {}

/** Pre-check: how many orders reference this restaurant (financial-record guard). */
export async function countRestaurantOrders(restaurantId: number): Promise<number> {
        return prisma.order.count({ where: { restaurantId } });
}

/**
 * P2003 from the ORDERS FK only — the DB has other RESTRICT constraints
 * (e.g. r93-N1's review FK) whose failures must keep their legacy
 * handleError path, so the field_name is checked, not just the code.
 */
export function isOrdersPresentP2003(e: unknown): boolean {
        const err = e as { code?: string; meta?: { field_name?: string } };
        return (
                err?.code === 'P2003' &&
                String(err?.meta?.field_name ?? '').includes('Order_restaurantId_fkey')
        );
}

/**
 * round89-E1 — the ONE plan-cap error (dx-1 ج-1).
 *
 * OrderLimitError (orders/route.ts), ItemLimitError (items/route.ts) and
 * MenuLimitError (owner/restaurants/route.ts) were three byte-identical
 * local classes with drifted Arabic copy. One class now carries the cap
 * context (kind / limit / plan name) and builds one consistent message;
 * every consumer answers 403 (the caller IS authorized — the plan caps
 * them, not their session).
 */

export type PlanLimitKind = 'orders' | 'items' | 'menus';

/** "للطلبات/للأصناف/للمنيوهات" — pre-harmonized with the ال prefix. */
const KIND_LABEL: Record<PlanLimitKind, string> = {
        orders: 'للطلبات',
        items: 'للأصناف',
        menus: 'للمنيوهات',
};

export interface PlanLimitInfo {
        /** Which plan cap was hit. */
        kind: PlanLimitKind;
        /** The cap value that was reached (maxOrders / maxItems / maxMenus). */
        limit: number;
        /** Arabic plan display name when the caller already fetched it
         *  (null/omitted → the generic «خطتك» phrasing). */
        planName?: string | null;
}

export class PlanLimitError extends Error {
        readonly kind: PlanLimitKind;
        readonly limit: number;
        readonly planName: string | null;

        constructor(info: PlanLimitInfo) {
                const plan = info.planName ? `خطة «${info.planName}»` : 'خطتك';
                super(
                        `لقد وصلت للحد الأقصى ${KIND_LABEL[info.kind]} (${info.limit}) في ${plan}. قم بترقية خطتك لإضافة المزيد.`
                );
                this.name = 'PlanLimitError';
                this.kind = info.kind;
                this.limit = info.limit;
                this.planName = info.planName ?? null;
        }
}

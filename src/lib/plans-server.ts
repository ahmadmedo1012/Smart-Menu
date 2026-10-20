import { prisma } from '@/lib/db';
import type { Plan } from '@/lib/plan-types';
import { healPlanFeatures } from '@/lib/plan-features-heal';

/**
 * r121-G-5 (X3-V1) — the single server-side plans fetch, extracted verbatim
 * from the pricing page (round86-B5) so /subscribe can serve the same data
 * server-first without inventing a second data layer. /subscribe sits under
 * (protected), whose layout runs the per-request connection() nonce flow →
 * the page stays ƒ Dynamic (no `revalidate`), so this helper carries the same
 * 5-min in-memory TTL the /api/plans route uses — after the first hit, a
 * dynamic render costs a cache lookup, not a query.
 *
 * Returns null on DB failure (never throws) so both pages keep their
 * client-side fallback fetch alive — the round86-B5 contract.
 *
 * W7-F (ADV1-3, honest scope): this helper is ONE of TWO plans read paths,
 * not the single one — /api/plans (api/plans/route.ts) keeps its own
 * independent module cache + spread mapping for the client-side fallback
 * fetches. Two unsynchronized 5-min TTLs mean an admin plan edit can show
 * on one path ~5 min before the other (low-stakes — plans mutate rarely);
 * and because /pricing's ISR `revalidate = 300` can land on this cache, its
 * worst-case staleness is ≈ 10 min, not 5. Both paths share healPlanFeatures
 * (W7-B2), so what they SERVE stays consistent — only freshness differs.
 */
let cached: { data: Plan[]; ts: number } | null = null;
const CACHE_TTL = 300_000; // 5 min — mirrors /api/plans (api/plans/route.ts)

export async function getActivePlans(): Promise<Plan[] | null> {
        try {
                const now = Date.now();
                if (cached && now - cached.ts < CACHE_TTL) return cached.data;

                const plans = await prisma.subscriptionPlan.findMany({
                        where: { isActive: true },
                        orderBy: { sortOrder: 'asc' },
                });
                // F-D/round91: map to explicitly-constructed plain objects — spreading
                // Prisma rows ({...p}) leaks the row's symbol-keyed props
                // (nodejs.util.inspect.custom) across the RSC boundary → 5×
                // "Only plain objects can be passed to Client Components" console
                // warnings per page load. Explicit field mapping is the RSC contract.
                const mapped: Plan[] = plans.map((p) => ({
                        id: p.id,
                        name: p.name,
                        nameAr: p.nameAr,
                        price: Number(p.price),
                        periodDays: p.periodDays,
                        features: healPlanFeatures(
                                Array.isArray(p.features) ? p.features : JSON.parse(p.features as string)
                        ) as string[],
                        maxMenus: p.maxMenus,
                        maxItems: p.maxItems,
                        maxOrders: p.maxOrders,
                        sortOrder: p.sortOrder,
                }));

                cached = { data: mapped, ts: now };
                return mapped;
        } catch {
                // keep the client-side fallback path alive
                return null;
        }
}

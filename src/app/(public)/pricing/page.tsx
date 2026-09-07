import { prisma } from '@/lib/db';
import { PricingClient } from '@/components/pricing/PricingClient';
import type { Plan } from '@/lib/plan-types';

// round86-B5: pricing was a full client page with a post-hydrate /api/plans
// fetch — plan cards were empty until the client fetch resolved and invisible
// to crawlers without JS (the exact pattern round85-B2 fixed on the landing
// page). The server wrapper now bakes the plans into the ISR page; the client
// fetch only runs as a fallback when server data was missing.
export const revalidate = 300;

async function getPlans(): Promise<Plan[] | null> {
        try {
                const plans = await prisma.subscriptionPlan.findMany({
                        where: { isActive: true },
                        orderBy: { sortOrder: 'asc' },
                });
                // F-D/round91: map to explicitly-constructed plain objects — spreading
                // Prisma rows ({...p}) leaks the row's symbol-keyed props
                // (nodejs.util.inspect.custom) across the RSC boundary → 5×
                // "Only plain objects can be passed to Client Components" console
                // warnings per page load. Explicit field mapping is the RSC contract.
                return plans.map((p) => ({
                        id: p.id,
                        name: p.name,
                        nameAr: p.nameAr,
                        price: Number(p.price),
                        periodDays: p.periodDays,
                        features: (Array.isArray(p.features)
                                ? p.features
                                : JSON.parse(p.features as string)) as string[],
                        maxMenus: p.maxMenus,
                        maxItems: p.maxItems,
                        maxOrders: p.maxOrders,
                        sortOrder: p.sortOrder,
                }));
        } catch {
                // keep the client-side fallback path alive
                return null;
        }
}

export default async function PricingPage() {
        const initialPlans = await getPlans();
        return <PricingClient initialPlans={initialPlans} />;
}

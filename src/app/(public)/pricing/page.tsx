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
                return plans.map((p) => ({
                        ...p,
                        price: Number(p.price),
                        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string),
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

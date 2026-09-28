import { PricingClient } from '@/components/pricing/PricingClient';
import { getActivePlans } from '@/lib/plans-server';

// round86-B5: pricing was a full client page with a post-hydrate /api/plans
// fetch — plan cards were empty until the client fetch resolved and invisible
// to crawlers without JS (the exact pattern round85-B2 fixed on the landing
// page). The server wrapper now bakes the plans into the ISR page; the client
// fetch only runs as a fallback when server data was missing.
// r121-G-5: the fetch itself moved to lib/plans-server.ts (shared with
// /subscribe's SSR shell — same helper, same explicit field mapping).
export const revalidate = 300;

export default async function PricingPage() {
        const initialPlans = await getActivePlans();
        return <PricingClient initialPlans={initialPlans} />;
}

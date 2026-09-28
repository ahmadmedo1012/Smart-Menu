import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getActivePlans } from '@/lib/plans-server';
import { SubscribeClient } from './SubscribeClient';

/**
 * r121-G-5 (X3-V1) — /subscribe is now the pricing twin (round86-B5 pattern):
 * a server wrapper fetches the active plans through the SAME helper /pricing
 * uses (lib/plans-server.ts — the pricing page's exact fetch + explicit
 * plain-object mapping) and bakes them into the SSR shell, so the H1 + step
 * chrome + plan cards paint with the document. Before: the page was 100%
 * client-gated on the /api/plans + /api/auth/me fetch chains with a
 * spinner-only SSR body (H1 absent from the server HTML, «انضم إلى» 0× in
 * the raw doc; 4.47s live LCP — the worst page on the site was the one that
 * sells the product).
 *
 * The page stays ƒ Dynamic: the (protected) layout's per-request
 * connection() CSP-nonce flow forbids `revalidate` — so the helper carries
 * /api/plans' 5-min in-memory TTL instead. The client (SubscribeClient)
 * keeps the /api/auth/me upgrade-mode probe (auth-dependent branch) and the
 * /api/plans fetch as a fallback for when the server data was missing.
 */
export default async function SubscribePage() {
	const initialPlans = await getActivePlans();
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<Loader2 className="size-8 animate-spin text-accent-foreground" />
				</div>
			}
		>
			<SubscribeClient initialPlans={initialPlans} />
		</Suspense>
	);
}

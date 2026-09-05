'use client';

/**
 * round86-C5 — the single Plan type (+ its admin summary subset).
 *
 * `Plan` was defined nine times across pricing/subscribe/owner/admin pages —
 * any schema change (adding a field) needed nine edits, and three sites
 * papered over envelope drift with `as unknown as Plan[]` fallback casts.
 * One shared definition now; `fetchPlans()` is the one blessed client fetch
 * (checks res.ok, unwraps the {success,data} envelope, throws on failure).
 */

export interface Plan {
	id: number;
	name: string;
	nameAr: string;
	price: number;
	periodDays: number;
	features: string[];
	maxMenus: number;
	maxItems: number;
	maxOrders: number;
	sortOrder: number;
}

/** The subset admin restaurant management actually renders (4 fields). */
export interface PlanSummary {
	id: number;
	name: string;
	nameAr: string;
	price: number;
}

/** Fetch the public plan catalog (active plans, sortOrder asc). Throws on failure. */
export async function fetchPlans(): Promise<Plan[]> {
	const res = await fetch('/api/plans');
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const json = (await res.json()) as { data?: Plan[] };
	return json.data ?? [];
}

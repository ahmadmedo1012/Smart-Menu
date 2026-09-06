import type { PlanSummary as Plan } from './plan-types';

/**
 * round89-E5 — the ONE shared restaurant row type (dx-1 ج-3).
 *
 * `Restaurant` used to be declared six times: admin/qr, admin/settings,
 * admin/restaurants page + RestaurantFormDialog + RestaurantTable (all
 * consuming /api/restaurants rows) and the owner menus page
 * (/api/owner/restaurants rows). The copies had drifted — which fields
 * exist, which are optional — so any API change needed six edits.
 *
 * Required fields below are the ones every source projection actually
 * returns (id/name/slug/description/logo/_count); the rest are optional
 * because one of the two endpoints omits them (/api/owner/restaurants
 * projects only the owner-facing subset). No field is invented — each
 * one was read by at least one of the six previous interfaces.
 */
export interface Restaurant {
	id: number;
	name: string;
	slug: string;
	description: string;
	logo: string;
	_count: { orders: number; categories: number };
	// /api/restaurants (admin family) row fields
	phone?: string;
	whatsapp?: string;
	email?: string;
	address?: string;
	workingHours?: string;
	planId?: number | null;
	plan?: Plan | null;
	city?: string | null;
	showOnLanding?: boolean | null;
	featuredRank?: number | null;
	// /api/owner/restaurants (owner menus list) extras
	isPrimary?: boolean;
	createdAt?: string;
}

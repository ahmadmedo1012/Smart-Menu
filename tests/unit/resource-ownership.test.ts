/**
 * Round88-B2 — resource ownership (tenant isolation) negative tests.
 *
 * Cross-tenant matrix: an owner of restaurant 1 probing resources that belong
 * to restaurant 2 must never read or write them — every family resolves the
 * resource first, then applies the SAME guard pattern (User.restaurantId +
 * UserRestaurant link fallback) before any data leaves:
 *
 *   orders/[id]   GET  → 401 (ladder: link lookup before the response body)
 *   items/[id]    GET  (hidden row) → 404 (staff-only read, tenant-scoped)
 *   loyalty/redeem POST → 403 (card ownership inside the transaction)
 *   reviews       GET  → 200 but with customer PII STRIPPED (round-77 guard)
 *
 * The RBAC file (rbac-matrix.test.ts) covers items/categories/settings/
 * restaurants writes; this file covers the read-side and loyalty/review
 * families so every resource family has at least one ownership probe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockReviewAggregate = vi.hoisted(() => vi.fn());
const mockLoyaltyCardFindUnique = vi.hoisted(() => vi.fn());
const mockLoyaltyCardUpdateMany = vi.hoisted(() => vi.fn());
const mockRewardTransactionCreate = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
	order: { findUnique: mockOrderFindUnique },
	menuItem: { findUnique: mockMenuItemFindUnique },
	userRestaurant: { findUnique: mockUserRestaurantFindUnique },
	review: { findMany: mockReviewFindMany, aggregate: mockReviewAggregate },
	loyaltyCard: { findUnique: mockLoyaltyCardFindUnique, updateMany: mockLoyaltyCardUpdateMany },
	rewardTransaction: { create: mockRewardTransactionCreate },
	// The redeem route wraps its logic in $transaction(fn) — hand it the same
	// mock object as the tx client (the UNAUTHORIZED path never reaches a write).
	$transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

vi.mock('@/lib/rate-limit', () => ({
	createDbRateLimiter: () => ({
		check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
		destroy: () => {},
	}),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => {}) }));
vi.mock('@/lib/blob', () => ({ deleteBlob: vi.fn(), mediaUrlError: vi.fn(() => null) }));

// ── Personas ────────────────────────────────────────────────────────────

const persona = (o: Record<string, unknown>) => ({
	id: 1,
	role: 'USER',
	restaurantId: null,
	subscriptionStatus: 'active',
	permissions: [],
	...o,
});

const OWNER_R1 = persona({ id: 10, role: 'owner', restaurantId: 1 });
const USER_PLAIN = persona({ id: 55, role: 'USER', restaurantId: null });
const ADMIN = persona({ id: 1, role: 'admin', restaurantId: null });

const setSession = (user: Record<string, unknown> | null) => {
	mockValidateSession.mockResolvedValue(
		user ? { valid: true, userId: user.id, user } : { valid: false, userId: null }
	);
};

// ── Fixtures ────────────────────────────────────────────────────────────

/** Order belonging to restaurant 2. */
const ORDER_R2 = {
	id: 4242,
	orderNo: 'ORD-R2',
	restaurantId: 2,
	total: 80,
	status: 'new',
	items: [],
	restaurant: { id: 2, name: 'Foreign', slug: 'foreign' },
};

/** Hidden menu item belonging to restaurant 2 (via its category). */
const HIDDEN_ITEM_R2 = {
	id: 77,
	name: 'Foreign hidden',
	status: 'hidden',
	price: 15,
	discountedPrice: null,
	image: null,
	isFeatured: false,
	category: { restaurantId: 2 },
	reviews: [],
};

beforeEach(() => {
	vi.clearAllMocks();
	setSession(OWNER_R1);
	mockUserRestaurantFindUnique.mockResolvedValue(null); // NO links by default
	mockOrderFindUnique.mockResolvedValue({ ...ORDER_R2 });
	mockMenuItemFindUnique.mockResolvedValue({ ...HIDDEN_ITEM_R2 });
	mockReviewFindMany.mockResolvedValue([]);
	mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: 2 });
	mockLoyaltyCardFindUnique.mockResolvedValue({ id: 500, restaurantId: 2, points: 10, totalOrders: 6 });
	mockLoyaltyCardUpdateMany.mockResolvedValue({ count: 1 });
});

// ── GET /api/orders/[id] ────────────────────────────────────────────────

describe('ownership — GET /api/orders/[id]', () => {
	async function getOrder(id: number) {
		const { GET } = await import('@/app/api/orders/[id]/route');
		return GET(new NextRequest(`http://localhost/api/orders/${id}`), {
			params: Promise.resolve({ id: String(id) }),
		});
	}

	it('guest → 401', async () => {
		setSession(null);
		const res = await getOrder(4242);
		expect(res.status).toBe(401);
	});

	it('USER → 403 (no order visibility at all)', async () => {
		setSession(USER_PLAIN);
		const res = await getOrder(4242);
		expect(res.status).toBe(403);
	});

	it('owner of restaurant 1 reading restaurant 2 order, no link → 401 (documented ladder) + link probed', async () => {
		const res = await getOrder(4242);
		expect(res.status).toBe(401);
		expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
			where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
		});
	});

	it('owner WITH a UserRestaurant link (multi-menu) → 200', async () => {
		mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
		const res = await getOrder(4242);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.orderNo).toBe('ORD-R2');
	});
});

// ── GET /api/items/[id] — hidden rows are staff-only AND tenant-scoped ──

describe('ownership — GET /api/items/[id] (hidden row)', () => {
	async function getItem(id: number) {
		const { GET } = await import('@/app/api/items/[id]/route');
		return GET(new NextRequest(`http://localhost/api/items/${id}`), {
			params: Promise.resolve({ id: String(id) }),
		});
	}

	it('guest → 404 (hidden rows never leak to anonymous callers)', async () => {
		setSession(null);
		const res = await getItem(77);
		expect(res.status).toBe(404);
	});

	it('USER → 404', async () => {
		setSession(USER_PLAIN);
		const res = await getItem(77);
		expect(res.status).toBe(404);
	});

	it('owner of restaurant 1 reading restaurant 2 hidden item, no link → 404', async () => {
		const res = await getItem(77);
		expect(res.status).toBe(404);
		expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
			where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
		});
	});

	it('owner WITH a link → 200 (staff read of a managed tenant row)', async () => {
		mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
		const res = await getItem(77);
		expect(res.status).toBe(200);
	});

	it('admin reads a hidden row of any tenant → 200', async () => {
		setSession(ADMIN);
		const res = await getItem(77);
		expect(res.status).toBe(200);
	});
});

// ── POST /api/loyalty/redeem ────────────────────────────────────────────

describe('ownership — POST /api/loyalty/redeem (loyalty card)', () => {
	async function redeem(cardId: number) {
		const { POST } = await import('@/app/api/loyalty/redeem/route');
		return POST(new NextRequest('http://localhost/api/loyalty/redeem', {
			method: 'POST',
			body: JSON.stringify({ cardId }),
		}));
	}

	it('owner of restaurant 1 redeeming a restaurant 2 card, no link → 403, no transaction written', async () => {
		const res = await redeem(500);
		expect(res.status).toBe(403);
		expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
			where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
		});
		expect(mockLoyaltyCardUpdateMany).not.toHaveBeenCalled();
		expect(mockRewardTransactionCreate).not.toHaveBeenCalled();
	});

	it('USER role → 403 (no permission path to any card)', async () => {
		setSession(USER_PLAIN);
		const res = await redeem(500);
		expect(res.status).toBe(403);
		expect(mockRewardTransactionCreate).not.toHaveBeenCalled();
	});

	it('owner WITH a link → redemption proceeds (points decremented, transaction recorded)', async () => {
		mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
		const res = await redeem(500);
		expect(res.status).toBe(200);
		expect(mockLoyaltyCardUpdateMany).toHaveBeenCalled();
		expect(mockRewardTransactionCreate).toHaveBeenCalled();
	});
});

// ── GET /api/items/[id]/reviews — PII is ownership-scoped (round-77) ─────

describe('ownership — GET /api/items/[id]/reviews (customer PII)', () => {
	async function getReviews(itemId: number) {
		const { GET } = await import('@/app/api/items/[id]/reviews/route');
		return GET(new NextRequest(`http://localhost/api/items/${itemId}/reviews`), {
			params: Promise.resolve({ id: String(itemId) }),
		});
	}

	it('owner of restaurant 1 reading restaurant 2 reviews → 200 with PII stripped from the select', async () => {
		const res = await getReviews(77);
		expect(res.status).toBe(200);
		// The route resolves the item to decide PII visibility: owner probing a
		// foreign item must NOT be resolved as an owner.
		expect(mockMenuItemFindUnique).toHaveBeenCalledWith({
			where: { id: 77 },
			select: { category: { select: { restaurantId: true } } },
		});
		const select = mockReviewFindMany.mock.calls[0][0].select;
		expect(select.customerName).toBeUndefined();
		expect(select.customerPhone).toBeUndefined();
	});

	it('admin (staff) reading the same reviews → PII included (legitimate ops read)', async () => {
		setSession(ADMIN);
		const res = await getReviews(77);
		expect(res.status).toBe(200);
		const select = mockReviewFindMany.mock.calls[0][0].select;
		expect(select.customerName).toBe(true);
		expect(select.customerPhone).toBe(true);
	});
});

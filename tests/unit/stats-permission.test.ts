import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderCount = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockOrderAggregate = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
	order: {
		count: mockOrderCount,
		findMany: mockOrderFindMany,
		groupBy: mockOrderGroupBy,
		aggregate: mockOrderAggregate,
	},
	orderItem: { groupBy: mockOrderItemGroupBy },
	menuItem: { count: mockMenuItemCount, findMany: mockMenuItemFindMany },
	userRestaurant: { findUnique: mockUserRestaurantFindUnique },
	$queryRaw: mockQueryRaw,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// requireAuth resolves per-test via a mutable holder
const authHolder = vi.hoisted(() => ({
	value: {
		authorized: true,
		role: 'owner' as string,
		restaurantId: 1 as number | null,
		userId: 1 as number | null,
	},
}));
vi.mock('@/lib/auth', () => ({
	requireAuth: () => Promise.resolve(authHolder.value),
}));

function makeGetRequest(restaurantId?: number): NextRequest {
	const url = restaurantId
		? `http://localhost/api/stats?restaurantId=${restaurantId}`
		: 'http://localhost/api/stats';
	return new NextRequest(url, { method: 'GET' });
}

describe('stats GET — role gate & tenant isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		// Minimal happy-path DB responses (only reached for authorized roles)
		mockOrderCount.mockResolvedValue(0);
		mockMenuItemCount.mockResolvedValue(0);
		mockOrderItemGroupBy.mockResolvedValue([]);
		mockOrderFindMany.mockResolvedValue([]);
		mockOrderGroupBy.mockResolvedValue([]);
		mockOrderAggregate.mockResolvedValue({ _sum: { total: null } });
		mockMenuItemFindMany.mockResolvedValue([]);
		mockUserRestaurantFindUnique.mockResolvedValue(null);
		mockQueryRaw.mockResolvedValue([]);
	});

	it('regular USER role CANNOT read stats of another restaurant (403, no DB access)', async () => {
		const { GET } = await import('@/app/api/stats/route');
		authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 2 };

		// USER tries to query restaurant 99's stats
		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(403);
		// No prisma queries must have been executed for the foreign restaurant
		expect(mockOrderCount).not.toHaveBeenCalled();
		expect(mockOrderFindMany).not.toHaveBeenCalled();
		expect(mockOrderAggregate).not.toHaveBeenCalled();
		expect(mockOrderItemGroupBy).not.toHaveBeenCalled();
		expect(mockMenuItemFindMany).not.toHaveBeenCalled();
	});

	it('regular USER role CANNOT read stats even without restaurantId param (403)', async () => {
		const { GET } = await import('@/app/api/stats/route');
		authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 2 };

		const res = await GET(makeGetRequest());

		expect(res.status).toBe(403);
		expect(mockOrderCount).not.toHaveBeenCalled();
	});

	it('owner CAN read stats of their own linked restaurant (200)', async () => {
		const { GET } = await import('@/app/api/stats/route');
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockOrderFindMany.mockResolvedValue([
			{
				id: 1,
				orderNo: 'ORD-1',
				customerName: 'customer',
				customerPhone: '123',
				status: 'pending',
				total: 50,
				createdAt: new Date(),
				items: [],
			},
		]);

		const res = await GET(makeGetRequest(1));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toHaveProperty('totalOrders');
		expect(body.data).toHaveProperty('recentOrders');
	});

	it('owner with legitimate UserRestaurant link CAN read stats of another managed restaurant (200)', async () => {
		const { GET } = await import('@/app/api/stats/route');
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 99, isPrimary: false });
		mockOrderFindMany.mockResolvedValue([]);

		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(200);
		expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
			where: { userId_restaurantId: { userId: 1, restaurantId: 99 } },
		});
	});

	it('owner WITHOUT a link to the requested restaurant CANNOT read its stats (403)', async () => {
		const { GET } = await import('@/app/api/stats/route');
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockUserRestaurantFindUnique.mockResolvedValue(null);

		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(403);
		expect(mockOrderCount).not.toHaveBeenCalled();
	});
});

describe('stats advanced GET — role gate & tenant isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockOrderCount.mockResolvedValue(0);
		mockOrderItemGroupBy.mockResolvedValue([]);
		mockMenuItemFindMany.mockResolvedValue([]);
		mockUserRestaurantFindUnique.mockResolvedValue(null);
		mockQueryRaw.mockResolvedValue([]);
	});

	it('regular USER role CANNOT read advanced stats of another restaurant (403, no DB access)', async () => {
		const { GET } = await import('@/app/api/stats/advanced/route');
		authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 2 };

		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(403);
		expect(mockQueryRaw).not.toHaveBeenCalled();
		expect(mockOrderItemGroupBy).not.toHaveBeenCalled();
		expect(mockOrderCount).not.toHaveBeenCalled();
	});

	it('owner CAN read advanced stats of their own restaurant (200)', async () => {
		const { GET } = await import('@/app/api/stats/advanced/route');
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };

		const res = await GET(makeGetRequest(1));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toHaveProperty('revenue7d');
		expect(body.data).toHaveProperty('topItems');
		expect(body.data).toHaveProperty('growthPct');
	});

	it('admin role CAN read advanced stats of any restaurant (200)', async () => {
		const { GET } = await import('@/app/api/stats/advanced/route');
		authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1 };

		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(200);
	});

	it('owner WITHOUT a link to the requested restaurant CANNOT read its advanced stats (403)', async () => {
		const { GET } = await import('@/app/api/stats/advanced/route');
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockUserRestaurantFindUnique.mockResolvedValue(null);

		const res = await GET(makeGetRequest(99));

		expect(res.status).toBe(403);
		expect(mockQueryRaw).not.toHaveBeenCalled();
	});
});
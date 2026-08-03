import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
	restaurant: { findUnique: mockFindUnique, update: mockUpdate },
	setting: { upsert: mockUpsert },
	$transaction: mockTransaction,
	userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/blob', () => ({ deleteBlob: mockDeleteBlob }));

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

function makePutRequest(body: unknown, restaurantId?: number): NextRequest {
	const url = restaurantId
		? `http://localhost/api/settings?restaurantId=${restaurantId}`
		: 'http://localhost/api/settings';
	return new NextRequest(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('settings PUT — tenant isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
		mockFindUnique.mockResolvedValue({ logo: 'https://old-logo.com/a.png' });
		mockUpdate.mockResolvedValue({});
		mockTransaction.mockImplementation((fn) =>
			typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn)
		);
		mockUpsert.mockResolvedValue({});
		mockUserRestaurantFindUnique.mockResolvedValue(null);
	});

	it('owner A CANNOT modify restaurant B settings via restaurantId param', async () => {
		const { PUT } = await import('@/app/api/settings/route');

		// owner A (restaurantId=1) tries to write restaurant B (restaurantId=99)
		const res = await PUT(makePutRequest([{ key: 'restaurant_name', value: 'hacked' }], 99));

		expect(res.status).toBe(403);
		// no DB writes, no blob deletes for the foreign restaurant
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockUpsert).not.toHaveBeenCalled();
		expect(mockDeleteBlob).not.toHaveBeenCalled();
	});

	it('owner A WITH legitimate UserRestaurant link CAN modify restaurant B', async () => {
		const { PUT } = await import('@/app/api/settings/route');
		mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 99, isPrimary: false });
		mockFindUnique.mockResolvedValue({ logo: null, gallery: [] });

		const res = await PUT(makePutRequest([{ key: 'restaurant_name', value: 'legit' }], 99));

		expect(res.status).toBe(200);
		expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
			where: { userId_restaurantId: { userId: 1, restaurantId: 99 } },
		});
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 99 } })
		);
	});

	it('owner A CAN update their own restaurant and cleans the replaced logo', async () => {
		const { PUT } = await import('@/app/api/settings/route');

		const res = await PUT(
			makePutRequest([{ key: 'restaurant_logo', value: 'https://new-logo.com/b.png' }])
		);

		expect(res.status).toBe(200);
		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 1 }, select: { logo: true, gallery: true } })
		);
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 1 },
				data: expect.objectContaining({ logo: 'https://new-logo.com/b.png' }),
			})
		);
		// old logo cleaned after successful update
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://old-logo.com/a.png');
	});

	it('does NOT delete the old logo when the logo is unchanged', async () => {
		const { PUT } = await import('@/app/api/settings/route');
		mockFindUnique.mockResolvedValue({ logo: 'https://same-logo.com/a.png' });

		const res = await PUT(
			makePutRequest([{ key: 'restaurant_logo', value: 'https://same-logo.com/a.png' }])
		);

		expect(res.status).toBe(200);
		expect(mockDeleteBlob).not.toHaveBeenCalled();
	});

	it('regular user role is rejected entirely', async () => {
		authHolder.value = { authorized: true, role: 'user', restaurantId: null as number | null, userId: null as number | null };
		const { PUT } = await import('@/app/api/settings/route');

		const res = await PUT(makePutRequest([{ key: 'restaurant_name', value: 'x' }], 1));

		expect(res.status).toBe(403);
		expect(mockUpdate).not.toHaveBeenCalled();
	});
});

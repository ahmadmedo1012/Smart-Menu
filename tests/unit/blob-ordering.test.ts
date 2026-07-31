/**
 * Blob deletion ordering tests.
 * Ensures deleteBlob is ONLY called after successful prisma operation,
 * and is NEVER called when prisma rejects.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
	menuItem: {
		findUnique: mockFindUnique,
		update: mockUpdate,
		delete: mockDelete,
		findMany: mockFindMany,
	},
	restaurant: { findUnique: mockFindUnique, delete: mockDelete },
	category: { findUnique: mockFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/blob', () => ({ deleteBlob: mockDeleteBlob }));
vi.mock('@/lib/auth', () => ({
	requireAuth: () => Promise.resolve({ authorized: true, role: 'admin', restaurantId: 1 }),
}));

// ── Helpers ─────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown): NextRequest {
	const req = new NextRequest('http://localhost/api/items/1', {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
	return req;
}

describe('items PUT — deleteBlob ordering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindUnique.mockReset();
		mockUpdate.mockReset();
		mockDeleteBlob.mockReset();
	});

	it('calls deleteBlob only after prisma.update succeeds when image replaced', async () => {
		mockFindUnique.mockResolvedValue({
			id: 1,
			image: 'https://old-image.com/old.jpg',
			category: { restaurantId: 1 },
		});
		mockUpdate.mockResolvedValue({
			id: 1,
			image: 'https://new-image.com/new.jpg',
		});

		const { PUT } = await import('@/app/api/items/[id]/route');
		const res = await PUT(
			makeRequest('PUT', { name: 'test', image: 'https://new-image.com/new.jpg' }),
			{
				params: Promise.resolve({ id: '1' }),
			}
		);

		expect(res.status).toBe(200);
		// prisma.update called before deleteBlob
		expect(mockUpdate).toHaveBeenCalled();
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://old-image.com/old.jpg');
	});

	it('does NOT call deleteBlob when prisma.update rejects', async () => {
		mockFindUnique.mockResolvedValue({
			id: 1,
			image: 'https://old-image.com/old.jpg',
			category: { restaurantId: 1 },
		});
		mockUpdate.mockRejectedValue(new Error('DB error'));

		const { PUT } = await import('@/app/api/items/[id]/route');
		const res = await PUT(
			makeRequest('PUT', { name: 'test', image: 'https://new-image.com/new.jpg' }),
			{
				params: Promise.resolve({ id: '1' }),
			}
		);

		expect(res.status).toBe(500);
		expect(mockDeleteBlob).not.toHaveBeenCalled();
	});
});

describe('items DELETE — deleteBlob ordering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindUnique.mockReset();
		mockDelete.mockReset();
		mockDeleteBlob.mockReset();
	});

	it('calls deleteBlob only after prisma.delete succeeds', async () => {
		mockFindUnique.mockResolvedValue({
			id: 1,
			image: 'https://image.com/item.jpg',
			category: { restaurantId: 1 },
		});
		mockDelete.mockResolvedValue({ id: 1 });

		const { DELETE } = await import('@/app/api/items/[id]/route');
		const res = await DELETE(makeRequest('DELETE'), {
			params: Promise.resolve({ id: '1' }),
		});

		expect(res.status).toBe(200);
		expect(mockDelete).toHaveBeenCalled();
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/item.jpg');
	});

	it('does NOT call deleteBlob when prisma.delete rejects', async () => {
		mockFindUnique.mockResolvedValue({
			id: 1,
			image: 'https://image.com/item.jpg',
			category: { restaurantId: 1 },
		});
		mockDelete.mockRejectedValue(new Error('DB error'));

		const { DELETE } = await import('@/app/api/items/[id]/route');
		const res = await DELETE(makeRequest('DELETE'), {
			params: Promise.resolve({ id: '1' }),
		});

		expect(res.status).toBe(500);
		expect(mockDeleteBlob).not.toHaveBeenCalled();
	});
});

describe('restaurants DELETE — deleteBlob ordering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindUnique.mockReset();
		mockFindMany.mockReset();
		mockDelete.mockReset();
		mockDeleteBlob.mockReset();
	});

	it('calls deleteBlob only after prisma.delete succeeds', async () => {
		mockFindMany.mockResolvedValue([
			{ image: 'https://image.com/item1.jpg' },
			{ image: 'https://image.com/item2.jpg' },
		]);
		// First findUnique call -> restaurant with logo+gallery
		// Second call -> existing item check (findUnique for menuItem is overridden too)
		mockFindUnique.mockImplementation(async (args: { where: { id: number } }) => {
			// Return restaurant data for all queries in this route
			return {
				id: args.where.id,
				logo: 'https://image.com/logo.jpg',
				gallery: ['https://image.com/gallery1.jpg', 'https://image.com/gallery2.jpg'],
			};
		});
		mockDelete.mockResolvedValue({ id: 1 });

		const { DELETE } = await import('@/app/api/restaurants/[id]/route');
		const res = await DELETE(makeRequest('DELETE'), {
			params: Promise.resolve({ id: '1' }),
		});

		expect(res.status).toBe(200);
		expect(mockDelete).toHaveBeenCalled();
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/item1.jpg');
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/item2.jpg');
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/logo.jpg');
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/gallery1.jpg');
		expect(mockDeleteBlob).toHaveBeenCalledWith('https://image.com/gallery2.jpg');
	});
});

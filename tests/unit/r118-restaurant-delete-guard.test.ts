/**
 * r118-A7-P3 + A2-P3 — انحدار حارس «مطعم لديه طلبات» في مساري حذف المطعم.
 *
 * الخلل: حذف المطعم كان cascade جذريًا بلا حارس — نقرة واحدة تمحو المستأجر
 * كاملًا (طلبات/سجلات مالية/تقييمات PII) بلا رجعة وبلا صف تدقيق. الآن:
 *  - المطعم الذي لديه طلبات يُحذف فقط بواسطة super_admin (ثقة كاملة، مع تدقيق).
 *  - المالك/الأدمن يحصلان على 409 برسالة عربية واضحة، والمعاملة لا تبدأ أصلًا.
 *  - الحذف الناجح (بلا طلبات) يكتب صف تدقيق (audit) — العائلة التدميرية
 *    الوحيدة التي كانت بلا تدقيق.
 *
 * النمط: نفس منكّرات r92-owner-restaurant-id (المعاملة الحقيقية فوق session
 * منكّرة) — مسار المالك هنا؛ مسار الأدمن يغطيه النمط نفسه في blob-ordering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));

const mockTransaction = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockLinkDelete = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockReviewDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockRestaurantDelete = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => {
        const p = {
                userRestaurant: { findUnique: mockUserRestaurantFindUnique, delete: mockLinkDelete },
                restaurant: {
                        findUnique: mockRestaurantFindUnique,
                        delete: mockRestaurantDelete,
                },
                review: { deleteMany: mockReviewDeleteMany },
                order: { count: mockOrderCount },
                $transaction: mockTransaction,
        };
        return p;
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

const authHolder = vi.hoisted(() => ({
        userId: 7,
        role: 'owner' as string,
        restaurantId: 313,
        permissions: [] as string[],
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({
                authorized: true,
                userId: authHolder.userId,
                role: authHolder.role,
                restaurantId: authHolder.restaurantId,
                permissions: authHolder.permissions,
        })),
}));

import { DELETE } from '@/app/api/owner/restaurants/[id]/route';

function req() {
        return new NextRequest('http://localhost/api/owner/restaurants/313', { method: 'DELETE' });
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.userId = 7;
        authHolder.role = 'owner';
        authHolder.restaurantId = 313;
        authHolder.permissions = [];
        mockOrderCount.mockResolvedValue(0);
        mockRestaurantFindUnique.mockResolvedValue({ id: 313, name: 'مقهى الواحة', slug: 'al-waha-cafe' });
        mockUserRestaurantFindUnique.mockResolvedValue({ isPrimary: false });
        // real-ish transaction executor (same as r92 pattern)
        mockTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => fn(mockPrisma));
});

describe('r118 — restaurant DELETE has-orders guard + audit (owner path)', () => {
        it('restaurant WITH orders → 409 Arabic message, transaction never starts', async () => {
                mockOrderCount.mockResolvedValue(5);
                const res = await DELETE(req(), { params: Promise.resolve({ id: '313' }) });
                expect(res.status).toBe(409);
                const body = await res.json();
                expect(body.error).toContain('طلبات مسجلة');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockRestaurantDelete).not.toHaveBeenCalled();
        });

        it('admin (MANAGE_RESTAURANTS) WITH orders → same 409 (full trust is super_admin only)', async () => {
                authHolder.role = 'sub_admin';
                authHolder.permissions = ['MANAGE_RESTAURANTS'];
                mockOrderCount.mockResolvedValue(1);
                const res = await DELETE(req(), { params: Promise.resolve({ id: '313' }) });
                expect(res.status).toBe(409);
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('super_admin WITH orders → proceeds (full trust) AND audit row written', async () => {
                authHolder.role = 'super_admin';
                mockOrderCount.mockResolvedValue(9);
                const res = await DELETE(req(), { params: Promise.resolve({ id: '313' }) });
                expect(res.status).toBe(200);
                expect(mockRestaurantDelete).toHaveBeenCalledWith({ where: { id: 313 } });
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
                const audit = mockLogAudit.mock.calls[0][0] as { action: string; targetType: string; metadata: { orderCount: number } };
                expect(audit.action).toBe('delete');
                expect(audit.targetType).toBe('restaurant');
                expect(audit.metadata.orderCount).toBe(9);
        });

        it('no orders → owner delete succeeds and audit row captures the row (name/slug)', async () => {
                const res = await DELETE(req(), { params: Promise.resolve({ id: '313' }) });
                expect(res.status).toBe(200);
                expect(mockRestaurantDelete).toHaveBeenCalledWith({ where: { id: 313 } });
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
                const audit = mockLogAudit.mock.calls[0][0] as { metadata: { name: string; slug: string; source: string } };
                expect(audit.metadata.name).toBe('مقهى الواحة');
                expect(audit.metadata.slug).toBe('al-waha-cafe');
                expect(audit.metadata.source).toBe('owner-api');
        });
});

/**
 * round91-F-B (D2-#1) — the HTTP mapping for the decision lib's failure
 * status: POST /api/admin/subscriptions propagates result.status (the
 * plan-cap rejection reaches the admin as 409) while every other failure
 * keeps the legacy code (404 not-found / 400 already-processed etc.).
 *
 * The decision logic itself (FOR UPDATE, cap math, idempotent replay) is
 * locked in subscription-decisions.test.ts against the REAL lib — this file
 * only locks the route's error-code mapping with the lib mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockResolve = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/auth', () => ({
        requirePermission: vi.fn(async () => ({
                authorized: true,
                userId: 1,
                role: 'admin',
                restaurantId: null,
                subscriptionStatus: 'active',
                permissions: [],
        })),
}));
vi.mock('@/lib/subscription-decisions', () => ({
        resolveSubscriptionPayment: mockResolve,
}));

beforeEach(() => {
        vi.clearAllMocks();
});

async function callVerify(id: number, status: 'verified' | 'cancelled') {
        const { POST } = await import('@/app/api/admin/subscriptions/route');
        return POST(
                new NextRequest('http://localhost/api/admin/subscriptions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status }),
                })
        );
}

describe('POST /api/admin/subscriptions — failure-status mapping (round91-F-B)', () => {
        it('plan-cap rejection (status 409 from the lib) → HTTP 409 with the Arabic reason', async () => {
                mockResolve.mockResolvedValueOnce({ ok: false, reason: 'تجاوز سقف المطاعم للخطة', status: 409 });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('تجاوز سقف المطاعم للخطة');
        });

        it('failure WITHOUT a status keeps the legacy 400 (already-processed etc.)', async () => {
                mockResolve.mockResolvedValueOnce({ ok: false, reason: 'تمت معالجة هذا الطلب مسبقاً' });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('تمت معالجة هذا الطلب مسبقاً');
        });

        it('not-found reason keeps the 404 envelope', async () => {
                mockResolve.mockResolvedValueOnce({ ok: false, reason: 'الطلب غير موجود' });

                const res = await callVerify(999, 'verified');

                expect(res.status).toBe(404);
        });

        it('success → 200 with the lib result', async () => {
                mockResolve.mockResolvedValueOnce({ ok: true, action: 'verified', paymentId: 50 });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ ok: true, action: 'verified', paymentId: 50 });
        });
});

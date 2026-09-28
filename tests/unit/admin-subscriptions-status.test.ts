/**
 * round91-F-B (D2-#1) — the HTTP mapping for the decision lib's failure
 * status: POST /api/admin/subscriptions propagates result.status (the
 * plan-cap rejection reaches the admin as 409) while every other failure
 * keeps the legacy code (404 not-found / 400 already-processed etc.).
 *
 * The decision logic itself (FOR UPDATE, cap math, idempotent replay) is
 * locked in subscription-decisions.test.ts against the REAL lib — this file
 * only locks the route's error-code mapping with the lib mocked.
 *
 * r121-E2 added: the panel-side twin of the webhook's isPaymentSelfApproval
 * guard — an approver who IS the payer gets 403 before the decision lib is
 * ever consulted (payment stays pending). Role-blind, like the webhook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockResolve = vi.hoisted(() => vi.fn());
// r116: مسار اللوحة يستدعي الآن مزامنة رسائل تليجرام بعد كل حسم ناجح —
// تُهمَل هنا (سلوكها مُقفَل في ملفها الخاص) حتى يبقى هذا الملف مقتصرًا على
// خريطة أكواد HTTP.
const mockSync = vi.hoisted(() => vi.fn());
// r121-E2: the panel route now pre-reads the payment's payer before
// resolving — default fixture is SOMEONE ELSE'S payment (userId 99), so the
// mapping tests below stay on the pass-through path.
const mockPaymentFindUnique = vi.hoisted(() => vi.fn());
// r121-E2: mutable auth holder — the self-approval guard is role-blind, so
// the tests switch between admin / sub_admin(MANAGE_SUBSCRIPTIONS) callers.
const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                userId: 1,
                role: 'admin',
                restaurantId: null,
                subscriptionStatus: 'active',
                permissions: [] as string[],
        },
}));

vi.mock('@/lib/telegram-payment-sync', () => ({
        syncPaymentMessagesAfterDecision: mockSync,
}));
vi.mock('@/lib/db', () => ({
        prisma: { subscriptionPayment: { findUnique: mockPaymentFindUnique } },
}));
vi.mock('@/lib/auth', () => ({
        requirePermission: vi.fn(async () => authHolder.value),
}));
vi.mock('@/lib/subscription-decisions', () => ({
        resolveSubscriptionPayment: mockResolve,
}));

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = {
                authorized: true,
                userId: 1,
                role: 'admin',
                restaurantId: null,
                subscriptionStatus: 'active',
                permissions: [],
        };
        // r121-E2 default: someone else's payment — the guard passes through
        mockPaymentFindUnique.mockResolvedValue({ userId: 99 });
        mockSync.mockResolvedValue(undefined);
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

        it('r116: success ALSO syncs Telegram keyboards (stale live buttons caused the reported «تمت معالجة هذا الطلب مسبقاً»)', async () => {
                mockResolve.mockResolvedValueOnce({ ok: true, action: 'cancelled', paymentId: 51 });

                const res = await callVerify(51, 'cancelled');

                expect(res.status).toBe(200);
                expect(mockSync).toHaveBeenCalledWith(51, 'cancelled', { source: 'panel' });
        });

        it('r116: failure does NOT sync (payment stays pending, buttons must stay live)', async () => {
                mockResolve.mockResolvedValueOnce({ ok: false, reason: 'تجاوز سقف المطاعم للخطة', status: 409 });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(409);
                expect(mockSync).not.toHaveBeenCalled();
        });
});

// ── r121-E2: self-approval guard (webhook-twin) ─────────────────────────

describe('POST /api/admin/subscriptions — r121-E2 self-approval guard', () => {
        it('approver IS the payer → 403, decision lib never called (payment stays pending), no Telegram sync', async () => {
                // authHolder default: userId 1 — the payment belongs to the SAME user
                mockPaymentFindUnique.mockResolvedValueOnce({ userId: 1 });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا يمكنك البت في طلب دفع خاص بحسابك');
                expect(mockResolve).not.toHaveBeenCalled();
                expect(mockSync).not.toHaveBeenCalled();
        });

        it('role-blind: sub_admin(MANAGE_SUBSCRIPTIONS) resolving their OWN payment (even a cancel) → 403', async () => {
                authHolder.value = {
                        authorized: true,
                        userId: 5,
                        role: 'sub_admin',
                        restaurantId: null,
                        subscriptionStatus: 'active',
                        permissions: ['MANAGE_SUBSCRIPTIONS'],
                };
                mockPaymentFindUnique.mockResolvedValueOnce({ userId: 5 });

                const res = await callVerify(50, 'cancelled');

                expect(res.status).toBe(403);
                expect(mockResolve).not.toHaveBeenCalled();
        });

        it("someone else's payment → guard passes, the decision runs (200)", async () => {
                mockPaymentFindUnique.mockResolvedValueOnce({ userId: 99 });
                mockResolve.mockResolvedValueOnce({ ok: true, action: 'verified', paymentId: 50 });

                const res = await callVerify(50, 'verified');

                expect(res.status).toBe(200);
                expect(mockPaymentFindUnique).toHaveBeenCalledWith({
                        where: { id: 50 },
                        select: { userId: true },
                });
                expect(mockResolve).toHaveBeenCalledWith(50, 'verified');
        });

        it('payment with a null userId (new-user pending payment) → falls through to the decision lib', async () => {
                mockPaymentFindUnique.mockResolvedValueOnce({ userId: null });
                mockResolve.mockResolvedValueOnce({ ok: true, action: 'verified', paymentId: 60 });

                const res = await callVerify(60, 'verified');

                expect(res.status).toBe(200);
                expect(mockResolve).toHaveBeenCalledWith(60, 'verified');
        });

        it('unknown payment id → guard no-ops on the null row, the lib maps the 404', async () => {
                mockPaymentFindUnique.mockResolvedValueOnce(null);
                mockResolve.mockResolvedValueOnce({ ok: false, reason: 'الطلب غير موجود' });

                const res = await callVerify(999, 'verified');

                expect(res.status).toBe(404);
                expect(mockResolve).toHaveBeenCalledWith(999, 'verified');
        });
});

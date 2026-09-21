/**
 * round89-B6 (dx-4 #9) — anti-replay for the manual Telegram link token.
 *
 * POST /api/admin/telegram/verify accepted the 5-min HMAC link token any
 * number of times. It now applies the SAME spend-mark as the webhook link
 * flow: an atomic create on the rateLimitEntry unique key
 * `link-token:<HMAC(token)>` — first presentation wins, the second is
 * rejected 400. The shared key namespace means a token spent through the
 * webhook is also dead here (and vice versa).
 *
 * Token construction mirrors api/admin/telegram/link/route.ts exactly
 * (payload = {"userId":N,"exp":unix-seconds} + "." + HMAC-SHA256 hex,
 * base64url) with the REAL getHmacKey (AUTH_SECRET set per-file).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';

// deterministic per-file master secret (keys.ts reads AUTH_SECRET)
process.env.AUTH_SECRET = 'b'.repeat(64);

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                userId: 1 as number,
                role: 'admin' as string,
                restaurantId: null as number | null,
                permissions: [] as string[],
        },
}));

const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockRateLimitEntryCreate = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: {
                user: { update: mockUserUpdate },
                rateLimitEntry: { create: mockRateLimitEntryCreate },
        },
}));
vi.mock('@/lib/auth', () => ({
        requirePermission: () => Promise.resolve(authHolder.value),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { POST } from '@/app/api/admin/telegram/verify/route';
import { getHmacKey } from '@/lib/keys';

const hmacKey = Buffer.from(getHmacKey());

function buildToken(userId: number, expSeconds: number): string {
        const payload = JSON.stringify({ userId, exp: expSeconds });
        const sig = createHmac('sha256', hmacKey).update(payload).digest('hex');
        return Buffer.from(payload + '.' + sig).toString('base64url');
}

function tokenSpendKey(token: string): string {
        // the exact key the webhook link flow uses — same namespace
        return `link-token:${createHmac('sha256', hmacKey).update(token).digest('hex')}`;
}

function callVerify(token: string, chatId: string | number = 555111222) {
        return POST(
                new NextRequest('http://localhost/api/admin/telegram/verify', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ token, chatId, username: 'linker' }),
                })
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, userId: 1, role: 'admin', restaurantId: null, permissions: [] };
        mockUserUpdate.mockResolvedValue({});
        mockRateLimitEntryCreate.mockResolvedValue({});
        mockLogAudit.mockResolvedValue({});
});

describe('POST /api/admin/telegram/verify — anti-replay (B-6)', () => {
        it('first use of a fresh token → 200 linked:true, spends the token', async () => {
                const exp = Math.floor(Date.now() / 1000) + 300;
                const token = buildToken(5, exp);
                // round94-3a: الرمز صار مربوطًا بمولّده — المتصل هو نفسه المدير 5
                authHolder.value = { ...authHolder.value, userId: 5 };

                const res = await callVerify(token);

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data).toEqual({ linked: true });
                // the spend-mark row is written with the exp-based TTL
                expect(mockRateLimitEntryCreate).toHaveBeenCalledTimes(1);
                const createArg = mockRateLimitEntryCreate.mock.calls[0][0].data;
                expect(createArg.key).toBe(tokenSpendKey(token));
                expect(createArg.windowEnd.getTime()).toBe(exp * 1000);
                // user linked with the chat id from the request body
                expect(mockUserUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: { id: 5 },
                                data: expect.objectContaining({ telegramChatId: '555111222', telegramUsername: 'linker' }),
                        })
                );
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
        });

        it('second presentation of the same token → 400, user NOT relinked', async () => {
                const token = buildToken(5, Math.floor(Date.now() / 1000) + 300);
                // round94-3a: مولّد الرمز نفسه هو المتصل (فحص الربط يمر)
                authHolder.value = { ...authHolder.value, userId: 5 };
                // simulate the unique-constraint rejection of the already-spent row
                mockRateLimitEntryCreate.mockRejectedValue(new Error('Unique constraint failed'));

                const res = await callVerify(token);

                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.success).toBe(false);
                expect(body.error).toBe('الرمز مستخدم مسبقاً');
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('first-then-replay sequence: success, then the DB rejects the second create → 400', async () => {
                const token = buildToken(6, Math.floor(Date.now() / 1000) + 300);
                // round94-3a: مولّد الرمز نفسه هو المتصل (فحص الربط يمر)
                authHolder.value = { ...authHolder.value, userId: 6 };

                // 1st: create succeeds
                const first = await callVerify(token);
                expect(first.status).toBe(200);

                // 2nd: the row now exists — create rejects like a unique constraint
                mockRateLimitEntryCreate.mockRejectedValueOnce(new Error('Unique constraint failed'));
                const second = await callVerify(token);
                expect(second.status).toBe(400);
                expect(mockUserUpdate).toHaveBeenCalledTimes(1); // only the first call linked
        });

        it('expired token → 400 WITHOUT spending or linking', async () => {
                const token = buildToken(5, Math.floor(Date.now() / 1000) - 60);

                const res = await callVerify(token);

                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.error).toBe('انتهت صلاحية الرمز');
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('bad signature → 400 invalid token, no spend, no link', async () => {
                const payload = JSON.stringify({ userId: 5, exp: Math.floor(Date.now() / 1000) + 300 });
                const forged = Buffer.from(`${payload}.deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`).toString('base64url');

                const res = await callVerify(forged);

                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.error).toBe('رمز غير صالح');
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('missing token/chatId → 422 before any HMAC work (r119-S8)', async () => {
                const res = await POST(
                        new NextRequest('http://localhost/api/admin/telegram/verify', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ chatId: 1 }),
                        })
                );

                expect(res.status).toBe(422);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
        });

        it('permission gate: unauthorized caller gets the propagated status', async () => {
                authHolder.value = {
                        ...authHolder.value,
                        authorized: false,
                        role: 'USER',
                } as typeof authHolder.value;

                const token = buildToken(5, Math.floor(Date.now() / 1000) + 300);
                const res = await callVerify(token);

                expect(res.status).toBeGreaterThanOrEqual(400);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });
});

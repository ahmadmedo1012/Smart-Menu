/**
 * round94-3a (W1-a أمن — تقرير B LOW-3 §4): رمز الربط في
 * POST /api/admin/telegram/verify مربوط بمولّده.
 *
 * الخلل: البوابة requirePermission('EDIT_SETTINGS') لكن لا فحص أن
 * data.userId (حمولة الرمز الموقّعة) = المتصل — حامل الصلاحية يلتقط رمزًا
 * صدر لمدير آخر (تسريب paste/لقطة شاشة — صلاحيته 5 دقائق أحادي
 * الاستخدام) فيربط حساب الضحية بـtelegramChatId يخصه، فيستلم إشعارات
 * مدفوعات/قرارات اشتراك الضحية (اختطاف قناة إشعارات).
 *
 * الإصلاح المُختبر (لا هجرة prisma — حمولة الرمز تحمل userId مولّده منذ
 * البداية، انظر admin/telegram/link/route.ts:17): رمز من مولد A لا يربط
 * حساب B (403) ولا يُنفق ولا يُسجّل تدقيق — قبل نقطة الإنفاق anti-replay.
 *
 * بناء الرمز يطابق المصدر حرفيًا (نمط telegram-verify-anti-replay.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';

// deterministic per-file master secret (keys.ts reads AUTH_SECRET)
process.env.AUTH_SECRET = 'c'.repeat(64);

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

function callVerify(token: string, chatId: string | number = 555111222) {
        return POST(
                new NextRequest('http://localhost/api/admin/telegram/verify', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ token, chatId, username: 'thief' }),
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

describe('round94 LOW-3 — POST /api/admin/telegram/verify: الرمز مرتبط بمولّده', () => {
        it('رمز من مولد A (userId=5) يقدّمه متصل آخر (userId=1) → 403 «رمز غير مخصص لك» بلا إنفاق ولا ربط', async () => {
                const token = buildToken(5, Math.floor(Date.now() / 1000) + 300);

                const res = await callVerify(token);

                expect(res.status).toBe(403);
                const body = await res.json();
                expect(body.success).toBe(false);
                expect(body.error).toBe('رمز غير مخصص لك');
                // الرمز لم يُنفق (anti-replay لم يُلمس) — مولّده الحقيقي يستطيع
                // استخدامه لاحقًا خلال صلاحيته
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                // حساب الضحية 5 لم يُربط بقناة اللص
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('رمز مولّده نفسه (userId=5 متصل userId=5) → 200 يربط حسابه بقناته', async () => {
                const token = buildToken(5, Math.floor(Date.now() / 1000) + 300);
                authHolder.value = { ...authHolder.value, userId: 5 };

                const res = await callVerify(token, 999000111);

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.data).toEqual({ linked: true });
                expect(mockUserUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: { id: 5 },
                                data: expect.objectContaining({ telegramChatId: '999000111' }),
                        })
                );
        });

        it('رمز منتهٍ لمولّد آخر → 400 انتهت صلاحية الرمز (فحص الصلاحية يسبق فحص الربط)', async () => {
                const token = buildToken(9, Math.floor(Date.now() / 1000) - 60);

                const res = await callVerify(token);

                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.error).toBe('انتهت صلاحية الرمز');
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('رمز بتوقيع صالح لكن لمولّد آخر لا يستهلك ميزانية anti-replay (الإنفاق بعد الربط)', async () => {
                const token = buildToken(5, Math.floor(Date.now() / 1000) + 300);
                // المحاولة اللصة تُرفض
                const stolen = await callVerify(token);
                expect(stolen.status).toBe(403);

                // ثم يقدم المولّد نفسه رمزه فيربط بنجاح (لم يُنفق عليه)
                authHolder.value = { ...authHolder.value, userId: 5 };
                const legit = await callVerify(token);
                expect(legit.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 5 } })
                );
        });
});

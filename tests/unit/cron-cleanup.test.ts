/**
 * g90-F5b (T5) — تغطية وحدة لمسار src/app/api/cron/cleanup/route.ts
 * (كان 0% lcov — منظف الجلسات المنتهية وسجلات التدقيق).
 *
 * النمط القياسي: vi.hoisted + vi.mock للـprisma وlogger؛ المقارنة
 * ثابتة-الوقت (timingSafeBearer الحقيقي من @/lib/secure-compare يعمل —
 * لا تُنكَّر: سلوكها جزء من العقد). الزمن مجمّد بfake timers ليتحقق
 * نافذتا الاحتفاظ بدقة صحيحة إلى الملّي ثانية:
 *   - جلسات: expiresAt < now - 7 أيام
 *   - سجلات تدقيق: createdAt < now - 90 يومًا
 *   - أحداث النظام: createdAt < now - 180 يومًا (R91 F-C / D3)
 *   - حدود المعدل: windowEnd < now - ساعة (r92-D8 — عقد التنظيف الرابع موثق
 *     في r92-cleanup-ratelimit.test.ts)
 * (القيم المقروءة من الكود: route.ts:22 وroute.ts:33 وroute.ts:53 وroute.ts:80.)
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma.deleteMany مُنكَّر بالكامل.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockAuditDeleteMany = vi.hoisted(() => vi.fn());
const mockSystemEventDeleteMany = vi.hoisted(() => vi.fn());
const mockRateLimitDeleteMany = vi.hoisted(() => vi.fn()); // r92-D8: التنظيف الرابع
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        session: { deleteMany: mockSessionDeleteMany },
        auditLog: { deleteMany: mockAuditDeleteMany },
        systemEvent: { deleteMany: mockSystemEventDeleteMany },
        rateLimitEntry: { deleteMany: mockRateLimitDeleteMany }, // r92-D8: عقد المحددات في r92-cleanup-ratelimit.test.ts
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

const cleanupRoute = await import('@/app/api/cron/cleanup/route');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const T0 = Date.parse('2026-09-06T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const cleanupRequest = (auth?: string) =>
        new NextRequest('http://localhost/api/cron/cleanup', {
                headers: auth === undefined ? {} : { authorization: auth },
        });

const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(T0);
        vi.clearAllMocks();
        process.env.CRON_SECRET = 'cron-secret-ascii-test';
        mockSessionDeleteMany.mockResolvedValue({ count: 3 });
        mockAuditDeleteMany.mockResolvedValue({ count: 27 });
        mockSystemEventDeleteMany.mockResolvedValue({ count: 0 });
        mockRateLimitDeleteMany.mockResolvedValue({ count: 0 }); // r92-D8
});

afterEach(() => {
        vi.useRealTimers();
        if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = originalCronSecret;
});

// ── البوابة: 401 فشلًا مغلقًا ───────────────────────────────────────────

describe('GET /api/cron/cleanup — بوابة CRON_SECRET (ثابتة-الوقت)', () => {
        it('بلا ترويسة Authorization → 401 ولا يُحذف شيء', async () => {
                const res = await cleanupRoute.GET(cleanupRequest());
                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.error).toBe('Unauthorized');
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
                expect(mockAuditDeleteMany).not.toHaveBeenCalled();
                expect(mockSystemEventDeleteMany).not.toHaveBeenCalled();
                expect(mockRateLimitDeleteMany).not.toHaveBeenCalled();
        });

        it('bearer خاطئ → 401 (المقارنة timingSafeBearer — «Bearer secret» كاملة)', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer wrong-secret'));
                expect(res.status).toBe(401);
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
                expect(mockAuditDeleteMany).not.toHaveBeenCalled();
        });

        it('السر وحده بلا بادئة «Bearer » → 401 (الصيغة الكاملة مطلوبة)', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('cron-secret-ascii-test'));
                expect(res.status).toBe(401);
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
        });

        it('CRON_SECRET غير مضبوط في البيئة → 401 فشلًا مغلقًا مهما أُرسل (لا يعمل بلا سر)', async () => {
                delete process.env.CRON_SECRET;
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(401);
                expect(mockSessionDeleteMany).not.toHaveBeenCalled();
                expect(mockAuditDeleteMany).not.toHaveBeenCalled();
                expect(mockSystemEventDeleteMany).not.toHaveBeenCalled();
                expect(mockRateLimitDeleteMany).not.toHaveBeenCalled();
        });
});

// ── النجاح: نوافذ الاحتفاظ الثلاث ───────────────────────────────────────

describe('GET /api/cron/cleanup — bearer صحيح → تنظيف بنوافذ الاحتفاظ الثلاث', () => {
        it('200 + deleteMany ثلاث مرات: جلسات أقدم من 7 أيام وسجلات أقدم من 90 يومًا وأحداث أقدم من 180 يومًا', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);

                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockSystemEventDeleteMany).toHaveBeenCalledTimes(1);

                const sessionArg = mockSessionDeleteMany.mock.calls[0][0];
                expect(sessionArg.where.expiresAt.lt.getTime()).toBe(T0 - 7 * DAY);

                const auditArg = mockAuditDeleteMany.mock.calls[0][0];
                expect(auditArg.where.createdAt.lt.getTime()).toBe(T0 - 90 * DAY);

                const systemEventArg = mockSystemEventDeleteMany.mock.calls[0][0];
                expect(systemEventArg.where.createdAt.lt.getTime()).toBe(T0 - 180 * DAY);
        });

        it('الجسم يعيد العدّادات الأربعة: sessionsDeleted وauditLogsDeleted وsystemEventsDeleted وrateLimitEntriesDeleted', async () => {
                mockSystemEventDeleteMany.mockResolvedValue({ count: 412 });
                mockRateLimitDeleteMany.mockResolvedValue({ count: 7 });
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                const json = await res.json();
                expect(json).toEqual({ sessionsDeleted: 3, auditLogsDeleted: 27, systemEventsDeleted: 412, rateLimitEntriesDeleted: 7 });
        });

        it('فشل حذف الجلسات لا يوقف سجلات التدقيق → 200 مع sessionsError والتنظيف الثاني يعمل', async () => {
                mockSessionDeleteMany.mockRejectedValue(new Error('connection lost'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBeUndefined();
                // r102-A4: الجسم مُقنّع ("cleanup failed") — التفصيل الخام في سجل الخادم فقط.
                expect(json.sessionsError).toBe('cleanup failed');
                expect(json.auditLogsDeleted).toBe(27);
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockLogError).toHaveBeenCalledWith(
                        'cron: sesion cleanup',
                        expect.objectContaining({ error: expect.stringContaining('connection') }),
                );
        });

        it('فشل سجلات التدقيق وحدها → 200 مع auditLogsError والجلسات نُظّفت والأحداث نُظّفت', async () => {
                mockAuditDeleteMany.mockRejectedValue(new Error('timeout'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBe(3);
                // r102-A4: الجسم مُقنّع — لا تسريب لرسائل المشغل الداخلية.
                expect(json.auditLogsError).toBe('cleanup failed');
                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
        });
});

// ── R91 F-C (D3): احتفاظ أحداث النظام 180 يومًا ─────────────────────────

describe('GET /api/cron/cleanup — SystemEvent retention (R91 F-C / D3)', () => {
        it('نافذة الاحتفاظ 180 يومًا بالضبط (وليست 90 أو سنة) — فلتر createdAt فقط', async () => {
                await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));

                expect(mockSystemEventDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockSystemEventDeleteMany.mock.calls[0][0];
                // النافذة أدق من الملّي: T0 - 180 يومًا بالضبط
                expect(arg.where.createdAt.lt.getTime()).toBe(T0 - 180 * DAY);
                // الفلتر على createdAt فقط (لا شروط إضافية مثل read/severity)
                expect(Object.keys(arg.where)).toEqual(['createdAt']);
                expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
        });

        it('فشل حذف أحداث النظام لا يوقف بقية التنظيف → 200 مع systemEventsError والباقي نُظّف', async () => {
                mockSystemEventDeleteMany.mockRejectedValue(new Error('pg timeout'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBe(3);
                expect(json.auditLogsDeleted).toBe(27);
                expect(json.systemEventsDeleted).toBeUndefined();
                // r102-A4: الجسم مُقنّع — التفصيل الخام مؤكد في سجل الخادم أدناه.
                expect(json.systemEventsError).toBe('cleanup failed');
                expect(mockLogError).toHaveBeenCalledWith(
                        'cron: system events cleanup',
                        expect.objectContaining({ error: expect.stringContaining('pg timeout') }),
                );
        });

        it('صفر أحداث قديمة → عدّاد صفر في الجسم وليس غياب المفتاح', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                const json = await res.json();
                expect(json.systemEventsDeleted).toBe(0);
        });
});

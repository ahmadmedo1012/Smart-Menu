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
 * (القيم المقروءة من الكود: route.ts:22 وroute.ts:33.)
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma.deleteMany مُنكَّر بالكامل.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockAuditDeleteMany = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        session: { deleteMany: mockSessionDeleteMany },
        auditLog: { deleteMany: mockAuditDeleteMany },
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
        });
});

// ── النجاح: نافذتا الاحتفاظ ────────────────────────────────────────────

describe('GET /api/cron/cleanup — bearer صحيح → تنظيف بنافذتي الاحتفاظ', () => {
        it('200 + deleteMany مرتين: جلسات أقدم من 7 أيام وسجلات أقدم من 90 يومًا', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);

                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);

                const sessionArg = mockSessionDeleteMany.mock.calls[0][0];
                expect(sessionArg.where.expiresAt.lt.getTime()).toBe(T0 - 7 * DAY);

                const auditArg = mockAuditDeleteMany.mock.calls[0][0];
                expect(auditArg.where.createdAt.lt.getTime()).toBe(T0 - 90 * DAY);
        });

        it('الجسم يعيد العدّادات: sessionsDeleted وauditLogsDeleted', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                const json = await res.json();
                expect(json).toEqual({ sessionsDeleted: 3, auditLogsDeleted: 27 });
        });

        it('فشل حذف الجلسات لا يوقف سجلات التدقيق → 200 مع sessionsError والتنظيف الثاني يعمل', async () => {
                mockSessionDeleteMany.mockRejectedValue(new Error('connection lost'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBeUndefined();
                expect(String(json.sessionsError)).toContain('connection lost');
                expect(json.auditLogsDeleted).toBe(27);
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockLogError).toHaveBeenCalledWith(
                        'cron: sesion cleanup',
                        expect.objectContaining({ error: expect.stringContaining('connection') }),
                );
        });

        it('فشل سجلات التدقيق وحدها → 200 مع auditLogsError والجلسات نُظّفت', async () => {
                mockAuditDeleteMany.mockRejectedValue(new Error('timeout'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBe(3);
                expect(String(json.auditLogsError)).toContain('timeout');
                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
        });
});

/**
 * r92-D8 — تغطية التنظيف الاحتياطي الرابع في src/app/api/cron/cleanup/route.ts
 * (RateLimitEntry: windowEnd < now − ساعة).
 *
 * الدافع (تشخيص 1-d): RateLimitEntry كان الجدول التشغيلي الوحيد خارج
 * تغطية cron-cleanup — اعتمد كليًا على المسح الاحتمالي r90-F4 (1/32 لكل
 * فحص، دفعة 512، احتفاظ 60 ث) وهو مسح **يقوده الطلب**: في فترات الزحام
 * المنخفض يتوقف كليًا فتتراكم المفاتيح أحادية الاستخدام المنتهية
 * (acct:ip:username · claim:ip · link-token:…). هذا التنظيف الأسبوعي حزام
 * أمان مكمّل لا مكرر (المسح يحدّ النمو وقت الزحام، وهذا يحدّ أسوأ حالة
 * مهما كان الزحام).
 *
 * عقد الحد (ساعة) متحفظ عمدًا: أطول نافذة محدد في التطبيق 15 دقيقة
 * (قفل الحساب الاحتياطي — auth/login:44)، فصف أغلق نافذته قبل أكثر من
 * ساعة لا يمكن أن يؤثر في أي قرار حد جارٍ.
 *
 * النمط القياسي (نسخة من cron-cleanup.test.ts الجارية): vi.hoisted +
 * vi.mock للـprisma وlogger · timingSafeBearer الحقيقي (لا يُنكَّر) ·
 * الزمن مجمّد بfake timers للتحقق من النافذة إلى الملّي ثانية.
 *
 * التوكيد المزدوج: البوابة الرابعة الجديدة تعمل بالعقد الصحيح، **والثلاثة
 * القديمة لم تتغير** (7d/90d/180d + أسماء العدّادات) — لا كسر للعقد القائم.
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma.deleteMany مُنكَّر بالكامل.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockAuditDeleteMany = vi.hoisted(() => vi.fn());
const mockSystemEventDeleteMany = vi.hoisted(() => vi.fn());
const mockRateLimitDeleteMany = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        session: { deleteMany: mockSessionDeleteMany },
        auditLog: { deleteMany: mockAuditDeleteMany },
        systemEvent: { deleteMany: mockSystemEventDeleteMany },
        rateLimitEntry: { deleteMany: mockRateLimitDeleteMany },
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
const HOUR = 60 * 60 * 1000;

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
        mockSystemEventDeleteMany.mockResolvedValue({ count: 412 });
        mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
        vi.useRealTimers();
        if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = originalCronSecret;
});

// ── البوابة الرابعة (r92-D8): RateLimitEntry ───────────────────────────

describe('GET /api/cron/cleanup — RateLimitEntry safety-net (r92-D8)', () => {
        it('deleteMany الرابع استُدعي مرة واحدة بفلتر windowEnd فقط: windowEnd < now − ساعة', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);

                expect(mockRateLimitDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockRateLimitDeleteMany.mock.calls[0][0];
                // النافذة أدق من الملّي: T0 − ساعة واحدة بالضبط
                expect(arg.where.windowEnd.lt.getTime()).toBe(T0 - HOUR);
                // الفلتر على windowEnd فقط — لا شروط إضافية (المسح الاحتمالي يتكفل بالباقي)
                expect(Object.keys(arg.where)).toEqual(['windowEnd']);
                expect(arg.where.windowEnd.lt).toBeInstanceOf(Date);
        });

        it('الجسم يعيد rateLimitEntriesDeleted (عدّاد حاضر حتى لو صفرًا — وليس مفتاحًا غائبًا)', async () => {
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                const json = await res.json();
                expect(json.rateLimitEntriesDeleted).toBe(0);
        });

        it('عدّاد غير صفر يصل الجسم كما هو (بلا تحويل/تقريب)', async () => {
                mockRateLimitDeleteMany.mockResolvedValue({ count: 14001 });
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                const json = await res.json();
                expect(json.rateLimitEntriesDeleted).toBe(14001);
        });

        it('فشل حذف RateLimitEntry لا يوقف الخطوات الثلاث قبله → 200 مع rateLimitEntriesError والباقي نُظّف', async () => {
                mockRateLimitDeleteMany.mockRejectedValue(new Error('pg connection lost'));
                const res = await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.sessionsDeleted).toBe(3);
                expect(json.auditLogsDeleted).toBe(27);
                expect(json.systemEventsDeleted).toBe(412);
                expect(json.rateLimitEntriesDeleted).toBeUndefined();
                // r103-N5: the JSON body is the generic A4 copy — the raw driver error
                // lives ONLY in the server log (asserted below)
                expect(json.rateLimitEntriesError).toBe('cleanup failed');
                expect(json.rateLimitEntriesError).not.toContain('pg connection');
                expect(mockLogError).toHaveBeenCalledWith(
                        'cron: rate limit entries cleanup',
                        expect.objectContaining({ error: expect.stringContaining('pg connection lost') }),
                );
        });

        it('بوابة 401 تمنع التنظيف الرابع أيضًا (فشل مغلق — لا حذف بلا CRON_SECRET)', async () => {
                const res = await cleanupRoute.GET(cleanupRequest());
                expect(res.status).toBe(401);
                expect(mockRateLimitDeleteMany).not.toHaveBeenCalled();
        });
});

// ── لا كسر: الثلاثة القديمة بنفس عقدها الحرفي ──────────────────────────

describe('GET /api/cron/cleanup — الثلاثة القديمة لم تتغير (لا كسر r92-D8)', () => {
        it('الجلسات ما زالت expiresAt < now − 7 أيام بالضبط', async () => {
                await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockSessionDeleteMany.mock.calls[0][0];
                expect(arg.where.expiresAt.lt.getTime()).toBe(T0 - 7 * DAY);
                expect(Object.keys(arg.where)).toEqual(['expiresAt']);
        });

        it('سجلات التدقيق ما زالت createdAt < now − 90 يومًا بالضبط', async () => {
                await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockAuditDeleteMany.mock.calls[0][0];
                expect(arg.where.createdAt.lt.getTime()).toBe(T0 - 90 * DAY);
                expect(Object.keys(arg.where)).toEqual(['createdAt']);
        });

        it('أحداث النظام ما زالت createdAt < now − 180 يومًا بالضبط', async () => {
                await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(mockSystemEventDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockSystemEventDeleteMany.mock.calls[0][0];
                expect(arg.where.createdAt.lt.getTime()).toBe(T0 - 180 * DAY);
                expect(Object.keys(arg.where)).toEqual(['createdAt']);
        });

        it('كل deleteMany مرة واحدة بالضبط في الطلب الناجح (لا استدعاءات مكررة/إضافية)', async () => {
                await cleanupRoute.GET(cleanupRequest('Bearer cron-secret-ascii-test'));
                expect(mockSessionDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockAuditDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockSystemEventDeleteMany).toHaveBeenCalledTimes(1);
                expect(mockRateLimitDeleteMany).toHaveBeenCalledTimes(1);
        });
});

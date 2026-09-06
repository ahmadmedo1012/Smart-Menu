/**
 * g90-F5b (T10) — تغطية وحدة لـnotifyEvent + التشفير في src/lib/telegram.ts
 * (كان 0% lcov على الملف — لا اختبار يثبت حماية round86-A5 من حقن
 * الماركداون في قناة العمليات).
 *
 * السلسلة تعمل حقيقية: notifyEvent (حقيقي) → broadcastToAll (حقيقي) →
 * fetch منكَّر عالميًا. المنكَّرات: prisma و@/lib/config (التوكن) وlogger.
 *
 * ملاحظة سلوك مقروءة من المصدر (regexp /([_*\[\]`\\])/g):
 *   - الأقواس ( ) ليست من مجموعة التشفير — رابط «[نص](رابط)» يُكسر
 *     تشفيرُ الأقواس المربعة تركيبَه فيتعطل الرابط الماكر (لا يقبل التصيير
 *     كرابط قابل للنقر)، لكن نص الرابط يبقى ظاهرًا حرفيًا وقد يُشير إليه
 *     عميل تيليجرام كرابط عادي — موثّق كحماية «عنصر نص مُضلِّل» لا حجبًا
 *     كاملًا للرابط (لا تعديل src/ من نطاقي).
 *   - البوابة: config غائب/غير نشط أو حدث غير مفعّل → {sent:0} بلا شبكة.
 *   - التوكن غائب → لا استدعاء شبكة إطلاقًا (يُرفض قبل جمع المستلمين).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockConfigFindFirst = vi.hoisted(() => vi.fn());
const mockTargetsFindMany = vi.hoisted(() => vi.fn());
const mockUsersFindMany = vi.hoisted(() => vi.fn());
const mockBotToken = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        telegramConfig: { findFirst: mockConfigFindFirst },
        telegramBroadcastTarget: { findMany: mockTargetsFindMany },
        user: { findMany: mockUsersFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockBotToken }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: mockLogWarn,
        info: vi.fn(),
        debug: vi.fn(),
}));

const { notifyEvent } = await import('@/lib/telegram');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const okResponse = () => ({ ok: true, json: async () => ({}), text: async () => '' });

function sentBodies(): Array<Record<string, unknown>> {
        return (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([, init]) =>
                JSON.parse(String(init.body)),
        );
}

const sentText = () => String(sentBodies()[0]?.text ?? '');

beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockResolvedValue(okResponse());
        mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: true, events: [] });
        mockBotToken.mockResolvedValue('111:ABC');
        mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
        mockUsersFindMany.mockResolvedValue([{ telegramChatId: '300' }]);
});

afterEach(() => {
        vi.unstubAllGlobals();
});

// ── الحماية من حقن الماركداون (round86-A5) ─────────────────────────────

describe('notifyEvent — تشفير قيم يتحكم بها المستخدم', () => {
        it('اسم حِقني «[click](https://evil.com)» → الرابط الماكر يُكسر: \\[click\\] مشفّر ولا تركيب رابط خام', async () => {
                const result = await notifyEvent(
                        'evt',
                        { name: '[click](https://evil.com)' },
                        { adminOnly: true },
                );

                expect(result).toEqual({ sent: 1, failed: [] });
                expect(fetchMock).toHaveBeenCalledTimes(1);
                const text = sentText();
                // القوس المربع مشفّر — لا يوجد تركيب "[نص](رابط)" قابل للتصيير
                expect(text).toContain('\\[click\\]');
                expect(text).not.toContain('[click](https://evil.com)');
        });

        it('الجسم النهائي مطابق حرفيًا: عنوان مرقّم ثم الأسطر «• مفتاح: قيمة»', async () => {
                await notifyEvent('evt', { name: '[click](https://evil.com)' }, { adminOnly: true });
                // round90-المنسق (إصلاح F5b-A): القوسان الدائريان صارا مشفّرين أيضًا —
                // عملاء تيليجرام لم تعُد تُشير الروابط العارية تلقائيًا
                expect(sentText()).toBe('*evt*\n• name: \\[click\\]\\(https://evil.com\\)');
        });

        it('أحرف _ * [ ` كلها تُشفَّر بالشرطة الخلفية', async () => {
                await notifyEvent('evt', { v: 'x_y*z[v`w' });
                expect(sentText()).toContain('x\\_y\\*z\\[v\\`w');
                expect(sentText()).not.toContain('x_y');
        });

        it('الشرطة الخلفية نفسها تُضاعف (لا يمكن كسر التشفير بها)', async () => {
                await notifyEvent('evt', { v: 'a\\b' });
                expect(sentText()).toContain('a\\\\b');
        });

        it('اسم الحدث والمفاتيح تُشفَّر أيضًا (ليست القيم وحدها)', async () => {
                await notifyEvent('e_v*t', { 'k_y': 5 });
                expect(sentText()).toBe('*e\\_v\\*t*\n• k\\_y: 5');
        });

        it('parse_mode: Markdown في جسم sendMessage (وضع التصيير الذي تكسره الشفرة)', async () => {
                await notifyEvent('evt', { name: 'x' });
                expect(sentBodies()[0]).toMatchObject({ parse_mode: 'Markdown' });
        });
});

// ── شكل البث ────────────────────────────────────────────────────────────

describe('notifyEvent — fanout الإداري', () => {
        it('بلا adminOnly → أهداف البث + المستخدمون المرتبطون معًا', async () => {
                const result = await notifyEvent('evt', { n: 1 });
                expect(result.sent).toBe(2);
                expect(mockUsersFindMany).toHaveBeenCalled();
                const chatIds = sentBodies().map((b) => b.chat_id);
                expect(chatIds).toEqual([100, 300]);
        });

        it('مع adminOnly → أهداف البث وحدها ولا يُستعلم جدول المستخدمين', async () => {
                const result = await notifyEvent('evt', { n: 1 }, { adminOnly: true });
                expect(result.sent).toBe(1);
                expect(mockUsersFindMany).not.toHaveBeenCalled();
                // النداء عبر واجهة بوت تيليجرام بجسم JSON
                const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
                expect(url).toBe('https://api.telegram.org/bot111:ABC/sendMessage');
                expect(init.method).toBe('POST');
        });
});

// ── البوابات: لا شبكة ──────────────────────────────────────────────────

describe('notifyEvent — بلا توكن أو بلا تهيئة → صفر استدعاءات شبكة', () => {
        it('التوكن غائب/null → {sent: 0} ولا fetch ولا جمع مستلمين', async () => {
                mockBotToken.mockResolvedValue(null);
                const result = await notifyEvent('evt', { n: 1 });
                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
                expect(mockTargetsFindMany).not.toHaveBeenCalled();
        });

        it('لا صف تهيئة أصلًا → {sent: 0} بلا شبكة', async () => {
                mockConfigFindFirst.mockResolvedValue(null);
                const result = await notifyEvent('evt', { n: 1 });
                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
                expect(mockBotToken).not.toHaveBeenCalled();
        });

        it('تهيئة غير نشطة (isActive: false) → {sent: 0} بلا شبكة', async () => {
                mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: false, events: [] });
                const result = await notifyEvent('evt', { n: 1 });
                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
        });

        it('الحدث غير مفعّل في قائمة الأحداث → يُتجاهل بلا شبكة', async () => {
                mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: true, events: ['other'] });
                const result = await notifyEvent('evt', { n: 1 });
                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
                expect(mockBotToken).not.toHaveBeenCalled();
        });
});

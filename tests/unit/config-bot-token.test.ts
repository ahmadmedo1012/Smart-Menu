/**
 * g90-F5b (T7) — تغطية وحدة لـgetDecryptedBotToken في src/lib/config.ts:53-71
 * (كانت التغطية منخفضة على مسار التوكن: أولوية env ← فك التشفير ←
 * fallback النص القديم).
 *
 * الاستراتيجية:
 *   - prisma مُنكَّر (telegramConfig.findFirst) — لا قاعدة حقيقية.
 *   - دوال التشفير الحقيقية من src/lib/config نفسها تعمل (encryptValue/
 *     decryptValue) بمفتاح HKDF مشتق من AUTH_SECRET عبر @/lib/keys الحقيقي —
 *     فدورة AES-GCM كاملة تُختبر لا محاكاة لها.
 *   - لا شبكة إطلاقًا: getDecryptedBotToken لا يقوم بأي نداء شبكي.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockConfigFindFirst = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        telegramConfig: { findFirst: mockConfigFindFirst },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

const { getDecryptedBotToken, encryptValue, decryptValue } = await import('@/lib/config');

// ── إدارة البيئة (AUTH_SECRET ثابت طوال الملف حتى تنجح الدورة) ─────────

const originalAuthSecret = process.env.AUTH_SECRET;
const originalEnvToken = process.env.TELEGRAM_BOT_TOKEN;
const TEST_SECRET = 'g90-f5b-auth-secret-for-hkdf-derivation';

// ProcessEnv الأوسع في src/lib/env.ts يجعل TELEGRAM_BOT_TOKEN/AUTH_SECRET من
// نوع string مطلوبًا (z.default) — منظور Record يسمح بالحذف الآمن في الاختبار
const env = process.env as Record<string, string | undefined>;

beforeEach(() => {
        vi.clearAllMocks();
        env.AUTH_SECRET = TEST_SECRET;
        delete env.TELEGRAM_BOT_TOKEN;
        mockConfigFindFirst.mockResolvedValue(null);
});

afterEach(() => {
        if (originalAuthSecret === undefined) delete env.AUTH_SECRET;
        else env.AUTH_SECRET = originalAuthSecret;
        if (originalEnvToken === undefined) delete env.TELEGRAM_BOT_TOKEN;
        else env.TELEGRAM_BOT_TOKEN = originalEnvToken;
});

// ── أولية env على DB ────────────────────────────────────────────────────

describe('getDecryptedBotToken — متغير البيئة يسبق قاعدة البيانات', () => {
        it('TELEGRAM_BOT_TOKEN مضبوط → يُعاد كما هو ولا يُستشار الجدول إطلاقًا', async () => {
                env.TELEGRAM_BOT_TOKEN = '777:ENV_PRIORITY';
                // لو استُشير الجدول لكان قد أعاد توكنًا صالحًا مختلفًا — الفارق هو البرهان
                mockConfigFindFirst.mockResolvedValue({ botToken: '123:FROM_DB' });

                const token = await getDecryptedBotToken();
                expect(token).toBe('777:ENV_PRIORITY');
                expect(mockConfigFindFirst).not.toHaveBeenCalled();
        });
});

// ── دورة التشفير الحقيقية ───────────────────────────────────────────────

describe('encryptValue/decryptValue — دورة AES-GCM كاملة', () => {
        it('decryptValue(encryptValue(x)) === x (نص لاتيني وآخر عربي بأحرف خاصة)', async () => {
                const samples = ['123:abc', 'توكن عربي بأحرف خاصة _*[]`\\', ''];
                for (const plain of samples) {
                        const round = await decryptValue(await encryptValue(plain));
                        expect(round).toBe(plain);
                }
        });

        it('كل تشفير يستخدم IV عشوائيًا — النص نفسه ينتج نصين مشفرين مختلفين', async () => {
                const a = await encryptValue('123:abc');
                const b = await encryptValue('123:abc');
                expect(a).not.toBe(b);
                // وكلاهما يفكّ إلى القيمة الأصلية
                expect(await decryptValue(a)).toBe('123:abc');
                expect(await decryptValue(b)).toBe('123:abc');
        });
});

// ── المسار المشفر من DB ────────────────────────────────────────────────

describe('getDecryptedBotToken — توكن مشفر في الجدول', () => {
        it('توكن مشفر بصيغة تيليجرام صحيحة → يفكّ ويعاد نصًا', async () => {
                mockConfigFindFirst.mockResolvedValue({ botToken: await encryptValue('123:abc') });
                expect(await getDecryptedBotToken()).toBe('123:abc');
        });

        it('توكن يفكّ لصيغة غير تيليجرام → null (فحص الصيغة بعد فك التشفير) + سجل خطأ', async () => {
                mockConfigFindFirst.mockResolvedValue({ botToken: await encryptValue('bad token no digits') });
                expect(await getDecryptedBotToken()).toBeNull();
                expect(mockLogError).toHaveBeenCalledWith('Decrypted bot token has invalid format');
        });
});

// ── الفاسد والقديم ──────────────────────────────────────────────────────

describe('getDecryptedBotToken — الفاسد والقديم والغائب', () => {
        it('توكن مشفر بصيغة فاسدة → null بلا رمي (فك التشفير يفشل والfallback يرفض)', async () => {
                // 'bm90LXZhbGlk' قاعدة64 فاسدة الدلالة — ليست AES-GCM صالحًا
                mockConfigFindFirst.mockResolvedValue({ botToken: 'bm90LXZhbGlk' });
                await expect(getDecryptedBotToken()).resolves.toBe(null);
                expect(mockLogError).toHaveBeenCalledWith(
                        'Bot token decryption failed and fallback has invalid format',
                );
        });

        it('توكن نصي قديم بصيغة تيليجرام صحيحة (^\\d+:[\\w-]+$) → يُقبل نصًا كما هو', async () => {
                // نص قديم: ليس نصًا صالحًا للفك — decryptValue يرمي فيقع في
                // fallback القيم النصية القديمة الذي يفحص الصيغة
                mockConfigFindFirst.mockResolvedValue({ botToken: '123:abc' });
                expect(await getDecryptedBotToken()).toBe('123:abc');
        });

        it('توكن نصي قديم بصيغة غير تيليجرام → null', async () => {
                mockConfigFindFirst.mockResolvedValue({ botToken: 'legacy-garbage-token' });
                expect(await getDecryptedBotToken()).toBeNull();
                expect(mockLogError).toHaveBeenCalledWith(
                        'Bot token decryption failed and fallback has invalid format',
                );
        });

        it('لا صف config في الجدول → null بلا أي سجل', async () => {
                mockConfigFindFirst.mockResolvedValue(null);
                expect(await getDecryptedBotToken()).toBeNull();
                expect(mockLogError).not.toHaveBeenCalled();
        });

        it('صف بلا botToken (null) → null', async () => {
                mockConfigFindFirst.mockResolvedValue({ botToken: null });
                expect(await getDecryptedBotToken()).toBeNull();
        });
});

/**
 * r116 — سلوك syncPaymentMessagesAfterDecision: بعد أي حسم دفعة من لوحة
 * الإدمن، كل نسخ رسالة الموافقة في metadata.telegramMessages يجب أن تتزامن
 * (نص نهائي + تجريد الأزرار) كي لا يبقى زر حي على طلب محسوم — مصدر بلاغ
 * «تمت معالجة هذا الطلب مسبقاً» المربك للمشرفين.
 *
 * العقود المقفولة هنا:
 *   - لا توكن بوت → عودة مبكرة، صفر قراءة قاعدة وصفر استدعاء تليجرام.
 *   - لا نسخ مسجلة → لا استدعاءات.
 *   - نسخ موجودة → نص + تجريد لكل نسخة، بنص يطابق القرار.
 *   - أي فشل (قاعدة/تعديل) يُبتلع ويُسجَّل — الحسم لا يتعطل أبدًا.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockGetToken = vi.hoisted(() => vi.fn());
const mockEditText = vi.hoisted(() => vi.fn());
const mockEditMarkup = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: { subscriptionPayment: { findUnique: mockFindUnique } },
}));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockGetToken }));
vi.mock('@/lib/telegram-api', () => ({
        editMessageText: mockEditText,
        editMessageReplyMarkup: mockEditMarkup,
}));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

const { syncPaymentMessagesAfterDecision } = await import('@/lib/telegram-payment-sync');

const TOKEN = 'sync-bot-token';
const REFS = { telegramMessages: [{ chatId: 100, messageId: 10 }, { chatId: 999, messageId: 555 }] };

beforeEach(() => {
        vi.clearAllMocks();
        mockGetToken.mockResolvedValue(TOKEN);
        mockEditText.mockResolvedValue(undefined);
        mockEditMarkup.mockResolvedValue(undefined);
});

describe('syncPaymentMessagesAfterDecision', () => {
        it('no bot token → early return: no DB read, zero Telegram calls', async () => {
                mockGetToken.mockResolvedValue(null);

                await syncPaymentMessagesAfterDecision(55, 'verified');

                expect(mockFindUnique).not.toHaveBeenCalled();
                expect(mockEditText).not.toHaveBeenCalled();
                expect(mockEditMarkup).not.toHaveBeenCalled();
        });

        it('payment without stored telegramMessages → nothing edited', async () => {
                mockFindUnique.mockResolvedValue({ metadata: {} });

                await syncPaymentMessagesAfterDecision(55, 'cancelled');

                expect(mockEditText).not.toHaveBeenCalled();
                expect(mockEditMarkup).not.toHaveBeenCalled();
        });

        it('verified decision → every stored copy gets the approval text + keyboard stripped', async () => {
                mockFindUnique.mockResolvedValue({ metadata: REFS });

                await syncPaymentMessagesAfterDecision(55, 'verified', { source: 'panel' });

                for (const ref of REFS.telegramMessages) {
                        expect(mockEditText).toHaveBeenCalledWith(
                                TOKEN,
                                ref.chatId,
                                ref.messageId,
                                '✅ تم التفعيل والموافقة بواسطة المشرف (من لوحة الإدارة)'
                        );
                        expect(mockEditMarkup).toHaveBeenCalledWith(TOKEN, ref.chatId, ref.messageId);
                }
                expect(mockEditText).toHaveBeenCalledTimes(2);
                expect(mockEditMarkup).toHaveBeenCalledTimes(2);
        });

        it('cancelled decision → the rejection text (no panel suffix when source is telegram)', async () => {
                mockFindUnique.mockResolvedValue({ metadata: REFS });

                await syncPaymentMessagesAfterDecision(55, 'cancelled', { source: 'telegram' });

                expect(mockEditText).toHaveBeenCalledWith(
                        TOKEN,
                        999,
                        555,
                        '❌ تم رفض الطلب بواسطة المشرف'
                );
        });

        it('DB read failure → swallowed + logged, never throws', async () => {
                mockFindUnique.mockRejectedValue(new Error('db down'));

                await expect(syncPaymentMessagesAfterDecision(55, 'verified')).resolves.toBeUndefined();

                expect(mockLogError).toHaveBeenCalledWith(
                        '[telegram-payment-sync] failed',
                        expect.objectContaining({ paymentId: 55, decision: 'verified' })
                );
        });

        it('a rejecting edit is swallowed too — the resolved decision must never fail', async () => {
                mockFindUnique.mockResolvedValue({ metadata: REFS });
                mockEditText.mockRejectedValue(new Error('telegram hiccup'));

                await expect(syncPaymentMessagesAfterDecision(55, 'verified')).resolves.toBeUndefined();

                expect(mockLogError).toHaveBeenCalled();
        });
});

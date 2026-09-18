import { prisma } from '@/lib/db';
import { getDecryptedBotToken } from '@/lib/config';
import { editMessageReplyMarkup, editMessageText } from '@/lib/telegram-api';
import { error as logError } from '@/lib/logger';

/**
 * r116 — لماذا هذا الملف موجود:
 *
 * الموافقة/الرفض كان لهما مساران: أزرار تليجرام (الويبهوك) ولوحة الأدمن.
 * مسار الويبهوك وحده كان يجرّد الأزرار من نسخ رسالة الموافقة المسجّلة في
 * metadata.telegramMessages — أما الحسم من لوحة الإدمن فلم يلمس تليجرام
 * إطلاقًا، فظلت كل الرسائل المرسلة لأدمن/قنوات متعددة تحمل أزرارًا حية.
 * أي ضغطة لاحقة على زر «معلّق» هكذا تفجّر «تمت معالجة هذا الطلب مسبقاً»
 * كخطأ مريب رغم أن الطلب محسوم فعلًا — هذا هو التقرير الذي وصل من المالك.
 *
 * هذه الدالة تُستدعى بعد أي حسم ناجح من أي مسار (اللوحة اليوم، ومسار
 * الويبهوك عبر منطقه الخاص) فتزامن كل النسخ المسجلة: نص نهائي + تجريد
 * الأزرار. best-effort بالكامل: أي فشل يُسجَّل ولا يُفشل الحسم أبدًا
 * (الدفع مُثبَّت في القاعدة قبل أي استدعاء تليجرام).
 */
export async function syncPaymentMessagesAfterDecision(
        paymentId: number,
        decision: 'verified' | 'cancelled',
        opts?: { source?: 'panel' | 'telegram' }
): Promise<void> {
        try {
                const token = await getDecryptedBotToken();
                if (!token) return;

                const payment = await prisma.subscriptionPayment.findUnique({
                        where: { id: paymentId },
                        select: { metadata: true },
                });
                const meta = payment?.metadata as {
                        telegramMessages?: { chatId: number; messageId: number }[];
                } | null;
                if (!meta?.telegramMessages?.length) return;

                const sourceLabel = opts?.source === 'panel' ? ' (من لوحة الإدارة)' : '';
                const finalText =
                        decision === 'verified'
                                ? `✅ تم التفعيل والموافقة بواسطة المشرف${sourceLabel}`
                                : `❌ تم رفض الطلب بواسطة المشرف${sourceLabel}`;

                // كل النسخ على التوازي (الاستدعاءات نفسها لا ترمي استثناءات
                // بعد تحصين apiCall — r116)؛ لكل نسخة: نص جديد ثم تجريد الأزرار،
                // فلا تبقى أي رسالة قابلة للضغط بعد الحسم.
                await Promise.all(
                        meta.telegramMessages.map(async (ref) => {
                                await editMessageText(token, ref.chatId, ref.messageId, finalText);
                                await editMessageReplyMarkup(token, ref.chatId, ref.messageId);
                        })
                );
        } catch (e) {
                logError('[telegram-payment-sync] failed', {
                        paymentId,
                        decision,
                        error: e instanceof Error ? e.message : String(e),
                });
        }
}

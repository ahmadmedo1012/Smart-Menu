import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requirePermission } from '@/lib/auth';

// round94-3a (تقرير B LOW-5 §6) — قرار موثّق على تعارض التقرير مع الكود:
// التقرير اقترح requireAdmin/EDIT_SETTINGS كاملًا باعتبار «القارئ الحقيقي
// إعدادات الأدمن»، لكن الكود يقول غير ذلك: useConfig (hooks/useConfig.ts:46)
// يقرأ هذا المسار من PaymentDialog (subscribe → PaymentSection) في رحلة
// الاشتراك والدفع — أرقام محافظ التحويل وتفاصيل الحساب البنكي
// (bank_transfer_*) لا بديل ثابت لها في الواجهة، فحجبها عن المشتركين
// يُفرغ تعليمات الدفع (مسار المال). القرار:
//   * حامل EDIT_SETTINGS (قارئ لوحة الإعدادات — عبر /api/admin/config)
//     يرى كل الإعدادات غير السرية كما قبل.
//   * أي جلسة أخرى (owner/USER مشترك) ترى فقط مفاتيح قنوات الدفع التي
//     يعرضها حوار الدفع أصلًا لكل دافع؛ ما عداها (رسوم، قواعد سحب ...)
//     صار للأدمن فقط — وهذا ما سدّه التقرير (USER لم يعد يعدّد الداخلية).
//   * المجهول يبقى 401 (كما كان التعليق الأصلي).
const PAYMENT_CHANNEL_KEYS = [
        'balance_transfer_phone_1',
        'balance_transfer_phone_2',
        'bank_transfer_bank_name',
        'bank_transfer_account_number',
        'bank_transfer_iban',
] as const;

export async function GET(request: NextRequest) {
        try {
                const auth = await requirePermission('EDIT_SETTINGS');
                // 401 فقط لغياب الجلسة — 403 يعني جلسة مصرّح لها برؤية قنوات الدفع
                if (!auth.authorized && auth.status === 401) return error('غير مصرح', 401);

                const { searchParams } = new URL(request.url);
                const key = searchParams.get('key');

                if (key) {
                        // round94-3a: مفتاح غير قناة دفع = داخلي — للأدمن فقط
                        if (!auth.authorized && !(PAYMENT_CHANNEL_KEYS as readonly string[]).includes(key)) {
                                return error('لا تملك الصلاحية', 403);
                        }
                        const config = await prisma.systemConfig.findUnique({ where: { key } });
                        if (!config || config.isSecret) return error('Not found', 404);
                        return success({ key: config.key, value: config.value });
                }

                if (auth.authorized) {
                        const configs = await prisma.systemConfig.findMany({
                                where: { isSecret: false },
                                select: { key: true, value: true, category: true },
                        });
                        return success(configs);
                }

                // غير حاملي EDIT_SETTINGS: قنوات الدفع فقط (شكل الاستجابة نفسه)
                const configs = await prisma.systemConfig.findMany({
                        where: { isSecret: false, key: { in: [...PAYMENT_CHANNEL_KEYS] } },
                        select: { key: true, value: true, category: true },
                });
                return success(configs);
        } catch (e) {
                return handleError(e);
        }
}

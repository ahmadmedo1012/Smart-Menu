import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { timingSafeEqualStrings } from '@/lib/secure-compare';
import { parseCallbackData, resolveDecision } from '@/lib/telegram-callback';
import { prisma } from '@/lib/db';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { error as logError, warn as logWarn, info as logInfo } from '@/lib/logger';
import { getAdminTelegramIds } from '@/lib/telegram-admin';
import { isPaymentSelfApproval, resolveSubscriptionPayment } from '@/lib/subscription-decisions';
import { getHmacKey } from '@/lib/keys';
import { getDecryptedBotToken } from '@/lib/config';
import { editMessageReplyMarkup, editMessageText, answerCallbackQuery, sendPlainMessage } from '@/lib/telegram-api';
import { getClientIp } from '@/lib/client-ip';

// Constant-time string comparison — length mismatch short-circuits (never
// leaks the expected length through timing) without throwing like
// timingSafeEqual would on unequal buffer sizes.


// Telegram can deliver bursts (callback storms); 120/min with a 30s window
// tolerates the security test's 20-request burst while still capping abuse.
const webhookDbLimiter = createDbRateLimiter({ windowMs: 30_000, max: 120 });

interface TelegramUpdate {
        message?: {
                text?: string;
                chat?: { id: number; username?: string; type?: string };
        };
        callback_query?: {
                id: string;
                from: { id: number };
                message?: { chat: { id: number }; message_id: number };
                data?: string;
        };
}

async function getBotToken(): Promise<string | null> {
        return getDecryptedBotToken();
}

async function handleCallbackQuery(
        cq: NonNullable<TelegramUpdate['callback_query']>
): Promise<Response> {
        const botToken = await getBotToken();
        if (!botToken) {
                logError('[webhook] no bot token configured');
                return new Response('OK', { status: 200 });
        }

        // Gate 1: only allowlisted admin Telegram IDs may act
        const adminIds = await getAdminTelegramIds();
        if (!adminIds.includes(cq.from.id)) {
                logWarn('[webhook] unauthorized callback attempt', {
                        fromId: cq.from.id,
                        callbackData: cq.data,
                        adminCount: adminIds.length,
                });
                await answerCallbackQuery(
                        botToken,
                        cq.id,
                        'عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.',
                        true
                );
                return new Response('OK', { status: 200 });
        }

        // round86-D4: parsing + decision logic via the shared (and now
        // unit-tested) helpers in lib/telegram-callback
        const callbackData = cq.data ?? '';
        const parsed = parseCallbackData(callbackData);
        if (!parsed) {
                await answerCallbackQuery(botToken, cq.id, 'بيانات غير صالحة', true);
                return new Response('OK', { status: 200 });
        }
        const { action, paymentId } = parsed;

        const decision = resolveDecision(action);
        if (!decision) {
                await answerCallbackQuery(botToken, cq.id, 'إجراء غير معروف', true);
                return new Response('OK', { status: 200 });
        }

        // r118-A2-P2: self-approval guard — an approver whose Telegram id
        // matches the payer's linked chat cannot resolve their own payment
        // (closes the self-add-approver → self-approve escalation path).
        if (await isPaymentSelfApproval(paymentId, cq.from.id)) {
                logWarn('[webhook] self-approval attempt blocked', {
                        fromId: cq.from.id,
                        paymentId,
                });
                await answerCallbackQuery(
                        botToken,
                        cq.id,
                        'لا يمكنك البت في طلب دفع خاص بحسابك.',
                        true
                );
                return new Response('OK', { status: 200 });
        }

        const result = await resolveSubscriptionPayment(paymentId, decision);

        // ── r116: compute the admin-facing outcome BEFORE any Telegram edit ──
        // ثلاث حالات بدل اثنتين:
        //  1) نجاح — التوست والنص كما كانا.
        //  2) إعادة idempotent (alreadyStatus يطابق القرار: ضغطة ثانية على موافقة
        //     ناجحة، أو إعادة تسليم ويبهوك) — توست ودّي «تمت الموافقة مسبقاً»
        //     وليس خطأً مريبًا؛ هذا هو مصدر بلاغ «تمت معالجة هذا الطلب مسبقاً».
        //  3) تعارض (alreadyStatus عكس القرار: طلب موافق عليه والآن رفض أو
        //     العكس) — تنبيه صريح بحدوث تعارض ولا يمكن تنفيذ عكس المحسوم.
        // فشل قابل للإعادة (سقف خطة/رابط محجوز/خطأ عابر) — التوست بالسبب فقط
        // ويبقى لوح الأزرار حيًا كي يستطيع المشرف الرفض أو إعادة المحاولة.
        const statusLine: string =
                decision === 'verified'
                        ? '\n\n⚡ [الحالة: تم التفعيل والموافقة بواسطة المشرف]'
                        : '\n\n⚠️ [الحالة: تم رفض الطلب وإبلاغ العميل]';

        let toastText: string;
        let showAlert = false;
        let finalText: string | null = null; // null → لا تُلمَس الرسالة (فشل قابل للإعادة)

        if (result.ok) {
                toastText = decision === 'verified' ? '✅ تم التفعيل والموافقة' : '❌ تم رفض الطلب';
                finalText = `${decision === 'verified' ? '✅ تم التفعيل' : '❌ تم الرفض'}${statusLine}`;
        } else if (result.alreadyStatus === 'verified') {
                if (decision === 'verified') {
                        toastText = '✅ تمت الموافقة على هذا الطلب مسبقاً';
                        finalText = `✅ تم التفعيل والموافقة مسبقاً${statusLine}`;
                } else {
                        toastText = '⚠️ هذا الطلب تمت الموافقة عليه مسبقاً — لا يمكن رفضه';
                        showAlert = true;
                        finalText = '⚠️ هذا الطلب تمت الموافقة عليه مسبقاً — لا يمكن رفضه';
                }
        } else if (result.alreadyStatus === 'cancelled') {
                if (decision === 'cancelled') {
                        toastText = '✅ تم رفض هذا الطلب مسبقاً';
                        finalText = `❌ تم رفض هذا الطلب مسبقاً${statusLine}`;
                } else {
                        toastText = '⚠️ هذا الطلب تم رفضه مسبقاً — لا يمكن الموافقة عليه';
                        showAlert = true;
                        finalText = '⚠️ هذا الطلب تم رفضه مسبقاً — لا يمكن الموافقة عليه';
                }
        } else if (result.reason === 'الطلب غير موجود') {
                toastText = result.reason;
                showAlert = true;
                finalText = '⚠️ الطلب غير موجود';
        } else {
                // فشل قابل للإعادة (سقف المطاعم/رابط محجوز/خطأ) — الأزرار تبقى حية
                toastText = result.reason;
                showAlert = true;
        }

        // r116: التوست أولًا — قبل أي استدعاء تليجرام بطيء. كان answerCallbackQuery
        // آخر استدعاء بعد المعاملة وتعديلين، فأي بطء/فشل شبكي يتجاوز نافذة
        // تيليجرام (~10ث) يترك المشرف بلا رد فيضغط ثانيةً ويصطدم بـ«تمت معالجة
        // هذا الطلب مسبقاً» رغم نجاح أول ضغطة. الاستدعاءات نفسها لم تعد ترمي
        // استثناءات شبكة (تحصين apiCall — r116) فلا مسار يتخطى التوست.
        await answerCallbackQuery(botToken, cq.id, toastText, showAlert);

        if (finalText !== null && cq.message?.chat?.id && cq.message?.message_id) {
                await editMessageText(botToken, cq.message.chat.id, cq.message.message_id, finalText);
                await editMessageReplyMarkup(botToken, cq.message.chat.id, cq.message.message_id);
        }

        // Clean up any other keyboard instances stored in payment metadata
        // (result.ok يضمن finalText معيَّن — الشرط المزدوج يمنح TS تصفية النوع)
        if (result.ok && finalText) {
                try {
                        const payment = await prisma.subscriptionPayment.findUnique({
                                where: { id: paymentId },
                                select: { metadata: true },
                        });
                        const meta = payment?.metadata as {
                                telegramMessages?: { chatId: number; messageId: number }[];
                        } | null;
                        if (meta?.telegramMessages) {
                                for (const ref of meta.telegramMessages) {
                                        // Skip the chat we already cleaned up
                                        if (cq.message?.chat?.id === ref.chatId && cq.message?.message_id === ref.messageId)
                                                continue;
                                        // r116: النسخ الأخرى تحمل النص النهائي أيضًا — ليس فقط
                                        // تجريد الأزرار — فتتطابق كل النسخ على الحالة المحسومة.
                                        await editMessageText(botToken, ref.chatId, ref.messageId, finalText);
                                        await editMessageReplyMarkup(botToken, ref.chatId, ref.messageId);
                                }
                        }
                } catch (e) {
                        // Best-effort cleanup — non-critical
                        logError('[webhook] keyboard cleanup error:', { error: String(e) });
                }
        }

        return new Response('OK', { status: 200 });
}

export async function POST(request: NextRequest) {
        // Gate 0: verify request came from Telegram via shared secret BEFORE rate
        // limiting — bad-secret probes must not burn the rate budget and must fail
        // fast (also keeps 4xx tests deterministic).
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

        if (!expectedSecret) {
                // Fail-closed (round81): an attacker must not learn the endpoint's
                // configuration state through a distinct 503 — with no secret
                // configured, no incoming token can ever match, so every request
                // gets the same opaque 403 as a bad-token probe. Also keeps the
                // security suite's rejection tests deterministic in CI, where the
                // webhook secret env is intentionally absent.
                logWarn('[webhook] TELEGRAM_WEBHOOK_SECRET not set — rejecting fail-closed');
                return new Response('Forbidden', { status: 403 });
        }

        const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
        if (!incomingSecret || !timingSafeEqualStrings(incomingSecret, expectedSecret)) {
                return new Response('Forbidden', { status: 403 });
        }

        // Gate 1: rate limit only verified Telegram traffic.
        const ip = getClientIp(request); // round91-D1: unified extraction
        const { success: rlAllowed } = await webhookDbLimiter.check(`webhook:${ip}`);
        if (!rlAllowed) return new Response('Too Many Requests', { status: 429 });

        // Telegram's setWebhook call and its URL-check probe send non-JSON bodies —
        // ack them so Telegram doesn't retry and log noise stops.
        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
                return new Response('OK', { status: 200 });
        }

        try {
                const update: TelegramUpdate = await request.json();

                // Handle callback_query (interactive button tap)
                if (update.callback_query) {
                        // round92-wave3-1: await داخل try — أي استثناء من معالج الأزرار
                        // يلتقطه catch العام أسفل الدالة (logError + 200 «OK») بدل أن
                        // يتسرب كوعد مرفوض غير معالج فيصير 500 أمام تيليجرام (إعادة
                        // محاولة بلا نهاية). نفس نمط حماية مسار الرسائل أعلاه.
                        return await handleCallbackQuery(update.callback_query);
                }

                // Log all incoming messages for debugging
                const chatId = update.message?.chat?.id;
                const username = update.message?.chat?.username;
                const chatType = update.message?.chat?.type;
                if (chatId) {
                        logInfo('[webhook] msg', { chatId, chatType, username });
                }

                // Handle plain /start — tell user their Telegram ID so admins can whitelist it
                const text = update.message?.text ?? '';
                if (text === '/start') {
                        const startBotToken = await getBotToken();
                        const chatIdNum = update.message?.chat?.id;
                        if (chatIdNum && startBotToken) {
                                const msg = `مرحباً! 👋\n\nمعرف التليجرام الخاص بك:\n\`${chatIdNum}\`\n\nإذا كنت بحاجة لإضافة هذا المعرف كموافٍ على الاشتراكات، يرجى التواصل مع مدير النظام.\n\nلربط حسابك بالمنصة (/start verify_الرمز_الخاص_بك).`;
                                // r117-F2: كان fetch خامًا بلا مهلة — تعليق تيليجرام كان
                                // يعلّق الويبهوك حتى مهلة الدالة؛ الآن عبر sendPlainMessage
                                // المحصّنة (مهلة 10ث + لا رمي أبدًا).
                                await sendPlainMessage(startBotToken, chatIdNum, msg, { parseMode: 'Markdown' });
                        }
                        return new Response('OK', { status: 200 });
                }

                // Handle /start verify_<token> (account linking)
                if (!chatId || !text.startsWith('/start verify_')) {
                        return new Response('OK', { status: 200 });
                }

                const token = text.slice('/start verify_'.length);

                // Decode and validate HMAC token (same format as verify/route.ts)
                let decoded: string;
                try {
                        decoded = Buffer.from(token, 'base64url').toString();
                } catch {
                        return new Response('OK', { status: 200 });
                }
                const dotIdx = decoded.lastIndexOf('.');
                if (dotIdx === -1) return new Response('OK', { status: 200 });

                const payload = decoded.slice(0, dotIdx);
                const sig = decoded.slice(dotIdx + 1);
                let hmacKey: Buffer;
                try {
                        hmacKey = Buffer.from(getHmacKey());
                } catch {
                        return new Response('OK', { status: 200 });
                }
                const expectedSig = createHmac('sha256', hmacKey).update(payload).digest('hex');
                // Constant-time compare — sig is attacker-controlled, so `!==` would leak
                // byte-by-byte prefix match through response timing (recoverable over the
                // network for short tokens).
                if (!timingSafeEqualStrings(sig, expectedSig)) return new Response('OK', { status: 200 });

                let data: { userId: number; exp: number };
                try {
                        data = JSON.parse(payload);
                } catch {
                        return new Response('OK', { status: 200 });
                }
                if (!data.userId || data.exp < Math.floor(Date.now() / 1000)) {
                        return new Response('OK', { status: 200 });
                }

                // Anti-replay: mark token as spent. Atomic create-or-die prevents race.
                const tokenHash = createHmac('sha256', hmacKey).update(token).digest('hex');
                try {
                        await prisma.rateLimitEntry.create({
                                data: { key: `link-token:${tokenHash}`, windowEnd: new Date(data.exp * 1000) },
                        });
                } catch {
                        // Unique constraint = token already spent by concurrent request
                        return new Response('OK', { status: 200 });
                }

                const user = await prisma.user.findUnique({ where: { id: data.userId } });
                if (!user) return new Response('OK', { status: 200 });

                await prisma.user.update({
                        where: { id: data.userId },
                        data: {
                                telegramChatId: String(chatId),
                                telegramUsername: username ?? null,
                                telegramLinkedAt: new Date(),
                        },
                });

                // Send confirmation to the user via Telegram
                // r118-A1-F1: the LAST raw fetch in the webhook — the /start
                // handler was hardened in r117-F2 but this verify_ confirmation
                // path kept an unbounded fetch that could pin the whole webhook.
                const botToken = await getBotToken();
                if (botToken) {
                        await sendPlainMessage(botToken, chatId, 'تم ربط حسابك بنجاح ✅');
                }

                return new Response('OK', { status: 200 });
        } catch (e) {
                logError('webhook error:', { error: String(e) });
                return new Response('OK', { status: 200 });
        }
}

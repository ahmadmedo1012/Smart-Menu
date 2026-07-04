import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";

const claimSchema = z.object({
  planId: z.number().int().positive(),
  phone: z.string().min(7, "رقم الهاتف مطلوب"),
  provider: z.string().min(1, "مزود الخدمة مطلوب"),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  tempRestaurantName: z.string().min(1, "اسم المطعم مطلوب"),
  tempRestaurantSlug: z
    .string()
    .min(3, "الرابط يجب أن يكون 3 أحرف على الأقل")
    .regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط"),
});

const claimLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { success: allowed } = claimLimiter.check(`claim:${auth.userId}`);
    if (!allowed) {
      return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);
    }

    const parsed = claimSchema.safeParse(await request.json());
    if (!parsed.success) {
      return error(parsed.error.issues[0].message, 400);
    }
    const { planId, phone, provider, amount, tempRestaurantName, tempRestaurantSlug } = parsed.data;

    // Validate plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, nameAr: true, isActive: true },
    });
    if (!plan || !plan.isActive) return error("الباقة غير موجودة أو غير نشطة", 400);

    // Check slug uniqueness
    const slugExists = await prisma.restaurant.findUnique({ where: { slug: tempRestaurantSlug } });
    if (slugExists) return error("رابط المطعم مستخدم مسبقاً", 409);

    // Check user has no pending payment
    const pendingPayment = await prisma.subscriptionPayment.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (pendingPayment) return error("لديك طلب دفع معلق بالفعل", 400);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: auth.userId,
        phone,
        amount,
        provider,
        planId,
        planName: plan.name,
        status: "pending",
        metadata: {
          tempRestaurantName,
          tempRestaurantSlug,
          telegramMessages: [],
        },
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Interactive keyboard sent below to admin allowlist only — plain-text
    // notifyEvent deliberately omitted here to avoid leaking payment data
    // to non-admin Telegram-linked users. The keyboard message carries the
    // same info plus approval actions.

    // Send interactive inline keyboard to admin allowlist
    const config = await prisma.telegramConfig.findFirst();
    const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      // Resolve target chat IDs: admin allowlist (env) + broadcast targets (DB)
      const adminIds = getAdminTelegramIds();
      const chatIds = new Set<string>();

      // 1. Admin allowlist — always include raw IDs; Telegram rejects unstarted chats silently
      if (adminIds.length > 0) {
        for (const id of adminIds) {
          chatIds.add(String(id));
        }
      }

      // 2. Broadcast targets (channels/groups from admin panel)
      const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
        where: { isActive: true },
        select: { chatId: true },
      });
      for (const t of broadcastTargets) chatIds.add(t.chatId);

      if (chatIds.size > 0) {

        const msgParts = [
          `🆕 *طلب اشتراك جديد* #${payment.id}`,
          `• المستخدم: #${auth.userId}`,
          `• الباقة: ${plan.name}`,
          `• الرقم: ${phone}`,
          `• المبلغ: ${amount} د.ل`,
        ];
        const msg = msgParts.join("\n");

        const telegramMessages: { chatId: number; messageId: number }[] = [];

        for (const chatId of chatIds) {
          const sent = await sendMessageWithKeyboard(botToken, chatId, msg, [
            [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${payment.id}` }],
            [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
          ], { parseMode: "Markdown" });
          if (sent) {
            telegramMessages.push({ chatId: sent.chat.id, messageId: sent.message_id });
          }
        }

        // Store message refs in payment metadata for post-resolution cleanup
        if (telegramMessages.length > 0) {
          await prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data: {
              metadata: {
                tempRestaurantName,
                tempRestaurantSlug,
                telegramMessages,
              },
            },
          });
        }
      }
    }

    return success(payment, 201);
  } catch (e) {
    return handleError(e);
  }
}

// ponytail: single-instance rate limiter; upgrade to DB-backed if scaling
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { sendTelegramNotification } from "@/lib/telegram";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";
import { z } from "zod";

const subscriptionLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const createPaymentSchema = z.object({
  phone: z.string().min(1),
  amount: z.number().positive(),
  provider: z.string().min(1),
  planId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = subscriptionLimiter.check(`sub:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const { phone, amount, provider, planId } = createPaymentSchema.parse(await request.json());

    // Fetch plan name for record
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { nameAr: true },
    });

    const payment = await prisma.subscriptionPayment.create({
      data: {
        phone: String(phone),
        amount,
        provider: String(provider),
        planId,
        planName: plan?.nameAr ?? "",
        status: "pending",
      },
    });

    // Notify via broadcast (plain text, for historical channels)
    sendTelegramNotification(
      `*طلب اشتراك جديد*\n` +
      `• الباقة: ${plan?.nameAr ?? "غير معروف"}\n` +
      `• الهاتف: ${String(phone)}\n` +
      `• المبلغ: ${String(amount)} د.ل\n` +
      `• مزود: ${String(provider)}\n` +
      `• الحالة: قيد الانتظار`,
      { parseMode: "Markdown" }
    );

    // Also send interactive keyboard to admin IDs and broadcast targets
    try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || (await prisma.telegramConfig.findFirst())?.botToken;
    if (botToken) {
      const adminIds = getAdminTelegramIds();
      const chatIds = new Set<string>();

      for (const id of adminIds) chatIds.add(String(id));

      const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
        where: { isActive: true },
        select: { chatId: true },
      });
      for (const t of broadcastTargets) chatIds.add(t.chatId);

      if (chatIds.size > 0) {
        const msg = `🆕 *طلب اشتراك جديد* #${payment.id}\n• الباقة: ${plan?.nameAr ?? "غير معروف"}\n• الهاتف: ${String(phone)}\n• المبلغ: ${String(amount)} د.ل`;
        for (const chatId of chatIds) {
          await sendMessageWithKeyboard(botToken, chatId, msg, [
            [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${payment.id}` }],
            [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
          ], { parseMode: "Markdown" });
        }
      }
    }
    } catch (keyboardErr) {
      console.error("[subscriptions] keyboard error:", keyboardErr);
    }

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";
import { z } from "zod";

const subscriptionLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const createPaymentSchema = z.object({
  phone: z.string().min(1),
  amount: z.number().positive(),
  provider: z.enum(["libyana", "madar"]),
  planId: z.number().int().positive(),
  tempUsername: z.string().min(3).optional(),
  tempRestaurantName: z.string().min(1).optional(),
  tempRestaurantSlug: z.string().min(3).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = await subscriptionLimiter.check(`sub:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsed = createPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);
    const { phone, amount, provider, planId, tempUsername, tempRestaurantName, tempRestaurantSlug } = parsed.data;

    // Pre-flight uniqueness checks (defense in depth alongside client-side validation)
    if (tempUsername) {
      const tempUser = await prisma.user.findUnique({ where: { username: tempUsername }, select: { id: true } });
      // Allow if tempUsername matches the currently authenticated user (already registered before payment)
      if (tempUser && tempUser.id !== auth.userId) return error("اسم المستخدم مستخدم بالفعل", 409);
    }
    if (tempRestaurantSlug) {
      const existingSlug = await prisma.restaurant.findUnique({ where: { slug: tempRestaurantSlug } });
      if (existingSlug) return error("الرابط محجوز مسبقاً", 409);
      const slugPending = await prisma.subscriptionPayment.findFirst({
        where: { status: "pending", metadata: { path: ["tempRestaurantSlug"], equals: tempRestaurantSlug } },
      });
      if (slugPending) return error("الرابط محجوز بطلب دفع معلق", 409);
    }

    // Check no pending payment for this user
    const pendingPayment = await prisma.subscriptionPayment.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (pendingPayment) return error("لديك طلب دفع معلق بالفعل", 400);

    // Server-side price validation — never trust client-reported amount
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
      select: { nameAr: true, price: true },
    });
    if (!plan) return error("الباقة غير صالحة", 400);
    if (Number(amount) !== Number(plan.price)) {
      return error("المبلغ لا يطابق سعر الباقة", 400);
    }

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: auth.userId,
        phone: String(phone),
        amount: plan.price,
        provider: provider as "libyana" | "madar",
        planId,
        planName: plan?.nameAr ?? "",
        status: "pending",
        metadata: {
          tempUsername,
          tempRestaurantName,
          tempRestaurantSlug,
          telegramMessages: [],
        },
      },
    });

    // Send interactive keyboard to admins (same as existing pattern)
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN || (await prisma.telegramConfig.findFirst())?.botToken;
      if (botToken) {
        const adminIds = await getAdminTelegramIds();
        const chatIds = new Set<string>();
        for (const id of adminIds) chatIds.add(String(id));
        const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
          where: { isActive: true },
          select: { chatId: true },
        });
        for (const t of broadcastTargets) chatIds.add(t.chatId);
        if (chatIds.size === 0) {
          const fallback = process.env.TELEGRAM_CHAT_ID;
          if (fallback) chatIds.add(fallback);
          const groupIds = (process.env.TELEGRAM_GROUP_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
          for (const gid of groupIds) chatIds.add(gid);
        }
        if (chatIds.size > 0) {
          const msg = `🔗 *طلب اشتراك جديد* #${payment.id}\n• المستخدم: #${auth.userId}\n• الباقة: ${plan?.nameAr ?? "غير معروف"}\n• الهاتف: ${String(phone)}\n• المبلغ: ${String(amount)} د.ل`;
          for (const chatId of chatIds) {
            try {
              await sendMessageWithKeyboard(botToken, chatId, msg, [
                [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${payment.id}` }],
                [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
              ], { parseMode: "Markdown" });
            } catch (singleErr) {
              console.error("[subscriptions] send to", chatId, "failed:", singleErr);
            }
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

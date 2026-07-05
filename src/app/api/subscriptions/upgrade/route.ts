import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";
import { z } from "zod";

const upgradeSchema = z.object({
  planId: z.number().int().positive(),
  phone: z.string().min(1),
  provider: z.enum(["libyana", "madar"]),
  amount: z.number().positive(),
  upgradeRestaurantId: z.number().int().positive(),
});

const upgradeLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = upgradeLimiter.check(`upgrade:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsed = upgradeSchema.safeParse(await request.json());
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);
    const { planId, phone, provider, amount, upgradeRestaurantId } = parsed.data;

    // Validate plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, nameAr: true, isActive: true, price: true },
    });
    if (!plan || !plan.isActive) return error("الباقة غير موجودة أو غير نشطة", 400);

    // Validate restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: upgradeRestaurantId },
      select: { id: true, planId: true },
    });
    if (!restaurant) return error("المطعم غير موجود", 404);

    // Check user owns this restaurant
    if (auth.restaurantId !== upgradeRestaurantId && auth.role !== "super_admin" && auth.role !== "admin") {
      return error("لا تملك صلاحية ترقية هذا المطعم", 403);
    }

    // Check restaurant is on free plan
    if (restaurant.planId !== null) {
      return error("صاحب المطعم مشترك حالياً في خطة مدفوعة", 400);
    }

    // Check no pending upgrade for this restaurant
    const pending = await prisma.subscriptionPayment.findFirst({
      where: {
        status: "pending",
        metadata: { path: ["upgradeRestaurantId"], equals: upgradeRestaurantId },
      },
    });
    if (pending) return error("لديك طلب ترقية معلق بالفعل لهذا المطعم", 400);

    // Check user has no pending payment
    const userPending = await prisma.subscriptionPayment.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (userPending) return error("لديك طلب دفع معلق بالفعل", 400);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: auth.userId,
        phone: String(phone),
        amount,
        provider: provider as "libyana" | "madar",
        planId,
        planName: plan.nameAr ?? "",
        status: "pending",
        metadata: {
          upgradeRestaurantId,
          currentPlanId: restaurant.planId,
        },
      },
    });

    // Send interactive keyboard to admins
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
        if (chatIds.size === 0) {
          const fallback = process.env.TELEGRAM_CHAT_ID;
          if (fallback) chatIds.add(fallback);
          const groupIds = (process.env.TELEGRAM_GROUP_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
          for (const gid of groupIds) chatIds.add(gid);
        }
        if (chatIds.size > 0) {
          const msg = [
            `⬆️ *طلب ترقية اشتراك* #${payment.id}`,
            `• المستخدم: #${auth.userId}`,
            `• المطعم: #${upgradeRestaurantId}`,
            `• الباقة: ${plan.nameAr}`,
            `• الهاتف: ${String(phone)}`,
            `• المبلغ: ${String(amount)} د.ل`,
          ].join("\n");
          for (const chatId of chatIds) {
            try {
              await sendMessageWithKeyboard(botToken, chatId, msg, [
                [{ text: "🟢 موافقة على الترقية", callbackData: `sub_app:${payment.id}` }],
                [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
              ], { parseMode: "Markdown" });
            } catch (singleErr) {
              console.error("[upgrade] send to", chatId, "failed:", singleErr);
            }
          }
        }
      }
    } catch (keyboardErr) {
      console.error("[upgrade] keyboard error:", keyboardErr);
    }

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}

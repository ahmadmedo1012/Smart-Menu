import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { notifyEvent } from "@/lib/telegram";
import { createRateLimiter } from "@/lib/rate-limit";

const subscriptionLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = subscriptionLimiter.check(`sub:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const body = await request.json();
    const { phone, amount, provider, planId } = body;

    if (!phone || !amount || !provider || !planId) {
      return error("جميع الحقول مطلوبة: phone, amount, provider, planId", 400);
    }

    // Fetch plan name for record
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: Number(planId) },
      select: { nameAr: true },
    });

    const payment = await prisma.subscriptionPayment.create({
      data: {
        phone: String(phone),
        amount: Number(amount),
        provider: String(provider),
        planId: Number(planId),
        planName: plan?.nameAr ?? "",
        status: "pending",
      },
    });

    // Notify via Telegram
    notifyEvent("new_subscription", {
      plan: plan?.nameAr ?? "غير معروف",
      phone: String(phone),
      amount: String(amount),
      provider: String(provider),
    }).catch(() => {});

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}

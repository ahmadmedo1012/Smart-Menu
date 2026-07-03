import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { sendTelegramNotification } from "@/lib/telegram";
import { createRateLimiter } from "@/lib/rate-limit";
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

    // Notify admin directly (bypasses event filter config)
    sendTelegramNotification(
      `*طلب اشتراك جديد*\n` +
      `• الباقة: ${plan?.nameAr ?? "غير معروف"}\n` +
      `• الهاتف: ${String(phone)}\n` +
      `• المبلغ: ${String(amount)} د.ل\n` +
      `• مزود: ${String(provider)}\n` +
      `• الحالة: قيد الانتظار`,
      { parseMode: "Markdown" }
    );

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}

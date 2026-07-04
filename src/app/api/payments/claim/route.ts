import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { notifyEvent } from "@/lib/telegram";

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
        },
      },
      select: { id: true, status: true, createdAt: true },
    });

    await notifyEvent("payment_claimed", {
      userId: auth.userId,
      plan: plan.name,
      tempRestaurantName,
      tempRestaurantSlug,
    });

    return success(payment, 201);
  } catch (e) {
    return handleError(e);
  }
}

// ponytail: single-instance rate limiter; upgrade to DB-backed if scaling

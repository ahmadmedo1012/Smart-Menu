import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const referralSchema = z.object({
  referralCode: z.string().min(1),
  referredPhone: z.string().optional(),
  referredName: z.string().optional(),
});

const referralDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await referralDbLimiter.check(`referral:${ip}`);
    if (!rl.success) return error("طلبات كثيرة — حاول لاحقاً", 429);

    const body = referralSchema.parse(await request.json());
    const { referralCode, referredPhone, referredName } = body;

    const referrerCard = await prisma.loyaltyCard.findUnique({
      where: { referralCode },
    });

    if (!referrerCard) return error("Invalid referral code", 404);

    // Self-referral guard (round-77): reject redeeming your own code via
    // your own phone — normalized digits compare
    if (referredPhone) {
      const normalize = (p: string) => p.replace(/[^\d]/g, "").replace(/^00/, "");
      if (normalize(referredPhone) && normalize(referredPhone) === normalize(referrerCard.customerPhone)) {
        return error("لا يمكنك استخدام كود الإحالة الخاص بك", 400);
      }
    }

    // Enforce referral usage limit (max 10 converted referrals per code)
    const convertedCount = await prisma.referral.count({
      where: { referralCode, status: "converted" },
    });
    const MAX_REFERRAL_USES = 10;
    if (convertedCount >= MAX_REFERRAL_USES) {
      return error("لقد وصل كود الإحالة إلى الحد الأقصى من الاستخدامات", 400);
    }

    const referral = await prisma.referral.create({
      data: {
        referralCode,
        referrerId: referrerCard.id,
        referredPhone: referredPhone ?? "",
        referredName: referredName ?? "",
        status: "pending" as const,
        restaurantId: referrerCard.restaurantId,
      },
    });

    return success(referral, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) return error("code query parameter is required");

    const card = await prisma.loyaltyCard.findUnique({
      where: { referralCode: code },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            description: true,
            themeColor: true,
            whatsapp: true,
            currency: true,
          },
        },
      },
    });

    if (!card) return error("Referral code not found", 404);

    return success({
      referralCode: code,
      referrerName: card.customerName,
      restaurant: card.restaurant,
    });
  } catch (e) {
    return handleError(e);
  }
}

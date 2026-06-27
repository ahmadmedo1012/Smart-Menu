import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";

const loyaltyLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const TIER_THRESHOLDS: Record<string, { min: number; next: string | null }> = {
  bronze: { min: 0, next: "silver" },
  silver: { min: 50, next: "gold" },
  gold: { min: 150, next: "platinum" },
  platinum: { min: 400, next: null },
};

function _computeTier(points: number): string {
  if (points >= 400) return "platinum";
  if (points >= 150) return "gold";
  if (points >= 50) return "silver";
  return "bronze";
}

function getNextTierInfo(currentTier: string) {
  const info = TIER_THRESHOLDS[currentTier];
  if (!info || !info.next) return { nextTier: null as string | null, pointsToNext: 0 };
  const nextMin = TIER_THRESHOLDS[info.next].min;
  return { nextTier: info.next, pointsToNext: nextMin };
}

const PHONE_RE = /^\+?[0-9]{7,15}$/;

const createSchema = z.object({
  customerPhone: z.string().regex(PHONE_RE, "Invalid phone number"),
  customerName: z.string().optional(),
  restaurantId: z.number().int().positive().optional(),
});

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const rateCheck = loyaltyLimiter.check(ip);
    if (!rateCheck.success) return error("Too many requests", 429);

    const body = createSchema.parse(await request.json());
    const { customerPhone, customerName } = body;
    const cookieStore = await cookies();
    const cookieId = cookieStore.get("smart-menu-restaurant")?.value;
    const restaurantId = body.restaurantId ?? (Number(cookieId) || 1);

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return error("المطعم غير موجود", 404);

    let card = await prisma.loyaltyCard.findUnique({
      where: {
        customerPhone_restaurantId: { customerPhone, restaurantId },
      },
    });

    if (!card) {
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (await prisma.loyaltyCard.findUnique({ where: { referralCode } })) {
        referralCode = generateReferralCode();
        attempts++;
        if (attempts > 10) return error("Failed to generate unique referral code", 500);
      }

      card = await prisma.loyaltyCard.create({
        data: {
          customerPhone,
          customerName: customerName ?? "",
          restaurantId,
          referralCode,
        },
      });
    }

    const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

    return success({
      card,
      tier: card.tier,
      nextTier,
      pointsToNext,
      referralUrl: `/loyalty?ref=${card.referralCode}`,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const cookieStore2 = await cookies();
    const restaurantId = Number(searchParams.get("restaurantId")) || Number(cookieStore2.get("smart-menu-restaurant")?.value);
    if (!restaurantId) return error("معرف المطعم مطلوب", 400);
    if (!phone || !PHONE_RE.test(phone)) return error("Invalid phone number", 400);

    const card = await prisma.loyaltyCard.findUnique({
      where: {
        customerPhone_restaurantId: { customerPhone: phone, restaurantId },
      },
    });

    if (!card) return error("Loyalty card not found", 404);

    const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

    return success({
      card,
      tier: card.tier,
      nextTier,
      pointsToNext,
      referralUrl: `/loyalty?ref=${card.referralCode}`,
    });
  } catch (e) {
    return handleError(e);
  }
}

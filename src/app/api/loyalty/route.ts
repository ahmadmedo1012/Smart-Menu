import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { randomBytes } from "crypto";

const TIER_ORDER = ["bronze", "silver", "gold", "platinum"] as const;

const TIER_THRESHOLDS: Record<string, { min: number; next: string | null }> = {
  bronze: { min: 0, next: "silver" },
  silver: { min: 50, next: "gold" },
  gold: { min: 150, next: "platinum" },
  platinum: { min: 400, next: null },
};

function computeTier(points: number): string {
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

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerPhone, customerName } = body;
    const cookieId = request.cookies.get("smart-menu-restaurant")?.value;
    const restaurantId = body.restaurantId ?? (Number(cookieId) || 1);

    if (!customerPhone) return error("customerPhone is required");

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
    const restaurantId = Number(request.cookies.get("smart-menu-restaurant")?.value) || 1;

    if (!phone) return error("phone query parameter is required");

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

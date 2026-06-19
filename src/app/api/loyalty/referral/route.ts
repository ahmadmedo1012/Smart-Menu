import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, referredPhone, referredName } = body;

    if (!referralCode) return error("referralCode is required");

    const referrerCard = await prisma.loyaltyCard.findUnique({
      where: { referralCode },
    });

    if (!referrerCard) return error("Invalid referral code", 404);

    const referral = await prisma.referral.create({
      data: {
        referralCode,
        referrerId: referrerCard.id,
        referredPhone: referredPhone ?? "",
        referredName: referredName ?? "",
        status: "pending",
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

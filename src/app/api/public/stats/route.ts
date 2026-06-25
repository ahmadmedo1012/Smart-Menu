import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalRestaurants, totalUsers] = await Promise.all([
      prisma.restaurant.count(),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      totalRestaurants,
      totalUsers,
    });
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل الإحصائيات" },
      { status: 500 }
    );
  }
}

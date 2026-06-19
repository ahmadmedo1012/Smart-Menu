import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    // Parse features JSON for each plan
    const parsed = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.features),
    }));
    return success(parsed);
  } catch (e) {
    return handleError(e);
  }
}

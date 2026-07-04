import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";

const verifySchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["verified", "cancelled"]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const where = status !== "all" ? { status: status as "pending" | "verified" | "cancelled" } : {};

    const [data, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          phone: true,
          amount: true,
          provider: true,
          planId: true,
          planName: true,
          status: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, username: true, name: true } },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    return success({ data, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { id, status } = verifySchema.parse(await request.json());

    const result = await resolveSubscriptionPayment(id, status);
    if (!result.ok) {
      if (result.reason === "الطلب غير موجود") return notFound("SubscriptionPayment");
      return error(result.reason, 400);
    }

    return success(result);
  } catch (e) {
    return handleError(e);
  }
}

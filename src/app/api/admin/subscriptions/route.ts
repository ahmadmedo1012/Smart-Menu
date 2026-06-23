import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const where = status !== "all" ? { status } : {};

    const [data, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return error("id and status are required", 400);
    if (!["verified", "cancelled"].includes(status)) return error("status must be verified or cancelled", 400);

    const existing = await prisma.subscriptionPayment.findUnique({ where: { id: Number(id) } });
    if (!existing) return notFound("SubscriptionPayment");

    const updated = await prisma.subscriptionPayment.update({
      where: { id: Number(id) },
      data: { status },
    });

    return success(updated);
  } catch (e) {
    return handleError(e);
  }
}

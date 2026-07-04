import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return error("id is required", 400);

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true },
    });

    if (!payment) return error("not found", 404);
    return success(payment);
  } catch (e) {
    return handleError(e);
  }
}

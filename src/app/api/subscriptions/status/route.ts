import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
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

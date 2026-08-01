import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";

// Polling replacement for the SSE user/events stream — Vercel kills
// long-lived streams at 300s. Filters server-side by userId (the stream
// version replayed every user's events and filtered client-side).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || !auth.userId) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const sinceId = Number(searchParams.get("sinceId")) || 0;

    const events = await prisma.systemEvent.findMany({
      where: {
        id: { gt: sinceId },
        metadata: { path: ["userId"], equals: auth.userId },
      },
      orderBy: { id: "asc" },
      take: 50,
    });

    return success(events);
  } catch (e) {
    return handleError(e);
  }
}

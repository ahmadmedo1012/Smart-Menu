import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const auth = await requireAuth();
  if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let restaurantId = Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
  if (!restaurantId) return Response.json({ success: false, error: "معرف المطعم مطلوب" }, { status: 400 });
  if (auth.role === "owner" && auth.restaurantId !== restaurantId) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

  let lastCount = await prisma.order.count({ where: { restaurantId } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ count: lastCount })}\n\n`));
      const interval = setInterval(async () => {
        try {
          const currentCount = await prisma.order.count({ where: { restaurantId } });
          if (currentCount !== lastCount) {
            const newOrders = currentCount - lastCount;
            lastCount = currentCount;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ count: currentCount, newOrders })}\n\n`)
            );
          }
        } catch { clearInterval(interval); }
      }, 5000);
      request.signal.addEventListener("abort", () => { clearInterval(interval); controller.close(); });
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}

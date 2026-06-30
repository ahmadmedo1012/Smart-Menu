import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { error } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const restaurantId = Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
    if (!restaurantId) return error("معرف المطعم مطلوب", 400);
    if (auth.role === "owner" && auth.restaurantId !== restaurantId) return error("غير مصرح", 401);

    let lastCount = await prisma.order.count({ where: { restaurantId } });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ count: lastCount })}\n\n`));
        const interval = setInterval(async () => {
          try {
            const currentCount = await prisma.order.count({ where: { restaurantId } });
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
            if (currentCount !== lastCount) {
              const newOrders = currentCount - lastCount;
              lastCount = currentCount;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ count: currentCount, newOrders })}\n\n`)
              );
            }
          } catch {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "خطأ في التحقق من الطلبات" })}\n\n`));
            clearInterval(interval);
          }
        }, 5000);
        request.signal.addEventListener("abort", () => { clearInterval(interval); controller.close(); });
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
    });
  } catch {
    return error("حدث خطأ في الخادم", 500);
  }
}

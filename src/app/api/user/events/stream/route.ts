import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { eventEmitter } from "@/lib/events";
import { error } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || !auth.userId) return error("غير مصرح", 401);

    const userId = auth.userId;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const listener = (event: any) => {
          // Filter events for this user only
          if (event.userId === userId) {
            try {
              const msg = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(msg));
            } catch {
              // client disconnected — listener cleaned up in abort handler
            }
          }
        };
        eventEmitter.on("user-event", listener);

        const hb = setInterval(() => {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 30000);

        request.signal.addEventListener("abort", () => {
          eventEmitter.off("user-event", listener);
          clearInterval(hb);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return error("حدث خطأ في الخادم", 500);
  }
}

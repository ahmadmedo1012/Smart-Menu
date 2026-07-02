import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { eventEmitter } from "@/lib/events";
import { error } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const listener = (event: any) => {
          const msg = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(msg));
        };
        eventEmitter.on("admin-event", listener);

        const hb = setInterval(() => {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 30000);

        request.signal.addEventListener("abort", () => {
          eventEmitter.off("admin-event", listener);
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

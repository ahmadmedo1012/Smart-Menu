import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { error } from "@/lib/api-helpers";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const encoder = new TextEncoder();
    let lastId = 0;
    const stream = new ReadableStream({
      start(controller) {
        const poll = async () => {
          try {
            const events = await prisma.systemEvent.findMany({
              where: { id: { gt: lastId } },
              orderBy: { id: "asc" },
              take: 50,
            });
            for (const ev of events) {
              const msg = `data: ${JSON.stringify(ev)}\n\n`;
              controller.enqueue(encoder.encode(msg));
              lastId = ev.id;
            }
          } catch { /* poll failed */ }
        };
        poll(); // immediate first poll
        const interval = setInterval(poll, 5000);
        const hb = setInterval(() => {
          try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch {}
        }, 30000);

        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
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
  } catch { return error("حدث خطأ في الخادم", 500); }
}

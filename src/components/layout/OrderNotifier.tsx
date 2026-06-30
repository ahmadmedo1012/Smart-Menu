"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

/** Play a gentle notification chime using Web Audio API */
function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {}
}

/**
 * Real-time order notifications via SSE (Server-Sent Events).
 * No page reload needed — pushes instantly from server.
 */
export function useOrderNotifier(restaurantId?: number) {
  const hasNotified = useRef(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    function connect() {
      esRef.current?.close();

      const url = `/api/orders/stream?restaurantId=${restaurantId}`;
      const eventSource = new EventSource(url);
      esRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.newOrders && data.newOrders > 0 && !hasNotified.current) {
            playOrderSound();
            toast(
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center">
                  <ShoppingCart className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">طلب جديد!</p>
                  <p className="text-xs text-muted-foreground">لديك {data.newOrders} طلب جديد</p>
                </div>
              </div>,
              { duration: 5000, position: "top-center" }
            );
            hasNotified.current = true;
            setTimeout(() => { hasNotified.current = false; }, 30000);
          }
        } catch {}
      };

      eventSource.onopen = () => {
        retryCount.current = 0;
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (retryCount.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 60000);
          retryCount.current += 1;
          if (retryCount.current === 1) {
            toast.warning("انقطع الاتصال بالطلبات الجديدة، جار إعادة الاتصال...", { duration: 4000 });
          }
          retryTimer.current = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [restaurantId]);
}

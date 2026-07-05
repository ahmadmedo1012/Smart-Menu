"use client";

import { useEffect, useRef, useState } from "react";
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

function showOrderToast(newOrders: number) {
  playOrderSound();
  toast(
    <div className="flex items-center gap-3">
      <div className="size-10 rounded-full bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center">
        <ShoppingCart className="size-5 text-white" />
      </div>
      <div>
        <p className="font-bold text-sm">طلب جديد!</p>
        <p className="text-xs text-muted-foreground">لديك {newOrders} طلب جديد</p>
      </div>
    </div>,
    { duration: 5000, position: "top-center" }
  );
}

export function useOrderNotifier(restaurantId?: number) {
  const hasNotified = useRef(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const [pollMode, setPollMode] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastOrderCountRef = useRef(0);

  useEffect(() => {
    if (!restaurantId) return;

    function connectSSE() {
      esRef.current?.close();
      if (pollMode) return;

      const url = `/api/orders/stream?restaurantId=${restaurantId}`;
      const eventSource = new EventSource(url);
      esRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.newOrders && data.newOrders > 0 && !hasNotified.current) {
            showOrderToast(data.newOrders);
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
        retryCount.current += 1;
        if (retryCount.current >= 3) {
          // Fallback to polling after 3 SSE failures
          setPollMode(true);
          return;
        }
        if (retryCount.current === 1) {
          toast.warning("انقطع الاتصال بالطلبات الجديدة، جار إعادة الاتصال...", { duration: 4000 });
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 60000);
        retryTimer.current = setTimeout(connectSSE, delay);
      };
    }

    function startPolling() {
      if (!restaurantId) return;
      const poll = async () => {
        try {
          const res = await fetch(`/api/orders?status=new&restaurantId=${restaurantId}`);
          if (!res.ok) return;
          const json = await res.json();
          const count = Array.isArray(json) ? json.length : (json?.data?.length ?? 0);
          if (count > lastOrderCountRef.current && !hasNotified.current) {
            showOrderToast(count - lastOrderCountRef.current);
            hasNotified.current = true;
            setTimeout(() => { hasNotified.current = false; }, 30000);
          }
          lastOrderCountRef.current = count;
        } catch { /* poll failed */ }
      };
      poll();
      pollIntervalRef.current = setInterval(poll, 5000);
    }

    if (pollMode) {
      startPolling();
    } else {
      connectSSE();
    }

    return () => {
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [restaurantId, pollMode]);
}

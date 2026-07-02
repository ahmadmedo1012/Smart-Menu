"use client";

import { useEffect, useRef } from "react";
import { premiumToast } from "@/lib/premium-toast";

function playBeep(freq: number, duration: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function AdminEventNotifier() {
  const esRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function connect() {
      esRef.current?.close();
      const es = new EventSource("/api/admin/events/stream");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "payment":
              playBeep(880, 0.4);
              premiumToast("success", data.title || "عملية دفع", data.message);
              break;
            case "new_order":
            case "restaurant_created":
              premiumToast("info", data.title || data.type, data.message);
              break;
            case "system_alert":
              premiumToast("error", data.title || "تنبيه النظام", data.message);
              break;
            default:
              premiumToast("info", data.title || "حدث جديد", data.message);
          }
        } catch {}
      };

      es.onopen = () => { retryCount.current = 0; };
      es.onerror = () => {
        es.close();
        if (retryCount.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 60000);
          retryCount.current += 1;
          retryTimer.current = setTimeout(connect, delay);
        }
      };
    }

    connect();
    return () => {
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  return null;
}

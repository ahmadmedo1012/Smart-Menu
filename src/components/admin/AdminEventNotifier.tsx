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
  const lastIdRef = useRef(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/system-events?page=1&pageSize=50");
        if (!res.ok) return;
        const json = await res.json();
        const data: any[] = json?.data ?? [];
        if (!Array.isArray(data)) return;

        let maxId = lastIdRef.current;
        for (const ev of data) {
          if (ev.id > maxId) maxId = ev.id;
          if (ev.id <= lastIdRef.current) continue;
          switch (ev.eventType) {
            case "payment":
              playBeep(880, 0.4);
              premiumToast("success", ev.title || "عملية دفع", ev.message);
              break;
            case "new_order":
            case "restaurant_created":
              premiumToast("info", ev.title || ev.eventType, ev.message);
              break;
            case "system_alert":
              premiumToast("error", ev.title || "تنبيه النظام", ev.message);
              break;
            default:
              premiumToast("info", ev.title || "حدث جديد", ev.message);
          }
        }
        lastIdRef.current = maxId;
      } catch { /* poll failed */ }
    };

    poll(); // immediate first poll
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

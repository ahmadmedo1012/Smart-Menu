"use client";

import { useRef } from "react";
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible";
import { playBeep } from "@/lib/chime";
import { premiumToast } from "@/lib/premium-toast";

// Poll cadence: system events are non-urgent (payment/order toasts) and the
// /api/admin/system-events payload is page 1 of 50 — no sinceId support yet.
const POLL_MS = 15_000;

export function AdminEventNotifier() {
  const lastIdRef = useRef(0);
  // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
  usePollWhenVisible(async () => {
      try {
        const res = await fetch("/api/admin/system-events?page=1&pageSize=50");
        if (!res.ok) return;
        const json = await res.json();
        const data: { id: number; eventType: string; title?: string; message?: string }[] =
          json?.data ?? [];
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
  }, POLL_MS);

  return null;
}

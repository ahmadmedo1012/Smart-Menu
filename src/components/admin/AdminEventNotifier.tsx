"use client";

import { useRef } from "react";
import { usePollWhenVisible } from "@/hooks/usePollWhenVisible";
import { playBeep } from "@/lib/chime";
import { premiumToast } from "@/lib/premium-toast";

// Poll cadence: system events are non-urgent (payment/order toasts).
// round87-B6: incremental sinceId cursor (route support added this round) —
// the steady-state poll now returns an EMPTY array instead of 50 full rows.
const POLL_MS = 15_000;

export function AdminEventNotifier() {
  const lastIdRef = useRef(0);
  const seededRef = useRef(false);
  // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
  usePollWhenVisible(async () => {
      try {
        // First poll: seed the high-water mark from the newest event without
        // toasting history (the old code replayed up to 50 historical events
        // as toasts on every admin page load — lastIdRef started at 0).
        if (!seededRef.current) {
          const res = await fetch("/api/admin/system-events?page=1&pageSize=1");
          if (!res.ok) return;
          const json = await res.json();
          const top = Array.isArray(json?.data) ? json.data[0] : undefined;
          if (top) lastIdRef.current = top.id;
          seededRef.current = true;
          return;
        }
        const res = await fetch(`/api/admin/system-events?sinceId=${lastIdRef.current}&pageSize=50`);
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

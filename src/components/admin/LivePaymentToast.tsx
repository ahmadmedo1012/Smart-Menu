"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDollarSign, X } from "lucide-react";

function playPaymentBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

interface ToastEvent {
  id: number;
  title: string;
  message?: string;
}

export function LivePaymentToast() {
  const [events, setEvents] = useState<ToastEvent[]>([]);
  const idRef = useRef(0);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const es = new EventSource("/api/admin/events/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "payment") return;

        playPaymentBeep();
        const id = idRef.current++;
        setEvents((prev) => [
          ...prev,
          { id, title: data.title || "تم إيداع", message: data.message },
        ]);

        const t = setTimeout(() => {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          timeoutsRef.current.delete(t);
        }, 5000);
        timeoutsRef.current.add(t);
      } catch {}
    };

    es.onerror = () => es.close();

    return () => {
      es.close();
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 w-80">
      <AnimatePresence initial={false}>
        {events.map((evt) => (
          <motion.div
            key={evt.id}
            layout
            initial={{ opacity: 0, x: -80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-2xl text-white"
          >
            <div className="flex items-start gap-3 rtl:flex-row-reverse">
              <div className="size-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <CircleDollarSign className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm leading-tight">{evt.title}</p>
                {evt.message && (
                  <p className="text-xs text-emerald-100/80 mt-0.5 line-clamp-2">
                    {evt.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(evt.id)}
                className="shrink-0 size-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="إغلاق"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

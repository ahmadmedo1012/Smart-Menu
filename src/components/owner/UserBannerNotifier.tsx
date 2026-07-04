"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RejectionEvent {
  type: "subscription_rejected";
  message: string;
  timestamp: string;
}

export function UserBannerNotifier() {
  const [rejected, setRejected] = useState<RejectionEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource("/api/user/events/stream");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "subscription_rejected") {
            setRejected(data);
            setDismissed(false);
          }
        } catch {}
      };

      es.onopen = () => { retryCount.current = 0; };
      es.onerror = () => {
        es.close();
        if (retryCount.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 60000);
          retryCount.current += 1;
          retryTimer.current = setTimeout(() => connectRef.current(), delay);
        }
      };
    };

    connectRef.current = connect;
    connect();

    return () => {
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  if (!rejected || dismissed) return null;

  return (
    <div className="w-full">
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "mx-4 mt-4 rounded-xl border-2 border-destructive/30",
              "bg-gradient-to-r from-destructive/10 to-red-500/5",
              "dark:from-destructive/20 dark:to-red-500/10",
              "p-4 backdrop-blur-sm"
            )}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3 rtl:flex-row-reverse">
              <div className="size-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-destructive">
                  تم رفض طلب التفعيل
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {rejected.message}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-2">
                  يمكنك تعديل بيانات الدفع وإعادة المحاولة من صفحة الدفع
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="shrink-0 size-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                aria-label="إغلاق"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

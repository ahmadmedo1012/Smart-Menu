import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";

interface Opts { enabled?: boolean; immediate?: boolean; inFlightGuard?: boolean; }

export function usePollWhenVisible(
  fn: () => void | Promise<void>,
  intervalMs: number,
  deps: React.DependencyList,
  opts: Opts = {},
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const inflightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    if (opts.immediate) {
      void (async () => {
        if (opts.inFlightGuard && inflightRef.current) return;
        inflightRef.current = true;
        try { await fnRef.current(); } finally { inflightRef.current = false; }
      })();
    }
    intervalRef.current = setInterval(() => {
      if (opts.inFlightGuard && inflightRef.current) return;
      inflightRef.current = true;
      Promise.resolve(fnRef.current()).catch(() => {}).finally(() => { inflightRef.current = false; });
    }, intervalMs);
  }, [intervalMs, opts.immediate, opts.inFlightGuard]);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (opts.enabled === false) { stop(); return; }
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled, ...deps]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") { if (opts.enabled !== false) start(); } else stop();
    });
    return () => { sub.remove(); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);

  return { start, stop };
}

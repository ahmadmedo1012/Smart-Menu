import { after } from "next/server";

/**
 * r119-S3-P2-4: run a task AFTER the response is sent. On Vercel this keeps
 * the function alive until the task settles (a bare `void promise` can be
 * frozen mid-send once the response completes).
 *
 * `after()` itself throws E468 when called outside a request scope — which is
 * exactly what vitest unit tests do (they invoke route handlers directly). In
 * that case we fall back to immediate execution so broadcast assertions keep
 * working. The task MUST be never-throwing (notifyEvent already is — r118
 * wrapped every Telegram transport in a 10s-bounded, never-throw apiCall).
 */
export function runAfterResponse(task: () => unknown): void {
  try {
    after(task);
  } catch {
    // No request scope (tests / scripts): run now, swallow any rejection.
    try {
      void Promise.resolve(task()).catch(() => {});
    } catch {
      /* never propagate — the caller's response is already committed */
    }
  }
}

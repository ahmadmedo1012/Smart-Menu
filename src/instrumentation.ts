// ponytail: global error boundary for unhandled rejections & exceptions
// Next.js loads this file automatically if present in src/

export function register() {
  const seen = new WeakSet<object>();

  process.on("unhandledRejection", (reason) => {
    if (reason && typeof reason === "object" && seen.has(reason)) return;
    if (reason && typeof reason === "object") seen.add(reason);
    console.error("[CRITICAL] Unhandled Rejection:", reason instanceof Error ? reason.message : String(reason));
  });

  process.on("uncaughtException", (err) => {
    console.error("[CRITICAL] Uncaught Exception:", err.message);
    // Don't exit — let Next.js recovery handle it
  });
}

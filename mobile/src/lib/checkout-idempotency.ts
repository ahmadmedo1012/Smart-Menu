/**
 * r119-B2-M (S6 P2-2, mobile twin of the web's checkoutKeyRef — r106-N1):
 * ONE idempotency key per cart-submission session, REUSED on every retry.
 *
 * The old code minted a fresh key inside every onCheckout: a 15s-timeout POST
 * that actually landed on the server, followed by the customer's retry, created
 * a DUPLICATE order (and a second WhatsApp invoice). The server's dedupe is
 * `orderNo = "ORD-" + idempotencyKey.slice(0, 40)` with a unique constraint —
 * replaying the SAME key returns the inert `{ orderNo, already: true }` 200
 * instead of a second row (src/app/api/orders/route.ts, round90-F1 race catch).
 *
 * Lifecycle (mirrors the web's checkoutKeyRef exactly):
 *   - minted lazily by getOrCreateCheckoutIdempotencyKey() on first submit;
 *   - KEPT through every failure (timeout that may have landed, network cut,
 *     429/403/409/422 — a hard failure means the server never wrote, so the
 *     derived orderNo is still free; an ambiguous failure means it may have
 *     written, so the retry MUST replay the same key);
 *   - retired ONLY on a confirmed success (201 echo or the already:true
 *     replay) so the NEXT order in the same app session mints a fresh key —
 *     a never-rotating key would alias a second order onto the first's
 *     orderNo.
 *
 * Scope: module-level (one app process). The CartSheet component unmounts on
 * close, so a useRef would mint per-sheet-open and reintroduce the hole. An
 * app kill mid-retry loses the key — accepted, same session-scope tradeoff the
 * web's page-scoped ref makes.
 *
 * Key format: "M" + Date.now().base36 + 6 random chars, uppercased
 * (≈15 chars) — well inside the server's zod max(100) and short enough that
 * the orderNo's slice(0, 40) keeps all the entropy. Web mints "W…".
 */

let currentKey: string | null = null;

/** Returns the session's checkout key, minting it on first use. */
export function getOrCreateCheckoutIdempotencyKey(): string {
  if (currentKey === null) {
    currentKey = `M${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  }
  return currentKey;
}

/**
 * Retire the key after a CONFIRMED success (201 or already:true) so the next
 * order mints a fresh one. Never call this on failure paths.
 */
export function retireCheckoutIdempotencyKey(): void {
  currentKey = null;
}

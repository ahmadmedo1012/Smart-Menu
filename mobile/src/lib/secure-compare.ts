/**
 * Constant-time bearer-secret comparison (mobile port).
 *
 * The web version used `node:crypto.timingSafeEqual` + `Buffer` — neither is
 * available in the React Native runtime. This pure-JS implementation uses
 * `TextEncoder` (provided by the platform) and a byte-wise constant-time XOR
 * to preserve the same timing-side-channel guarantees:
 *  - returns false immediately when lengths differ (length is public info);
 *  - otherwise accumulates XOR of every byte, returns `acc === 0` — no early
 *    exit on the first mismatching byte.
 */
const encoder = new TextEncoder();

function toBytes(s: string): Uint8Array {
        return encoder.encode(s);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        let acc = 0;
        for (let i = 0; i < a.length; i++) {
                acc |= a[i] ^ b[i];
        }
        return acc === 0;
}

/**
 * Constant-time bearer-secret comparison for cron-style endpoints (round85-A4).
 * A plain `!==` comparison leaks secret length/prefix through response timing;
 * the Telegram webhook already used timingSafeEqual — cron endpoints now match
 * that bar. Returns false for missing/empty values (fail-closed).
 */
export function timingSafeBearer(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader || !secret) return false;
  const expected = toBytes(`Bearer ${secret}`);
  const actual = toBytes(authHeader);
  return constantTimeEqual(expected, actual);
}

/**
 * round86-C7: constant-time comparison of two raw strings (byte-wise).
 * Byte-identical copies of this helper lived in admin/telegram/verify and
 * telegram/webhook while this module existed — the consolidation round85
 * started is now finished.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = toBytes(a);
  const bufB = toBytes(b);
  return constantTimeEqual(bufA, bufB);
}

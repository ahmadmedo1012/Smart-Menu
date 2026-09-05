import { timingSafeEqual } from "crypto";

/**
 * Constant-time bearer-secret comparison for cron-style endpoints (round85-A4).
 * A plain `!==` comparison leaks secret length/prefix through response timing;
 * the Telegram webhook already used timingSafeEqual — cron endpoints now match
 * that bar. Returns false for missing/empty values (fail-closed).
 */
export function timingSafeBearer(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const actual = Buffer.from(authHeader, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

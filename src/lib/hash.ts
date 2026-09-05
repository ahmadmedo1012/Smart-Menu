import { randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";

// OWASP PBKDF2 guidance (2023): >= 210k iterations for SHA-512. We use 600k
// for headroom. Measured cost: ~290ms per hash on the current runtime —
// acceptable for login/register/reset (rate-limited, infrequent) routes.
// Legacy hashes (2-part format, 100k iterations) stay verifiable and are
// transparently upgraded on the next successful login (auth/login route).
export const ITERATIONS = 600_000;
const LEGACY_ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

type ParsedStored = { iterations: number; salt: string; hash: string };

function parseStored(stored: string): ParsedStored | null {
  const parts = stored.split(":");
  if (parts.length === 2) {
    // v1 legacy format "salt:hash" (100k iterations)
    const [salt, hash] = parts;
    if (!salt || !hash) return null;
    return { iterations: LEGACY_ITERATIONS, salt, hash };
  }
  if (parts.length === 3) {
    // v2 format "iterations:salt:hash"
    const iterations = Number(parts[0]);
    const salt = parts[1];
    const hash = parts[2];
    if (
      !Number.isInteger(iterations) ||
      iterations < 1 ||
      iterations > 10_000_000 ||
      !salt ||
      !hash
    ) {
      return null;
    }
    return { iterations, salt, hash };
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyHash(password: string, stored: string): boolean {
  const parsed = parseStored(stored);
  if (!parsed) return false;  // no plaintext fallback
  const derived = pbkdf2Sync(password, parsed.salt, parsed.iterations, KEY_LENGTH, DIGEST).toString("hex");
  const a = Buffer.from(derived);
  const b = Buffer.from(parsed.hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * True when the stored hash uses weaker/legacy parameters and should be
 * upgraded with the current ITERATIONS after a successful verification
 * (login-time transparent rehash — keeps existing users working).
 */
export function needsRehash(stored: string): boolean {
  const parsed = parseStored(stored);
  return !parsed || parsed.iterations < ITERATIONS;
}

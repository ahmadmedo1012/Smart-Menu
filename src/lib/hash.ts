import { randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;  // no plaintext fallback
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  const a = Buffer.from(derived);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

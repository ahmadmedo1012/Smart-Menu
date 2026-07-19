import { hkdfSync } from "node:crypto";

const HMAC_INFO = "hmac";
const AES_INFO = "aes-gcm";
const DERIVED_LENGTH = 32; // 256 bits

function getMasterSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("AUTH_SECRET or JWT_SECRET must be set");
  return secret;
}

/** HKDF-derived key (info="hmac") for HMAC-SHA256 signing (Telegram link tokens). */
export function getHmacKey(): ArrayBuffer {
  return hkdfSync("sha256", getMasterSecret(), "", HMAC_INFO, DERIVED_LENGTH);
}

/** HKDF-derived raw key material (info="aes-gcm") for AES-GCM encryption. */
export function getAesGcmKeyRaw(): ArrayBuffer {
  return hkdfSync("sha256", getMasterSecret(), "", AES_INFO, DERIVED_LENGTH);
}

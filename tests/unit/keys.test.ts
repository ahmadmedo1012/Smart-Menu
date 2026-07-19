/**
 * Key derivation + encryption round-trip tests.
 * HKDF from AUTH_SECRET produces deterministic, distinct keys.
 * encryptValue / decryptValue round-trip bot tokens.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getHmacKey, getAesGcmKeyRaw } from "@/lib/keys";
import { encryptValue, decryptValue } from "@/lib/config";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-for-hkdf-derivation-12345";
});

describe("HKDF key derivation", () => {
  it("produces deterministic hmacKey across calls", () => {
    const a = Buffer.from(getHmacKey());
    const b = Buffer.from(getHmacKey());
    expect(a).toEqual(b);
  });

  it("produces deterministic aesGcmKey across calls", () => {
    const a = Buffer.from(getAesGcmKeyRaw());
    const b = Buffer.from(getAesGcmKeyRaw());
    expect(a).toEqual(b);
  });

  it("hmacKey and aesGcmKey are different byte sequences", () => {
    const hmac = Buffer.from(getHmacKey());
    const aes = Buffer.from(getAesGcmKeyRaw());
    // Must be different — different HKDF info strings
    expect(hmac).not.toEqual(aes);
  });

  it("both keys are 32 bytes (256 bits)", () => {
    const hmac = Buffer.from(getHmacKey());
    const aes = Buffer.from(getAesGcmKeyRaw());
    expect(hmac).toHaveLength(32);
    expect(aes).toHaveLength(32);
  });
});

describe("encryptValue / decryptValue round-trip", () => {
  it("decrypts to original bot token", async () => {
    const original = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const encrypted = await encryptValue(original);
    expect(encrypted).not.toBe(original);
    expect(typeof encrypted).toBe("string");

    const decrypted = await decryptValue(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const token = "test-token-12345";
    const a = await encryptValue(token);
    const b = await encryptValue(token);
    expect(a).not.toBe(b);
  });

  it("handles empty string", async () => {
    const encrypted = await encryptValue("");
    const decrypted = await decryptValue(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles long bot token", async () => {
    const token = "a".repeat(200);
    const encrypted = await encryptValue(token);
    const decrypted = await decryptValue(encrypted);
    expect(decrypted).toBe(token);
  });
});

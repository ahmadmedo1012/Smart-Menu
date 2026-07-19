import { prisma } from "./db";
import { getAesGcmKeyRaw } from "./keys";

export async function getConfig(key: string): Promise<unknown> {
  const entry = await prisma.systemConfig.findUnique({ where: { key } });
  return entry?.value ?? null;
}

export async function getConfigOrThrow<T>(key: string): Promise<T> {
  const value = await getConfig(key);
  if (value === null || value === undefined) {
    throw new Error(`Config key "${key}" not found`);
  }
  return value as T;
}

export async function getConfigByCategory(category: string) {
  return prisma.systemConfig.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });
}

export async function getAllConfigs() {
  return prisma.systemConfig.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

// Config encryption helpers for secret values
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = getAesGcmKeyRaw();
  return crypto.subtle.importKey(
    "raw",
    raw,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptValue(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString("base64");
}

export async function decryptValue(encoded: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Buffer.from(encoded, "base64");
  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return decoder.decode(decrypted);
}

/** Shared helper: get bot token from env var (priority) or decrypted from DB. */
export async function getDecryptedBotToken(): Promise<string | null> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) return envToken;
  const config = await prisma.telegramConfig.findFirst();
  if (!config?.botToken) return null;
  try {
    return await decryptValue(config.botToken);
  } catch {
    // Fallback for legacy plaintext tokens still in DB
    return config.botToken;
  }
}

import { prisma } from "./db";

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

export async function encryptValue(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString("base64");
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or JWT_SECRET must be set");
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.padEnd(32, "x").slice(0, 32)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { validateEnv } from "./env";

if (process.env.NODE_ENV === "production") validateEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPool(): pg.Pool {
  const url = process.env.DATABASE_URL!;
  return new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    maxUses: 1000,
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool(), {
      schema: process.env.DATABASE_SCHEMA ?? "public",
    }),
  });

// ponytail: simple retry wrapper for transient DB errors, use exponential backoff if needed
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isTransient = msg.includes("connection") || msg.includes("timeout") || msg.includes("deadlock") || msg.includes("500");
      if (i === retries || !isTransient) throw e;
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, restaurantId: true },
  });
}

export async function dbHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { validateEnv } from "./env";
import { warn } from "./logger";

// ponytail: safe Decimal→Number ceiling. All schema Decimal fields use @db.Decimal(10,2)
// (max 99,999,999.99) or Decimal(3,2) (max 9.99), well within Number.MAX_SAFE_INTEGER
// (9,007,199,254,740,991). The adapter returns Decimal as string, so Number() is lossless
// for these precisions. Warn if value exceeds safe integer scale.
const MAX_SAFE_DECIMAL = 9_007_199_254_740_991;
function toNumber(v: unknown, label?: string): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(String(v));
  if (label && (n > MAX_SAFE_DECIMAL || n < -MAX_SAFE_DECIMAL)) {
    warn(`Decimal→Number precision loss risk on ${label}: ${v}`);
  }
  return n;
}
function toNumberOrNull(v: unknown, label?: string): number | null {
  if (v == null) return null;
  return toNumber(v, label);
}

if (!process.env.SKIP_ENV_CHECK) validateEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPool(): pg.Pool {
  const url = process.env.DATABASE_URL!;
  return new pg.Pool({
    connectionString: url,
    // Serverless: many concurrent function instances × pool size must stay under
    // Neon's connection cap (10). 5 × instances is a safer ceiling than 10.
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    maxUses: 1000,
    // Kill runaway queries so a slow statement can't hog a pooled connection
    // (live: "Connection terminated due to connection timeout" on /menu).
    query_timeout: 15_000,
    statement_timeout: 15_000,
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool(), {
      schema: process.env.DATABASE_SCHEMA ?? "public",
    }),
  }).$extends({
    result: {
      menuItem: {
        price: { needs: { price: true }, compute(i) { return toNumber(i.price, "menuItem.price") } },
        discountedPrice: { needs: { discountedPrice: true }, compute(i) { return toNumberOrNull(i.discountedPrice, "menuItem.discountedPrice") } },
      },
      order: {
        subtotal: { needs: { subtotal: true }, compute(i) { return toNumber(i.subtotal, "order.subtotal") } },
        discount: { needs: { discount: true }, compute(i) { return toNumber(i.discount, "order.discount") } },
        total: { needs: { total: true }, compute(i) { return toNumber(i.total, "order.total") } },
      },
      orderItem: {
        price: { needs: { price: true }, compute(i) { return toNumber(i.price, "orderItem.price") } },
      },
      subscriptionPlan: {
        price: { needs: { price: true }, compute(i) { return toNumber(i.price, "subscriptionPlan.price") } },
      },
      subscriptionPayment: {
        amount: { needs: { amount: true }, compute(i) { return toNumber(i.amount, "subscriptionPayment.amount") } },
      },
      loyaltyCard: {
        totalSpent: { needs: { totalSpent: true }, compute(i) { return toNumber(i.totalSpent, "loyaltyCard.totalSpent") } },
      },
    },
  });

// ponytail: simple retry wrapper for transient DB errors, use exponential backoff if needed
const RETRY_CODES = new Set(["40001", "40P01", "57014", "08000", "P2034"]);
const RETRY_MESSAGES = ["connection", "timeout", "deadlock", "500"];

export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const code = (e as Record<string, string | undefined>)?.code;
      const msg = e instanceof Error ? e.message : String(e);
      const isTransient =
        (code != null && RETRY_CODES.has(code)) ||
        RETRY_MESSAGES.some((m) => msg.toLowerCase().includes(m));
      if (i === retries || !isTransient) throw e;
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, restaurantId: true, permissions: true, subscriptionStatus: true },
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

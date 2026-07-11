import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

/* ponytail: in-memory cache, 5min TTL. Invalidates on server restart or admin plan mutation.
 * Upgrade to Redis/Vercel KV when plans mutate frequently (admin panel). */
let cached: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 300_000; // 5 min

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.ts < CACHE_TTL) {
      return success(cached.data);
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const parsed = plans.map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string),
    }));

    cached = { data: parsed, ts: now };
    return success(parsed);
  } catch (e) {
    return handleError(e);
  }
}

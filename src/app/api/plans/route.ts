import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { healPlanFeatures } from "@/lib/plan-features-heal";

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
      /* W7-B2: شفاء عند القراءة — صفوف الإنتاج القديمة تُعرض صادقة
         (نفس خريطة هجرة zz_w7b + فك فساد الترميز المزدوج) — العمود
         لا يُكتب من القارئ أبدًا. */
      features: healPlanFeatures(
        Array.isArray(p.features) ? p.features : JSON.parse(p.features as string)
      ),
    }));

    cached = { data: parsed, ts: now };
    return success(parsed);
  } catch (e) {
    return handleError(e);
  }
}

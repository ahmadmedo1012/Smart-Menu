import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error as apiError } from "@/lib/api-helpers";
import { error as logError } from "@/lib/logger";
// r93-N2 (F3/H-2): المصدر الوحيد لخطط البذرة — كان لهذا المسار نسخته
// المحلية من DEFAULT_PLANS تحمل كذبة «أصناف غير محدودة» (r92 صحّح ci-seed
// فقط) فأعاد upsertه إدخال النص المتناقض مع السقف المُنفَّذ (9999).
// الآن المسار وci-seed.mjs يقرآن من src/lib/default-plans.json معًا.
import { DEFAULT_PLANS } from "@/lib/default-plans";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
      // round89-A4: standard {success:false,error} envelope (was a bare {message})
      return apiError("غير متاح في الإنتاج", 404);
    }
    /* r139 (housekeeping): requireAdmin حُذف من auth.ts — فحص الأدوار
       الإدارية الثلاثة صريح هنا (نفس دلالة البوابة القديمة حرفيًا:
       admin/sub_admin/super_admin؛ 401 بلا جلسة — الفرع الفارغ لـrequireAuth
       لا يحمل status فيُصرَّح هنا — و403 لغير الإداريين). */
    const auth = await requireAuth();
    if (!auth.authorized) return apiError('غير مصرح', 401);
    if (auth.role !== "admin" && auth.role !== "sub_admin" && auth.role !== "super_admin") {
      return apiError("لا تملك الصلاحية", 403);
    }

    // Upsert each plan — corrects existing data (e.g. typos) without dropping tables
    for (const p of DEFAULT_PLANS) {
      const existing = await prisma.subscriptionPlan.findFirst({ where: { name: p.name } });
      if (existing) {
        await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: p });
      } else {
        await prisma.subscriptionPlan.create({ data: p });
      }
    }

    // Upsert admin — only if missing
    const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!existingAdmin) {
      await prisma.user.create({ data: { username: "admin", password: hashPassword(process.env.ADMIN_PASSWORD ?? (() => { throw new Error("ADMIN_PASSWORD env var is required"); })()), name: "مدير النظام", role: "admin" } });
    }

    // round89-A4: {success:true,data} envelope (was a bare {message})
    return success("تم تحديث الخطط بنجاح — خططتان (مجاني + مدفوعة)");
  } catch (e: unknown) {
    // round89-A4: the raw error (e.g. Prisma internals) stays server-side only —
    // the old apiError(e.message, 500) leaked it to the client (dx-4 #5)
    const raw = e instanceof Error ? e.message : String(e);
    logError("seed", { error: raw });
    return apiError("تعذّر تنفيذ البذور — حدث خطأ داخلي", 500);
  }
}

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { success, error as apiError } from "@/lib/api-helpers";
import { error as logError } from "@/lib/logger";

const DEFAULT_PLANS = [
  { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: ["منيو رقمي تفاعلي", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"] },
  { name: "Premium", nameAr: "المدفوعة", price: 29, periodDays: 30, maxMenus: 9999, maxItems: 9999, maxOrders: 99999, sortOrder: 2, features: ["جميع ميزات المجانية", "أصناف غير محدودة", "برنامج ولاء متكامل", "QR كود مخصص", "إحصائيات متقدمة", "دعم فني فوري", "تخصيص كامل"] },
];

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
      // round89-A4: standard {success:false,error} envelope (was a bare {message})
      return apiError("غير متاح في الإنتاج", 404);
    }
    const auth = await requireAdmin();
    // round91-F-B (D2-#3): 401 only for no-session; a logged-in wrong-role
    // caller now propagates requireAdmin's 403 (was a blanket 401). The
    // production guard above stays FIRST — dev-bootstrap semantics preserved.
    if (!auth.authorized) return apiError(auth.error, auth.status);

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
    return apiError("تعذر تنفيذ البذور — حدث خطأ داخلي", 500);
  }
}

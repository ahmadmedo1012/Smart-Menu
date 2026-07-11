import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { error as apiError } from "@/lib/api-helpers";

const DEFAULT_PLANS = [
  { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: ["منيو رقمي تفاعلي", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"] },
  { name: "Premium", nameAr: "المدفوعة", price: 29, periodDays: 30, maxMenus: 9999, maxItems: 9999, maxOrders: 99999, sortOrder: 2, features: ["جميع ميزات المجانية", "أصناف غير محدودة", "برنامج ولاء متكامل", "QR كود مخصص", "إحصائيات متقدمة", "دعم فني فوري", "تخصيص كامل"] },
];

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
      return Response.json({ message: "Not available in production" }, { status: 404 });
    }
    const auth = await requireAdmin();
    if (!auth.authorized) return apiError("غير مصرح", 401);

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

    return Response.json({ message: "تم تحديث الخطط بنجاح — خططتان (مجاني + مدفوعة)" });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : "Seed failed", 500);
  }
}

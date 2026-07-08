import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { error as apiError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    // Idempotent: only seed if plans table is empty
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0) {
      return Response.json({ message: "الخطط موجودة مسبقاً — لم يتم تغيير شيء" });
    }

    const plans = [
      { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: JSON.stringify(["منيو رقمي تفاعلي", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"]) },
      { name: "Premium", nameAr: "المدفوعة", price: 29, periodDays: 30, maxMenus: 9999, maxItems: 9999, maxOrders: 99999, sortOrder: 2, features: JSON.stringify(["جميع ميزات المجانية", "أصناف غير محدودة", "برنامج ولاء متكامل", "QR كود مخصص", "إحصائيات متقدمة", "دعم فني فوري", "تخصيص كامل"]) },
    ];
    for (const p of plans) {
      await prisma.subscriptionPlan.create({ data: p });
    }

    // Upsert admin — only if missing
    const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!existingAdmin) {
      await prisma.user.create({ data: { username: "admin", password: hashPassword(process.env.ADMIN_PASSWORD ?? (() => { throw new Error("ADMIN_PASSWORD env var is required"); })()), name: "مدير النظام", role: "admin" } });
    }

    return Response.json({ message: "seeded with 2 plans (Free + Premium @10 LYD)" });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : "Seed failed", 500);
  }
}

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    // This endpoint only works if no plans exist (first-time setup)
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0) {
      // If we have fewer than 4 plans, add missing ones without destroying data
      const planNames = (await prisma.subscriptionPlan.findMany({ select: { name: true } })).map(p => p.name);
      const allPlans = ["Free", "Basic", "Pro", "Enterprise"];

      let added = 0;
      if (!planNames.includes("Basic")) {
        await prisma.subscriptionPlan.create({ data: { name: "Basic", nameAr: "أساسي", price: 49, periodDays: 30, maxMenus: 1, maxItems: 50, maxOrders: 500, sortOrder: 2, features: JSON.stringify(["منيو رقمي", "50 صنف", "طلبات غير محدودة", "برنامج ولاء", "تقرير شهري", "دعم فني"]) } });
        added++;
      }
      if (!planNames.includes("Pro")) {
        await prisma.subscriptionPlan.create({ data: { name: "Pro", nameAr: "احترافي", price: 129, periodDays: 30, maxMenus: 3, maxItems: 200, maxOrders: 2000, sortOrder: 3, features: JSON.stringify(["حتى 3 منيوهات", "200 صنف", "طلبات غير محدودة", "ولاء متقدم", "إحصائيات متقدمة", "QR كود مخصص", "دعم فوري", "تخصيص كامل"]) } });
        added++;
      }
      if (!planNames.includes("Enterprise")) {
        await prisma.subscriptionPlan.create({ data: { name: "Enterprise", nameAr: "شركات", price: 299, periodDays: 30, maxMenus: 10, maxItems: 9999, maxOrders: 99999, sortOrder: 4, features: JSON.stringify(["منيوهات غير محدودة", "أصناف غير محدودة", "طلبات غير محدودة", "ولاء كامل", "API مخصص", "دعم 24/7"]) } });
        added++;
      }
      return Response.json({ message: `already seeded. Added ${added} missing plans.` });
    }

    const plans = [
      { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: JSON.stringify(["منيو رقمي واحد", "10 أصناف كحد أقصى", "طلبات واتساب", "إحصائيات أساسية"]) },
      { name: "Basic", nameAr: "أساسي", price: 49, periodDays: 30, maxMenus: 1, maxItems: 50, maxOrders: 500, sortOrder: 2, features: JSON.stringify(["منيو رقمي", "50 صنف", "طلبات غير محدودة", "برنامج ولاء", "تقرير شهري", "دعم فني"]) },
      { name: "Pro", nameAr: "احترافي", price: 129, periodDays: 30, maxMenus: 3, maxItems: 200, maxOrders: 2000, sortOrder: 3, features: JSON.stringify(["حتى 3 منيوهات", "200 صنف", "طلبات غير محدودة", "ولاء متقدم", "إحصائيات متقدمة", "QR كود مخصص", "دعم فوري", "تخصيص كامل"]) },
      { name: "Enterprise", nameAr: "شركات", price: 299, periodDays: 30, maxMenus: 10, maxItems: 9999, maxOrders: 99999, sortOrder: 4, features: JSON.stringify(["منيوهات غير محدودة", "أصناف غير محدودة", "طلبات غير محدودة", "ولاء كامل", "API مخصص", "دعم 24/7"]) },
    ];
    for (const p of plans) {
      await prisma.subscriptionPlan.create({ data: p });
    }

    await prisma.user.create({ data: { username: "admin", password: hashPassword("admin123"), name: "مدير النظام", role: "admin" } });

    const freePlan = await prisma.subscriptionPlan.findFirst({ where: { name: "Free" } });
    const r1 = await prisma.restaurant.create({
      data: {
        name: "مقهى الواحة", slug: "al-waha-cafe",
        description: "قهوة ومشروبات وحلويات ليبية",
        phone: "+218911111111", whatsapp: "218911111111",
        workingHours: "8:00 صباحاً - 12:00 منتصف الليل",
        planId: freePlan?.id || null,
      },
    });
    await prisma.user.create({
      data: { username: "waha", password: hashPassword("waha123"), name: "مالك مقهى الواحة", role: "owner", restaurantId: r1.id, planId: freePlan?.id || null },
    });

    const cat = await prisma.menuCategory.create({ data: { name: "مشروبات ساخنة", icon: "☕", sortOrder: 1, restaurantId: r1.id } });
    await prisma.menuItem.createMany({ data: [
      { name: "قهوة تركي", price: 3, categoryId: cat.id, sortOrder: 1 },
      { name: "كابتشينو", price: 5, categoryId: cat.id, sortOrder: 2 },
      { name: "شاي", price: 2, categoryId: cat.id, sortOrder: 3 },
    ]});

    return Response.json({ message: "seeded successfully (4 plans)" });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

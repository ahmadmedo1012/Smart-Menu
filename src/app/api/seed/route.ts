import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0) {
      // Upsert to 4 plans - just check if we have less than 4
      const count = existing;
      if (count < 4) {
        // Clear and re-seed
        await prisma.rewardTransaction.deleteMany();
        await prisma.referral.deleteMany();
        await prisma.loyaltyCard.deleteMany();
        await prisma.whatsappTemplate.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.setting.deleteMany();
        await prisma.menuItem.deleteMany();
        await prisma.menuCategory.deleteMany();
        await prisma.restaurant.deleteMany();
        await prisma.user.deleteMany();
        await prisma.subscriptionPlan.deleteMany();
      } else {
        return Response.json({ message: "already seeded", plans: count });
      }
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
      data: { name: "مقهى الواحة", slug: "al-waha-cafe", description: "قهوة ومشروبات وحلويات ليبية", phone: "+218911111111", whatsapp: "218911111111", workingHours: "8:00 صباحاً - 12:00 منتصف الليل", planId: freePlan?.id || null },
    });
    await prisma.user.create({ data: { username: "waha", password: hashPassword("waha123"), name: "مالك مقهى الواحة", role: "owner", restaurantId: r1.id, planId: freePlan?.id || null } });

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

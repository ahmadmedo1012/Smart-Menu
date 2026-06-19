import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0) return Response.json({ message: "already seeded", plans: existing });

    // Create plans - only Free + Premium
    const freePlan = await prisma.subscriptionPlan.create({
      data: { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 0, features: JSON.stringify(["منيو رقمي واحد", "10 أصناف كحد أقصى", "طلبات واتساب", "إحصائيات أساسية"]) },
    });
    const premiumPlan = await prisma.subscriptionPlan.create({
      data: { name: "Premium", nameAr: "بريميوم", price: 19, periodDays: 30, maxMenus: 3, maxItems: 9999, maxOrders: 99999, sortOrder: 1, features: JSON.stringify(["منيو رقمي", "أصناف غير محدودة", "طلبات غير محدودة", "برنامج ولاء", "إحصائيات متقدمة", "QR كود مخصص", "شعار المطعم", "تخصيص الألوان", "دعم فني فوري", "بدون إعلانات"]) },
    });

    // Admin user
    await prisma.user.create({ data: { username: "admin", password: "admin123", name: "مدير النظام", role: "admin" } });

    // Demo restaurant: مقهى الواحة
    const r1 = await prisma.restaurant.create({
      data: {
        name: "مقهى الواحة", slug: "al-waha-cafe",
        description: "قهوة ومشروبات وحلويات ليبية",
        phone: "+218911111111", whatsapp: "218911111111",
        workingHours: "8:00 صباحاً - 12:00 منتصف الليل",
        planId: freePlan.id,
      },
    });
    await prisma.user.create({ data: { username: "waha", password: "waha123", name: "مالك مقهى الواحة", role: "owner", restaurantId: r1.id, planId: freePlan.id } });

    const cat = await prisma.menuCategory.create({ data: { name: "مشروبات ساخنة", icon: "☕", sortOrder: 1, restaurantId: r1.id } });
    await prisma.menuItem.createMany({ data: [
      { name: "قهوة تركي", price: 3, categoryId: cat.id, sortOrder: 1 },
      { name: "كابتشينو", price: 5, categoryId: cat.id, sortOrder: 2 },
      { name: "شاي", price: 2, categoryId: cat.id, sortOrder: 3 },
    ]});

    return Response.json({ message: "seeded successfully" });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

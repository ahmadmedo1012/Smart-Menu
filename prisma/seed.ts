import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean
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
  console.log("  Cleaned existing data");

  // Subscription Plans
  const freePlan = await prisma.subscriptionPlan.create({
    data: { name: "Free", nameAr: "مجاني", price: 0, periodDays: 0, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: JSON.stringify(["منيو رقمي واحد", "10 أصناف كحد أقصى", "طلبات واتساب", "إحصائيات أساسية"]) },
  });
  const basicPlan = await prisma.subscriptionPlan.create({
    data: { name: "Basic", nameAr: "أساسي", price: 49, periodDays: 30, maxMenus: 1, maxItems: 50, maxOrders: 500, sortOrder: 2, features: JSON.stringify(["منيو رقمي", "50 صنف كحد أقصى", "طلبات واتساب", "برنامج ولاء", "تقرير شهري", "دعم فني"]) },
  });
  const proPlan = await prisma.subscriptionPlan.create({
    data: { name: "Pro", nameAr: "احترافي", price: 129, periodDays: 30, maxMenus: 3, maxItems: 200, maxOrders: 2000, sortOrder: 3, features: JSON.stringify(["حتى 3 منيوهات", "200 صنف كحد أقصى", "طلبات واتساب", "برنامج ولاء متقدم", "إحصائيات متقدمة", "QR كود مخصص", "دعم فني فوري", "تخصيص الألوان والشعار"]) },
  });
  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: { name: "Enterprise", nameAr: "شركات", price: 299, periodDays: 30, maxMenus: 10, maxItems: 9999, maxOrders: 99999, sortOrder: 4, features: JSON.stringify(["منيوهات غير محدودة", "أصناف غير محدودة", "طلبات غير محدودة", "برنامج ولاء كامل", "لوحة تحكم متقدمة", "API مخصص", "دعم فني على مدار الساعة", "استضافة مفضلة", "تطبيق ويب مخصص"]) },
  });
  console.log("  Subscription plans created: 4");

  // Admin
  await prisma.user.create({
    data: { username: "admin", password: "admin123", name: "مدير النظام", role: "admin" },
  });
  console.log("  Admin user created");

  // ---- Restaurant 1: مقهى الواحة ----
  const r1 = await prisma.restaurant.create({
    data: {
      name: "مقهى الواحة",
      slug: "al-waha-cafe",
      description: "مقهى ومطعم يقدم أشهى المشروبات والحلويات والوجبات الخفيفة",
      phone: "+218911111111",
      whatsapp: "218911111111",
      workingHours: "8:00 صباحاً - 12:00 منتصف الليل",
    },
  });

  const [r1Cat1, r1Cat2, r1Cat3, r1Cat4] = await prisma.$transaction([
    prisma.menuCategory.create({ data: { name: "مشروبات ساخنة", icon: "coffee", sortOrder: 1, restaurantId: r1.id } }),
    prisma.menuCategory.create({ data: { name: "مشروبات باردة", icon: "wine", sortOrder: 2, restaurantId: r1.id } }),
    prisma.menuCategory.create({ data: { name: "حلويات", icon: "cake", sortOrder: 3, restaurantId: r1.id } }),
    prisma.menuCategory.create({ data: { name: "وجبات خفيفة", icon: "utensils", sortOrder: 4, restaurantId: r1.id } }),
  ]);

  await prisma.menuItem.createMany({ data: [
    { name: "قهوة تركي", price: 3, categoryId: r1Cat1.id, sortOrder: 1 },
    { name: "إسبريسو", price: 4, categoryId: r1Cat1.id, sortOrder: 2 },
    { name: "كابتشينو", price: 5, categoryId: r1Cat1.id, sortOrder: 3 },
    { name: "شاي", price: 2, categoryId: r1Cat1.id, sortOrder: 4 },
    { name: "ليموناضة", price: 4, categoryId: r1Cat2.id, sortOrder: 1 },
    { name: "سموثي", price: 6, categoryId: r1Cat2.id, sortOrder: 2 },
    { name: "موهيتو", price: 5, categoryId: r1Cat2.id, sortOrder: 3 },
    { name: "آيس كوفي", price: 5, categoryId: r1Cat2.id, sortOrder: 4 },
    { name: "تشيز كيك", price: 7, categoryId: r1Cat3.id, sortOrder: 1 },
    { name: "كنافة", price: 6, categoryId: r1Cat3.id, sortOrder: 2 },
    { name: "كريب", price: 5, categoryId: r1Cat3.id, sortOrder: 3 },
    { name: "بسبوسة", price: 4, categoryId: r1Cat3.id, sortOrder: 4 },
    { name: "ساندويتش", price: 5, categoryId: r1Cat4.id, sortOrder: 1 },
    { name: "بطاطس مقلية", price: 3, categoryId: r1Cat4.id, sortOrder: 2 },
    { name: "سلطة", price: 4, categoryId: r1Cat4.id, sortOrder: 3 },
    { name: "برجر", price: 7, categoryId: r1Cat4.id, sortOrder: 4 },
  ]});
  console.log("  مقهى الواحة created");

  // ---- Restaurant 2: مطعم الأصيل ----
  const r2 = await prisma.restaurant.create({
    data: {
      name: "مطعم الأصيل",
      slug: "al-aseel",
      description: "مأكولات ليبية تقليدية أصيلة",
      phone: "+218922222222",
      whatsapp: "218922222222",
      workingHours: "12:00 ظهراً - 11:00 مساءً",
    },
  });

  const [r2Cat1, r2Cat2] = await prisma.$transaction([
    prisma.menuCategory.create({ data: { name: "أطباق رئيسية", icon: "utensils", sortOrder: 1, restaurantId: r2.id } }),
    prisma.menuCategory.create({ data: { name: "مقبلات", icon: "wine", sortOrder: 2, restaurantId: r2.id } }),
  ]);

  await prisma.menuItem.createMany({ data: [
    { name: "بازين", price: 12, categoryId: r2Cat1.id, sortOrder: 1 },
    { name: "مبكبكة", price: 8, categoryId: r2Cat1.id, sortOrder: 2 },
    { name: "كُسكُسي", price: 10, categoryId: r2Cat1.id, sortOrder: 3 },
    { name: "شربة", price: 3, categoryId: r2Cat2.id, sortOrder: 1 },
    { name: "بريك", price: 4, categoryId: r2Cat2.id, sortOrder: 2 },
  ]});
  console.log("  مطعم الأصيل created");

  // ---- Restaurant 3: بيتزا روما ----
  const r3 = await prisma.restaurant.create({
    data: {
      name: "بيتزا روما",
      slug: "pizza-roma",
      description: "بيتزا إيطالية طازجة بالمكونات الليبية",
      phone: "+218933333333",
      whatsapp: "218933333333",
      workingHours: "5:00 مساءً - 12:00 منتصف الليل",
    },
  });

  const [r3Cat1, r3Cat2] = await prisma.$transaction([
    prisma.menuCategory.create({ data: { name: "بيتزا", icon: "utensils", sortOrder: 1, restaurantId: r3.id } }),
    prisma.menuCategory.create({ data: { name: "مشروبات", icon: "wine", sortOrder: 2, restaurantId: r3.id } }),
  ]);

  await prisma.menuItem.createMany({ data: [
    { name: "بيتزا مارغريتا", price: 8, categoryId: r3Cat1.id, sortOrder: 1 },
    { name: "بيتزا بيبروني", price: 10, categoryId: r3Cat1.id, sortOrder: 2 },
    { name: "بيتزا خضار", price: 9, categoryId: r3Cat1.id, sortOrder: 3 },
    { name: "كوكاكولا", price: 2, categoryId: r3Cat2.id, sortOrder: 1 },
    { name: "عصير طازج", price: 4, categoryId: r3Cat2.id, sortOrder: 2 },
  ]});
  console.log("  بيتزا روما created");

  // Restaurant owners
  await prisma.user.create({ data: { username: "waha", password: "waha123", name: "مالك مقهى الواحة", role: "owner", restaurantId: r1.id } });
  await prisma.user.create({ data: { username: "aseel", password: "aseel123", name: "مالك مطعم الأصيل", role: "owner", restaurantId: r2.id } });
  await prisma.user.create({ data: { username: "roma", password: "roma123", name: "مالك بيتزا روما", role: "owner", restaurantId: r3.id } });
  console.log("  Restaurant owners created");

  // Sample orders
  const r1Items = await prisma.menuItem.findMany({ where: { category: { restaurantId: r1.id } } });
  if (r1Items.length > 0) {
    await prisma.order.create({
      data: {
        orderNo: "ORD-001", customerName: "أحمد محمد", customerPhone: "218911111111",
        notes: "بدون سكر", pickupType: "inside", status: "completed",
        subtotal: 8, total: 8, restaurantId: r1.id,
        items: { create: [
          { quantity: 2, price: 3, itemId: r1Items[0].id },
          { quantity: 1, price: 2, itemId: r1Items[3].id },
        ]},
      },
    });
    await prisma.order.create({
      data: {
        orderNo: "ORD-002", customerName: "سارة خالد", customerPhone: "218922222222",
        pickupType: "takeaway", status: "preparing",
        subtotal: 18, total: 18, restaurantId: r1.id,
        items: { create: [
          { quantity: 1, price: 5, itemId: r1Items[2].id },
          { quantity: 1, price: 7, itemId: r1Items[8].id },
          { quantity: 1, price: 6, itemId: r1Items[9].id },
        ]},
      },
    });
  }

  console.log("  Sample orders created");

  // Loyalty cards
  const card1 = await prisma.loyaltyCard.create({
    data: {
      customerPhone: "218911111111", customerName: "أحمد محمد",
      totalOrders: 3, totalSpent: 22, points: 22, tier: "bronze",
      referralCode: "ALWAHA001", restaurantId: r1.id,
    },
  });
  await prisma.loyaltyCard.create({
    data: {
      customerPhone: "218922222222", customerName: "سارة خالد",
      totalOrders: 1, totalSpent: 18, points: 18, tier: "bronze",
      referralCode: "ALWAHA002", restaurantId: r1.id,
    },
  });

  // Referrals
  await prisma.referral.createMany({ data: [
    { referralCode: "ALWAHA001", referrerId: card1.id, referredPhone: "218922222222", referredName: "سارة خالد", status: "converted", discountPercent: 10, referrerRewardPct: 10 },
    { referralCode: "ALWAHA001", referrerId: card1.id, referredPhone: "218922222222", referredName: "سارة خالد", status: "pending", discountPercent: 10, referrerRewardPct: 10 },
  ]});

  await prisma.rewardTransaction.createMany({ data: [
    { cardId: card1.id, type: "earn", points: 10, description: "مكافأة ترحيبية", restaurantId: r1.id },
    { cardId: card1.id, type: "earn", points: 5, description: "مكافأة طلب رقم 1", restaurantId: r1.id },
  ]});

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

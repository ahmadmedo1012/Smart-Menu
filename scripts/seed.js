const path = require('path');

// Try multiple possible paths for the generated Prisma client
function loadPrisma() {
  const candidates = [
    path.join(process.cwd(), 'src', 'generated', 'prisma', 'client'),
    path.join(process.cwd(), 'generated', 'prisma', 'client'),
    path.join(__dirname, '..', 'src', 'generated', 'prisma', 'client'),
    path.join(__dirname, '..', '..', 'src', 'generated', 'prisma', 'client'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error("Cannot find PrismaClient. Tried:\n" + candidates.join('\n'));
}

const { PrismaClient } = loadPrisma();
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const existing = await prisma.subscriptionPlan.count();
  if (existing > 0) { console.log("Already seeded"); return; }

  await prisma.subscriptionPlan.createMany({ data: [
    { name: "Free", nameAr: "مجاني", price: 0, maxMenus: 1, maxItems: 10, maxOrders: 100, sortOrder: 1, features: JSON.stringify(["منيو رقمي واحد", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"]) },
    { name: "Basic", nameAr: "أساسي", price: 49, maxMenus: 1, maxItems: 50, maxOrders: 500, sortOrder: 2, features: JSON.stringify(["منيو رقمي", "50 صنف", "طلبات واتساب", "برنامج ولاء", "تقرير شهري", "دعم فني"]) },
    { name: "Pro", nameAr: "احترافي", price: 129, maxMenus: 3, maxItems: 200, maxOrders: 2000, sortOrder: 3, features: JSON.stringify(["حتى 3 منيوهات", "200 صنف", "طلبات واتساب", "ولاء متقدم", "إحصائيات متقدمة", "QR كود مخصص", "دعم فوري", "تخصيص"]) },
    { name: "Enterprise", nameAr: "شركات", price: 299, maxMenus: 10, maxItems: 9999, maxOrders: 99999, sortOrder: 4, features: JSON.stringify(["منيوهات غير محدودة", "أصناف غير محدودة", "طلبات غير محدودة", "ولاء كامل", "API مخصص", "دعم 24/7"]) },
  ]});
  
  await prisma.user.create({ data: { username: "admin", password: "admin123", name: "مدير النظام", role: "admin" } });
  
  const plan = await prisma.subscriptionPlan.findFirst({ where: { name: "Free" } });
  const r1 = await prisma.restaurant.create({ data: { name: "مقهى الواحة", slug: "al-waha-cafe", description: "قهوة ومشروبات وحلويات", phone: "+218911111111", whatsapp: "218911111111", workingHours: "8:00 صباحاً - 12:00 منتصف الليل", planId: plan?.id || null } });
  await prisma.user.create({ data: { username: "waha", password: "waha123", name: "مالك مقهى الواحة", role: "owner", restaurantId: r1.id } });
  
  const cat = await prisma.menuCategory.create({ data: { name: "مشروبات ساخنة", icon: "☕", sortOrder: 1, restaurantId: r1.id } });
  await prisma.menuItem.createMany({ data: [
    { name: "قهوة تركي", price: 3, categoryId: cat.id, sortOrder: 1 },
    { name: "كابتشينو", price: 5, categoryId: cat.id, sortOrder: 2 },
    { name: "شاي", price: 2, categoryId: cat.id, sortOrder: 3 },
  ]});
  
  console.log("Seeding complete!");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

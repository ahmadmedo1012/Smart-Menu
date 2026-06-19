const path = require('path');
const fs = require('fs');

// Find PrismaClient by searching the filesystem
function findPrismaClient() {
  const searchDirs = [
    process.cwd(),
    path.join(process.cwd(), 'src'),
    path.join(process.cwd(), '.next', 'standalone'),
    path.join(process.cwd(), '.next', 'standalone', 'src'),
    __dirname,
    path.join(__dirname, '..'),
    path.join(__dirname, '..', '..'),
    '/opt/render/project/src',
    '/opt/render/project/src/src',
  ];
  
  for (const base of searchDirs) {
    // The generated client is at {base}/src/generated/prisma/client or {base}/generated/prisma/client
    for (const subdir of ['', 'src']) {
      for (const depth of ['generated/prisma/client', 'generated/prisma/index.js', 'generated/prisma/index.mjs']) {
        const fp = path.join(base, subdir, depth);
        if (fs.existsSync(fp)) {
          try { return require(fp); } catch {}
        }
      }
    }
  }
  
  // Last resort: print debug info
  console.error("Search dirs:", searchDirs);
  console.error("cwd:", process.cwd());
  console.error("__dirname:", __dirname);
  fs.readdirSync(process.cwd()).forEach(f => console.error("  root:", f));
  try { fs.readdirSync(path.join(process.cwd(), 'src')).forEach(f => console.error("  src:", f)); } catch {}
  throw new Error("Cannot find PrismaClient module");
}

const { PrismaClient } = findPrismaClient();
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
  
  await prisma.user.createMany({ data: [
    { username: "admin", password: "admin123", name: "مدير النظام", role: "admin" },
  ]});
  
  const freePlan = await prisma.subscriptionPlan.findFirst({ where: { name: "Free" } });
  const r1 = await prisma.restaurant.create({ data: { name: "مقهى الواحة", slug: "al-waha-cafe", description: "قهوة ومشروبات وحلويات", phone: "+218911111111", whatsapp: "218911111111", workingHours: "8:00 صباحاً - 12:00 منتصف الليل", planId: freePlan?.id || null } });
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

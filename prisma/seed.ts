import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: process.env["DATABASE_URL"] ?? "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data in dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.whatsappTemplate.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
  console.log("  Cleaned existing data");

  // 1. Admin user
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: "admin123",
      name: "مدير النظام",
      role: "admin",
    },
  });
  console.log("  Admin user created:", admin.username);

  // 2. Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "مقهى الواحة",
      slug: "al-waha-cafe",
      description: "مقهى ومطعم يقدم أشهى المشروبات والحلويات والوجبات الخفيفة",
      phone: "+966500000000",
      whatsapp: "966500000000",
      email: "info@alwahacafe.com",
      address: "الرياض، المملكة العربية السعودية",
      workingHours: "٨:٠٠ صباحاً - ١٢:٠٠ منتصف الليل",
      themeColor: "amber",
    },
  });
  console.log("  Restaurant created:", restaurant.name);

  // 3. Categories
  const [hotDrinks, coldDrinks, sweets, snacks] = await prisma.$transaction([
    prisma.menuCategory.create({
      data: { name: "مشروبات ساخنة", nameAr: "مشروبات ساخنة", icon: "coffee", sortOrder: 1, restaurantId: restaurant.id },
    }),
    prisma.menuCategory.create({
      data: { name: "مشروبات باردة", nameAr: "مشروبات باردة", icon: "wine", sortOrder: 2, restaurantId: restaurant.id },
    }),
    prisma.menuCategory.create({
      data: { name: "حلويات", nameAr: "حلويات", icon: "cake", sortOrder: 3, restaurantId: restaurant.id },
    }),
    prisma.menuCategory.create({
      data: { name: "وجبات خفيفة", nameAr: "وجبات خفيفة", icon: "utensils", sortOrder: 4, restaurantId: restaurant.id },
    }),
  ]);
  console.log("  Categories created:", 4);

  // 4. Menu items
  const items = await prisma.$transaction([
    // مشروبات ساخنة
    prisma.menuItem.create({ data: { name: "قهوة تركي", nameAr: "قهوة تركي", price: 8, categoryId: hotDrinks.id, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { name: "إسبريسو", nameAr: "إسبريسو", price: 10, categoryId: hotDrinks.id, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { name: "كابتشينو", nameAr: "كابتشينو", price: 14, categoryId: hotDrinks.id, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { name: "شاي", nameAr: "شاي", price: 6, categoryId: hotDrinks.id, sortOrder: 4 } }),
    // مشروبات باردة
    prisma.menuItem.create({ data: { name: "ليموناضة", nameAr: "ليموناضة", price: 10, categoryId: coldDrinks.id, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { name: "سموثي", nameAr: "سموثي", price: 16, categoryId: coldDrinks.id, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { name: "موهيتو", nameAr: "موهيتو", price: 12, categoryId: coldDrinks.id, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { name: "آيس كوفي", nameAr: "آيس كوفي", price: 15, categoryId: coldDrinks.id, sortOrder: 4 } }),
    // حلويات
    prisma.menuItem.create({ data: { name: "تشيز كيك", nameAr: "تشيز كيك", price: 18, categoryId: sweets.id, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { name: "كنافة", nameAr: "كنافة", price: 16, categoryId: sweets.id, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { name: "كريب", nameAr: "كريب", price: 14, categoryId: sweets.id, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { name: "بسبوسة", nameAr: "بسبوسة", price: 12, categoryId: sweets.id, sortOrder: 4 } }),
    // وجبات خفيفة
    prisma.menuItem.create({ data: { name: "ساندويتش", nameAr: "ساندويتش", price: 12, categoryId: snacks.id, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { name: "بطاطس مقلية", nameAr: "بطاطس مقلية", price: 8, categoryId: snacks.id, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { name: "سلطة", nameAr: "سلطة", price: 10, categoryId: snacks.id, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { name: "برجر", nameAr: "برجر", price: 18, categoryId: snacks.id, sortOrder: 4 } }),
  ]);
  console.log("  Menu items created:", items.length);

  // 5. Settings
  await prisma.$transaction([
    prisma.setting.create({ data: { key: "currency", value: "SAR", restaurantId: restaurant.id } }),
    prisma.setting.create({ data: { key: "language", value: "ar", restaurantId: restaurant.id } }),
    prisma.setting.create({ data: { key: "tax_rate", value: "15", restaurantId: restaurant.id } }),
    prisma.setting.create({ data: { key: "pickup_types", value: "inside,outside,delivery", restaurantId: restaurant.id } }),
  ]);
  console.log("  Settings created");

  // 6. Sample orders
  const [coffee, , cappuccino, tea, , , , , cheesecake, kunafa, , , sandwich, fries] = items;

  await prisma.$transaction([
    prisma.order.create({
      data: {
        orderNo: "ORD-001", customerName: "أحمد محمد", customerPhone: "966501234567",
        notes: "بدون سكر", pickupType: "inside", status: "completed",
        subtotal: 22, total: 22, restaurantId: restaurant.id,
        items: { create: [
          { quantity: 2, price: 8, itemId: coffee.id },
          { quantity: 1, price: 6, itemId: tea.id },
        ]},
      },
    }),
    prisma.order.create({
      data: {
        orderNo: "ORD-002", customerName: "سارة خالد", customerPhone: "966509876543",
        notes: "", pickupType: "outside", status: "preparing",
        subtotal: 48, total: 48, restaurantId: restaurant.id,
        items: { create: [
          { quantity: 1, price: 14, itemId: cappuccino.id },
          { quantity: 1, price: 18, itemId: cheesecake.id },
          { quantity: 1, price: 16, itemId: kunafa.id },
        ]},
      },
    }),
    prisma.order.create({
      data: {
        orderNo: "ORD-003", customerName: "فيصل عمر", customerPhone: "966507654321",
        notes: "خبز محمص", pickupType: "delivery", status: "new",
        subtotal: 20, total: 20, restaurantId: restaurant.id,
        items: { create: [
          { quantity: 1, price: 12, itemId: sandwich.id },
          { quantity: 1, price: 8, itemId: fries.id },
        ]},
      },
    }),
  ]);
  console.log("  Sample orders created: 3");

  // 7. WhatsApp template
  await prisma.whatsappTemplate.create({
    data: {
      name: "default",
      template: `مرحباً {customerName}!\n\nتم تأكيد طلبك رقم {orderNo} في {restaurantName}.\n\nالطلبات:\n{items}\n\nالمجموع: {total} ريال\nنوع الاستلام: {pickupType}\n\nشكراً لطلبك! 🎉`,
      isActive: true, restaurantId: restaurant.id,
    },
  });
  console.log("  WhatsApp template created");

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

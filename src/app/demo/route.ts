import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { hashPassword } from "@/lib/hash";

export async function GET() {
  // Block demo route in production — safety guard
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  // Upsert demo owner user so it works on any DB (production or local)
  let user = await prisma.user.upsert({
    where: { username: "waha" },
    update: {},
    create: {
      username: "waha",
      password: hashPassword("waha123"),
      name: "مقهى الواحة",
      role: "owner",
      subscriptionStatus: "PAID",
    },
  });

  // Upsert demo restaurant if not linked
  if (!user.restaurantId) {
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: "al-waha-cafe" },
      update: {},
      create: {
        name: "مقهى الواحة",
        slug: "al-waha-cafe",
        phone: "0910089975",
        whatsapp: "0910089975",
        isActive: true,
      },
    });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { restaurantId: restaurant.id },
    });
  }

  // Self-healing: ensure demo restaurant has categories and menu items
  const cats = await prisma.menuCategory.findMany({
    where: { restaurantId: user.restaurantId! },
  });
  if (cats.length === 0) {
    const [hot, cold, sweets, snacks] = await prisma.$transaction([
      prisma.menuCategory.create({ data: { name: "مشروبات ساخنة", icon: "☕", sortOrder: 1, restaurantId: user.restaurantId! } }),
      prisma.menuCategory.create({ data: { name: "مشروبات باردة", icon: "🧃", sortOrder: 2, restaurantId: user.restaurantId! } }),
      prisma.menuCategory.create({ data: { name: "حلويات", icon: "🍰", sortOrder: 3, restaurantId: user.restaurantId! } }),
      prisma.menuCategory.create({ data: { name: "وجبات خفيفة", icon: "🍔", sortOrder: 4, restaurantId: user.restaurantId! } }),
    ]);
    await prisma.menuItem.createMany({ data: [
      { name: "قهوة تركي", price: 3, categoryId: hot.id, sortOrder: 1, image: "https://images.unsplash.com/photo-1559491928-b6b03e9d8485?w=400&q=85" },
      { name: "إسبريسو", price: 4, categoryId: hot.id, sortOrder: 2, image: "https://images.unsplash.com/photo-1717269944314-d70b12b80e67?w=400&q=85" },
      { name: "كابتشينو", price: 5, categoryId: hot.id, sortOrder: 3, image: "https://images.unsplash.com/photo-1559499147-c76f6b3671e2?w=400&q=85" },
      { name: "شاي", price: 2, categoryId: hot.id, sortOrder: 4, image: "https://images.unsplash.com/photo-1571934825821-5c2f3d7a1c9c?w=400&q=85" },
      { name: "ليموناضة", price: 4, categoryId: cold.id, sortOrder: 1, image: "https://images.unsplash.com/photo-1621263635-1f5b2d6f8c5d?w=400&q=85" },
      { name: "سموثي", price: 6, categoryId: cold.id, sortOrder: 2, image: "https://images.unsplash.com/photo-1553530661-c2d1a3e8e1b9?w=400&q=85" },
      { name: "موهيتو", price: 5, categoryId: cold.id, sortOrder: 3, image: "https://images.unsplash.com/photo-1551536221-f47c0f5f8e9d?w=400&q=85" },
      { name: "آيس كوفي", price: 5, categoryId: cold.id, sortOrder: 4, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85" },
      { name: "تشيز كيك", price: 7, categoryId: sweets.id, sortOrder: 1, image: "https://images.unsplash.com/photo-1559339351-5d4b7c5e2f8d?w=400&q=85" },
      { name: "كنافة", price: 6, categoryId: sweets.id, sortOrder: 2, image: "https://images.unsplash.com/photo-1579631552-1c4a1c8e9f0d?w=400&q=85" },
      { name: "كريب", price: 5, categoryId: sweets.id, sortOrder: 3, image: "https://images.unsplash.com/photo-1559054359-8b3f5b2a1c0d?w=400&q=85" },
      { name: "بسبوسة", price: 4, categoryId: sweets.id, sortOrder: 4, image: "https://images.unsplash.com/photo-1580914567-b68f8d7e3e9c?w=400&q=85" },
      { name: "ساندويتش", price: 5, categoryId: snacks.id, sortOrder: 1, image: "https://images.unsplash.com/photo-1550506432-6d2c6c9b5e3d?w=400&q=85" },
      { name: "بطاطس مقلية", price: 3, categoryId: snacks.id, sortOrder: 2, image: "https://images.unsplash.com/photo-1573080161-8c4a5b6d7e8f?w=400&q=85" },
      { name: "سلطة", price: 4, categoryId: snacks.id, sortOrder: 3, image: "https://images.unsplash.com/photo-1540189549-8c9b3a1d5e7f?w=400&q=85" },
      { name: "برجر", price: 7, categoryId: snacks.id, sortOrder: 4, image: "https://images.unsplash.com/photo-1568902115-7b9f2a1c8e4d?w=400&q=85" },
    ]});
  }

  // Self-healing: add images to existing items that lack them
  const itemsNoImg = await prisma.menuItem.findMany({
    where: { category: { restaurantId: user.restaurantId! }, image: "" },
  });
  if (itemsNoImg.length > 0) {
    const imageMap: Record<string, string> = {
      "قهوة تركي": "https://images.unsplash.com/photo-1559491928-b6b03e9d8485?w=400&q=85",
      "إسبريسو": "https://images.unsplash.com/photo-1717269944314-d70b12b80e67?w=400&q=85",
      "كابتشينو": "https://images.unsplash.com/photo-1559499147-c76f6b3671e2?w=400&q=85",
      "شاي": "https://images.unsplash.com/photo-1571934825821-5c2f3d7a1c9c?w=400&q=85",
      "ليموناضة": "https://images.unsplash.com/photo-1621263635-1f5b2d6f8c5d?w=400&q=85",
      "سموثي": "https://images.unsplash.com/photo-1553530661-c2d1a3e8e1b9?w=400&q=85",
      "موهيتو": "https://images.unsplash.com/photo-1551536221-f47c0f5f8e9d?w=400&q=85",
      "آيس كوفي": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85",
      "تشيز كيك": "https://images.unsplash.com/photo-1559339351-5d4b7c5e2f8d?w=400&q=85",
      "كنافة": "https://images.unsplash.com/photo-1579631552-1c4a1c8e9f0d?w=400&q=85",
      "كريب": "https://images.unsplash.com/photo-1559054359-8b3f5b2a1c0d?w=400&q=85",
      "بسبوسة": "https://images.unsplash.com/photo-1580914567-b68f8d7e3e9c?w=400&q=85",
      "ساندويتش": "https://images.unsplash.com/photo-1550506432-6d2c6c9b5e3d?w=400&q=85",
      "بطاطس مقلية": "https://images.unsplash.com/photo-1573080161-8c4a5b6d7e8f?w=400&q=85",
      "سلطة": "https://images.unsplash.com/photo-1540189549-8c9b3a1d5e7f?w=400&q=85",
      "برجر": "https://images.unsplash.com/photo-1568902115-7b9f2a1c8e4d?w=400&q=85",
    };
    for (const item of itemsNoImg) {
      const img = imageMap[item.name];
      if (img) await prisma.menuItem.update({ where: { id: item.id }, data: { image: img } });
    }
  }

  const redirectUrl = new URL("/owner", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000");
  const response = NextResponse.redirect(redirectUrl);

  // Create server-side session (primary auth)
  await createSession(user.id);

  if (user.restaurantId) {
    response.cookies.set("smart-menu-restaurant", String(user.restaurantId), { httpOnly: true, secure: process.env.NODE_ENV !== "development", sameSite: "lax", path: "/", maxAge: 60 * 60 * 2 });
  }

  return response;
}

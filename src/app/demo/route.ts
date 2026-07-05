import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { hashPassword } from "@/lib/hash";

export async function GET() {
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
      { name: "قهوة تركي", price: 3, categoryId: hot.id, sortOrder: 1 },
      { name: "إسبريسو", price: 4, categoryId: hot.id, sortOrder: 2 },
      { name: "كابتشينو", price: 5, categoryId: hot.id, sortOrder: 3 },
      { name: "شاي", price: 2, categoryId: hot.id, sortOrder: 4 },
      { name: "ليموناضة", price: 4, categoryId: cold.id, sortOrder: 1 },
      { name: "سموثي", price: 6, categoryId: cold.id, sortOrder: 2 },
      { name: "موهيتو", price: 5, categoryId: cold.id, sortOrder: 3 },
      { name: "آيس كوفي", price: 5, categoryId: cold.id, sortOrder: 4 },
      { name: "تشيز كيك", price: 7, categoryId: sweets.id, sortOrder: 1 },
      { name: "كنافة", price: 6, categoryId: sweets.id, sortOrder: 2 },
      { name: "كريب", price: 5, categoryId: sweets.id, sortOrder: 3 },
      { name: "بسبوسة", price: 4, categoryId: sweets.id, sortOrder: 4 },
      { name: "ساندويتش", price: 5, categoryId: snacks.id, sortOrder: 1 },
      { name: "بطاطس مقلية", price: 3, categoryId: snacks.id, sortOrder: 2 },
      { name: "سلطة", price: 4, categoryId: snacks.id, sortOrder: 3 },
      { name: "برجر", price: 7, categoryId: snacks.id, sortOrder: 4 },
    ]});
  }

  const redirectUrl = new URL("/owner", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000");
  const response = NextResponse.redirect(redirectUrl);

  // Create server-side session (primary auth)
  await createSession(user.id);

  // Cookie-based auth (backward compat)
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 2,
  };

  response.cookies.set("smart-menu-auth", "true", cookieOpts);
  response.cookies.set("smart-menu-role", user.role, cookieOpts);
  if (user.restaurantId) {
    response.cookies.set("smart-menu-restaurant", String(user.restaurantId), cookieOpts);
  }

  return response;
}

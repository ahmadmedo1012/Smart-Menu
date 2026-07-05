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

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { username: "waha" } });

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000"));
  }

  const cookieStore = await cookies();
  cookieStore.set("smart-menu-auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  cookieStore.set("smart-menu-role", user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  if (user.restaurantId) {
    cookieStore.set("smart-menu-restaurant", String(user.restaurantId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2,
    });
  }

  return NextResponse.redirect(new URL("/owner", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000"));
}

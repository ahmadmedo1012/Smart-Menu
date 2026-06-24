import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000"));
  }

  const user = await prisma.user.findUnique({ where: { username: "waha" } });

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000"));
  }

  const redirectUrl = new URL("/owner", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000");
  const response = NextResponse.redirect(redirectUrl);

  await createSession(user.id);

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

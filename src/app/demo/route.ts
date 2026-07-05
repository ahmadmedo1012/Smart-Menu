import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function GET() {
  const user = await prisma.user.findFirst({ where: { role: "owner" }, orderBy: { id: "asc" } });

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000"));
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPrefixes = [
  "/_next",
  "/api/auth",
  "/login",
  "/menu",
  "/cart",
  "/order-confirmed",
  "/favicon.ico",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes (non-auth) — allow through
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Admin routes — check auth cookie
  const authCookie = request.cookies.get("smart-menu-auth");
  if (authCookie?.value !== "true") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

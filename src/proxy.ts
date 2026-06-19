import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPrefixes = [
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/api/auth",
  "/login",
  "/menu",
  "/cart",
  "/order-confirmed",
  "/pricing",
  "/subscribe",
  "/demo",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Other API routes — allow through
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Root page — allow through
  if (pathname === "/") {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("smart-menu-auth");
  const roleCookie = request.cookies.get("smart-menu-role");
  const isAuthenticated = authCookie?.value === "true";
  const role = roleCookie?.value;

  // Admin routes — require auth + role=admin
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated || role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Owner routes — require auth + role=owner
  if (pathname.startsWith("/owner")) {
    if (!isAuthenticated || role !== "owner") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // All other routes — require auth
  if (!isAuthenticated) {
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

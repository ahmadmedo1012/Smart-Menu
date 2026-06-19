import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPrefixes = [
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/uploads",        // images
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

  // No-cache headers for customer-facing pages so changes appear instantly
  const response = NextResponse.next();
  if (
    pathname.startsWith("/menu/") ||
    pathname === "/menu" ||
    pathname === "/cart" ||
    pathname === "/order-confirmed" ||
    pathname.startsWith("/api/")
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // Public paths — no auth needed
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Other API routes — allow through
  if (pathname.startsWith("/api")) {
    return response;
  }

  // Root page — allow through
  if (pathname === "/") {
    return response;
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

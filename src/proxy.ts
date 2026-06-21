import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPrefixes = [
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/uploads",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
  "/api/auth",
  "/login",
  "/menu",
  "/cart",
  "/order-confirmed",
  "/pricing",
  "/subscribe",
  "/demo",
];

// Ponytail: simple in-memory rate limiter, use Redis if scaling
const rateLimit = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW = 60_000;
const RATE_MAX = 120;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ponytail: IP-based rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const response = NextResponse.next();

  // 🚫 No cache — everything is real-time, always fresh
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

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

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated || role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/owner")) {
    if (!isAuthenticated || role !== "owner") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|icon-192\.svg|icon-512\.svg).*)",
  ],
};

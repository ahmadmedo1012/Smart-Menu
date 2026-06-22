import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CSRF_COOKIE, CSRF_HEADER, generateToken, validateToken } from "./src/lib/csrf";
// ponytail: src/proxy.ts is deprecated — middleware.ts is the canonical source

const publicPrefixes = [
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/uploads",
  "/fonts",
  "/sw.js",
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
  "/api/orders",
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

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Public paths and static files — skip all checks, just set CSRF cookie
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    const resp = NextResponse.next();
    if (!request.cookies.get(CSRF_COOKIE)?.value) {
      resp.cookies.set(CSRF_COOKIE, generateToken(), {
        path: "/", httpOnly: false, sameSite: "lax",
        secure: process.env.NODE_ENV === "production", maxAge: 60 * 60,
      });
    }
    return resp;
  }
  if (pathname === "/") {
    const resp = NextResponse.next();
    if (!request.cookies.get(CSRF_COOKIE)?.value) {
      resp.cookies.set(CSRF_COOKIE, generateToken(), {
        path: "/", httpOnly: false, sameSite: "lax",
        secure: process.env.NODE_ENV === "production", maxAge: 60 * 60,
      });
    }
    return resp;
  }

  // Ponytail: IP-based rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=()");

  // 🚫 No cache — everything is real-time, always fresh
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

  // CSRF: set cookie on any request that doesn't have one yet
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generateToken(), {
      path: "/", httpOnly: false, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", maxAge: 60 * 60,
    });
  }

  // API routes — CSRF validation only (APIs handle their own auth)
  if (pathname.startsWith("/api")) {
    if (!SAFE_METHODS.has(method)) {
      const header = request.headers.get(CSRF_HEADER);
      const cookie = request.cookies.get(CSRF_COOKIE)?.value;
      if (!validateToken(header, cookie)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
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
    return response;
  }

  if (pathname.startsWith("/owner")) {
    if (!isAuthenticated || role !== "owner") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|icon-192\\.svg|icon-512\\.svg).*)",
  ],
};

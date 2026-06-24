import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

function generateToken(): string {
  try {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function validateToken(h: string | null | undefined, c: string | null | undefined): boolean {
  return !!h && !!c && h === c;
}

const publicPrefixes = [
  "/_next", "/favicon.ico", "/sitemap.xml", "/robots.txt",
  "/uploads", "/fonts", "/sw.js", "/manifest.json",
  "/icon-192.svg", "/icon-512.svg", "/logo.png", "/brand-icon.png",
  "/icon-192.png", "/icon-512.png",
  "/api/auth", "/api/loyalty", "/api/subscriptions", "/api/plans",
  "/login", "/menu", "/cart", "/order-confirmed",
  "/pricing", "/subscribe", "/demo",
];

function setCsrfCookie(resp: NextResponse, req: NextRequest) {
  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    resp.cookies.set(CSRF_COOKIE, generateToken(), {
      path: "/", httpOnly: false, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", maxAge: 3600,
    });
  }
}

function setHeaders(resp: NextResponse) {
  resp.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  try {
    // Static/public — headers + CSRF cookie only
    if (publicPrefixes.some(p => pathname.startsWith(p)) || pathname === "/") {
      const resp = NextResponse.next();
      resp.headers.set("X-Content-Type-Options", "nosniff");
      resp.headers.set("X-Frame-Options", "DENY");
      resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      setCsrfCookie(resp, request);
      return resp;
    }

    const response = NextResponse.next();
    setHeaders(response);
    setCsrfCookie(response, request);

    // API — CSRF validation
    if (pathname.startsWith("/api")) {
      if (!SAFE.has(method)) {
        const header = request.headers.get(CSRF_HEADER);
        const cookie = request.cookies.get(CSRF_COOKIE)?.value;
        if (!validateToken(header, cookie)) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
      return response;
    }

    // Protected routes — auth check
    const authCookie = request.cookies.get("smart-menu-auth");
    const roleCookie = request.cookies.get("smart-menu-role");
    const isAuth = authCookie?.value === "true";
    const role = roleCookie?.value;

    if (pathname.startsWith("/admin") && (!isAuth || role !== "admin")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/owner") && (!isAuth || role !== "owner")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|icon-192\\.svg|icon-512\\.svg|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.avif).*)",
  ],
};

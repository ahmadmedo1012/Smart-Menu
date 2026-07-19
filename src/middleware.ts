// ponytail: cookie-presence check only — full DB-backed validation in requireAuth()
// Edge runtime cannot access Prisma, so we block missing/stale sessions at the network edge
// and let route handlers do the authoritative session check.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/csrf";

const SESSION_COOKIE = "smart-menu-session";

const PROTECTED_ROOTS = ["/admin", "/owner"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  const isApiRoute = pathname.startsWith("/api/");

  // CSRF: validate Origin on mutating requests (API + protected pages)
  if (isApiRoute || isProtected) {
    try {
      assertSameOrigin(request);
    } catch {
      return new NextResponse("CSRF validation failed", { status: 403 });
    }
  }

  // Session check only for protected page routes
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session || session.length < 32) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/api/:path*"],
};

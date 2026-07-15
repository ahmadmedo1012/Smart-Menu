import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPrefixes = [
  "/_next", "/favicon.png",
  "/uploads", "/fonts", "/sw.js", "/manifest.json",
  "/brand-icon.png", "/icon-192.png", "/icon-512.png",
  "/api/auth", "/api/loyalty", "/api/subscriptions", "/api/plans", "/api/restaurants",
  "/api/telegram/webhook", "/api/admin/telegram",
  "/login", "/menu", "/cart", "/order-confirmed",
  "/pricing", "/subscribe", "/demo",
];

function setHeaders(resp: NextResponse) {
  resp.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // ponytail: Next.js injects inline <script> for hydration bootstrap + RSC payload.
  // Full protection needs per-request nonce plumbing; 'unsafe-inline' is the
  // practical bridge. dev mode also needs 'unsafe-eval' for React Fast Refresh.
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = `'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`;
  resp.headers.set("Content-Security-Policy", `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'; manifest-src 'self' blob:`);
  resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  resp.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    // Static/public — headers only
    if (publicPrefixes.some(p => pathname.startsWith(p)) || pathname === "/") {
      const resp = NextResponse.next();
      setHeaders(resp);
      return resp;
    }

    const response = NextResponse.next();
    setHeaders(response);

    // CSRF: SameSite=Lax session cookie handles browser-enforced CSRF for all routes.
    // The double-submit cookie pattern was generating tokens server-side without
    // server-side validation — providing no actual protection.
    // csrfFetch() client helper is preserved for forward compatibility.
    if (pathname.startsWith("/api")) {
      return response;
    }

    // Protected routes — auth gate (server-side auth handles actual role enforcement)
    const sessionCookie = request.cookies.get("smart-menu-session")?.value;
    if ((pathname.startsWith("/admin") || pathname.startsWith("/owner")) && !sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (e) {
    console.error("[middleware] Unhandled error:", (e as Error).message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.png|sitemap\\.xml|robots\\.txt|manifest\\.json|order-confirmed|demo|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.avif).*)",
  ],
};

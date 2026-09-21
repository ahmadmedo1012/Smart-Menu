import { NextRequest } from "next/server";
import { error as logError } from "@/lib/logger";
import { success, error } from "@/lib/api-helpers";
import { destroySession, destroySessionByToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // r119-B6 (B2-M discovery): mobile clients carry their session as
    // `Authorization: Bearer <token>` (SecureStore) — the cookie-only
    // destroySession left those rows alive (Bearer valid for its full
    // 7-day lifetime after logout). Revoke BOTH surfaces.
    const authHeader = request.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (bearer) {
      await destroySessionByToken(bearer);
    }
    await destroySession();

    // X-Just-Logged-Out tells the login page to suppress its auto-redirect:
    // the /login useEffect fires /api/auth/me on mount and can race this
    // response's cookie-clear, read the still-valid session, and bounce the
    // user straight back (observed in e2e as a resurrected session).
    const res = success({ message: "تم تسجيل الخروج" });
    res.headers.set("X-Just-Logged-Out", "1");
    return res;
  } catch (e) {
    logError("Logout error:", { error: e instanceof Error ? e.message : String(e) });
    return error("فشل تسجيل الخروج", 500);
  }
}

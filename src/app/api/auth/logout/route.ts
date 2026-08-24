import { error as logError } from "@/lib/logger";
import { success, error } from "@/lib/api-helpers";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();

    // X-Just-Logged-Out tells the login page to suppress its auto-redirect:
    // the /login useEffect fires /api/auth/me on mount and can race this
    // response's cookie-clear, read the still-valid session, and bounce the
    // user straight back (observed in e2e as a resurrected session).
    const res = success({ message: "Logged out" });
    res.headers.set("X-Just-Logged-Out", "1");
    return res;
  } catch (e) {
    logError("Logout error:", { error: e instanceof Error ? e.message : String(e) });
    return error("Logout failed", 500);
  }
}

import { cookies } from "next/headers";
import { error as logError } from "@/lib/logger";
import { success, error } from "@/lib/api-helpers";
import { CSRF_COOKIE } from "@/lib/csrf";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();

    const cookieStore = await cookies();
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };

    cookieStore.set("smart-menu-auth", "", opts);
    cookieStore.set("smart-menu-role", "", opts);
    cookieStore.set("smart-menu-restaurant", "", opts);
    cookieStore.set("smart-menu-user-id", "", opts);
    cookieStore.set(CSRF_COOKIE, "", { ...opts, httpOnly: false });

    return success({ message: "Logged out" });
  } catch (e) {
    logError("Logout error:", { error: e instanceof Error ? e.message : String(e) });
    return error("Logout failed", 500);
  }
}

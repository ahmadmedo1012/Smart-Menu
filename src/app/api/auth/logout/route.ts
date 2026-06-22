import { cookies } from "next/headers";
import { success, error } from "@/lib/api-helpers";
import { CSRF_COOKIE } from "@/lib/csrf";

export async function POST() {
  try {
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
    console.error("Logout error:", e);
    return error("Logout failed", 500);
  }
}

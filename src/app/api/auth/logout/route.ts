import { cookies } from "next/headers";
import { error } from "@/lib/api-helpers";

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

    return Response.json({ success: true, message: "Logged out" });
  } catch (e) {
    console.error("Logout error:", e);
    return error("Logout failed", 500);
  }
}

import { cookies } from "next/headers";

export async function POST() {
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
}

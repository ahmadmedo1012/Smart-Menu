import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  // Auto-login as the demo restaurant owner (waha / مقهى الواحة)
  const user = await prisma.user.findUnique({ where: { username: "waha" } });

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  cookieStore.set("smart-menu-auth", "true", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours
  });
  cookieStore.set("smart-menu-role", user.role, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  if (user.restaurantId) {
    cookieStore.set("smart-menu-restaurant", String(user.restaurantId), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2,
    });
  }

  redirect("/owner");
}

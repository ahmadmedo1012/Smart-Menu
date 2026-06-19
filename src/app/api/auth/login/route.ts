import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { success: false, message: "يرجى إدخال اسم المستخدم وكلمة المرور" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return Response.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const { verifyHash } = await import("@/lib/hash");
    const valid = await verifyHash(password, user.password);
    if (!valid) {
      return Response.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";
    cookieStore.set("smart-menu-auth", "true", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    cookieStore.set("smart-menu-role", user.role, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    if (user.restaurantId) {
      cookieStore.set("smart-menu-restaurant", String(user.restaurantId), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    }

    return Response.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: { id: user.id, username: user.username, name: user.name, role: user.role, restaurantId: user.restaurantId },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ success: false, message: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

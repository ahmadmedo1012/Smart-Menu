import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const LOGIN_LOCK = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const lockKey = `${ip}:${username}`;
    const lastAttempt = LOGIN_LOCK.get(lockKey);
    if (lastAttempt && Date.now() - lastAttempt < 1000) {
      await new Promise((r) => setTimeout(r, 1000));
      return Response.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    if (!username || !password) {
      return Response.json(
        { success: false, message: "يرجى إدخال اسم المستخدم وكلمة المرور" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      LOGIN_LOCK.set(lockKey, Date.now());
      return Response.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const { verifyHash } = await import("@/lib/hash");
    const valid = verifyHash(password, user.password);
    if (!valid) {
      LOGIN_LOCK.set(lockKey, Date.now());
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

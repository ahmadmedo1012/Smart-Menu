import { prisma } from "@/lib/db";
import { error as logError } from "@/lib/logger";
import { cookies } from "next/headers";
import { error } from "@/lib/api-helpers";
import { z } from "zod";
import { generateToken } from "@/lib/csrf";
import { createRateLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { notifyEvent } from "@/lib/telegram";
import { createSession } from "@/lib/session";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: Request) {
  try {
    // ponytail: no CSRF check on login — rate-limited, httpOnly cookies, HTTPS
    const cookieStore = await cookies();

    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return error("يرجى إدخال اسم المستخدم وكلمة المرور", 400);
    const { username, password } = parsed.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const lockKey = `${ip}:${username}`;
    const { success: allowed } = loginLimiter.check(lockKey);
    if (!allowed) {
      return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, password: true, name: true, role: true, restaurantId: true, subscriptionStatus: true },
    });
    if (!user) {
      return error("اسم المستخدم أو كلمة المرور غير صحيحة", 401);
    }

    const { verifyHash } = await import("@/lib/hash");
    const valid = verifyHash(password, user.password);
    if (!valid) {
      return error("اسم المستخدم أو كلمة المرور غير صحيحة", 401);
    }

    // Record last login, audit, telegram notification
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await logAudit({ action: "login", actorId: user.id, targetType: "user", targetId: user.id, ip });
    await notifyEvent("user_login", { username: user.username, name: user.name, role: user.role });

    const secure = process.env.NODE_ENV === "production";
    // Create server-side session (primary auth)
    await createSession(user.id);
    // Backward-compat cookie-based auth
    const SEVEN_DAYS = 60 * 60 * 24 * 7;
    cookieStore.set("smart-menu-auth", "true", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("smart-menu-user-id", String(user.id), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("smart-menu-role", user.role, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    if (user.restaurantId) {
      cookieStore.set("smart-menu-restaurant", String(user.restaurantId), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    }
    cookieStore.set("smart-menu-subscription-status", user.subscriptionStatus ?? "UNPAID", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("csrf-token", generateToken(), { httpOnly: false, secure, sameSite: "strict", path: "/", maxAge: 60 * 60 });

    return Response.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: { id: user.id, username: user.username, name: user.name, role: user.role, restaurantId: user.restaurantId, subscriptionStatus: user.subscriptionStatus ?? "UNPAID" },
    });
  } catch (e) {
    logError("Login error:", { error: e instanceof Error ? e.message : String(e) });
    return error("حدث خطأ في الخادم", 500);
  }
}

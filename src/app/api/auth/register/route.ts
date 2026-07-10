import { prisma } from "@/lib/db";
import { error, handleError } from "@/lib/api-helpers";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword } from "@/lib/hash";
import { generateToken } from "@/lib/csrf";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { notifyEvent } from "@/lib/telegram";
import { createSession } from "@/lib/session";

const registerSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل").max(30),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  name: z.string().min(1, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
});

const registerLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success: allowed } = await registerLimiter.check(`register:${ip}`);
    if (!allowed) {
      return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);
    }

    const body = await request.json().catch(() => { throw new Error("JSON parse error") });
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.issues[0].message, 400);
    }
    const { username: rawUsername, password, name: rawName, email } = parsed.data;
    // Sanitize: strip HTML tags from user-submitted text fields to prevent stored XSS
    const username = rawUsername.replace(/<[^>]*>/g, "");
    const name = rawName.replace(/<[^>]*>/g, "");

    // Check username uniqueness
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return error("اسم المستخدم موجود مسبقاً", 409);
    }

    const hashed = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        name,
        email: email || "",
        role: "USER",
        subscriptionStatus: "UNPAID",
      },
      select: { id: true, username: true, name: true, role: true, subscriptionStatus: true, createdAt: true },
    });

    // Create session (auto-login)
    await createSession(user.id);

    // Set auth cookies
    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";
    const SEVEN_DAYS = 60 * 60 * 24 * 7;
    cookieStore.set("smart-menu-auth", "true", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("smart-menu-user-id", String(user.id), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("smart-menu-role", "USER", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("smart-menu-subscription-status", "UNPAID", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    cookieStore.set("csrf-token", generateToken(), { httpOnly: false, secure, sameSite: "strict", path: "/", maxAge: 60 * 60 });

    // Audit + Telegram
    await logAudit({ action: "create", actorId: user.id, targetType: "user", targetId: user.id, ip });
    await notifyEvent("user_registered", { username: user.username, name: user.name }, { adminOnly: true });

    // CSRF readiness header
    const response = Response.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user: { id: user.id, username: user.username, name: user.name, role: user.role, subscriptionStatus: user.subscriptionStatus },
    });
    response.headers.set("X-CSRF-Enabled", "true");
    return response;
  } catch (e) {
    // Prisma unique constraint
    if (e instanceof Error && e.message.includes("Unique constraint failed")) {
      return error("اسم المستخدم موجود مسبقاً", 409);
    }
    return handleError(e);
  }
}

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const steps: string[] = [];
  try {
    // Step by step — emulate the login route exactly
    steps.push("1: start");

    steps.push("2: find user");
    const user = await prisma.user.findUnique({
      where: { username: "admin" },
      select: { id: true, username: true, password: true, name: true, role: true, restaurantId: true },
    });
    steps.push(`3: user=${user?.id} role=${user?.role}`);
    if (!user) return Response.json({ steps, error: "not found" });

    steps.push("4: verifyHash");
    const { verifyHash } = await import("@/lib/hash");
    const valid = verifyHash("admin123", user.password);
    steps.push(`5: verifyHash=${valid}`);
    if (!valid) return Response.json({ steps, error: "bad password" });

    steps.push("6: update lastLoginAt");
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    steps.push("7: done update");

    steps.push("8: import audit");
    const { logAudit } = await import("@/lib/audit");
    steps.push("9: import telegram");
    const { notifyEvent } = await import("@/lib/telegram");
    steps.push("10: import csrf");
    const { generateToken } = await import("@/lib/csrf");
    steps.push("11: import rateLimiter");
    const { createRateLimiter } = await import("@/lib/rate-limit");
    steps.push("12: import session");
    const { createSession } = await import("@/lib/session");
    steps.push("13: import logger");
    const { error: logError } = await import("@/lib/logger");

    steps.push("14: createSession");
    await createSession(user.id);

    steps.push("15: cookies");
    const c = await cookies();
    const secure = process.env.NODE_ENV === "production";
    const SEVEN_DAYS = 60 * 60 * 24 * 7;

    steps.push("16: set cookies");
    c.set("smart-menu-auth", "true", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });
    c.set("smart-menu-role", user.role, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SEVEN_DAYS });

    steps.push("17: logAudit");
    await logAudit({ action: "login", actorId: user.id, targetType: "user", targetId: user.id, ip: "debug" });

    steps.push("18: notify");
    await notifyEvent("user_login", { username: user.username });

    steps.push("19: done");
    return Response.json({ steps, success: true });
  } catch (e: any) {
    return Response.json({ steps, error: e?.message || String(e), stack: e?.stack?.substring(0, 2000) }, { status: 500 });
  }
}

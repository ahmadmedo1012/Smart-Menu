import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { getHmacKey } from "@/lib/keys";

// Constant-time string comparison — length mismatch short-circuits (never
// leaks the expected length through timing) without throwing like
// timingSafeEqual would on unequal buffer sizes.
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body: Record<string, unknown> = await request.json();
    const token = body.token as string | undefined;
    const chatId = body.chatId as string | number | undefined;
    const username = body.username as string | undefined;

    if (!token || chatId === undefined) {
      return error("token و chatId مطلوبان", 400);
    }

    let hmacKey: Buffer;
    try { hmacKey = Buffer.from(getHmacKey()); }
    catch { return error("AUTH_SECRET غير مضبوط", 500); }

    // Decode and split payload.sig
    let decoded: string;
    try {
      decoded = Buffer.from(token, "base64url").toString();
    } catch {
      return error("رمز غير صالح", 400);
    }
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) return error("رمز غير صالح", 400);

    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    const expectedSig = createHmac("sha256", hmacKey).update(payload).digest("hex");
    // Constant-time compare — sig is attacker-controlled, so `!==` would leak
    // byte-by-byte prefix match through response timing.
    if (!timingSafeEqualStrings(sig, expectedSig)) return error("رمز غير صالح", 400);

    let data: { userId: number; exp: number };
    try {
      data = JSON.parse(payload);
    } catch {
      return error("رمز غير صالح", 400);
    }
    if (!data.userId || data.exp < Math.floor(Date.now() / 1000)) {
      return error("انتهت صلاحية الرمز", 400);
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        telegramChatId: String(chatId),
        telegramUsername: username || null,
        telegramLinkedAt: new Date(),
      },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: data.userId,
      targetType: "User",
      targetId: data.userId,
      metadata: { action: "telegram_link" },
    });

    return success({ linked: true });
  } catch (e) {
    return handleError(e);
  }
}

import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { timingSafeEqualStrings } from "@/lib/secure-compare";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { getHmacKey } from "@/lib/keys";
import { z } from "zod";

// round97-X3: the body used to be a blind `Record<string, unknown>` + `as`
// casts (token as string, chatId as string | number) — a number token or an
// object chatId flowed into Buffer.from/HMAC unchecked. Same 400 + Arabic
// message contract as before (telegram-verify-anti-replay pins the 400),
// now with typed fields after safeParse.
const verifySchema = z.object({
  token: z.string().min(1),
  chatId: z.union([z.string(), z.number()]),
  username: z.string().optional(),
});

// Constant-time string comparison — length mismatch short-circuits (never
// leaks the expected length through timing) without throwing like
// timingSafeEqual would on unequal buffer sizes.


export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const parsed = verifySchema.safeParse(await request.json());
    if (!parsed.success) return error("token و chatId مطلوبان", 422);
    const { token, chatId, username } = parsed.data;

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

    // round94-3a (تقرير B LOW-3): الرمز مرتبط بمولّده — حمولة الرمز تحمل
    // userId من أنشأه (admin/telegram/link يوقّع {userId, exp})، لكن المسار
    // كان يربط حساب أي حامل EDIT_SETTINGS يلتقط رمزًا تسرب لمدير آخر
    // (paste/شاشة) بقناته هو فيستلم إشعارات مدفوعات/قرارات الضحية. حامل
    // الصلاحية الآن يربط نفسه فقط؛ مسار webhook /start verify_ يظل كما هو
    // بالتصميم (المدير يفتح رابطه بنفسه في التليجرام).
    if (data.userId !== auth.userId) {
      return error("رمز غير مخصص لك", 403);
    }

    // round89-B6 (dx-4 #9): anti-replay — same spend-mark as the webhook link
    // flow (api/telegram/webhook/route.ts): the 5-min link token is now
    // single-use. Atomic create-or-die on the rateLimitEntry unique key
    // rejects the second presentation of the same token, and the SAME
    // `link-token:` key namespace as the webhook means a token spent through
    // either path is dead for the other. The exp timestamp doubles as the
    // entry TTL (the limiter's 120s sweep reaps it).
    const tokenHash = createHmac("sha256", hmacKey).update(token).digest("hex");
    try {
      await prisma.rateLimitEntry.create({
        data: { key: `link-token:${tokenHash}`, windowEnd: new Date(data.exp * 1000) },
      });
    } catch {
      // Unique constraint = token already spent (concurrent or earlier use)
      return error("الرمز مستخدم مسبقاً", 400);
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

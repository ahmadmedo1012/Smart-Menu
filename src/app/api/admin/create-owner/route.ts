import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { usernameField, passwordField, nameField } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { notifyEvent } from "@/lib/telegram";

const schema = z.object({
  username: usernameField,
  password: passwordField,
  name: nameField,
  restaurantId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_RESTAURANTS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      // round90-المنسق: آخر رسالة إنجليزية في عائلة إنشاء الحسابات — عُرّبت
      return error("اسم المستخدم موجود مسبقًا", 409);
    }
    const { hashPassword } = await import("@/lib/hash");
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashPassword(body.password),
        name: body.name,
        role: "owner",
        restaurantId: body.restaurantId,
      },
    });
    // round90-المنسق (اكتشاف F5b-C): عائلة credentials الوحيدة غير المدقّقة —
    // logAudit + notifyEvent (best-effort) بنمط restaurants/route.ts:257
    logAudit({
      action: "create",
      targetType: "user",
      targetId: user.id,
      actorId: auth.userId,
      metadata: { role: "owner", restaurantId: body.restaurantId },
    }).catch(() => {});
    notifyEvent(
      "owner_created",
      { username: user.username, name: user.name },
      { adminOnly: true }
    ).catch(() => {});
    return success({ id: user.id, username: user.username, name: user.name }, 201);
  } catch (e) {
    return handleError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

const channelSchema = z.object({
  in_app: z.boolean(),
  telegram: z.boolean(),
  system_log: z.boolean(),
});

const eventKey = z.enum([
  "new_order",
  "payment",
  "subscription",
  "settings_change",
  "user_action",
  "system_alert",
]);

const matrixSchema = z.object({
  channels: channelSchema,
  events: z.record(eventKey, channelSchema),
});

/** Default matrix used when none is stored yet. */
function defaultMatrix() {
  return {
    channels: { in_app: true, telegram: true, system_log: true },
    events: {
      new_order: { in_app: true, telegram: true, system_log: true },
      payment: { in_app: true, telegram: true, system_log: true },
      subscription: { in_app: true, telegram: true, system_log: true },
      settings_change: { in_app: true, telegram: true, system_log: true },
      user_action: { in_app: false, telegram: false, system_log: true },
      system_alert: { in_app: true, telegram: true, system_log: true },
    },
  };
}

/** Derive the 3 legacy telegram booleans from the events matrix. */
function legacyTelegramBools(events: Record<string, { telegram: boolean }>) {
  return {
    telegramNotifyOrders: events.new_order?.telegram ?? true,
    telegramNotifyPayments: events.payment?.telegram ?? true,
    telegramNotifySettings: events.settings_change?.telegram ?? false,
  };
}

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { notificationPrefs: true },
    });

    if (!user) return error("المستخدم غير موجود", 404);

    const prefs = user.notificationPrefs as Record<string, unknown> | null;
    const matrix = prefs && typeof prefs === "object" && "channels" in prefs
      ? prefs
      : defaultMatrix();

    return success(matrix);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const body = matrixSchema.parse(await request.json());

    const legacy = legacyTelegramBools(body.events);

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        notificationPrefs: body,
        ...legacy,
      },
      select: { notificationPrefs: true },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId,
      targetType: "User",
      targetId: auth.userId,
      metadata: { updatedFields: ["notificationPrefs"] },
    });

    return success(updated.notificationPrefs);
  } catch (e) {
    return handleError(e);
  }
}

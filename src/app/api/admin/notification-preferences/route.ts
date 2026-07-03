import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

// Accept the flat format the page sends (3 toggles).
const flatPrefsSchema = z.object({
  telegramNotifyOrders: z.boolean(),
  telegramNotifyPayments: z.boolean(),
  telegramNotifySettings: z.boolean(),
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

/** Derive flat booleans from the events matrix (the page speaks this format). */
function flatFromMatrix(events: Record<string, { telegram: boolean }>) {
  return {
    telegramNotifyOrders: events.new_order?.telegram ?? true,
    telegramNotifyPayments: events.payment?.telegram ?? true,
    telegramNotifySettings: events.settings_change?.telegram ?? false,
  };
}

/** Build the internal matrix from the page's flat format. */
function matrixFromFlat(f: { telegramNotifyOrders: boolean; telegramNotifyPayments: boolean; telegramNotifySettings: boolean }) {
  return {
    channels: { in_app: true, telegram: false, system_log: true },
    events: {
      new_order: { in_app: true, telegram: f.telegramNotifyOrders, system_log: true },
      payment: { in_app: true, telegram: f.telegramNotifyPayments, system_log: true },
      subscription: { in_app: true, telegram: false, system_log: true },
      settings_change: { in_app: true, telegram: f.telegramNotifySettings, system_log: true },
      user_action: { in_app: false, telegram: false, system_log: true },
      system_alert: { in_app: true, telegram: false, system_log: true },
    },
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

    return success(flatFromMatrix((matrix as any).events ?? {}));
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const body = flatPrefsSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        notificationPrefs: matrixFromFlat(body),
        telegramNotifyOrders: body.telegramNotifyOrders,
        telegramNotifyPayments: body.telegramNotifyPayments,
        telegramNotifySettings: body.telegramNotifySettings,
      },
      select: {
        telegramNotifyOrders: true,
        telegramNotifyPayments: true,
        telegramNotifySettings: true,
      },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId,
      targetType: "User",
      targetId: auth.userId,
      metadata: { updatedFields: ["notificationPrefs"] },
    });

    return success({
      telegramNotifyOrders: updated.telegramNotifyOrders,
      telegramNotifyPayments: updated.telegramNotifyPayments,
      telegramNotifySettings: updated.telegramNotifySettings,
    });
  } catch (e) {
    return handleError(e);
  }
}

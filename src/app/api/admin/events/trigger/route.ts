import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-helpers";
import { error as logError } from "@/lib/logger";

export async function POST(_request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const event = await prisma.systemEvent.create({
      data: {
        eventType: "payment",
        severity: "info",
        title: "حدث اختبار",
        message: "تم إنشاء حدث اختبار من لوحة التحكم",
        metadata: {
          // r136: EGP كان مثالاً ميتاً من قالب أجنبي — عملة المنصة LYD حصراً
          amount: Math.floor(Math.random() * 500) + 10,
          currency: "LYD",
          orderId: Math.floor(Math.random() * 10000),
        },
      },
    });

    return success(event);
  } catch (e) {
    // round97-X3 (round94-W1b pattern — see auth/login): the bare catch
    // silently swallowed real DB failures; the generic 500 now logs the
    // underlying error first so the ops feed can be debugged.
    logError("admin/events/trigger create failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return error("حدث خطأ في الخادم", 500);
  }
}

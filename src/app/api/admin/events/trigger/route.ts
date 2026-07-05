import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-helpers";

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
          amount: Math.floor(Math.random() * 500) + 10,
          currency: "EGP",
          orderId: Math.floor(Math.random() * 10000),
        },
      },
    });

    return success(event);
  } catch {
    return error("حدث خطأ في الخادم", 500);
  }
}

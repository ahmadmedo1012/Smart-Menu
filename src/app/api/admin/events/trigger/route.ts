import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { eventEmitter } from "@/lib/events";
import { success, error } from "@/lib/api-helpers";

export async function POST(_request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const event = {
      type: "payment",
      amount: Math.floor(Math.random() * 500) + 10,
      currency: "EGP",
      orderId: Math.floor(Math.random() * 10000),
      timestamp: new Date().toISOString(),
    };

    eventEmitter.emit("admin-event", event);
    return success(event);
  } catch {
    return error("حدث خطأ في الخادم", 500);
  }
}

import { prisma } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/telegram";
import { eventEmitter } from "@/lib/events";

export type Decision = "verified" | "cancelled";

export type ResolveResult =
  | { ok: true; action: Decision; paymentId: number; restaurant?: { id: number; name: string; slug: string }; user?: { id: number; username: string; role: string; subscriptionStatus: string; restaurantId: number | null } }
  | { ok: false; reason: string };

export async function resolveSubscriptionPayment(
  paymentId: number,
  decision: Decision,
): Promise<ResolveResult> {
  const existing = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, telegramChatId: true } } },
  });
  if (!existing) return { ok: false, reason: "الطلب غير موجود" };
  if (existing.status !== "pending") return { ok: false, reason: "تمت معالجة هذا الطلب مسبقاً" };

  if (decision === "verified") {
    const meta = existing.metadata as { tempRestaurantName?: string; tempRestaurantSlug?: string } | null;
    const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing.phone}`;
    const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing.id}`;

    // Guard: re-check slug hasn't been taken since payment was created (race window)
    if (existing.userId) {
      const slugTaken = await prisma.restaurant.findUnique({ where: { slug: restaurantSlug } });
      if (slugTaken) {
        return { ok: false, reason: "رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر." };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: "verified" },
      });

      // Guard: skip restaurant+user creation if no userId (anonymous payment)
      let restaurant = null;
      let user = null;
      if (existing.userId) {
        restaurant = await tx.restaurant.create({
          data: {
            name: restaurantName,
            slug: restaurantSlug,
            phone: existing.phone,
            planId: existing.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        user = await tx.user.update({
          where: { id: existing.userId },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing.planId,
            restaurantId: restaurant.id,
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });
      } else {
        // ponytail: anonymous payment — no user to promote, no restaurant to create.
        // Payment is marked verified for manual bookkeeping. Add admin-panel UI to
        // attach an owner later if this becomes a real onboarding path.
      }

      return { updated, restaurant, user };
    });

    // Notify via Telegram broadcast
    const userPart = result.user ? `• المستخدم: ${result.user.username}\n` : "";
    const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n${userPart}• المطعم: ${restaurantName}\n• الخطة: ${existing.planName}\n• الرابط: ${restaurantSlug}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" });

    // SSE for admin panel
    eventEmitter.emit("admin-event", {
      type: "payment",
      title: "اشتراك جديد",
      message: `تم تأكيد دفع ${existing.planName} — ${restaurantName}`,
      amount: existing.amount,
      planName: existing.planName,
      phone: existing.phone,
      userId: existing.userId,
      timestamp: new Date().toISOString(),
    });

    return { ok: true, action: "verified", paymentId, restaurant: result.restaurant ? { id: result.restaurant.id, name: restaurantName, slug: restaurantSlug } : undefined, user: result.user ?? undefined };
  }

  // decision === "cancelled"
  await prisma.$transaction(async (tx) => {
    const updated = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status: "cancelled" },
    });

    // Only reject if user still UNPAID (might have been promoted by another route)
    if (existing.userId) {
      await tx.user.updateMany({
        where: { id: existing.userId, subscriptionStatus: "UNPAID" },
        data: { subscriptionStatus: "REJECTED" },
      });
    }

    return updated;
  });

  // Telegram broadcast
  const msg = `❌ *تم رفض طلب الدفع*\n• الهاتف: ${existing.phone}\n• المبلغ: ${existing.amount} د.ل\n• الخطة: ${existing.planName}`;
  sendTelegramNotification(msg, { parseMode: "Markdown" });

  // Admin SSE
  eventEmitter.emit("admin-event", {
    type: "payment_rejected",
    title: "رفض اشتراك",
    message: `تم رفض دفع ${existing.planName}`,
    amount: existing.amount,
    planName: existing.planName,
    phone: existing.phone,
    userId: existing.userId,
    timestamp: new Date().toISOString(),
  });

  // User SSE — push rejection event to the user in real-time
  if (existing.userId) {
    eventEmitter.emit("user-event", {
      userId: existing.userId,
      type: "subscription_rejected",
      message: "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني.",
      paymentId: existing.id,
      timestamp: new Date().toISOString(),
    });
  }

  return { ok: true, action: "cancelled", paymentId };
}

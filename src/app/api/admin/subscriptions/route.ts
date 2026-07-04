import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { sendTelegramNotification } from "@/lib/telegram";
import { eventEmitter } from "@/lib/events";

const verifySchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["verified", "cancelled"]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const where = status !== "all" ? { status } : {};

    const [data, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          phone: true,
          amount: true,
          provider: true,
          planId: true,
          planName: true,
          status: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, username: true, name: true } },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    return success({ data, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { id, status } = verifySchema.parse(await request.json());

    const existing = await prisma.subscriptionPayment.findUnique({
      where: { id },
      include: { user: { select: { id: true, telegramChatId: true } } },
    });
    if (!existing) return notFound("SubscriptionPayment");
    if (existing.status !== "pending") return error("تمت معالجة هذا الطلب مسبقاً", 400);

    if (status === "verified") {
      // Atomic transaction: create restaurant + promote user
      const meta = existing.metadata as { tempRestaurantName?: string; tempRestaurantSlug?: string } | null;
      const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing.phone}`;
      const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing.id}`;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.subscriptionPayment.update({
          where: { id },
          data: { status: "verified" },
        });

        const restaurant = await tx.restaurant.create({
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

        const user = await tx.user.update({
          where: { id: existing.userId! },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing.planId,
            restaurantId: restaurant.id,
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });

        return { updated, restaurant, user };
      });

      // Notify via Telegram
      const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n• المستخدم: ${result.user.username}\n• المطعم: ${restaurantName}\n• الخطة: ${existing.planName}\n• الرابط: ${restaurantSlug}`;
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

      return success(result);
    }

    if (status === "cancelled") {
      // Atomic reject: update payment + user status
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.subscriptionPayment.update({
          where: { id },
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

      // Telegram notification
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

      return success(result);
    }

    return error("حالة غير معروفة", 400);
  } catch (e) {
    return handleError(e);
  }
}

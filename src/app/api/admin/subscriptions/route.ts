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
        select: { id: true, phone: true, amount: true, provider: true, planId: true, planName: true, status: true, createdAt: true },
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

    const existing = await prisma.subscriptionPayment.findUnique({ where: { id } });
    if (!existing) return notFound("SubscriptionPayment");

    const updated = await prisma.subscriptionPayment.update({
      where: { id },
      data: { status },
      select: { id: true, phone: true, status: true, createdAt: true },
    });

    // Re-check plan limits after verification
    if (status === "verified") {
      // Find a restaurant with matching phone
      const restaurants = await prisma.restaurant.findMany({
        where: { phone: existing.phone },
        select: { id: true, name: true, planId: true },
      });
      if (restaurants.length > 0) {
        // Activate plan for all matching restaurants
        for (const r of restaurants) {
          await prisma.restaurant.update({
            where: { id: r.id },
            data: { planId: existing.planId, planStart: new Date(), planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          });
        }
      }
      // Notify via Telegram — bypass event filter for critical payment events
      const msg = `✅ *تم تأكيد الدفع*\n• الهاتف: ${existing.phone}\n• المبلغ: ${existing.amount} د.ل\n• الخطة: ${existing.planName}`;
      sendTelegramNotification(msg, { parseMode: "Markdown" });

      eventEmitter.emit("admin-event", {
        type: "payment",
        title: "اشتراك جديد",
        message: `تم تأكيد دفع الاشتراك ${existing.planName}`,
        amount: existing.amount,
        planName: existing.planName,
        phone: existing.phone,
        timestamp: new Date().toISOString(),
      });
    } else if (status === "cancelled") {
      const msg = `❌ *تم إلغاء الدفع*\n• الهاتف: ${existing.phone}\n• المبلغ: ${existing.amount} د.ل\n• الخطة: ${existing.planName}`;
      sendTelegramNotification(msg, { parseMode: "Markdown" });
    }

    return success(updated);
  } catch (e) {
    return handleError(e);
  }
}

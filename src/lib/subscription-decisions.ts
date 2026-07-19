import { prisma } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/telegram";
import { error } from "@/lib/logger";
import { getDecryptedBotToken } from "@/lib/config";

async function notifyUserViaTelegram(chatId: string | null, text: string) {
  if (!chatId) return;
  // Dynamic token — supports both env var and DB-configured token
  const token = process.env.TELEGRAM_BOT_TOKEN || await getDecryptedBotToken();
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    error("[telegram] notify user failed:", { error: e });
  }
}

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
    return handleVerified(existing);
  }

  return handleCancelled(existing);
}

async function handleVerified(existing: Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>): Promise<ResolveResult> {
  const meta = existing!.metadata as {
    tempUsername?: string;
    tempRestaurantName?: string;
    tempRestaurantSlug?: string;
    upgradeRestaurantId?: number;
    currentPlanId?: number | null;
  } | null;

  // UPGRADE BRANCH
  if (meta?.upgradeRestaurantId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.subscriptionPayment.update({
          where: { id: existing!.id, status: "pending" },
          data: { status: "verified" },
        });

        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing!.planId },
          select: { id: true, nameAr: true, maxItems: true, maxOrders: true },
        });

        const restaurant = await tx.restaurant.update({
          where: { id: meta!.upgradeRestaurantId },
          data: {
            planId: existing!.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxItems: plan?.maxItems ?? undefined,
            maxOrders: plan?.maxOrders ?? undefined,
          },
        });

        await tx.user.update({
          where: { id: existing!.userId! },
          data: {
            planId: existing!.planId,
            subscriptionStatus: "PAID",
          },
        });

        // SystemEvent creates INSIDE transaction — atomic with core mutation
        await tx.systemEvent.create({
          data: {
            eventType: "payment",
            title: "ترقية اشتراك",
            message: `تم تأكيد ترقية ${existing!.planName} — ${restaurant.name}`,
            severity: "info",
            metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
          },
        });

        if (existing!.userId) {
          await tx.systemEvent.create({
            data: {
              eventType: "subscription_approved",
              title: "تم تفعيل الترقية",
              message: "تم ترقية خطتك بنجاح!",
              severity: "info",
              metadata: { userId: existing!.userId, upgradeRestaurantId: meta.upgradeRestaurantId },
            },
          });
        }

        return { restaurant, plan };
      });

      // Ponytail: Telegram notification fire-and-forget. At this point DB is
      // fully committed. If Telegram fails, the payment is still active.
      const msg = `⬆️ *تم تأكيد الترقية*\n• المطعم: ${result.restaurant.name}\n• الخطة: ${result.plan?.nameAr ?? existing!.planName}\n• المبلغ: ${existing!.amount} د.ل`;
      sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] telegram notify failed:", { error: e }));

      return { ok: true, action: "verified", paymentId: existing!.id };
    } catch (e: unknown) {
      error("[subscription-decisions] upgrade error:", { error: e });
      return { ok: false, reason: "حدث خطأ أثناء ترقية الخطة" };
    }
  }

  // NEW USER BRANCH
  const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing!.phone}`;
  const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing!.id}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (existing!.userId) {
        const slugTaken = await tx.restaurant.findUnique({ where: { slug: restaurantSlug } });
        if (slugTaken) throw new Error("SLUG_TAKEN");
      }

      await tx.subscriptionPayment.update({
        where: { id: existing!.id, status: "pending" },
        data: { status: "verified" },
      });

      let restaurant = null;
      let user = null;
      if (existing!.userId) {
        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing!.planId },
          select: { maxItems: true, maxOrders: true },
        });

        restaurant = await tx.restaurant.create({
          data: {
            name: restaurantName,
            slug: restaurantSlug,
            phone: existing!.phone,
            planId: existing!.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxItems: plan?.maxItems ?? undefined,
            maxOrders: plan?.maxOrders ?? undefined,
            isActive: true,
          },
        });

        user = await tx.user.update({
          where: { id: existing!.userId },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing!.planId,
            restaurantId: restaurant.id,
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });
      }

      // SystemEvent creates INSIDE transaction
      await tx.systemEvent.create({
        data: {
          eventType: "payment",
          title: "اشتراك جديد",
          message: `تم تأكيد دفع ${existing!.planName} — ${restaurantName}`,
          severity: "info",
          metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
        },
      });

      if (existing!.userId) {
        await tx.systemEvent.create({
          data: {
            eventType: "subscription_approved",
            title: "تم تفعيل الحساب",
            message: "تم تفعيل حسابك بنجاح!",
            severity: "info",
            metadata: { userId: existing!.userId, restaurantSlug },
          },
        });
      }

      return { restaurant, user };
    });

    // Post-transaction Telegram notifications (fire-and-forget, best-effort)
    const userPart = result.user ? `• المستخدم: ${result.user.username}\n` : "";
    const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n${userPart}• المطعم: ${restaurantName}\n• الخطة: ${existing!.planName}\n• الرابط: ${restaurantSlug}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] telegram failed:", { error: e }));

    const existingUser = existing as typeof existing & { user: { id: number; telegramChatId: string | null } | null };
    const userChatId = existingUser.user?.telegramChatId;
    if (userChatId) {
      notifyUserViaTelegram(String(userChatId),
        `✅ *تم تفعيل حسابك في Smart Menu!*\n\n• المطعم: ${restaurantName}\n• رابط المنيو: ${process.env.NEXT_PUBLIC_DOMAIN || "https://menu.smart-link.ly"}/menu/${restaurantSlug}\n\nيمكنك الآن تسجيل الدخول والبدء في استقبال الطلبات.`)
        .catch((e) => error("[subscription] notify user failed:", { error: e }));
    }

    return { ok: true, action: "verified", paymentId: existing!.id, restaurant: result.restaurant ? { id: result.restaurant.id, name: restaurantName, slug: restaurantSlug } : undefined, user: result.user ?? undefined };
  } catch (e: unknown) {
    error("[subscription-decisions] new user error:", { error: e });
    const errMsg = e instanceof Error ? e.message : "";
    const prismaErr = e as Record<string, unknown>;
    const isSlugConflict = errMsg === "SLUG_TAKEN" || (prismaErr.code === "P2002" && String(prismaErr.meta ?? "").includes("slug"));
    const reason = isSlugConflict
      ? "رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر."
      : "حدث خطأ أثناء معالجة الطلب";
    return { ok: false, reason };
  }
}

async function handleCancelled(existing: Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>): Promise<ResolveResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.subscriptionPayment.updateMany({
        where: { id: existing!.id, status: "pending" },
        data: { status: "cancelled" },
      });
      if (result.count === 0) return; // Already processed by another route

      if (existing!.userId) {
        await tx.user.updateMany({
          where: { id: existing!.userId, subscriptionStatus: "UNPAID" },
          data: { subscriptionStatus: "REJECTED" },
        });
      }

      // SystemEvent creates INSIDE transaction
      await tx.systemEvent.create({
        data: {
          eventType: "payment_rejected",
          title: "رفض اشتراك",
          message: `تم رفض دفع ${existing!.planName}`,
          severity: "warning",
          metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
        },
      });

      if (existing!.userId) {
        await tx.systemEvent.create({
          data: {
            eventType: "subscription_rejected",
            title: "رفض طلب التفعيل",
            message: "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني.",
            severity: "warning",
            metadata: { userId: existing!.userId, paymentId: existing!.id },
          },
        });
      }
    });

    // Post-transaction notifications
    const msg = `❌ *تم رفض طلب الدفع*\n• الهاتف: ${existing!.phone}\n• المبلغ: ${existing!.amount} د.ل\n• الخطة: ${existing!.planName}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] cancel telegram failed:", { error: e }));

    const existingUser = existing as typeof existing & { user: { id: number; telegramChatId: string | null } | null };
    const userChatId = existingUser.user?.telegramChatId;
    if (userChatId) {
      notifyUserViaTelegram(String(userChatId),
        `❌ *عذراً، تم رفض طلب تفعيل حسابك في Smart Menu.*\n\nإذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الدعم الفني.`)
        .catch((e) => error("[subscription] cancel notify user failed:", { error: e }));
    }

    return { ok: true, action: "cancelled", paymentId: existing!.id };
  } catch (e: unknown) {
    error("[subscription-decisions] cancel error:", { error: e });
    return { ok: false, reason: "حدث خطأ أثناء رفض الطلب" };
  }
}

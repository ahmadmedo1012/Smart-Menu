import { prisma } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/telegram";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function notifyUserViaTelegram(chatId: string | null, text: string) {
  if (!chatId || !BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch { /* best-effort */ }
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

  // UPGRADE BRANCH: existing free owner upgrading to paid plan
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

        return { restaurant, plan };
      });

      // Notify via Telegram broadcast (fire-and-forget — never block payment on Telegram)
      const msg = `⬆️ *تم تأكيد الترقية*\n• المطعم: ${result.restaurant.name}\n• الخطة: ${result.plan?.nameAr ?? existing!.planName}\n• المبلغ: ${existing!.amount} د.ل`;
      const { sendTelegramNotification } = await import("@/lib/telegram");
      sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => console.error("[subscription] telegram notify failed:", e));

      // Record system event (awaited — SSE poll depends on this)
      await prisma.systemEvent.create({
        data: {
          eventType: "payment",
          title: "ترقية اشتراك",
          message: `تم تأكيد ترقية ${existing!.planName} — ${result.restaurant.name}`,
          severity: "info",
          metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
        },
      });

      return { ok: true, action: "verified", paymentId: existing!.id };
    } catch (e) {
      console.error("[subscription-decisions] upgrade error:", e);
      const reason = e instanceof Error ? `حدث خطأ أثناء ترقية الخطة: ${e.message}` : "حدث خطأ أثناء ترقية الخطة";
      return { ok: false, reason };
    }
  }

  // NEW USER BRANCH: existing logic (unchanged below)
  const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing!.phone}`;
  const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing!.id}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Slug uniqueness check inside transaction (avoids race)
      if (existing!.userId) {
        const slugTaken = await tx.restaurant.findUnique({ where: { slug: restaurantSlug } });
        if (slugTaken) throw new Error("SLUG_TAKEN");
      }

      await tx.subscriptionPayment.update({
        where: { id: existing!.id, status: "pending" },
        data: { status: "verified" },
      });

      // Guard: skip restaurant+user creation if no userId (anonymous payment)
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
      } else {
        // ponytail: anonymous payment — no user to promote, no restaurant to create.
        // Payment is marked verified for manual bookkeeping. Add admin-panel UI to
        // attach an owner later if this becomes a real onboarding path.
      }

      return { restaurant, user };
    });

    // Notify via Telegram broadcast
    const userPart = result.user ? `• المستخدم: ${result.user.username}\n` : "";
    const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n${userPart}• المطعم: ${restaurantName}\n• الخطة: ${existing!.planName}\n• الرابط: ${restaurantSlug}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => console.error("[subscription] telegram failed:", e));

    // Notify user directly
    const existingUser = existing as typeof existing & { user: { id: number; telegramChatId: string | null } | null };
    const userChatId = existingUser.user?.telegramChatId;
    if (userChatId) {
      await notifyUserViaTelegram(String(userChatId),
        `✅ *تم تفعيل حسابك في Smart Menu!*\n\n• المطعم: ${restaurantName}\n• رابط المنيو: https://smart-link.ly/menu/${restaurantSlug}\n\nيمكنك الآن تسجيل الدخول والبدء في استقبال الطلبات.`);
    }

    // Record in SystemEvent table (awaited — SSE poll depends on this)
    await prisma.systemEvent.create({
      data: {
        eventType: "payment",
        title: "اشتراك جديد",
        message: `تم تأكيد دفع ${existing!.planName} — ${restaurantName}`,
        severity: "info",
        metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
      },
    });

    // Record user event in SystemEvent table
    if (existing!.userId) {
      await prisma.systemEvent.create({
        data: {
          eventType: "subscription_approved",
          title: "تم تفعيل الحساب",
          message: "تم تفعيل حسابك بنجاح!",
          severity: "info",
          metadata: { userId: existing!.userId, restaurantSlug },
        },
      });
    }

    return { ok: true, action: "verified", paymentId: existing!.id, restaurant: result.restaurant ? { id: result.restaurant.id, name: restaurantName, slug: restaurantSlug } : undefined, user: result.user ?? undefined };
  } catch (e) {
    console.error("[subscription-decisions] new user error:", e);
    const reason = (e instanceof Error && e.message === "SLUG_TAKEN")
      ? "رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر."
      : `حدث خطأ أثناء معالجة الطلب ${e instanceof Error ? e.message : ""}`;
    return { ok: false, reason };
  }
}

async function handleCancelled(existing: Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>): Promise<ResolveResult> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.subscriptionPayment.update({
      where: { id: existing!.id },
      data: { status: "cancelled" },
    });

    // Only reject if user still UNPAID (might have been promoted by another route)
    if (existing!.userId) {
      await tx.user.updateMany({
        where: { id: existing!.userId, subscriptionStatus: "UNPAID" },
        data: { subscriptionStatus: "REJECTED" },
      });
    }

    return updated;
  });

  // Telegram broadcast
  const msg = `❌ *تم رفض طلب الدفع*\n• الهاتف: ${existing!.phone}\n• المبلغ: ${existing!.amount} د.ل\n• الخطة: ${existing!.planName}`;
  sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => console.error("[subscription] cancel telegram failed:", e));

  // Notify user directly
  const existingUser = existing as typeof existing & { user: { id: number; telegramChatId: string | null } | null };
  const userChatId = existingUser.user?.telegramChatId;
  if (userChatId) {
    await notifyUserViaTelegram(String(userChatId),
      `❌ *عذراً، تم رفض طلب تفعيل حسابك في Smart Menu.*\n\nإذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الدعم الفني.`);
  }

  // Record admin event in SystemEvent table (awaited — SSE poll depends on this)
  await prisma.systemEvent.create({
    data: {
      eventType: "payment_rejected",
      title: "رفض اشتراك",
      message: `تم رفض دفع ${existing!.planName}`,
      severity: "warning",
      metadata: { amount: existing!.amount, planName: existing!.planName, phone: existing!.phone, userId: existing!.userId },
    },
  });

  // Record user event in SystemEvent table
  if (existing!.userId) {
    await prisma.systemEvent.create({
      data: {
        eventType: "subscription_rejected",
        title: "رفض طلب التفعيل",
        message: "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني.",
        severity: "warning",
        metadata: { userId: existing!.userId, paymentId: existing!.id },
      },
    });
  }

  return { ok: true, action: "cancelled", paymentId: existing!.id };
}

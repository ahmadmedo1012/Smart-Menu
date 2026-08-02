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
    tempRestaurants?: { name: string; slug: string }[];
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

  // NEW USER BRANCH — supports MULTIPLE menus (tempRestaurants[])
  // Backward compat: old payments used single tempRestaurantName/Slug
  const menus = meta?.tempRestaurants?.length
    ? meta.tempRestaurants
    : meta?.tempRestaurantSlug
      ? [{ name: meta.tempRestaurantName ?? `مطعم ${existing!.phone}`, slug: meta.tempRestaurantSlug }]
      : [{ name: `مطعم ${existing!.phone}`, slug: `restaurant-${existing!.id}` }];

  try {
    // eslint-disable-next-line prefer-const
    let primaryRestaurant: { id: number; name: string; slug: string } | null = null as { id: number; name: string; slug: string } | null;
    const result = await prisma.$transaction(async (tx) => {
      // Check ALL slugs unique
      for (const m of menus) {
        const slugTaken = await tx.restaurant.findUnique({ where: { slug: m.slug } });
        if (slugTaken) throw new Error("SLUG_TAKEN");
      }

      await tx.subscriptionPayment.update({
        where: { id: existing!.id, status: "pending" },
        data: { status: "verified" },
      });

      let user = null;
      if (existing!.userId) {
        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing!.planId },
          select: { maxItems: true, maxOrders: true },
        });

        // Create each restaurant; first = primary
        for (let i = 0; i < menus.length; i++) {
          const m = menus[i];
          const created = await tx.restaurant.create({
            data: {
              name: m.name,
              slug: m.slug,
              phone: existing!.phone,
              planId: existing!.planId,
              planStart: new Date(),
              planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              maxItems: plan?.maxItems ?? undefined,
              maxOrders: plan?.maxOrders ?? undefined,
              isActive: true,
            },
          });
          if (i === 0) primaryRestaurant = created;
          // Link every restaurant to the user via UserRestaurant (many-to-many)
          await tx.userRestaurant.create({
            data: { userId: existing!.userId, restaurantId: created.id, isPrimary: i === 0 },
          });
          // Auto-seed default categories so a fresh menu is never empty
          await tx.menuCategory.createMany({
            data: [
              { name: "مشروبات ساخنة", icon: "☕", sortOrder: 1, restaurantId: created.id, createdAt: new Date(), updatedAt: new Date() },
              { name: "مشروبات باردة", icon: "🧃", sortOrder: 2, restaurantId: created.id, createdAt: new Date(), updatedAt: new Date() },
              { name: "حلويات", icon: "🍰", sortOrder: 3, restaurantId: created.id, createdAt: new Date(), updatedAt: new Date() },
              { name: "وجبات خفيفة", icon: "🍔", sortOrder: 4, restaurantId: created.id, createdAt: new Date(), updatedAt: new Date() },
            ],
          });
        }

        user = await tx.user.update({
          where: { id: existing!.userId },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing!.planId,
            restaurantId: primaryRestaurant!.id,
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });
      }

      // SystemEvent creates INSIDE transaction
      await tx.systemEvent.create({
        data: {
          eventType: "payment",
          title: "اشتراك جديد",
          message: `تم تأكيد دفع ${existing!.planName} — ${primaryRestaurant?.name ?? menus[0]?.name ?? ''}`,
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
            metadata: { userId: existing!.userId, restaurantSlug: primaryRestaurant?.slug ?? menus[0]?.slug ?? '' },
          },
        });
      }

      return { restaurant: primaryRestaurant, user };
    });

    // Post-transaction Telegram notifications (fire-and-forget, best-effort)
    const userPart = result.user ? `• المستخدم: ${result.user.username}\n` : "";
    const menuList = menus.map((m) => `• ${m.name} → /menu/${m.slug}`).join("\n");
    const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n${userPart}• المنيوهات:\n${menuList}\n• الخطة: ${existing!.planName}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] telegram failed:", { error: e }));

    const existingUser = existing as typeof existing & { user: { id: number; telegramChatId: string | null } | null };
    const userChatId = existingUser.user?.telegramChatId;
    if (userChatId) {
      notifyUserViaTelegram(String(userChatId),
        `✅ *تم تفعيل حسابك في Smart Menu!*\n\n${menuList}\n\nيمكنك الآن تسجيل الدخول والبدء في استقبال الطلبات.`)
        .catch((e) => error("[subscription] notify user failed:", { error: e }));
    }

    return { ok: true, action: "verified", paymentId: existing!.id, restaurant: primaryRestaurant ? { id: primaryRestaurant.id, name: primaryRestaurant.name, slug: primaryRestaurant.slug } : undefined, user: result.user ?? undefined };
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

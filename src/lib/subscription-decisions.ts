import { prisma } from "@/lib/db";
import { sendTelegramNotification, notifyEvent } from "@/lib/telegram";
import { error } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { getDecryptedBotToken } from "@/lib/config";

// r93-W1a (MED-2، صنف r86-A5): القيم التي يتحكم بها المستخدم (اسم المطعم
// المؤقت من metadata الدفع، وusername) كانت تُركّب خامًا في رسائل
// parse_mode=Markdown — اسم مثل «[رابط](https://evil.example)» يُصيَّر رابطًا
// قابلًا للنقر في قناة موافقة الأدمن وفي بث المستخدمين المرتبطين.
// نفس دالة esc() المطبقة في notifyEvent (telegram.ts:30) منذ r86-A5 —
// منسوخة محليًا حتى لا تتقاطع ملكية الملفات بين وكلاء الموجة.
// parse_mode نفسها لم تتغير (Markdown)؛ القيم المشروعة بلا محارف خاصة
// تمر حرفيًا كما قبل، فلا تنكسر أي رسالة قائمة.
const escMarkdown = (s: unknown) => String(s).replace(/([_*\[\]`\\()])/g, "\\$1");

// round87-C4: the decision handlers below used to accept the raw (nullable)
// findUnique result, forcing a non-null `!` on every `existing` field access.
// The caller already null-checks before dispatching — model that invariant in
// the type (and the user include) and the assertions disappear. Pure type-level.
function loadPayment(paymentId: number) {
  return prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, telegramChatId: true } } },
  });
}
type ExistingPayment = NonNullable<Awaited<ReturnType<typeof loadPayment>>>;

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
  // round91-F-B: `status` lets callers surface the right HTTP code for the
  // failure arm (409 for the plan-cap rejection). Absent → the legacy 400.
  | { ok: false; reason: string; status?: number };

export async function resolveSubscriptionPayment(
  paymentId: number,
  decision: Decision,
): Promise<ResolveResult> {
  const existing = await loadPayment(paymentId);
  if (!existing) return { ok: false, reason: "الطلب غير موجود" };
  if (existing.status !== "pending") return { ok: false, reason: "تمت معالجة هذا الطلب مسبقاً" };

  if (decision === "verified") {
    return handleVerified(existing);
  }

  return handleCancelled(existing);
}

async function handleVerified(existing: ExistingPayment): Promise<ResolveResult> {
  const meta = existing.metadata as {
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
          where: { id: existing.id, status: "pending" },
          data: { status: "verified" },
        });

        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing.planId },
          select: { id: true, nameAr: true, maxItems: true, maxOrders: true },
        });

        const restaurant = await tx.restaurant.update({
          where: { id: meta.upgradeRestaurantId },
          data: {
            planId: existing.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxItems: plan?.maxItems ?? undefined,
            maxOrders: plan?.maxOrders ?? undefined,
          },
        });

        await tx.user.update({
          // upgrade payments are always user-linked (requireAuth'd /api/subscriptions/upgrade
          // always writes userId); if a null ever slipped through, this update fails the
          // transaction — identical pre-C4 behavior, hence the single domain `!`
          where: { id: existing.userId! },
          data: {
            planId: existing.planId,
            subscriptionStatus: "PAID",
          },
        });

        // SystemEvent creates INSIDE transaction — atomic with core mutation
        await tx.systemEvent.create({
          data: {
            eventType: "payment",
            title: "ترقية اشتراك",
            message: `تم تأكيد ترقية ${existing.planName} — ${restaurant.name}`,
            severity: "info",
            metadata: { amount: existing.amount, planName: existing.planName, phone: existing.phone, userId: existing.userId },
          },
        });

        if (existing.userId) {
          await tx.systemEvent.create({
            data: {
              eventType: "subscription_approved",
              title: "تم تفعيل الترقية",
              message: "تم ترقية خطتك بنجاح!",
              severity: "info",
              metadata: { userId: existing.userId, upgradeRestaurantId: meta.upgradeRestaurantId },
            },
          });
        }

        return { restaurant, plan };
      });

      // Ponytail: Telegram notification fire-and-forget. At this point DB is
      // fully committed. If Telegram fails, the payment is still active.
      // r93-W1a (MED-2): اسم المطعم يضعه المالك — يُرمّز قبل التركيب.
      const msg = `⬆️ *تم تأكيد الترقية*\n• المطعم: ${escMarkdown(result.restaurant.name)}\n• الخطة: ${escMarkdown(result.plan?.nameAr ?? existing.planName)}\n• المبلغ: ${existing.amount} د.ل`;
      sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] telegram notify failed:", { error: e }));

      return { ok: true, action: "verified", paymentId: existing.id };
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
      ? [{ name: meta.tempRestaurantName ?? `مطعم ${existing.phone}`, slug: meta.tempRestaurantSlug }]
      : [{ name: `مطعم ${existing.phone}`, slug: `restaurant-${existing.id}` }];

  try {
    const result = await prisma.$transaction(async (tx) => {
      // primary (first) created restaurant — returned by this callback so the
      // post-transaction code reads it from `result.restaurant` (round87-C4:
      // the old outer-scope let + `null as …` self-cast confused flow analysis)
      let primaryRestaurant: { id: number; name: string; slug: string } | null = null;
      // round91-F-B (D2-#1): every created row (post-commit audit/notify below)
      const createdRestaurants: { id: number; name: string; slug: string }[] = [];
      // Check ALL slugs unique
      for (const m of menus) {
        const slugTaken = await tx.restaurant.findUnique({ where: { slug: m.slug } });
        if (slugTaken) throw new Error("SLUG_TAKEN");
      }

      await tx.subscriptionPayment.update({
        where: { id: existing.id, status: "pending" },
        data: { status: "verified" },
      });

      let user = null;
      if (existing.userId) {
        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing.planId },
          select: { maxItems: true, maxOrders: true, maxMenus: true },
        });

        // round91-F-B (D2-#1 — plan-cap bypass): كان هذا المسار ينشئ كل منيو
        // في metadata دون أي مقارنة بسقف الخطة. نفس نمط owner/restaurants:122 —
        // قفل صف المستخدم FOR UPDATE ثم عدّ منيوهاته القائمة تحت القفل؛
        // الخاسر المتزامن (موافقة ثانية/إنشاء مالك متزامن) يعيد العد بعد
        // commit الفائز فيرى الرقم الحقيقي. مطاعم سبق إنشاؤها تُحسب من السقف
        // — إعادة تشغيل موافقة ناجحة تصطدم ببوابة الحالة أعلاه أولاً (idempotent).
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${existing.userId} FOR UPDATE`;
        const existingMenus = await tx.userRestaurant.count({
          where: { userId: existing.userId },
        });
        const maxMenus = plan?.maxMenus ?? 1;
        if (existingMenus + menus.length > maxMenus) {
          // caught below → { ok:false, reason: «تجاوز سقف المطاعم للخطة», status: 409 }
          throw new Error("MENU_CAP_EXCEEDED");
        }

        // Create each restaurant; first = primary
        for (let i = 0; i < menus.length; i++) {
          const m = menus[i];
          const created = await tx.restaurant.create({
            data: {
              name: m.name,
              slug: m.slug,
              phone: existing.phone,
              planId: existing.planId,
              planStart: new Date(),
              planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              maxItems: plan?.maxItems ?? undefined,
              maxOrders: plan?.maxOrders ?? undefined,
              isActive: true,
            },
          });
          createdRestaurants.push({ id: created.id, name: created.name, slug: created.slug });
          if (i === 0) primaryRestaurant = created;
          // Link every restaurant to the user via UserRestaurant (many-to-many)
          await tx.userRestaurant.create({
            data: { userId: existing.userId, restaurantId: created.id, isPrimary: i === 0 },
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
          where: { id: existing.userId },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing.planId,
            restaurantId: primaryRestaurant!.id, // first loop pass always assigns (menus is never empty)
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });
      }

      // SystemEvent creates INSIDE transaction
      await tx.systemEvent.create({
        data: {
          eventType: "payment",
          title: "اشتراك جديد",
          message: `تم تأكيد دفع ${existing.planName} — ${primaryRestaurant?.name ?? menus[0]?.name ?? ''}`,
          severity: "info",
          metadata: { amount: existing.amount, planName: existing.planName, phone: existing.phone, userId: existing.userId },
        },
      });

      if (existing.userId) {
        await tx.systemEvent.create({
          data: {
            eventType: "subscription_approved",
            title: "تم تفعيل الحساب",
            message: "تم تفعيل حسابك بنجاح!",
            severity: "info",
            metadata: { userId: existing.userId, restaurantSlug: primaryRestaurant?.slug ?? menus[0]?.slug ?? '' },
          },
        });
      }

      return { restaurant: primaryRestaurant, createdRestaurants, user };
    });

    // round91-F-B (D2-#1): per-restaurant audit + notify mirroring the two
    // gated creation routes (owner/restaurants POST, R90-F5b-C create-owner) —
    // this was the only restaurant-creation path with NO audit/notify per row.
    // Post-commit, best-effort: failures never fail the approved payment.
    // actorId null = system actor (the approving admin's id isn't available
    // inside the lib; the paymentId/userId in metadata trace the flow).
    for (const r of result.createdRestaurants) {
      logAudit({
        action: "create",
        targetType: "restaurant",
        targetId: r.id,
        metadata: { paymentId: existing.id, userId: existing.userId, name: r.name, slug: r.slug, source: "subscription-approval" },
      }).catch(() => {});
      notifyEvent(
        "restaurant_created",
        { name: r.name, slug: r.slug, plan: existing.planId ? "paid" : "free" },
        { adminOnly: true }
      ).catch(() => {});
    }

    // Post-transaction Telegram notifications (fire-and-forget, best-effort)
    // r93-W1a (MED-2): username من التسجيل واسم/رابط المنيو المؤقت من
    // metadata الدفع (يكتبهما زبون الدفع عبر payment-schema) — كلها تُرمّز
    // قبل التركيب؛ قائمة المنيوهات المرمّزة نفسها تُعاد استخدامها في رسالة
    // المستخدم المرتبط أدناه (notifyUserViaTelegram parse_mode=Markdown أيضًا).
    const userPart = result.user ? `• المستخدم: ${escMarkdown(result.user.username)}\n` : "";
    const menuList = menus.map((m) => `• ${escMarkdown(m.name)} → /menu/${escMarkdown(m.slug)}`).join("\n");
    const msg = `✅ *تم تأكيد الدفع وترقية الحساب*\n${userPart}• المنيوهات:\n${menuList}\n• الخطة: ${escMarkdown(existing.planName)}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] telegram failed:", { error: e }));

    const userChatId = existing.user?.telegramChatId;
    if (userChatId) {
      notifyUserViaTelegram(String(userChatId),
        `✅ *تم تفعيل حسابك في Smart Menu!*\n\n${menuList}\n\nيمكنك الآن تسجيل الدخول والبدء في استقبال الطلبات.`)
        .catch((e) => error("[subscription] notify user failed:", { error: e }));
    }

    return { ok: true, action: "verified", paymentId: existing.id, restaurant: result.restaurant ? { id: result.restaurant.id, name: result.restaurant.name, slug: result.restaurant.slug } : undefined, user: result.user ?? undefined };
  } catch (e: unknown) {
    error("[subscription-decisions] new user error:", { error: e });
    const errMsg = e instanceof Error ? e.message : "";
    const prismaErr = e as Record<string, unknown>;
    // round91-F-B (D2-#1): cap rejection — 409 (conflict with the plan's
    // maxMenus), Arabic reason surfaced to the approving admin.
    if (errMsg === "MENU_CAP_EXCEEDED") {
      return { ok: false, reason: "تجاوز سقف المطاعم للخطة", status: 409 };
    }
    const isSlugConflict = errMsg === "SLUG_TAKEN" || (prismaErr.code === "P2002" && String(prismaErr.meta ?? "").includes("slug"));
    const reason = isSlugConflict
      ? "رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر."
      : "حدث خطأ أثناء معالجة الطلب";
    return { ok: false, reason };
  }
}

async function handleCancelled(existing: ExistingPayment): Promise<ResolveResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.subscriptionPayment.updateMany({
        where: { id: existing.id, status: "pending" },
        data: { status: "cancelled" },
      });
      if (result.count === 0) return; // Already processed by another route

      if (existing.userId) {
        await tx.user.updateMany({
          where: { id: existing.userId, subscriptionStatus: "UNPAID" },
          data: { subscriptionStatus: "REJECTED" },
        });
      }

      // SystemEvent creates INSIDE transaction
      await tx.systemEvent.create({
        data: {
          eventType: "payment_rejected",
          title: "رفض اشتراك",
          message: `تم رفض دفع ${existing.planName}`,
          severity: "warning",
          metadata: { amount: existing.amount, planName: existing.planName, phone: existing.phone, userId: existing.userId },
        },
      });

      if (existing.userId) {
        await tx.systemEvent.create({
          data: {
            eventType: "subscription_rejected",
            title: "رفض طلب التفعيل",
            message: "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني.",
            severity: "warning",
            metadata: { userId: existing.userId, paymentId: existing.id },
          },
        });
      }
    });

    // Post-transaction notifications
    // r93-W1a (MED-2): الهاتف والخطة يُرمّزان هنا أيضًا (اتساقًا مع بقية
    // الرسائل — المبلغ رقم ولا يحمل محارف Markdown أصلًا).
    const msg = `❌ *تم رفض طلب الدفع*\n• الهاتف: ${escMarkdown(existing.phone)}\n• المبلغ: ${existing.amount} د.ل\n• الخطة: ${escMarkdown(existing.planName)}`;
    sendTelegramNotification(msg, { parseMode: "Markdown" }).catch((e) => error("[subscription] cancel telegram failed:", { error: e }));

    const userChatId = existing.user?.telegramChatId;
    if (userChatId) {
      notifyUserViaTelegram(String(userChatId),
        `❌ *عذراً، تم رفض طلب تفعيل حسابك في Smart Menu.*\n\nإذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الدعم الفني.`)
        .catch((e) => error("[subscription] cancel notify user failed:", { error: e }));
    }

    return { ok: true, action: "cancelled", paymentId: existing.id };
  } catch (e: unknown) {
    error("[subscription-decisions] cancel error:", { error: e });
    return { ok: false, reason: "حدث خطأ أثناء رفض الطلب" };
  }
}

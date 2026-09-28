import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError, error as apiError } from "@/lib/api-helpers";
import { formatDate, formatPrice } from "@/lib/format";
import { normalizeWaNumber } from "@/lib/whatsapp";
import { requireAuth } from "@/lib/auth";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { parseStoredModifiers, type StoredModifierOption } from "@/lib/order-modifiers";

const generateSchema = z.object({
  orderId: z.number().int().positive(),
});

// round94-3a (تقرير B LOW-1): المسار كله كان بلا حد معدل — استدعاء متكرر
// يضرب DB ويوسم whatsappSent=true أثرًا جانبيًا مجانيًا في كل ضغطة.
// 20/دقيقة لكل مستخدم مصادَق — نمط items/[id] PUT (r91-F-B): مفتاح جلسة
// غير قابل للتزوير (لا مكوّن header)، ويُفحص بعد بوابة 401 كي لا يحرق
// المجهولُ ميزانية أحد.
// exemptFromRelax (r94 محاكاة): نفس سابقة accountBackstopLimiter الموثقة
// (login/route.ts) — الميزانية الصارمة 20/د مُوكَّدة حيًّا بـ e2e
// (round94-sim-fixes) فلا تُوسَّع تحت RATE_LIMIT_TEST_RELAX؛ المسار شبه
// مهجور في المواصفات الأخرى (1-2 نداء) فالميزانية الحقيقية آمنة للـCI.
const waGenerateDbLimiter = createDbRateLimiter({
  windowMs: 60_000,
  max: 20,
  exemptFromRelax: true,
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    // round94-3a (LOW-1): بعد بوابة 401 — مفتاح لكل مستخدم
    const { success: allowed } = await waGenerateDbLimiter.check(`wa-gen:${auth.userId}`);
    if (!allowed) return apiError("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const body = generateSchema.parse(await request.json());

    // round94-3a (LOW-1 — عدّاد 404/403): فروع الترخيص التي لا تحتاج صف
    // الطلب تُفحص قبل findUnique — كان الجلب يسبق سلّم الأدوار فيميّز أي
    // مستخدم مصادَق (حتى USER) الطلباتِ الموجودة عن غيرها (404 مقابل 403).
    // فرع المالك يبقى بعد الجلب لأن فحصه يحتاج order.restaurantId (عقد 403
    // الموحّد r90-F3 محفوظ: المصادَق غير المصرّح له = 403).
    if (
      auth.role !== "owner" &&
      auth.role !== "super_admin" &&
      auth.role !== "admin" &&
      auth.role !== "sub_admin"
    ) {
      // USER وأي دور غير معروف — رفض افتراضي دون تسريب وجود الطلب
      return Response.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }
    if (
      (auth.role === "admin" || auth.role === "sub_admin") &&
      !(auth.permissions ?? []).includes("APPROVE_ORDERS")
    ) {
      // admins need explicit permission to read any order's details
      return Response.json({ success: false, error: "لا تملك الصلاحية" }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: {
        id: true,
        orderNo: true,
        customerName: true,
        customerPhone: true,
        pickupType: true,
        total: true,
        discount: true,
        createdAt: true,
        restaurantId: true,
        restaurant: { select: { name: true, whatsapp: true } },
        // r118-A3-P2-1: the invoice lines omitted modifier deltas — line sums
        // silently diverged from the charged total on every modified order.
        items: { select: { id: true, quantity: true, price: true, notes: true, modifiersJson: true, item: { select: { id: true, name: true, nameAr: true } } } },
      },
    });
    if (!order) return notFound('الطلب');

    // Owners can only generate for their own restaurant (multi-menu aware)
    if (auth.role === "owner") {
      if (auth.restaurantId !== order.restaurantId) {
        const link = await prisma.userRestaurant.findUnique({
          where: { userId_restaurantId: { userId: auth.userId!, restaurantId: order.restaurantId } },
        });
        // round90-F3: authenticated-but-unauthorized is 403, matching PUT in
        // orders/[id] and the round89-E3 401/403 split (was 401).
        if (!link) return Response.json({ success: false, error: "غير مصرح" }, { status: 403 });
      }
    }
    // super_admin passes (round86-A11) and admin/sub_admin with
    // APPROVE_ORDERS were already gated above — no other role reaches here.

    // r118-A3-P2-1: legacy rows (bare id arrays) resolve best-effort against
    // the CURRENT options — dangling ids after a group replacement are skipped
    // (r118 create path stores the authoritative snapshot instead).
    const parsedModifiers = new Map<number, { nameAr: string; name: string; priceDelta: number }[]>();
    for (const oi of order.items) {
      const mods = await parseStoredModifiers(oi.modifiersJson, async (ids) => {
        const rows = await prisma.modifierOption.findMany({
          where: { id: { in: ids } },
          select: { id: true, nameAr: true, name: true, priceDelta: true },
        });
        const m = new Map<number, StoredModifierOption>();
        for (const r of rows) m.set(r.id, { id: r.id, nameAr: r.nameAr, name: r.name, priceDelta: Number(r.priceDelta) });
        return m;
      });
      parsedModifiers.set(oi.id, mods);
    }

    const lines: string[] = [];
    lines.push(`🧾 *${order.restaurant.name}*`);
    lines.push(`📋 طلب رقم: ${order.orderNo}`);
    lines.push(`👤 العميل: ${order.customerName || "غير محدد"}`);
    lines.push(`📞 الهاتف: ${order.customerPhone || "غير محدد"}`);
    lines.push(`📍 نوع الطلب: ${order.pickupType === "delivery" ? "توصيل" : order.pickupType === "takeaway" ? "سفري" : "داخل المحل"}`);
    lines.push("");
    lines.push("*الطلبات:*");
    for (const oi of order.items) {
      const itemName = oi.item.nameAr || oi.item.name;
      const mods = parsedModifiers.get(oi.id) ?? [];
      // round97-X3: prices render through the canonical formatPrice (raw
      // template interpolation before) — integers are byte-identical
      // ("10 د.ل"), non-half floats now round to the app-wide 1-decimal
      // convention instead of emitting 12.25.
      // r120 (4ba875a2): OrderItem.price now stores the EFFECTIVE unit price
      // (base + modifier deltas) — render it AS-IS. r118-A3-P2-1's `+ deltaSum`
      // double-counted deltas on every post-r120 modified row (line = base +
      // 2×deltas while «المجموع» = base + deltas — the exact self-contradicting
      // invoice r120 declared fixed). Pre-r120 base-only rows are backfilled by
      // zz_round121_orderitem_effective_price_backfill; the «الإضافات» line
      // below stays informational (names + deltas), never arithmetic.
      lines.push(`  ${oi.quantity}x ${itemName} - ${formatPrice(Number(oi.price))}`);
      if (mods.length > 0) {
        const modText = mods
          .map((m) => {
            const label = m.nameAr || m.name;
            if (m.priceDelta === 0) return label;
            return `${label} (${m.priceDelta > 0 ? "+" : ""}${formatPrice(m.priceDelta)})`;
          })
          .join("، ");
        lines.push(`    الإضافات: ${modText}`);
      }
      if (oi.notes) lines.push(`    ملاحظات: ${oi.notes}`);
    }
    lines.push("");
    lines.push(`💰 المجموع: ${formatPrice(Number(order.total))}`);
    if (Number(order.discount) > 0) lines.push(`🔖 الخصم: ${formatPrice(Number(order.discount))}`);
    lines.push(`📅 ${formatDate(order.createdAt)}`);

    const message = lines.join("\n");

    await prisma.order.update({ where: { id: body.orderId }, data: { whatsappSent: true } });

    // round97-X3 (HIGH — money path): the deep link was built from the RAW
    // stored whatsapp value — "+218…" or "218 91…" produced a broken wa.me
    // URL (the phone never received the order). normalizeWaNumber (the
    // canonical shared normalizer) strips separators/+/00 and validates
    // length; an invalid stored number falls back to whatsappUrl:null exactly
    // like the stored-null case (the client then falls back to copy).
    const wa = normalizeWaNumber(order.restaurant.whatsapp);
    const whatsappUrl = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}`
      : null;

    return success({ message, whatsappUrl, orderId: order.id });
  } catch (e) {
    return handleError(e);
  }
}

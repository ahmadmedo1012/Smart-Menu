import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError, error as apiError } from "@/lib/api-helpers";
import { formatPrice, formatDateTripoli } from "@/lib/format";
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
        // r138 (W5-C3): الرسوم المسحوبة على الطلب نفسها — الصف يُفرد سطرها
        // (NULL = صف ما قبل r138: يبقى العرض القديم، لا قيمة مُختَرعة).
        deliveryFee: true,
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

    // r143 (Phase-4 W1 D4): نفس قانون receipt.ts — الإيموجي هروبات \u{...}
    // لا حروف خام (فئة تلف U+FFFD المرصودة حيًا في نص wa.me) — السلسلة
    // الناتجة مطابقة بايت-بايت لما قبل الهروب.
    const lines: string[] = [];
    lines.push(`\u{1F9FE} *${order.restaurant.name}*`);
    lines.push(`\u{1F4CB} طلب رقم: ${order.orderNo}`);
    lines.push(`\u{1F464} العميل: ${order.customerName || "غير محدد"}`);
    lines.push(`\u{1F4DE} الهاتف: ${order.customerPhone || "غير محدد"}`);
    lines.push(`\u{1F4CD} نوع الطلب: ${order.pickupType === "delivery" ? "توصيل" : order.pickupType === "takeaway" ? "سفري" : "داخل المحل"}`);
    lines.push("");
    lines.push("*الطلبات:*");
    for (const oi of order.items) {
      const itemName = oi.item.nameAr || oi.item.name;
      const mods = parsedModifiers.get(oi.id) ?? [];
      // round97-X3: prices render through the canonical formatPrice. r133
      // ruling R14 (A12 S11): the restaurant forward is a money DOCUMENT —
      // explicit 2 decimals like the customer receipt (receipt.ts), so the
      // same order no longer reads «7.50 د.ل» to the customer and «7.5 د.ل»
      // to the restaurant. r120 (4ba875a2): OrderItem.price stores the
      // EFFECTIVE unit price (base + modifier deltas) — render it AS-IS.
      // r118-A3-P2-1's `+ deltaSum` double-counted deltas on every post-r120
      // modified row (line = base + 2×deltas while «المجموع» = base + deltas
      // — the exact self-contradicting invoice r120 declared fixed).
      // Pre-r120 base-only rows are backfilled by
      // zz_round122_orderitem_effective_price_backfill; the «الإضافات» line
      // below stays informational (names + deltas), never arithmetic.
      // r138 (W5-C3): the r120 invariant «lines sum exactly to the total»
      // held for r137+ delivery orders only because the fee was invisible —
      // now the fee line below restores it: lines + fee = المجموع for
      // post-r138 rows; legacy NULL-fee rows keep the pre-r138 rendering
      // (lines sum to subtotal; the fee, if any, is unrecoverable).
      lines.push(`  ${oi.quantity}x ${itemName} - ${formatPrice(Number(oi.price), { decimals: 2 })}`);
      if (mods.length > 0) {
        const modText = mods
          .map((m) => {
            const label = m.nameAr || m.name;
            if (m.priceDelta === 0) return label;
            return `${label} (${m.priceDelta > 0 ? "+" : ""}${formatPrice(m.priceDelta, { decimals: 2 })})`;
          })
          .join("، ");
        lines.push(`    الإضافات: ${modText}`);
      }
      if (oi.notes) lines.push(`    ملاحظات: ${oi.notes}`);
    }
    lines.push("");
    // r138 (W5-C3 — صدق الفاتورة): سطر الرسوم المفرد بين الأصناف والمجموع
    // (نفس بنية إيصال الزبون receipt.ts r137 — المستندان يتفقان بنيويًا:
    // الأسطر + الرسوم = الإجمالي). يُعرض فقط عند قيمة مسجلة > 0: NULL (صف
    // ما قبل r138، الرسوم غير معروفة — لا يُخترَع سطر) و0 (لا رسوم) لا
    // يرسمان شيئًا — قانون «رسوم 0 معاملة الإطفاء» (delivery-meta.ts).
    if (order.deliveryFee != null && Number(order.deliveryFee) > 0) {
      lines.push(`\u{1F6F5} رسوم التوصيل: ${formatPrice(Number(order.deliveryFee), { decimals: 2 })}`);
    }
    lines.push(`\u{1F4B0} المجموع: ${formatPrice(Number(order.total), { decimals: 2 })}`);
    if (Number(order.discount) > 0) lines.push(`\u{1F516} الخصم: ${formatPrice(Number(order.discount), { decimals: 2 })}`);
    // r133-A12 M2: formatDate reads the server's local clock — UTC on Vercel,
    // 2-3h behind Libya. formatDateTripoli pins this one server-side site to
    // Africa/Tripoli (every other formatDate consumer is client-side).
    lines.push(`\u{1F4C5} ${formatDateTripoli(order.createdAt)}`);

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

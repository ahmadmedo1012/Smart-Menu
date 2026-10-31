/**
 * Build a WhatsApp receipt message for an order.
 * Shared between OrderDialog and CartPage.
 */
// round97-X3: the local AR_MONTHS + ts() duplicates were deleted — the date
// line now renders through format.ts's formatDate. Its " | " separator is
// preserved via the timeSeparator option so the receipt OUTPUT is unchanged.
import { formatPrice, toArabicNumber, formatDate } from "@/lib/format";
// r132-F2b (A10 #5, porting web r121-O-1): the pickup label map is now the
// canonical lib one — this is the money-adjacent WhatsApp surface, so the
// raw-value fallback below is preserved byte-for-byte (web pins the
// 'vip' case; an unknown pickup type prints the raw value instead of
// silently mislabeling it «داخل المكان»).
import { getPickupTypeMeta, PICKUP_TYPE_META } from "@/lib/order-status";

// P38 (C2 audit P0-1, porting web r143): every emoji in this document is
// written as a \u{...} escape, never a raw multibyte literal — the web
// twin observed U+FFFD replacement glyphs in the production invoice when a
// toolchain pass read the source with a non-UTF-8 locale (QA D4: the
// encoded wa.me text opened with %EF%BF%BD). Raw 4-byte UTF-8 literals are
// one re-encoding pass away from exactly that corruption; ASCII-only
// escapes are immune at the byte level while producing the identical
// runtime string.
const SEP = "━━━━━━━━━━━━━━━━━━━━━━";
const SEP_L = "──────────────────────";

export type ReceiptItem = { name: string; qty: number; price: number; notes?: string };

export function buildReceiptMessage(opts: {
  restaurantName: string;
  items: ReceiptItem[];
  totalPrice: number;
  /* P38 (C2 P0-1, porting web r137): رسوم التوصيل المستحقة (يُعرض السطر
     فقط بقيمة > 0) — الإجمالي الممرَّر يجب أن يكون شاملًا الرسوم (صدق
     الفاتورة: السطور تُفسّر الإجمالي، لا تناقضه). قبل هذا النقل كانت
     فاتورة الجوال تُظهر إجماليًا شاملًا الرسوم دون سطر الرسوم — الأسطر
     لا تجمع إلى الإجمالي عندما توجد رسوم. */
  deliveryFee?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  pickupType?: string;
  orderNo?: string;
  menuUrl?: string;
}): string {
  const lines: string[] = [];

  // ── Header ──
  lines.push("╔══════════════════════════╗");
  lines.push(`║   \u{1F3EA} *${opts.restaurantName}*`);
  lines.push("║   \u{1F4CB} *فاتورة طلب*");
  lines.push("╚══════════════════════════╝");
  lines.push("");

  // ── Order info ──
  if (opts.orderNo) lines.push(`\u{1F194} *رقم الطلب*       ${opts.orderNo}`);
  lines.push(`\u{1F550} *التاريخ*         ${formatDate(new Date(), { timeSeparator: " | " })}`);
  if (opts.pickupType) lines.push(`\u{1F4CD} *نوع الطلب*       ${PICKUP_TYPE_META[opts.pickupType]?.label || opts.pickupType}`);
  lines.push("");

  // ── Customer info ──
  if (opts.customerName || opts.customerPhone) {
    lines.push("\u{1F464} *بيانات العميل*");
    lines.push(SEP_L);
    if (opts.customerName) lines.push(`   ${opts.customerName}`);
    if (opts.customerPhone) lines.push(`   \u{1F4DE} ${opts.customerPhone}`);
    lines.push("");
  }

  // ── Items ──
  lines.push("\u{1F4E6} *الأصناف المطلوبة*");
  lines.push(SEP_L);
  opts.items.forEach((item, i) => {
    // Canonical formatters: Western digits + "د.ل", same as the rest of the app
    const qtyStr = toArabicNumber(item.qty);
    const priceStr = formatPrice(item.price, { decimals: 2, suffix: "" }).trim();
    const totalStr = formatPrice(item.qty * item.price, { decimals: 2, suffix: "" }).trim();
    lines.push(`   ${toArabicNumber(i + 1)}. *${item.name}*`);
    lines.push(`      ${qtyStr} × ${priceStr} د.ل  =  ${totalStr} د.ل`);
    if (item.notes) lines.push(`      \u{1F4DD} _${item.notes}_`);
  });
  lines.push(SEP);
  lines.push("");

  // ── P38 (web r137): Delivery fee (separate line, after the items, before
  //    the total) — the lines must EXPLAIN the total, never contradict it ──
  if (opts.deliveryFee && opts.deliveryFee > 0) {
    lines.push(`\u{1F6F5} *رسوم التوصيل*      ${formatPrice(opts.deliveryFee, { decimals: 2 })}`);
    lines.push("");
  }

  // ── Total ──
  lines.push(`\u{1F4B5} *الإجمالي*`);
  lines.push(`   ${formatPrice(opts.totalPrice, { decimals: 2 })}`);
  lines.push(SEP);
  lines.push("");

  // ── Notes ──
  if (opts.notes) {
    lines.push(`\u{1F4DD} *ملاحظات إضافية*`);
    lines.push(`   ${opts.notes}`);
    lines.push("");
  }

  // ── Footer ──
  lines.push("╔══════════════════════════╗");
  lines.push("║   \u{2728} *شكراً لطلبك!* \u{2728}");
  lines.push(`║   ${opts.restaurantName}`);
  lines.push("╚══════════════════════════╝");
  lines.push("");
  lines.push(`\u{1F550} _طلب جديد عبر المنيو الإلكتروني_`);
  if (opts.menuUrl) lines.push(`\u{1F310} ${opts.menuUrl}`);
  lines.push(`\u{1F31F} _نتمنى لكم تجربة ممتعة!_`);

  return lines.join("\n");
}

/**
 * Shared owner/admin copy-as-text builder (round-77: two byte-identical
 * implementations lived in owner/orders/[id] and admin/orders/[id]).
 * Renders order + items + totals for clipboard sharing.
 */
export function buildOrderShareText(o: {
  orderNo: string;
  customerName: string;
  customerPhone: string | null;
  pickupType: string;
  total: number | { toString(): string };
  /* P38 (C2 P0-1, porting web r138): الرسوم المسجلة على الطلب (Decimal
     يصل سلسلة من JSON) — null = صف ما قبل r138 (لا يُخترَع سطر)،
     0 = لا رسوم (لا سطر). */
  deliveryFee?: number | { toString(): string } | null;
  items: { item: { nameAr: string | null; name: string }; quantity: number; price: number }[];
}): string {
  const items = o.items
    .map(
      (oi) =>
        // r132-F2b (A10 #5, porting web r121 H-1/X3): the share text unifies
        // with the same order's WhatsApp receipt (decimals 2 above) — the
        // owner used to share «23.0» while the customer's receipt said
        // «23.00», and «7.25» rounded to «7.3».
        `• ${oi.item.nameAr || oi.item.name} ×${toArabicNumber(oi.quantity)} = ${formatPrice(oi.price * oi.quantity, { decimals: 2 })}`
    )
    .join("\n");
  // P38 (web r138 — صدق الفاتورة): سطر الرسوم بين الأصناف والإجمالي — نفس
  // بنية إيصال الزبون (رسوم التوصيل قبل الإجمالي) فيجمع المستندان بصدق:
  // الأسطر + الرسوم = الإجمالي. يُعرض فقط عند قيمة > 0.
  const feeLine =
    o.deliveryFee != null && Number(o.deliveryFee) > 0
      ? `\u{1F6F5} رسوم التوصيل: ${formatPrice(Number(o.deliveryFee), { decimals: 2 })}\n`
      : "";
  // r132-F2b (web r121-O-1): canonical label (same inside-fallback the old
  // ternary hardcoded; unknown values fall back via getPickupTypeMeta).
  const type = getPickupTypeMeta(o.pickupType).label;
  return `\u{1F4CB} طلب ${toArabicNumber(o.orderNo)}
━━━━━━━━━━━━━
\u{1F464} ${o.customerName} | ${o.customerPhone ?? ""}
\u{1F4CD} ${type}
━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━
${feeLine}\u{1F4B0} الإجمالي: ${formatPrice(Number(o.total), { decimals: 2 })}`;
}

/**
 * Build a WhatsApp receipt message for an order.
 * Shared between OrderDialog and CartPage.
 */
import { formatPrice, toArabicNumber } from "@/lib/format";

const SEP = "━━━━━━━━━━━━━━━━━━━━━━";
const SEP_L = "──────────────────────";
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function ts(): string {
  const d = new Date();
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} | ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

export type ReceiptItem = { name: string; qty: number; price: number; notes?: string };

export function buildReceiptMessage(opts: {
  restaurantName: string;
  items: ReceiptItem[];
  totalPrice: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  pickupType?: string;
  orderNo?: string;
  menuUrl?: string;
}): string {
  const lines: string[] = [];
  const labels: Record<string, string> = { inside: "داخل المكان", takeaway: "سفري", delivery: "توصيل" };

  // ── Header ──
  lines.push("╔══════════════════════════╗");
  lines.push(`║   🏪 *${opts.restaurantName}*`);
  lines.push("║   📋 *فاتورة طلب*");
  lines.push("╚══════════════════════════╝");
  lines.push("");

  // ── Order info ──
  if (opts.orderNo) lines.push(`🆔 *رقم الطلب*       ${opts.orderNo}`);
  lines.push(`🕐 *التاريخ*         ${ts()}`);
  if (opts.pickupType) lines.push(`📍 *نوع الطلب*       ${labels[opts.pickupType] || opts.pickupType}`);
  lines.push("");

  // ── Customer info ──
  if (opts.customerName || opts.customerPhone) {
    lines.push("👤 *بيانات العميل*");
    lines.push(SEP_L);
    if (opts.customerName) lines.push(`   ${opts.customerName}`);
    if (opts.customerPhone) lines.push(`   📞 ${opts.customerPhone}`);
    lines.push("");
  }

  // ── Items ──
  lines.push("📦 *الأصناف المطلوبة*");
  lines.push(SEP_L);
  opts.items.forEach((item, i) => {
    // Canonical formatters: Western digits + "د.ل", same as the rest of the app
    const qtyStr = toArabicNumber(item.qty);
    const priceStr = formatPrice(item.price, { decimals: 2, suffix: "" }).trim();
    const totalStr = formatPrice(item.qty * item.price, { decimals: 2, suffix: "" }).trim();
    lines.push(`   ${toArabicNumber(i + 1)}. *${item.name}*`);
    lines.push(`      ${qtyStr} × ${priceStr} د.ل  =  ${totalStr} د.ل`);
    if (item.notes) lines.push(`      📝 _${item.notes}_`);
  });
  lines.push(SEP);
  lines.push("");

  // ── Total ──
  lines.push(`💵 *الإجمالي*`);
  lines.push(`   ${formatPrice(opts.totalPrice, { decimals: 2 })}`);
  lines.push(SEP);
  lines.push("");

  // ── Notes ──
  if (opts.notes) {
    lines.push(`📝 *ملاحظات إضافية*`);
    lines.push(`   ${opts.notes}`);
    lines.push("");
  }

  // ── Footer ──
  lines.push("╔══════════════════════════╗");
  lines.push("║   ✨ *شكراً لطلبك!* ✨");
  lines.push(`║   ${opts.restaurantName}`);
  lines.push("╚══════════════════════════╝");
  lines.push("");
  lines.push(`🕐 _طلب جديد عبر المنيو الإلكتروني_`);
  if (opts.menuUrl) lines.push(`🌐 ${opts.menuUrl}`);
  lines.push(`🌟 _نتمنى لكم تجربة ممتعة!_`);

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
  items: { item: { nameAr: string | null; name: string }; quantity: number; price: number }[];
}): string {
  const items = o.items
    .map(
      (oi) =>
        `• ${oi.item.nameAr || oi.item.name} ×${toArabicNumber(oi.quantity)} = ${formatPrice(oi.price * oi.quantity, { decimals: 1 })}`
    )
    .join("\n");
  const type =
    o.pickupType === "delivery" ? "توصيل" : o.pickupType === "takeaway" ? "سفري" : "داخل المكان";
  return `📋 طلب ${toArabicNumber(o.orderNo)}
━━━━━━━━━━━━━
👤 ${o.customerName} | ${o.customerPhone ?? ""}
📍 ${type}
━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━
💰 الإجمالي: ${formatPrice(Number(o.total), { decimals: 1 })}`;
}

/**
 * Build a WhatsApp receipt message for an order.
 * Shared between OrderDialog and CartPage.
 */

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
    const lineTotal = (item.qty * item.price).toFixed(1);
    const qtyStr = `${item.qty}`;
    const priceStr = `${item.price.toFixed(1)}`;
    const totalStr = `${lineTotal}`;
    lines.push(`   ${i + 1}. *${item.name}*`);
    lines.push(`      ${qtyStr} × ${priceStr} د.ل  =  ${totalStr} د.ل`);
    if (item.notes) lines.push(`      📝 _${item.notes}_`);
  });
  lines.push(SEP);
  lines.push("");

  // ── Total ──
  lines.push(`💵 *الإجمالي*`);
  lines.push(`   ${opts.totalPrice.toFixed(1)} د.ل`);
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

/**
 * Build a WhatsApp receipt message for an order.
 * Shared between OrderDialog and CartPage.
 */

const SEP = "━━━━━━━━━━━━━━━━━━━━";
const AR_MONTHS = ["يناير","فبراير","مارس","ابريل","مايو","يونيو",
  "يوليو","اغسطس","سبتمبر","اكتوبر","نوفمبر","ديسمبر"];

function ts(): string {
  const d = new Date();
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
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

  lines.push(`🏪 *${opts.restaurantName}*`);
  lines.push(SEP);
  lines.push("");

  if (opts.customerName) lines.push(`👤 *الاسم:* ${opts.customerName}`);
  if (opts.customerPhone) lines.push(`📞 *الهاتف:* ${opts.customerPhone}`);
  if (opts.pickupType) lines.push(`📍 *نوع الطلب:* ${labels[opts.pickupType] || opts.pickupType}`);
  if (opts.orderNo) lines.push(`🆔 *رقم:* ${opts.orderNo}`);
  lines.push(`🕐 ${ts()}`);
  lines.push("");

  lines.push(SEP);
  opts.items.forEach((item, i) => {
    lines.push(`*${i + 1}. ${item.name}*`);
    lines.push(`   ${item.qty} x ${item.price.toFixed(1)} د.ل = ${(item.qty * item.price).toFixed(1)} د.ل`);
    if (item.notes) lines.push(`   📝 ${item.notes}`);
  });
  lines.push(SEP);
  lines.push("");

  lines.push(`💵 *الاجمالي:* ${opts.totalPrice.toFixed(1)} د.ل`);
  lines.push(SEP);
  lines.push("");

  if (opts.notes) lines.push(`📝 *ملاحظات:* ${opts.notes}`);
  lines.push("");
  lines.push(`🕐 _طلب جديد عبر المنيو الالكتروني_`);
  if (opts.menuUrl) lines.push(`🌐 ${opts.menuUrl}`);
  lines.push(`🌟 _شكرا لاختياركم ${opts.restaurantName}_`);

  return lines.join("\n");
}

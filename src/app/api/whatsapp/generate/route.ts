import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError } from "@/lib/api-helpers";

const generateSchema = z.object({
  orderId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = generateSchema.parse(await request.json());

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: {
        restaurant: { select: { name: true, whatsapp: true } },
        items: {
          include: { item: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });
    if (!order) return notFound("Order");

    const lines: string[] = [];
    lines.push(`🧾 *${order.restaurant.name}*`);
    lines.push(`📋 طلب رقم: ${order.orderNo}`);
    lines.push(`👤 العميل: ${order.customerName || "غير محدد"}`);
    lines.push(`📞 الهاتف: ${order.customerPhone || "غير محدد"}`);
    lines.push(`📍 نوع الطلب: ${order.pickupType === "delivery" ? "توصيل" : "داخل المحل"}`);
    lines.push("");
    lines.push("*الطلبات:*");
    for (const oi of order.items) {
      const itemName = oi.item.nameAr || oi.item.name;
      lines.push(`  ${oi.quantity}x ${itemName} - ${oi.price} ر.س`);
      if (oi.notes) lines.push(`    ملاحظات: ${oi.notes}`);
    }
    lines.push("");
    lines.push(`💰 المجموع: ${order.total} ر.س`);
    if (order.discount > 0) lines.push(`🔖 الخصم: ${order.discount} ر.س`);
    lines.push(`📅 ${order.createdAt.toLocaleDateString("ar-SA")}`);

    const message = lines.join("\n");

    // Mark whatsapp sent
    await prisma.order.update({
      where: { id: body.orderId },
      data: { whatsappSent: true },
    });

    const whatsappUrl = order.restaurant.whatsapp
      ? `https://wa.me/${order.restaurant.whatsapp}?text=${encodeURIComponent(message)}`
      : null;

    return success({
      message,
      whatsappUrl,
      orderId: order.id,
    });
  } catch (e) {
    return handleError(e);
  }
}

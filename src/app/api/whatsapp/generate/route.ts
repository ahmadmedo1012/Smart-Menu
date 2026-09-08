import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError, error as apiError } from "@/lib/api-helpers";
import { formatDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { createDbRateLimiter } from "@/lib/rate-limit";

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
        items: { select: { id: true, quantity: true, price: true, notes: true, item: { select: { id: true, name: true, nameAr: true } } } },
      },
    });
    if (!order) return notFound("Order");

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
      lines.push(`  ${oi.quantity}x ${itemName} - ${oi.price} د.ل`);
      if (oi.notes) lines.push(`    ملاحظات: ${oi.notes}`);
    }
    lines.push("");
    lines.push(`💰 المجموع: ${order.total} د.ل`);
    if (Number(order.discount) > 0) lines.push(`🔖 الخصم: ${order.discount} د.ل`);
    lines.push(`📅 ${formatDate(order.createdAt)}`);

    const message = lines.join("\n");

    await prisma.order.update({ where: { id: body.orderId }, data: { whatsappSent: true } });

    const whatsappUrl = order.restaurant.whatsapp
      ? `https://wa.me/${order.restaurant.whatsapp}?text=${encodeURIComponent(message)}`
      : null;

    return success({ message, whatsappUrl, orderId: order.id });
  } catch (e) {
    return handleError(e);
  }
}

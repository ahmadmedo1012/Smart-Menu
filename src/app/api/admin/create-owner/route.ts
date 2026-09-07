import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { usernameField, passwordField, nameField } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { notifyEvent } from "@/lib/telegram";

const schema = z.object({
  username: usernameField,
  password: passwordField,
  name: nameField,
  restaurantId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_RESTAURANTS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      // round90-المنسق: آخر رسالة إنجليزية في عائلة إنشاء الحسابات — عُرّبت
      return error("اسم المستخدم موجود مسبقًا", 409);
    }

    // r93-N3 (F7/M-1): المطعم الهدف يجب أن يوجد قبل ربط المالك به — كان
    // معرف مطعم وهمي يفشل لاحقًا داخل user.create بقيد FK (رسالة 400 عامة
    // بلا سبب واضح) والآن يُرفض مبكرًا برسالة عربية صريحة.
    const targetRestaurant = await prisma.restaurant.findUnique({
      where: { id: body.restaurantId },
      select: { id: true, planId: true },
    });
    if (!targetRestaurant) return error("المطعم غير موجود", 404);

    const { hashPassword } = await import("@/lib/hash");
    // r93-N3 (F7/M-1): الحساب + رابط UserRestaurant + السقوف المنزّلة داخل
    // $transaction واحدة. سابقًا كان المسار يكتب User.restaurantId (المرآة
    // القديمة) فقط بلا صف رابط — فعدّاد سقف maxMenus (tx.userRestaurant.count
    // في owner/restaurants وsubscription-decisions) لا يرى هذا المطعم
    // (تجاوز السقف بواحد مع كل استدعاء)، وgetUserSubscriptionState يقرأ
    // user.restaurants عبر الرابط — فيبقى planEnd لهذا المنيو غير مرئي
    // للحارس الكسول ولكرون الانتهاء. النمط هو نفسه مسار restaurants POST
    // (رابط isPrimary للمنيو الأول/الوحيد) — والرابط مرآة إضافية لا بديل:
    // User.restaurantId يبقى يُكتب كما كان.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: body.username,
          password: hashPassword(body.password),
          name: body.name,
          role: "owner",
          restaurantId: body.restaurantId,
        },
      });
      await tx.userRestaurant.create({
        data: { userId: created.id, restaurantId: body.restaurantId, isPrimary: true },
      });
      // تهيئة السقوف المنزّلة الصحيحة: إن كان للمطعم خطة، تُنزَّل سقوفها على
      // صفه (نفس منطق ترقية الاشتراك في subscription-decisions) — يصلح
      // المطاعم المُنشأة عبر المسارات القديمة بسقوف المخطط الافتراضية
      // (50/500) بينما إنفاذ الأصناف/الطلبات يقرأ النسخة المنزّلة حصرًا.
      // بلا خطة: تُترك السقوف كما هي (قد تكون مخصّصة يدويًا عبر PUT الأدمن).
      if (targetRestaurant.planId != null) {
        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: targetRestaurant.planId },
          select: { maxItems: true, maxOrders: true },
        });
        if (plan) {
          await tx.restaurant.update({
            where: { id: body.restaurantId },
            data: { maxItems: plan.maxItems, maxOrders: plan.maxOrders },
          });
        }
      }
      return created;
    });
    // round90-المنسق (اكتشاف F5b-C): عائلة credentials الوحيدة غير المدقّقة —
    // logAudit + notifyEvent (best-effort) بنمط restaurants/route.ts:257
    logAudit({
      action: "create",
      targetType: "user",
      targetId: user.id,
      actorId: auth.userId,
      metadata: { role: "owner", restaurantId: body.restaurantId },
    }).catch(() => {});
    notifyEvent(
      "owner_created",
      { username: user.username, name: user.name },
      { adminOnly: true }
    ).catch(() => {});
    return success({ id: user.id, username: user.username, name: user.name }, 201);
  } catch (e) {
    return handleError(e);
  }
}

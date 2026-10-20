import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { z } from "zod";
// W7-B (G-4): بوابة ميزة الخطة — «برنامج الإحالات» الاحترافية فأعلى.
import { planAllowsFeature, planFeatureDeniedCopy } from "@/lib/plan-entitlements";

const referralSchema = z.object({
  referralCode: z.string().min(1).max(20),
  // round87-A4: bound public free-text (rendered back to the owner in
  // loyalty/stats recentReferrals — same class as customerName above)
  referredPhone: z.string().max(30).optional(),
  referredName: z.string().max(50).optional(),
});

const referralDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
// round85-A2: same limiter budget for the public GET (code → restaurant lookup)
const referralGetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = getClientIp(request); // round91-D1: unified extraction
    const rl = await referralDbLimiter.check(`referral:${ip}`);
    if (!rl.success) return error("طلبات كثيرة — حاول لاحقاً", 429);

    const body = referralSchema.parse(await request.json());
    const { referralCode, referredPhone, referredName } = body;

    const referrerCard = await prisma.loyaltyCard.findUnique({
      where: { referralCode },
      // W7-B: صف الخطة يُجلب في قراءة البطاقة نفسها (مفتاح أساسي — لا
      // استعلام إضافي) لتحديد رتبة مطعم البطاقة عند بوابة الميزة أدناه.
      include: { restaurant: { select: { plan: { select: { name: true, nameAr: true, sortOrder: true } } } } },
    });

    if (!referrerCard) return error("كود إحالة غير صالح", 404);

    // round94-3a (HIGH-1 من تقرير B §1): نطاق مستأجر + ملكية الإحالة — كانت
    // البوابة requireAuth وحدها (أي دور، بما فيه USER مجاني التسجيل الذاتي)،
    // فيستطيع أي حساب غريب حشو صفوف pending بأرقام هواتف عملاء مطعم الضحية؛
    // التحويل التلقائي عند إكمال طلباتهم (referral-conversion.ts:110) يمنح
    // بطاقة الحاشي 10% نقاطًا = وجبات مجانية غير مكتسبة. نفس سلّم
    // loyalty/redeem (43-55): المالك مرتبط بمطعم البطاقة (رئيسي أو رابط
    // UserRestaurant)، والطاقم يحتاج APPROVE_ORDERS، وUSER مرفوض مطلقًا —
    // referredPhone لا يُقبل إطلاقًا من حساب لا علاقة له بالمطعم.
    if (auth.role === "owner") {
      if (auth.restaurantId !== referrerCard.restaurantId) {
        const link = await prisma.userRestaurant.findUnique({
          where: {
            userId_restaurantId: {
              userId: auth.userId!,
              restaurantId: referrerCard.restaurantId,
            },
          },
        });
        if (!link) return error("غير مصرح", 403);
      }
    } else if (auth.role === "super_admin") {
      // وصول كامل
    } else if (auth.role === "admin" || auth.role === "sub_admin") {
      // الطاقم يحتاج صلاحية صريحة على بطاقات الولاء (كما في redeem)
      if (!(auth.permissions ?? []).includes("APPROVE_ORDERS")) {
        return error("لا تملك الصلاحية", 403);
      }
    } else {
      // USER وأي دور غير معروف — رفض مطلق: كود صالح + هاتف ضحية لا يكفي
      return error("غير مصرح", 403);
    }

    /* W7-B (G-4 — قرار بوّابة): «برنامج الإحالات» الاحترافية فأعلى —
       بعد سلّم المستأجر (رفض الغريب يبقى بوابة الأمان الأسبق) وقبل أي
       كتابة: المالك الشرعي لمطعم دون الرتبة → 403 بنسخة العائلة وصفر
       إنشاء إحالة. عائلة الأدمن تتجاوز (دلالة isOwnerSubscriptionActive).
       القرار من صف الخطة المضمّن في قراءة البطاقة نفسها (نواة
       plan-entitlements النقية — لا استعلام إضافي على مسار المال). */
    if (auth.role === "owner" && !planAllowsFeature(referrerCard.restaurant?.plan, "referralProgram")) {
      return error(planFeatureDeniedCopy("referralProgram"), 403);
    }

    // Self-referral guard (round-77): reject redeeming your own code via
    // your own phone — normalized digits compare
    if (referredPhone) {
      const normalize = (p: string) => p.replace(/[^\d]/g, "").replace(/^00/, "");
      if (normalize(referredPhone) && normalize(referredPhone) === normalize(referrerCard.customerPhone)) {
        return error("لا يمكنك استخدام كود الإحالة الخاص بك", 400);
      }
    }

    // Enforce referral usage limit (max 10 converted referrals per code)
    // round90-F1 (R-1/T3): سقف الاستخدامات ذري — العدّ ثم الإنشاء كان قابلًا
    // للتجاوز بتزامن (كلا الطلبين يرى convertedCount=9). الحساب يُدار الحقيقة
    // عند التحويل (referral-conversion.ts يقفل صف البطاقة FOR UPDATE قبل عدّه)
    // — هنا نُسلسل الفحص الاستشاري نفسه بقفل الصف نفسه داخل معاملة واحدة
    // مع الإنشاء، فيرى كل طلب ما commitه سابقه.
    const MAX_REFERRAL_USES = 10;
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "LoyaltyCard" WHERE id = ${referrerCard.id} FOR UPDATE`;
      const convertedCount = await tx.referral.count({
        where: { referralCode, status: "converted" },
      });
      if (convertedCount >= MAX_REFERRAL_USES) {
        return { capped: true as const };
      }
      const referral = await tx.referral.create({
        data: {
          referralCode,
          referrerId: referrerCard.id,
          referredPhone: referredPhone ?? "",
          referredName: referredName ?? "",
          status: "pending" as const,
          restaurantId: referrerCard.restaurantId,
        },
      });
      return { capped: false as const, referral };
    });
    if (outcome.capped) {
      return error("لقد وصل كود الإحالة إلى الحد الأقصى من الاستخدامات", 400);
    }

    return success(outcome.referral, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) return error("معامل الاستعلام code مطلوب");

    // round85-A2: rate limit the public code lookup
    const ip = getClientIp(request); // round91-D1: unified extraction
    const rl = await referralGetLimiter.check(`referral-get:${ip}`);
    if (!rl.success) return error("طلبات كثيرة — حاول لاحقاً", 429);

    const card = await prisma.loyaltyCard.findUnique({
      where: { referralCode: code },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            description: true,
            themeColor: true,
            whatsapp: true,
            currency: true,
          },
        },
      },
    });

    if (!card) return error("كود الإحالة غير موجود", 404);

    return success({
      referralCode: code,
      // round85-A2: no referrerName — the unauthenticated response must not
      // disclose the card holder's stored customer name (verified: no UI
      // consumer reads this field; the referral landing works without it).
      restaurant: card.restaurant,
    });
  } catch (e) {
    return handleError(e);
  }
}

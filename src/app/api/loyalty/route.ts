import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { success, handleError, error } from '@/lib/api-helpers';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getNextTierInfo, generateReferralCode, tierMinPoints } from '@/lib/loyalty-tiers';
import { getClientIp } from '@/lib/client-ip';
import { normalizeCustomerPhone, CUSTOMER_PHONE_RE } from '@/lib/phone';
// W7-B (G-4): علم «برنامج الإحالات» من صف خطة المطعم — الواجهة تخفي بطاقة
// الإحالة دون الرتبة (غياب صادق لا قفل في وجه الزبون).
import { planAllowsFeature } from '@/lib/plan-entitlements';

const loyaltyDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });
// round85-A2: GET is an unauthenticated phone-to-card lookup — without a
// limiter it is a free enumeration oracle (200 vs 404 reveals which phones
// have loyalty cards, tier, points, referral code).
const loyaltyGetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });
// round90-F4 (red-team r90-D2 — key dilution): the per-(ip,restaurant) keys
// let a caller ROTATE restaurantId (a request-controlled value) to multiply
// their quota — every id gets its own 20/min bucket. One shared per-IP total
// cap, independent of restaurantId, closes the rotation for BOTH methods;
// honest multi-restaurant traffic (a handful of ids behind one NAT/kiosk IP)
// stays far below it.
const loyaltyIpLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

// round85 → r136: البوابة نفسها، لكن تُطبَّق بعد التطبيع — زبون ليبي يكتب
// ٠٩١٢… كان يُرفض بـ«رقم هاتف غير صالح» رغم أن رقمه صحيح تماماً.
const PHONE_RE = CUSTOMER_PHONE_RE;

const createSchema = z.object({
        // r136: طيّ الأرقام الشرقية والفواصل قبل البوابة — «٠٩١٢…» كان يُرفض
        // بـ«رقم هاتف غير صالح». القيمة الفارغة بعد التنظيف تُسقط على "" فتفشل
        // البوابة بنفس الرسالة السابقة (سلوك القمامة كما كان تماماً).
        customerPhone: z
                .string()
                .transform((p) => normalizeCustomerPhone(p) ?? '')
                .refine((p) => PHONE_RE.test(p), 'رقم هاتف غير صالح'),
        // round87-A4: bound public free-text (values render in the owner's
        // loyalty dashboard — unbounded strings were a client-side DoS vector)
        customerName: z.string().max(50).optional(),
        restaurantId: z.number().int().positive().optional(),
});



export async function POST(request: NextRequest) {
        try {
                const body = createSchema.parse(await request.json());
                const { customerPhone, customerName } = body;
                const cookieStore = await cookies();
                const cookieId = cookieStore.get('smart-menu-restaurant')?.value;
                const restaurantId = body.restaurantId ?? (cookieId ? Number(cookieId) : null);
                if (!restaurantId) return error('معرف المطعم مطلوب', 400);

                // Rate limit per IP + restaurant (restaurantId in key) so one
                // restaurant's traffic can't starve others behind the same IP (kiosk/NAT)
                const ip = getClientIp(request); // round91-D1: unified extraction
                const rateCheck = await loyaltyDbLimiter.check(`${ip}:${restaurantId}`);
                if (!rateCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);
                // round90-F4: restaurant-independent IP total — rotating restaurantId
                // must not mint fresh 20/min buckets (see loyaltyIpLimiter above).
                const ipCheck = await loyaltyIpLimiter.check(`loyalty-ip:${ip}`);
                if (!ipCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                // Verify restaurant exists
                const restaurant = await prisma.restaurant.findUnique({
                        where: { id: restaurantId },
                        // W7-B: صف الخطة في القراءة نفسها — قرار الإحالة بلا استعلام إضافي.
                        include: { plan: { select: { name: true, nameAr: true, sortOrder: true } } },
                });
                if (!restaurant) return error('المطعم غير موجود', 404);

                let card = await prisma.loyaltyCard.findUnique({
                        where: {
                                customerPhone_restaurantId: { customerPhone, restaurantId },
                        },
                });

                if (!card) {
                        let referralCode = generateReferralCode();
                        let attempts = 0;
                        while (await prisma.loyaltyCard.findUnique({ where: { referralCode } })) {
                                referralCode = generateReferralCode();
                                attempts++;
                                if (attempts > 10) return error('تعذّر توليد كود إحالة فريد', 500);
                        }

                        card = await prisma.loyaltyCard.create({
                                data: {
                                        customerPhone,
                                        customerName: customerName ?? '',
                                        restaurantId,
                                        referralCode,
                                },
                        });
                }

                const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

                // Public endpoint — never expose PII (customerName/phone) to unauthenticated callers
                const { customerName: _n, customerPhone: _p, ...publicCard } = card;

                /* W6-B6 (تدقيق W6-A3 — إصلاح صغير 1 + 3): رابط الإحالة كان يشير
                   إلى /loyalty — مسار غير موجود (404 مؤكد في الإنتاج؛
                   ReferralCard يبني رابطه بنفسه فلم يلاحظه أحد). الرابط
                   الحقيقي الذي يفهمه ReferralHandler هو صفحة المنيو + ?ref=.
                   العتبات تُصدّر لتوحيد سُلّم الواجهة مع computeTier.
                   W7-B (G-4): referralProgram من صف الخطة — البرنامج حقّ خطة
                   الاحترافية فأعلى؛ بطاقة الإحالة لا تُعرض دونه (علم الخادم،
                   والقفل الفعلي في مسارات الإنشاء). */
                return success({
                        card: publicCard,
                        tier: card.tier,
                        nextTier,
                        pointsToNext,
                        referralUrl: `/menu/${restaurant.slug}?ref=${card.referralCode}`,
                        tierThresholds: tierMinPoints(),
                        referralProgram: planAllowsFeature(restaurant.plan, 'referralProgram'),
                });
        } catch (e) {
                return handleError(e);
        }
}

export async function GET(request: NextRequest) {
        try {
                const { searchParams } = new URL(request.url);
                // r136: الطيّ قبل الفحص — نفس تطبيع POST كي تتطابق مفاتيح البحث
        // مع القيم المخزنة دائماً.
        const phone = normalizeCustomerPhone(searchParams.get('phone'));
                const cookieStore2 = await cookies();
                const restaurantId =
                        Number(searchParams.get('restaurantId')) ||
                        Number(cookieStore2.get('smart-menu-restaurant')?.value);
                if (!restaurantId) return error('معرف المطعم مطلوب', 400);
                if (!phone || !PHONE_RE.test(phone)) return error('رقم هاتف غير صالح', 400);

                // round85-A2: rate limit the phone lookup (per IP+restaurant)
                const getIp = getClientIp(request); // round91-D1: unified extraction
                const getRateCheck = await loyaltyGetLimiter.check(`${getIp}:${restaurantId}`);
                if (!getRateCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);
                // round90-F4: same per-IP total cap on the phone-lookup oracle
                const getIpCheck = await loyaltyIpLimiter.check(`loyalty-ip:${getIp}`);
                if (!getIpCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const card = await prisma.loyaltyCard.findUnique({
                        where: {
                                customerPhone_restaurantId: { customerPhone: phone, restaurantId },
                        },
                });

                if (!card) return error('بطاقة الولاء غير موجودة', 404);

                const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

                // W6-B6 (إصلاح صغير 1): الرابط الحقيقي هو صفحة المنيو — /loyalty
                // غير موجود (404). الجلب تحت نفس محدّدات المسار (لا كلفة خارج
                // حدودها)، والعتبات تُصدّر هنا أيضًا (إصلاح صغير 3 — نفس POST).
                const restaurantRow = await prisma.restaurant.findUnique({
                        where: { id: restaurantId },
                        select: {
                                slug: true,
                                // W7-B: قرار الإحالة بلا استعلام إضافي (نفس قراءة slug).
                                plan: { select: { name: true, nameAr: true, sortOrder: true } },
                        },
                });

                // Public endpoint — never expose PII (customerName/phone) to unauthenticated callers
                const { customerName: _n, customerPhone: _p, ...publicCard } = card;

                return success({
                        card: publicCard,
                        tier: card.tier,
                        nextTier,
                        pointsToNext,
                        referralUrl: `/menu/${restaurantRow?.slug ?? ''}?ref=${card.referralCode}`,
                        tierThresholds: tierMinPoints(),
                        // W7-B: نفس علم الخادم من POST — قراءة البطاقة وعرضها متطابقان.
                        referralProgram: planAllowsFeature(restaurantRow?.plan, 'referralProgram'),
                });
        } catch (e) {
                return handleError(e);
        }
}

/**
 * Subscription payment creation schema (round88-A2 — moved out of
 * src/app/api/subscriptions/route.ts).
 *
 * Why a lib module and not a route export: Next.js builds a typed route
 * manifest from every export of an api route file. A non-handler export
 * (this Zod schema) is legal under Turbopack but breaks the Webpack
 * route-type generation outright ("createPaymentSchema is not a valid Route
 * export field") — and even where it compiles, importing a route module for
 * its schema pulls the whole route (auth/db/telegram deps) into the importer
 * (e.g. the unit test) instead of a ~40-line pure module. The schema itself
 * is byte-identical to the one that lived in the route since round8x.
 */
import { z } from 'zod';
import { usernameOptional, slugField } from '@/lib/validation';

/**
 * Normalize Arabic-Indic digits (٠-٩) to Western (0-9).
 * (r138): داخلي فقط — كان تصديرها بلا مستورد، ومستهلكها الوحيد الآن
 * paymentPhoneField أدناه (كان قديمًا يعمل بعد الفحص فيرفض ما بُني له).
 */
function normalizeDigits(s: string): string {
        return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * (r138 — إصلاح انحراف r138-e «المسار الرابع داخل SM»): حقل هاتف الدفع —
 * الأرقام الشرقية (٠٩١٢…) تُطوى إلى غربية قبل التحقق لا بعده. سابقًا كان
 * الـregex يسبق التطبيع فيرفض رقمًا صالحًا، بينما مسارا الطلبات والولاء
 * (normalizeCustomerPhone في lib/phone.ts) يقبلانه ويطبعانه — نفس الزبون
 * كان يجد بوابتين مختلفتين. الحدود والرسالة كما هي: 09 + 8 أرقام ليبية.
 * حقل واحد مشترك بين مسارَي إنشاء الدفع (هنا) والترقية
 * (subscriptions/upgrade) اللذين كانا نسخة يدوية منحرفة (وثّق انحراف
 * الترقية r121-C-api: نسخة بلا تطبيع أصلًا).
 */
export const paymentPhoneField = z.preprocess(
        (v) => (typeof v === 'string' ? normalizeDigits(v) : v),
        z
                .string()
                .regex(/^09\d{8}$/, 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09')
                .optional()
);

export const createPaymentSchema = z
        .object({
                phone: paymentPhoneField,
                amount: z.number().positive(),
                provider: z.enum(['libyana', 'madar', 'bank']),
                planId: z.number().int().positive(),
                tempUsername: usernameOptional,
                // round91-F-B (D2-#1): the array used to be UNBOUNDED (min-only) —
                // a crafted payment payload could park N×name/slug pairs into
                // SubscriptionPayment.metadata JSONB and mint N restaurants on
                // approval (plan-cap bypass). Field caps mirror the gated
                // restaurant-create schema conventions (restaurants:22-32 /
                // owner/restaurants:14-20 + the validate route's slug regex).
                tempRestaurants: z
                        .array(
                                z.object({
                                        name: z.string().min(1, 'اسم المطعم مطلوب').max(200, 'اسم المطعم يجب ألا يتجاوز 200 حرف'),
                                        // r121-O-7: the slug was the one field validation.ts's
                                        // round97-X3 unification missed — byte-identical bounds/regex/
                                        // messages, now literally the canonical slugField (which
                                        // additionally trims surrounding whitespace).
                                        slug: slugField,
                                })
                        )
                        // Hard sanity bound for the payload/metadata. The AUTHORITATIVE
                        // per-plan cap is plan.maxMenus, enforced at approval time
                        // inside the decision transaction (subscription-decisions.ts —
                        // FOR UPDATE on the user row). This bound is aligned with the
                        // highest bounded seeded plan (Business maxMenus=5; Free 1 /
                        // Basic 2 / Pro 4 — Premium 9999 carries "unlimited" semantics
                        // per plan-comparison.ts and stays governed by the
                        // approval-time check).
                        .max(5, 'الحد الأقصى 5 مطاعم في طلب الدفع الواحد')
                        .optional(),
                // Bank transfer fields — only valid when provider === "bank"
                senderAccountName: z.string().min(1).max(100).optional(),
                senderAccountNumber: z.string().min(1).max(50).optional(),
                receiptImageUrl: z
                        .string()
                        .url()
                        // round91-F-B (D2-#2): joins the R90 image-cap family (items
                        // 200k / settings 20k / logo 2k / upload 5MB) — an unbounded
                        // https URL used to persist straight into
                        // SubscriptionPayment.metadata JSONB (row bloat).
                        .max(2_000, 'رابط الإيصال طويل جداً — الحد الأقصى 2000 حرف')
                        .refine((u) => u.startsWith('https://'), { message: 'رابط الإيصال يجب أن يكون https' })
                        .optional(),
        })
        .refine((d) => d.provider !== 'bank' || (d.senderAccountName && d.senderAccountNumber), {
                message: 'اسم صاحب الحساب ورقم الحساب إجباريان للتحويل البنكي',
                path: ['senderAccountName'],
        });

// The 99 LYD cap is a libyana/madar network constraint — bank transfers have no cap.

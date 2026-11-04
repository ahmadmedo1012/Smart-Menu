import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { menuEventSchema, tripoliDateString } from '@/lib/menu-events';

/**
 * P43 SM-2 — التقاط أحداث تفاعل القائمة العامة (fire-and-forget من العميل).
 *
 *   view (مرة/جلسة/منيو) · item_open (مرة/صنف/جلسة) · search (مصطلح ≥2
 *   حروف بعد استقرار debounce) · qr_scan (تحميل بمعامل ?table=N).
 *
 * الصدق والأمان:
 *   * لا PII إطلاقًا — الحدث نوع + سياق مجهول + يوم طرابلس. لا IP يُخزَّن
 *     (يُستخدم لمفتاح حد المعدل فقط، مثل عائلة المسارات العامة).
 *   * حد معدل DB 60/min/IP (نفس عائلة public-menu) قبل أي عمل قاعدة —
 *     الزائر الشرعي يرسل حفنة أحداث في الجلسة كلها.
 *   * المطعم يُحلّ بالـslug النشط؛ الحدث لمنيو غير موجود يُرفض (لا كتابة
 *     يتيمة). CSRF: الـEdge proxy يفرض Origin + double-submit على POST —
 *     العميل يرسل X-CSRF-Token عبر csrfFetch (keepalive).
 *   * الفشل صامت عميليًا (تحليلات لا تعطّل تصفحًا أبدًا) — الخادم يجيب 204
 *     فارغة (fire-and-forget: صفر بايت زائدة).
 */

const menuEventsLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
        try {
                // حد المعدل قبل أي عمل DB (نمط public-menu: حتى مسار الـ404 يدفع الميزانية).
                const ip = getClientIp(request);
                const { success: allowed } = await menuEventsLimiter.check(`menu-events:${ip}`);
                if (!allowed) return new NextResponse(null, { status: 429 });

                const parsed = menuEventSchema.safeParse(await request.json());
                if (!parsed.success) {
                        return NextResponse.json(
                                { success: false, error: parsed.error.issues[0].message },
                                { status: 422 },
                        );
                }
                const body = parsed.data;

                const restaurant = await prisma.restaurant.findUnique({
                        where: { slug: body.slug, isActive: true },
                        select: { id: true },
                });
                if (!restaurant) return new NextResponse(null, { status: 404 });

                await prisma.menuEvent.create({
                        data: {
                                restaurantId: restaurant.id,
                                eventType: body.eventType,
                                itemKey: body.itemKey ?? null,
                                searchTerm: body.searchTerm?.trim().slice(0, 80) ?? null,
                                tableNumber: body.tableNumber ?? null,
                                day: tripoliDateString(),
                        },
                });

                // 204 فارغة عمدًا — fire-and-forget (لا حمولة تُقرأ عمليًا).
                return new NextResponse(null, { status: 204 });
        } catch (e) {
                // تحليلات لا تكسر شيئًا: خطأ داخلي يُسجَّل فقط (handleError يسجل)
                // ويعود 204 كي لا يفهم العميل الناجح خطأً ويحاول إعادة الإرسال.
                handleError(e);
                return new NextResponse(null, { status: 204 });
        }
}

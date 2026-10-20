import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { requirePlanFeature } from '@/lib/plan-entitlements';
import { buildOrdersCsv, ordersCsvFileName, EXPORT_PAGE_SIZE, EXPORT_ROW_CAP } from '@/lib/csv-export';

/**
 * W7-B (G-4 من تدقيق W6-A3): تصدير CSV للطلبات يصبح مسارًا خادميًا
 * مبوّبًا على الخطة الاحترافية فأعلى.
 *
 * حتى W6-B6 كان «تصدير CSV» تجميعًا حرًا في المتصفح على صفحات
 * GET /api/orders — لا توجد بوابة يمكنها رفضه (كل صفحة صفحة قائمة
 * مشروعة). القرار (منسق W7): التعزيز خادمي في مسار التصدير نفسه:
 *   - المالك دون الرتبة → 403 بنسخة العائلة قبل أي استعلام طلبات
 *     (قراءة صف الخطة وحدها تجري) — لا بوابة واجهة فقط أبدًا؛
 *   - عائلة الأدمن تتجاوز (دلالة isOwnerSubscriptionActive نفسها)؛
 *   - المستأجر: نفس سلّم قائمة الطلبات حرفيًا (owner→ملكية/رابط،
 *     admin/super_admin كامل، sub_admin→APPROVE_ORDERS، USER مرفوض)؛
 *   - مرشّحات القائمة نفسها (status/dateFrom/dateTo/restaurantId) +
 *     «بحث المالك نفسه» (orderNo/customerName) — الآن خادميًا بدل
 *     ترشيح المتصفح (سلوك W6-B6 «المصدَّر = المرشَّح على الشاشة» محفوظ)؛
 *   - سقف 5000 صف الصادق نفسه؛ التجاوز يقيسه count دقيق (لا تخمين)
 *     ويُعلَن بترويسة X-Export-Truncated (والواجهة تعرض عبارة W6-B6
 *     نفسها) وعدد الصفوف في X-Export-Rows.
 */
const exportDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                // بعد بوابة 401 (مجهول لا يحرق ميزانية) — نمط round89-B4.
                const { success: allowed } = await exportDbLimiter.check(`orders-export:${auth.userId}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const { searchParams } = new URL(request.url);
                let restaurantId = Number(searchParams.get('restaurantId')) || undefined;

                // سلّم المستأجر — نسخة عقد قائمة الطلبات (orders/route.ts:100-123)
                if (auth.role === 'owner') {
                        if (restaurantId && restaurantId !== auth.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
                        } else {
                                restaurantId = auth.restaurantId ?? undefined;
                        }
                        if (!restaurantId) return apiError('لا يوجد مطعم مرتبط', 400);
                } else if (auth.role === 'admin' || auth.role === 'super_admin') {
                        // وصول كامل (ثقة الأدمن القديمة)
                } else if (auth.role === 'sub_admin') {
                        if (!(auth.permissions ?? []).includes('APPROVE_ORDERS')) return apiError('لا تملك الصلاحية', 403);
                } else {
                        return apiError('غير مصرح', 403);
                }
                if (!restaurantId) return apiError('معرف المطعم مطلوب', 400);

                // بوابة الخطة — قبل أي استعلام طلبات (قراءة صف الخطة وحدها تجري).
                const gate = await requirePlanFeature(auth, restaurantId, 'csvExport');
                if (!gate.ok) return gate.response;

                const status = searchParams.get('status') || undefined;
                const search = (searchParams.get('search') || '').trim();

                const where: Record<string, unknown> = { restaurantId };
                if (status) where.status = status;
                const dateFrom = searchParams.get('dateFrom');
                const dateTo = searchParams.get('dateTo');
                if (dateFrom || dateTo) {
                        const createdAt: Record<string, Date> = {};
                        if (dateFrom) {
                                const d = new Date(dateFrom);
                                if (isNaN(d.getTime())) return apiError('تاريخ غير صحيح', 400);
                                createdAt.gte = d;
                        }
                        if (dateTo) {
                                const end = new Date(dateTo);
                                if (isNaN(end.getTime())) return apiError('تاريخ غير صحيح', 400);
                                end.setHours(23, 59, 59, 999);
                                createdAt.lte = end;
                        }
                        where.createdAt = createdAt;
                }
                // بحث المالك نفسه (W6-B6): orderNo/customerName يحتويان —
                // كان ترشيح متصفح على السحب الكامل؛ الآن شرط استعلام واحد.
                if (search) {
                        where.OR = [
                                { orderNo: { contains: search, mode: 'insensitive' } },
                                { customerName: { contains: search, mode: 'insensitive' } },
                        ];
                }

                // الصفحات الداخلية حتى السقف (W6-B6: سقف 5000 صادق يُعلَن لا يُقص)
                const all: {
                        orderNo: string;
                        customerName: string;
                        customerPhone: string;
                        status: string;
                        pickupType: string;
                        total: unknown;
                        createdAt: Date;
                }[] = [];
                for (let skip = 0; skip < EXPORT_ROW_CAP; skip += EXPORT_PAGE_SIZE) {
                        const rows = await prisma.order.findMany({
                                where,
                                orderBy: { createdAt: 'desc' },
                                select: {
                                        orderNo: true,
                                        customerName: true,
                                        customerPhone: true,
                                        status: true,
                                        pickupType: true,
                                        total: true,
                                        createdAt: true,
                                },
                                skip,
                                take: EXPORT_PAGE_SIZE,
                        });
                        all.push(...rows);
                        if (rows.length < EXPORT_PAGE_SIZE) break;
                }

                if (all.length === 0) {
                        return apiError('لا توجد طلبات مطابقة للتصدير', 404);
                }

                // قياس تجاوز السقف بعدّ دقيق (لا تخمين من امتلاء الصفحة الأخيرة):
                // نطاق أكبر من المصدَّر = إعلان صادق بأن هناك ما بعده.
                const totalMatching = await prisma.order.count({ where });
                const truncated = totalMatching > all.length;

                const csv = buildOrdersCsv(all);
                const body = '\uFEFF' + csv;
                return new NextResponse(body, {
                        status: 200,
                        headers: {
                                'Content-Type': 'text/csv; charset=utf-8',
                                'Content-Disposition': `attachment; filename="${ordersCsvFileName()}"`,
                                'Cache-Control': 'no-store',
                                ...(truncated ? { 'X-Export-Truncated': '1' } : {}),
                                'X-Export-Rows': String(all.length),
                        },
                });
        } catch (e) {
                return handleError(e);
        }
}

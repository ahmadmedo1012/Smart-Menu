import { cache } from 'react';
import { prisma, withRetry } from '@/lib/db';

// Shared restaurant lookup for the public menu route, memoized per request with
// React cache() so generateMetadata and the page render issue ONE DB query.
// (Next.js docs: fetch requests are memoized across generateMetadata/pages;
// React cache() is the sanctioned equivalent when fetch isn't used — Prisma.)
// Note: isActive:true is applied here (not just in the page) so inactive
// restaurants get neither metadata nor a page — the page 404s anyway.
//
// r137: hours (ساعات الدوام المهيكلة — شارة «مفتوح الآن»، تُحسب على
// العميل حصراً) + deliveryFee/minOrder (رسوم التوصيل/الحد الأدنى —
// تسمية خيار التوصيل في OrderDialog) تعبر مع المطعم. Decimal يُسلسَل
// Number() عند الاستهلاك (نفس عائلة أسعار الأصناف).
export const getRestaurantBySlug = cache(async (slug: string) =>
        withRetry(() =>
                prisma.restaurant.findUnique({
                        where: { slug, isActive: true },
                        select: {
                                id: true,
                                name: true,
                                description: true,
                                logo: true,
                                phone: true,
                                whatsapp: true,
                                slug: true,
                                address: true,
                                // r138: مدينة المطعم (عمود موجود منذ الأصل) — تُصدَّر الآن
                                // كـ addressLocality في JSON-LD PostalAddress.
                                city: true,
                                workingHours: true,
                                gallery: true,
                                email: true,
                                deliveryFee: true,
                                minOrder: true,
                                hours: {
                                        orderBy: { dayOfWeek: 'asc' },
                                        select: { dayOfWeek: true, closed: true, opensAt: true, closesAt: true },
                                },
                        },
                })
        )
);

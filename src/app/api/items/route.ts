import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, handleError, error, paginated, parsePagination, parseIdSearchParam } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { revalidateMenu } from '@/lib/menu-cache';
import { mediaUrlError } from '@/lib/blob';
import { PlanLimitError } from '@/lib/plan-limit-error';
import { ItemStatus } from '@/generated/prisma/enums';
import { modifierGroupSchema, modifierGroupCreateInput } from '@/lib/modifier-schema';

/* round90-F3 — enum-backed status whitelist (same derivation pattern as the
 * admin invite route: Object.values(Permission)). A free z.string() let any
 * invalid value fall through to Prisma validation noise → generic 400 via
 * handleError instead of a clean 422 validationError envelope. */
const itemStatusValues = Object.values(ItemStatus) as [string, ...string[]];

// r93-W1a (MED-3 — DoS مجهول): GET كان بلا حد معدل — زائر مجهول يستطيع
// ضغط قاعدة البيانات بحلقة curl موزعة (findMany مع include
// modifierGroups.options لكل صفحة + count لكل طلب) دون أن تُنشأ أي
// RateLimitEntry تقيده. 60 طلبًا/دقيقة لكل IP (نفس أداة المسارات العامة
// — loyalty-ip: 60/min): تصفح المنيو الشرعي يبقى بعيدًا عن السقف (صفحة
// المالك تستدعي /api/items مرة لكل فئة + تحديثات المحرر، وأدمن القائمة
// استدعاءين)، بينما تنقطع حلقات الضغط. القاعدة "مفتاح IP لا يحوي قيمة
// يتحكم بها الطالب" (درس تخفيف المفاتيح r90-F4).
const itemsGetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

/* w3-f1 (F1-3) — shared modifier-group write schema (create + update).
 * Caps mirror the payload-hygiene rule (A-2): bounded arrays, bounded strings,
 * bounded counts. `id` is accepted-but-ignored (replace strategy — see PUT) so
 * the client can echo back what it loaded.
 * round97-X3: the schema + Prisma mapping now live in src/lib/modifier-schema.ts
 * (this route and items/[id] carried byte-identical ~48-line copies — pure
 * move, constraints and Arabic messages unchanged). */

const createSchema = z.object({
        name: z.string().min(1, 'الاسم مطلوب').max(100),
        nameAr: z.string().nullable().optional(),
        description: z.string().max(1000).optional(),
        descriptionAr: z.string().max(1000).optional(),
        price: z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
        discountedPrice: z.number().min(0).nullable().optional(),
        // round89-E4: image-compress (1200px / JPEG q0.7) lands at ~60-150KB
        // ≈ 80-200k base64 chars — 200k covers every honest payload while
        // killing the old 7M-char inflation (dx-2 #9, research from w1-a).
        image: z.string().max(200_000, 'الصورة كبيرة جداً — الحد الأقصى حوالي 150 كيلوبايت بعد الضغط').optional(),
        // round90-F3: status is enum-backed (see itemStatusValues above).
        status: z.enum(itemStatusValues, { message: 'حالة الصنف غير صالحة' }).optional(),
        sortOrder: z.number().int().optional(),
        categoryId: z.number().int().positive(),
        dietaryTags: z.array(z.string()).optional().default([]),
        allergens: z.array(z.string()).optional().default([]),
        // Stage H (round79) — cinematic featured-showcase fields.
        isFeatured: z.boolean().optional().default(false),
        featuredRank: z.number().int().min(1, 'الترتيب يجب أن يكون 1 على الأقل').max(5, 'الترتيب يجب ألا يتجاوز 5').nullable().optional(),
        // Round83 §2.3 — up to 3 showcase badges (array). Round88-C: the legacy
        // single showcaseTag mirror is dropped — the array is the only storage.
        showcaseTags: z.array(z.string().max(40, 'كل شارة يجب ألا تتجاوز 40 حرفًا')).max(3, 'الحد الأقصى 3 شارات').optional(),
        // w3-f1 (F1-3): modifier groups — full editor state from ItemDialog.
        // Caps mirror the payload-hygiene rule (A-2): bounded arrays, bounded
        // strings, bounded counts. `id` is accepted-but-ignored (replace strategy
        // — see PUT) so the client can echo back what it loaded.
        modifierGroups: z.array(modifierGroupSchema).max(6, 'الحد الأقصى 6 مجموعات خيارات لكل صنف').optional(),
}).superRefine((v, ctx) => {
        if (v.discountedPrice != null && v.discountedPrice > v.price) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountedPrice'], message: 'السعر المخفض لا يمكن أن يتجاوز السعر الأصلي' });
        }
});

export async function GET(request: NextRequest) {
        try {
                const url = new URL(request.url);
                const { searchParams } = url;
                const { page, pageSize } = parsePagination(url);
                // round88-B4: explicit NaN guard — a non-numeric id used to fall
                // through the falsy-NaN `if (param)` checks and land in the
                // "معرف التصنيف أو المطعم مطلوب" 400 only by accident.
                const categoryId = parseIdSearchParam(url, 'categoryId');
                if (categoryId !== undefined && Number.isNaN(categoryId)) {
                        return error('معرف التصنيف غير صالح', 400);
                }
                const restaurantId = parseIdSearchParam(url, 'restaurantId');
                if (restaurantId !== undefined && Number.isNaN(restaurantId)) {
                        return error('معرف المطعم غير صالح', 400);
                }
                const status = searchParams.get('status') || undefined;
                // round91-F-B (D2-#5): فلتر الحالة كان يمرّ بلا تحقق للطاقم/المالك —
                // قيمة غير صالحة كانت تصل Prisma كضجيج 500. الآن enum مشتق من
                // المخطط (نفس itemStatusValues أعلاه) → 400 عربية نظيفة، بنمط
                // عائلة الطلبات (isValidOrderStatusFilter).
                if (status !== undefined && !itemStatusValues.includes(status)) {
                        return error('حالة الصنف غير صالحة', 400);
                }

                // r93-W1a (MED-3): حد المعدل قبل أي عمل DB (requireAuth نفسه
                // يستعلم الجلسة، وfindMany/count بعده) — وبعد فروع تحقق
                // المعاملات أعلاه حتى لا تحرق الطلبات الفاسدة (400) الميزانية
                // ولا تُنشأ صفوف RateLimitEntry لها.
                const ip = getClientIp(request); // round91-D1: unified extraction
                const limit = await itemsGetLimiter.check(`items-get:${ip}`);
                if (!limit.success) {
                        return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);
                }

                const where: Record<string, unknown> = {};
                const auth = await requireAuth();
                // round85-A1: the free USER role has no ownership path for menu reads —
                // treat it exactly like an anonymous caller (available items only),
                // otherwise it could enumerate hidden/draft items of ANY restaurant.
                // Staff (super_admin/admin/sub_admin) keep full read access.
                const isStaff =
                        auth.authorized &&
                        (auth.role === 'super_admin' || auth.role === 'admin' || auth.role === 'sub_admin');
                const canSeeAll = isStaff || (auth.authorized && auth.role === 'owner');
                if (restaurantId) {
                        // Owners can only read their own restaurant's items — multi-menu aware
                        if (auth.authorized && auth.role === 'owner' && auth.restaurantId !== restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                                if (!link) return error('غير مصرح', 403);
                        }
                        // Non-staff (anonymous or USER): only available items
                        where.category = { is: { restaurantId } };
                        if (!canSeeAll) where.status = 'available';
                } else if (categoryId) {
                        where.categoryId = categoryId;
                        if (!canSeeAll) where.status = 'available';
                } else if (isStaff) {
                        // r103-F1: the multi-restaurant admin console (/admin/menu)
                        // lists items ACROSS all restaurants — the round87-B9 staff
                        // embed (category.restaurant below) exists exactly for it.
                        // round88-wave4 made this branch an unconditional 400, which
                        // silently emptied the admin menu page (its fetch has no
                        // scope by design). Staff keeps full read access (round85-A1);
                        // owners/USER/anonymous still require an explicit scope so no
                        // tenant boundary is opened.
                } else {
                        return error('معرف التصنيف أو المطعم مطلوب', 400);
                }
                // round85-A1: status filter override is staff/owner-only (a USER or
                // anonymous caller must not flip ?status=hidden to bypass the
                // available-only filter above)
                if (status && canSeeAll) where.status = status;

                // round87-B9: only the multi-restaurant admin console reads
                // category.restaurant from this list (search + column). The owner
                // menu editor never touches it, so owners get a thin category
                // select instead of the full restaurant embed on every row.
                const categoryEmbed = isStaff
                        ? { category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } } }
                        : { category: { select: { id: true, name: true, nameAr: true } } };

                const [data, total] = await Promise.all([
                        prisma.menuItem.findMany({
                                where,
                                orderBy: { sortOrder: 'asc' },
                                include: {
                                        ...categoryEmbed,
                                        // w3-f1: groups + options feed the owner item editor
                                        // (same order the dialog renders them in).
                                        modifierGroups: {
                                                orderBy: { sortOrder: 'asc' },
                                                include: { options: { orderBy: { sortOrder: 'asc' } } },
                                        },
                                },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                        }),
                        prisma.menuItem.count({ where }),
                ]);

                return paginated(data, total, page, pageSize);
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const body = createSchema.parse(await request.json());

                // Round83 §2.3 — normalize the badge list (trim + dedupe).
                const showcaseTags = body.isFeatured
                        ? [...new Set([...(body.showcaseTags ?? [])].filter((t): t is string => !!t?.trim()).map((t) => t.trim()))].slice(0, 3)
                        : [];

                // Check plan limits: get category -> restaurant -> plan
                // (round89-E1: plan name joins the same single query the cap needs)
                const category = await prisma.menuCategory.findUnique({
                        where: { id: body.categoryId },
                        select: {
                                restaurant: {
                                        select: { id: true, name: true, maxItems: true, plan: { select: { nameAr: true } } },
                                },
                        },
                });
                if (!category) return error('التصنيف غير موجود', 404);

                // round86-A3: image values must be valid media URLs, and blob URLs
                // marked for another tenant are rejected (swap-delete replay guard)
                if (body.image) {
                        const imgErr = mediaUrlError(body.image, category.restaurant.id);
                        if (imgErr) return error(imgErr, 422);
                }

                // Owners can only add items to categories of restaurants they manage —
                // multi-menu aware via UserRestaurant links (same pattern as items/[id],
                // categories, and categories/[id]; previously this route only checked
                // the primary restaurantId, breaking multi-menu owners)
                if (auth.role === 'owner' && auth.restaurantId !== category.restaurant.id) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: category.restaurant.id } },
                        });
                        if (!link) return error('غير مصرح', 403);
                }
                // Staff roles (admin/sub_admin — super_admin passes automatically) may only
                // add items to arbitrary restaurants when they hold MANAGE_RESTAURANTS
                if (auth.role !== 'owner') {
                        const perm = await requirePermission('MANAGE_RESTAURANTS');
                        if (!perm.authorized) return error(perm.error, perm.status);
                }

                // Count + create in one transaction (round-77: TOCTOU — concurrent
                // POSTs both passed the outside count, exceeding maxItems).
                // round90-F3: count-then-create inside READ COMMITTED still does
                // NOT serialize — two concurrent POSTs at maxItems-1 both count
                // the same snapshot and both create. A row lock on the SAME
                // Restaurant row that owns maxItems serializes every item create
                // for that restaurant: the loser re-counts AFTER the winner commits
                // (READ COMMITTED re-evaluates per statement) and correctly hits
                // the cap. Same pattern the diagnosis prescribed for orders T1.
                const data = await prisma.$transaction(async (tx) => {
                        await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${category.restaurant.id} FOR UPDATE`;
                        // round91-F-B (D2-#4): السقف المعتمد يُقرأ تحت القفل — كانت
                        // maxItems تُقرأ قبل المعاملة فتمرر الصف الواحد الزائد إذا
                        // التزمت تخفيض خطة متزامن في نافذة السباق (fail-open بواحد).
                        // القراءة السابقة تبقى للعرض (اسم الخطة) وللفحص السريع.
                        const locked = await tx.restaurant.findUnique({
                                where: { id: category.restaurant.id },
                                select: { maxItems: true },
                        });
                        const effectiveMaxItems = locked?.maxItems ?? category.restaurant.maxItems;
                        const existingCount = await tx.menuItem.count({
                                where: { category: { is: { restaurantId: category.restaurant.id } } },
                        });
                        if (existingCount >= effectiveMaxItems) {
                                // round89-E1: unified plan-cap error (was local ItemLimitError)
                                throw new PlanLimitError({
                                        kind: 'items',
                                        limit: effectiveMaxItems,
                                        planName: category.restaurant.plan?.nameAr ?? null,
                                });
                        }
                        return tx.menuItem.create({
                                data: {
                                        name: body.name,
                                        nameAr: body.nameAr ?? null,
                                        description: body.description ?? '',
                                        descriptionAr: body.descriptionAr ?? '',
                                        price: body.price,
                                        discountedPrice: body.discountedPrice ?? null,
                                        image: body.image ?? '',
                                        status: (body.status ?? 'available') as ItemStatus,
                                        sortOrder: body.sortOrder ?? 0,
                                        categoryId: body.categoryId,
                                        dietaryTags: body.dietaryTags ?? [],
                                        allergens: body.allergens ?? [],
                                        isFeatured: body.isFeatured ?? false,
                                        featuredRank: body.isFeatured ? (body.featuredRank ?? null) : null,
                                        // round88-C: single-column mirror dropped — the
                                        // array is the source of truth (and only storage).
                                        showcaseTags,
                                        // w3-f1 (F1-3): nested write — same Prisma relation
                                        // pattern as the items write above; ids in the payload
                                        // are ignored (fresh create).
                                        ...(body.modifierGroups
                                                ? {
                                                          modifierGroups: {
                                                                  create: body.modifierGroups.map(modifierGroupCreateInput),
                                                          },
                                                  }
                                                : {}),
                                },
                                include: {
                                        category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } },
                                },
                        });
                });
                logAudit({
                        action: 'create',
                        actorId: auth.userId,
                        targetType: 'menuItem',
                        targetId: data.id,
                        metadata: { restaurantId: category.restaurant.id, name: data.name },
                }).catch(() => {});
                // round85-B9: purge the ISR cache so the new item is live instantly
                await revalidateMenu(category.restaurant.id);
                return success(data, 201);
        } catch (e) {
                if (e instanceof PlanLimitError) return error(e.message, 403);
                return handleError(e);
        }
}

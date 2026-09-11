import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error as apiError, handleError, parsePagination, parseIdSearchParam } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    // round89-E3: unauthenticated → 401 (the platform-wide rule); an
    // AUTHENTICATED caller who is simply not staff → 403 (dx-1 ب-5 — this
    // used to answer 401 for both, hiding "logged in but forbidden").
    if (!auth.authorized) return apiError("غير مصرح", 401);
    if (!["super_admin", "sub_admin", "admin"].includes(auth.role)) return apiError("غير مصرح", 403);
    // r103-F6: the role gate alone let a ZERO-permission sub_admin enumerate
    // every owner's username/name/restaurant — every sibling list route requires
    // a permission (restaurants→VIEW_ANALYTICS, orders→APPROVE_ORDERS,
    // system-events→VIEW_ANALYTICS); this is the users list → MANAGE_USERS.
    if (auth.role === "sub_admin" && !(auth.permissions ?? []).includes("MANAGE_USERS")) {
      return apiError("لا تملك الصلاحية", 403);
    }
    const url = new URL(request.url);
    const { searchParams } = url;
    const restaurantId = parseIdSearchParam(url, "restaurantId");
    // round88-B4: a non-numeric restaurantId used to be silently dropped (NaN
    // is falsy) — the list then ignored the filter. Reject it explicitly.
    if (restaurantId !== undefined && Number.isNaN(restaurantId)) {
      return apiError("معرف المطعم غير صالح", 400);
    }
    const { page, pageSize } = parsePagination(url);
    const search = searchParams.get("search")?.trim();
    const roleFilter = searchParams.get("role");

    const where: Record<string, unknown> = { role: "owner" };

    // Override role filter if specified
    if (roleFilter && roleFilter !== "all") {
      where.role = roleFilter;
    }

    if (restaurantId) where.restaurantId = restaurantId;

    // Search by name or username
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          restaurantId: true,
          restaurant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return success({ users, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

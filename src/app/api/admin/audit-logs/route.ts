import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { AuditAction } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const actorId = searchParams.get("actorId") ? Number(searchParams.get("actorId")) : undefined;
    const search = searchParams.get("search");

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action as AuditAction;
    if (targetType) where.targetType = targetType;
    if (actorId) where.actorId = actorId;
    if (search?.trim()) {
      where.OR = [
        { targetType: { contains: search.trim(), mode: "insensitive" } },
        { ip: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return success({ data, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

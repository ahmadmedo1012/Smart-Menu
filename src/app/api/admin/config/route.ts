import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { encryptValue } from "@/lib/config";

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  category: z.string().min(1).max(50).optional().default("general"),
  isSecret: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
});

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
      select: { id: true, key: true, value: true, category: true, isSecret: true, description: true, updatedAt: true, updatedBy: true },
    });

    const masked = configs.map((c) => ({
      ...c,
      value: c.isSecret ? "••••••••" : c.value,
    }));

    return success(masked);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body = upsertSchema.parse(await request.json());

    // Encrypt secret values at rest — serialize non-strings so encryption always runs
    const value = body.isSecret
      ? await encryptValue(typeof body.value === "string" ? body.value : JSON.stringify(body.value))
      : body.value;

    const config = await prisma.$transaction(async (tx) => {
      return tx.systemConfig.upsert({
        where: { key: body.key },
        update: {
          value,
          category: body.category,
          isSecret: body.isSecret,
          description: body.description,
          updatedBy: auth.userId ?? undefined,
        },
        create: {
          key: body.key,
          value,
          category: body.category,
          isSecret: body.isSecret,
          description: body.description,
          updatedBy: auth.userId ?? undefined,
        },
        select: { id: true, key: true, category: true, isSecret: true, description: true, updatedAt: true },
      });
    });

    revalidateTag("system-config", { expire: 60 });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId ?? undefined,
      targetType: "SystemConfig",
      targetId: config.id,
      metadata: { key: body.key, category: body.category },
    });

    return success({ ...config, value: "••••••••" });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return error("key is required", 400);

    await prisma.systemConfig.delete({ where: { key } });
    revalidateTag("system-config", { expire: 60 });

    await logAudit({
      action: AuditAction.delete,
      actorId: auth.userId ?? undefined,
      targetType: "SystemConfig",
      metadata: { key },
    });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

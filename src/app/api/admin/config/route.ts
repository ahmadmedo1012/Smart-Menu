import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { encryptValue } from "@/lib/config";

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  // round87-A10: value is a Json column, so any JSON shape is legitimate —
  // but its serialized size must be bounded (DB-bloat class; previously
  // z.any() accepted multi-MB payloads). The size check runs after parse.
  // round97-X3: z.any() narrowed to z.json() (zod 4) — objects, arrays,
  // strings, numbers, booleans and null still parse; functions/undefined
  // (impossible via request.json() anyway) now fail cleanly instead of
  // flowing into JSON.stringify as "undefined".
  value: z.json(),
  category: z.string().min(1).max(50).optional().default("general"),
  // round87-A10: NO default — an omitted flag must preserve the stored
  // isSecret instead of silently declassifying the row (the old .default(false)
  // flipped a secret row to plain on any save that omitted the flag).
  isSecret: z.boolean().optional(),
  description: z.string().max(500).optional().default(""),
});

/** round87-A10: serialized size bound for the Json value. */
function configValueError(value: unknown): string | null {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value ?? null);
    if (s.length > 20_000) return "قيمة الإعداد كبيرة جداً (الحد 20 ألف حرف)";
    return null;
  } catch {
    return "قيمة الإعداد غير قابلة للتخزين";
  }
}

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

    // round87-A10: bound the serialized value size
    const valueErr = configValueError(body.value);
    if (valueErr) return error(valueErr, 422);

    // round87-A10: resolve isSecret — explicit flag wins, omitted preserves the
    // stored flag (create defaults to false). A masked-save can no longer
    // declassify an existing secret row by omitting the field.
    const existingRow = await prisma.systemConfig.findUnique({
      where: { key: body.key },
      select: { isSecret: true },
    });
    const isSecret = body.isSecret ?? existingRow?.isSecret ?? false;

    // Mask placeholder means "unchanged" for secret fields — never write the bullets
    // back over the real value (that silently destroyed the stored secret).
    if (isSecret && body.value === "••••••••") {
      const existing = await prisma.systemConfig.findUnique({ where: { key: body.key } });
      if (existing) {
        return success({
          id: existing.id,
          key: existing.key,
          category: existing.category,
          isSecret: existing.isSecret,
          description: existing.description,
          updatedAt: existing.updatedAt,
          value: "••••••••",
        });
      }
    }

    // Encrypt secret values at rest — serialize non-strings so encryption always runs
    // round97-X3: z.json() surfaces Prisma's Json-input contract — a literal JSON
    // null needs the JsonNull sentinel, so it is excluded from the write type
    // (in the z.any() era it slipped through typing and died in Prisma
    // validation at runtime — behavior for that pathological case unchanged).
    const value: Prisma.InputJsonValue = isSecret
      ? await encryptValue(typeof body.value === "string" ? body.value : JSON.stringify(body.value ?? null))
      : (body.value as Prisma.InputJsonValue);

    const config = await prisma.$transaction(async (tx) => {
      return tx.systemConfig.upsert({
        where: { key: body.key },
        update: {
          value,
          category: body.category,
          isSecret,
          description: body.description,
          updatedBy: auth.userId ?? undefined,
        },
        create: {
          key: body.key,
          value,
          category: body.category,
          isSecret,
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

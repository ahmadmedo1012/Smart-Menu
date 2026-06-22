import { prisma } from "@/lib/db";
import { AuditAction } from "@/generated/prisma/enums";

export async function logAudit(params: {
  action: (typeof AuditAction)[keyof typeof AuditAction];
  actorId?: number;
  targetType: string;
  targetId?: number;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      actorId: params.actorId ?? null,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as object,
      ip: params.ip ?? "",
    },
  });
}

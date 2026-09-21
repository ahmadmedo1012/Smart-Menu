import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Helper: bigint → string for JSON-safe serialization
function serializeApprover(a: { telegramId: bigint } & Record<string, unknown>) {
  return { ...a, telegramId: String(a.telegramId) };
}

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const approvers = await prisma.telegramApprover.findMany({
      orderBy: { createdAt: "desc" },
      include: { addedBy: { select: { id: true, name: true, username: true } } },
    });

    return success(approvers.map(serializeApprover));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    // r118-A2-P2: adding an approver grants PAYMENT-VERIFY/CANCEL power (the
    // webhook gates on TelegramApprover rows) — EDIT_SETTINGS was enough for a
    // sub_admin to self-approve a paid plan. Escalation-sensitive mutations
    // require MANAGE_SUBSCRIPTIONS and are now audited.
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body = await request.json();
    const rawId = String(body.telegramId ?? "").trim();
    if (!/^\d{1,20}$/.test(rawId) || rawId === "0") {
      return error("معرف تليجرام غير صالح", 400);
    }
    // round87-A4: bound the label free-text (DB bloat class)
    const label = String(body.label ?? "").trim().slice(0, 100);

    const telegramId = BigInt(rawId);

    // findUnique doesn't support BigInt composite keys — use findFirst
    const existing = await prisma.telegramApprover.findFirst({ where: { telegramId } });
    if (existing) return error("هذا المعرف مضاف مسبقاً", 409);

    const approver = await prisma.telegramApprover.create({
      data: {
        telegramId,
        label,
        addedById: auth.userId,
      },
      include: { addedBy: { select: { id: true, name: true, username: true } } },
    });

    // r118-A2-P2: the sibling delete/create endpoints all audit; this
    // authority grant was the silent one.
    logAudit({
      action: "create",
      targetType: "telegram_approver",
      targetId: Number(approver.id),
      actorId: auth.userId ?? undefined,
      metadata: { telegramId: rawId, label },
    }).catch(() => {});

    return success(serializeApprover(approver));
  } catch (e) {
    return handleError(e);
  }
}

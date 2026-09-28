import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound, parsePagination } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";
// r116: موافقة/رفض اللوحة كانا يتركان أزرار تليجرام حية على كل النسخ —
// أي ضغطة لاحقة تعطي «تمت معالجة هذا الطلب مسبقاً». المزامنة تجرّد الأزرار
// وتحدّث النص على كل النسخ المسجلة (best-effort — لا تفشل الحسم).
import { syncPaymentMessagesAfterDecision } from "@/lib/telegram-payment-sync";

const verifySchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["verified", "cancelled"]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const url = new URL(request.url);
    const { searchParams } = url;
    const status = searchParams.get("status") || "pending";
    // round88-B4: the status filter feeds a string-literal union — anything
    // outside it used to surface as a caught Prisma validation error. Reject
    // it explicitly with the same 400 semantics.
    if (status !== "all" && !["pending", "verified", "cancelled"].includes(status)) {
      return error("حالة غير صحيحة", 400);
    }
    const { page, pageSize } = parsePagination(url);

    const where = status !== "all" ? { status: status as "pending" | "verified" | "cancelled" } : {};

    const [data, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          phone: true,
          amount: true,
          provider: true,
          planId: true,
          planName: true,
          status: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, username: true, name: true } },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    return success({ data, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { id, status } = verifySchema.parse(await request.json());

    // r121-E2: panel-side twin of the webhook's isPaymentSelfApproval guard
    // (telegram/webhook/route.ts, r118-A2-P2): an approver who IS the payer
    // cannot resolve their own payment — verify or cancel, ROLE-BLIND, same
    // semantics as the webhook. Without this, any MANAGE_SUBSCRIPTIONS holder
    // who also owns/manages a restaurant could file their own pending upgrade
    // (subscriptions/upgrade is requireAuth-only and pins userId) and then
    // approve it from this panel: paid plan activated, no money moved.
    // A null payment (or null userId — new-user pending payments) falls
    // through to resolveSubscriptionPayment's own 404 handling.
    const selfPayment = await prisma.subscriptionPayment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (selfPayment?.userId != null && selfPayment.userId === auth.userId) {
      return error("لا يمكنك البت في طلب دفع خاص بحسابك", 403);
    }

    const result = await resolveSubscriptionPayment(id, status);
    if (!result.ok) {
      if (result.reason === "الطلب غير موجود") return notFound('الدفع');
      // round91-F-B: the decision lib now carries the failure status (409 for
      // the plan-cap rejection / r116 already-processed conflict) — absent →
      // the legacy 400.
      return error(result.reason, result.status ?? 400);
    }

    // r116: الحسم من اللوحة يجب أن يُذهب أزرار تليجرام أيضًا — الدالة لا ترمي
    // استثناءً أبدًا، فلا تغيير في مغلف الاستجابة الناجح.
    await syncPaymentMessagesAfterDecision(id, status, { source: 'panel' });

    return success(result);
  } catch (e) {
    return handleError(e);
  }
}

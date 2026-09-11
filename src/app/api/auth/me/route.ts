import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getRoleLabel(role: string): string {
  switch (role) {
    case "super_admin": return "مدير عام";
    case "admin": return "مشرف";
    case "sub_admin": return "مسؤول";
    case "owner": return "مالك";
    default: return "مستخدم";
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401); // round90-F6

    // r102-M13: the mobile app boots from this response (no login happened yet,
    // so it has no user identity). Reading the row's id/username/name lets the
    // RN store hydrate a REAL user instead of fabricating {id:0, username:""}.
    // Additive fields — the existing web consumers ignore them.
    const identity = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, name: true },
    });

    return success({
      authenticated: true,
      id: identity?.id ?? null,
      username: identity?.username ?? "",
      name: identity?.name ?? "",
      role: auth.role,
      restaurantId: auth.restaurantId,
      subscriptionStatus: auth.subscriptionStatus,
      permissions: auth.permissions,
      roleLabel: getRoleLabel(auth.role ?? "USER"),
    });
  } catch (e) {
    return handleError(e);
  }
}

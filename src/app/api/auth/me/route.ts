import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

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
    if (!auth.authorized) return error("Not authenticated", 401);

    return success({
      authenticated: true,
      role: auth.role,
      restaurantId: auth.restaurantId,
      subscriptionStatus: (auth as any).subscriptionStatus ?? null,
      permissions: (auth as any).permissions ?? [],
      roleLabel: getRoleLabel(auth.role ?? "USER"),
    });
  } catch (e) {
    return handleError(e);
  }
}

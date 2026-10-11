import { validateSession } from "./session";
import { getUserById } from "./db";

type AuthResult = {
  authorized: true;
  userId: number;
  role: string;
  restaurantId: number | null;
  subscriptionStatus: string | null;
  permissions: string[];
};

export async function requireAuth(opts?: { requireRestaurant?: boolean }): Promise<AuthResult | { authorized: false }> {
  const session = await validateSession();
  if (session.valid && session.userId) {
    // round85-B6: validateSession joins the user row into the same query.
    // `user === undefined` means a legacy mock/caller didn't provide it —
    // fall back to the separate lookup (keeps old tests/contract working).
    let user = session.user;
    if (user === undefined) {
      user = await getUserById(session.userId);
    }
    if (user) {
      if (opts?.requireRestaurant && !user.restaurantId) {
        return { authorized: false } as const;
      }
      return {
        authorized: true as const,
        userId: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        subscriptionStatus: user.subscriptionStatus,
        permissions: user.permissions,
      };
    }
  }

  return { authorized: false } as const;
}

/* r139 (housekeeping — قرار r138-e بعد تصحيحه): requireAdmin حُذف — كان
   @deprecated ومستدعاه الإنتاجي الوحيد (audit-logs + seed) رُحِّل إلى
   requireAuth مع فحص الدور الصريح في موقعه (صون الدلالات حرفيًا — لا
   بوابة وسيطة بين الجلسة والعقد). المسارات الإدارية الأخرى كلها على
   requirePermission بصلاحيات محددة منذ R90-F3. */
export async function requirePermission(
  permission: string,
  opts?: { requireRestaurant?: boolean }
): Promise<
  AuthResult
  | { authorized: false; error: string; status: number }
> {
  const auth = await requireAuth(opts);
  if (!auth.authorized) return { authorized: false, error: "غير مصرح", status: 401 };
  // super_admin: full access. `admin` (legacy): full access EXCEPT
  // MANAGE_USERS — that one is super_admin-only, otherwise an admin could
  // create sub_admins / reset passwords / escalate (privilege escalation).
  if (auth.role === "super_admin") return auth;
  if (auth.role === "admin") {
    if (permission === "MANAGE_USERS") {
      return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
    }
    return auth;
  }
  if (auth.role === "sub_admin" && auth.permissions?.includes(permission)) {
    return auth;
  }
  return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
}

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

/** @deprecated Use requirePermission() with specific permission instead */
export async function requireAdmin(): Promise<
  AuthResult | { authorized: false; error: string; status: number }
> {
  // round91-F-B (D2-#3): 401 ONLY for no-session — a logged-in wrong-role
  // caller now gets 403 + Arabic error (mirrors the orders/[id] pattern of
  // the R90-F3 unification; requireAuth used to conflate the two cases so
  // /api/seed + /api/admin/audit-logs answered 401 to an authenticated
  // owner/USER).
  const r = await requireAuth();
  if (!r.authorized) return { authorized: false, error: "غير مصرح", status: 401 };
  if (r.role !== "super_admin" && r.role !== "sub_admin" && r.role !== "admin") {
    return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
  }
  return r;
}

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

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
    const user = await getUserById(session.userId);
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
export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.authorized || (r.role !== "super_admin" && r.role !== "sub_admin" && r.role !== "admin")) return { authorized: false } as const;
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
  if (auth.role === "super_admin" || auth.role === "admin") return auth;
  if (auth.role === "sub_admin" && auth.permissions?.includes(permission)) {
    return auth;
  }
  return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
}

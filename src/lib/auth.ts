import { validateSession } from "./session";

export async function requireAuth(opts?: { requireRestaurant?: boolean }) {
  // Primary auth: session-based
  const session = await validateSession();
  if (session.valid && session.userId) {
    const { getUserById } = await import("./db");
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
        subscriptionStatus: (user as any).subscriptionStatus ?? null,
        permissions: (user as any).permissions ?? [],
      };
    }
  }

  return { authorized: false } as const;
}

export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.authorized || (r.role !== "super_admin" && r.role !== "sub_admin" && r.role !== "admin")) return { authorized: false } as const;
  return r;
}

export async function requirePermission(
  permission: string,
  opts?: { requireRestaurant?: boolean }
): Promise<
  | { authorized: true; userId: number | null; role: string; restaurantId: number | null; permissions: string[] }
  | { authorized: false; error: string; status: number }
> {
  const auth = await requireAuth(opts);
  if (!auth.authorized) return { authorized: false, error: "غير مصرح", status: 401 };
  // backward compat: treat legacy "admin" as super_admin
  if (auth.role === "super_admin" || auth.role === "admin") return auth as any;
  if (auth.role === "sub_admin" && auth.permissions?.includes(permission)) {
    return auth as any;
  }
  return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
}

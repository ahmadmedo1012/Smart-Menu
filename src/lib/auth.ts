import { cookies } from "next/headers";
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
      };
    }
  }

  // Fallback: cookie-based auth (backward compat until sessions fully deployed)
  const c = await cookies();
  const auth = c.get("smart-menu-auth")?.value;
  if (auth !== "true") return { authorized: false } as const;
  const userId = c.get("smart-menu-user-id")?.value
    ? Number(c.get("smart-menu-user-id")!.value)
    : null;
  const role = c.get("smart-menu-role")?.value ?? null;
  const restaurantId = c.get("smart-menu-restaurant")?.value
    ? Number(c.get("smart-menu-restaurant")!.value)
    : null;
  if (opts?.requireRestaurant && !restaurantId) return { authorized: false } as const;
  return { authorized: true as const, userId, role, restaurantId };
}

export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.authorized || r.role !== "admin") return { authorized: false } as const;
  return r;
}

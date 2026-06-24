import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function requireAuth(opts?: { requireRestaurant?: boolean }) {
  const c = await cookies();
  const sessionToken = c.get("smart-menu-session")?.value;
  if (!sessionToken) return { authorized: false } as const;

  // Validate session from DB store
  let user;
  try {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return { authorized: false } as const;
    }
    user = session.user;
  } catch {
    return { authorized: false } as const;
  }

  // Fallback read from legacy cookies for backward compat (transitional)
  const userId = user?.id ?? (c.get("smart-menu-user-id")?.value ? Number(c.get("smart-menu-user-id")!.value) : null);
  const role = user?.role ?? (c.get("smart-menu-role")?.value ?? null);
  const restaurantId = user?.restaurantId ?? (c.get("smart-menu-restaurant")?.value ? Number(c.get("smart-menu-restaurant")!.value) : null);

  if (opts?.requireRestaurant && !restaurantId) return { authorized: false } as const;
  return { authorized: true as const, userId, role, restaurantId };
}

export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.authorized || r.role !== "admin") return { authorized: false } as const;
  return r;
}

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { error as apiError } from "@/lib/api-helpers";

/**
 * One-shot endpoint: fixes admin user role.
 * Only needs a valid session (auth=true cookie), not admin role.
 * This fixes the chicken-and-egg where admin role=owner on fresh deploy.
 */
export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    const user = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!user) {
      return Response.json({ success: false, error: "Admin user not found" });
    }

    if (user.role === "admin") {
      return Response.json({ success: true, message: "Admin role already correct" });
    }

    await prisma.user.update({ where: { id: user.id }, data: { role: "admin" } });
    return Response.json({ success: true, message: `Admin role fixed: ${user.role} → admin` });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
}

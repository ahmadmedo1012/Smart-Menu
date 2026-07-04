import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("Not authenticated", 401);

    return success({
      authenticated: true,
      role: auth.role,
      restaurantId: auth.restaurantId,
      subscriptionStatus: (auth as any).subscriptionStatus ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}

import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

// Landing page hits this on every visit — cached at most every 60s.
export const revalidate = 60;

// round85-C6: migrated to the shared api-helpers envelope (was the only
// route returning a bare { error } without the success flag — inconsistent
// shape for every client that expects { success, data }).
export async function GET() {
  try {
    const [totalRestaurants, totalUsers] = await Promise.all([
      prisma.restaurant.count(),
      prisma.user.count(),
    ]);

    return success({ totalRestaurants, totalUsers });
  } catch (e) {
    return handleError(e);
  }
}

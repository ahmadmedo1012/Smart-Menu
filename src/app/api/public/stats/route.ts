import { success, handleError } from "@/lib/api-helpers";
import { countPublicStats } from "@/lib/stats-queries";

// Landing page hits this on every visit — cached at most every 60s.
export const revalidate = 60;

// round85-C6: migrated to the shared api-helpers envelope (was the only
// route returning a bare { error } without the success flag — inconsistent
// shape for every client that expects { success, data }).
export async function GET() {
  try {
    // r143 (Phase-4 W1 D6): عدّادات صادقة (isActive:true + role:owner) عبر
    // countPublicStats — كان العدّ الخام يرفع الرقمين بمطاعم مطفأة وحسابات إدارة.
    const { totalRestaurants, totalUsers } = await countPublicStats();

    return success({ totalRestaurants, totalUsers });
  } catch (e) {
    return handleError(e);
  }
}

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("smart-menu-auth");
    const roleCookie = cookieStore.get("smart-menu-role");
    const restaurantCookie = cookieStore.get("smart-menu-restaurant");

    if (authCookie?.value !== "true") {
      return Response.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    return success({
      authenticated: true,
      role: roleCookie?.value ?? null,
      restaurantId: restaurantCookie?.value ? Number(restaurantCookie.value) : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

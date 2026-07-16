import { error as logError } from "@/lib/logger";
import { success, error } from "@/lib/api-helpers";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();

    return success({ message: "Logged out" });
  } catch (e) {
    logError("Logout error:", { error: e instanceof Error ? e.message : String(e) });
    return error("Logout failed", 500);
  }
}

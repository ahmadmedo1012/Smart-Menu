import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

// Platform config (fees, withdrawal rules, wallet provider) is internal —
// require a session so anonymous visitors can't enumerate it.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const config = await prisma.systemConfig.findUnique({ where: { key } });
      if (!config || config.isSecret) return error("Not found", 404);
      return success({ key: config.key, value: config.value });
    }

    const configs = await prisma.systemConfig.findMany({
      where: { isSecret: false },
      select: { key: true, value: true, category: true },
    });

    return success(configs);
  } catch (e) {
    return handleError(e);
  }
}

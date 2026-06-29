import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
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
}

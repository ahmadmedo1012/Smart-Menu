import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return new Response("Server misconfigured", { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expected)
    return new Response("Forbidden", { status: 403 });

  const config = await prisma.systemConfig.findUnique({ where: { key: "diag_last_keyboard" } });
  const envToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const envAdmin = process.env.TELEGRAM_ADMIN_IDS ?? "(not set)";

  return Response.json({
    diag: config?.value ?? null,
    envToken,
    envAdmin,
  });
}

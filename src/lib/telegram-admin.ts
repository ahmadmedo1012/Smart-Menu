import { prisma } from "@/lib/db";

export async function getAdminTelegramIds(): Promise<number[]> {
  // 1. Env var - legacy admins
  const envIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  // 2. DB approvers — BigInt from Prisma, convert to Number (safe within 53-bit)
  const dbApprovers = await prisma.telegramApprover.findMany({
    select: { telegramId: true },
  });
  const dbIds = dbApprovers
    .map((a) => Number(a.telegramId))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  return [...new Set([...envIds, ...dbIds])];
}

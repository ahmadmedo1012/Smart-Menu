import { prisma } from "@/lib/db";

export async function getAdminTelegramIds(): Promise<number[]> {
  // 1. Env var - legacy admins (super_admin / Vercel env)
  const envIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  // 2. DB approvers - added via admin panel
  const dbApprovers = await prisma.telegramApprover.findMany({
    select: { telegramId: true },
  });
  const dbIds = dbApprovers.map((a) => a.telegramId);

  return [...new Set([...envIds, ...dbIds])];
}

import { prisma } from "@/lib/db";

interface BroadcastResult {
  sent: number;
  failed: { chatId: string; reason: string }[];
}

interface BroadcastOpts {
  parseMode?: "Markdown" | "HTML";
}

export async function sendToChat(
  botToken: string,
  chatId: string,
  message: string,
  opts?: BroadcastOpts,
): Promise<void> {
  const body: Record<string, string | number> = {
    chat_id: /^-?\d+$/.test(chatId) ? Number(chatId) : chatId,
    text: message,
  };
  if (opts?.parseMode) body.parse_mode = opts.parseMode;
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API ${res.status}: ${err.slice(0, 300)}`);
  }
}

async function gatherTargets(): Promise<Set<string>> {
  const targets = new Set<string>();

  // Active broadcast targets
  const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
    where: { isActive: true },
    select: { chatId: true },
  });
  for (const t of broadcastTargets) targets.add(t.chatId);

  // Linked admin users
  const linkedUsers = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  for (const u of linkedUsers) {
    if (u.telegramChatId) targets.add(u.telegramChatId);
  }

  return targets;
}

export async function broadcastToAll(
  message: string,
  opts?: BroadcastOpts,
  existingConfig?: { botToken: string; isActive: boolean },
): Promise<BroadcastResult> {
  const config = existingConfig ?? await prisma.telegramConfig.findFirst();
  if (!config || !config.isActive || !config.botToken) {
    return { sent: 0, failed: [] };
  }

  const targetIds = await gatherTargets();
  if (targetIds.size === 0) return { sent: 0, failed: [] };

  const results = await Promise.allSettled(
    Array.from(targetIds).map((chatId) =>
      sendToChat(config.botToken, chatId, message, opts),
    ),
  );

  const failed: BroadcastResult["failed"] = [];
  let sent = 0;

  const chatIds = Array.from(targetIds);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      sent++;
    } else {
      console.error("[Telegram Broadcast] Failed:", chatIds[i], r.reason);
      failed.push({ chatId: chatIds[i], reason: r.reason?.message ?? "Unknown" });
    }
  }

  return { sent, failed };
}

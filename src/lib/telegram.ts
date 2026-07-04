import { prisma } from "@/lib/db";
import { broadcastToAll } from "@/lib/telegram-broadcast";

type BroadcastResult = { sent: number; failed: { chatId: string; reason: string }[] };

export async function sendTelegramNotification(
  message: string,
  opts?: { parseMode?: "Markdown" | "HTML" }
): Promise<BroadcastResult> {
  return broadcastToAll(message, opts);
}

export async function notifyEvent(
  eventType: string,
  data: Record<string, unknown>,
  opts?: { adminOnly?: boolean },
): Promise<BroadcastResult> {
  const config = await prisma.telegramConfig.findFirst();
  if (!config || !config.isActive) return { sent: 0, failed: [] };
  const activeEvents = (config.events as string[]) ?? [];
  if (activeEvents.length > 0 && !activeEvents.includes(eventType)) {
    return { sent: 0, failed: [] };
  }
  const lines = [`*${eventType}*`];
  for (const [k, v] of Object.entries(data)) {
    lines.push(`• ${k}: ${v}`);
  }
  return broadcastToAll(lines.join("\n"), { parseMode: "Markdown", adminOnly: opts?.adminOnly }, config);
}

/** Alias for backward compatibility */
export const sendTelegramMessage = sendTelegramNotification;

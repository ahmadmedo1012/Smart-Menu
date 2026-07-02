import { prisma } from "@/lib/db";

export async function sendTelegramNotification(
  message: string,
  opts?: { parseMode?: "Markdown" | "HTML" }
): Promise<boolean> {
  try {
    const config = await prisma.telegramConfig.findFirst();
    if (!config || !config.isActive || !config.botToken || !config.chatId) {
      return false;
    }
    const body: Record<string, number | string> = {
      chat_id: Number(config.chatId),
      text: message,
    };
    if (opts?.parseMode) body.parse_mode = opts.parseMode;
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errBody = await res.text();
      console.error("Telegram API error:", res.status, errBody.slice(0, 500));
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const config = await prisma.telegramConfig.findFirst();
  if (!config || !config.isActive) return false;
  const activeEvents = (config.events as string[]) ?? [];
  if (activeEvents.length > 0 && !activeEvents.includes(eventType)) {
    return false;
  }
  const lines = [`*${eventType}*`];
  for (const [k, v] of Object.entries(data)) {
    lines.push(`• ${k}: ${v}`);
  }
  return sendTelegramNotification(lines.join("\n"), {
    parseMode: "Markdown",
  });
}

/** Alias for backward compatibility */
export const sendTelegramMessage = sendTelegramNotification;

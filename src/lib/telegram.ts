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
  // round86-A5: escape Telegram Markdown specials in interpolated values — a
  // user-controlled name like "[click here](https://evil.com)" previously
  // rendered as a clickable phishing link inside the admins' ops channel.
  // round90-المنسق (اكتشاف F5b-A): أُضيفت القوسان ( ) لمجموعة التشفير —
  // بدونهما يبقى نص الرابط ظاهرًا وعملاء تيليجرام تُشير الروابط العارية
  // تلقائيًا، فتكتمل الحماية المكسورة جزئيًا.
  const esc = (s: unknown) => String(s).replace(/([_*\[\]`\\()])/g, "\\$1");
  const lines = [`*${esc(eventType)}*`];
  for (const [k, v] of Object.entries(data)) {
    lines.push(`• ${esc(k)}: ${esc(v)}`);
  }
  return broadcastToAll(lines.join("\n"), { parseMode: "Markdown", adminOnly: opts?.adminOnly });
}
// round90-F6: removed the dead `sendTelegramMessage` alias — grep across
// src/ + tests/ + scripts/ found zero consumers (health-devex dead-code #1;
// it also duplicated the sendTelegramNotification export in knip's report).

import type { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number; username?: string };
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    const text = update.message?.text ?? "";
    const chatId = update.message?.chat?.id;
    const username = update.message?.chat?.username;

    if (!chatId || !text.startsWith("/start verify_")) {
      return new Response("OK", { status: 200 });
    }

    const token = text.slice("/start verify_".length);
    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error("webhook: AUTH_SECRET not set");
      return new Response("OK", { status: 200 });
    }

    // Decode and validate HMAC token (same format as verify/route.ts)
    let decoded: string;
    try {
      decoded = Buffer.from(token, "base64url").toString();
    } catch {
      return new Response("OK", { status: 200 });
    }
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) return new Response("OK", { status: 200 });

    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expectedSig) return new Response("OK", { status: 200 });

    let data: { userId: number; exp: number };
    try {
      data = JSON.parse(payload);
    } catch {
      return new Response("OK", { status: 200 });
    }
    if (!data.userId || data.exp < Math.floor(Date.now() / 1000)) {
      return new Response("OK", { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return new Response("OK", { status: 200 });

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        telegramChatId: String(chatId),
        telegramUsername: username ?? null,
        telegramLinkedAt: new Date(),
      },
    });

    // Send confirmation to the user via Telegram
    const config = await prisma.telegramConfig.findFirst();
    const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "تم ربط حسابك بنجاح ✅",
          }),
        },
      );
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response("OK", { status: 200 });
  }
}

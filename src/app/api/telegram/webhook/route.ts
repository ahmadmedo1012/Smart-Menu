import type { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";
import {
  editMessageReplyMarkup,
  editMessageText,
  answerCallbackQuery,
} from "@/lib/telegram-api";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number; username?: string; type?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

async function getBotToken(): Promise<string | null> {
  // Priority: env var first (Vercel), then DB config (admin panel)
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) return envToken;
  const config = await prisma.telegramConfig.findFirst();
  return config?.botToken || null;
}

async function handleCallbackQuery(cq: NonNullable<TelegramUpdate["callback_query"]>): Promise<Response> {
  const botToken = await getBotToken();
  if (!botToken) {
    console.error("[webhook] no bot token configured");
    return new Response("OK", { status: 200 });
  }

  // Gate 1: only allowlisted admin Telegram IDs may act
  const adminIds = await getAdminTelegramIds();
  if (!adminIds.includes(cq.from.id)) {
    await answerCallbackQuery(botToken, cq.id, "عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.", true);
    return new Response("OK", { status: 200 });
  }

  const callbackData = cq.data ?? "";
  const colonIdx = callbackData.indexOf(":");
  if (colonIdx === -1) {
    await answerCallbackQuery(botToken, cq.id, "بيانات غير صالحة", true);
    return new Response("OK", { status: 200 });
  }

  const action = callbackData.slice(0, colonIdx);
  const paymentId = Number(callbackData.slice(colonIdx + 1));
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    await answerCallbackQuery(botToken, cq.id, "بيانات غير صالحة", true);
    return new Response("OK", { status: 200 });
  }

  let decision: "verified" | "cancelled";
  let toastSuccess: string;
  let statusLine: string;

  if (action === "sub_app") {
    decision = "verified";
    toastSuccess = "✅ تم التفعيل والموافقة";
    statusLine = "\n\n⚡ [الحالة: تم التفعيل والموافقة بواسطة المشرف]";
  } else if (action === "sub_rej") {
    decision = "cancelled";
    toastSuccess = "❌ تم رفض الطلب";
    statusLine = "\n\n⚠️ [الحالة: تم رفض الطلب وإبلاغ العميل]";
  } else {
    await answerCallbackQuery(botToken, cq.id, "إجراء غير معروف", true);
    return new Response("OK", { status: 200 });
  }

  const result = await resolveSubscriptionPayment(paymentId, decision);

  // Strip keyboard from the tapped message
  if (cq.message?.chat?.id && cq.message?.message_id) {
    await editMessageReplyMarkup(botToken, cq.message.chat.id, cq.message.message_id);
  }

  if (!result.ok) {
    // Already processed or not found — toast reason, update text
    if (cq.message?.chat?.id && cq.message?.message_id) {
      await editMessageText(botToken, cq.message.chat.id, cq.message.message_id, `${result.reason}${statusLine}`);
    }
    await answerCallbackQuery(botToken, cq.id, result.reason, true);
    return new Response("OK", { status: 200 });
  }

  // Success — update message text with status line
  if (cq.message?.chat?.id && cq.message?.message_id) {
    await editMessageText(botToken, cq.message.chat.id, cq.message.message_id, `✅ ${decision === "verified" ? "تم التفعيل" : "تم الرفض"}${statusLine}`);
  }

  await answerCallbackQuery(botToken, cq.id, toastSuccess);

  // Clean up any other keyboard instances stored in payment metadata
  try {
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      select: { metadata: true },
    });
    const meta = payment?.metadata as { telegramMessages?: { chatId: number; messageId: number }[] } | null;
    if (meta?.telegramMessages) {
      for (const ref of meta.telegramMessages) {
        // Skip the chat we already cleaned up
        if (cq.message?.chat?.id === ref.chatId && cq.message?.message_id === ref.messageId) continue;
        await editMessageReplyMarkup(botToken, ref.chatId, ref.messageId);
      }
    }
  } catch (e) {
    // Best-effort cleanup — non-critical
    console.error("[webhook] keyboard cleanup error:", e);
  }

  return new Response("OK", { status: 200 });
}

export async function POST(request: NextRequest) {
  // Gate 0: prove this request actually came from Telegram
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[webhook] TELEGRAM_WEBHOOK_SECRET is not set — refusing all webhook traffic");
    return new Response("Server misconfigured", { status: 500 });
  }
  const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (incomingSecret !== expectedSecret) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const update: TelegramUpdate = await request.json();

    // Handle callback_query (interactive button tap)
    if (update.callback_query) {
      return handleCallbackQuery(update.callback_query);
    }

    // Log all incoming messages for debugging
    const chatId = update.message?.chat?.id;
    const username = update.message?.chat?.username;
    const chatType = update.message?.chat?.type;
    if (chatId) {
      console.log(`[webhook] msg from chat_id=${chatId} type=${chatType} username=${username ?? "N/A"}`);
    }

    // Handle /start verify_<token> (account linking)
    const text = update.message?.text ?? "";

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
    const botToken = await getBotToken();
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

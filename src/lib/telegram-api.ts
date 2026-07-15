interface SendMsgOpts {
  parseMode?: "Markdown" | "HTML";
  replyMarkup?: Record<string, unknown>;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
}

async function apiCall(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Coerce numeric-looking strings to numbers (Telegram API expects numeric IDs) */
function normalizeChatId(chatId: number | string): number | string {
  return typeof chatId === "string" && /^-?\d+$/.test(chatId) ? Number(chatId) : chatId;
}

export async function sendMessageWithKeyboard(
  botToken: string,
  chatId: number | string,
  text: string,
  buttons: { text: string; callbackData: string }[][],
  opts?: SendMsgOpts,
): Promise<TelegramMessage | null> {
  const payload: Record<string, unknown> = {
    chat_id: normalizeChatId(chatId),
    text,
    reply_markup: { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.callbackData }))) },
  };
  if (opts?.parseMode) payload.parse_mode = opts.parseMode;
  const res = await apiCall(botToken, "sendMessage", payload);
  if (!res.ok) {
    const err = await res.text();
    console.warn("[telegram-api] sendMessage failed", { chatId, status: res.status, error: err.slice(0, 300) });
    return null;
  }
  return res.json();
}

export async function editMessageReplyMarkup(
  botToken: string,
  chatId: number,
  messageId: number,
): Promise<void> {
  const res = await apiCall(botToken, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn("[telegram-api] editMessageReplyMarkup failed", { chatId, messageId, status: res.status, error: err.slice(0, 200) });
  }
}

export async function editMessageText(
  botToken: string,
  chatId: number,
  messageId: number,
  text: string,
  opts?: { parseMode?: "Markdown" | "HTML" },
): Promise<void> {
  const payload: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text };
  if (opts?.parseMode) payload.parse_mode = opts.parseMode;
  const res = await apiCall(botToken, "editMessageText", payload);
  if (!res.ok) {
    const err = await res.text();
    console.warn("[telegram-api] editMessageText failed", { chatId, messageId, status: res.status, error: err.slice(0, 200) });
  }
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean,
): Promise<void> {
  const payload: Record<string, unknown> = { callback_query_id: callbackQueryId };
  if (text) payload.text = text;
  if (showAlert !== undefined) payload.show_alert = showAlert;
  const res = await apiCall(botToken, "answerCallbackQuery", payload);
  if (!res.ok) {
    const err = await res.text();
    console.warn("[telegram-api] answerCallbackQuery failed", { status: res.status, error: err.slice(0, 200) });
  }
}

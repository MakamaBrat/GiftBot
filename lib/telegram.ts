const BOT_TOKEN = process.env.BOT_TOKEN as string;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, data);
  }
  return data;
}

export type InlineKeyboard = { text: string; callback_data: string }[][];

export function sendMessage(
  chatId: number | string,
  text: string,
  keyboard?: InlineKeyboard
) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

export function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard
) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

export function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
) {
  return call("answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    error_message: errorMessage,
  });
}

// Инвойс в Telegram Stars (валюта XTR, provider_token не нужен)
export function sendStarsInvoice(
  chatId: number | string,
  opts: {
    title: string;
    description: string;
    payload: string;
    amountStars: number;
  }
) {
  return call("sendInvoice", {
    chat_id: chatId,
    title: opts.title,
    description: opts.description,
    payload: opts.payload,
    currency: "XTR",
    prices: [{ label: opts.title, amount: opts.amountStars }],
    provider_token: "", // для Stars provider_token всегда пустой
  });
}

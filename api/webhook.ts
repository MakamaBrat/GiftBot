import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase.js";
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  answerPreCheckoutQuery,
  sendStarsInvoice,
  InlineKeyboard,
} from "../lib/telegram.js";
import { detectLang, t, Lang } from "../lib/i18n.js";

import crypto from "node:crypto";

function generateGiftCode(): string {
  // тот же формат, что был в дефолте таблицы (12 hex-символов, uppercase),
  // но теперь с явным префиксом gift_ прямо в значении, которое пишем в БД
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `gift_${random}`;
}

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAdmin(id: number) {
  return ADMIN_IDS.includes(String(id));
}

function mainMenu(lang: Lang, isAdminUser: boolean): InlineKeyboard {
  const s = t(lang);
  const rows: InlineKeyboard = [
    [{ text: s.menu_create, callback_data: "create_gift" }],
    [{ text: s.menu_my_gifts, callback_data: "my_gifts" }],
  ];
  if (isAdminUser) {
    rows.push([{ text: s.menu_stats, callback_data: "admin_stats" }]);
  }
  return rows;
}

async function getOrCreateCabinet(
  tgId: number,
  username: string,
  firstName: string,
  langCode: string
) {
  // upsert избегает гонки, когда два апдейта от одного пользователя
  // прилетают почти одновременно (иначе второй insert падает на дубликате)
  const { data, error } = await supabase
    .from("cabinets")
    .upsert(
      { telegram_id: tgId, username, first_name: firstName, lang_code: langCode },
      { onConflict: "telegram_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("getOrCreateCabinet upsert error:", error);
    return null;
  }
  return data;
}

async function setState(tgId: number, state: Record<string, unknown>) {
  await supabase.from("cabinets").update({ state }).eq("telegram_id", tgId);
}

async function getPremiumPrice(): Promise<number> {
  const { data } = await supabase
    .from("prices")
    .select("price")
    .eq("key", "premium")
    .maybeSingle();
  return data?.price ?? 50;
}

function statusLabel(
  lang: Lang,
  g: { used_count: number; max_activations: number }
) {
  const s = t(lang);
  return g.used_count >= g.max_activations ? s.gift_redeemed : s.gift_active;
}

async function sendMyGifts(chatId: number, tgId: number, lang: Lang) {
  const s = t(lang);
  const botUsername = process.env.BOT_USERNAME;
  const { data: gifts } = await supabase
    .from("gifts")
    .select("code, message, max_activations, used_count, last_redeemed_at, created_at")
    .eq("owner_id", tgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!gifts || gifts.length === 0) {
    await sendMessage(chatId, s.no_gifts, mainMenu(lang, isAdmin(tgId)));
    return;
  }

  let text = s.your_gifts_header(gifts.length);
  for (const g of gifts) {
    const link = botUsername
      ? `https://t.me/${botUsername}?start=${g.code}`
      : g.code;
    text += `<code>${link}</code> — ${statusLabel(lang, g)}\n`;
    text += `«${g.message}»\n`;
    if (g.last_redeemed_at) text += s.redeemed_at(g.last_redeemed_at);
    text += "\n";
  }
  await sendMessage(chatId, text, mainMenu(lang, isAdmin(tgId)));
}

async function sendAdminStats(chatId: number, lang: Lang) {
  const s = t(lang);
  const { count: cabinetsCount } = await supabase
    .from("cabinets")
    .select("*", { count: "exact", head: true });

  const { data: gifts } = await supabase
    .from("gifts")
    .select("used_count, price_paid");

  const totalGifts = gifts?.length ?? 0;
  const totalRedeemed = gifts?.reduce((sum, g) => sum + (g.used_count > 0 ? 1 : 0), 0) ?? 0;
  const totalRevenue = gifts?.reduce((sum, g) => sum + (g.price_paid || 0), 0) ?? 0;

  const text =
    s.stats_header +
    s.stats_users(cabinetsCount ?? 0) +
    s.stats_gifts(totalGifts) +
    s.stats_redeemed(totalRedeemed) +
    s.stats_revenue(totalRevenue);

  await sendMessage(chatId, text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(200).send("gift-bot webhook is running");
    return;
  }

  const update = req.body;

  try {
    if (update.pre_checkout_query) {
      const pcq = update.pre_checkout_query;
      await answerPreCheckoutQuery(pcq.id, true);
      res.status(200).end();
      return;
    }

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const tgId = msg.from.id;
      const username = msg.from.username || "";
      const firstName = msg.from.first_name || "";
      const lang = detectLang(msg.from.language_code);
      const s = t(lang);

      const cabinet = await getOrCreateCabinet(tgId, username, firstName, msg.from.language_code || "");

      if (msg.successful_payment) {
        const state = cabinet?.state || {};
        const giftMessage: string = state.pendingMessage || s.default_gift_message;
        const price: number = msg.successful_payment.total_amount;

        const { data: gift, error } = await supabase
          .from("gifts")
          .insert({
            code: generateGiftCode(),
            grant_premium: true,
            message: giftMessage,
            owner_id: tgId,
            price_paid: price,
            max_activations: 1,
          })
          .select()
          .single();

        await setState(tgId, {});

        if (error || !gift) {
          await sendMessage(chatId, s.payment_error);
        } else {
          const botUsername = process.env.BOT_USERNAME;
          const link = botUsername
            ? `https://t.me/${botUsername}?start=${gift.code}`
            : gift.code;
          await sendMessage(chatId, s.gift_created(link), mainMenu(lang, isAdmin(tgId)));
        }
        res.status(200).end();
        return;
      }

      const text: string = msg.text || "";

      if (text === "/start") {
        await setState(tgId, {});
        await sendMessage(chatId, s.greeting(firstName), mainMenu(lang, isAdmin(tgId)));
        res.status(200).end();
        return;
      }

      const state = cabinet?.state || {};
      if (state.action === "awaiting_gift_message") {
        const giftMessage = text === "-" ? s.default_gift_message : text;
        const price = await getPremiumPrice();

        await setState(tgId, { pendingMessage: giftMessage });

        await sendStarsInvoice(chatId, {
          title: s.invoice_title,
          description: s.invoice_description(giftMessage),
          payload: `gift_purchase_${tgId}_${Date.now()}`,
          amountStars: price,
        });

        res.status(200).end();
        return;
      }

      await sendMessage(chatId, s.choose_action, mainMenu(lang, isAdmin(tgId)));
      res.status(200).end();
      return;
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const tgId = cq.from.id;
      const username = cq.from.username || "";
      const firstName = cq.from.first_name || "";
      const lang = detectLang(cq.from.language_code);
      const s = t(lang);
      const data = cq.data;

      await getOrCreateCabinet(tgId, username, firstName, cq.from.language_code || "");
      await answerCallbackQuery(cq.id);

      if (data === "create_gift") {
        const price = await getPremiumPrice();
        await setState(tgId, { action: "awaiting_gift_message" });
        await editMessageText(chatId, messageId, s.ask_gift_text(price));
        res.status(200).end();
        return;
      }

      if (data === "my_gifts") {
        await sendMyGifts(chatId, tgId, lang);
        res.status(200).end();
        return;
      }

      if (data === "admin_stats" && isAdmin(tgId)) {
        await sendAdminStats(chatId, lang);
        res.status(200).end();
        return;
      }

      res.status(200).end();
      return;
    }

    res.status(200).end();
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).end();
  }
}

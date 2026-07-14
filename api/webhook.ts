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
  return `gift${random}`;
}

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Короткое имя Mini App/игры в BotFather (t.me/<bot>/<name>?startapp=...)
const MINI_APP_NAME = process.env.BOT_MINI_APP_NAME || "Game";

function isAdmin(id: number) {
  return ADMIN_IDS.includes(String(id));
}

// --- Реферальная программа ---
// Сколько звёзд начисляется за каждого приглашённого, купившего Premium
const REFERRAL_REWARD_STARS = 50;
// Минимум приглашённых, чтобы можно было подать заявку на выплату
const REFERRAL_PAYOUT_THRESHOLD = 100;

function mainMenu(lang: Lang, isAdminUser: boolean): InlineKeyboard {
  const s = t(lang);
  const rows: InlineKeyboard = [
    [{ text: s.menu_create, callback_data: "create_gift" }],
    [{ text: s.menu_my_gifts, callback_data: "my_gifts" }],
    [{ text: s.menu_referral, callback_data: "referral_menu" }],
  ];
  if (isAdminUser) {
    rows.push([{ text: s.menu_stats, callback_data: "admin_stats" }]);
    rows.push([{ text: s.menu_referral_requests, callback_data: "admin_referral_requests" }]);
  }
  return rows;
}

function backRow(lang: Lang): InlineKeyboard {
  const s = t(lang);
  return [[{ text: s.btn_back, callback_data: "back_to_menu" }]];
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
    await sendMessage(chatId, s.no_gifts, [
      ...backRow(lang),
      ...mainMenu(lang, isAdmin(tgId)),
    ]);
    return;
  }

  let text = s.your_gifts_header(gifts.length);
  for (const g of gifts) {
    const link = botUsername
      ? `https://t.me/${botUsername}/${MINI_APP_NAME}?startapp=${g.code}`
      : g.code;
    text += `<code>${link}</code> — ${statusLabel(lang, g)}\n`;
    text += `«${g.message}»\n`;
    if (g.last_redeemed_at) text += s.redeemed_at(g.last_redeemed_at);
    text += "\n";
  }
  await sendMessage(chatId, text, [...backRow(lang), ...mainMenu(lang, isAdmin(tgId))]);
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

  await sendMessage(chatId, text, backRow(lang));
}

async function getReferralStats(tgId: number): Promise<{ referred: number; premium: number }> {
  // referred_by в таблице players хранит telegram_id пригласившего (как текст)
  const { data } = await supabase
    .from("players")
    .select("is_premium")
    .eq("referred_by", String(tgId));

  const referred = data?.length ?? 0;
  const premium = data?.filter((p) => p.is_premium).length ?? 0;
  return { referred, premium };
}

function referralLink(tgId: number, lang: Lang): string {
  const botUsername = process.env.BOT_USERNAME;
  const startParam = `${tgId}_${lang}`;
  return botUsername
    ? `https://t.me/${botUsername}/${MINI_APP_NAME}?startapp=${startParam}`
    : startParam;
}

async function getPendingReferralRequest(tgId: number) {
  const { data } = await supabase
    .from("referral_payout_requests")
    .select("id")
    .eq("telegram_id", String(tgId))
    .eq("status", "pending")
    .maybeSingle();
  return data;
}

async function sendReferralMenu(
  chatId: number,
  tgId: number,
  username: string,
  lang: Lang
) {
  const s = t(lang);

  if (!username) {
    await sendMessage(chatId, s.referral_username_missing, [
      ...backRow(lang),
      ...mainMenu(lang, isAdmin(tgId)),
    ]);
    return;
  }

  const { referred, premium } = await getReferralStats(tgId);
  const stars = premium * REFERRAL_REWARD_STARS;

  let text = s.referral_header;
  text += s.referral_link_label(referralLink(tgId, lang));
  text += s.referral_stats(referred, premium, stars);

  const rows: InlineKeyboard = [];

  if (referred >= REFERRAL_PAYOUT_THRESHOLD) {
    const pending = await getPendingReferralRequest(tgId);
    if (pending) {
      text += s.referral_pending_notice;
    } else {
      text += s.referral_ready;
      rows.push([{ text: s.referral_apply_button, callback_data: "referral_apply" }]);
    }
  } else {
    text += s.referral_progress(REFERRAL_PAYOUT_THRESHOLD - referred);
  }

  text += "\n" + s.referral_disclaimer;

  rows.push(...backRow(lang));
  rows.push(...mainMenu(lang, isAdmin(tgId)));

  await sendMessage(chatId, text, rows);
}

async function notifyAdminsAboutRequest(
  requestId: number,
  tgId: number,
  username: string,
  referred: number,
  premium: number,
  stars: number,
  createdAt: string
) {
  for (const adminId of ADMIN_IDS) {
    const adminLang: Lang = "uk";
    const s = t(adminLang);
    const text = s.admin_referral_request_item(
      username,
      String(tgId),
      referred,
      premium,
      stars,
      createdAt
    );
    await sendMessage(adminId, text, [
      [
        { text: s.btn_approve, callback_data: `referral_approve_${requestId}` },
        { text: s.btn_reject, callback_data: `referral_reject_${requestId}` },
      ],
    ]);
  }
}

async function handleReferralApply(chatId: number, tgId: number, username: string, lang: Lang) {
  const s = t(lang);
  const { referred, premium } = await getReferralStats(tgId);

  if (referred < REFERRAL_PAYOUT_THRESHOLD) {
    await sendMessage(chatId, s.referral_apply_not_eligible, backRow(lang));
    return;
  }

  const existing = await getPendingReferralRequest(tgId);
  if (existing) {
    await sendMessage(chatId, s.referral_apply_already_pending, backRow(lang));
    return;
  }

  const stars = premium * REFERRAL_REWARD_STARS;

  const { data: request, error } = await supabase
    .from("referral_payout_requests")
    .insert({
      telegram_id: String(tgId),
      username,
      lang,
      referred_count: referred,
      premium_count: premium,
      stars_amount: stars,
      status: "pending",
    })
    .select()
    .single();

  if (error || !request) {
    console.error("referral request insert error:", error);
    await sendMessage(chatId, s.referral_apply_error, backRow(lang));
    return;
  }

  await sendMessage(
    chatId,
    s.referral_apply_success(stars),
    [...backRow(lang), ...mainMenu(lang, isAdmin(tgId))]
  );

  await notifyAdminsAboutRequest(
    request.id,
    tgId,
    username,
    referred,
    premium,
    stars,
    new Date(request.created_at).toLocaleString("uk-UA")
  );
}

async function sendAdminReferralRequests(chatId: number, lang: Lang) {
  const s = t(lang);
  const { data: requests } = await supabase
    .from("referral_payout_requests")
    .select("id, telegram_id, username, referred_count, premium_count, stars_amount, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(15);

  if (!requests || requests.length === 0) {
    await sendMessage(chatId, s.admin_referral_no_requests, backRow(lang));
    return;
  }

  await sendMessage(chatId, s.admin_referral_requests_header, undefined);

  for (const r of requests) {
    const text = s.admin_referral_request_item(
      r.username,
      r.telegram_id,
      r.referred_count,
      r.premium_count,
      r.stars_amount,
      new Date(r.created_at).toLocaleString("uk-UA")
    );
    await sendMessage(chatId, text, [
      [
        { text: s.btn_approve, callback_data: `referral_approve_${r.id}` },
        { text: s.btn_reject, callback_data: `referral_reject_${r.id}` },
      ],
    ]);
  }

  await sendMessage(chatId, s.choose_action, backRow(lang));
}

async function handleReferralDecision(
  chatId: number,
  requestId: number,
  approve: boolean,
  adminLang: Lang
) {
  const adminS = t(adminLang);

  const { data: request } = await supabase
    .from("referral_payout_requests")
    .select("id, telegram_id, stars_amount, status, lang")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    await sendMessage(chatId, adminS.referral_apply_error, backRow(adminLang));
    return;
  }

  if (request.status !== "pending") {
    // уже обработана другим админом — просто сообщаем
    await sendMessage(
      chatId,
      approve ? adminS.referral_request_marked_approved : adminS.referral_request_marked_rejected,
      backRow(adminLang)
    );
    return;
  }

  await supabase
    .from("referral_payout_requests")
    .update({
      status: approve ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await sendMessage(
    chatId,
    approve ? adminS.referral_request_marked_approved : adminS.referral_request_marked_rejected,
    backRow(adminLang)
  );

  // Уведомляем заявителя на языке, который был сохранён в момент подачи заявки
  const userLang: Lang = detectLang(request.lang);
  const userS = t(userLang);
  const applicantId = Number(request.telegram_id);
  if (applicantId) {
    await sendMessage(
      applicantId,
      approve
        ? userS.referral_approved_notify(request.stars_amount)
        : userS.referral_rejected_notify
    );
  }
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
            ? `https://t.me/${botUsername}/${MINI_APP_NAME}?startapp=${gift.code}`
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

      if (data === "back_to_menu") {
        await setState(tgId, {});
        await editMessageText(
          chatId,
          messageId,
          s.choose_action,
          mainMenu(lang, isAdmin(tgId))
        );
        res.status(200).end();
        return;
      }

      if (data === "create_gift") {
        const price = await getPremiumPrice();
        await setState(tgId, { action: "awaiting_gift_message" });
        await editMessageText(chatId, messageId, s.ask_gift_text(price), backRow(lang));
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

      if (data === "referral_menu") {
        await sendReferralMenu(chatId, tgId, username, lang);
        res.status(200).end();
        return;
      }

      if (data === "referral_apply") {
        await handleReferralApply(chatId, tgId, username, lang);
        res.status(200).end();
        return;
      }

      if (data === "admin_referral_requests" && isAdmin(tgId)) {
        await sendAdminReferralRequests(chatId, lang);
        res.status(200).end();
        return;
      }

      if (data.startsWith("referral_approve_") && isAdmin(tgId)) {
        const requestId = Number(data.replace("referral_approve_", ""));
        if (requestId) await handleReferralDecision(chatId, requestId, true, lang);
        res.status(200).end();
        return;
      }

      if (data.startsWith("referral_reject_") && isAdmin(tgId)) {
        const requestId = Number(data.replace("referral_reject_", ""));
        if (requestId) await handleReferralDecision(chatId, requestId, false, lang);
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

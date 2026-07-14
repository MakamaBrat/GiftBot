export type Lang = "ru" | "uk" | "en";

const SUPPORTED: Lang[] = ["ru", "uk", "en"];

// Telegram присылает language_code вида "ru", "uk", "en", "en-US" и т.п.
export function detectLang(code?: string | null): Lang {
  if (!code) return "en";
  const short = code.toLowerCase().split("-")[0];
  if ((SUPPORTED as string[]).includes(short)) return short as Lang;
  if (["be"].includes(short)) return "ru";
  return "en";
}

type Dict = {
  greeting: (name: string) => string;
  menu_create: string;
  menu_my_gifts: string;
  menu_stats: string;
  choose_action: string;
  ask_gift_text: (price: number) => string;
  invoice_title: string;
  invoice_description: (msg: string) => string;
  payment_error: string;
  gift_created: (link: string) => string;
  no_gifts: string;
  your_gifts_header: (count: number) => string;
  gift_active: string;
  gift_redeemed: string;
  redeemed_at: (date: string) => string;
  default_gift_message: string;
  stats_header: string;
  stats_users: (n: number) => string;
  stats_gifts: (n: number) => string;
  stats_redeemed: (n: number) => string;
  stats_revenue: (n: number) => string;
  btn_back: string;

  // Реферальная программа
  menu_referral: string;
  menu_referral_requests: string;
  referral_header: string;
  referral_link_label: (link: string) => string;
  referral_stats: (referred: number, premium: number, stars: number) => string;
  referral_progress: (need: number) => string;
  referral_ready: string;
  referral_apply_button: string;
  referral_pending_notice: string;
  referral_disclaimer: string;
  referral_apply_success: (stars: number) => string;
  referral_apply_already_pending: string;
  referral_apply_not_eligible: string;
  referral_apply_error: string;
  referral_approved_notify: (stars: number) => string;
  referral_rejected_notify: string;
  referral_username_missing: string;
  admin_referral_requests_header: string;
  admin_referral_no_requests: string;
  admin_referral_request_item: (
    username: string,
    tgId: string,
    referred: number,
    premium: number,
    stars: number,
    date: string
  ) => string;
  btn_approve: string;
  btn_reject: string;
  referral_request_marked_approved: string;
  referral_request_marked_rejected: string;
};

const dictionaries: Record<Lang, Dict> = {
  ru: {
    greeting: (name) =>
      `Привет, ${name}! 👋\nЗдесь можно создать подарочную ссылку с премиумом и посмотреть свои ссылки.`,
    menu_create: "🎁 Создать подарочную ссылку",
    menu_my_gifts: "📋 Мои ссылки",
    menu_stats: "📊 Статистика",
    choose_action: "Выберите действие:",
    ask_gift_text: (price) =>
      `Введите текст поздравления для получателя (или отправьте "-" для текста по умолчанию).\n\nЦена: ${price} ⭐`,
    invoice_title: "Подарочная ссылка · Premium",
    invoice_description: (msg) => `Текст поздравления: «${msg}»`,
    payment_error:
      "Оплата прошла, но при создании ссылки произошла ошибка. Напишите в поддержку.",
    gift_created: (link) =>
      `🎉 Оплата получена! Ваша подарочная ссылка готова:\n\n<code>${link}</code>\n\nОтправьте её тому, кому дарите.`,
    no_gifts: "У вас пока нет созданных ссылок.",
    your_gifts_header: (count) => `<b>Ваши подарочные ссылки (последние ${count}):</b>\n\n`,
    gift_active: "🟢 активна",
    gift_redeemed: "✅ активирована",
    redeemed_at: (date) => `Активирована: ${date}\n`,
    default_gift_message: "Поздравляем! Лови премиум 🔮",
    stats_header: "<b>📊 Статистика</b>\n\n",
    stats_users: (n) => `Пользователей: ${n}\n`,
    stats_gifts: (n) => `Создано ссылок: ${n}\n`,
    stats_redeemed: (n) => `Активировано: ${n}\n`,
    stats_revenue: (n) => `Выручка: ${n} ⭐`,
    btn_back: "⬅️ Назад",

    menu_referral: "👥 Реферальная программа",
    menu_referral_requests: "📮 Заявки на выплату",
    referral_header: "<b>👥 Реферальная программа</b>\n\n",
    referral_link_label: (link) =>
      `Ваша реферальная ссылка:\n<code>${link}</code>\n\n`,
    referral_stats: (referred, premium, stars) =>
      `Приглашено пользователей: <b>${referred}</b>\n` +
      `Из них купили Premium: <b>${premium}</b>\n` +
      `Начислено звёзд: <b>${stars}</b> ⭐\n\n`,
    referral_progress: (need) =>
      `Чтобы подать заявку на выплату, нужно пригласить от 100 человек. Осталось: ${need}.\n`,
    referral_ready: "Вы набрали 100+ приглашённых — можно подать заявку на выплату!\n",
    referral_apply_button: "📨 Подать заявку на выплату",
    referral_pending_notice: "У вас уже есть заявка на рассмотрении. Ожидайте решения.\n",
    referral_disclaimer:
      "⚠️ <b>Внимание:</b> проверяются все пользователи и способы получения Premium. " +
      "Если Premium получен по конкурсу (не куплен) — он <b>не засчитывается</b> для выплаты.\n" +
      "Рассмотрение заявки занимает до 48 часов.",
    referral_apply_success: (stars) =>
      `✅ Заявка отправлена! Ожидаемая сумма: ${stars} ⭐. Рассмотрение — до 48 часов, мы напишем о результате.`,
    referral_apply_already_pending: "У вас уже есть заявка на рассмотрении.",
    referral_apply_not_eligible: "Для подачи заявки нужно пригласить от 100 человек.",
    referral_apply_error: "Не удалось отправить заявку. Попробуйте позже.",
    referral_approved_notify: (stars) =>
      `🎉 Ваша заявка на выплату одобрена! Сумма: ${stars} ⭐. Свяжитесь с поддержкой для получения.`,
    referral_rejected_notify:
      "❌ Ваша заявка на выплату отклонена. Это может быть связано с тем, что часть Premium у приглашённых получена не за покупку (например, по конкурсу). По вопросам — обратитесь в поддержку.",
    referral_username_missing:
      "Чтобы участвовать в реферальной программе, установите @username в настройках Telegram — без него реферальная ссылка не работает.",
    admin_referral_requests_header: "<b>📮 Заявки на выплату (в ожидании)</b>",
    admin_referral_no_requests: "Заявок на рассмотрении нет.",
    admin_referral_request_item: (username, tgId, referred, premium, stars, date) =>
      `<b>Заявка</b>\n` +
      `Пользователь: @${username || "—"} (<code>${tgId}</code>)\n` +
      `Приглашено: ${referred}, купили Premium: ${premium}\n` +
      `К выплате: <b>${stars}</b> ⭐\n` +
      `Подана: ${date}`,
    btn_approve: "✅ Одобрить",
    btn_reject: "❌ Отклонить",
    referral_request_marked_approved: "✅ Заявка одобрена, пользователь уведомлён.",
    referral_request_marked_rejected: "❌ Заявка отклонена, пользователь уведомлён.",
  },
  uk: {
    greeting: (name) =>
      `Привіт, ${name}! 👋\nТут можна створити подарункове посилання з преміумом і переглянути свої посилання.`,
    menu_create: "🎁 Створити подарункове посилання",
    menu_my_gifts: "📋 Мої посилання",
    menu_stats: "📊 Статистика",
    choose_action: "Оберіть дію:",
    ask_gift_text: (price) =>
      `Введіть текст привітання для отримувача (або надішліть "-" для тексту за замовчуванням).\n\nЦіна: ${price} ⭐`,
    invoice_title: "Подарункове посилання · Premium",
    invoice_description: (msg) => `Текст привітання: «${msg}»`,
    payment_error:
      "Оплата пройшла, але під час створення посилання сталася помилка. Напишіть у підтримку.",
    gift_created: (link) =>
      `🎉 Оплату отримано! Ваше подарункове посилання готове:\n\n<code>${link}</code>\n\nНадішліть його тому, кому даруєте.`,
    no_gifts: "У вас поки немає створених посилань.",
    your_gifts_header: (count) => `<b>Ваші подарункові посилання (останні ${count}):</b>\n\n`,
    gift_active: "🟢 активне",
    gift_redeemed: "✅ активоване",
    redeemed_at: (date) => `Активовано: ${date}\n`,
    default_gift_message: "Вітаємо! Лови преміум 🔮",
    stats_header: "<b>📊 Статистика</b>\n\n",
    stats_users: (n) => `Користувачів: ${n}\n`,
    stats_gifts: (n) => `Створено посилань: ${n}\n`,
    stats_redeemed: (n) => `Активовано: ${n}\n`,
    stats_revenue: (n) => `Виручка: ${n} ⭐`,
    btn_back: "⬅️ Назад",

    menu_referral: "👥 Реферальна програма",
    menu_referral_requests: "📮 Заявки на виплату",
    referral_header: "<b>👥 Реферальна програма</b>\n\n",
    referral_link_label: (link) =>
      `Ваше реферальне посилання:\n<code>${link}</code>\n\n`,
    referral_stats: (referred, premium, stars) =>
      `Запрошено користувачів: <b>${referred}</b>\n` +
      `З них купили Premium: <b>${premium}</b>\n` +
      `Нараховано зірок: <b>${stars}</b> ⭐\n\n`,
    referral_progress: (need) =>
      `Щоб подати заявку на виплату, потрібно запросити від 100 людей. Залишилось: ${need}.\n`,
    referral_ready: "Ви набрали 100+ запрошених — можна подати заявку на виплату!\n",
    referral_apply_button: "📨 Подати заявку на виплату",
    referral_pending_notice: "У вас уже є заявка на розгляді. Очікуйте рішення.\n",
    referral_disclaimer:
      "⚠️ <b>Увага:</b> перевірятимуться усі юзери та шляхи отримання Premium. " +
      "Якщо Premium отримано з конкурсу (не куплений) — він <b>не рахується</b> для виплати.\n" +
      "Розгляд заявки триває до 48 годин.",
    referral_apply_success: (stars) =>
      `✅ Заявку надіслано! Очікувана сума: ${stars} ⭐. Розгляд — до 48 годин, ми напишемо про результат.`,
    referral_apply_already_pending: "У вас уже є заявка на розгляді.",
    referral_apply_not_eligible: "Для подачі заявки потрібно запросити від 100 людей.",
    referral_apply_error: "Не вдалося надіслати заявку. Спробуйте пізніше.",
    referral_approved_notify: (stars) =>
      `🎉 Вашу заявку на виплату схвалено! Сума: ${stars} ⭐. Зв'яжіться з підтримкою для отримання.`,
    referral_rejected_notify:
      "❌ Вашу заявку на виплату відхилено. Це може бути пов'язано з тим, що частина Premium у запрошених отримана не за покупку (наприклад, за конкурс). З питань — звертайтесь у підтримку.",
    referral_username_missing:
      "Щоб брати участь у реферальній програмі, встановіть @username у налаштуваннях Telegram — без нього реферальне посилання не працює.",
    admin_referral_requests_header: "<b>📮 Заявки на виплату (в очікуванні)</b>",
    admin_referral_no_requests: "Заявок на розгляді немає.",
    admin_referral_request_item: (username, tgId, referred, premium, stars, date) =>
      `<b>Заявка</b>\n` +
      `Користувач: @${username || "—"} (<code>${tgId}</code>)\n` +
      `Запрошено: ${referred}, купили Premium: ${premium}\n` +
      `До виплати: <b>${stars}</b> ⭐\n` +
      `Подана: ${date}`,
    btn_approve: "✅ Схвалити",
    btn_reject: "❌ Відхилити",
    referral_request_marked_approved: "✅ Заявку схвалено, користувача повідомлено.",
    referral_request_marked_rejected: "❌ Заявку відхилено, користувача повідомлено.",
  },
  en: {
    greeting: (name) =>
      `Hi, ${name}! 👋\nHere you can create a gift link with premium and check your existing links.`,
    menu_create: "🎁 Create a gift link",
    menu_my_gifts: "📋 My links",
    menu_stats: "📊 Stats",
    choose_action: "Choose an action:",
    ask_gift_text: (price) =>
      `Enter a greeting text for the recipient (or send "-" for the default text).\n\nPrice: ${price} ⭐`,
    invoice_title: "Gift link · Premium",
    invoice_description: (msg) => `Greeting text: "${msg}"`,
    payment_error:
      "Payment succeeded, but something went wrong while creating the link. Please contact support.",
    gift_created: (link) =>
      `🎉 Payment received! Your gift link is ready:\n\n<code>${link}</code>\n\nSend it to the person you're gifting it to.`,
    no_gifts: "You don't have any created links yet.",
    your_gifts_header: (count) => `<b>Your gift links (last ${count}):</b>\n\n`,
    gift_active: "🟢 active",
    gift_redeemed: "✅ redeemed",
    redeemed_at: (date) => `Redeemed: ${date}\n`,
    default_gift_message: "Congrats! Enjoy your premium 🔮",
    stats_header: "<b>📊 Stats</b>\n\n",
    stats_users: (n) => `Users: ${n}\n`,
    stats_gifts: (n) => `Links created: ${n}\n`,
    stats_redeemed: (n) => `Redeemed: ${n}\n`,
    stats_revenue: (n) => `Revenue: ${n} ⭐`,
    btn_back: "⬅️ Back",

    menu_referral: "👥 Referral program",
    menu_referral_requests: "📮 Payout requests",
    referral_header: "<b>👥 Referral program</b>\n\n",
    referral_link_label: (link) =>
      `Your referral link:\n<code>${link}</code>\n\n`,
    referral_stats: (referred, premium, stars) =>
      `Invited users: <b>${referred}</b>\n` +
      `Of them bought Premium: <b>${premium}</b>\n` +
      `Stars earned: <b>${stars}</b> ⭐\n\n`,
    referral_progress: (need) =>
      `You need to invite 100+ people to apply for a payout. Remaining: ${need}.\n`,
    referral_ready: "You've reached 100+ invited users — you can apply for a payout!\n",
    referral_apply_button: "📨 Apply for payout",
    referral_pending_notice: "You already have a request under review. Please wait.\n",
    referral_disclaimer:
      "⚠️ <b>Note:</b> all users and the ways Premium was obtained will be checked. " +
      "If a referred user's Premium came from a giveaway/contest (not purchased), it <b>does not count</b> toward the payout.\n" +
      "Review takes up to 48 hours.",
    referral_apply_success: (stars) =>
      `✅ Request sent! Expected amount: ${stars} ⭐. Review takes up to 48 hours, we'll message you with the result.`,
    referral_apply_already_pending: "You already have a request under review.",
    referral_apply_not_eligible: "You need to invite 100+ people to apply.",
    referral_apply_error: "Couldn't send the request. Please try again later.",
    referral_approved_notify: (stars) =>
      `🎉 Your payout request was approved! Amount: ${stars} ⭐. Contact support to receive it.`,
    referral_rejected_notify:
      "❌ Your payout request was rejected. This may be because some of your referrals' Premium wasn't purchased (e.g., came from a giveaway). Contact support with any questions.",
    referral_username_missing:
      "To take part in the referral program, set a @username in your Telegram settings — the referral link won't work without one.",
    admin_referral_requests_header: "<b>📮 Pending payout requests</b>",
    admin_referral_no_requests: "No requests pending review.",
    admin_referral_request_item: (username, tgId, referred, premium, stars, date) =>
      `<b>Request</b>\n` +
      `User: @${username || "—"} (<code>${tgId}</code>)\n` +
      `Invited: ${referred}, bought Premium: ${premium}\n` +
      `Payout: <b>${stars}</b> ⭐\n` +
      `Submitted: ${date}`,
    btn_approve: "✅ Approve",
    btn_reject: "❌ Reject",
    referral_request_marked_approved: "✅ Request approved, user notified.",
    referral_request_marked_rejected: "❌ Request rejected, user notified.",
  },
};

export function t(lang: Lang): Dict {
  return dictionaries[lang];
}

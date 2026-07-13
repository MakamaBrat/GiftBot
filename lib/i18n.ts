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
  },
};

export function t(lang: Lang): Dict {
  return dictionaries[lang];
}

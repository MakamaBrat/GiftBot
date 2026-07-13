# Gift Bot (Vercel + Supabase + Telegram Stars)

Телеграм-бот, в котором пользователь заходит в свой "кабинет", платит Telegram Stars
по цене из таблицы `prices` (ключ `premium`) и получает свою подарочную ссылку
(запись в таблице `gifts`) с собственным текстом поздравления. Также можно
посмотреть список своих ссылок и их статус (активирована/нет).

## 1. База данных

В Supabase SQL Editor выполните `supabase_migration.sql` — он:
- создаёт таблицу `cabinets` (пользователи бота),
- добавляет в `gifts` колонки `owner_id` (кто создал) и `price_paid` (сколько заплатил),
- добавляет цену `premium` в `prices`, если её ещё нет.

Ваши существующие таблицы `gifts` и `prices` не ломаются, только дополняются.

## 2. Переменные окружения (Vercel → Project → Settings → Environment Variables)

| Переменная | Значение |
|---|---|
| `BOT_TOKEN` | токен бота от @BotFather |
| `BOT_USERNAME` | username бота без @ (для формирования ссылки) |
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (Settings → API) — НЕ anon key |
| `ADMIN_IDS` | telegram_id админов через запятую, напр. `123456,987654` |

## 3. Деплой

```bash
npm install
vercel --prod
```

## 4. Подключить webhook

После деплоя узнайте URL проекта (например `https://gift-bot.vercel.app`) и выполните:

```bash
BOT_TOKEN=xxxx VERCEL_URL=https://gift-bot.vercel.app ./set-webhook.sh
```

Или вручную:
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://gift-bot.vercel.app/api/webhook
```

## 5. Включить платежи Stars у бота

В @BotFather убедитесь, что боту разрешены платежи (Stars работают "из коробки",
отдельный provider_token не нужен — в коде уже используется валюта `XTR`).

## Как это работает

1. `/start` — создаётся запись в `cabinets`, показывается меню:
   - 🎁 Создать подарочную ссылку
   - 📋 Мои ссылки
   - 📊 Статистика (только для ADMIN_IDS)
2. При создании ссылки бот спрашивает текст поздравления, затем выставляет
   инвойс в Stars на сумму из `prices.premium`.
3. После `successful_payment` создаётся строка в `gifts`
   (`grant_premium = true`, `message`, `owner_id`, `price_paid`), пользователю
   присылается ссылка вида `https://t.me/<bot>?start=gift_<code>`.
4. «Мои ссылки» показывает последние 20 ссылок пользователя и их статус
   (использована/активна) — статус берётся из `used_count`/`max_activations`,
   которые, как я понимаю, обновляет ваша существующая логика погашения
   подарков (redeem) — этот бот её не трогает, только создаёт ссылки.

## Важно

Логика **погашения/активации** подарочной ссылки (когда получатель переходит
по ссылке и получает премиум) в этом коде не реализована — судя по структуре
таблицы `gifts` (`redeemer_ids`, `used_count`, `grant_*`), она уже существует
у вас в другом боте/сервисе. Если такой логики ещё нет — скажите, добавлю
обработку `/start gift_<code>` с проверкой `max_activations`, добавлением
`tgId` в `redeemer_ids` и выдачей премиума.

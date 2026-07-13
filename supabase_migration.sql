-- Выполнить в Supabase SQL Editor

-- 1. Таблица кабинетов (пользователи бота)
create table if not exists public.cabinets (
  telegram_id bigint not null,
  username text not null default '',
  first_name text not null default '',
  lang_code text not null default '',
  state jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint cabinets_pkey primary key (telegram_id)
);

alter table public.cabinets
  add column if not exists lang_code text not null default '';

-- 2. Добавляем в gifts привязку к владельцу и уплаченную цену (для статистики)
alter table public.gifts
  add column if not exists owner_id bigint not null default 0;

alter table public.gifts
  add column if not exists price_paid integer not null default 0;

create index if not exists gifts_owner_id_idx on public.gifts (owner_id);

-- 3. Убедимся что в prices есть цена на premium (правьте цену как нужно)
insert into public.prices (key, price)
values ('premium', 50)
on conflict (key) do nothing;

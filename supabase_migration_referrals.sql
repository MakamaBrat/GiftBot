-- Выполнить в Supabase SQL Editor (после supabase_migration.sql)
-- Таблица заявок на выплату по реферальной программе

create table if not exists public.referral_payout_requests (
  id bigint generated always as identity primary key,
  telegram_id text not null,
  username text not null default '',
  lang text not null default 'en',
  referred_count integer not null default 0,
  premium_count integer not null default 0,
  stars_amount integer not null default 0,
  status text not null default 'pending',
  admin_comment text not null default '',
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone null,
  constraint referral_payout_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists referral_payout_requests_telegram_id_idx
  on public.referral_payout_requests (telegram_id);

create index if not exists referral_payout_requests_status_idx
  on public.referral_payout_requests (status);

-- Доступ идёт только через serverless-функцию с SUPABASE_SERVICE_ROLE_KEY
alter table public.referral_payout_requests disable row level security;

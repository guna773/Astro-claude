-- Jyotish AI — Supabase Schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────
create table if not exists users (
  id                  uuid primary key default uuid_generate_v4(),
  auth_id             uuid references auth.users(id) on delete cascade,
  name                text not null,
  email               text,
  dob                 date not null,
  tob                 time,
  place               text not null,
  lat                 double precision,
  lng                 double precision,
  gender              text check (gender in ('Male', 'Female', 'Other')),
  language            text default 'English',
  voice_persona       text default 'Guru Ji',

  -- Chart data
  lagna               text,
  rashi               text,
  nakshatra           text,
  nakshatra_pada      integer,
  mahadasha           text,
  antardasha          text,
  dasha_end_date      date,
  mangal_dosha        boolean default false,
  sade_sati           boolean default false,
  planet_positions    jsonb,
  yogas               jsonb,
  chart_summary       text,

  created_at          timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;

create policy "Users can read own data"
  on users for select
  using (auth.uid() = auth_id);

create policy "Users can insert own data"
  on users for insert
  with check (auth.uid() = auth_id);

create policy "Users can update own data"
  on users for update
  using (auth.uid() = auth_id);

-- ─── CHAT HISTORY ────────────────────────────────────────
create table if not exists chat_history (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references users(id) on delete cascade,
  question      text not null,
  response      text not null,
  language      text default 'English',
  session_date  date default current_date,
  created_at    timestamptz default now()
);

alter table chat_history enable row level security;

create policy "Users can read own chat history"
  on chat_history for select
  using (user_id in (select id from users where auth_id = auth.uid()));

create policy "Users can insert own chat history"
  on chat_history for insert
  with check (user_id in (select id from users where auth_id = auth.uid()));

-- ─── SUBSCRIPTIONS ───────────────────────────────────────
create table if not exists subscriptions (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid references users(id) on delete cascade,
  plan                      text check (plan in ('free', 'premium', 'elite')) default 'free',
  razorpay_subscription_id  text,
  razorpay_order_id         text,
  status                    text default 'active',
  start_date                date default current_date,
  end_date                  date,
  created_at                timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users can read own subscriptions"
  on subscriptions for select
  using (user_id in (select id from users where auth_id = auth.uid()));

-- ─── HOROSCOPES (daily cache) ─────────────────────────────
create table if not exists horoscopes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references users(id) on delete cascade,
  date            date not null,
  horoscope_text  text not null,
  lucky_color     text,
  lucky_number    integer,
  tip_of_day      text,
  created_at      timestamptz default now(),
  unique(user_id, date)
);

alter table horoscopes enable row level security;

create policy "Users can read own horoscopes"
  on horoscopes for select
  using (user_id in (select id from users where auth_id = auth.uid()));

-- ─── USAGE TRACKING (for free tier limits) ───────────────
create table if not exists usage_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  date        date default current_date,
  voice_count integer default 0,
  created_at  timestamptz default now(),
  unique(user_id, date)
);

alter table usage_logs enable row level security;

create policy "Users can read own usage"
  on usage_logs for select
  using (user_id in (select id from users where auth_id = auth.uid()));

-- ─── INDEXES ─────────────────────────────────────────────
create index if not exists idx_chat_history_user_id on chat_history(user_id);
create index if not exists idx_chat_history_session_date on chat_history(session_date);
create index if not exists idx_horoscopes_user_date on horoscopes(user_id, date);
create index if not exists idx_usage_logs_user_date on usage_logs(user_id, date);

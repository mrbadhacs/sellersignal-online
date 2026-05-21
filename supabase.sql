create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  stripe_customer_id text unique,
  created_at timestamptz default now()
);

alter table profiles alter column id set default gen_random_uuid();
alter table profiles alter column email set not null;

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  stripe_event_id text unique,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_url text not null,
  product_name text,
  review_count integer,
  report_json jsonb not null,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text,
  mode text,
  credits integer not null,
  amount_cents integer,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table credit_ledger enable row level security;
alter table reports enable row level security;
alter table purchases enable row level security;

create index if not exists credit_ledger_user_id_idx on credit_ledger(user_id);
create index if not exists reports_user_id_created_at_idx on reports(user_id, created_at desc);
create index if not exists purchases_user_id_idx on purchases(user_id);

-- Run this with your own email to grant founder/test credits:
-- with profile as (
--   insert into profiles (email)
--   values ('YOUR_EMAIL_HERE')
--   on conflict (email) do update set email = excluded.email
--   returning id
-- )
-- insert into credit_ledger (user_id, amount, reason)
-- select id, 10, 'manual founder test credit'
-- from profile;

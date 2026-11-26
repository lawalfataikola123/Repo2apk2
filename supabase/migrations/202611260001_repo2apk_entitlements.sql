-- Repo2APK paid-plan entitlement records.
-- Run in the Supabase SQL Editor for project zrxfvgujugfhsltlhzem.
create table if not exists public.repo2apk_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime boolean not null default false,
  active_until timestamptz,
  source text not null default 'flutterwave',
  payment_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.repo2apk_entitlements enable row level security;

revoke all on public.repo2apk_entitlements from anon, authenticated;

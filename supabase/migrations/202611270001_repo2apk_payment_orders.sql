-- Repo2APK payment orders and atomic entitlement activation.
create table if not exists public.repo2apk_payment_orders (
  id uuid primary key default gen_random_uuid(),
  tx_ref text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'lifetime')),
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  transaction_id text unique,
  verified_amount numeric(12,2),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.repo2apk_payment_orders enable row level security;
revoke all on public.repo2apk_payment_orders from anon, authenticated;

create or replace function public.repo2apk_apply_payment(
  p_tx_ref text,
  p_transaction_id text,
  p_verified_amount numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.repo2apk_payment_orders%rowtype;
  v_entitlement public.repo2apk_entitlements%rowtype;
  v_new_expiry timestamptz;
begin
  select * into v_order
  from public.repo2apk_payment_orders
  where tx_ref = p_tx_ref
  for update;

  if not found then
    raise exception 'Payment reference not found';
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('status', 'already_paid');
  end if;

  update public.repo2apk_payment_orders
  set status = 'paid',
      transaction_id = p_transaction_id,
      verified_amount = p_verified_amount,
      paid_at = now()
  where tx_ref = p_tx_ref;

  select * into v_entitlement
  from public.repo2apk_entitlements
  where user_id = v_order.user_id
  for update;

  if v_order.plan = 'lifetime' then
    insert into public.repo2apk_entitlements
      (user_id, lifetime, active_until, source, payment_reference, updated_at)
    values (v_order.user_id, true, null, 'flutterwave', p_tx_ref, now())
    on conflict (user_id) do update set
      lifetime = true,
      active_until = null,
      source = 'flutterwave',
      payment_reference = excluded.payment_reference,
      updated_at = now();
  elsif v_order.plan = 'monthly' then
    if v_entitlement.lifetime then
      insert into public.repo2apk_entitlements
        (user_id, lifetime, active_until, source, payment_reference, updated_at)
      values (v_order.user_id, true, null, 'flutterwave', p_tx_ref, now())
      on conflict (user_id) do update set
        payment_reference = excluded.payment_reference,
        updated_at = now();
    else
      v_new_expiry := greatest(coalesce(v_entitlement.active_until, now()), now()) + interval '30 days';
      insert into public.repo2apk_entitlements
        (user_id, lifetime, active_until, source, payment_reference, updated_at)
      values (v_order.user_id, false, v_new_expiry, 'flutterwave', p_tx_ref, now())
      on conflict (user_id) do update set
        lifetime = false,
        active_until = v_new_expiry,
        source = 'flutterwave',
        payment_reference = excluded.payment_reference,
        updated_at = now();
    end if;
  else
    raise exception 'Unsupported plan';
  end if;

  return jsonb_build_object('status', 'paid');
end;
$$;

revoke all on function public.repo2apk_apply_payment(text, text, numeric) from public, anon, authenticated;
grant execute on function public.repo2apk_apply_payment(text, text, numeric) to service_role;

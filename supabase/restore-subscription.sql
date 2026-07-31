-- Run in Supabase SQL Editor (after schema.sql)
-- Lets users restore an active subscription on a new device using their mobile money phone number.

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
$$;

create or replace function public.restore_subscription_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_payment record;
  v_sub record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_phone := public.normalize_phone(p_phone);
  if length(v_phone) < 9 then
    return null;
  end if;

  select p.*
  into v_payment
  from public.payments p
  where public.normalize_phone(p.phone) = v_phone
  order by p.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  select s.*
  into v_sub
  from public.subscriptions s
  where s.reference = v_payment.reference
    and s.status in ('active', 'pending')
    and (s.expires_at is null or s.expires_at > now())
  order by s.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  update public.subscriptions
  set user_id = v_user_id, updated_at = now()
  where id = v_sub.id;

  update public.payments
  set user_id = v_user_id
  where id = v_payment.id;

  return jsonb_build_object(
    'plan', v_sub.plan,
    'status', v_sub.status,
    'reference', v_sub.reference,
    'amount', v_sub.amount,
    'currency', coalesce(v_sub.currency, 'ZMW'),
    'lenco_deposit_id', v_sub.lenco_deposit_id,
    'expires_at', v_sub.expires_at,
    'created_at', v_sub.created_at
  );
end;
$$;

grant execute on function public.restore_subscription_by_phone(text) to anon, authenticated;

-- Run ALL of this in Supabase → SQL Editor for admin@admin.com

-- 1. Ensure admin-check functions exist (required by the app)
create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.profiles (id, is_admin)
  values (auth.uid(), false)
  on conflict (id) do nothing;
end;
$$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.ensure_user_profile() to authenticated;
grant execute on function public.is_current_user_admin() to authenticated;

-- 2. Grant admin to admin@admin.com
insert into public.profiles (id, is_admin)
values ('bf1376e6-0880-4072-8825-5514072e9910', true)
on conflict (id) do update set is_admin = true;

-- 3. Verify — is_admin MUST be true (not null)
select u.id, u.email, p.is_admin, p.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'admin@admin.com';

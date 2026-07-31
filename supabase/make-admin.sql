-- CallGenius: grant admin access to your Supabase user
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: Find YOUR user id (use the email you sign in with):
-- select id, email from auth.users where email = 'your-email@example.com';

-- Step 2: Grant admin for that exact id:
insert into public.profiles (id, is_admin)
values ('bf1376e6-0880-4072-8825-5514072e9910', true)
on conflict (id) do update set is_admin = true;

-- Step 3: Verify (is_admin must be true):
select u.id, u.email, p.is_admin
from auth.users u
left join public.profiles p on p.id = u.id
where u.id = 'bf1376e6-0880-4072-8825-5514072e9910';
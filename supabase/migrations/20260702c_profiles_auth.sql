-- ============================================================
-- GSIP identity & access: profiles table (user management),
-- role model (viewer / analyst / admin), RLS, and auto-provisioning.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'viewer' check (role in ('viewer','analyst','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Role lookup helper (SECURITY DEFINER) — avoids RLS recursion when policies
-- on `profiles` need to know the caller's role.
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;

-- read: your own row, or any row if you are an admin
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'admin');

-- update: admins may change any row (role/status); users may edit their own name only
create policy profiles_admin_write on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

-- Auto-create a profile whenever an auth user is created.
-- Bootstrap: the very first account, or the owner email, becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'viewer';
begin
  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  elsif new.email = 'divisi.hcm@gmail.com' then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep last_sign_in_at fresh from auth.users.
create or replace function public.handle_user_signin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set last_sign_in_at = new.last_sign_in_at, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signin on auth.users;
create trigger on_auth_user_signin
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_user_signin();

grant execute on function public.current_user_role() to anon, authenticated;

-- Backfill profiles for any users that already exist.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       case when u.email = 'divisi.hcm@gmail.com' then 'admin' else 'viewer' end
from auth.users u
on conflict (id) do nothing;

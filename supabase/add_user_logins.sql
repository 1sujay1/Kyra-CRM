-- ============================================================================
-- KYRA CRM - USER LOGINS & PROFILE DATABASE PERSISTENCE SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Create User Logins Audit Table
create table if not exists user_logins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  username text not null,
  email text not null,
  role text not null,
  ip_address text,
  user_agent text,
  status text not null default 'success', -- 'success', 'failed'
  failure_reason text,
  created_at timestamptz not null default now()
);

-- 2. Indexes for Fast Audit Retrieval
create index if not exists idx_user_logins_username on user_logins(username);
create index if not exists idx_user_logins_created_at on user_logins(created_at desc);

-- 3. Row-Level Security (RLS) Configuration
alter table user_logins enable row level security;

drop policy if exists "Allow all read user_logins" on user_logins;
create policy "Allow all read user_logins" on user_logins for select to anon, authenticated using (true);

drop policy if exists "Allow all insert user_logins" on user_logins;
create policy "Allow all insert user_logins" on user_logins for insert to anon, authenticated with check (true);

-- 4. Enable Profiles Insert and Update for anon & authenticated
drop policy if exists "Allow all insert profiles" on profiles;
create policy "Allow all insert profiles" on profiles for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update profiles" on profiles;
create policy "Allow all update profiles" on profiles for update to anon, authenticated using (true) with check (true);

-- 5. Explicit Data API Grants
grant all on table user_logins to anon, authenticated, service_role;
grant all on table profiles to anon, authenticated, service_role;

-- 6. Pre-seed Authorized Profiles
insert into profiles (org_id, username, full_name, email, role, is_active)
values 
  ('00000000-0000-0000-0000-000000000000', 'Adminkyra', 'Kyra Administrator', 'adminkyra@kyragroup.com', 'admin', true),
  ('00000000-0000-0000-0000-000000000000', 'dmkyra', 'Digital Marketing Lead', 'dmkyra@kyragroup.com', 'digital_marketing', true)
on conflict (username) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  updated_at = now();

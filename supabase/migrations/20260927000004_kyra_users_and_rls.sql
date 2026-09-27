-- ============================================================================
-- KYRA CRM - COMPLETE SETUP SCRIPT FOR SUPABASE SQL EDITOR
-- Run this script in: https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Create User Role Enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'digital_marketing', 'manager', 'sales_executive', 'channel_partner');
  else
    alter type user_role add value if not exists 'digital_marketing';
    alter type user_role add value if not exists 'admin';
  end if;
end $$;

-- 3. Create Organizations Table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default organization
insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000000', 'Kyra Group (Coimbatore Farmlands)')
on conflict (id) do update set name = excluded.name;

-- 4. Create Profiles Table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete restrict,
  username text unique,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'digital_marketing',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Create Leads Table
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  city text default 'Coimbatore',
  project_name text not null default 'Anaikatti Green Acres',
  source text not null default 'meta',
  campaign_name text,
  budget_range text default '₹35L - ₹50L',
  purpose text default 'farmhouse',
  status text not null default 'new',
  quality text not null default 'warm',
  assigned_to_name text default 'Priya Raman',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 6. Create Lead Status History Table
create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  comment text not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

-- 7. Create Activities Table
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  type text not null, -- 'call', 'whatsapp', 'meeting', 'note', 'site_visit'
  outcome text,
  notes text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- 8. Create Audit Logs Table
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

-- 9. Auto-Confirm & Create Users (Adminkyra & dmkyra with Password Kyra@1234#)
do $$
declare
  v_admin_id uuid;
  v_dm_id uuid;
begin
  -- Check or Create Adminkyra
  select id into v_admin_id from auth.users where email = 'adminkyra@kyragroup.com';
  if v_admin_id is null then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'adminkyra@kyragroup.com',
      crypt('Kyra@1234#', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Adminkyra","role":"admin"}'::jsonb,
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = crypt('Kyra@1234#', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = raw_user_meta_data || '{"username":"Adminkyra","role":"admin"}'::jsonb
    where id = v_admin_id;
  end if;

  -- Upsert Profile for Adminkyra
  insert into profiles (id, org_id, username, full_name, email, role, is_active)
  values (v_admin_id, '00000000-0000-0000-0000-000000000000', 'Adminkyra', 'Admin Kyra', 'adminkyra@kyragroup.com', 'admin', true)
  on conflict (id) do update set role = 'admin', username = 'Adminkyra', is_active = true;

  -- Check or Create dmkyra
  select id into v_dm_id from auth.users where email = 'dmkyra@kyragroup.com';
  if v_dm_id is null then
    v_dm_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_dm_id,
      'authenticated',
      'authenticated',
      'dmkyra@kyragroup.com',
      crypt('Kyra@1234#', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"dmkyra","role":"digital_marketing"}'::jsonb,
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = crypt('Kyra@1234#', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = raw_user_meta_data || '{"username":"dmkyra","role":"digital_marketing"}'::jsonb
    where id = v_dm_id;
  end if;

  -- Upsert Profile for dmkyra
  insert into profiles (id, org_id, username, full_name, email, role, is_active)
  values (v_dm_id, '00000000-0000-0000-0000-000000000000', 'dmkyra', 'Digital Marketing Kyra', 'dmkyra@kyragroup.com', 'digital_marketing', true)
  on conflict (id) do update set role = 'digital_marketing', username = 'dmkyra', is_active = true;
end $$;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
alter table leads enable row level security;
alter table activities enable row level security;
alter table lead_status_history enable row level security;
alter table audit_logs enable row level security;
alter table profiles enable row level security;

-- Function to get current user role
create or replace function get_auth_role()
returns text as $$
  select coalesce(
    (select role::text from profiles where id = auth.uid()),
    'anon'
  );
$$ language sql stable security definer;

-- Leads RLS:
-- Both Adminkyra and dmkyra can view and insert and modify leads
drop policy if exists "Authenticated users can select leads" on leads;
create policy "Authenticated users can select leads"
  on leads for select
  to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can insert leads" on leads;
create policy "Authenticated users can insert leads"
  on leads for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update leads" on leads;
create policy "Authenticated users can update leads"
  on leads for update
  to authenticated
  using (true)
  with check (true);

-- CRITICAL REQUIREMENT: Only Admin can delete leads (Soft Delete / Hard Delete)
drop policy if exists "Only admin can delete leads" on leads;
create policy "Only admin can delete leads"
  on leads for delete
  to authenticated
  using (get_auth_role() = 'admin');

-- Activities RLS:
drop policy if exists "Authenticated users can view activities" on activities;
create policy "Authenticated users can view activities"
  on activities for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert activities" on activities;
create policy "Authenticated users can insert activities"
  on activities for insert
  to authenticated
  with check (true);

-- Lead Status History RLS:
drop policy if exists "Authenticated users can view status history" on lead_status_history;
create policy "Authenticated users can view status history"
  on lead_status_history for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert status history" on lead_status_history;
create policy "Authenticated users can insert status history"
  on lead_status_history for insert
  to authenticated
  with check (true);

-- Audit Logs RLS:
drop policy if exists "Only admin can view audit logs" on audit_logs;
create policy "Only admin can view audit logs"
  on audit_logs for select
  to authenticated
  using (get_auth_role() = 'admin');

drop policy if exists "Authenticated can insert audit logs" on audit_logs;
create policy "Authenticated can insert audit logs"
  on audit_logs for insert
  to authenticated
  with check (true);

-- Grant permissions to authenticated role for REST API access
grant all on organizations to authenticated;
grant all on profiles to authenticated;
grant all on leads to authenticated;
grant all on activities to authenticated;
grant all on lead_status_history to authenticated;
grant all on audit_logs to authenticated;

-- 11. SEED CONFIDENTIAL INITIAL LEADS (Directly in Supabase DB)
insert into leads (id, full_name, phone, email, city, project_name, source, campaign_name, budget_range, purpose, status, quality, assigned_to_name)
values
  ('11111111-1111-1111-1111-111111111111', 'Karthik Subramanian', '+919842145620', 'karthik.subramanian@gmail.com', 'Coimbatore (RS Puram)', 'Anaikatti Green Acres', 'meta', 'Coimbatore_Foothills_Farmplots_Q3', '₹35L - ₹50L', 'farmhouse', 'site_visit_scheduled', 'hot', 'Priya Raman'),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Rajesh Natarajan', '+919443218765', 'dr.rajesh.n@yahoo.com', 'Tiruppur', 'Pollachi Coconut Groves', 'google', 'Search_Farmlands_Pollachi_Road', '₹50L - ₹75L', 'agriculture', 'qualified', 'hot', 'Vignesh Kumar'),
  ('33333333-3333-3333-3333-333333333333', 'Ananya Sundaram', '+919789012345', 'ananya.sundaram@techcorp.in', 'Bengaluru / Coimbatore', 'Siruvani Valley Estates', 'meta', 'Siruvani_Valley_Farmlands_Retargeting', '₹25L - ₹35L', 'investment', 'new', 'warm', 'Priya Raman'),
  ('44444444-4444-4444-4444-444444444444', 'Murugesan Palanisamy', '+919865432109', 'pmurugan1974@gmail.com', 'Pollachi', 'Pollachi Coconut Groves', 'walk_in', null, '₹75L+', 'agriculture', 'contacted', 'warm', 'Vignesh Kumar'),
  ('55555555-5555-5555-5555-555555555555', 'Vikram Chandrasekar', '+919940123456', 'vikram.c@finvest.com', 'Chennai / Coimbatore', 'Anaikatti Green Acres', 'google', 'Search_Farmland_Plots_Coimbatore', '₹40L - ₹60L', 'farmhouse', 'booked', 'hot', 'Priya Raman')
on conflict (id) do nothing;

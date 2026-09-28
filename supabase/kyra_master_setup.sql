-- ============================================================================
-- KYRA CRM - COMPLETE MASTER SETUP SCRIPT FOR SUPABASE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Organizations Table (Multi-tenant partition)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default Organization
insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000000', 'Kyra Group (Coimbatore Farmlands)')
on conflict (id) do update set name = excluded.name;

-- 3. User Roles & Profiles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'digital_marketing', 'manager', 'sales_executive', 'channel_partner');
  else
    alter type user_role add value if not exists 'digital_marketing';
    alter type user_role add value if not exists 'admin';
  end if;
end $$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  username text unique,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'digital_marketing',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Projects Master Table
create table if not exists projects (
  id text primary key default gen_random_uuid()::text,
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  name text not null,
  location text not null,
  description text,
  price_per_cent numeric(12, 2) not null default 125000 check (price_per_cent >= 0),
  total_plots integer not null default 30 check (total_plots >= 0),
  available_plots integer not null default 15 check (available_plots >= 0),
  status text not null default 'active', -- 'active', 'upcoming', 'sold_out'
  water_source text default 'Perennial Borewell + Natural Stream',
  soil_type text default 'Virgin Red Loam Soil',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Seed Initial Coimbatore Farmland Projects
insert into projects (id, org_id, name, location, description, price_per_cent, total_plots, available_plots, status, water_source, soil_type)
values
  (
    'proj-1',
    '00000000-0000-0000-0000-000000000000',
    'Anaikatti Green Acres',
    'Anaikatti Hills Road, Coimbatore',
    'Scenic hill-view organic farmland plots with mountain breeze, perennial stream boundary, and drip-irrigation infrastructure.',
    125000,
    32,
    14,
    'active',
    'Perennial Hill Stream + 2 Borewells (450 ft, 3.5" yield)',
    'Virgin Red Soil (Rich in organic loam, ideal for avocado & sandalwood)'
  ),
  (
    'proj-2',
    '00000000-0000-0000-0000-000000000000',
    'Pollachi Coconut Groves',
    'Pollachi Main Road, Kinathukadavu',
    'High-yield mature coconut farmland plots with perennial borewells, motor pumps, and wide 30ft metal road frontage.',
    145000,
    45,
    8,
    'active',
    '3 Deep Borewells + PAP Canal Connectivity',
    'Clay Loam Soil with 40-year bearing high-yield hybrid coconut palms'
  ),
  (
    'proj-3',
    '00000000-0000-0000-0000-000000000000',
    'Siruvani Valley Farmlands',
    'Siruvani Foothills, Alandurai',
    'Pure crystal Siruvani groundwater table zone ideal for wellness farmhouse estates and organic vegetable cultivation.',
    180000,
    24,
    19,
    'upcoming',
    'Natural Siruvani Aquifer (TDS < 60, zero salinity)',
    'Fertile Alluvial Soil suitable for natural farming & orchard'
  )
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  description = excluded.description,
  price_per_cent = excluded.price_per_cent,
  water_source = excluded.water_source,
  soil_type = excluded.soil_type;

-- 5. Plots Inventory Table
create table if not exists plots (
  id text primary key default gen_random_uuid()::text,
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  plot_no text not null,
  survey_no text,
  size_cents numeric(8, 2) not null default 25 check (size_cents > 0),
  size_sqft numeric(10, 2) not null default 10890 check (size_sqft > 0),
  facing text not null default 'east',
  price numeric(12, 2) not null default 0 check (price >= 0),
  status text not null default 'available', -- 'available', 'blocked', 'booked', 'sold'
  buyer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, plot_no)
);

-- Seed Plot Inventory for proj-1 (Anaikatti Green Acres)
do $$
declare
  i integer;
  p_no text;
  p_status text;
  p_buyer text;
begin
  for i in 1..32 loop
    p_no := 'Plot ' || lpad(i::text, 2, '0');
    if i in (1, 3, 5, 8, 12, 16, 20, 24, 28) then
      p_status := 'sold';
      p_buyer := 'Buyer #' || (100 + i);
    elsif i in (2, 7, 14, 22) then
      p_status := 'booked';
      p_buyer := 'Buyer #' || (200 + i);
    elsif i in (4, 11) then
      p_status := 'blocked';
      p_buyer := null;
    else
      p_status := 'available';
      p_buyer := null;
    end if;

    insert into plots (id, project_id, plot_no, size_cents, size_sqft, facing, price, status, buyer_name)
    values (
      'proj-1-plot-' || i,
      'proj-1',
      p_no,
      case when i % 3 = 0 then 50 when i % 2 = 0 then 30 else 25 end,
      case when i % 3 = 0 then 21780 when i % 2 = 0 then 13068 else 10890 end,
      case when i % 4 = 1 then 'east' when i % 4 = 2 then 'north' when i % 4 = 3 then 'north_east' else 'south' end,
      (case when i % 3 = 0 then 50 when i % 2 = 0 then 30 else 25 end) * 125000,
      p_status,
      p_buyer
    )
    on conflict (project_id, plot_no) do update set
      status = excluded.status,
      buyer_name = excluded.buyer_name;
  end loop;
end $$;

-- 6. Leads Master Table (Manual & Webhook Leads)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  alt_phone text,
  email text,
  city text default 'Coimbatore',
  project_name text not null default 'Anaikatti Green Acres',
  project_id text,
  source text not null default 'manual', -- 'meta', 'google', 'website', 'manual', 'webhook', 'referral'
  campaign_name text,
  adset_name text,
  ad_name text,
  form_id text,
  form_name text,
  external_lead_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  budget_range text default '₹35L - ₹50L',
  purpose text default 'farmhouse',
  status text not null default 'new', -- 'new', 'contacted', 'qualified', 'site_visit_scheduled', 'site_visit_completed', 'negotiation', 'booked', 'lost', 'junk'
  quality text not null default 'warm', -- 'hot', 'warm', 'cold', 'junk', 'unqualified'
  assigned_to_name text default 'Priya Raman',
  assigned_to uuid,
  consent jsonb not null default '{"consent_given": true, "timestamp": null, "terms_version": "v1.0"}'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7. Lead Status History
create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  comment text not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

-- 8. Activities Timeline
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  type text not null, -- 'call', 'whatsapp', 'email', 'meeting', 'note', 'site_visit'
  outcome text,
  notes text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- 9. Webhook Ingestion Logs Table
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  source text not null default 'webhook', -- 'meta', 'google', 'zapier', 'make', 'custom'
  payload jsonb not null,
  lead_id uuid,
  status text not null default 'processed', -- 'processed', 'error', 'duplicate'
  ip text,
  error_message text,
  created_at timestamptz not null default now()
);

-- 10. Indexes for Fast Filtering & Pipeline Lookups
create index if not exists idx_leads_org_id on leads(org_id);
create index if not exists idx_leads_status on leads(status) where deleted_at is null;
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_projects_status on projects(status) where deleted_at is null;
create index if not exists idx_plots_project_id on plots(project_id);
create index if not exists idx_plots_status on plots(status);
create index if not exists idx_webhook_logs_created on webhook_logs(created_at desc);

-- 11. Row-Level Security (RLS) Configuration
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table plots enable row level security;
alter table leads enable row level security;
alter table lead_status_history enable row level security;
alter table activities enable row level security;
alter table webhook_logs enable row level security;

-- Permissive policies for anon & authenticated roles so API queries & Server Actions succeed without permission denied errors
-- Organizations
drop policy if exists "Allow all read organizations" on organizations;
create policy "Allow all read organizations" on organizations for select to anon, authenticated using (true);

-- Projects
drop policy if exists "Allow all read projects" on projects;
create policy "Allow all read projects" on projects for select to anon, authenticated using (deleted_at is null);

drop policy if exists "Allow all insert projects" on projects;
create policy "Allow all insert projects" on projects for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update projects" on projects;
create policy "Allow all update projects" on projects for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all delete projects" on projects;
create policy "Allow all delete projects" on projects for delete to anon, authenticated using (true);

-- Plots
drop policy if exists "Allow all read plots" on plots;
create policy "Allow all read plots" on plots for select to anon, authenticated using (true);

drop policy if exists "Allow all insert plots" on plots;
create policy "Allow all insert plots" on plots for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update plots" on plots;
create policy "Allow all update plots" on plots for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all delete plots" on plots;
create policy "Allow all delete plots" on plots for delete to anon, authenticated using (true);

-- Leads
drop policy if exists "Allow all read leads" on leads;
create policy "Allow all read leads" on leads for select to anon, authenticated using (deleted_at is null);

drop policy if exists "Allow all insert leads" on leads;
create policy "Allow all insert leads" on leads for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update leads" on leads;
create policy "Allow all update leads" on leads for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all delete leads" on leads;
create policy "Allow all delete leads" on leads for delete to anon, authenticated using (true);

-- Lead Status History
drop policy if exists "Allow all read status history" on lead_status_history;
create policy "Allow all read status history" on lead_status_history for select to anon, authenticated using (true);

drop policy if exists "Allow all insert status history" on lead_status_history;
create policy "Allow all insert status history" on lead_status_history for insert to anon, authenticated with check (true);

-- Activities
drop policy if exists "Allow all read activities" on activities;
create policy "Allow all read activities" on activities for select to anon, authenticated using (true);

drop policy if exists "Allow all insert activities" on activities;
create policy "Allow all insert activities" on activities for insert to anon, authenticated with check (true);

-- Webhook Logs
drop policy if exists "Allow all read webhook logs" on webhook_logs;
create policy "Allow all read webhook logs" on webhook_logs for select to anon, authenticated using (true);

drop policy if exists "Allow all insert webhook logs" on webhook_logs;
create policy "Allow all insert webhook logs" on webhook_logs for insert to anon, authenticated with check (true);

-- Profiles
drop policy if exists "Allow all read profiles" on profiles;
create policy "Allow all read profiles" on profiles for select to anon, authenticated using (true);

drop policy if exists "Allow all insert profiles" on profiles;
create policy "Allow all insert profiles" on profiles for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update profiles" on profiles;
create policy "Allow all update profiles" on profiles for update to anon, authenticated using (true) with check (true);

-- 12. User Logins Audit Table
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

alter table user_logins enable row level security;

create index if not exists idx_user_logins_username on user_logins(username);
create index if not exists idx_user_logins_created_at on user_logins(created_at desc);

drop policy if exists "Allow all read user_logins" on user_logins;
create policy "Allow all read user_logins" on user_logins for select to anon, authenticated using (true);

drop policy if exists "Allow all insert user_logins" on user_logins;
create policy "Allow all insert user_logins" on user_logins for insert to anon, authenticated with check (true);

-- Pre-seed Authorized Profiles
insert into profiles (org_id, username, full_name, email, role, is_active)
values 
  ('00000000-0000-0000-0000-000000000000', 'Adminkyra', 'Kyra Administrator', 'adminkyra@kyragroup.com', 'admin', true),
  ('00000000-0000-0000-0000-000000000000', 'dmkyra', 'Digital Marketing Lead', 'dmkyra@kyragroup.com', 'digital_marketing', true)
on conflict (username) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  updated_at = now();

-- 13. Site Visits Master Table
create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  visitor_name text not null,
  visitor_phone text not null,
  visitor_email text,
  project_name text not null,
  scheduled_at timestamptz not null,
  pickup_required boolean not null default false,
  pickup_location text,
  driver_name text,
  vehicle_number text,
  assigned_executive text not null default 'Priya Raman',
  status text not null default 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'
  feedback text,
  interest_level text, -- 'hot', 'warm', 'cold', 'booked'
  plots_shown text[] default array[]::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table site_visits enable row level security;

create index if not exists idx_site_visits_scheduled_at on site_visits(scheduled_at desc);
create index if not exists idx_site_visits_lead_id on site_visits(lead_id);
create index if not exists idx_site_visits_status on site_visits(status);

drop policy if exists "Allow all read site_visits" on site_visits;
create policy "Allow all read site_visits" on site_visits for select to anon, authenticated using (true);

drop policy if exists "Allow all insert site_visits" on site_visits;
create policy "Allow all insert site_visits" on site_visits for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update site_visits" on site_visits;
create policy "Allow all update site_visits" on site_visits for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all delete site_visits" on site_visits;
create policy "Allow all delete site_visits" on site_visits for delete to anon, authenticated using (true);

-- 14. EXPLICIT GRANTS TO DATA API ROLES (anon, authenticated, service_role)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- Setup Complete!

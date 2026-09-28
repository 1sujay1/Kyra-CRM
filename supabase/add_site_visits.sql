-- ============================================================================
-- KYRA CRM - SITE VISITS TABLE & POLICIES SETUP SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Create site_visits Table
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

-- 2. Indexes for Fast Filtering & Scheduling Lookups
create index if not exists idx_site_visits_scheduled_at on site_visits(scheduled_at desc);
create index if not exists idx_site_visits_lead_id on site_visits(lead_id);
create index if not exists idx_site_visits_status on site_visits(status);

-- 3. Row-Level Security (RLS) Configuration
alter table site_visits enable row level security;

drop policy if exists "Allow all read site_visits" on site_visits;
create policy "Allow all read site_visits" on site_visits for select to anon, authenticated using (true);

drop policy if exists "Allow all insert site_visits" on site_visits;
create policy "Allow all insert site_visits" on site_visits for insert to anon, authenticated with check (true);

drop policy if exists "Allow all update site_visits" on site_visits;
create policy "Allow all update site_visits" on site_visits for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow all delete site_visits" on site_visits;
create policy "Allow all delete site_visits" on site_visits for delete to anon, authenticated using (true);

-- 4. Explicit Permissions for anon & authenticated roles
grant all on table site_visits to anon, authenticated, service_role;

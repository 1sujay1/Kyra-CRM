-- ============================================================================
-- KYRA CRM - SITE VISITS TABLE, RLS & REPORTING MIGRATION
-- Run this script in: https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Create site_visits table
create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  visitor_name text not null,
  visitor_phone text not null,
  visitor_email text,
  project_name text not null default 'Anaikatti Green Acres',
  scheduled_at timestamptz not null,
  pickup_required boolean not null default false,
  pickup_location text,
  driver_name text,
  vehicle_number text,
  assigned_executive text default 'Priya Raman',
  status text not null default 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'
  feedback text,
  interest_level text, -- 'hot', 'warm', 'cold', 'booked'
  plots_shown text[] default array[]::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_site_visits_scheduled_at on site_visits(scheduled_at desc);
create index if not exists idx_site_visits_status on site_visits(status);
create index if not exists idx_site_visits_lead_id on site_visits(lead_id);

-- 2. Enable Row Level Security (RLS)
alter table site_visits enable row level security;

-- RLS Policies
drop policy if exists "Allow authenticated read site_visits" on site_visits;
create policy "Allow authenticated read site_visits"
  on site_visits for select
  to authenticated
  using (true);

drop policy if exists "Allow authenticated insert site_visits" on site_visits;
create policy "Allow authenticated insert site_visits"
  on site_visits for insert
  to authenticated
  with check (true);

drop policy if exists "Allow authenticated update site_visits" on site_visits;
create policy "Allow authenticated update site_visits"
  on site_visits for update
  to authenticated
  using (true);

-- Delete permitted ONLY for Admin (Adminkyra)
drop policy if exists "Allow only admin delete site_visits" on site_visits;
create policy "Allow only admin delete site_visits"
  on site_visits for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Also allow public service role / dev access if not yet signed into Supabase auth session
drop policy if exists "Allow anon read site_visits" on site_visits;
create policy "Allow anon read site_visits"
  on site_visits for select
  to anon
  using (true);

drop policy if exists "Allow anon insert site_visits" on site_visits;
create policy "Allow anon insert site_visits"
  on site_visits for insert
  to anon
  with check (true);

drop policy if exists "Allow anon update site_visits" on site_visits;
create policy "Allow anon update site_visits"
  on site_visits for update
  to anon
  using (true);

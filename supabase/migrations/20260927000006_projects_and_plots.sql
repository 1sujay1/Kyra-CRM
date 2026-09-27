-- ============================================================================
-- KYRA CRM - PROJECTS & PLOTS INVENTORY MIGRATION
-- Run this script in: https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new
-- ============================================================================

-- 1. Create Projects Table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  name text not null,
  location text not null,
  description text,
  price_per_cent numeric(12, 2) not null check (price_per_cent >= 0),
  total_plots integer not null default 0 check (total_plots >= 0),
  available_plots integer not null default 0 check (available_plots >= 0),
  status text not null default 'active', -- 'active', 'upcoming', 'sold_out'
  water_source text,
  soil_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2. Create Plots Table
create table if not exists plots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  plot_no text not null,
  survey_no text,
  size_cents numeric(8, 2) not null check (size_cents > 0),
  size_sqft numeric(10, 2) not null check (size_sqft > 0),
  facing text not null default 'east',
  price numeric(12, 2) not null check (price >= 0),
  status text not null default 'available', -- 'available', 'blocked', 'booked', 'sold'
  buyer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, plot_no)
);

-- Indexes
create index if not exists idx_projects_status on projects(status) where deleted_at is null;
create index if not exists idx_plots_project_id on plots(project_id);
create index if not exists idx_plots_status on plots(status);

-- 3. Enable Row Level Security (RLS)
alter table projects enable row level security;
alter table plots enable row level security;

-- Policies for projects
drop policy if exists "Allow authenticated read projects" on projects;
create policy "Allow authenticated read projects" on projects for select to authenticated using (true);

drop policy if exists "Allow authenticated update projects" on projects;
create policy "Allow authenticated update projects" on projects for update to authenticated using (true);

drop policy if exists "Allow authenticated insert projects" on projects;
create policy "Allow authenticated insert projects" on projects for insert to authenticated with check (true);

drop policy if exists "Allow admin delete projects" on projects;
create policy "Allow admin delete projects" on projects for delete to authenticated using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Policies for plots
drop policy if exists "Allow authenticated read plots" on plots;
create policy "Allow authenticated read plots" on plots for select to authenticated using (true);

drop policy if exists "Allow authenticated update plots" on plots;
create policy "Allow authenticated update plots" on plots for update to authenticated using (true);

drop policy if exists "Allow authenticated insert plots" on plots;
create policy "Allow authenticated insert plots" on plots for insert to authenticated with check (true);

-- Anon access
drop policy if exists "Allow anon read projects" on projects;
create policy "Allow anon read projects" on projects for select to anon using (true);

drop policy if exists "Allow anon read plots" on plots;
create policy "Allow anon read plots" on plots for select to anon using (true);

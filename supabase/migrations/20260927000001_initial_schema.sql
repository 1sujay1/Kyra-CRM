-- ============================================================================
-- KYRA GROUP FARMLAND CRM - MIGRATION 1: INITIAL SCHEMA & INDEXES
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Custom Enums
create type user_role as enum (
  'admin',
  'manager',
  'sales_executive',
  'channel_partner'
);

create type project_status as enum ('upcoming', 'active', 'sold_out', 'archived');
create type plot_status as enum ('available', 'blocked', 'booked', 'sold');
create type plot_facing as enum ('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west');

create type lead_source as enum (
  'meta',
  'google',
  'website',
  'walk_in',
  'referral',
  'channel_partner',
  'manual'
);

create type lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'site_visit_scheduled',
  'site_visit_completed',
  'negotiation',
  'booked',
  'lost',
  'junk'
);

create type lead_quality as enum ('hot', 'warm', 'cold', 'junk', 'unqualified');
create type lead_purpose as enum ('investment', 'farmhouse', 'agriculture', 'other');

create type activity_type as enum (
  'call',
  'whatsapp',
  'email',
  'meeting',
  'note',
  'site_visit',
  'follow_up',
  'system',
  're_enquiry'
);

create type follow_up_status as enum ('pending', 'done', 'missed');
create type site_visit_status as enum ('scheduled', 'rescheduled', 'completed', 'no_show', 'cancelled');
create type booking_status as enum ('pending_approval', 'confirmed', 'cancelled');

-- 1. Organizations (Multi-tenant partition)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Profiles (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete restrict,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'sales_executive',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Farmland Projects (e.g. Coimbatore Foothills Agro Estate)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  location text not null,
  description text,
  price_per_cent numeric(12, 2) not null check (price_per_cent >= 0),
  total_plots integer not null default 0 check (total_plots >= 0),
  status project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 4. Farmland Plots
create table if not exists plots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  plot_no text not null,
  survey_no text,
  size_cents numeric(8, 2) not null check (size_cents > 0),
  size_sqft numeric(10, 2) not null check (size_sqft > 0),
  facing plot_facing not null default 'east',
  price numeric(12, 2) not null check (price >= 0),
  status plot_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, plot_no)
);

-- 5. Leads Master Table
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null, -- Normalized E.164 (+91XXXXXXXXXX)
  alt_phone text,
  email text,
  city text default 'Coimbatore',
  project_id uuid references projects(id) on delete set null,
  source lead_source not null default 'manual',
  
  -- Campaign Metadata
  campaign_name text,
  adset_name text,
  ad_name text,
  form_id text,
  form_name text,
  external_lead_id text unique,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  
  -- Farmland Buyer Persona
  budget_range text,
  purpose lead_purpose default 'investment',
  
  -- Status & Pipeline
  status lead_status not null default 'new',
  quality lead_quality not null default 'unqualified',
  assigned_to uuid references profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  lost_reason text,
  
  -- Security & India DPDP Act 2023 Compliance
  consent jsonb not null default '{"consent_given": true, "timestamp": null, "terms_version": "v1.0"}'::jsonb,
  raw_payload jsonb,
  
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 6. Lead Status History
create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  from_status lead_status,
  to_status lead_status not null,
  changed_by uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- 7. Activities Timeline
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  type activity_type not null,
  outcome text,
  notes text,
  duration_seconds integer check (duration_seconds >= 0),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. Follow-ups
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_to uuid not null references profiles(id) on delete cascade,
  due_at timestamptz not null,
  type text not null default 'call',
  status follow_up_status not null default 'pending',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Site Visits
create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  project_id uuid not null references projects(id) on delete restrict,
  scheduled_at timestamptz not null,
  assigned_to uuid not null references profiles(id) on delete cascade,
  pickup_required boolean not null default false,
  pickup_location text,
  status site_visit_status not null default 'scheduled',
  feedback text,
  interest_level lead_quality,
  plots_shown uuid[] default array[]::uuid[],
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete restrict,
  project_id uuid not null references projects(id) on delete restrict,
  plot_id uuid not null references plots(id) on delete restrict,
  booking_date date not null default current_date,
  agreed_price numeric(12, 2) not null check (agreed_price > 0),
  booking_amount numeric(12, 2) not null check (booking_amount > 0),
  payment_mode text not null,
  reference_no text,
  status booking_status not null default 'pending_approval',
  approved_by uuid references profiles(id) on delete set null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. Ad Spend
create table if not exists ad_spend (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source lead_source not null check (source in ('meta', 'google')),
  campaign_name text not null,
  date date not null,
  amount numeric(10, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, source, campaign_name, date)
);

-- 12. Webhook Ingestion Logs (No raw PII)
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  error text,
  payload_hash text not null,
  received_at timestamptz not null default now()
);

-- 13. Audit Logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_org_role on profiles(org_id, role);
create index if not exists idx_leads_org_phone on leads(org_id, phone);
create index if not exists idx_leads_org_status on leads(org_id, status) where deleted_at is null;
create index if not exists idx_leads_assigned_to on leads(assigned_to) where deleted_at is null;
create index if not exists idx_leads_external_id on leads(external_lead_id) where external_lead_id is not null;
create index if not exists idx_leads_next_follow_up on leads(next_follow_up_at) where next_follow_up_at is not null and deleted_at is null;
create index if not exists idx_activities_lead_id on activities(lead_id);
create index if not exists idx_site_visits_assigned_scheduled on site_visits(assigned_to, scheduled_at);
create index if not exists idx_audit_logs_org_created on audit_logs(org_id, created_at desc);

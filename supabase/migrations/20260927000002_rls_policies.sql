-- ============================================================================
-- KYRA GROUP FARMLAND CRM - MIGRATION 2: RLS POLICIES & HELPER FUNCTIONS
-- ============================================================================

-- Security Definer Helpers to prevent infinite recursion in RLS
create or replace function get_current_user_profile()
returns profiles as $$
  select * from profiles where id = auth.uid() and is_active = true limit 1;
$$ language sql stable security definer set search_path = public;

create or replace function get_current_user_org_id()
returns uuid as $$
  select org_id from profiles where id = auth.uid() and is_active = true limit 1;
$$ language sql stable security definer set search_path = public;

create or replace function get_current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid() and is_active = true limit 1;
$$ language sql stable security definer set search_path = public;

-- Enable RLS across all tables
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table plots enable row level security;
alter table leads enable row level security;
alter table lead_status_history enable row level security;
alter table activities enable row level security;
alter table follow_ups enable row level security;
alter table site_visits enable row level security;
alter table bookings enable row level security;
alter table ad_spend enable row level security;
alter table webhook_logs enable row level security;
alter table audit_logs enable row level security;

-- 1. Organizations
create policy "Users can view their own organization"
  on organizations for select
  using (id = get_current_user_org_id());

-- 2. Profiles
create policy "Users can view active profiles within their org"
  on profiles for select
  using (org_id = get_current_user_org_id());

create policy "Admins can manage all profiles in org"
  on profiles for all
  using (org_id = get_current_user_org_id() and get_current_user_role() = 'admin')
  with check (org_id = get_current_user_org_id() and get_current_user_role() = 'admin');

-- 3. Projects
create policy "Org members can view projects"
  on projects for select
  using (org_id = get_current_user_org_id() and deleted_at is null);

create policy "Admins can manage projects"
  on projects for all
  using (org_id = get_current_user_org_id() and get_current_user_role() = 'admin')
  with check (org_id = get_current_user_org_id() and get_current_user_role() = 'admin');

-- 4. Plots
create policy "Org members can view plots"
  on plots for select
  using (org_id = get_current_user_org_id());

create policy "Admins can manage plots"
  on plots for all
  using (org_id = get_current_user_org_id() and get_current_user_role() = 'admin')
  with check (org_id = get_current_user_org_id() and get_current_user_role() = 'admin');

-- 5. Leads
create policy "Leads select policy by role"
  on leads for select
  using (
    org_id = get_current_user_org_id()
    and deleted_at is null
    and (
      get_current_user_role() in ('admin', 'manager')
      or (get_current_user_role() = 'sales_executive' and assigned_to = auth.uid())
      or (get_current_user_role() = 'channel_partner' and created_by = auth.uid())
    )
  );

create policy "Leads insert policy"
  on leads for insert
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager', 'sales_executive', 'channel_partner')
    )
  );

create policy "Leads update policy by role"
  on leads for update
  using (
    org_id = get_current_user_org_id()
    and deleted_at is null
    and (
      get_current_user_role() in ('admin', 'manager')
      or (get_current_user_role() = 'sales_executive' and assigned_to = auth.uid())
    )
  )
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or (get_current_user_role() = 'sales_executive' and assigned_to = auth.uid())
    )
  );

create policy "Only Admins can soft-delete leads"
  on leads for delete
  using (
    org_id = get_current_user_org_id()
    and get_current_user_role() = 'admin'
  );

-- 6. Lead Status History
create policy "View status history for accessible leads"
  on lead_status_history for select
  using (
    org_id = get_current_user_org_id()
    and exists (
      select 1 from leads l where l.id = lead_status_history.lead_id and l.deleted_at is null
    )
  );

create policy "Insert status history"
  on lead_status_history for insert
  with check (org_id = get_current_user_org_id());

-- 7. Activities
create policy "View activities for accessible leads"
  on activities for select
  using (
    org_id = get_current_user_org_id()
    and exists (
      select 1 from leads l where l.id = activities.lead_id and l.deleted_at is null
    )
  );

create policy "Insert activities for assigned leads"
  on activities for insert
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or exists (
        select 1 from leads l where l.id = activities.lead_id and l.assigned_to = auth.uid()
      )
    )
  );

-- 8. Follow Ups
create policy "Follow ups access policy"
  on follow_ups for select
  using (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  );

create policy "Manage follow ups"
  on follow_ups for all
  using (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  )
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  );

-- 9. Site Visits
create policy "Site visits view policy"
  on site_visits for select
  using (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  );

create policy "Site visits mutate policy"
  on site_visits for all
  using (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  )
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or assigned_to = auth.uid()
    )
  );

-- 10. Bookings
create policy "Bookings view policy"
  on bookings for select
  using (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager')
      or created_by = auth.uid()
    )
  );

create policy "Sales can create booking requests"
  on bookings for insert
  with check (
    org_id = get_current_user_org_id()
    and (
      get_current_user_role() in ('admin', 'manager', 'sales_executive')
    )
  );

create policy "Only Admins/Managers can update booking status"
  on bookings for update
  using (
    org_id = get_current_user_org_id()
    and get_current_user_role() in ('admin', 'manager')
  );

-- 11. Ad Spend
create policy "Ad spend view policy"
  on ad_spend for select
  using (
    org_id = get_current_user_org_id()
    and get_current_user_role() in ('admin', 'manager')
  );

create policy "Ad spend write policy"
  on ad_spend for all
  using (
    org_id = get_current_user_org_id()
    and get_current_user_role() in ('admin', 'manager')
  );

-- 12. Webhook Logs
create policy "Webhook logs viewable by admin"
  on webhook_logs for select
  using (get_current_user_role() = 'admin');

-- 13. Audit Logs
create policy "Audit logs viewable only by admin"
  on audit_logs for select
  using (
    org_id = get_current_user_org_id()
    and get_current_user_role() = 'admin'
  );

create policy "Audit logs insertable by system/actions"
  on audit_logs for insert
  with check (org_id = get_current_user_org_id());

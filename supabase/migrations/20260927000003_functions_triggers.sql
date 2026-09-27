-- ============================================================================
-- KYRA GROUP FARMLAND CRM - MIGRATION 3: FUNCTIONS, TRIGGERS & PROCEDURES
-- ============================================================================

-- 1. Auto-update updated_at timestamp trigger function
create or replace function set_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_organizations_updated_at before update on organizations for each row execute function set_updated_at_column();
create trigger trigger_profiles_updated_at before update on profiles for each row execute function set_updated_at_column();
create trigger trigger_projects_updated_at before update on projects for each row execute function set_updated_at_column();
create trigger trigger_plots_updated_at before update on plots for each row execute function set_updated_at_column();
create trigger trigger_leads_updated_at before update on leads for each row execute function set_updated_at_column();
create trigger trigger_follow_ups_updated_at before update on follow_ups for each row execute function set_updated_at_column();
create trigger trigger_site_visits_updated_at before update on site_visits for each row execute function set_updated_at_column();
create trigger trigger_bookings_updated_at before update on bookings for each row execute function set_updated_at_column();
create trigger trigger_ad_spend_updated_at before update on ad_spend for each row execute function set_updated_at_column();

-- 2. Phone Masking Helper Function (e.g., +91 98XXXXX210)
create or replace function mask_phone_number(p_phone text)
returns text as $$
begin
  if p_phone is null or length(p_phone) < 10 then
    return '**********';
  end if;
  return substring(p_phone from 1 for (length(p_phone) - 8)) || 'XXXXX' || substring(p_phone from (length(p_phone) - 2));
end;
$$ language plpgsql immutable;

-- 3. Lead Ingestion & Deduplication Stored Procedure
create or replace function ingest_or_deduplicate_lead(
  p_org_id uuid,
  p_full_name text,
  p_phone text,
  p_alt_phone text,
  p_email text,
  p_city text,
  p_source lead_source,
  p_campaign_name text,
  p_adset_name text,
  p_ad_name text,
  p_form_id text,
  p_form_name text,
  p_external_lead_id text,
  p_raw_payload jsonb,
  p_consent jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_lead leads%rowtype;
  v_new_lead_id uuid;
begin
  -- Check if active lead with same normalized phone exists in this organization
  select * into v_existing_lead
  from leads
  where org_id = p_org_id and phone = p_phone and deleted_at is null
  order by created_at desc
  limit 1;

  if found then
    -- Duplicate lead found: Append re-enquiry activity to timeline
    insert into activities (
      org_id,
      lead_id,
      type,
      outcome,
      notes,
      created_by
    ) values (
      p_org_id,
      v_existing_lead.id,
      're_enquiry',
      'Re-enquiry via ' || p_source::text,
      format('Campaign: %s, Form: %s, Ad: %s', coalesce(p_campaign_name, 'N/A'), coalesce(p_form_name, 'N/A'), coalesce(p_ad_name, 'N/A')),
      null
    );

    update leads
    set last_contacted_at = now(),
        updated_at = now()
    where id = v_existing_lead.id;

    return jsonb_build_object(
      'status', 'duplicate_recorded',
      'lead_id', v_existing_lead.id,
      'is_duplicate', true
    );
  else
    -- Create new fresh lead
    insert into leads (
      org_id,
      full_name,
      phone,
      alt_phone,
      email,
      city,
      source,
      campaign_name,
      adset_name,
      ad_name,
      form_id,
      form_name,
      external_lead_id,
      raw_payload,
      consent,
      status,
      quality
    ) values (
      p_org_id,
      p_full_name,
      p_phone,
      p_alt_phone,
      p_email,
      coalesce(p_city, 'Coimbatore'),
      p_source,
      p_campaign_name,
      p_adset_name,
      p_ad_name,
      p_form_id,
      p_form_name,
      p_external_lead_id,
      p_raw_payload,
      p_consent,
      'new',
      'unqualified'
    )
    returning id into v_new_lead_id;

    -- Record initial status in status history
    insert into lead_status_history (
      org_id,
      lead_id,
      from_status,
      to_status,
      changed_by,
      note
    ) values (
      p_org_id,
      v_new_lead_id,
      null,
      'new',
      null,
      'Initial lead capture via ' || p_source::text
    );

    return jsonb_build_object(
      'status', 'lead_created',
      'lead_id', v_new_lead_id,
      'is_duplicate', false
    );
  end if;
end;
$$;

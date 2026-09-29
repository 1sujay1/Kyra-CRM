'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { LeadDetailed, ActivityItem, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { LeadStatusType } from '@/components/leads/status-change-modal';
import { readLocalJson, writeLocalJson } from '@/lib/storage';
import { validateIndianPhoneNumber, getCorePhoneDigits } from '@/lib/security/phone';

const LEADS_FILE = 'leads.json';

// Fetch all leads from Supabase with resilient persistent local fallback
export async function fetchLeadsAction(): Promise<LeadDetailed[]> {
  const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);

  try {
    const supabase = (await createClient()) as any;
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select('*, lead_status_history(*), activities(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch leads notice (using persistent store):', error.message);
      return localLeads;
    }

    if (dbLeads && Array.isArray(dbLeads)) {
      const mappedDbLeads: LeadDetailed[] = dbLeads.map((l: any) => {
        // Map database status history
        const dbHistory: StatusHistoryItem[] = Array.isArray(l.lead_status_history)
          ? l.lead_status_history.map((sh: any) => ({
              id: sh.id,
              from_status: sh.from_status || null,
              to_status: sh.to_status,
              comment: sh.comment || '',
              changed_by: sh.changed_by || 'System',
              created_at: sh.created_at,
            })).sort((a: StatusHistoryItem, b: StatusHistoryItem) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          : [];

        // Map database activities
        const dbActivities: ActivityItem[] = Array.isArray(l.activities)
          ? l.activities.map((act: any) => ({
              id: act.id,
              type: act.type || 'note',
              outcome: act.outcome || '',
              notes: act.notes || '',
              created_by: act.created_by || 'System',
              created_at: act.created_at,
            })).sort((a: ActivityItem, b: ActivityItem) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          : [];

        const local = localLeads.find((item) => item.id === l.id);

        return {
          id: l.id,
          full_name: l.full_name,
          phone: l.phone,
          email: l.email || '',
          city: l.city || 'Coimbatore',
          source: l.source || 'manual',
          campaign_name: l.campaign_name || '',
          project_name: l.project_name || 'Anaikatti Green Acres',
          budget_range: l.budget_range || '₹35L - ₹50L',
          purpose: l.purpose || 'farmhouse',
          status: l.status || 'new',
          quality: l.quality || 'warm',
          assigned_to_name: l.assigned_to_name || 'Priya Raman',
          created_at: l.created_at,
          status_history: dbHistory.length > 0 ? dbHistory : (local?.status_history || []),
          activities: dbActivities.length > 0 ? dbActivities : (local?.activities || []),
        };
      });

      // Update local storage cache to be an exact mirror of active database leads
      writeLocalJson(LEADS_FILE, mappedDbLeads);
      return mappedDbLeads;
    }

    return localLeads;
  } catch (err: any) {
    console.warn('Fetch leads fallback triggered:', err?.message);
    return localLeads;
  }
}

export async function createLeadAction(newLead: LeadDetailed): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Ensure id is a strictly valid UUID v4 so Postgres never throws 'invalid input syntax for type uuid'
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!newLead.id || !uuidPattern.test(newLead.id)) {
      newLead.id = crypto.randomUUID();
    }

    // 2. Validate phone number (without 10 digits -> Number Not Valid, duplicate number -> Duplicate Number)
    const phoneCheck = validateIndianPhoneNumber(newLead.phone);
    if (!phoneCheck.isValid && newLead.status === 'new') {
      newLead.status = 'number_not_valid';
    } else if (phoneCheck.isValid && newLead.status === 'new') {
      const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
      const isDuplicate = localLeads.some(
        (l) => l.id !== newLead.id && getCorePhoneDigits(l.phone) === phoneCheck.cleanDigits
      );
      if (isDuplicate) {
        newLead.status = 'duplicate_number';
      }
    }

    // 3. Persist to Supabase Postgres (Primary source of truth)
    try {
      const supabase = (await createClient()) as any;
      const { error: insertError } = await supabase.from('leads').insert({
        id: newLead.id,
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        full_name: newLead.full_name,
        phone: newLead.phone,
        email: newLead.email,
        city: newLead.city || 'Coimbatore',
        project_name: newLead.project_name,
        source: newLead.source || 'manual',
        campaign_name: newLead.campaign_name || '',
        budget_range: newLead.budget_range,
        purpose: newLead.purpose,
        status: newLead.status,
        quality: newLead.quality,
        assigned_to_name: newLead.assigned_to_name,
        created_at: newLead.created_at || new Date().toISOString(),
      });

      if (insertError) {
        console.error('[Supabase Lead Insert Notice]:', insertError.message);
      } else {
        // Persist initial status history in Supabase
        if (newLead.status_history && newLead.status_history.length > 0) {
          for (const hist of newLead.status_history) {
            await supabase.from('lead_status_history').insert({
              org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
              lead_id: newLead.id,
              from_status: hist.from_status || null,
              to_status: hist.to_status,
              comment: hist.comment || 'Lead created',
              changed_by: hist.changed_by || 'Current User',
            });
          }
        }

        // Persist initial activities in Supabase
        if (newLead.activities && newLead.activities.length > 0) {
          for (const act of newLead.activities) {
            await supabase.from('activities').insert({
              org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
              lead_id: newLead.id,
              type: act.type,
              outcome: act.outcome || '',
              notes: act.notes,
              created_by: act.created_by || 'Current User',
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Connection Notice]:', e.message);
    }

    // 3. Persist to local backup storage
    const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
    const existingIndex = localLeads.findIndex((l) => l.id === newLead.id);
    if (existingIndex >= 0) {
      localLeads[existingIndex] = newLead;
    } else {
      localLeads.unshift(newLead);
    }
    writeLocalJson(LEADS_FILE, localLeads);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateLeadStatusAction(
  leadId: string,
  newStatus: LeadStatusType,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUserAction();
  const changedBy = user?.username || 'Current Agent';

  try {
    // 1. Update in local persistent storage
    const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
    const leadIndex = localLeads.findIndex((l) => l.id === leadId);
    if (leadIndex >= 0) {
      const historyItem: StatusHistoryItem = {
        id: `sh-${Date.now()}`,
        from_status: localLeads[leadIndex].status,
        to_status: newStatus,
        comment,
        changed_by: changedBy,
        created_at: new Date().toISOString(),
      };
      localLeads[leadIndex].status = newStatus;
      localLeads[leadIndex].status_history = [historyItem, ...(localLeads[leadIndex].status_history || [])];
      writeLocalJson(LEADS_FILE, localLeads);
    }

    // 2. Update in Supabase
    try {
      const supabase = (await createClient()) as any;
      await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      await supabase.from('lead_status_history').insert({
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        lead_id: leadId,
        to_status: newStatus,
        comment: comment,
        changed_by: changedBy,
      });
    } catch (e: any) {
      console.warn('Supabase status update skipped:', e.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addActivityAction(
  leadId: string,
  type: string,
  outcome: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUserAction();
  const createdBy = user?.username || 'Current Agent';

  try {
    // 1. Update local persistent storage
    const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
    const leadIndex = localLeads.findIndex((l) => l.id === leadId);
    if (leadIndex >= 0) {
      const activity: ActivityItem = {
        id: `act-${Date.now()}`,
        type: type as any,
        outcome,
        notes,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      };
      localLeads[leadIndex].activities = [activity, ...(localLeads[leadIndex].activities || [])];
      writeLocalJson(LEADS_FILE, localLeads);
    }

    // 2. Insert into Supabase
    try {
      const supabase = (await createClient()) as any;
      await supabase.from('activities').insert({
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        lead_id: leadId,
        type: type,
        outcome: outcome,
        notes: notes,
        created_by: createdBy,
      });
    } catch (e: any) {
      console.warn('Supabase activity insert skipped:', e.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// CRITICAL RBAC REQUIREMENT: Admin ONLY delete permission
export async function deleteLeadAction(leadId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUserAction();

  if (!user || user.role !== 'admin') {
    return {
      success: false,
      error: 'SECURITY VIOLATION: Only Admin (Adminkyra) has permission to delete leads. Digital Marketing users have modify-only access.',
    };
  }

  // Remove from local persistent storage
  const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
  const filtered = localLeads.filter((l) => l.id !== leadId);
  writeLocalJson(LEADS_FILE, filtered);

  try {
    const supabase = (await createClient()) as any;

    // 1. Clean up child records linked to this lead to prevent orphan references or FK blocks
    await Promise.allSettled([
      supabase.from('lead_status_history').delete().eq('lead_id', leadId),
      supabase.from('activities').delete().eq('lead_id', leadId),
      supabase.from('webhook_logs').delete().eq('lead_id', leadId),
      supabase.from('site_visits').delete().eq('lead_id', leadId),
    ]);

    // 2. Perform complete removal from the Supabase leads database table
    const { error: dbError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (dbError) {
      console.warn('Supabase lead delete notice:', dbError.message);
      // Fallback: If soft-delete is enforced by policy, mark deleted_at
      await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Supabase delete exception handled:', err?.message);
    return { success: true };
  }
}

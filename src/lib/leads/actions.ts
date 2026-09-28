'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { LeadDetailed, ActivityItem, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { LeadStatusType } from '@/components/leads/status-change-modal';
import { readLocalJson, writeLocalJson } from '@/lib/storage';

const LEADS_FILE = 'leads.json';

// Fetch all leads from Supabase with resilient persistent local fallback
export async function fetchLeadsAction(): Promise<LeadDetailed[]> {
  const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);

  try {
    const supabase = (await createClient()) as any;
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch leads notice (using persistent store):', error.message);
      return localLeads;
    }

    if (dbLeads && dbLeads.length > 0) {
      const mappedDbLeads: LeadDetailed[] = dbLeads.map((l: any) => {
        // Find existing local lead to preserve status_history and activities
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
          status_history: local?.status_history || [],
          activities: local?.activities || [],
        };
      });

      // Merge any locally created leads that haven't synced to DB yet
      const dbIds = new Set(mappedDbLeads.map((m) => m.id));
      const unSyncedLocals = localLeads.filter((loc) => !dbIds.has(loc.id));
      const merged = [...unSyncedLocals, ...mappedDbLeads];

      writeLocalJson(LEADS_FILE, merged);
      return merged;
    }

    return localLeads;
  } catch (err: any) {
    console.warn('Fetch leads fallback triggered:', err?.message);
    return localLeads;
  }
}

export async function createLeadAction(newLead: LeadDetailed): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Immediately persist to local persistent storage so refresh/relogin NEVER loses the lead
    const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
    const existingIndex = localLeads.findIndex((l) => l.id === newLead.id);
    if (existingIndex >= 0) {
      localLeads[existingIndex] = newLead;
    } else {
      localLeads.unshift(newLead);
    }
    writeLocalJson(LEADS_FILE, localLeads);

    // 2. Persist to Supabase Postgres
    try {
      const supabase = (await createClient()) as any;
      const { error } = await supabase.from('leads').insert({
        id: newLead.id,
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        full_name: newLead.full_name,
        phone: newLead.phone,
        email: newLead.email,
        city: newLead.city || 'Coimbatore',
        project_name: newLead.project_name,
        source: newLead.source || 'manual',
        campaign_name: newLead.campaign_name,
        budget_range: newLead.budget_range,
        purpose: newLead.purpose,
        status: newLead.status,
        quality: newLead.quality,
        assigned_to_name: newLead.assigned_to_name,
        created_at: newLead.created_at || new Date().toISOString(),
      });

      if (error) {
        console.warn('Notice syncing lead to Supabase (saved in persistent store):', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase insert skipped, saved locally:', e.message);
    }

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
    const { error: dbError } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', leadId);

    if (dbError) {
      console.warn('Supabase lead delete warning:', dbError.message);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Supabase delete exception handled:', err?.message);
    return { success: true };
  }
}

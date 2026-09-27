'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { LeadDetailed, ActivityItem, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { LeadStatusType } from '@/components/leads/status-change-modal';

// Clean runtime leads cache (Zero dummy leads preloaded)
let runtimeLeads: LeadDetailed[] = [];

export async function fetchLeadsAction(): Promise<LeadDetailed[]> {
  try {
    const supabase = await createClient();
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch leads notice:', error.message);
      return runtimeLeads;
    }

    if (!dbLeads || dbLeads.length === 0) {
      return runtimeLeads;
    }

    // Map DB leads to LeadDetailed format
    return dbLeads.map((l: any) => ({
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email || '',
      city: l.city || 'Coimbatore',
      source: l.source,
      campaign_name: l.campaign_name,
      project_name: l.project_name || 'Anaikatti Green Acres',
      budget_range: l.budget_range || '₹35L - ₹50L',
      purpose: l.purpose || 'farmhouse',
      status: l.status || 'new',
      quality: l.quality || 'warm',
      assigned_to_name: l.assigned_to_name || 'Priya Raman',
      created_at: l.created_at,
      status_history: [],
      activities: [],
    }));
  } catch {
    return runtimeLeads;
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
    const supabase = (await createClient()) as any;
    // Update lead in DB
    await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    // Insert into lead_status_history
    await supabase.from('lead_status_history').insert({
      org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
      lead_id: leadId,
      to_status: newStatus,
      comment: comment,
      changed_by: changedBy,
    });

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
    const supabase = (await createClient()) as any;
    await supabase.from('activities').insert({
      org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
      lead_id: leadId,
      type: type,
      outcome: outcome,
      notes: notes,
      created_by: createdBy,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createLeadAction(newLead: LeadDetailed): Promise<{ success: boolean; error?: string }> {
  try {
    runtimeLeads.unshift(newLead);

    const supabase = (await createClient()) as any;
    await supabase.from('leads').insert({
      id: newLead.id,
      org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
      full_name: newLead.full_name,
      phone: newLead.phone,
      email: newLead.email,
      city: newLead.city,
      project_name: newLead.project_name,
      source: newLead.source,
      campaign_name: newLead.campaign_name,
      budget_range: newLead.budget_range,
      purpose: newLead.purpose,
      status: newLead.status,
      quality: newLead.quality,
      assigned_to_name: newLead.assigned_to_name,
    });

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

  // Remove from runtime cache
  runtimeLeads = runtimeLeads.filter((l) => l.id !== leadId);

  try {
    const supabase = (await createClient()) as any;
    // Soft delete with deleted_at timestamp
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

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';

export interface SiteVisitItem {
  id: string;
  lead_id?: string | null;
  visitor_name: string;
  visitor_phone: string;
  visitor_email?: string | null;
  project_name: string;
  scheduled_at: string;
  pickup_required: boolean;
  pickup_location?: string | null;
  driver_name?: string | null;
  vehicle_number?: string | null;
  assigned_executive: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  feedback?: string | null;
  interest_level?: 'hot' | 'warm' | 'cold' | 'booked' | null;
  plots_shown?: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory runtime cache for seamless session resilience if Supabase table is pending migration
let runtimeSiteVisits: SiteVisitItem[] = [];

export async function fetchSiteVisitsAction(): Promise<SiteVisitItem[]> {
  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.warn('Supabase site_visits query returned error (using runtime state):', error.message);
      return runtimeSiteVisits;
    }

    if (data && data.length > 0) {
      // Merge with runtime state (preferring DB items)
      const dbIds = new Set(data.map((d: any) => d.id));
      const unsavedRuntime = runtimeSiteVisits.filter((r) => !dbIds.has(r.id));
      return [...data, ...unsavedRuntime];
    }

    return runtimeSiteVisits;
  } catch (err: any) {
    console.error('Error fetching site visits:', err);
    return runtimeSiteVisits;
  }
}

export async function createSiteVisitAction(payload: {
  lead_id?: string | null;
  visitor_name: string;
  visitor_phone: string;
  visitor_email?: string | null;
  project_name: string;
  scheduled_at: string;
  pickup_required: boolean;
  pickup_location?: string | null;
  driver_name?: string | null;
  vehicle_number?: string | null;
  assigned_executive?: string;
  notes?: string | null;
  plots_shown?: string[];
}): Promise<{ success: boolean; data?: SiteVisitItem; error?: string }> {
  try {
    const currentUser = await getCurrentUserAction();
    const userDisplay = currentUser?.username || 'Adminkyra';

    const newVisit: SiteVisitItem = {
      id: crypto.randomUUID(),
      lead_id: payload.lead_id || null,
      visitor_name: payload.visitor_name.trim(),
      visitor_phone: payload.visitor_phone.trim(),
      visitor_email: payload.visitor_email?.trim() || null,
      project_name: payload.project_name,
      scheduled_at: payload.scheduled_at,
      pickup_required: payload.pickup_required,
      pickup_location: payload.pickup_required ? payload.pickup_location || 'Coimbatore International Airport (CJB)' : null,
      driver_name: payload.driver_name?.trim() || null,
      vehicle_number: payload.vehicle_number?.trim() || null,
      assigned_executive: payload.assigned_executive || 'Priya Raman',
      status: 'scheduled',
      feedback: null,
      interest_level: null,
      plots_shown: payload.plots_shown || [],
      notes: payload.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in runtime state
    runtimeSiteVisits.unshift(newVisit);

    // Save to Supabase
    try {
      const supabase = (await createClient()) as any;
      const { error: insertError } = await supabase.from('site_visits').insert([
        {
          id: newVisit.id,
          lead_id: newVisit.lead_id,
          visitor_name: newVisit.visitor_name,
          visitor_phone: newVisit.visitor_phone,
          visitor_email: newVisit.visitor_email,
          project_name: newVisit.project_name,
          scheduled_at: newVisit.scheduled_at,
          pickup_required: newVisit.pickup_required,
          pickup_location: newVisit.pickup_location,
          driver_name: newVisit.driver_name,
          vehicle_number: newVisit.vehicle_number,
          assigned_executive: newVisit.assigned_executive,
          status: 'scheduled',
          feedback: null,
          interest_level: null,
          plots_shown: newVisit.plots_shown,
          notes: newVisit.notes,
        },
      ]);

      if (insertError) {
        console.warn('Could not insert to Supabase site_visits table directly:', insertError.message);
      }

      // If tied to a lead, update lead status & append activity
      if (newVisit.lead_id) {
        await supabase
          .from('leads')
          .update({
            status: 'site_visit_scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', newVisit.lead_id);

        await supabase.from('activities').insert([
          {
            lead_id: newVisit.lead_id,
            type: 'site_visit',
            outcome: 'Site Visit Scheduled',
            notes: `Site visit scheduled for ${new Date(newVisit.scheduled_at).toLocaleString('en-IN')} at ${newVisit.project_name}.${newVisit.pickup_required ? ` Pickup: ${newVisit.pickup_location}` : ''}`,
            created_by: userDisplay,
          },
        ]);

        await supabase.from('lead_status_history').insert([
          {
            lead_id: newVisit.lead_id,
            from_status: 'qualified',
            to_status: 'site_visit_scheduled',
            comment: `Site visit scheduled for ${new Date(newVisit.scheduled_at).toLocaleDateString('en-IN')}`,
            changed_by: userDisplay,
          },
        ]);
      }
    } catch (e: any) {
      console.warn('Supabase sync skipped, retained in memory:', e.message);
    }

    return { success: true, data: newVisit };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSiteVisitReportAction(
  visitId: string,
  payload: {
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    feedback?: string | null;
    interest_level?: 'hot' | 'warm' | 'cold' | 'booked' | null;
    plots_shown?: string[];
    notes?: string | null;
  }
): Promise<{ success: boolean; data?: SiteVisitItem; error?: string }> {
  try {
    const currentUser = await getCurrentUserAction();
    const userDisplay = currentUser?.username || 'Adminkyra';

    // Update in runtime memory
    const existingIndex = runtimeSiteVisits.findIndex((v) => v.id === visitId);
    let targetVisit: SiteVisitItem | undefined;

    if (existingIndex >= 0) {
      runtimeSiteVisits[existingIndex] = {
        ...runtimeSiteVisits[existingIndex],
        status: payload.status,
        feedback: payload.feedback?.trim() || null,
        interest_level: payload.interest_level || null,
        plots_shown: payload.plots_shown || runtimeSiteVisits[existingIndex].plots_shown,
        notes: payload.notes?.trim() || runtimeSiteVisits[existingIndex].notes,
        updated_at: new Date().toISOString(),
      };
      targetVisit = runtimeSiteVisits[existingIndex];
    }

    // Update in Supabase
    try {
      const supabase = (await createClient()) as any;
      const { data: updatedDb, error: updateError } = await supabase
        .from('site_visits')
        .update({
          status: payload.status,
          feedback: payload.feedback?.trim() || null,
          interest_level: payload.interest_level || null,
          plots_shown: payload.plots_shown || [],
          notes: payload.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId)
        .select()
        .single();

      if (!updateError && updatedDb) {
        targetVisit = updatedDb;
      }

      // If marked completed and has a linked lead, update lead
      const linkedLeadId = targetVisit?.lead_id;
      if (linkedLeadId) {
        if (payload.status === 'completed') {
          await supabase
            .from('leads')
            .update({
              status: payload.interest_level === 'booked' ? 'booked' : 'site_visit_completed',
              quality: payload.interest_level === 'hot' ? 'hot' : payload.interest_level === 'warm' ? 'warm' : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', linkedLeadId);

          await supabase.from('activities').insert([
            {
              lead_id: linkedLeadId,
              type: 'site_visit',
              outcome: `Site Visit Completed - Interest: ${(payload.interest_level || 'warm').toUpperCase()}`,
              notes: `Customer Feedback: "${payload.feedback || 'Tour completed smoothly.'}". Plots inspected: ${(payload.plots_shown || []).join(', ') || 'N/A'}.`,
              created_by: userDisplay,
            },
          ]);
        }
      }
    } catch (e: any) {
      console.warn('Supabase update warning:', e.message);
    }

    return { success: true, data: targetVisit };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSiteVisitAction(visitId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUserAction();
    if (currentUser?.role !== 'admin') {
      return {
        success: false,
        error: 'ACCESS DENIED: Only Admin (Adminkyra) has permission to delete site visits.',
      };
    }

    runtimeSiteVisits = runtimeSiteVisits.filter((v) => v.id !== visitId);

    try {
      const supabase = (await createClient()) as any;
      await supabase.from('site_visits').delete().eq('id', visitId);
    } catch (e: any) {
      console.warn('Supabase delete error:', e.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

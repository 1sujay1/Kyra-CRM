'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { readLocalJson, writeLocalJson } from '@/lib/storage';

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

const VISITS_STORE_KEY = 'site_visits.json';

const DEFAULT_SITE_VISITS: SiteVisitItem[] = [
  {
    id: 'sv-101',
    visitor_name: 'Karthik Raja',
    visitor_phone: '+919842109876',
    visitor_email: 'karthik.raja@gmail.com',
    project_name: 'Pollachi Coconut Groves',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    pickup_required: true,
    pickup_location: 'Coimbatore International Airport (CJB)',
    driver_name: 'Murugan (Innova Crysta)',
    vehicle_number: 'TN 38 BK 4901',
    assigned_executive: 'Priya Raman',
    status: 'scheduled',
    feedback: null,
    interest_level: null,
    plots_shown: ['Plot 02', 'Plot 03'],
    notes: 'Arriving by Indigo 6E-542 from Chennai. Needs farm gate pickup.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sv-102',
    visitor_name: 'Dr. Anand S',
    visitor_phone: '+919443219876',
    visitor_email: 'dranand.ortho@outlook.com',
    project_name: 'Anaikatti Green Acres',
    scheduled_at: new Date(Date.now() + 172800000).toISOString(),
    pickup_required: false,
    pickup_location: null,
    driver_name: null,
    vehicle_number: null,
    assigned_executive: 'Suresh Narayanan',
    status: 'scheduled',
    feedback: null,
    interest_level: null,
    plots_shown: ['Plot 07', 'Plot 14'],
    notes: 'Interested in mountain-facing boundary plots for weekend natural farming retreat.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sv-103',
    visitor_name: 'Lakshmi Narayanan',
    visitor_phone: '+919894012345',
    visitor_email: 'lakshminarayanan@yahoo.co.in',
    project_name: 'Siruvani Valley Farmlands',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    pickup_required: true,
    pickup_location: 'Coimbatore Junction Railway Station (CBE)',
    driver_name: 'Selvakumar',
    vehicle_number: 'TN 37 CB 1122',
    assigned_executive: 'Priya Raman',
    status: 'completed',
    feedback: 'Loved the sweet Siruvani water taste (TDS 45) and mountain view. Requested price calculation for 50 cents plot.',
    interest_level: 'hot',
    plots_shown: ['Plot 05', 'Plot 08', 'Plot 11'],
    notes: 'Completed tour on time. Follow-up scheduled for plot agreement.',
    created_at: new Date(Date.now() - 90000000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function fetchSiteVisitsAction(): Promise<SiteVisitItem[]> {
  try {
    const localVisits = readLocalJson<SiteVisitItem[]>(VISITS_STORE_KEY, DEFAULT_SITE_VISITS);
    const supabase = (await createClient()) as any;

    let dbVisits: SiteVisitItem[] = [];

    // 1. Try fetching from site_visits table
    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .order('scheduled_at', { ascending: false });

    if (!error && data && data.length > 0) {
      dbVisits = data;
    } else {
      // 2. Resilient fallback: fetch from webhook_logs where source = 'site_visit'
      try {
        const { data: logVisits } = await supabase
          .from('webhook_logs')
          .select('payload')
          .eq('source', 'site_visit')
          .order('created_at', { ascending: false });

        if (logVisits && logVisits.length > 0) {
          dbVisits = logVisits.map((l: any) => l.payload as SiteVisitItem).filter(Boolean);
        }
      } catch {
        // ignore
      }
    }

    // Merge DB + Local visits, de-duplicating by id
    const allVisitsMap = new Map<string, SiteVisitItem>();

    for (const v of localVisits) {
      if (v?.id) allVisitsMap.set(v.id, v);
    }
    for (const v of dbVisits) {
      if (v?.id) allVisitsMap.set(v.id, v);
    }

    const merged = Array.from(allVisitsMap.values()).sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );

    writeLocalJson(VISITS_STORE_KEY, merged);
    return merged;
  } catch (err: any) {
    console.error('Error fetching site visits:', err);
    return readLocalJson<SiteVisitItem[]>(VISITS_STORE_KEY, DEFAULT_SITE_VISITS);
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
      pickup_location: payload.pickup_required
        ? payload.pickup_location || 'Coimbatore International Airport (CJB)'
        : null,
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

    // 1. Persist immediately to local storage
    const existing = readLocalJson<SiteVisitItem[]>(VISITS_STORE_KEY, DEFAULT_SITE_VISITS);
    writeLocalJson(VISITS_STORE_KEY, [newVisit, ...existing]);

    // 2. Persist to Supabase
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

      // If site_visits table not created yet, persist to webhook_logs
      if (insertError) {
        await supabase.from('webhook_logs').insert([
          {
            source: 'site_visit',
            lead_id: newVisit.lead_id,
            status: 'processed',
            payload: newVisit,
          },
        ]);
      }

      // If linked to lead, synchronize lead status, activities, and history
      if (newVisit.lead_id) {
        await supabase
          .from('leads')
          .update({
            status: 'site_visit_scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', newVisit.lead_id);

        try {
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
        } catch {
          // ignore sub-table errors
        }
      }
    } catch (e: any) {
      console.warn('Supabase site visit sync warning:', e.message);
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

    // 1. Update in local storage
    const visits = readLocalJson<SiteVisitItem[]>(VISITS_STORE_KEY, DEFAULT_SITE_VISITS);
    const existingIndex = visits.findIndex((v) => v.id === visitId);
    let targetVisit: SiteVisitItem | undefined;

    if (existingIndex >= 0) {
      visits[existingIndex] = {
        ...visits[existingIndex],
        status: payload.status,
        feedback: payload.feedback?.trim() || null,
        interest_level: payload.interest_level || null,
        plots_shown: payload.plots_shown || visits[existingIndex].plots_shown,
        notes: payload.notes?.trim() || visits[existingIndex].notes,
        updated_at: new Date().toISOString(),
      };
      targetVisit = visits[existingIndex];
      writeLocalJson(VISITS_STORE_KEY, visits);
    }

    // 2. Update in Supabase
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

          try {
            await supabase.from('activities').insert([
              {
                lead_id: linkedLeadId,
                type: 'site_visit',
                outcome: `Site Visit Completed - Interest: ${(payload.interest_level || 'warm').toUpperCase()}`,
                notes: `Customer Feedback: "${payload.feedback || 'Tour completed smoothly.'}". Plots inspected: ${(payload.plots_shown || []).join(', ') || 'N/A'}.`,
                created_by: userDisplay,
              },
            ]);
          } catch {}
        }
      }
    } catch (e: any) {
      console.warn('Supabase site visit update warning:', e.message);
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

    const visits = readLocalJson<SiteVisitItem[]>(VISITS_STORE_KEY, DEFAULT_SITE_VISITS);
    const filtered = visits.filter((v) => v.id !== visitId);
    writeLocalJson(VISITS_STORE_KEY, filtered);

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

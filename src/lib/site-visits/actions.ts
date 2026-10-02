'use server';

import { getDatabase } from '@/lib/mongodb';
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

export async function fetchSiteVisitsAction(): Promise<SiteVisitItem[]> {
  try {
    const db = await getDatabase();

    // 1. Fetch from site_visits collection
    const data = await db
      .collection('site_visits')
      .find({})
      .sort({ scheduled_at: -1 })
      .toArray();

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id || d._id.toString(),
        lead_id: d.lead_id || null,
        visitor_name: d.visitor_name,
        visitor_phone: d.visitor_phone,
        visitor_email: d.visitor_email || null,
        project_name: d.project_name,
        scheduled_at: d.scheduled_at,
        pickup_required: Boolean(d.pickup_required),
        pickup_location: d.pickup_location || null,
        driver_name: d.driver_name || null,
        vehicle_number: d.vehicle_number || null,
        assigned_executive: d.assigned_executive || 'Priya Raman',
        status: d.status || 'scheduled',
        feedback: d.feedback || null,
        interest_level: d.interest_level || null,
        plots_shown: d.plots_shown || [],
        notes: d.notes || null,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }

    // 2. Resilient fallback: fetch from webhook_logs where source = 'site_visit'
    try {
      const logVisits = await db
        .collection('webhook_logs')
        .find({ source: 'site_visit' })
        .sort({ created_at: -1 })
        .toArray();

      if (logVisits && logVisits.length > 0) {
        return logVisits.map((l: any) => l.payload as SiteVisitItem).filter(Boolean);
      }
    } catch {
      // ignore
    }

    return [];
  } catch (err: any) {
    console.error('Error fetching site visits from MongoDB:', err);
    return [];
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

    const db = await getDatabase();
    await db.collection('site_visits').insertOne({
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
      created_at: newVisit.created_at,
      updated_at: newVisit.updated_at,
    });

    // If linked to lead, synchronize lead status, activities, and history in MongoDB
    if (newVisit.lead_id) {
      await db.collection('leads').updateOne(
        { id: newVisit.lead_id },
        { $set: { status: 'site_visit_scheduled', updated_at: new Date().toISOString() } }
      );

      try {
        await db.collection('activities').insertOne({
          id: `act-${Date.now()}`,
          lead_id: newVisit.lead_id,
          type: 'site_visit',
          outcome: 'Site Visit Scheduled',
          notes: `Site visit scheduled for ${new Date(newVisit.scheduled_at).toLocaleString('en-IN')} at ${newVisit.project_name}.${newVisit.pickup_required ? ` Pickup: ${newVisit.pickup_location}` : ''}`,
          created_by: userDisplay,
          created_at: new Date().toISOString(),
        });

        await db.collection('lead_status_history').insertOne({
          id: `sh-${Date.now()}`,
          lead_id: newVisit.lead_id,
          from_status: 'qualified',
          to_status: 'site_visit_scheduled',
          comment: `Site visit scheduled for ${new Date(newVisit.scheduled_at).toLocaleDateString('en-IN')}`,
          changed_by: userDisplay,
          created_at: new Date().toISOString(),
        });
      } catch {
        // ignore sub-table errors
      }
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

    const db = await getDatabase();
    const updatedAt = new Date().toISOString();

    await db.collection('site_visits').updateOne(
      { id: visitId },
      {
        $set: {
          status: payload.status,
          feedback: payload.feedback?.trim() || null,
          interest_level: payload.interest_level || null,
          plots_shown: payload.plots_shown || [],
          notes: payload.notes?.trim() || null,
          updated_at: updatedAt,
        },
      }
    );

    const updatedDoc = await db.collection('site_visits').findOne({ id: visitId });
    const targetVisit: SiteVisitItem | undefined = updatedDoc
      ? {
          id: updatedDoc.id,
          lead_id: updatedDoc.lead_id,
          visitor_name: updatedDoc.visitor_name,
          visitor_phone: updatedDoc.visitor_phone,
          visitor_email: updatedDoc.visitor_email,
          project_name: updatedDoc.project_name,
          scheduled_at: updatedDoc.scheduled_at,
          pickup_required: updatedDoc.pickup_required,
          pickup_location: updatedDoc.pickup_location,
          driver_name: updatedDoc.driver_name,
          vehicle_number: updatedDoc.vehicle_number,
          assigned_executive: updatedDoc.assigned_executive,
          status: updatedDoc.status,
          feedback: updatedDoc.feedback,
          interest_level: updatedDoc.interest_level,
          plots_shown: updatedDoc.plots_shown,
          notes: updatedDoc.notes,
          created_at: updatedDoc.created_at,
          updated_at: updatedDoc.updated_at,
        }
      : undefined;

    // If marked completed and has a linked lead, update lead in MongoDB
    const linkedLeadId = targetVisit?.lead_id;
    if (linkedLeadId && payload.status === 'completed') {
      await db.collection('leads').updateOne(
        { id: linkedLeadId },
        {
          $set: {
            status: payload.interest_level === 'booked' ? 'booked' : 'site_visit_completed',
            quality: payload.interest_level === 'hot' ? 'hot' : payload.interest_level === 'warm' ? 'warm' : undefined,
            updated_at: updatedAt,
          },
        }
      );

      try {
        await db.collection('activities').insertOne({
          id: `act-${Date.now()}`,
          lead_id: linkedLeadId,
          type: 'site_visit',
          outcome: `Site Visit Completed - Interest: ${(payload.interest_level || 'warm').toUpperCase()}`,
          notes: `Customer Feedback: "${payload.feedback || 'Tour completed smoothly.'}". Plots inspected: ${(payload.plots_shown || []).join(', ') || 'N/A'}.`,
          created_by: userDisplay,
          created_at: updatedAt,
        });
      } catch {}
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

    const db = await getDatabase();
    await db.collection('site_visits').deleteOne({ id: visitId });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

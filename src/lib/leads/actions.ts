'use server';

import { getDatabase } from '@/lib/mongodb';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { LeadDetailed, ActivityItem, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { LeadStatusType } from '@/components/leads/status-change-modal';
import { validateIndianPhoneNumber, getCorePhoneDigits } from '@/lib/security/phone';

// Fetch all leads directly from MongoDB database
export async function fetchLeadsAction(): Promise<LeadDetailed[]> {
  try {
    const db = await getDatabase();
    const dbLeads = await db
      .collection('leads')
      .find({ $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }] })
      .sort({ created_at: -1 })
      .toArray();

    if (!dbLeads || dbLeads.length === 0) {
      return [];
    }

    const leadIds = dbLeads.map((l) => l.id || l._id.toString());
    const leadPhones = dbLeads.map((l) => l.phone).filter(Boolean);

    // Fetch all related status history, activities & site visits in parallel
    const [allHistory, allActivities, allVisits] = await Promise.all([
      db.collection('lead_status_history').find({ lead_id: { $in: leadIds } }).toArray(),
      db.collection('activities').find({ lead_id: { $in: leadIds } }).toArray(),
      db.collection('site_visits').find({
        $or: [
          { lead_id: { $in: leadIds } },
          { visitor_phone: { $in: leadPhones } },
        ],
      }).toArray(),
    ]);

    const mappedDbLeads: LeadDetailed[] = dbLeads.map((l: any) => {
      const currentLeadId = l.id || l._id.toString();

      // Map database status history
      const dbHistory: StatusHistoryItem[] = allHistory
        .filter((sh: any) => sh.lead_id === currentLeadId)
        .map((sh: any) => ({
          id: sh.id || sh._id.toString(),
          from_status: sh.from_status || null,
          to_status: sh.to_status,
          comment: sh.comment || '',
          changed_by: sh.changed_by || 'System',
          created_at: sh.created_at,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Map database activities
      const dbActivities: ActivityItem[] = allActivities
        .filter((act: any) => act.lead_id === currentLeadId)
        .map((act: any) => ({
          id: act.id || act._id.toString(),
          type: act.type || 'note',
          outcome: act.outcome || '',
          notes: act.notes || '',
          created_by: act.created_by || 'System',
          created_at: act.created_at,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Map database site visit
      const leadVisits = allVisits.filter(
        (v: any) => v.lead_id === currentLeadId || (v.visitor_phone && getCorePhoneDigits(v.visitor_phone) === getCorePhoneDigits(l.phone))
      );
      const latestScheduledVisit = leadVisits.find((v: any) => v.status === 'scheduled') || leadVisits[0];
      const scheduledVisitDate = latestScheduledVisit ? latestScheduledVisit.scheduled_at : (l.scheduled_visit_date || null);

      let projName = l.project_name || 'Kyra Farmlands';
      if (projName === 'KYRA_GROUP_INDIA' || projName === 'KYRA GROUP INDIA') {
        projName = 'Kyra Farmlands';
      }

      let rawSrc = (l.source || '').toLowerCase();
      let src = (!rawSrc || rawSrc === 'webhook' || rawSrc === 'website' || rawSrc === 'landing_page') ? 'contact_form' : l.source;

      let city = l.city || 'Coimbatore';
      let region = l.region || 'Tamil Nadu';
      let country = l.country || 'India';
      let locationStr = l.location || `${city}${region ? `, ${region}` : ''}`;

      return {
        id: currentLeadId,
        full_name: l.full_name,
        phone: l.phone,
        email: l.email || '',
        city: city,
        region: region,
        country: country,
        location: locationStr,
        ip: l.ip || '',
        source: src,
        campaign_name: l.campaign_name || '',
        project_name: projName,
        budget_range: l.budget_range || '₹35L - ₹50L',
        purpose: l.purpose || 'farmhouse',
        status: l.status || 'new',
        quality: l.quality || 'warm',
        assigned_to_name: l.assigned_to_name || 'Unassigned',
        created_at: l.created_at,
        scheduled_visit_date: scheduledVisitDate,
        status_history: dbHistory,
        activities: dbActivities,
      };
    });

    return mappedDbLeads;
  } catch (err: any) {
    console.warn('Fetch leads exception from MongoDB:', err?.message);
    return [];
  }
}

export async function createLeadAction(newLead: LeadDetailed): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newLead.id) {
      newLead.id = crypto.randomUUID();
    }

    // Validate phone number
    const phoneCheck = validateIndianPhoneNumber(newLead.phone);
    if (!phoneCheck.isValid && newLead.status === 'new') {
      newLead.status = 'number_not_valid';
    }

    const db = await getDatabase();

    // Duplicate check
    if (phoneCheck.isValid && newLead.status === 'new') {
      const existingLeads = await db
        .collection('leads')
        .find({ $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }] })
        .project({ id: 1, phone: 1 })
        .toArray();

      const isDuplicate = existingLeads.some(
        (l: any) => l.id !== newLead.id && getCorePhoneDigits(l.phone) === phoneCheck.cleanDigits
      );
      if (isDuplicate) {
        newLead.status = 'duplicate_number';
      }
    }

    await db.collection('leads').insertOne({
      id: newLead.id,
      full_name: newLead.full_name,
      phone: newLead.phone,
      email: newLead.email || '',
      city: newLead.city || 'Coimbatore',
      region: newLead.region || 'Tamil Nadu',
      country: newLead.country || 'India',
      location: newLead.location || `${newLead.city || 'Coimbatore'}, ${newLead.region || 'Tamil Nadu'}`,
      ip: newLead.ip || '',
      project_name: newLead.project_name,
      source: newLead.source || 'manual',
      campaign_name: newLead.campaign_name || '',
      budget_range: newLead.budget_range,
      purpose: newLead.purpose,
      status: newLead.status,
      quality: newLead.quality,
      assigned_to_name: newLead.assigned_to_name,
      created_at: newLead.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Persist initial status history in MongoDB
    if (newLead.status_history && newLead.status_history.length > 0) {
      const historyDocs = newLead.status_history.map((hist) => ({
        id: hist.id || `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lead_id: newLead.id,
        from_status: hist.from_status || null,
        to_status: hist.to_status,
        comment: hist.comment || 'Lead created',
        changed_by: hist.changed_by || 'Current User',
        created_at: hist.created_at || new Date().toISOString(),
      }));
      await db.collection('lead_status_history').insertMany(historyDocs);
    }

    // Persist initial activities in MongoDB
    if (newLead.activities && newLead.activities.length > 0) {
      const activityDocs = newLead.activities.map((act) => ({
        id: act.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lead_id: newLead.id,
        type: act.type,
        outcome: act.outcome || '',
        notes: act.notes,
        created_by: act.created_by || 'Current User',
        created_at: act.created_at || new Date().toISOString(),
      }));
      await db.collection('activities').insertMany(activityDocs);
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
    const db = await getDatabase();
    
    // Fetch current lead to get from_status
    const existingLead = await db.collection('leads').findOne({ id: leadId });
    const fromStatus = existingLead?.status || null;

    await db.collection('leads').updateOne(
      { id: leadId },
      { $set: { status: newStatus, updated_at: new Date().toISOString() } }
    );

    await db.collection('lead_status_history').insertOne({
      id: `sh-${Date.now()}`,
      lead_id: leadId,
      from_status: fromStatus,
      to_status: newStatus,
      comment: comment,
      changed_by: changedBy,
      created_at: new Date().toISOString(),
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
    const db = await getDatabase();
    await db.collection('activities').insertOne({
      id: `act-${Date.now()}`,
      lead_id: leadId,
      type: type,
      outcome: outcome,
      notes: notes,
      created_by: createdBy,
      created_at: new Date().toISOString(),
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

  try {
    const db = await getDatabase();

    // Clean up linked child records
    await Promise.allSettled([
      db.collection('lead_status_history').deleteMany({ lead_id: leadId }),
      db.collection('activities').deleteMany({ lead_id: leadId }),
      db.collection('webhook_logs').deleteMany({ lead_id: leadId }),
      db.collection('site_visits').deleteMany({ lead_id: leadId }),
      db.collection('leads').deleteOne({ id: leadId }),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete lead from MongoDB.' };
  }
}

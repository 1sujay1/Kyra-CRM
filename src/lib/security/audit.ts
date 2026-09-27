import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { Json } from '@/types/database.types';

export interface AuditLogParams {
  orgId: string;
  userId?: string | null;
  action:
    | 'login'
    | 'lead_view'
    | 'phone_reveal'
    | 'status_change'
    | 'assignment_change'
    | 'lead_create'
    | 'lead_update'
    | 'lead_delete'
    | 'export'
    | 'booking_create'
    | 'booking_approve';
  entity: 'lead' | 'booking' | 'user' | 'project' | 'export';
  entityId?: string | null;
  metadata?: Record<string, Json>;
  ip?: string | null;
}

/**
 * Record a security audit log entry.
 * Runs with admin client to ensure append-only compliance even if user has restricted table perms.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      org_id: params.orgId,
      user_id: params.userId || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip: params.ip || null,
    });
  } catch (error) {
    // Non-blocking for primary transaction, but logged server-side
    console.error('[AUDIT_LOG_FAILURE]: Unable to record audit log', error);
  }
}

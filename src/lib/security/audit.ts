import 'server-only';
import { getDatabase } from '@/lib/mongodb';

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
  metadata?: Record<string, any>;
  ip?: string | null;
}

/**
 * Record a security audit log entry in MongoDB database.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection('audit_logs').insertOne({
      org_id: params.orgId,
      user_id: params.userId || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip: params.ip || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AUDIT_LOG_FAILURE]: Unable to record audit log in MongoDB', error);
  }
}

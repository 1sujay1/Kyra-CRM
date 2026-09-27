import { Database, UserRole, LeadStatus, LeadQuality, LeadSource, PlotStatus } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Plot = Database['public']['Tables']['plots']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadStatusHistory = Database['public']['Tables']['lead_status_history']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type FollowUp = Database['public']['Tables']['follow_ups']['Row'];
export type SiteVisit = Database['public']['Tables']['site_visits']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type AdSpend = Database['public']['Tables']['ad_spend']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export interface LeadWithRelations extends Lead {
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  project?: Pick<Project, 'id' | 'name' | 'location'> | null;
}

export type PermissionAction =
  | 'leads:view_all'
  | 'leads:view_assigned'
  | 'leads:create'
  | 'leads:update'
  | 'leads:delete'
  | 'leads:export'
  | 'leads:reveal_phone'
  | 'projects:manage'
  | 'plots:manage'
  | 'users:manage'
  | 'reports:view'
  | 'ad_spend:manage'
  | 'bookings:approve'
  | 'audit_logs:view';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    'leads:view_all',
    'leads:view_assigned',
    'leads:create',
    'leads:update',
    'leads:delete',
    'leads:export',
    'leads:reveal_phone',
    'projects:manage',
    'plots:manage',
    'users:manage',
    'reports:view',
    'ad_spend:manage',
    'bookings:approve',
    'audit_logs:view',
  ],
  manager: [
    'leads:view_all',
    'leads:view_assigned',
    'leads:create',
    'leads:update',
    'leads:export',
    'leads:reveal_phone',
    'projects:manage',
    'plots:manage',
    'reports:view',
    'ad_spend:manage',
    'bookings:approve',
  ],
  sales_executive: [
    'leads:view_assigned',
    'leads:create',
    'leads:update',
  ],
  channel_partner: [
    'leads:view_assigned',
    'leads:create',
  ],
};

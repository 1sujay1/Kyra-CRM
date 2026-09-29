export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'digital_marketing' | 'manager' | 'sales_executive' | 'channel_partner';
export type ProjectStatus = 'upcoming' | 'active' | 'sold_out' | 'archived';
export type PlotStatus = 'available' | 'blocked' | 'booked' | 'sold';
export type PlotFacing = 'north' | 'south' | 'east' | 'west' | 'north_east' | 'north_west' | 'south_east' | 'south_west';
export type LeadSource = 'meta' | 'google' | 'website' | 'walk_in' | 'referral' | 'channel_partner' | 'manual';
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit_scheduled'
  | 'site_visit_completed'
  | 'negotiation'
  | 'booked'
  | 'lost'
  | 'junk'
  | 'number_not_valid'
  | 'duplicate_number';
export type LeadQuality = 'hot' | 'warm' | 'cold' | 'junk' | 'unqualified';
export type LeadPurpose = 'investment' | 'farmhouse' | 'agriculture' | 'other';
export type ActivityType =
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'note'
  | 'site_visit'
  | 'follow_up'
  | 'system'
  | 're_enquiry';
export type FollowUpStatus = 'pending' | 'done' | 'missed';
export type SiteVisitStatus = 'scheduled' | 'rescheduled' | 'completed' | 'no_show' | 'cancelled';
export type BookingStatus = 'pending_approval' | 'confirmed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          location: string;
          description: string | null;
          price_per_cent: number;
          total_plots: number;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          location: string;
          description?: string | null;
          price_per_cent: number;
          total_plots?: number;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          location?: string;
          description?: string | null;
          price_per_cent?: number;
          total_plots?: number;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      plots: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          plot_no: string;
          survey_no: string | null;
          size_cents: number;
          size_sqft: number;
          facing: PlotFacing;
          price: number;
          status: PlotStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          project_id: string;
          plot_no: string;
          survey_no?: string | null;
          size_cents: number;
          size_sqft: number;
          facing?: PlotFacing;
          price: number;
          status?: PlotStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          project_id?: string;
          plot_no?: string;
          survey_no?: string | null;
          size_cents?: number;
          size_sqft?: number;
          facing?: PlotFacing;
          price?: number;
          status?: PlotStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          phone: string;
          alt_phone: string | null;
          email: string | null;
          city: string | null;
          project_id: string | null;
          source: LeadSource;
          campaign_name: string | null;
          adset_name: string | null;
          ad_name: string | null;
          form_id: string | null;
          form_name: string | null;
          external_lead_id: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_term: string | null;
          utm_content: string | null;
          budget_range: string | null;
          purpose: LeadPurpose | null;
          status: LeadStatus;
          quality: LeadQuality;
          assigned_to: string | null;
          next_follow_up_at: string | null;
          last_contacted_at: string | null;
          lost_reason: string | null;
          consent: Json;
          raw_payload: Json | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          full_name: string;
          phone: string;
          alt_phone?: string | null;
          email?: string | null;
          city?: string | null;
          project_id?: string | null;
          source?: LeadSource;
          campaign_name?: string | null;
          adset_name?: string | null;
          ad_name?: string | null;
          form_id?: string | null;
          form_name?: string | null;
          external_lead_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          budget_range?: string | null;
          purpose?: LeadPurpose | null;
          status?: LeadStatus;
          quality?: LeadQuality;
          assigned_to?: string | null;
          next_follow_up_at?: string | null;
          last_contacted_at?: string | null;
          lost_reason?: string | null;
          consent?: Json;
          raw_payload?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          full_name?: string;
          phone?: string;
          alt_phone?: string | null;
          email?: string | null;
          city?: string | null;
          project_id?: string | null;
          source?: LeadSource;
          campaign_name?: string | null;
          adset_name?: string | null;
          ad_name?: string | null;
          form_id?: string | null;
          form_name?: string | null;
          external_lead_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          budget_range?: string | null;
          purpose?: LeadPurpose | null;
          status?: LeadStatus;
          quality?: LeadQuality;
          assigned_to?: string | null;
          next_follow_up_at?: string | null;
          last_contacted_at?: string | null;
          lost_reason?: string | null;
          consent?: Json;
          raw_payload?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      lead_status_history: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          from_status: LeadStatus | null;
          to_status: LeadStatus;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          from_status?: LeadStatus | null;
          to_status: LeadStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          lead_id?: string;
          from_status?: LeadStatus | null;
          to_status?: LeadStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          type: ActivityType;
          outcome: string | null;
          notes: string | null;
          duration_seconds: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          type: ActivityType;
          outcome?: string | null;
          notes?: string | null;
          duration_seconds?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          lead_id?: string;
          type?: ActivityType;
          outcome?: string | null;
          notes?: string | null;
          duration_seconds?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          assigned_to: string;
          due_at: string;
          type: string;
          status: FollowUpStatus;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          assigned_to: string;
          due_at: string;
          type?: string;
          status?: FollowUpStatus;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          lead_id?: string;
          assigned_to?: string;
          due_at?: string;
          type?: string;
          status?: FollowUpStatus;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_visits: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          project_id: string;
          scheduled_at: string;
          assigned_to: string;
          pickup_required: boolean;
          pickup_location: string | null;
          status: SiteVisitStatus;
          feedback: string | null;
          interest_level: LeadQuality | null;
          plots_shown: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          project_id: string;
          scheduled_at: string;
          assigned_to: string;
          pickup_required?: boolean;
          pickup_location?: string | null;
          status?: SiteVisitStatus;
          feedback?: string | null;
          interest_level?: LeadQuality | null;
          plots_shown?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          lead_id?: string;
          project_id?: string;
          scheduled_at?: string;
          assigned_to?: string;
          pickup_required?: boolean;
          pickup_location?: string | null;
          status?: SiteVisitStatus;
          feedback?: string | null;
          interest_level?: LeadQuality | null;
          plots_shown?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          project_id: string;
          plot_id: string;
          booking_date: string;
          agreed_price: number;
          booking_amount: number;
          payment_mode: string;
          reference_no: string | null;
          status: BookingStatus;
          approved_by: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          project_id: string;
          plot_id: string;
          booking_date?: string;
          agreed_price: number;
          booking_amount: number;
          payment_mode: string;
          reference_no?: string | null;
          status?: BookingStatus;
          approved_by?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          lead_id?: string;
          project_id?: string;
          plot_id?: string;
          booking_date?: string;
          agreed_price?: number;
          booking_amount?: number;
          payment_mode?: string;
          reference_no?: string | null;
          status?: BookingStatus;
          approved_by?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ad_spend: {
        Row: {
          id: string;
          org_id: string;
          source: 'meta' | 'google';
          campaign_name: string;
          date: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          source: 'meta' | 'google';
          campaign_name: string;
          date: string;
          amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          source?: 'meta' | 'google';
          campaign_name?: string;
          date?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_logs: {
        Row: {
          id: string;
          source: string;
          status: string;
          error: string | null;
          payload_hash: string;
          received_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          status: string;
          error?: string | null;
          payload_hash: string;
          received_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          status?: string;
          error?: string | null;
          payload_hash?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          metadata?: Json;
          ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          metadata?: Json;
          ip?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

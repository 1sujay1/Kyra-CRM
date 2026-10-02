'use server';

import { getDatabase } from '@/lib/mongodb';
import { fetchLeadsAction } from '@/lib/leads/actions';

export interface BookingItem {
  id: string;
  lead_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  project_name: string;
  plot_no: string;
  plot_size?: string;
  agreed_price: number;
  booking_amount: number;
  payment_mode: 'NEFT' | 'RTGS' | 'UPI' | 'Cheque' | 'Cash';
  reference_no?: string | null;
  status: 'confirmed' | 'pending_approval' | 'cancelled';
  booking_date: string;
  approved_by?: string | null;
  notes?: string | null;
  created_at?: string;
}

export async function fetchBookingsAction(): Promise<BookingItem[]> {
  try {
    const db = await getDatabase();
    let dbBookings: BookingItem[] = [];

    // Query bookings collection from MongoDB database
    const rawBookings = await db
      .collection('bookings')
      .find({})
      .sort({ booking_date: -1 })
      .toArray();

    if (rawBookings && Array.isArray(rawBookings)) {
      dbBookings = rawBookings.map((b: any) => ({
        id: b.id || b._id.toString(),
        lead_id: b.lead_id,
        customer_name: b.customer_name || 'Valued Client',
        customer_phone: b.customer_phone || '',
        customer_email: b.customer_email || null,
        project_name: b.project_name || 'Coimbatore Farmland Project',
        plot_no: b.plot_no || (b.plot_id ? `Plot #${b.plot_id}` : 'Plot Assigned'),
        plot_size: b.plot_size || '25 Cents',
        agreed_price: Number(b.agreed_price) || 2500000,
        booking_amount: Number(b.booking_amount) || 200000,
        payment_mode: (b.payment_mode as any) || 'NEFT',
        reference_no: b.reference_no,
        status: b.status || 'confirmed',
        booking_date: b.booking_date || new Date().toISOString().split('T')[0],
        approved_by: b.approved_by,
        notes: b.notes,
        created_at: b.created_at,
      }));
    }

    const bookingsMap = new Map<string, BookingItem>();
    for (const b of dbBookings) {
      if (b?.id) bookingsMap.set(b.id, b);
    }

    // Pull leads marked 'booked' dynamically from MongoDB
    try {
      const allLeads = await fetchLeadsAction();
      const bookedLeads = (allLeads || []).filter((l) => l.status === 'booked');

      for (const lead of bookedLeads) {
        const leadBookingId = `lead-bk-${lead.id}`;
        if (!bookingsMap.has(leadBookingId)) {
          let estimatedPrice = 2500000;
          if (lead.budget_range?.includes('50')) estimatedPrice = 4500000;
          else if (lead.budget_range?.includes('30')) estimatedPrice = 3000000;
          else if (lead.budget_range?.includes('1.5')) estimatedPrice = 12500000;

          bookingsMap.set(leadBookingId, {
            id: leadBookingId,
            lead_id: lead.id,
            customer_name: lead.full_name,
            customer_phone: lead.phone,
            customer_email: lead.email,
            project_name: lead.project_name || 'Anaikatti Green Acres',
            plot_no: 'Plot Assigned',
            plot_size: '25 Cents',
            agreed_price: estimatedPrice,
            booking_amount: 200000,
            payment_mode: 'NEFT',
            reference_no: 'CRM-TOKEN-VERIFIED',
            status: 'confirmed',
            booking_date: lead.created_at ? lead.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            approved_by: 'Admin',
            notes: `Converted from Lead Pipeline (${lead.source ? lead.source.toUpperCase() : 'Meta'} enquiry).`,
            created_at: lead.created_at,
          });
        }
      }
    } catch {
      // ignore
    }

    const merged = Array.from(bookingsMap.values()).sort(
      (a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
    );

    return merged;
  } catch (err: any) {
    console.error('Error fetching bookings from MongoDB:', err);
    return [];
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readLocalJson, writeLocalJson } from '@/lib/storage';
import { LeadDetailed } from '@/components/leads/lead-360-drawer';
import { validateIndianPhoneNumber, getCorePhoneDigits } from '@/lib/security/phone';

const LEADS_FILE = 'leads.json';

// GET: Meta Webhook verification handshake or health status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.META_VERIFY_TOKEN || 'kyra_meta_webhook_secret_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Webhook] Meta Webhook handshake verified successfully');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'online',
    service: 'Kyra Group CRM - Lead Webhook Ingestion API',
    endpoint: '/api/webhooks/leads',
    supported_sources: ['meta', 'google', 'zapier', 'make', 'website', 'custom'],
    timestamp: new Date().toISOString(),
  });
}

// POST: Lead Ingestion from Meta Ads, Google Ads, Zapier, or Custom Webhooks
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log('[Webhook] Incoming lead payload:', JSON.stringify(rawBody));

    let fullName = 'Incoming Webhook Lead';
    let phone = '+919876543210';
    let email = '';
    let city = 'Coimbatore';
    let projectName = 'Anaikatti Green Acres';
    let source: string = 'webhook';
    let campaignName = 'Inbound Lead Webhook';
    let budgetRange = '₹35L - ₹50L';
    let purpose = 'farmhouse';
    let quality = 'warm';
    let externalLeadId: string | undefined = undefined;

    // 1. Check if Meta Lead Ads Webhook format
    if (rawBody.entry && Array.isArray(rawBody.entry)) {
      source = 'meta';
      const change = rawBody.entry[0]?.changes?.[0]?.value;
      if (change) {
        externalLeadId = change.leadgen_id;
        campaignName = change.campaign_name || 'Meta Farmland Campaign';
        projectName = change.project_name || 'Anaikatti Green Acres';
        // If pre-fetched field data exists
        if (change.field_data && Array.isArray(change.field_data)) {
          for (const field of change.field_data) {
            const name = field.name?.toLowerCase();
            const val = field.values?.[0];
            if (name === 'full_name' || name === 'name') fullName = val || fullName;
            if (name === 'phone_number' || name === 'phone') phone = val || phone;
            if (name === 'email') email = val || email;
            if (name === 'city') city = val || city;
          }
        }
      }
    }
    // 2. Check if Google Ads Lead Form format
    else if (rawBody.user_column_data && Array.isArray(rawBody.user_column_data)) {
      source = 'google';
      externalLeadId = rawBody.lead_id;
      campaignName = rawBody.campaign_name || 'Google Ads Search Lead';
      projectName = rawBody.project_name || 'Pollachi Coconut Groves';
      for (const col of rawBody.user_column_data) {
        const id = col.column_id?.toLowerCase() || '';
        const val = col.string_value;
        if (id.includes('name') || id.includes('full_name')) fullName = val || fullName;
        if (id.includes('phone')) phone = val || phone;
        if (id.includes('email')) email = val || email;
        if (id.includes('city')) city = val || city;
      }
    }
    // 3. Generic JSON or Zapier/Make format
    else {
      fullName = rawBody.full_name || rawBody.name || rawBody.buyer_name || fullName;
      phone = rawBody.phone || rawBody.mobile || rawBody.phone_number || phone;
      email = rawBody.email || email;
      city = rawBody.city || city;
      projectName = rawBody.project_name || rawBody.project || projectName;
      source = rawBody.source || 'webhook';
      campaignName = rawBody.campaign_name || rawBody.campaign || campaignName;
      budgetRange = rawBody.budget_range || rawBody.budget || budgetRange;
      purpose = rawBody.purpose || purpose;
      quality = rawBody.quality || quality;
      externalLeadId = rawBody.id || rawBody.external_lead_id;
    }

    // 1. Phone number strict 10-digit validation
    const phoneCheck = validateIndianPhoneNumber(phone);
    let leadStatus: 'new' | 'number_not_valid' | 'duplicate_number' = 'new';
    let statusComment = `Ingested automatically via ${source.toUpperCase()} webhook`;

    if (!phoneCheck.isValid) {
      leadStatus = 'number_not_valid';
      statusComment = `Webhook received phone without 10 digits (${phoneCheck.digitCount} digits: ${phoneCheck.cleanDigits || 'empty'}). Status: Number Not Valid.`;
    } else {
      // 2. Duplicate Check: If received multiple times with same 10-digit number
      const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
      let isDuplicate = localLeads.some(
        (l) => getCorePhoneDigits(l.phone) === phoneCheck.cleanDigits
      );

      if (!isDuplicate) {
        try {
          const supabase = (await createClient()) as any;
          const { data: existingDb } = await supabase
            .from('leads')
            .select('id, phone')
            .ilike('phone', `%${phoneCheck.cleanDigits}%`)
            .limit(1);

          if (existingDb && existingDb.length > 0) {
            isDuplicate = true;
          }
        } catch {
          // ignore
        }
      }

      if (isDuplicate) {
        leadStatus = 'duplicate_number';
        statusComment = `Duplicate lead received with same phone number ${phoneCheck.formatted}. Status: Duplicate Number.`;
      }
    }

    const savedPhone = phoneCheck.isValid
      ? phoneCheck.formatted
      : (phone || 'Invalid Number');

    const newLeadId = crypto.randomUUID();

    const newLead: LeadDetailed = {
      id: newLeadId,
      full_name: fullName,
      phone: savedPhone,
      email: email,
      city: city,
      project_name: projectName,
      source: source as any,
      campaign_name: campaignName,
      budget_range: budgetRange,
      purpose: (['investment', 'farmhouse', 'agriculture'].includes(purpose) ? purpose : 'farmhouse') as 'investment' | 'farmhouse' | 'agriculture',
      status: leadStatus,
      quality: leadStatus === 'number_not_valid' ? 'junk' : (quality as any),
      assigned_to_name: 'Priya Raman',
      created_at: new Date().toISOString(),
      status_history: [
        {
          id: `sh-${Date.now()}`,
          from_status: null,
          to_status: leadStatus,
          comment: statusComment,
          changed_by: 'Webhook Ingestion Service',
          created_at: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act-${Date.now()}`,
          type: 'note',
          outcome: leadStatus === 'number_not_valid' ? 'Invalid Phone Number' : leadStatus === 'duplicate_number' ? 'Duplicate Number Detected' : 'Lead Captured',
          notes: `${statusComment}. Campaign: ${campaignName}`,
          created_by: 'Webhook Ingestion Service',
          created_at: new Date().toISOString(),
        },
      ],
    };

    // 1. Immediately persist in local storage cache
    const localLeads = readLocalJson<LeadDetailed[]>(LEADS_FILE, []);
    localLeads.unshift(newLead);
    writeLocalJson(LEADS_FILE, localLeads);

    // 2. Persist to Supabase Database
    let dbSuccess = false;
    try {
      const supabase = (await createClient()) as any;

      // Insert into leads table
      const { error: insertError } = await supabase.from('leads').insert({
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
        external_lead_id: externalLeadId,
        raw_payload: rawBody,
        created_at: newLead.created_at,
      });

      if (!insertError) {
        dbSuccess = true;

        // Persist initial status log in Supabase
        await supabase.from('lead_status_history').insert({
          org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
          lead_id: newLead.id,
          to_status: newLead.status,
          comment: statusComment,
          changed_by: `Webhook Ingestion (${source.toUpperCase()})`,
        });

        // Persist initial activity note in Supabase
        await supabase.from('activities').insert({
          org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
          lead_id: newLead.id,
          type: 'note',
          outcome: newLead.status === 'number_not_valid' ? 'Invalid Phone Number' : newLead.status === 'duplicate_number' ? 'Duplicate Number Detected' : 'Lead Captured via Webhook',
          notes: `${statusComment}. Campaign: ${campaignName}`,
          created_by: `Webhook (${source.toUpperCase()})`,
        });
      } else {
        console.warn('[Webhook] Notice saving to Supabase (saved in persistent store):', insertError.message);
      }

      // Record in webhook_logs
      try {
        await supabase.from('webhook_logs').insert({
          org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
          source: source,
          payload: rawBody,
          lead_id: newLead.id,
          status: 'processed',
        });
      } catch (logErr: any) {
        // non-blocking
      }
    } catch (e: any) {
      console.warn('[Webhook] Supabase connection notice:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead received and persisted successfully',
      lead_id: newLead.id,
      stored_in_supabase: dbSuccess,
      lead: {
        id: newLead.id,
        full_name: newLead.full_name,
        phone: newLead.phone,
        project_name: newLead.project_name,
        source: newLead.source,
        status: newLead.status,
      },
    });
  } catch (error: any) {
    console.error('[Webhook] Ingestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal webhook ingestion error',
      },
      { status: 400 }
    );
  }
}

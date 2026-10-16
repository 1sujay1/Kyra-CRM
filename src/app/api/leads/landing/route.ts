import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { validateIndianPhoneNumber, getCorePhoneDigits } from '@/lib/security/phone';
import { sendLeadEmailNotification } from '@/lib/email/nodemailer';

// Helper CORS headers for cross-origin landing page requests
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// OPTIONS preflight handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// POST: Landing Page Contact Form Lead Submission
export async function POST(req: NextRequest) {
  console.log('📥 [CRM Landing API Step 1] Incoming POST request received:', {
    url: req.url,
    method: req.method,
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    userAgent: req.headers.get('user-agent'),
  });

  try {
    const body = await req.json();
    console.log('📦 [CRM Landing API Step 2] Parsed JSON body:', body);

    const fullName = (body.name || body.full_name || body.buyer_name || '').trim();
    const rawPhone = (body.phone || body.mobile || body.phone_number || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const message = (body.message || '').trim();
    const pageUrl = body.page_url || req.headers.get('referer') || '';
    let projectName = (body.project_name || body.project || '').trim();
    if (!projectName || projectName === 'KYRA GROUP INDIA' || projectName === 'KYRA_GROUP_INDIA') {
      if (pageUrl.includes('farmland.kyragroupindia.com') || pageUrl.includes('farmland')) {
        projectName = 'Kyra Farmlands';
      } else if (pageUrl.includes('kyragroupindia.com')) {
        projectName = 'Kyra Group India';
      } else {
        projectName = 'Kyra Farmlands';
      }
    }

    const campaignName = body.campaign_name || body.campaign || 'Landing Page Enquiry';
    const budgetRange = body.budget_range || body.budget || '₹35L - ₹50L';
    const purpose = body.purpose || 'farmhouse';
    const rawSource = (body.source || '').trim().toLowerCase();
    const source = (!rawSource || rawSource === 'webhook' || rawSource === 'website' || rawSource === 'landing_page') ? 'contact_form' : rawSource;

    console.log('👤 [CRM Landing API Step 3] Extracted fields:', { fullName, rawPhone, email, projectName, source, campaignName });

    if (!fullName || !rawPhone) {
      console.warn('⚠️ [CRM Landing API Step 3 REJECTED] Missing required name or phone number.');
      return NextResponse.json(
        { success: false, status: 400, message: 'Name and phone number are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Validate Indian phone number (10 digits)
    const phoneCheck = validateIndianPhoneNumber(rawPhone);
    let leadStatus: 'new' | 'number_not_valid' | 'duplicate_number' = 'new';
    let statusComment = `Ingested from Website Landing Page Enquiry`;

    console.log('📱 [CRM Landing API Step 4] Phone check result:', phoneCheck);

    if (!phoneCheck.isValid) {
      leadStatus = 'number_not_valid';
      statusComment = `Website form received phone without 10 valid digits (${rawPhone})`;
    } else {
      // 2. Duplicate Check in MongoDB leads collection
      try {
        const db = await getDatabase();
        const existingDb = await db
          .collection('leads')
          .find({
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
            phone: { $regex: phoneCheck.cleanDigits },
          })
          .limit(1)
          .toArray();

        if (existingDb && existingDb.length > 0) {
          leadStatus = 'duplicate_number';
          statusComment = `Duplicate website lead received for phone ${phoneCheck.formatted}`;
          console.log('ℹ️ [CRM Landing API Step 4] Flagged as duplicate number.');
        }
      } catch (err: any) {
        console.warn('⚠️ [CRM Landing API Step 4] Duplicate check notice:', err?.message);
      }
    }

    const savedPhone = phoneCheck.isValid ? phoneCheck.formatted : rawPhone;
    const headerIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '';
    const ip = body.ip || headerIp || '';
    const city = body.city || 'Coimbatore';
    const region = body.region || 'Tamil Nadu';
    const country = body.country || 'India';
    const locationStr = [city, region, country].filter(Boolean).join(', ');

    const newLeadId = crypto.randomUUID();
    const now = new Date().toISOString();

    console.log('🗄️ [CRM Landing API Step 5] Connecting to MongoDB and saving lead:', { newLeadId, leadStatus });
    const db = await getDatabase();

    // Insert into leads collection
    await db.collection('leads').insertOne({
      id: newLeadId,
      full_name: fullName,
      phone: savedPhone,
      email: email,
      city: city,
      region: region,
      country: country,
      ip: ip,
      location: locationStr,
      project_name: projectName,
      source: source,
      campaign_name: campaignName,
      budget_range: budgetRange,
      purpose: purpose,
      status: leadStatus,
      quality: leadStatus === 'number_not_valid' ? 'junk' : 'warm',
      assigned_to_name: 'Unassigned',
      created_at: now,
      updated_at: now,
    });

    // Insert initial status log in MongoDB
    await db.collection('lead_status_history').insertOne({
      id: `sh-${Date.now()}`,
      lead_id: newLeadId,
      to_status: leadStatus,
      comment: statusComment,
      changed_by: 'Website Landing Page API',
      created_at: now,
    });

    // Insert initial activity note in MongoDB
    await db.collection('activities').insertOne({
      id: `act-${Date.now()}`,
      lead_id: newLeadId,
      type: 'note',
      outcome: leadStatus === 'number_not_valid' ? 'Invalid Phone Number' : leadStatus === 'duplicate_number' ? 'Duplicate Lead' : 'Website Enquiry Captured',
      notes: `${statusComment}. Message: ${message || 'None'}`,
      created_by: 'Website Landing Page API',
      created_at: now,
    });

    console.log('✅ [CRM Landing API Step 5] MongoDB records created successfully for lead ID:', newLeadId);

    // Trigger Nodemailer Email Notification
    console.log('📧 [CRM Landing API Step 6] Dispatching Nodemailer email notification async...');
    sendLeadEmailNotification({
      lead_id: newLeadId,
      full_name: fullName,
      phone: savedPhone,
      email: email,
      project_name: projectName,
      source: 'Website Contact Form',
      campaign_name: campaignName,
      budget_range: budgetRange,
      purpose: purpose,
      message: message,
      visit_date: body.visit_date || null,
      page_url: pageUrl,
    })
      .then((res) => console.log('✅ [CRM Landing API Step 6 SUCCESS] Email notification dispatched:', res))
      .catch((mailErr) => console.error('❌ [CRM Landing API Step 6 FAILURE] Email notification exception:', mailErr));

    console.log('🎉 [CRM Landing API Step 7] Responding HTTP 200 OK to client.');

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Thank you for contacting us. We will get back to you soon.',
        lead_id: newLeadId,
        lead: {
          id: newLeadId,
          full_name: fullName,
          phone: savedPhone,
          email: email,
          project_name: projectName,
          status: leadStatus,
        },
      },
      { status: 200, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('💥 [CRM Landing API CATCH] Submission error:', { message: error?.message, stack: error?.stack });
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: error.message || 'Failed to submit request. Please try again later.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { validateIndianPhoneNumber, getCorePhoneDigits } from '@/lib/security/phone';

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
  try {
    const body = await req.json();

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

    if (!fullName || !rawPhone) {
      return NextResponse.json(
        { success: false, status: 400, message: 'Name and phone number are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Validate Indian phone number (10 digits)
    const phoneCheck = validateIndianPhoneNumber(rawPhone);
    let leadStatus: 'new' | 'number_not_valid' | 'duplicate_number' = 'new';
    let statusComment = `Ingested from Website Landing Page Enquiry`;

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
        }
      } catch (err: any) {
        console.warn('[Landing API] Duplicate check notice:', err?.message);
      }
    }

    const savedPhone = phoneCheck.isValid ? phoneCheck.formatted : rawPhone;
    const newLeadId = crypto.randomUUID();
    const now = new Date().toISOString();

    const db = await getDatabase();

    // Insert into leads collection
    await db.collection('leads').insertOne({
      id: newLeadId,
      full_name: fullName,
      phone: savedPhone,
      email: email,
      city: body.city || 'Coimbatore',
      project_name: projectName,
      source: source,
      campaign_name: campaignName,
      budget_range: budgetRange,
      purpose: purpose,
      status: leadStatus,
      quality: leadStatus === 'number_not_valid' ? 'junk' : 'warm',
      assigned_to_name: 'Priya Raman',
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
    console.error('[Landing API] Submission error:', error);
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

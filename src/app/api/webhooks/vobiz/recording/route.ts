import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getCorePhoneDigits } from '@/lib/security/phone';
import { processCallRecording } from '@/lib/voice/ai';

// Helper to extract params from GET query or POST body
async function extractRecordingData(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  let bodyParams: Record<string, any> = {};
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        bodyParams = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        bodyParams = Object.fromEntries(formData.entries());
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        bodyParams = Object.fromEntries(formData.entries());
      }
    } catch {
      // ignore
    }
  }

  const merged = { ...searchParams, ...bodyParams };

  const recordingUrl = (
    merged.RecordUrl ||
    merged.RecordingUrl ||
    merged.record_url ||
    merged.recording_url ||
    merged.RecordingURL ||
    merged.recordUrl ||
    ''
  ).toString().trim();

  const durationStr = (
    merged.RecordingDuration ||
    merged.duration ||
    merged.Duration ||
    merged.recording_duration ||
    '0'
  ).toString().trim();

  const callUuid = (
    merged.CallUUID ||
    merged.call_uuid ||
    merged.CallSid ||
    merged.callUuid ||
    ''
  ).toString().trim();

  const direction = (merged.direction || (merged.lead_id ? 'outbound' : 'inbound')).toString().toLowerCase().trim();
  const leadId = (merged.lead_id || '').toString().trim();
  const rawPhone = (
    merged.lead_phone ||
    merged.caller ||
    (direction === 'outbound' ? (merged.To || merged.to) : (merged.From || merged.from)) ||
    ''
  ).toString().trim();

  return {
    recordingUrl,
    duration: parseInt(durationStr, 10) || 0,
    callUuid,
    direction: direction === 'outbound' ? 'outbound' : 'inbound',
    leadId,
    rawPhone,
    raw: merged,
  };
}

export async function GET(req: NextRequest) {
  return handleRecordingWebhook(req);
}

export async function POST(req: NextRequest) {
  return handleRecordingWebhook(req);
}

async function handleRecordingWebhook(req: NextRequest) {
  const data = await extractRecordingData(req);
  console.log('🎙️ [Vobiz Recording Webhook] Received call recording event:', {
    recordingUrl: data.recordingUrl,
    duration: data.duration,
    callUuid: data.callUuid,
    direction: data.direction,
    leadId: data.leadId,
    rawPhone: data.rawPhone,
  });

  const db = await getDatabase();

  // Log to webhook_logs
  try {
    await db.collection('webhook_logs').insertOne({
      type: 'vobiz_recording_callback',
      recording_url: data.recordingUrl,
      duration: data.duration,
      call_uuid: data.callUuid,
      direction: data.direction,
      lead_id: data.leadId,
      raw_phone: data.rawPhone,
      raw_payload: data.raw,
      created_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn('⚠️ [Vobiz Recording] Failed to write webhook log:', logErr);
  }

  if (!data.recordingUrl) {
    return NextResponse.json({
      success: false,
      message: 'No recordingUrl found in callback payload',
    });
  }

  // Run Speech-to-Text via Groq Whisper and Summarization via Groq LLM
  console.log(`🎙️ [Vobiz Recording] Starting AI Transcription & Summarization for URL: ${data.recordingUrl}`);
  const aiResult = await processCallRecording(data.recordingUrl);
  console.log('✅ [Vobiz Recording] AI Result:', {
    success: aiResult.success,
    transcriptLength: aiResult.transcript.length,
    sentiment: aiResult.sentiment,
  });

  // Find target lead in database
  let targetLead: any = null;

  if (data.leadId) {
    targetLead = await db.collection('leads').findOne({ id: data.leadId });
  }

  if (!targetLead && data.rawPhone) {
    const cleanDigits = getCorePhoneDigits(data.rawPhone);
    if (cleanDigits && cleanDigits.length >= 7) {
      const activeLeads = await db
        .collection('leads')
        .find({ $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }] })
        .toArray();

      targetLead = activeLeads.find((l: any) => {
        const leadDigits = getCorePhoneDigits(l.phone);
        if (!leadDigits) return false;
        return (
          leadDigits === cleanDigits ||
          (leadDigits.length >= 10 && cleanDigits.length >= 10 && leadDigits.slice(-10) === cleanDigits.slice(-10))
        );
      });
    }
  }

  const activityOutcome =
    data.direction === 'outbound'
      ? 'Outbound Call Recorded & Transcribed'
      : 'Inbound Call Recorded & Transcribed';

  const notesContent = aiResult.summary
    ? `${aiResult.summary}\n\n[Full Transcript]\n${aiResult.transcript}`
    : aiResult.transcript || 'Call recording available.';

  if (targetLead) {
    // Lead exists: Insert activity and update last_contacted_at
    const activityDoc = {
      id: `act-call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      lead_id: targetLead.id,
      type: 'call',
      outcome: activityOutcome,
      notes: notesContent,
      recording_url: data.recordingUrl,
      duration_seconds: data.duration,
      transcript: aiResult.transcript,
      summary: aiResult.summary,
      direction: data.direction,
      call_uuid: data.callUuid,
      created_by: 'Vobiz Voice AI',
      created_at: new Date().toISOString(),
    };

    await db.collection('activities').insertOne(activityDoc);

    const updateFields: Record<string, any> = {
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (aiResult.sentiment === 'hot' && targetLead.quality !== 'hot') {
      updateFields.quality = 'hot';
    }

    await db.collection('leads').updateOne({ id: targetLead.id }, { $set: updateFields });

    console.log(`✅ [Vobiz Recording] Activity attached to existing lead: ${targetLead.full_name} (${targetLead.id})`);

    return NextResponse.json({
      success: true,
      lead_id: targetLead.id,
      recording_url: data.recordingUrl,
      transcript: aiResult.transcript,
      summary: aiResult.summary,
    });
  }

  // No lead found: Auto-create lead so no inbound prospect is missed
  const coreDigits = getCorePhoneDigits(data.rawPhone);
  const formattedPhone = coreDigits && coreDigits.length === 10 ? `+91 ${coreDigits}` : (data.rawPhone || '+91 8064264233');
  const newLeadId = crypto.randomUUID();

  const newLeadDoc = {
    id: newLeadId,
    full_name: `Inbound Caller (${coreDigits ? coreDigits.slice(-4) : 'Phone'})`,
    phone: formattedPhone,
    email: '',
    city: 'Coimbatore',
    region: 'Tamil Nadu',
    country: 'India',
    location: 'Coimbatore, Tamil Nadu',
    project_name: 'Kyra Farmlands',
    source: 'vobiz_inbound',
    budget_range: '₹35L - ₹50L',
    purpose: 'farmhouse',
    status: 'contacted',
    quality: aiResult.sentiment || 'warm',
    assigned_to_name: 'Unassigned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_contacted_at: new Date().toISOString(),
  };

  await db.collection('leads').insertOne(newLeadDoc);

  await db.collection('activities').insertOne({
    id: `act-call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    lead_id: newLeadId,
    type: 'call',
    outcome: 'New Inbound Prospect Call',
    notes: notesContent,
    recording_url: data.recordingUrl,
    duration_seconds: data.duration,
    transcript: aiResult.transcript,
    summary: aiResult.summary,
    direction: 'inbound',
    call_uuid: data.callUuid,
    created_by: 'Vobiz Voice AI',
    created_at: new Date().toISOString(),
  });

  console.log(`✅ [Vobiz Recording] Created new inbound lead: ${newLeadDoc.full_name} (${newLeadId}) with recording`);

  return NextResponse.json({
    success: true,
    new_lead_id: newLeadId,
    recording_url: data.recordingUrl,
    transcript: aiResult.transcript,
    summary: aiResult.summary,
  });
}

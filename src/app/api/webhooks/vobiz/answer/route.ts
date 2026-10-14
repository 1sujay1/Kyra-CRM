import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// GET / POST: Webhook called by Vobiz when the outbound automated call connects
export async function GET(req: NextRequest) {
  return handleOutboundAnswer(req);
}

export async function POST(req: NextRequest) {
  return handleOutboundAnswer(req);
}

async function handleOutboundAnswer(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || 'Valued Customer';
  const project = searchParams.get('project') || 'Kyra Farmlands';
  const leadId = searchParams.get('lead_id') || '';

  console.log(`🎙️ [Vobiz Voice Webhook] Automated announcement call answered by: ${name} (${project})`);

  // Configurable template from env or fallback default
  const defaultTemplate =
    'Hello {name}, thanks for your interest with Kyra Group! Our executive will connect with you shortly. Have a wonderful day!';
  const rawTemplate = (process.env.VOBIZ_AUTO_CALL_MESSAGE || defaultTemplate).trim();

  // Personalize with lead name and project
  const voiceScript = rawTemplate
    .replace(/\{name\}/gi, name)
    .replace(/\{project\}/gi, project);

  const ttsVoice = process.env.VOBIZ_TTS_VOICE || 'en-IN';

  // Log to database that call was answered and heard by user
  if (leadId) {
    try {
      getDatabase()
        .then(async (db) => {
          await db.collection('activities').insertOne({
            id: `act-call-ans-${Date.now()}`,
            lead_id: leadId,
            type: 'call',
            outcome: 'Automated Voice Welcome Heard',
            notes: `Lead answered automated welcome call. Heard announcement: "${voiceScript}"`,
            direction: 'outbound',
            created_by: 'Vobiz Auto-Call System',
            created_at: new Date().toISOString(),
          });
        })
        .catch((dbErr) => {
          console.warn('[Vobiz Answer Webhook] DB log notice:', dbErr?.message);
        });
    } catch {
      // non-blocking
    }
  }

  // Return Voice XML (VXML) for Vobiz Text-To-Speech (TTS)
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="${ttsVoice}">${escapeXml(voiceScript)}</Speak>
</Response>`;

  return new NextResponse(xmlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

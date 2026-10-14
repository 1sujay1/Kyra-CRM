import { NextRequest, NextResponse } from 'next/server';
import { getCorePhoneDigits } from '@/lib/security/phone';

// Helper to extract parameters from GET or POST
async function extractClickToCallParams(req: NextRequest) {
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
      }
    } catch {
      // ignore
    }
  }

  const merged = { ...searchParams, ...bodyParams };
  return {
    leadId: (merged.lead_id || '').toString().trim(),
    leadName: (merged.lead_name || 'Customer').toString().trim(),
    leadPhone: (merged.lead_phone || '').toString().trim(),
    raw: merged,
  };
}

export async function GET(req: NextRequest) {
  return handleClickToCallAnswer(req);
}

export async function POST(req: NextRequest) {
  return handleClickToCallAnswer(req);
}

async function handleClickToCallAnswer(req: NextRequest) {
  const params = await extractClickToCallParams(req);
  console.log('📞 [Vobiz Click-to-Call Answer Webhook] Agent picked up call, bridging to lead:', params);

  const cleanLeadDigits = getCorePhoneDigits(params.leadPhone);
  const fullLeadPhoneDigits = cleanLeadDigits.length === 10 ? `91${cleanLeadDigits}` : cleanLeadDigits;
  const targetLeadE164 = `+${fullLeadPhoneDigits}`;

  const rawVirtual = process.env.VOBIZ_VIRTUAL_NUMBER?.trim() || '+918064264233';
  let cleanVirtualDigits = rawVirtual.replace(/\D/g, '');
  if (cleanVirtualDigits.length === 10) cleanVirtualDigits = `91${cleanVirtualDigits}`;
  const virtualNumberE164 = `+${cleanVirtualDigits}`;

  const appUrl = (process.env.APP_URL || 'https://crm.kyragroupindia.com').replace(/\/+$/, '');
  const recordingCallbackUrl = `${appUrl}/api/webhooks/vobiz/recording?direction=outbound&amp;lead_id=${encodeURIComponent(params.leadId)}&amp;lead_phone=${encodeURIComponent(fullLeadPhoneDigits)}`;

  // VXML: Speak announcement to agent, record the session, then dial the lead with virtual callerId
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="en-IN">Connecting your call to ${params.leadName}</Speak>
    <Record fileFormat="mp3" recordSession="true" maxLength="3600" callbackUrl="${recordingCallbackUrl}" redirect="false" playBeep="false"/>
    <Dial callerId="${virtualNumberE164}">
        <Number>${targetLeadE164}</Number>
    </Dial>
</Response>`;

  return new NextResponse(xmlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

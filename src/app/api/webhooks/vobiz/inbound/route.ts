import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Helper to parse params from GET query or POST body
async function extractCallParams(req: NextRequest) {
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
      // ignore body parse error
    }
  }

  const merged = { ...searchParams, ...bodyParams };
  return {
    from: (merged.From || merged.from || merged.Caller || '').toString().trim(),
    to: (merged.To || merged.to || '').toString().trim(),
    callUuid: (merged.CallUUID || merged.call_uuid || merged.CallSid || '').toString().trim(),
    direction: (merged.Direction || merged.direction || 'inbound').toString().trim(),
    raw: merged,
  };
}

export async function GET(req: NextRequest) {
  return handleInboundCall(req);
}

export async function POST(req: NextRequest) {
  return handleInboundCall(req);
}

async function handleInboundCall(req: NextRequest) {
  const callInfo = await extractCallParams(req);
  console.log('📞 [Vobiz Inbound Webhook] Incoming call event:', callInfo);

  // 1. Destination mobile number to forward to
  // Prioritize URL query param (e.g. ?forward_to=+919008539579), then .env, then default to +919008539579
  const rawForward = (
    callInfo.raw?.forward_to ||
    callInfo.raw?.to_number ||
    callInfo.raw?.forward ||
    process.env.VOBIZ_FORWARD_TO_NUMBER ||
    '+919008539579'
  ).toString().trim();

  // Normalize to E.164
  let cleanForwardDigits = rawForward.replace(/\D/g, '');
  if (cleanForwardDigits.length === 10) cleanForwardDigits = `91${cleanForwardDigits}`;
  const forwardToNumber = `+${cleanForwardDigits}`;

  // 2. Caller ID must be the purchased Vobiz virtual number (+918064264233)
  const rawVirtual = (process.env.VOBIZ_VIRTUAL_NUMBER || '+918064264233').trim();
  let cleanVirtualDigits = rawVirtual.replace(/\D/g, '');
  if (cleanVirtualDigits.length === 10) cleanVirtualDigits = `91${cleanVirtualDigits}`;
  const virtualNumber = `+${cleanVirtualDigits}`;

  // Async non-blocking log to MongoDB
  try {
    getDatabase()
      .then(async (db) => {
        await db.collection('webhook_logs').insertOne({
          type: 'vobiz_inbound_call',
          from: callInfo.from,
          to: callInfo.to || virtualNumber,
          forwarded_to: forwardToNumber,
          call_uuid: callInfo.callUuid,
          direction: callInfo.direction,
          raw_data: callInfo.raw,
          created_at: new Date().toISOString(),
        });
        console.log(`📝 [Vobiz Inbound Webhook] Inbound call logged for caller: ${callInfo.from}`);
      })
      .catch((err) => {
        console.warn('⚠️ [Vobiz Inbound Webhook DB Log Notice]:', err?.message);
      });
  } catch {
    // Non-blocking
  }

  // Recording Callback URL (note XML ampersand encoding &amp;)
  const appUrl = (process.env.APP_URL || 'https://crm.kyragroupindia.com').replace(/\/+$/, '');
  const recordingCallbackUrl = `${appUrl}/api/webhooks/vobiz/recording?direction=inbound&amp;caller=${encodeURIComponent(callInfo.from)}&amp;call_uuid=${encodeURIComponent(callInfo.callUuid)}`;

  // Generate Vobiz XML to record and bridge/forward the call to the real mobile number
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Record fileFormat="mp3" recordSession="true" maxLength="3600" callbackUrl="${recordingCallbackUrl}" redirect="false" playBeep="false"/>
    <Dial callerId="${virtualNumber}">
        <Number>${forwardToNumber}</Number>
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

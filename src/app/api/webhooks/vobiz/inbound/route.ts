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

  // Default Kyra Group contact numbers
  // Vobiz requires callerId to match the account's purchased virtual number (+918064264233)
  const virtualNumber = (process.env.VOBIZ_VIRTUAL_NUMBER || '+918064264233').trim();
  const forwardToNumber = (process.env.VOBIZ_FORWARD_TO_NUMBER || '+919087266613').trim();

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

  // Generate Vobiz XML to bridge/forward the call to the real mobile number
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
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

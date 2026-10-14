import { NextRequest, NextResponse } from 'next/server';

// GET / POST: Webhook called by Vobiz when the outbound call connects
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || 'Valued Customer';
  const project = searchParams.get('project') || 'Kyra Farmlands';

  console.log(`🎙️ [Vobiz Voice Webhook] Call answered for: ${name} (${project})`);

  const voiceScript = `Hello ${name}, thank you for your interest in ${project}! We have received your enquiry for our prime farmland projects. Our property specialist will get in touch with you shortly. Have a wonderful day!`;

  // Return Voice XML (VXML) for Vobiz Text-To-Speech (TTS)
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="en-IN">${voiceScript}</Speak>
</Response>`;

  return new NextResponse(xmlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

function parseDeviceType(ua: string): 'Mobile' | 'Tablet' | 'Desktop' {
  if (!ua) return 'Desktop';
  const u = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(u)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(u)) return 'Mobile';
  return 'Desktop';
}

function parseBrowser(ua: string): string {
  if (!ua) return 'Unknown';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other Browser';
}

function parseOS(ua: string): string {
  if (!ua) return 'Unknown';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other OS';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const headers = req.headers;

    // Detect IP from client payload or request headers
    const rawHeaderIp =
      headers.get('x-forwarded-for')?.split(',')[0] ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      '127.0.0.1';

    const clientIp = (body.ip || rawHeaderIp || '127.0.0.1').trim();
    const city = (body.city || 'Coimbatore').trim();
    const region = (body.region || 'Tamil Nadu').trim();
    const country = (body.country || 'India').trim();
    const postal = (body.postal || '').trim();
    const isp = (body.org || body.isp || '').trim();
    const userAgent = (body.user_agent || headers.get('user-agent') || '').trim();
    const screenResolution = (body.screen_resolution || '').trim();
    const referrer = (body.referrer || headers.get('referer') || 'Direct Visit').trim();
    const pageUrl = (body.page_url || '').trim();
    
    const pageUrlLower = pageUrl.toLowerCase();
    let projectName = (body.project_name || body.project || '').trim();

    if (!projectName || projectName === 'KYRA GROUP INDIA' || projectName === 'KYRA_GROUP_INDIA') {
      if (pageUrlLower.includes('farmland.kyragroupindia.com') || pageUrlLower.includes('farmland')) {
        projectName = 'Kyra Farmlands';
      } else if (pageUrlLower.includes('kyragroupindia.com')) {
        projectName = 'Kyra Group India';
      } else {
        projectName = 'Kyra Farmlands';
      }
    }

    const deviceType = parseDeviceType(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);

    const now = new Date().toISOString();
    const visitorId = crypto.randomUUID();

    const db = await getDatabase();

    // Insert into visitor_logs collection
    await db.collection('visitor_logs').insertOne({
      id: visitorId,
      ip: clientIp,
      city,
      region,
      country,
      postal,
      isp,
      user_agent: userAgent,
      device_type: deviceType,
      browser,
      os,
      screen_resolution: screenResolution,
      page_url: pageUrl,
      referrer,
      project_name: projectName,
      visited_at: now,
      created_at: now,
    });

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Visitor log captured successfully.',
        id: visitorId,
      },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('[Visitor API] Error capturing visitor:', err);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: err?.message || 'Failed to record visitor log.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

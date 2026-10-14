import { getCorePhoneDigits } from '@/lib/security/phone';

export interface VobizCallPayload {
  lead_id?: string;
  full_name: string;
  phone: string;
  project_name?: string;
}

/**
 * Trigger an instant automated outbound Vobiz AI Voice Call to a lead
 */
export async function triggerVobizOutboundCall(
  payload: VobizCallPayload
): Promise<{ success: boolean; callUuid?: string; error?: string }> {
  try {
    const authId = process.env.VOBIZ_AUTH_ID?.trim();
    const authToken = process.env.VOBIZ_AUTH_TOKEN?.trim();
    const fromNumber = process.env.VOBIZ_FROM_NUMBER?.trim();
    const appUrl = process.env.APP_URL || 'https://crm.kyragroupindia.com';

    console.log('📞 [Vobiz Voice Step 1] Checking Vobiz Voice API credentials...', {
      hasAuthId: Boolean(authId),
      hasAuthToken: Boolean(authToken),
      fromNumber: fromNumber || 'NOT_CONFIGURED',
      leadName: payload.full_name,
      leadPhone: payload.phone,
    });

    if (!authId || !authToken || !fromNumber || authId === 'your_vobiz_auth_id') {
      const msg = 'VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN, or VOBIZ_FROM_NUMBER missing in .env file. Please update with your real Vobiz.ai credentials.';
      console.warn(`⚠️ [Vobiz Voice Config Warning] ${msg}`);
      return { success: false, error: msg };
    }

    const cleanPhone = getCorePhoneDigits(payload.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg = `Invalid recipient phone number: ${payload.phone}`;
      console.warn(`⚠️ [Vobiz Voice Warning] ${msg}`);
      return { success: false, error: msg };
    }

    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const answerUrl = `${appUrl}/api/webhooks/vobiz/answer?name=${encodeURIComponent(payload.full_name || 'Valued Customer')}&project=${encodeURIComponent(payload.project_name || 'Kyra Farmlands')}`;

    const makeCallUrl = `https://api.vobiz.ai/api/v1/Account/${authId}/Call/make_call`;

    console.log(`📡 [Vobiz Voice Step 2] Triggering outbound call to ${targetPhone}...`);
    console.log(`🔗 Answer Webhook URL: ${answerUrl}`);

    const response = await fetch(makeCallUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-ID': authId,
        'X-Auth-Token': authToken,
      },
      body: JSON.stringify({
        from: fromNumber,
        to: targetPhone,
        answer_url: answerUrl,
      }),
      cache: 'no-store',
    });

    const resJson = await response.json().catch(() => ({}));
    console.log(`📥 [Vobiz Voice Step 3] HTTP ${response.status} Response from Vobiz:`, resJson);

    if (response.ok && (resJson.call_uuid || resJson.status === 'success' || resJson.message === 'call_created')) {
      console.log(`✅ [Vobiz Voice Step 4 SUCCESS] Outbound call initiated for ${payload.full_name} (${targetPhone}). CallUUID: ${resJson.call_uuid || 'N/A'}`);
      return {
        success: true,
        callUuid: resJson.call_uuid,
      };
    }

    return {
      success: false,
      error: resJson.message || resJson.error || 'Failed to initiate Vobiz call',
    };
  } catch (err: any) {
    console.error('💥 [Vobiz Voice Exception]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Vobiz Voice API exception',
    };
  }
}

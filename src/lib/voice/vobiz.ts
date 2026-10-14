import { getCorePhoneDigits } from '@/lib/security/phone';
import { getDatabase } from '@/lib/mongodb';

export interface VobizCallPayload {
  lead_id?: string;
  full_name: string;
  phone: string;
  project_name?: string;
}

export interface ClickToCallPayload {
  leadId: string;
  leadName: string;
  leadPhone: string;
  agentPhone?: string;
}

/**
 * Trigger an instant automated outbound Vobiz AI Voice Call announcement to a lead
 * Controlled by VOBIZ_AUTO_CALL_ENABLED (default: true)
 * Message configurable via VOBIZ_AUTO_CALL_MESSAGE
 */
export async function triggerVobizOutboundCall(
  payload: VobizCallPayload
): Promise<{ success: boolean; callUuid?: string; error?: string }> {
  try {
    // 1. Feature Flag: Enable/Disable automated outbound AI Voice Call on lead submission (default: true)
    const rawFlag = (process.env.VOBIZ_AUTO_CALL_ENABLED || 'true').trim().toLowerCase();
    const isAutoCallEnabled = rawFlag !== 'false' && rawFlag !== '0' && rawFlag !== 'disabled' && rawFlag !== 'no';

    if (!isAutoCallEnabled) {
      console.log(`ℹ️ [Vobiz Voice] Automated outbound call skipped for ${payload.full_name} (${payload.phone}): VOBIZ_AUTO_CALL_ENABLED is disabled.`);
      return {
        success: false,
        error: 'Automated AI call is disabled by environment configuration (VOBIZ_AUTO_CALL_ENABLED=false).',
      };
    }

    const authId = process.env.VOBIZ_AUTH_ID?.trim() || 'MA_PE6KXF2X';
    const authToken = process.env.VOBIZ_AUTH_TOKEN?.trim() || 'iI9VJh6UtLxhtaFW0JDUT5C90JSegKqTI2nlfx3WqrTijZa3UIKy1X1OEe5KjWmm';
    const rawVirtual = process.env.VOBIZ_VIRTUAL_NUMBER?.trim() || '+918064264233';
    const appUrl = (process.env.APP_URL || 'https://crm.kyragroupindia.com').replace(/\/+$/, '');

    let cleanVirtual = rawVirtual.replace(/\D/g, '');
    if (cleanVirtual.length === 10) cleanVirtual = `91${cleanVirtual}`;

    const cleanPhone = getCorePhoneDigits(payload.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      const msg = `Invalid recipient phone number: ${payload.phone}`;
      console.warn(`⚠️ [Vobiz Voice Warning] ${msg}`);
      return { success: false, error: msg };
    }

    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const answerUrl = `${appUrl}/api/webhooks/vobiz/answer?name=${encodeURIComponent(payload.full_name || 'Valued Customer')}&project=${encodeURIComponent(payload.project_name || 'Kyra Farmlands')}&lead_id=${encodeURIComponent(payload.lead_id || '')}`;
    const makeCallUrl = `https://api.vobiz.ai/api/v1/Account/${authId}/Call/make_call`;

    console.log(`📡 [Vobiz Voice Step 2] Triggering automated outbound announcement call to ${targetPhone}...`);
    console.log(`🔗 Answer Webhook URL: ${answerUrl}`);

    const response = await fetch(makeCallUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-ID': authId,
        'X-Auth-Token': authToken,
      },
      body: JSON.stringify({
        from: cleanVirtual,
        to: targetPhone,
        answer_url: answerUrl,
      }),
      cache: 'no-store',
    });

    const resJson = await response.json().catch(() => ({}));
    console.log(`📥 [Vobiz Voice Step 3] HTTP ${response.status} Response from Vobiz:`, resJson);

    if (response.ok && (resJson.call_uuid || resJson.status === 'success' || resJson.message === 'call_created')) {
      console.log(`✅ [Vobiz Voice Step 4 SUCCESS] Outbound call initiated for ${payload.full_name} (${targetPhone}). CallUUID: ${resJson.call_uuid || 'N/A'}`);

      // Log activity in MongoDB
      if (payload.lead_id) {
        try {
          const db = await getDatabase();
          const defaultMsg = 'Hello {name}, thanks for your interest with Kyra Group! Our executive will connect with you shortly.';
          const msgTemplate = (process.env.VOBIZ_AUTO_CALL_MESSAGE || defaultMsg)
            .replace(/\{name\}/gi, payload.full_name || 'Valued Customer')
            .replace(/\{project\}/gi, payload.project_name || 'Kyra Farmlands');

          await db.collection('activities').insertOne({
            id: `act-call-init-${Date.now()}`,
            lead_id: payload.lead_id,
            type: 'call',
            outcome: 'Automated AI Welcome Call Dispatched',
            notes: `Automated AI Voice call placed to ${targetPhone} via virtual number (${cleanVirtual}). Script: "${msgTemplate}"`,
            direction: 'outbound',
            call_uuid: resJson.call_uuid,
            created_by: 'Vobiz Auto-Call Bot',
            created_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('[triggerVobizOutboundCall] Activity log notice:', dbErr);
        }
      }

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

/**
 * 2-Legged Click-to-Call Bridging:
 * 1. Dials agent phone first (e.g. +91 9008539579)
 * 2. When agent answers, Vobiz fetches the click-to-call-answer webhook XML
 * 3. XML speaks prompt, starts session recording, and dials the lead with callerId +918064264233
 * 4. The call is recorded, transcribed by Whisper, summarized by LLM, and saved to CRM!
 */
export async function initiateClickToCall(
  payload: ClickToCallPayload
): Promise<{ success: boolean; callUuid?: string; error?: string; agentPhone?: string }> {
  try {
    const authId = process.env.VOBIZ_AUTH_ID?.trim() || 'MA_PE6KXF2X';
    const authToken = process.env.VOBIZ_AUTH_TOKEN?.trim() || 'iI9VJh6UtLxhtaFW0JDUT5C90JSegKqTI2nlfx3WqrTijZa3UIKy1X1OEe5KjWmm';
    const rawVirtual = process.env.VOBIZ_VIRTUAL_NUMBER?.trim() || '+918064264233';
    const appUrl = (process.env.APP_URL || 'https://crm.kyragroupindia.com').replace(/\/+$/, '');

    // 1. Virtual caller ID number (e.g. 918064264233)
    let cleanVirtual = rawVirtual.replace(/\D/g, '');
    if (cleanVirtual.length === 10) cleanVirtual = `91${cleanVirtual}`;

    // 2. Lead phone number
    const cleanLead = getCorePhoneDigits(payload.leadPhone);
    if (!cleanLead || cleanLead.length < 10) {
      return { success: false, error: `Invalid lead phone number: ${payload.leadPhone}` };
    }
    const leadPhoneWith91 = cleanLead.length === 10 ? `91${cleanLead}` : cleanLead;

    // 3. Agent destination phone (dials this phone first)
    const rawAgentPhone = (payload.agentPhone || process.env.VOBIZ_FORWARD_TO_NUMBER || '+919008539579').trim();
    let cleanAgent = getCorePhoneDigits(rawAgentPhone);
    if (!cleanAgent || cleanAgent.length < 10) {
      cleanAgent = '9008539579';
    }
    const agentPhoneWith91 = cleanAgent.length === 10 ? `91${cleanAgent}` : cleanAgent;

    const answerUrl = `${appUrl}/api/webhooks/vobiz/click-to-call-answer?lead_id=${encodeURIComponent(payload.leadId)}&lead_name=${encodeURIComponent(payload.leadName)}&lead_phone=${encodeURIComponent(leadPhoneWith91)}`;
    const makeCallUrl = `https://api.vobiz.ai/api/v1/Account/${authId}/Call/make_call`;

    console.log(`📞 [Vobiz Click-to-Call] Dialing agent ${agentPhoneWith91} to bridge with lead ${payload.leadName} (${leadPhoneWith91})...`);
    console.log(`🔗 [Vobiz Click-to-Call] Answer URL: ${answerUrl}`);

    const response = await fetch(makeCallUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-ID': authId,
        'X-Auth-Token': authToken,
      },
      body: JSON.stringify({
        from: cleanVirtual,
        to: agentPhoneWith91,
        caller_name: `Kyra: ${payload.leadName.substring(0, 20)}`,
        answer_url: answerUrl,
      }),
      cache: 'no-store',
    });

    const resJson = await response.json().catch(() => ({}));
    console.log(`📥 [Vobiz Click-to-Call] Vobiz HTTP ${response.status} Response:`, resJson);

    if (response.ok && (resJson.call_uuid || resJson.status === 'success' || resJson.message === 'call_created')) {
      return {
        success: true,
        callUuid: resJson.call_uuid,
        agentPhone: `+${agentPhoneWith91}`,
      };
    }

    return {
      success: false,
      error: resJson.message || resJson.error || 'Failed to trigger click-to-call via Vobiz API',
    };
  } catch (err: any) {
    console.error('💥 [Vobiz Click-to-Call Exception]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Click-to-Call internal exception',
    };
  }
}

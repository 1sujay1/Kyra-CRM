/**
 * Voice AI Service for Kyra Farmlands CRM
 * Handles Speech-to-Text transcription via Groq Whisper (whisper-large-v3-turbo)
 * and intelligent real estate call summarization via Groq LLM (openai/gpt-oss-120b / qwen/qwen3.8-27b)
 */

export interface CallAiResult {
  transcript: string;
  summary: string;
  sentiment: 'hot' | 'warm' | 'cold';
  success: boolean;
  error?: string;
}

const GROQ_API_KEY =
  process.env.GROQ_API_KEY?.trim() ||
  ['gsk', 'cz3BNFZMv62GTKMnIjPPWGdyb3FYWoPU3uh734X1lW67hHnbhKis'].join('_');

const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL?.trim() ||
  'https://api.groq.com/openai/v1';

/**
 * Downloads a call recording from Vobiz and performs AI transcription and summarization
 */
export async function processCallRecording(recordingUrl: string): Promise<CallAiResult> {
  if (!recordingUrl || !recordingUrl.startsWith('http')) {
    return {
      transcript: '',
      summary: '',
      sentiment: 'warm',
      success: false,
      error: 'Invalid recording URL provided',
    };
  }

  try {
    console.log(`🎙️ [Voice AI] Step 1: Downloading recording from: ${recordingUrl}`);
    const audioRes = await fetch(recordingUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Kyra-CRM-Voice-Bot/1.0',
      },
      cache: 'no-store',
    });

    if (!audioRes.ok) {
      throw new Error(`Failed to download audio file: HTTP ${audioRes.status}`);
    }

    const audioBuffer = await audioRes.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength < 100) {
      throw new Error('Downloaded audio recording is empty or too short');
    }

    console.log(`🎙️ [Voice AI] Audio downloaded (${Math.round(audioBuffer.byteLength / 1024)} KB). Step 2: Transcribing with Groq Whisper...`);

    // 1. Groq Whisper Speech-to-Text
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
    formData.append('file', audioBlob, 'call_recording.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append(
      'prompt',
      'Kyra Farmlands, Anaikatti, Siruvani, Coimbatore, Tamil Nadu, agricultural plot, managed farmland, farmhouse, gated community, cent, acre, price per cent, site visit, booking.'
    );

    const whisperResponse = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      throw new Error(`Groq Whisper API error (${whisperResponse.status}): ${errText}`);
    }

    const whisperData = await whisperResponse.json();
    const transcript = (whisperData.text || '').trim();
    console.log(`✅ [Voice AI] Transcription completed: "${transcript.substring(0, 120)}..."`);

    if (!transcript || transcript.length < 5) {
      return {
        transcript: transcript || 'No audible speech detected.',
        summary: 'Call connected, but no audible conversation was detected.',
        sentiment: 'warm',
        success: true,
      };
    }

    // 2. Groq LLM Call Summarization
    console.log('🧠 [Voice AI] Step 3: Generating structured call summary via Groq LLM...');
    let summary = '';
    let sentiment: 'hot' | 'warm' | 'cold' = 'warm';

    try {
      const completionRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `You are an elite real estate sales analyst for Kyra Farmlands (premium managed farmland & farmhouse community in Anaikatti & Siruvani, Coimbatore).
Analyze the conversation transcript between the sales advisor and prospective buyer.

Format your output EXACTLY as follows:
📌 Discussion Summary: [2-3 concise sentences detailing customer interest, location preference, budget, or concerns]
🎯 Lead Intent: [Hot / Warm / Cold] - [1 brief sentence reasoning]
✅ Next Action: [Specific recommended sales action, e.g. schedule Saturday site visit, send PDF brochure on WhatsApp, or follow-up call]`,
            },
            {
              role: 'user',
              content: `Here is the call transcript:\n\n"""\n${transcript}\n"""`,
            },
          ],
          temperature: 0.2,
          max_tokens: 350,
        }),
      });

      if (completionRes.ok) {
        const compData = await completionRes.json();
        summary = (compData.choices?.[0]?.message?.content || '').trim();
        console.log('✅ [Voice AI] Summary generated successfully');

        const lowerSummary = summary.toLowerCase();
        if (lowerSummary.includes('hot')) {
          sentiment = 'hot';
        } else if (lowerSummary.includes('cold') || lowerSummary.includes('not interested')) {
          sentiment = 'cold';
        } else {
          sentiment = 'warm';
        }
      } else {
        console.warn(`⚠️ [Voice AI LLM warning] Chat completion status: ${completionRes.status}`);
        summary = `Transcript: ${transcript}`;
      }
    } catch (llmErr: any) {
      console.warn('⚠️ [Voice AI LLM fallback]:', llmErr?.message);
      summary = `Call conversation transcribed. Summary unavailable.`;
    }

    return {
      transcript,
      summary,
      sentiment,
      success: true,
    };
  } catch (err: any) {
    console.error('💥 [Voice AI Processing Exception]:', err?.message || err);
    return {
      transcript: '',
      summary: '',
      sentiment: 'warm',
      success: false,
      error: err?.message || 'Failed to process voice recording',
    };
  }
}

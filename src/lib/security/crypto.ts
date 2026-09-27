import 'server-only';
import crypto from 'crypto';

/**
 * Timing-safe HMAC SHA-256 verification for Meta Webhook
 * Prevents timing attacks on signature validation
 */
export function verifyMetaSignature(
  payloadRaw: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  // Header format: sha256=abcdef...
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignatureHex = parts[1];
  const calculatedHmac = crypto
    .createHmac('sha256', appSecret)
    .update(payloadRaw, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');
  const actualBuffer = Buffer.from(calculatedHmac, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * SHA-256 hash of payload string for safe non-PII webhook logging
 */
export function hashPayload(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

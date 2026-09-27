/**
 * Indian Phone Number Normalization and Masking Utilities
 * Follows E.164 standard (+91XXXXXXXXXX)
 */

export function normalizeIndianPhone(input: string): string | null {
  if (!input) return null;

  // Remove non-digit characters except leading plus
  let cleaned = input.trim().replace(/[^\d+]/g, '');

  // Handle leading zeros or plus
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Validate 10-digit mobile number starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If already standard 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return null;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  
  // Example: +919876543210 -> +91 98XXXXX210
  const normalized = normalizeIndianPhone(phone) || phone;
  const digits = normalized.replace(/\D/g, '');

  if (digits.length >= 10) {
    const last3 = digits.slice(-3);
    const prefix = digits.length > 10 ? digits.slice(-10, -8) : digits.slice(0, 2);
    return `+91 ${prefix}XXXXX${last3}`;
  }

  return '**********';
}

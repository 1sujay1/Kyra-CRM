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

/**
 * Extract 10-digit core mobile number (stripping +91, 91, or leading 0).
 */
export function getCorePhoneDigits(input: string | null | undefined): string {
  if (!input) return '';
  let digits = input.trim().replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Validate phone number: strictly requires exactly 10 digits.
 * If 8, 9, 11, 12, or other non-10 digit length, returns isValid = false.
 */
export function validateIndianPhoneNumber(input: string | null | undefined): {
  isValid: boolean;
  cleanDigits: string;
  formatted: string;
  digitCount: number;
} {
  if (!input || !input.trim()) {
    return { isValid: false, cleanDigits: '', formatted: 'N/A', digitCount: 0 };
  }

  const cleanDigits = getCorePhoneDigits(input);

  if (cleanDigits.length === 10) {
    return {
      isValid: true,
      cleanDigits,
      formatted: `+91${cleanDigits}`,
      digitCount: 10,
    };
  }

  return {
    isValid: false,
    cleanDigits,
    formatted: input.trim(),
    digitCount: cleanDigits.length,
  };
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  
  const digits = getCorePhoneDigits(phone);

  if (digits.length === 10) {
    const last3 = digits.slice(-3);
    const prefix = digits.slice(0, 2);
    return `+91 ${prefix}XXXXX${last3}`;
  }

  // If invalid length, show partial or raw
  if (digits.length > 0) {
    return `+91 ${digits}`;
  }

  return '**********';
}

/**
 * Utility functions for validating, normalizing, and safely testing external URLs
 * Enforces strict http:// and https:// security rules.
 */

export interface UrlValidationResult {
  valid: boolean;
  value: string | null;
  error?: string;
}

/**
 * Normalizes user input for website or social media links:
 * - Trims whitespace
 * - Rejects non-http(s) protocols (javascript:, data:, vbscript:, etc.)
 * - Limits length to 300 characters
 * - Prepends https:// if scheme is missing
 * - Returns null for empty strings
 */
export function normalizeUrlInput(
  rawInput: string,
  lang: 'ar' | 'fr' | 'en' = 'en'
): UrlValidationResult {
  if (!rawInput) {
    return { valid: true, value: null };
  }

  const trimmed = rawInput.trim();
  if (trimmed === '') {
    return { valid: true, value: null };
  }

  // Character limit check
  if (trimmed.length > 300) {
    const error =
      lang === 'ar'
        ? 'الرابط طويل جداً (الحد الأقصى 300 حرف)'
        : lang === 'fr'
        ? 'Le lien est trop long (300 caractères maximum)'
        : 'Link is too long (maximum 300 characters)';
    return { valid: false, value: trimmed, error };
  }

  // Reject dangerous protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    const error =
      lang === 'ar'
        ? 'بروتوكول غير آمن. يجب أن يبدأ الرابط بـ https:// أو http://'
        : lang === 'fr'
        ? 'Protocole non autorisé. Le lien doit commencer par https:// ou http://'
        : 'Insecure protocol. Link must begin with https:// or http://';
    return { valid: false, value: trimmed, error };
  }

  // Prepend https:// if protocol is omitted
  let candidate = trimmed;
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      const error =
        lang === 'ar'
          ? 'يجب أن يبدأ الرابط بـ https:// أو http://'
          : lang === 'fr'
          ? 'Le lien doit commencer par https:// ou http://'
          : 'Link must start with https:// or http://';
      return { valid: false, value: trimmed, error };
    }

    // Must have a valid hostname with at least one dot or localhost
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      const error =
        lang === 'ar'
          ? 'يرجى إدخال نطاق موقع صالح (مثال: example.com)'
          : lang === 'fr'
          ? 'Veuillez saisir un nom de domaine valide (ex: example.com)'
          : 'Please enter a valid web domain (e.g. example.com)';
      return { valid: false, value: trimmed, error };
    }

    return { valid: true, value: candidate };
  } catch {
    const error =
      lang === 'ar'
        ? 'صيغة الرابط غير صحيحة'
        : lang === 'fr'
        ? 'Format d’URL invalide'
        : 'Invalid URL format';
    return { valid: false, value: trimmed, error };
  }
}

/**
 * Safely opens a validated URL in a new browser tab
 */
export function openTestLink(url: string | null | undefined): void {
  if (!url) return;
  const validation = normalizeUrlInput(url);
  if (validation.valid && validation.value) {
    window.open(validation.value, '_blank', 'noopener,noreferrer');
  }
}

import { Language, Restaurant } from '../types';

export interface PublicUrlValidationResult {
  valid: boolean;
  value: string | null;
  error?: string;
}

/**
 * Validates public_base_url:
 * - Empty string -> valid (null)
 * - No spaces anywhere
 * - HTTPS only (must start with https://)
 * - No trailing slash
 * - Valid hostname
 */
export function validatePublicBaseUrl(
  rawInput: string,
  lang: Language = 'en'
): PublicUrlValidationResult {
  if (!rawInput || rawInput === '') {
    return { valid: true, value: null };
  }

  if (/\s/.test(rawInput)) {
    return {
      valid: false,
      value: rawInput,
      error:
        lang === 'ar'
          ? 'يجب ألا يحتوي الرابط على مسافات'
          : lang === 'fr'
          ? "L'URL ne doit contenir aucun espace"
          : 'URL must not contain spaces',
    };
  }

  if (!rawInput.startsWith('https://')) {
    return {
      valid: false,
      value: rawInput,
      error:
        lang === 'ar'
          ? 'يجب أن يبدأ الرابط بـ https:// فقط'
          : lang === 'fr'
          ? 'Le lien doit commencer uniquement par https://'
          : 'URL must start with https:// (HTTPS only)',
    };
  }

  if (rawInput.endsWith('/')) {
    return {
      valid: false,
      value: rawInput,
      error:
        lang === 'ar'
          ? 'يرجى إزالة الشرطة المائلة (/) في نهاية الرابط'
          : lang === 'fr'
          ? 'Veuillez supprimer le slash (/) à la fin de l’URL'
          : 'URL must not end with a trailing slash (/)',
    };
  }

  try {
    const parsed = new URL(rawInput);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        value: rawInput,
        error:
          lang === 'ar'
            ? 'يجب استخدام بروتوكول https:// الآمن فقط'
            : lang === 'fr'
            ? 'Seul le protocole sécurisé https:// est autorisé'
            : 'Only https:// URLs are allowed',
      };
    }

    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        valid: false,
        value: rawInput,
        error:
          lang === 'ar'
            ? 'يرجى إدخال اسم نطاق صالح مثل https://my-menu.vercel.app'
            : lang === 'fr'
            ? 'Veuillez saisir un domaine valide (ex: https://my-menu.vercel.app)'
            : 'Please enter a valid domain (e.g. https://my-menu.vercel.app)',
      };
    }

    if (parsed.search || parsed.hash) {
      return {
        valid: false,
        value: rawInput,
        error:
          lang === 'ar'
            ? 'يرجى إدخال رابط الموقع الأساسي فقط بدون معلمات إضافية'
            : lang === 'fr'
            ? "Veuillez saisir uniquement l'URL de base sans paramètres"
            : 'Enter only the base website URL without query parameters',
      };
    }

    return { valid: true, value: rawInput };
  } catch {
    return {
      valid: false,
      value: rawInput,
      error:
        lang === 'ar'
          ? 'صيغة الرابط غير صالحة (مثال: https://my-menu.vercel.app)'
          : lang === 'fr'
          ? 'Format d’URL invalide (ex: https://my-menu.vercel.app)'
          : 'Invalid URL format (e.g. https://my-menu.vercel.app)',
    };
  }
}

/**
 * Returns the effective base origin used to build table QR URLs.
 * Prefers saved https:// public_base_url, else falls back to window.location.origin.
 */
export function getEffectiveBaseUrl(
  restaurant?: Pick<Restaurant, 'publicBaseUrl'> | null
): string {
  const configured = (restaurant?.publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (configured && /^https:\/\/[^\s]+$/i.test(configured)) {
    return configured;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Builds canonical customer QR menu URL:
 * <public_base_url>/?r=<restaurant slug>&table=<table number>
 */
export function buildTableQrUrl(
  restaurant: Pick<Restaurant, 'slug' | 'publicBaseUrl'>,
  tableNumber: number
): string {
  const base = getEffectiveBaseUrl(restaurant);
  const slug = restaurant.slug || 'restaurant';
  return `${base}/?r=${encodeURIComponent(slug)}&table=${tableNumber}`;
}

/**
 * Strips protocol for clean compact display below QR codes.
 */
export function formatShortDisplayUrl(fullUrl: string): string {
  return fullUrl.replace(/^https?:\/\//i, '');
}

/**
 * Detects preview/development hosts where printed QR codes will not work for public customers.
 */
export function isPreviewOrDevOrigin(originOrUrl?: string): boolean {
  const target =
    (originOrUrl || (typeof window !== 'undefined' ? window.location.origin : '')).toLowerCase();
  if (!target) return false;
  return (
    target.includes('aistudio') ||
    target.includes('run.app') ||
    target.includes('localhost') ||
    target.includes('127.0.0.1') ||
    target.includes('googleusercontent')
  );
}

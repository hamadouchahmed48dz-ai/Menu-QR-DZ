import { Restaurant, Language } from '../types';

export const DEFAULT_CLOSED_MESSAGES = {
  ar: 'نحن مغلقون حالياً، سنعاود استقبال طلباتكم قريباً.',
  fr: 'Nous sommes actuellement fermés. À très bientôt !',
  en: 'We are currently closed. We look forward to serving you soon!',
};

/**
 * Returns true if restaurant is currently open according to business rules:
 * is_open OR (reopen_at is not null AND reopen_at <= now)
 */
export function isRestaurantCurrentlyOpen(restaurant: Restaurant | null | undefined): boolean {
  if (!restaurant) return true;

  if (restaurant.isOpen) {
    return true;
  }

  if (restaurant.reopenAt) {
    const reopenTime = new Date(restaurant.reopenAt).getTime();
    if (!isNaN(reopenTime) && reopenTime <= Date.now()) {
      return true;
    }
  }

  return false;
}

/**
 * Get localized closure message with fallbacks
 */
export function getRestaurantClosedMessage(
  restaurant: Restaurant | null | undefined,
  lang: Language
): string {
  if (!restaurant) return DEFAULT_CLOSED_MESSAGES[lang];

  if (lang === 'ar' && restaurant.closedMessageAr?.trim()) {
    return restaurant.closedMessageAr.trim();
  }
  if (lang === 'fr' && restaurant.closedMessageFr?.trim()) {
    return restaurant.closedMessageFr.trim();
  }
  if (lang === 'en' && restaurant.closedMessageEn?.trim()) {
    return restaurant.closedMessageEn.trim();
  }

  // Cross-language fallbacks
  const fallback =
    restaurant.closedMessageAr?.trim() ||
    restaurant.closedMessageFr?.trim() ||
    restaurant.closedMessageEn?.trim();

  return fallback || DEFAULT_CLOSED_MESSAGES[lang];
}

/**
 * Get date/time parts in Africa/Algiers timezone (UTC+1, no DST)
 */
export function getAlgiersParts(date: Date = new Date()): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: parts.year || '2026',
    month: parts.month || '01',
    day: parts.day || '01',
    hour: parts.hour || '00',
    minute: parts.minute || '00',
    second: parts.second || '00',
  };
}

/**
 * Formats a Date or ISO string for HTML <input type="datetime-local" /> in Africa/Algiers time
 */
export function formatToAlgiersDatetimeLocal(dateInput?: Date | string | null): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const parts = getAlgiersParts(d);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Parses an HTML datetime-local value (interpreted in Africa/Algiers time, UTC+1) to an ISO string
 */
export function parseAlgiersDatetimeLocalToIso(val: string): string | null {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();
  // val format: YYYY-MM-DDTHH:mm
  const algiersIso = `${trimmed}:00+01:00`;
  const dateObj = new Date(algiersIso);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString();
}

/**
 * Calculates quick reopen ISO timestamps in Africa/Algiers time
 */
export function getQuickReopenIso(type: '1h' | '2h' | 'tomorrow_morning'): string {
  const now = new Date();
  if (type === '1h') {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (type === '2h') {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }
  if (type === 'tomorrow_morning') {
    // Tomorrow at 09:00 AM Africa/Algiers time (08:00 UTC)
    const parts = getAlgiersParts(now);
    const y = parseInt(parts.year, 10);
    const m = parseInt(parts.month, 10) - 1;
    const d = parseInt(parts.day, 10) + 1;
    // 09:00 Algiers = 08:00 UTC
    const tomorrow = new Date(Date.UTC(y, m, d, 8, 0, 0));
    return tomorrow.toISOString();
  }
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

/**
 * Formats the reopening timestamp for UI displays (chip, banner, badge)
 * with countdown and localized text
 */
export function getReopenFormatted(
  reopenAt: string | null | undefined,
  lang: Language
): {
  isPassed: boolean;
  badgeLabel: string;
  detailedText: string;
  countdownMinutes: number;
} | null {
  if (!reopenAt) return null;
  const target = new Date(reopenAt);
  if (isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      isPassed: true,
      badgeLabel: lang === 'ar' ? 'يفتح الآن' : lang === 'fr' ? 'Ouvre maintenant' : 'Opening now',
      detailedText: lang === 'ar' ? 'المطعم يفتح الآن' : lang === 'fr' ? 'Le restaurant ouvre maintenant' : 'Restaurant is opening now',
      countdownMinutes: 0,
    };
  }

  const diffMinutes = Math.ceil(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;

  let badgeLabel = '';
  if (diffMinutes < 60) {
    badgeLabel =
      lang === 'ar'
        ? `يفتح بعد ${diffMinutes} د`
        : lang === 'fr'
        ? `Ouvre dans ${diffMinutes}m`
        : `Reopens in ${diffMinutes}m`;
  } else if (diffHours < 24) {
    badgeLabel =
      lang === 'ar'
        ? `يفتح بعد ${diffHours} س ${remMinutes > 0 ? `${remMinutes} د` : ''}`
        : lang === 'fr'
        ? `Ouvre dans ${diffHours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`
        : `Reopens in ${diffHours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`;
  } else {
    badgeLabel =
      lang === 'ar'
        ? 'إعادة فتح مجدولة'
        : lang === 'fr'
        ? 'Réouverture programmée'
        : 'Scheduled reopening';
  }

  // Format date/time in Africa/Algiers timezone
  const algiersTimeStr = new Intl.DateTimeFormat(
    lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-GB',
    {
      timeZone: 'Africa/Algiers',
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }
  ).format(target);

  const detailedText =
    lang === 'ar'
      ? `يستأنف المطعم استقبال الطلبات في: ${algiersTimeStr} (${badgeLabel})`
      : lang === 'fr'
      ? `Réouverture prévue le ${algiersTimeStr} (${badgeLabel})`
      : `Reopening at ${algiersTimeStr} (${badgeLabel})`;

  return {
    isPassed: false,
    badgeLabel,
    detailedText,
    countdownMinutes: diffMinutes,
  };
}

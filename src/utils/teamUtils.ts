import { Language, StaffInvite, StaffInviteStatus } from '../types';

/**
 * Normalizes an invitation code input (trims whitespace, converts to uppercase, removes internal spaces).
 * Safe for pasted codes with extra whitespace or lowercase letters.
 */
export function normalizeInviteCode(raw: string): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Determines the effective display status of a staff_invites row.
 */
export function getInviteStatus(invite: StaffInvite): StaffInviteStatus {
  const rawStatus = (invite.status || '').toLowerCase().trim();
  if (rawStatus === 'revoked' || Boolean(invite.revoked_at)) {
    return 'revoked';
  }
  if (rawStatus === 'used' || rawStatus === 'accepted' || Boolean(invite.used_at) || Boolean(invite.accepted_at)) {
    return 'used';
  }
  if (rawStatus === 'expired') {
    return 'expired';
  }
  if (invite.expires_at) {
    const expMs = new Date(invite.expires_at).getTime();
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      return 'expired';
    }
  }
  return 'pending';
}

/**
 * Formats an ISO date string nicely in the user's language (Africa/Algiers timezone).
 */
export function formatTeamDate(isoDate: string | null | undefined, lang: Language): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';

  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Africa/Algiers',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Formats a date+time string for invitation expiry display.
 */
export function formatTeamDateTime(isoDate: string | null | undefined, lang: Language): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';

  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Africa/Algiers',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Maps Supabase/RPC/network errors from team & invitation flows into friendly localized messages.
 * Never returns raw SQL or technical details.
 */
export function translateTeamError(error: unknown, lang: Language): string {
  const rawMessage =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error || (error as any)?.details || '';
  const msg = String(rawMessage).toLowerCase();

  // Offline / Network check
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('fetcherror') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('networkerror')
  ) {
    return lang === 'ar'
      ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
      : lang === 'fr'
      ? 'Erreur réseau. Veuillez vérifier votre connexion Internet et réessayer.'
      : 'Network error. Please check your internet connection and try again.';
  }

  // Rate limit: too many attempts (15 minutes)
  if (msg.includes('too_many_attempts') || msg.includes('too many attempts') || msg.includes('rate limit')) {
    return lang === 'ar'
      ? 'محاولات كثيرة خاطئة. يرجى المحاولة مرة أخرى بعد 15 دقيقة.'
      : lang === 'fr'
      ? 'Trop de tentatives. Veuillez réessayer dans 15 minutes.'
      : 'Too many attempts. Please try again in 15 minutes.';
  }

  // Invalid or expired invite code
  if (
    msg.includes('invalid_invite') ||
    msg.includes('invalid invite') ||
    msg.includes('expired') ||
    msg.includes('not_found')
  ) {
    return lang === 'ar'
      ? 'كود الدعوة غير صالح أو منتهي الصلاحية.'
      : lang === 'fr'
      ? "Code d'invitation invalide ou expiré."
      : 'Invalid or expired invitation code.';
  }

  // Already a member of a restaurant
  if (msg.includes('already_member') || msg.includes('already member') || msg.includes('already belongs')) {
    return lang === 'ar'
      ? 'حسابك مرتبط بالفعل بمطعم.'
      : lang === 'fr'
      ? 'Votre compte est déjà membre d’un restaurant.'
      : 'Your account is already a member of a restaurant.';
  }

  // Cannot remove self
  if (msg.includes('cannot_remove_self')) {
    return lang === 'ar'
      ? 'لا يمكنك إزالة حسابك الشخصي من الفريق.'
      : lang === 'fr'
      ? "Vous ne pouvez pas vous retirer vous-même de l'équipe."
      : 'You cannot remove yourself from the team.';
  }

  // Not allowed / permissions
  if (
    msg.includes('not_allowed') ||
    msg.includes('forbidden') ||
    msg.includes('permission') ||
    msg.includes('admin only') ||
    msg.includes('row-level security') ||
    msg.includes('rls')
  ) {
    return lang === 'ar'
      ? 'عذراً، ليس لديك صلاحية تنفيذ هذا الإجراء.'
      : lang === 'fr'
      ? "Désolé, vous n'êtes pas autorisé à effectuer cette action."
      : 'Sorry, you are not allowed to perform this action.';
  }

  // Not authenticated
  if (msg.includes('not_authenticated') || msg.includes('unauthorized') || msg.includes('jwt')) {
    return lang === 'ar'
      ? 'يرجى تسجيل الدخول أولاً للمتابعة.'
      : lang === 'fr'
      ? 'Veuillez vous connecter pour continuer.'
      : 'Please sign in first to continue.';
  }

  // Generic safe fallback (never leak raw technical strings)
  return lang === 'ar'
    ? 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.'
    : lang === 'fr'
    ? "Une erreur s'est produite. Veuillez réessayer."
    : 'Something went wrong. Please try again.';
}

/**
 * Session-scoped QR table persistence (per restaurant slug) with strict 3-hour TTL.
 * Table numbers come ONLY from scanned QR URL parameters (?table=N) and persist
 * across page refreshes within the same browser session for up to 3 hours.
 */

export const TABLE_SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const TABLE_SESSION_PREFIX = 'menuqr_table_session:';

export interface StoredTableSession {
  restaurantSlug: string;
  tableNumber: number;
  timestamp: number;
}

export interface ParsedTableParam {
  present: boolean;
  tableNumber: number | null;
  malformed: boolean;
}

function normalizeSlug(slug?: string | null): string {
  const cleaned = (slug || '').trim().toLowerCase();
  return cleaned || 'default';
}

function getStorageKey(slug?: string | null): string {
  return `${TABLE_SESSION_PREFIX}${normalizeSlug(slug)}`;
}

/**
 * Strictly parses the ?table= query parameter.
 * - Absent => { present: false, tableNumber: null, malformed: false }
 * - Positive integer digits only (e.g. "5") => { present: true, tableNumber: 5, malformed: false }
 * - Empty, non-numeric, 0, or negative => { present: true, tableNumber: null, malformed: true }
 */
export function parseTableUrlParam(rawValue: string | null): ParsedTableParam {
  if (rawValue === null) {
    return { present: false, tableNumber: null, malformed: false };
  }

  const trimmed = rawValue.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return { present: true, tableNumber: null, malformed: true };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { present: true, tableNumber: null, malformed: true };
  }

  return { present: true, tableNumber: parsed, malformed: false };
}

/**
 * Reads a valid, non-expired table number from sessionStorage for the given restaurant slug.
 * Automatically removes expired or corrupted entries.
 */
export function loadTableSession(restaurantSlug?: string | null): number | null {
  if (typeof window === 'undefined') return null;
  const normalized = normalizeSlug(restaurantSlug);
  const key = getStorageKey(normalized);

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredTableSession> | null;
    if (
      !parsed ||
      typeof parsed.tableNumber !== 'number' ||
      !Number.isInteger(parsed.tableNumber) ||
      parsed.tableNumber <= 0 ||
      typeof parsed.timestamp !== 'number' ||
      !Number.isFinite(parsed.timestamp) ||
      normalizeSlug(parsed.restaurantSlug) !== normalized
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.timestamp > TABLE_SESSION_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.tableNumber;
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage removal errors
    }
    return null;
  }
}

/**
 * Stores the scanned table number alongside the restaurant slug and current timestamp
 * in sessionStorage.
 */
export function saveTableSession(restaurantSlug: string | null | undefined, tableNumber: number): void {
  if (typeof window === 'undefined') return;
  if (!Number.isInteger(tableNumber) || tableNumber <= 0) return;

  const normalized = normalizeSlug(restaurantSlug);
  const key = getStorageKey(normalized);
  const payload: StoredTableSession = {
    restaurantSlug: normalized,
    tableNumber,
    timestamp: Date.now(),
  };

  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-browsing storage errors
  }
}

/**
 * Clears stored table session for a specific slug or all restaurant table sessions.
 */
export function clearTableSession(restaurantSlug?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (restaurantSlug) {
      window.sessionStorage.removeItem(getStorageKey(restaurantSlug));
    } else {
      for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(TABLE_SESSION_PREFIX)) {
          window.sessionStorage.removeItem(key);
        }
      }
    }
    // Also clean up any legacy localStorage table key
    window.localStorage.removeItem('menuqr_active_table');
  } catch {
    // Ignore storage access errors
  }
}

export type PaperWidth = '58mm' | '80mm' | 'A4';
export type TicketFontSize = 'small' | 'medium' | 'large';

export interface PrintSettings {
  paperWidth: PaperWidth;
  fontSize: TicketFontSize;
  showLogo: boolean;
  showPricesOnKitchenTicket: boolean;
  footerAr: string;
  footerFr: string;
  footerEn: string;
  copies: number;
  autoPrintKitchen: boolean;
}

// Note: Intentionally does NOT start with 'menuqr_'
const SETTINGS_STORAGE_PREFIX = 'restoprint_settings_';
const AUTOPRINT_LOG_PREFIX = 'restoprint_autoprinted_';

const inMemoryPrintedIds = new Set<string>();

export function getDefaultPrintSettings(): PrintSettings {
  return {
    paperWidth: '80mm',
    fontSize: 'medium',
    showLogo: true,
    showPricesOnKitchenTicket: false,
    footerAr: 'شكراً لزيارتكم — نتمنى لكم وجبة شهية',
    footerFr: 'Merci de votre visite — Bon appétit',
    footerEn: 'Thank you for dining with us',
    copies: 1,
    autoPrintKitchen: false,
  };
}

export function loadPrintSettings(restaurantId?: string | null): PrintSettings {
  const defaults = getDefaultPrintSettings();
  if (!restaurantId || typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(`${SETTINGS_STORAGE_PREFIX}${restaurantId}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const copiesNum = Number(parsed?.copies);
    return {
      paperWidth:
        parsed?.paperWidth === '58mm' || parsed?.paperWidth === '80mm' || parsed?.paperWidth === 'A4'
          ? parsed.paperWidth
          : defaults.paperWidth,
      fontSize:
        parsed?.fontSize === 'small' || parsed?.fontSize === 'medium' || parsed?.fontSize === 'large'
          ? parsed.fontSize
          : defaults.fontSize,
      showLogo: typeof parsed?.showLogo === 'boolean' ? parsed.showLogo : defaults.showLogo,
      showPricesOnKitchenTicket:
        typeof parsed?.showPricesOnKitchenTicket === 'boolean'
          ? parsed.showPricesOnKitchenTicket
          : defaults.showPricesOnKitchenTicket,
      footerAr: typeof parsed?.footerAr === 'string' ? parsed.footerAr : defaults.footerAr,
      footerFr: typeof parsed?.footerFr === 'string' ? parsed.footerFr : defaults.footerFr,
      footerEn: typeof parsed?.footerEn === 'string' ? parsed.footerEn : defaults.footerEn,
      copies: Number.isFinite(copiesNum) && copiesNum >= 1 && copiesNum <= 5 ? Math.round(copiesNum) : 1,
      autoPrintKitchen:
        typeof parsed?.autoPrintKitchen === 'boolean' ? parsed.autoPrintKitchen : defaults.autoPrintKitchen,
    };
  } catch {
    return defaults;
  }
}

export function savePrintSettings(restaurantId: string | undefined | null, settings: PrintSettings): void {
  if (!restaurantId || typeof window === 'undefined') return;
  try {
    const normalized: PrintSettings = {
      ...settings,
      copies: Math.min(5, Math.max(1, Math.round(Number(settings.copies) || 1))),
    };
    window.localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${restaurantId}`, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota errors
  }
}

export function hasOrderBeenAutoPrinted(restaurantId: string, orderId: string): boolean {
  const compositeKey = `${restaurantId}:${orderId}`;
  if (inMemoryPrintedIds.has(compositeKey)) return true;
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem(`${AUTOPRINT_LOG_PREFIX}${restaurantId}`);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    if (Array.isArray(list) && list.includes(orderId)) {
      inMemoryPrintedIds.add(compositeKey);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function markOrderAutoPrinted(restaurantId: string, orderId: string): void {
  const compositeKey = `${restaurantId}:${orderId}`;
  inMemoryPrintedIds.add(compositeKey);
  if (typeof window === 'undefined') return;

  try {
    const storageKey = `${AUTOPRINT_LOG_PREFIX}${restaurantId}`;
    const raw = window.localStorage.getItem(storageKey);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list.filter((id) => id !== orderId) : [];
    next.push(orderId);
    // Keep only recent 200 order IDs
    const trimmed = next.slice(-200);
    window.localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

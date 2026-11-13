import {
  StatsPeriod,
  WeekStartDay,
  StatsSummary,
  MetricDelta,
  TimeSeriesPoint,
  TopProductStat,
  HourlyStat,
  CategoryStat,
  TableStat,
  StatusBreakdown,
  LatestOrderStat,
  FullPeriodStats,
  Order,
  Product,
  Restaurant,
  Language,
} from '../types';

/**
 * Africa/Algiers timezone is UTC+1 with no daylight saving time (standard offset +60 minutes).
 */
export const ALGIERS_OFFSET_HOURS = 1;
export const ALGIERS_TIMEZONE = 'Africa/Algiers';

interface AlgiersParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

/**
 * Returns the date components of a timestamp projected into Africa/Algiers (UTC+1)
 * strictly using Intl.DateTimeFormat with timeZone: 'Africa/Algiers'.
 */
export function getAlgiersParts(date: Date = new Date()): AlgiersParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ALGIERS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  let hour = parseInt(partMap.hour || '0', 10);
  if (hour === 24) hour = 0;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: parseInt(partMap.year || '2026', 10),
    month: parseInt(partMap.month || '1', 10),
    day: parseInt(partMap.day || '1', 10),
    hour,
    minute: parseInt(partMap.minute || '0', 10),
    second: parseInt(partMap.second || '0', 10),
    dayOfWeek: weekdayMap[partMap.weekday] !== undefined ? weekdayMap[partMap.weekday] : 0,
  };
}

/**
 * Creates an ISO 8601 string with explicit +01:00 offset for a given date in Algiers time.
 */
export function buildAlgiersIso(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  millisecond: number = 0
): string {
  const pad = (n: number, w: number = 2) => String(n).padStart(w, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}+01:00`;
}

/**
 * Returns current Algiers date string in YYYY-MM-DD format strictly via Intl.DateTimeFormat.
 */
export function getAlgiersDateString(date: Date = new Date()): string {
  const p = getAlgiersParts(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatAlgiersDateYmd(date: Date = new Date()): string {
  return getAlgiersDateString(date);
}

/**
 * Calculates exact milliseconds remaining until next midnight in Africa/Algiers timezone.
 */
export function getMsUntilNextAlgiersMidnight(date: Date = new Date()): number {
  const p = getAlgiersParts(date);
  const secondsPastMidnight = p.hour * 3600 + p.minute * 60 + p.second;
  const msPastMidnight = secondsPastMidnight * 1000 + (date.getMilliseconds() % 1000);
  const msInDay = 86400000;
  let diff = msInDay - msPastMidnight;
  if (diff <= 0) diff = msInDay;
  // Add 1 second buffer so execution lands safely in the new day
  return diff + 1000;
}

/**
 * Formats time as HH:mm in Africa/Algiers timezone.
 */
export function formatAlgiersTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    timeZone: ALGIERS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formats full datetime in Africa/Algiers timezone.
 */
export function formatAlgiersDateTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    timeZone: ALGIERS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Converts a YYYY-MM-DD date in Africa/Algiers timezone to its UTC ISO start-of-day instant (00:00:00.000 Algiers).
 */
export function getAlgiersStartOfDayUtcIso(ymd?: string): string {
  const target = ymd || getAlgiersDateString();
  const [y, m, d] = target.split('-').map((n) => parseInt(n, 10));
  return new Date(buildAlgiersIso(y, m, d, 0, 0, 0, 0)).toISOString();
}

/**
 * Converts a YYYY-MM-DD date in Africa/Algiers timezone to its UTC ISO end-of-day instant (23:59:59.999 Algiers).
 */
export function getAlgiersEndOfDayUtcIso(ymd?: string): string {
  const target = ymd || getAlgiersDateString();
  const [y, m, d] = target.split('-').map((n) => parseInt(n, 10));
  return new Date(buildAlgiersIso(y, m, d, 23, 59, 59, 999)).toISOString();
}

/**
 * Shifts a YYYY-MM-DD calendar date in Africa/Algiers by deltaDays using noon Algiers time to avoid boundary drift.
 */
export function shiftAlgiersYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  const baseNoon = new Date(buildAlgiersIso(y, m, d, 12, 0, 0, 0));
  return getAlgiersDateString(new Date(baseNoon.getTime() + deltaDays * 86400000));
}

/**
 * Formats the current Algiers board date cleanly (e.g. "Tuesday 10/11/2026") for AR/FR/EN.
 */
export function formatAlgiersBoardDate(lang: Language, date: Date = new Date()): string {
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB';
  const weekday = new Intl.DateTimeFormat(locale, {
    timeZone: ALGIERS_TIMEZONE,
    weekday: 'long',
  }).format(date);
  const dmy = new Intl.DateTimeFormat('en-GB', {
    timeZone: ALGIERS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday} ${dmy}`;
}

/**
 * Formats an ISO timestamp or YYYY-MM-DD string as DD/MM/YYYY in Africa/Algiers timezone.
 */
export function formatAlgiersShortDate(isoOrYmd: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) {
    const [y, m, d] = isoOrYmd.split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(isoOrYmd);
  if (Number.isNaN(parsed.getTime())) return isoOrYmd;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ALGIERS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

/**
 * Formats an ISO timestamp or YYYY-MM-DD string as DD/MM in Africa/Algiers timezone (e.g. "12/11").
 */
export function formatAlgiersDayMonth(isoOrYmd: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) {
    const [, m, d] = isoOrYmd.split('-');
    return `${d}/${m}`;
  }
  const parsed = new Date(isoOrYmd);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ALGIERS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
}

/**
 * Number of days to subtract from current dayOfWeek to reach the weekStartDay.
 */
function getDaysSinceWeekStart(currentDow: number, weekStartDay: WeekStartDay): number {
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const startMap: Record<WeekStartDay, number> = {
    sunday: 0,
    monday: 1,
    saturday: 6,
  };
  const targetDow = startMap[weekStartDay];
  let diff = currentDow - targetDow;
  if (diff < 0) diff += 7;
  return diff;
}

export interface PeriodRange {
  current: {
    fromIso: string;
    toIso: string;
    labelAr: string;
    labelFr: string;
    labelEn: string;
  };
  previous: {
    fromIso: string;
    toIso: string;
  };
  bucket: 'hour' | 'day' | 'week';
}

/**
 * Computes exact period date boundaries in Africa/Algiers timezone (UTC+1).
 */
export function getPeriodDateRange(
  period: StatsPeriod,
  weekStartDay: WeekStartDay = 'saturday',
  customStart?: string,
  customEnd?: string
): PeriodRange {
  const now = new Date();
  const p = getAlgiersParts(now);

  const pad = (n: number) => String(n).padStart(2, '0');
  const makeYmd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

  if (period === 'today') {
    const fromIso = buildAlgiersIso(p.year, p.month, p.day, 0, 0, 0, 0);
    const toIso = buildAlgiersIso(p.year, p.month, p.day, 23, 59, 59, 999);

    // Yesterday for delta comparison
    const yDate = new Date(Date.now() - 86400000);
    const yp = getAlgiersParts(yDate);
    const prevFrom = buildAlgiersIso(yp.year, yp.month, yp.day, 0, 0, 0, 0);
    const prevTo = buildAlgiersIso(yp.year, yp.month, yp.day, 23, 59, 59, 999);

    return {
      current: {
        fromIso,
        toIso,
        labelAr: `اليوم (${makeYmd(p.year, p.month, p.day)})`,
        labelFr: `Aujourd'hui (${makeYmd(p.year, p.month, p.day)})`,
        labelEn: `Today (${makeYmd(p.year, p.month, p.day)})`,
      },
      previous: { fromIso: prevFrom, toIso: prevTo },
      bucket: 'hour',
    };
  }

  if (period === 'yesterday') {
    const yDate = new Date(Date.now() - 86400000);
    const yp = getAlgiersParts(yDate);
    const fromIso = buildAlgiersIso(yp.year, yp.month, yp.day, 0, 0, 0, 0);
    const toIso = buildAlgiersIso(yp.year, yp.month, yp.day, 23, 59, 59, 999);

    // Day before yesterday
    const dbyDate = new Date(Date.now() - 2 * 86400000);
    const dbyp = getAlgiersParts(dbyDate);
    const prevFrom = buildAlgiersIso(dbyp.year, dbyp.month, dbyp.day, 0, 0, 0, 0);
    const prevTo = buildAlgiersIso(dbyp.year, dbyp.month, dbyp.day, 23, 59, 59, 999);

    return {
      current: {
        fromIso,
        toIso,
        labelAr: `أمس (${makeYmd(yp.year, yp.month, yp.day)})`,
        labelFr: `Hier (${makeYmd(yp.year, yp.month, yp.day)})`,
        labelEn: `Yesterday (${makeYmd(yp.year, yp.month, yp.day)})`,
      },
      previous: { fromIso: prevFrom, toIso: prevTo },
      bucket: 'hour',
    };
  }

  if (period === 'this_week') {
    const daysSince = getDaysSinceWeekStart(p.dayOfWeek, weekStartDay);
    const weekStartDate = new Date(Date.now() - daysSince * 86400000);
    const wsp = getAlgiersParts(weekStartDate);

    const fromIso = buildAlgiersIso(wsp.year, wsp.month, wsp.day, 0, 0, 0, 0);
    const toIso = buildAlgiersIso(p.year, p.month, p.day, 23, 59, 59, 999);

    // Previous week equivalent
    const prevWeekStart = new Date(weekStartDate.getTime() - 7 * 86400000);
    const prevWeekEnd = new Date(Date.now() - 7 * 86400000);
    const pwsp = getAlgiersParts(prevWeekStart);
    const pwep = getAlgiersParts(prevWeekEnd);

    return {
      current: {
        fromIso,
        toIso,
        labelAr: `هذا الأسبوع (${makeYmd(wsp.year, wsp.month, wsp.day)} إلى ${makeYmd(p.year, p.month, p.day)})`,
        labelFr: `Cette semaine (${makeYmd(wsp.year, wsp.month, wsp.day)} au ${makeYmd(p.year, p.month, p.day)})`,
        labelEn: `This Week (${makeYmd(wsp.year, wsp.month, wsp.day)} to ${makeYmd(p.year, p.month, p.day)})`,
      },
      previous: {
        fromIso: buildAlgiersIso(pwsp.year, pwsp.month, pwsp.day, 0, 0, 0, 0),
        toIso: buildAlgiersIso(pwep.year, pwep.month, pwep.day, 23, 59, 59, 999),
      },
      bucket: 'day',
    };
  }

  if (period === 'last_week') {
    const daysSince = getDaysSinceWeekStart(p.dayOfWeek, weekStartDay);
    const thisWeekStart = new Date(Date.now() - daysSince * 86400000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1 * 86400000);

    const lwsp = getAlgiersParts(lastWeekStart);
    const lwep = getAlgiersParts(lastWeekEnd);

    const prevWeekStart = new Date(lastWeekStart.getTime() - 7 * 86400000);
    const prevWeekEnd = new Date(lastWeekEnd.getTime() - 7 * 86400000);
    const plwsp = getAlgiersParts(prevWeekStart);
    const plwep = getAlgiersParts(prevWeekEnd);

    return {
      current: {
        fromIso: buildAlgiersIso(lwsp.year, lwsp.month, lwsp.day, 0, 0, 0, 0),
        toIso: buildAlgiersIso(lwep.year, lwep.month, lwep.day, 23, 59, 59, 999),
        labelAr: `الأسبوع الماضي (${makeYmd(lwsp.year, lwsp.month, lwsp.day)} إلى ${makeYmd(lwep.year, lwep.month, lwep.day)})`,
        labelFr: `Semaine dernière (${makeYmd(lwsp.year, lwsp.month, lwsp.day)} au ${makeYmd(lwep.year, lwep.month, lwep.day)})`,
        labelEn: `Last Week (${makeYmd(lwsp.year, lwsp.month, lwsp.day)} to ${makeYmd(lwep.year, lwep.month, lwep.day)})`,
      },
      previous: {
        fromIso: buildAlgiersIso(plwsp.year, plwsp.month, plwsp.day, 0, 0, 0, 0),
        toIso: buildAlgiersIso(plwep.year, plwep.month, plwep.day, 23, 59, 59, 999),
      },
      bucket: 'day',
    };
  }

  if (period === 'this_month') {
    const fromIso = buildAlgiersIso(p.year, p.month, 1, 0, 0, 0, 0);
    const toIso = buildAlgiersIso(p.year, p.month, p.day, 23, 59, 59, 999);

    // Previous month (same days up to p.day)
    const prevMonth = p.month === 1 ? 12 : p.month - 1;
    const prevYear = p.month === 1 ? p.year - 1 : p.year;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const prevDay = Math.min(p.day, daysInPrevMonth);

    return {
      current: {
        fromIso,
        toIso,
        labelAr: `هذا الشهر (${makeYmd(p.year, p.month, 1)} إلى ${makeYmd(p.year, p.month, p.day)})`,
        labelFr: `Ce mois (${makeYmd(p.year, p.month, 1)} au ${makeYmd(p.year, p.month, p.day)})`,
        labelEn: `This Month (${makeYmd(p.year, p.month, 1)} to ${makeYmd(p.year, p.month, p.day)})`,
      },
      previous: {
        fromIso: buildAlgiersIso(prevYear, prevMonth, 1, 0, 0, 0, 0),
        toIso: buildAlgiersIso(prevYear, prevMonth, prevDay, 23, 59, 59, 999),
      },
      bucket: 'day',
    };
  }

  if (period === 'last_month') {
    const prevMonth = p.month === 1 ? 12 : p.month - 1;
    const prevYear = p.month === 1 ? p.year - 1 : p.year;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

    const fromIso = buildAlgiersIso(prevYear, prevMonth, 1, 0, 0, 0, 0);
    const toIso = buildAlgiersIso(prevYear, prevMonth, daysInPrevMonth, 23, 59, 59, 999);

    // Two months ago
    const twoMonthsAgo = prevMonth === 1 ? 12 : prevMonth - 1;
    const twoYearsAgo = prevMonth === 1 ? prevYear - 1 : prevYear;
    const daysInTwoMonthsAgo = new Date(twoYearsAgo, twoMonthsAgo, 0).getDate();

    return {
      current: {
        fromIso,
        toIso,
        labelAr: `الشهر الماضي (${makeYmd(prevYear, prevMonth, 1)} إلى ${makeYmd(prevYear, prevMonth, daysInPrevMonth)})`,
        labelFr: `Mois dernier (${makeYmd(prevYear, prevMonth, 1)} au ${makeYmd(prevYear, prevMonth, daysInPrevMonth)})`,
        labelEn: `Last Month (${makeYmd(prevYear, prevMonth, 1)} to ${makeYmd(prevYear, prevMonth, daysInPrevMonth)})`,
      },
      previous: {
        fromIso: buildAlgiersIso(twoYearsAgo, twoMonthsAgo, 1, 0, 0, 0, 0),
        toIso: buildAlgiersIso(twoYearsAgo, twoMonthsAgo, daysInTwoMonthsAgo, 23, 59, 59, 999),
      },
      bucket: 'day',
    };
  }

  // Custom period
  const startStr = customStart || formatAlgiersDateYmd();
  const endStr = customEnd || formatAlgiersDateYmd();

  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);

  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);
  const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEndDate = new Date(startDate.getTime() - 86400000);
  const prevStartDate = new Date(prevEndDate.getTime() - (diffDays - 1) * 86400000);
  const psParts = getAlgiersParts(prevStartDate);
  const peParts = getAlgiersParts(prevEndDate);

  const bucket: 'hour' | 'day' | 'week' = diffDays <= 1 ? 'hour' : diffDays <= 35 ? 'day' : 'week';

  return {
    current: {
      fromIso: buildAlgiersIso(sy, sm, sd, 0, 0, 0, 0),
      toIso: buildAlgiersIso(ey, em, ed, 23, 59, 59, 999),
      labelAr: `فترة مخصصة (${startStr} إلى ${endStr})`,
      labelFr: `Période personnalisée (${startStr} au ${endStr})`,
      labelEn: `Custom Range (${startStr} to ${endStr})`,
    },
    previous: {
      fromIso: buildAlgiersIso(psParts.year, psParts.month, psParts.day, 0, 0, 0, 0),
      toIso: buildAlgiersIso(peParts.year, peParts.month, peParts.day, 23, 59, 59, 999),
    },
    bucket,
  };
}

/**
 * Calculates percentage delta between current and previous values.
 */
export function calculateDelta(current: number, previous: number): MetricDelta {
  if (previous === 0) {
    if (current === 0) {
      return { percent: 0, isUp: false, isNeutral: true };
    }
    return { percent: 100, isUp: true, isNeutral: false };
  }

  const rawDelta = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(rawDelta) * 10) / 10;

  return {
    percent: rounded,
    isUp: rawDelta > 0,
    isNeutral: rawDelta === 0,
  };
}



/**
 * High-fidelity client-side statistics aggregation fallback.
 * Used whenever Supabase RPC is offline or pending execution.
 */
export function computeClientStats(
  orders: Order[],
  products: Product[],
  period: StatsPeriod,
  weekStartDay: WeekStartDay = 'saturday',
  customStart?: string,
  customEnd?: string,
  isAdmin: boolean = true
): FullPeriodStats {
  const range = getPeriodDateRange(period, weekStartDay, customStart, customEnd);
  const currentStart = new Date(range.current.fromIso).getTime();
  const currentEnd = new Date(range.current.toIso).getTime();
  const prevStart = new Date(range.previous.fromIso).getTime();
  const prevEnd = new Date(range.previous.toIso).getTime();

  // Helper filter
  const filterOrders = (start: number, end: number) => {
    return orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start && t <= end;
    });
  };

  const currentOrders = filterOrders(currentStart, currentEnd);
  const prevOrders = filterOrders(prevStart, prevEnd);

  // Status exclusion: only count valid (not cancelled) orders for revenue and averages
  const validCurrentOrders = currentOrders.filter((o) => o.status !== 'cancelled');
  const validPrevOrders = prevOrders.filter((o) => o.status !== 'cancelled');

  const cancelledCurrentCount = currentOrders.filter((o) => o.status === 'cancelled').length;
  const cancelledPrevCount = prevOrders.filter((o) => o.status === 'cancelled').length;

  const currentRevenue = isAdmin ? validCurrentOrders.reduce((acc, o) => acc + (o.total || 0), 0) : 0;
  const prevRevenue = isAdmin ? validPrevOrders.reduce((acc, o) => acc + (o.total || 0), 0) : 0;

  const currentCount = validCurrentOrders.length;
  const prevCount = validPrevOrders.length;

  const currentAov = isAdmin && currentCount > 0 ? Math.round(currentRevenue / currentCount) : 0;
  const prevAov = isAdmin && prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;

  const currentItems = validCurrentOrders.reduce((acc, o) => {
    return acc + o.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }, 0);
  const prevItems = validPrevOrders.reduce((acc, o) => {
    return acc + o.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }, 0);

  const currentDiscounts = isAdmin
    ? validCurrentOrders.reduce((acc, o) => acc + (o.discountTotal || 0), 0)
    : 0;
  const prevDiscounts = isAdmin
    ? validPrevOrders.reduce((acc, o) => acc + (o.discountTotal || 0), 0)
    : 0;

  const summary: StatsSummary = {
    total_revenue: currentRevenue,
    orders_count: currentCount,
    avg_order_value: currentAov,
    items_sold: currentItems,
    total_discounts: currentDiscounts,
    cancelled_orders: cancelledCurrentCount,
    is_admin: isAdmin,
  };

  const previousSummary: StatsSummary = {
    total_revenue: prevRevenue,
    orders_count: prevCount,
    avg_order_value: prevAov,
    items_sold: prevItems,
    total_discounts: prevDiscounts,
    cancelled_orders: cancelledPrevCount,
    is_admin: isAdmin,
  };

  const deltas = {
    revenue: calculateDelta(summary.total_revenue, previousSummary.total_revenue),
    orders: calculateDelta(summary.orders_count, previousSummary.orders_count),
    aov: calculateDelta(summary.avg_order_value, previousSummary.avg_order_value),
    items: calculateDelta(summary.items_sold, previousSummary.items_sold),
    discounts: calculateDelta(summary.total_discounts, previousSummary.total_discounts),
    cancelled: calculateDelta(summary.cancelled_orders, previousSummary.cancelled_orders),
  };

  // Top products
  const productMap = new Map<string, { quantity: number; revenue: number; orders: Set<string>; prod: Product | null; name: string }>();

  validCurrentOrders.forEach((o) => {
    o.items.forEach((it) => {
      const pid = it.product?.id || it.product?.name?.en || 'unknown';
      const pName = it.product?.name?.ar || it.product?.name?.fr || it.product?.name?.en || 'Dish';
      const existing = productMap.get(pid) || {
        quantity: 0,
        revenue: 0,
        orders: new Set<string>(),
        prod: it.product || null,
        name: pName,
      };
      existing.quantity += it.quantity;
      existing.revenue += it.totalPrice || 0;
      existing.orders.add(o.id);
      productMap.set(pid, existing);
    });
  });

  const topProductsSorted = Array.from(productMap.entries())
    .map(([id, val]) => ({
      product_id: id,
      product_name: val.name,
      name_ar: val.prod?.name?.ar || val.name,
      name_fr: val.prod?.name?.fr || val.name,
      name_en: val.prod?.name?.en || val.name,
      image_url: val.prod?.image || (val.prod as any)?.imageUrl || null,
      quantity: val.quantity,
      revenue: isAdmin ? val.revenue : 0,
      orders_count: val.orders.size,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const maxQty = topProductsSorted[0]?.quantity || 1;
  const topProducts: TopProductStat[] = topProductsSorted.map((p) => ({
    ...p,
    percent: Math.min(100, Math.round((p.quantity / maxQty) * 100)),
  }));

  // Hourly distribution (0 to 23 in Africa/Algiers)
  const hourlyCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orders_count: 0,
    revenue: 0,
  }));

  validCurrentOrders.forEach((o) => {
    const pDate = getAlgiersParts(new Date(o.createdAt));
    if (hourlyCounts[pDate.hour]) {
      hourlyCounts[pDate.hour].orders_count += 1;
      if (isAdmin) {
        hourlyCounts[pDate.hour].revenue += o.total || 0;
      }
    }
  });

  // Category breakdown
  const catMap = new Map<string, { items: number; revenue: number; orders: Set<string>; catName: any }>();
  validCurrentOrders.forEach((o) => {
    o.items.forEach((it) => {
      const catId = it.product?.categoryId || 'general';
      const existing = catMap.get(catId) || {
        items: 0,
        revenue: 0,
        orders: new Set<string>(),
        catName: (it.product as any)?.categoryName || { ar: 'عام', fr: 'Général', en: 'General' },
      };
      existing.items += it.quantity;
      existing.revenue += it.totalPrice || 0;
      existing.orders.add(o.id);
      catMap.set(catId, existing);
    });
  });

  const totalCatRevenue = Array.from(catMap.values()).reduce((sum, c) => sum + c.revenue, 0) || 1;
  const categories: CategoryStat[] = Array.from(catMap.entries()).map(([cid, val]) => ({
    category_id: cid,
    name_ar: typeof val.catName === 'object' ? val.catName?.ar || 'قسم' : String(val.catName),
    name_fr: typeof val.catName === 'object' ? val.catName?.fr || 'Catégorie' : String(val.catName),
    name_en: typeof val.catName === 'object' ? val.catName?.en || 'Category' : String(val.catName),
    items_sold: val.items,
    revenue: isAdmin ? val.revenue : 0,
    orders_count: val.orders.size,
    percent: Math.min(100, Math.round((val.revenue / totalCatRevenue) * 100)),
  })).sort((a, b) => b.revenue - a.revenue);

  // Tables breakdown
  const tableMap = new Map<number, { orders: number; revenue: number }>();
  validCurrentOrders.forEach((o) => {
    const tnum = o.tableNumber || 1;
    const existing = tableMap.get(tnum) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += o.total || 0;
    tableMap.set(tnum, existing);
  });

  const maxTableOrders = Math.max(...Array.from(tableMap.values()).map((v) => v.orders), 1);
  const tables: TableStat[] = Array.from(tableMap.entries())
    .map(([tnum, val]) => ({
      table_number: tnum,
      orders_count: val.orders,
      revenue: isAdmin ? val.revenue : 0,
      percent: Math.min(100, Math.round((val.orders / maxTableOrders) * 100)),
    }))
    .sort((a, b) => b.orders_count - a.orders_count)
    .slice(0, 8);

  // Statuses breakdown
  const statusCounts: Record<string, number> = {
    received: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    cancelled: 0,
  };
  currentOrders.forEach((o) => {
    const s = o.status === 'new' ? 'received' : o.status;
    if (statusCounts[s] !== undefined) {
      statusCounts[s] += 1;
    } else {
      statusCounts[s] = 1;
    }
  });

  const totalStatusCount = currentOrders.length || 1;
  const statuses: StatusBreakdown[] = Object.entries(statusCounts).map(([s, count]) => ({
    status: s as any,
    count,
    percent: Math.round((count / totalStatusCount) * 100),
  }));

  // TimeSeries points
  const timeBuckets = new Map<string, { orders: number; revenue: number }>();
  validCurrentOrders.forEach((o) => {
    const pDate = getAlgiersParts(new Date(o.createdAt));
    const pad = (n: number) => String(n).padStart(2, '0');
    let key = `${pDate.year}-${pad(pDate.month)}-${pad(pDate.day)}`;
    if (range.bucket === 'hour') {
      key = `${pad(pDate.hour)}:00`;
    }
    const existing = timeBuckets.get(key) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += o.total || 0;
    timeBuckets.set(key, existing);
  });

  const timeseries: TimeSeriesPoint[] = Array.from(timeBuckets.entries())
    .map(([tb, val]) => ({
      time_bucket: tb,
      orders_count: val.orders,
      revenue: isAdmin ? val.revenue : 0,
    }))
    .sort((a, b) => a.time_bucket.localeCompare(b.time_bucket));

  // Latest orders
  const latestOrders: LatestOrderStat[] = currentOrders
    .slice(0, 15)
    .map((o) => ({
      id: o.id,
      order_number: o.orderNumber,
      order_date: o.orderDate ?? null,
      table_number: o.tableNumber,
      status: o.status,
      total: isAdmin ? o.total : 0,
      created_at: o.createdAt,
    }));

  return {
    summary,
    previousSummary,
    deltas,
    timeseries,
    topProducts,
    hourly: hourlyCounts,
    categories,
    tables,
    statuses,
    latestOrders,
    dateRangeLabel: {
      ar: range.current.labelAr,
      fr: range.current.labelFr,
      en: range.current.labelEn,
    },
    period,
    bucket: range.bucket,
  };
}

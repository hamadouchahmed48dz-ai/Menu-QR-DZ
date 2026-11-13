import { Offer, Product, CartItem, AppliedOffer, Category } from '../types';

/**
 * Normalizes date, weekday, and time to Africa/Algiers timezone (UTC+1, no DST).
 * Weekday: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (strictly matching AdminOffers & PostgreSQL EXTRACT(DOW)).
 */
export interface AlgiersDateInfo {
  dateStr: string; // 'YYYY-MM-DD'
  timeStr: string; // 'HH:MM'
  minutes: number; // 0 - 1439
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export function getAlgiersDateInfo(date: Date = new Date()): AlgiersDateInfo {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap['year'] || '1970';
  const month = partMap['month'] || '01';
  const day = partMap['day'] || '01';
  let hour = parseInt(partMap['hour'] || '0', 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap['minute'] || '0', 10);

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const minutes = hour * 60 + minute;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[partMap['weekday']] ?? 0;

  return { dateStr, timeStr, minutes, dayOfWeek };
}

export type HiddenReason =
  | 'inactive'
  | 'not started'
  | 'expired'
  | 'wrong weekday'
  | 'outside hours'
  | 'no matching dish';

/**
 * Validates offer against Africa/Algiers timezone and returns the exact reason if hidden.
 */
export function checkOfferValidityWithReason(
  offer: Offer,
  orderSubtotal?: number,
  now: Date = new Date()
): { isValid: boolean; reason?: HiddenReason; details?: string } {
  const title = offer.title?.en || offer.title?.fr || offer.title?.ar || offer.id;

  // 1. Inactive check (is_active is single source of truth)
  if (offer.isActive === false) {
    return {
      isValid: false,
      reason: 'inactive',
      details: `Offer "${title}" (${offer.id}) has is_active=false`,
    };
  }

  const algiers = getAlgiersDateInfo(now);

  // 2. Start Date Check
  if (offer.startDate && offer.startDate > algiers.dateStr) {
    return {
      isValid: false,
      reason: 'not started',
      details: `Offer "${title}" (${offer.id}) starts on ${offer.startDate} (today in Algiers is ${algiers.dateStr})`,
    };
  }

  // 3. End Date Check
  if (offer.endDate && offer.endDate < algiers.dateStr) {
    return {
      isValid: false,
      reason: 'expired',
      details: `Offer "${title}" (${offer.id}) expired on ${offer.endDate} (today in Algiers is ${algiers.dateStr})`,
    };
  }

  // 4. Active Days of Week Check (0 = Sun, 1 = Mon, ..., 6 = Sat)
  if (offer.activeDays && offer.activeDays.length > 0) {
    if (!offer.activeDays.includes(algiers.dayOfWeek)) {
      return {
        isValid: false,
        reason: 'wrong weekday',
        details: `Offer "${title}" (${offer.id}) active on [${offer.activeDays.join(
          ', '
        )}], today in Algiers is weekday ${algiers.dayOfWeek}`,
      };
    }
  }

  // 5. Time Window (Happy Hour) Check
  if (offer.startTime && offer.endTime) {
    const [startH, startM] = offer.startTime.split(':').map(Number);
    const [endH, endM] = offer.endTime.split(':').map(Number);
    const startTotal = (startH || 0) * 60 + (startM || 0);
    const endTotal = (endH || 0) * 60 + (endM || 0);

    let inWindow = false;
    if (startTotal <= endTotal) {
      inWindow = algiers.minutes >= startTotal && algiers.minutes <= endTotal;
    } else {
      // Overnight time window (e.g. 22:00 to 02:00)
      inWindow = algiers.minutes >= startTotal || algiers.minutes <= endTotal;
    }

    if (!inWindow) {
      return {
        isValid: false,
        reason: 'outside hours',
        details: `Offer "${title}" (${offer.id}) active between ${offer.startTime} and ${offer.endTime} (current time in Algiers is ${algiers.timeStr})`,
      };
    }
  }

  // 6. Minimum Order Amount Check
  if (offer.minOrderAmount != null && orderSubtotal != null) {
    if (orderSubtotal < offer.minOrderAmount) {
      return {
        isValid: false,
        reason: 'inactive', // subtotal threshold not met
        details: `Offer "${title}" requires minimum order of ${offer.minOrderAmount} DA (current subtotal: ${orderSubtotal} DA)`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a promotional offer is active and valid right now in Africa/Algiers timezone.
 */
export function isOfferCurrentlyValid(
  offer: Offer,
  orderSubtotal?: number,
  now: Date = new Date(),
  logErrors: boolean = false
): boolean {
  const result = checkOfferValidityWithReason(offer, orderSubtotal, now);
  if (!result.isValid && logErrors && import.meta.env.DEV) {
    console.error(`[Promotion Hidden] ${result.reason}: ${result.details}`);
  }
  return result.isValid;
}

/**
 * Calculates the promotional status for admin badges using Africa/Algiers date
 */
export function getOfferStatus(
  offer: Offer,
  now: Date = new Date()
): 'active' | 'scheduled' | 'expired' | 'paused' {
  if (!offer.isActive) return 'paused';

  const algiers = getAlgiersDateInfo(now);
  if (offer.startDate && offer.startDate > algiers.dateStr) {
    return 'scheduled';
  }
  if (offer.endDate && offer.endDate < algiers.dateStr) {
    return 'expired';
  }

  return 'active';
}

/**
 * Finds the single best discount for a specific product among all valid offers.
 * - Product offers: match only if product.id is in target_product_ids (or target_product_id).
 * - Category offers: match only if product.categoryId matches target_category_id.
 * - Order offers: apply at checkout, NOT on individual product cards.
 * - Scoped to the current restaurant.
 */
export function getBestDiscountForProduct(
  product: Product,
  offers: Offer[],
  orderSubtotal?: number,
  now: Date = new Date()
): {
  discountedPrice: number;
  discountAmount: number;
  discountBadge: string;
  offer: Offer | null;
} {
  const validOffers = offers.filter((o) => isOfferCurrentlyValid(o, orderSubtotal, now));

  let bestDiscount = 0;
  let matchingOffer: Offer | null = null;

  for (const offer of validOffers) {
    // Restaurant scoping check if offer specifies restaurantId
    if (offer.restaurantId && product.restaurantId && offer.restaurantId !== product.restaurantId) {
      continue;
    }

    // Check scope match: only 'product' or 'category' offers apply to individual product cards
    const isProductMatch =
      offer.appliesTo === 'product' &&
      ((offer.targetProductIds &&
        offer.targetProductIds.some((id) => id.toLowerCase() === product.id.toLowerCase())) ||
        offer.targetProductId?.toLowerCase() === product.id.toLowerCase());

    const isCategoryMatch =
      offer.appliesTo === 'category' &&
      Boolean(offer.targetCategoryId && product.categoryId && offer.targetCategoryId.toLowerCase() === product.categoryId.toLowerCase());

    if (isProductMatch || isCategoryMatch) {
      let discount = 0;
      if (offer.type === 'percentage') {
        discount = Math.round((product.price * (offer.value / 100)) * 100) / 100;
      } else {
        discount = Math.min(product.price, offer.value);
      }

      if (discount > bestDiscount) {
        bestDiscount = discount;
        matchingOffer = offer;
      }
    }
  }

  if (bestDiscount > 0 && matchingOffer) {
    const discountedPrice = Math.max(0, product.price - bestDiscount);
    const discountBadge =
      matchingOffer.type === 'percentage'
        ? `-${matchingOffer.value}%`
        : `-${matchingOffer.value} DA`;

    return {
      discountedPrice,
      discountAmount: bestDiscount,
      discountBadge,
      offer: matchingOffer,
    };
  }

  return {
    discountedPrice: product.price,
    discountAmount: 0,
    discountBadge: '',
    offer: null,
  };
}

/**
 * Recomputes full cart pricing (subtotal, item discounts, applied offers, final total)
 * strictly applying the single best discount per item with no negative totals,
 * and applying whole-order offers at checkout.
 */
export function calculateOrderPricing(
  items: CartItem[],
  offers: Offer[],
  now: Date = new Date()
): {
  subtotal: number;
  discountTotal: number;
  finalTotal: number;
  appliedOffers: AppliedOffer[];
  itemDiscounts: Map<
    string,
    {
      unitPrice: number;
      discountedUnitPrice: number;
      itemDiscountTotal: number;
      badge: string;
      offerId: string | null;
    }
  >;
} {
  // Step 1: Compute raw subtotal
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Step 2: Compute best discount per item (from product or category offers)
  let itemDiscountTotal = 0;
  const itemDiscounts = new Map<
    string,
    {
      unitPrice: number;
      discountedUnitPrice: number;
      itemDiscountTotal: number;
      badge: string;
      offerId: string | null;
    }
  >();

  const offerTotals = new Map<
    string,
    {
      offer: Offer;
      totalSaved: number;
    }
  >();

  for (const item of items) {
    const baseUnit = item.unitPrice;
    const discountResult = getBestDiscountForProduct(item.product, offers, subtotal, now);

    if (discountResult.discountAmount > 0 && discountResult.offer) {
      const discountedUnit = Math.max(0, baseUnit - discountResult.discountAmount);
      const totalItemDisc = (baseUnit - discountedUnit) * item.quantity;
      itemDiscountTotal += totalItemDisc;

      itemDiscounts.set(item.id, {
        unitPrice: baseUnit,
        discountedUnitPrice: discountedUnit,
        itemDiscountTotal: totalItemDisc,
        badge: discountResult.discountBadge,
        offerId: discountResult.offer.id,
      });

      const existing = offerTotals.get(discountResult.offer.id);
      if (existing) {
        existing.totalSaved += totalItemDisc;
      } else {
        offerTotals.set(discountResult.offer.id, {
          offer: discountResult.offer,
          totalSaved: totalItemDisc,
        });
      }
    } else {
      itemDiscounts.set(item.id, {
        unitPrice: baseUnit,
        discountedUnitPrice: baseUnit,
        itemDiscountTotal: 0,
        badge: '',
        offerId: null,
      });
    }
  }

  // Step 3: Check for whole-order offers
  const remainingAfterItemDiscounts = Math.max(0, subtotal - itemDiscountTotal);
  let bestOrderDiscount = 0;
  let bestOrderOffer: Offer | null = null;

  const validOrderOffers = offers.filter(
    (o) => o.appliesTo === 'order' && isOfferCurrentlyValid(o, subtotal, now)
  );

  for (const oOffer of validOrderOffers) {
    let disc = 0;
    if (oOffer.type === 'percentage') {
      disc = Math.round((remainingAfterItemDiscounts * (oOffer.value / 100)) * 100) / 100;
    } else {
      disc = Math.min(remainingAfterItemDiscounts, oOffer.value);
    }
    if (disc > bestOrderDiscount) {
      bestOrderDiscount = disc;
      bestOrderOffer = oOffer;
    }
  }

  if (bestOrderDiscount > 0 && bestOrderOffer) {
    const existing = offerTotals.get(bestOrderOffer.id);
    if (existing) {
      existing.totalSaved += bestOrderDiscount;
    } else {
      offerTotals.set(bestOrderOffer.id, {
        offer: bestOrderOffer,
        totalSaved: bestOrderDiscount,
      });
    }
  }

  const discountTotal = itemDiscountTotal + bestOrderDiscount;
  const finalTotal = Math.max(0, subtotal - discountTotal);

  const appliedOffers: AppliedOffer[] = Array.from(offerTotals.values()).map(({ offer, totalSaved }) => ({
    id: offer.id,
    title: offer.title.en,
    type: offer.type,
    value: offer.value,
    discountAmount: totalSaved,
  }));

  return {
    subtotal,
    discountTotal,
    finalTotal,
    appliedOffers,
    itemDiscounts,
  };
}

/**
 * In development only: logs with console.error why each offer in the restaurant is hidden
 * (inactive, not started, expired, wrong weekday, outside hours, no matching dish)
 */
export function logHiddenOffersInDev(
  offers: Offer[],
  products: Product[],
  categories: Category[],
  currentRestaurantId?: string,
  now: Date = new Date()
): void {
  if (!import.meta.env.DEV || offers.length === 0) return;

  for (const offer of offers) {
    const title = offer.title?.en || offer.title?.fr || offer.title?.ar || offer.id;

    // Check restaurant isolation
    if (currentRestaurantId && offer.restaurantId && offer.restaurantId !== currentRestaurantId) {
      console.error(
        `[Promotion Hidden] different restaurant: "${title}" (${offer.id}) belongs to ${offer.restaurantId}, current restaurant is ${currentRestaurantId}`
      );
      continue;
    }

    // Check validity in Africa/Algiers timezone
    const check = checkOfferValidityWithReason(offer, undefined, now);
    if (!check.isValid) {
      console.error(`[Promotion Hidden] ${check.reason}: ${check.details}`);
      continue;
    }

    // If valid, check if dishes or categories exist in this restaurant
    if (offer.appliesTo === 'product') {
      const targetIds =
        offer.targetProductIds && offer.targetProductIds.length > 0
          ? offer.targetProductIds
          : offer.targetProductId
          ? [offer.targetProductId]
          : [];

      const matchingDishes = products.filter((p) =>
        targetIds.some((id) => id.toLowerCase() === p.id.toLowerCase())
      );

      if (matchingDishes.length === 0) {
        console.error(
          `[Promotion Hidden] no matching dish: "${title}" (${offer.id}) targets dish IDs [${targetIds.join(
            ', '
          )}], but none exist in the restaurant menu catalog`
        );
      }
    } else if (offer.appliesTo === 'category') {
      const matchingCat = categories.find((c) => c.id === offer.targetCategoryId);
      if (!matchingCat) {
        console.error(
          `[Promotion Hidden] no matching category: "${title}" (${offer.id}) targets category ID "${offer.targetCategoryId}", which does not exist in the restaurant categories`
        );
      }
    }
  }
}

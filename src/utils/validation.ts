import { CartItem, Product } from '../types';

/**
 * Checks whether a given string is a valid UUID (v1-v7)
 */
export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

/**
 * Sanitizes plain text input by stripping HTML tags and trimming.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[<>'"&]/g, (char) => {
      // Basic entity encoding for dangerous characters
      switch (char) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case "'":
          return '&#39;';
        case '"':
          return '&quot;';
        case '&':
          return '&amp;';
        default:
          return char;
      }
    })
    .trim();
}

/**
 * Validates customer notes against length limits and malicious content.
 */
export function validateCustomerNotes(notes?: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!notes || !notes.trim()) {
    return { isValid: true, sanitized: '' };
  }

  const clean = sanitizeInput(notes);
  if (clean.length > 300) {
    return {
      isValid: false,
      sanitized: clean.slice(0, 300),
      error: 'Notes must not exceed 300 characters.',
    };
  }

  return { isValid: true, sanitized: clean };
}

/**
 * Validates a cart item's quantity. Min 1, Max 20.
 */
export function validateQuantity(quantity: number): number {
  if (isNaN(quantity) || quantity < 1) return 1;
  if (quantity > 20) return 20;
  return Math.floor(quantity);
}

/**
 * Verifies that all cart items are currently available and recalculates
 * the verified total against live products catalog to prevent price tampering.
 */
export function validateCartIntegrity(
  cart: CartItem[],
  liveProducts: Product[]
): {
  isValid: boolean;
  unavailableProducts: string[];
  verifiedTotal: number;
  error?: string;
  errorCode?: string;
} {
  if (!cart || cart.length === 0) {
    return {
      isValid: false,
      unavailableProducts: [],
      verifiedTotal: 0,
      error: 'EMPTY_ORDER: Cart is empty',
      errorCode: 'EMPTY_ORDER',
    };
  }

  const unavailableProducts: string[] = [];
  let verifiedTotal = 0;

  for (const item of cart) {
    // Find the live record of this product
    const liveProd = liveProducts.find((p) => p.id === item.product.id);

    if (!liveProd || !liveProd.isAvailable) {
      const name = item.product.name.ar || item.product.name.fr || item.product.name.en || 'Item';
      unavailableProducts.push(name);
      continue;
    }

    // Verify quantity bounds
    const cleanQty = validateQuantity(item.quantity);

    // Base price from selected size (sizes store full price) or product base price
    let unitBasePrice = Number(liveProd.price);
    if (item.selectedSize) {
      const matchingSize = (liveProd.sizes || []).find((s) => s.id === item.selectedSize?.id);
      if (!matchingSize) {
        return {
          isValid: false,
          unavailableProducts: [],
          verifiedTotal: 0,
          error: `INVALID_SIZE: Selected size for "${liveProd.name.en || liveProd.name.fr}" is no longer valid.`,
          errorCode: 'INVALID_SIZE',
        };
      }
      if (matchingSize.price != null) {
        unitBasePrice = Number(matchingSize.price);
      } else if (matchingSize.priceOffset != null) {
        unitBasePrice = Number(liveProd.price) + Number(matchingSize.priceOffset);
      }
    }

    // Verify extras existence, availability, and prices against live product definitions
    let extrasTotal = 0;
    if (item.selectedExtras && item.selectedExtras.length > 0) {
      for (const extra of item.selectedExtras) {
        const matchingExtra = (liveProd.extras || []).find((e) => e.id === extra.id);
        if (!matchingExtra) {
          return {
            isValid: false,
            unavailableProducts: [],
            verifiedTotal: 0,
            error: `INVALID_EXTRA: Selected extra "${extra.name_en || extra.name_fr || ''}" is no longer valid.`,
            errorCode: 'INVALID_EXTRA',
          };
        }
        if (matchingExtra.available === false) {
          const exName = matchingExtra.name_ar || matchingExtra.name_fr || matchingExtra.name_en || '';
          return {
            isValid: false,
            unavailableProducts: [],
            verifiedTotal: 0,
            error: `EXTRA_UNAVAILABLE: Selected extra "${exName}" is currently unavailable.`,
            errorCode: 'EXTRA_UNAVAILABLE',
          };
        }
        extrasTotal += Number(matchingExtra.price || 0);
      }
    }

    // Verify selected complements existence, availability, and prices
    let complementsTotal = 0;
    if (item.selectedComplements && item.selectedComplements.length > 0) {
      const liveGroups = liveProd.complements || [];
      for (const comp of item.selectedComplements) {
        let matchedItem: { price: number; available: boolean; name_ar?: string; name_fr?: string; name_en?: string } | null = null;
        for (const group of liveGroups) {
          const found = (group.items || []).find((ci) => ci.id === comp.itemId);
          if (found) {
            matchedItem = found;
            break;
          }
        }
        if (!matchedItem) {
          return {
            isValid: false,
            unavailableProducts: [],
            verifiedTotal: 0,
            error: `INVALID_COMPLEMENT: Selected option "${comp.name?.en || comp.name?.fr || ''}" is no longer valid.`,
            errorCode: 'INVALID_COMPLEMENT',
          };
        }
        if (matchedItem.available === false) {
          const cName = matchedItem.name_ar || matchedItem.name_fr || matchedItem.name_en || '';
          return {
            isValid: false,
            unavailableProducts: [],
            verifiedTotal: 0,
            error: `COMPLEMENT_UNAVAILABLE: Selected item "${cName}" is currently unavailable.`,
            errorCode: 'COMPLEMENT_UNAVAILABLE',
          };
        }
        complementsTotal += Number(matchedItem.price || 0);
      }
    }

    // Verified price per unit
    const verifiedUnit = unitBasePrice + extrasTotal + complementsTotal;
    verifiedTotal += verifiedUnit * cleanQty;
  }

  if (unavailableProducts.length > 0) {
    return {
      isValid: false,
      unavailableProducts,
      verifiedTotal: 0,
      error: `PRODUCT_UNAVAILABLE: Item "${unavailableProducts[0]}" is currently unavailable. Please update your cart.`,
      errorCode: 'PRODUCT_UNAVAILABLE',
    };
  }

  return {
    isValid: true,
    unavailableProducts: [],
    verifiedTotal,
  };
}

/**
 * Generates collision-free daily ticket numbers (e.g. 1045, 1046)
 */
export function generateOrderNumber(existingCount: number = 0): string {
  const base = 1040 + existingCount + 1;
  return base.toString();
}

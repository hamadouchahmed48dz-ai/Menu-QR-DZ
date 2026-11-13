import { Language } from '../types';

export interface OrderErrorMetadata {
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  isNetworkError?: boolean;
  raw?: unknown;
}

export class OrderRpcError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  isNetworkError?: boolean;
  raw?: unknown;

  constructor(message: string, meta: OrderErrorMetadata = {}) {
    super(message);
    this.name = 'OrderRpcError';
    this.code = meta.code;
    this.details = meta.details;
    this.hint = meta.hint;
    this.status = meta.status;
    this.isNetworkError = meta.isNetworkError;
    this.raw = meta.raw;
  }
}

export function isNetworkFailure(err: any): boolean {
  if (err?.isNetworkError) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;

  const msg = String(err?.message || '').toLowerCase();
  const details = String(err?.details || '').toLowerCase();
  const combined = `${msg} ${details}`;

  return (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('network request failed') ||
    combined.includes('load failed') ||
    combined.includes('err_internet_disconnected') ||
    combined.includes('err_network') ||
    combined.includes('fetcherror') ||
    combined.includes('timeout') ||
    combined.includes('econnrefused')
  );
}

/**
 * Logs full RPC / network error details to the developer console without exposing
 * technical details in the customer-facing UI.
 */
export function logOrderRpcError(context: string, err: any): void {
  console.error(`[${context}] Order RPC failed:`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
    status: err?.status ?? null,
    raw: err?.raw ?? err,
  });
}

function extractQuotedTarget(message: string): string | null {
  const match = message.match(/"([^"]{1,80})"/);
  return match ? match[1] : null;
}

/**
 * Maps known Supabase / Postgres create_order RPC error codes and messages
 * into clear, friendly messages in Arabic (RTL), French, and English.
 */
export function translateOrderError(err: any, lang: Language): string {
  const code = String(err?.code || '').trim().toUpperCase();
  const message = String(err?.message || '');
  const details = String(err?.details || '');
  const hint = String(err?.hint || '');
  const haystack = `${code} ${message} ${details} ${hint}`.toUpperCase();
  const quoted = extractQuotedTarget(message);

  // 1. Missing / mismatched RPC function in PostgREST schema cache (PGRST202)
  if (
    code === 'PGRST202' ||
    haystack.includes('PGRST202') ||
    haystack.includes('COULD NOT FIND THE FUNCTION')
  ) {
    return lang === 'ar'
      ? 'خدمة إرسال الطلبات غير متوفرة مؤقتاً بسبب تحديث في النظام. يرجى إبلاغ إدارة المطعم أو المحاولة لاحقاً.'
      : lang === 'fr'
      ? 'Le service de commande est temporairement indisponible suite à une mise à jour. Veuillez prévenir le restaurant ou réessayer plus tard.'
      : 'Ordering service is temporarily unavailable due to a system update. Please notify restaurant staff or try again later.';
  }

  // 2. Network / connectivity errors
  if (isNetworkFailure(err)) {
    return lang === 'ar'
      ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى (سلتك محفوظة).'
      : lang === 'fr'
      ? 'Problème de connexion réseau. Veuillez vérifier votre connexion Internet et réessayer (votre panier est conservé).'
      : 'Network connection error. Please check your internet connection and try again (your cart is saved).';
  }

  // 3. Restaurant closed
  if (haystack.includes('RESTAURANT_CLOSED')) {
    return lang === 'ar'
      ? 'المطعم مغلق حالياً، لا يمكن إرسال الطلبات في الوقت الحالي. تم الاحتفاظ بسلتك.'
      : lang === 'fr'
      ? 'Le restaurant est actuellement fermé. Les commandes ne sont pas acceptées pour le moment. Votre panier est conservé.'
      : 'The restaurant is currently closed. Orders cannot be placed right now. Your cart has been kept.';
  }

  // 4. Restaurant not found / invalid
  if (haystack.includes('RESTAURANT_NOT_FOUND') || haystack.includes('INVALID_RESTAURANT')) {
    return lang === 'ar'
      ? 'تعذر التعرف على المطعم. يرجى إعادة مسح رمز QR الخاص بالطاولة.'
      : lang === 'fr'
      ? 'Restaurant introuvable ou invalide. Veuillez rescanner le QR code de votre table.'
      : 'Restaurant not found or invalid. Please scan the table QR code again.';
  }

  // 5. Invalid or inactive table
  if (haystack.includes('TABLE_INACTIVE')) {
    return lang === 'ar'
      ? 'هذه الطاولة مغلقة أو غير مفعلة حالياً. يرجى اختيار طاولة أخرى أو استدعاء النادل.'
      : lang === 'fr'
      ? 'Cette table est actuellement désactivée. Veuillez choisir une autre table ou contacter le serveur.'
      : 'This table is currently inactive. Please select another table or ask staff for assistance.';
  }

  if (haystack.includes('INVALID_TABLE')) {
    return lang === 'ar'
      ? 'الطاولة المحددة غير صالحة أو غير مسجلة. يرجى اختيار رقم الطاولة الصحيح أو مسح رمز QR.'
      : lang === 'fr'
      ? 'La table sélectionnée est invalide ou introuvable. Veuillez sélectionner votre table ou rescanner le QR code.'
      : 'The selected table is invalid or not found. Please choose a valid table or scan the QR code.';
  }

  // 6. Too many orders (anti-spam rate limit)
  if (haystack.includes('ORDER_RATE_LIMIT') || haystack.includes('ORDER_THROTTLED')) {
    return lang === 'ar'
      ? 'تم إرسال عدة طلبات متتالية من هذه الطاولة. يرجى الانتظار دقيقتين ثم إعادة المحاولة.'
      : lang === 'fr'
      ? 'Trop de commandes envoyées depuis cette table en peu de temps. Veuillez patienter quelques instants avant de réessayer.'
      : 'Too many orders submitted from this table in a short time. Please wait a couple of minutes before trying again.';
  }

  // 7. Unavailable product / dish
  if (haystack.includes('PRODUCT_UNAVAILABLE') || haystack.includes('IS NO LONGER AVAILABLE')) {
    return lang === 'ar'
      ? quoted
        ? `الطبق "${quoted}" غير متوفر حالياً. يرجى إزالته من السلة ثم إعادة المحاولة.`
        : 'أحد الأطباق في سلتك لم يعد متوفراً حالياً. يرجى تحديث السلة والمحاولة مرة أخرى.'
      : lang === 'fr'
      ? quoted
        ? `Le plat « ${quoted} » n'est plus disponible actuellement. Veuillez le retirer du panier.`
        : 'Un ou plusieurs plats de votre panier ne sont plus disponibles. Veuillez mettre à jour votre panier.'
      : quoted
      ? `The dish "${quoted}" is currently unavailable. Please remove it from your cart and try again.`
      : 'One or more dishes in your cart are currently unavailable. Please update your cart and try again.';
  }

  if (haystack.includes('PRODUCT_NOT_FOUND') || haystack.includes('INVALID_PRODUCT_ID')) {
    return lang === 'ar'
      ? 'أحد الأطباق المختارة لم يعد موجوداً في القائمة. يرجى إزالته أو تحديث القائمة وإعادة الاختيار.'
      : lang === 'fr'
      ? 'Un plat sélectionné n\'existe plus dans le menu. Veuillez mettre à jour votre panier.'
      : 'A selected dish is no longer on the menu. Please remove it or refresh the menu and try again.';
  }

  // 8. Invalid or unavailable options (sizes, extras, complements)
  if (haystack.includes('EXTRA_UNAVAILABLE')) {
    return lang === 'ar'
      ? quoted
        ? `الإضافة "${quoted}" غير متوفرة حالياً. يرجى تعديل الطبق في السلة.`
        : 'إحدى الإضافات المختارة غير متوفرة حالياً. يرجى تعديل طلبك.'
      : lang === 'fr'
      ? quoted
        ? `Le supplément « ${quoted} » est actuellement indisponible. Veuillez modifier votre article.`
        : 'Un supplément sélectionné est actuellement indisponible. Veuillez modifier votre panier.'
      : quoted
      ? `The extra "${quoted}" is currently unavailable. Please update the item in your cart.`
      : 'A selected extra is currently unavailable. Please update your cart.';
  }

  if (haystack.includes('COMPLEMENT_UNAVAILABLE')) {
    return lang === 'ar'
      ? quoted
        ? `المكوّن "${quoted}" غير متوفر حالياً. يرجى اختيار بديل آخر.`
        : 'أحد المكوّنات المختارة غير متوفر حالياً. يرجى تعديل طلبك.'
      : lang === 'fr'
      ? quoted
        ? `L'accompagnement « ${quoted} » est actuellement indisponible. Veuillez modifier votre choix.`
        : 'Un accompagnement sélectionné est actuellement indisponible. Veuillez modifier votre panier.'
      : quoted
      ? `The option "${quoted}" is currently unavailable. Please choose another option.`
      : 'A selected complement option is currently unavailable. Please update your cart.';
  }

  if (haystack.includes('COMPLEMENT_REQUIRED')) {
    return lang === 'ar'
      ? quoted
        ? `يرجى تحديد اختيار إجباري لمجموعة "${quoted}" قبل إرسال الطلب.`
        : 'يرجى تحديد جميع الاختيارات الإجبارية للطبق قبل إرسال الطلب.'
      : lang === 'fr'
      ? quoted
        ? `Veuillez sélectionner une option obligatoire pour « ${quoted} ».`
        : 'Veuillez compléter les choix obligatoires pour vos plats.'
      : quoted
      ? `Please select a required option for "${quoted}".`
      : 'Please complete all required options before submitting your order.';
  }

  if (
    haystack.includes('COMPLEMENT_SINGLE_VIOLATION') ||
    haystack.includes('COMPLEMENT_MAX_EXCEEDED') ||
    haystack.includes('COMPLEMENT_MIN_NOT_MET')
  ) {
    return lang === 'ar'
      ? quoted
        ? `عدد الاختيارات المحددة لـ "${quoted}" غير صالح. يرجى تعديل الطبق وإعادة إضافته.`
        : 'عدد الاختيارات المحددة في أحد الأطباق غير مطابق للشروط. يرجى تعديله وإعادة المحاولة.'
      : lang === 'fr'
      ? quoted
        ? `Le nombre d'options choisies pour « ${quoted} » est invalide. Veuillez modifier le plat.`
        : 'La sélection des options pour un plat est invalide. Veuillez modifier votre panier.'
      : quoted
      ? `The number of selected options for "${quoted}" is invalid. Please update the item.`
      : 'Selected option count for an item is invalid. Please update your cart and try again.';
  }

  if (
    haystack.includes('INVALID_SIZE') ||
    haystack.includes('INVALID_EXTRA') ||
    haystack.includes('INVALID_COMPLEMENT')
  ) {
    return lang === 'ar'
      ? 'بعض خيارات الطبق (الحجم أو الإضافات) تم تحديثها في القائمة. يرجى إزالة الطبق وإعادة إضافته.'
      : lang === 'fr'
      ? 'Certaines options du plat (taille ou suppléments) ont été modifiées. Veuillez le retirer puis le rajouter au panier.'
      : 'Some dish options (size or add-ons) have changed on the menu. Please remove and re-add the item.';
  }

  // 9. Quantity & empty cart
  if (haystack.includes('INVALID_QUANTITY')) {
    return lang === 'ar'
      ? 'الكمية المحددة غير صالحة (يجب أن تكون بين 1 و 50).'
      : lang === 'fr'
      ? 'La quantité sélectionnée est invalide (doit être comprise entre 1 et 50).'
      : 'Invalid item quantity (must be between 1 and 50).';
  }

  if (haystack.includes('EMPTY_CART') || haystack.includes('EMPTY_ORDER')) {
    return lang === 'ar'
      ? 'السلة فارغة. أضف طبقاً واحداً على الأقل قبل إرسال الطلب.'
      : lang === 'fr'
      ? 'Votre panier est vide. Ajoutez au moins un plat avant de commander.'
      : 'Your cart is empty. Please add at least one item before ordering.';
  }

  // 10. Generic fallback (safe, friendly, never exposes raw SQL)
  return lang === 'ar'
    ? 'تعذر إرسال الطلب إلى المطبخ. تم الاحتفاظ بسلتك، يرجى التحقق من الطاولة والأطباق ثم إعادة المحاولة.'
    : lang === 'fr'
    ? 'Impossible d\'envoyer la commande. Votre panier est conservé, veuillez vérifier votre table et réessayer.'
    : 'Could not send your order. Your cart is saved — please verify your table and items, then try again.';
}

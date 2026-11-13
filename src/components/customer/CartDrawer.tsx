import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { calculateOrderPricing } from '../../utils/promotions';
import { getOptionName } from '../../types';
import { logOrderRpcError, translateOrderError } from '../../utils/orderErrorUtils';
import { X, Plus, Minus, Trash2, ShoppingBag, Send, AlertCircle, MessageSquare, Loader2, Tag, QrCode } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartTotal,
    cartCount,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    activeTable,
    hasValidTable,
    isTableInvalid,
    placeOrder,
    isSubmittingOrder,
    offers,
    lang,
    isRestaurantOpen,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const pricing = calculateOrderPricing(cart, offers);

  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handleSendOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    if (!hasValidTable) {
      setSubmissionError(isTableInvalid ? t.tableInvalidScanAgain : t.scanQrToOrder);
      return;
    }
    if (!isRestaurantOpen) {
      setSubmissionError(
        lang === 'ar'
          ? 'المطعم مغلق حالياً، لا يمكن إرسال الطلبات في الوقت الحالي.'
          : lang === 'fr'
          ? 'Le restaurant est actuellement fermé. Les commandes ne sont pas acceptées pour le moment.'
          : 'The restaurant is currently closed. Orders cannot be placed at this time.'
      );
      return;
    }
    setSubmissionError(null);

    try {
      await placeOrder(orderNotes.trim());
      setOrderNotes('');
    } catch (e: any) {
      logOrderRpcError('CartDrawer.handleSendOrder', e);
      setSubmissionError(translateOrderError(e, lang));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={() => !isSubmittingOrder && setIsCartOpen(false)} />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-md h-full bg-white dark:bg-stone-900 shadow-2xl flex flex-col z-10 border-s border-stone-200 dark:border-stone-800 animate-in slide-in-from-end duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-850/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {t.yourCart}
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-mono">
                {cartCount} {t.itemsCount}
                {hasValidTable ? ` · ${t.table} ${activeTable}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && !isSubmittingOrder && (
              <button
                onClick={clearCart}
                className="text-xs text-stone-500 dark:text-stone-300 hover:text-red-500 px-2 py-1 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              disabled={isSubmittingOrder}
              onClick={() => setIsCartOpen(false)}
              className="w-9 h-9 rounded-xl text-stone-500 dark:text-stone-300 hover:text-stone-700 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content / Items list */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-300 dark:text-stone-600 mb-4">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
              {t.emptyCartTitle}
            </h3>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-300 max-w-xs leading-relaxed">
              {t.emptyCartDesc}
            </p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold shadow-md hover:bg-orange-600 active:scale-95 transition-all"
            >
              {t.exploreMenu}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {/* Submission Error Banner */}
            {submissionError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">
                    {lang === 'ar' ? 'تعذر إرسال الطلب' : lang === 'fr' ? 'Échec de validation de la commande' : 'Order Validation Failed'}
                  </span>
                  <p className="mt-0.5 leading-relaxed">{submissionError}</p>
                </div>
              </div>
            )}

            {/* Read-only QR scan reminder if no valid table is active */}
            {!hasValidTable && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <QrCode className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    {isTableInvalid ? t.tableInvalidTitle : t.scanQrToOrder}
                  </span>
                  {isTableInvalid && (
                    <span className="text-[11px] opacity-90 mt-0.5 block">{t.tableInvalidScanAgain}</span>
                  )}
                </div>
              </div>
            )}

            {/* List of Cart Items */}
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name[lang] || item.product.name.en}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {item.product.name[lang] || item.product.name.en}
                      </h4>
                      {/* Selected Size */}
                      {item.selectedSize && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-300">
                          {getOptionName(item.selectedSize, lang)}
                        </p>
                      )}
                      {/* Selected Extras */}
                      {item.selectedExtras && item.selectedExtras.length > 0 && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-300">
                          +{item.selectedExtras.map((e) => getOptionName(e, lang)).join(', ')}
                        </p>
                      )}
                      {/* Selected Complements */}
                      {item.selectedComplements && item.selectedComplements.length > 0 && (
                        <div className="space-y-0.5 mt-0.5">
                          {item.selectedComplements.map((sc, idx) => (
                            <p key={sc.itemId || idx} className="text-[11px] text-stone-600 dark:text-stone-300">
                              <span className="font-medium text-stone-700 dark:text-stone-200">
                                {sc.groupTitle[lang] || sc.groupTitle.en}:
                              </span>{' '}
                              {sc.name[lang] || sc.name.en}
                            </p>
                          ))}
                        </div>
                      )}
                      {/* Custom note */}
                      {item.notes && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic line-clamp-1">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={isSubmittingOrder}
                    onClick={() => removeCartItem(item.id)}
                    className="text-stone-400 hover:text-red-500 p-1 rounded-md transition-colors disabled:opacity-40"
                    title={t.deleteProduct}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Row: Stepper & Total */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-750">
                  <div className="flex items-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-0.5 shadow-xs">
                    <button
                      disabled={isSubmittingOrder}
                      onClick={() => updateCartItemQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded text-stone-600 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono tabular-nums text-xs font-bold text-stone-900 dark:text-stone-100">
                      {item.quantity}
                    </span>
                    <button
                      disabled={isSubmittingOrder || item.quantity >= 20}
                      onClick={() => updateCartItemQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded text-stone-600 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                      aria-label="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(() => {
                    const itemDiscount = pricing.itemDiscounts.get(item.id);
                    const hasItemDiscount = itemDiscount && itemDiscount.itemDiscountTotal > 0;
                    return (
                      <div className="flex items-center gap-1.5">
                        {hasItemDiscount && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] text-[10px] font-bold">
                            <Tag className="w-2.5 h-2.5" />
                            <span>{itemDiscount.badge}</span>
                          </span>
                        )}
                        {hasItemDiscount && (
                          <span className="line-through font-mono tabular-nums text-xs text-stone-400">
                            {item.totalPrice}
                          </span>
                        )}
                        <span className="font-mono tabular-nums text-sm font-extrabold text-stone-900 dark:text-stone-100">
                          {hasItemDiscount ? itemDiscount.discountedUnitPrice * item.quantity : item.totalPrice}{' '}
                          <span className="text-[10px] font-bold text-stone-500 dark:text-stone-300">{t.currency}</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            {/* General Order Notes (Max 300 characters) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.orderNotes}</span>
                </label>
                <span className="text-[10px] font-mono text-stone-500 dark:text-stone-300">
                  {orderNotes.length}/300
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={300}
                value={orderNotes}
                disabled={isSubmittingOrder}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t.orderNotesPlaceholder}
                className="w-full p-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Footer / Send Order summary */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
              <div className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="font-mono tabular-nums text-stone-800 dark:text-stone-200">
                  {pricing.subtotal} {t.currency}
                </span>
              </div>

              {/* Applied Promotions Breakdown */}
              {pricing.appliedOffers.map((offer) => (
                <div key={offer.id} className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{offer.title}</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    -{offer.discountAmount} {t.currency}
                  </span>
                </div>
              ))}

              {pricing.discountTotal > 0 && (
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-dashed border-emerald-200 dark:border-emerald-800/60">
                  <span>{lang === 'ar' ? 'إجمالي التوفير' : lang === 'fr' ? 'Économies totales' : 'Total Savings'}</span>
                  <span className="font-mono tabular-nums">-{pricing.discountTotal} {t.currency}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>
                  {t.tableService}
                  {hasValidTable ? ` (${t.table} ${activeTable})` : ''}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t.free}</span>
              </div>

              <div className="flex justify-between text-base font-black text-stone-900 dark:text-stone-50 pt-1.5 border-t border-stone-200 dark:border-stone-700">
                <span>{t.total}</span>
                <span className="font-mono tabular-nums text-[#FF5A1F]">
                  {pricing.finalTotal} {t.currency}
                </span>
              </div>
            </div>

            {!isRestaurantOpen && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>
                  {lang === 'ar'
                    ? 'المطعم مغلق حالياً - تم الاحتفاظ بأطباقك في السلة، وسيتاح إرسال الطلب فور إعادة الفتح.'
                    : lang === 'fr'
                    ? 'Le restaurant est actuellement fermé - vos articles sont conservés et pourront être envoyés dès la réouverture.'
                    : 'The restaurant is closed - your items are kept in the cart and can be submitted once reopened.'}
                </span>
              </div>
            )}

            <button
              onClick={handleSendOrder}
              disabled={isSubmittingOrder || !hasValidTable || !isRestaurantOpen}
              className={`w-full h-13 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                isRestaurantOpen && hasValidTable
                  ? 'bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-50 text-white shadow-lg shadow-orange-500/25 active:scale-98 cursor-pointer'
                  : 'bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed border border-stone-300 dark:border-stone-700'
              }`}
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {lang === 'ar'
                      ? 'جاري التحقق وإرسال الطلب...'
                      : lang === 'fr'
                      ? 'Vérification et envoi en cours...'
                      : 'Verifying & Sending Order...'}
                  </span>
                </>
              ) : !isRestaurantOpen ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {lang === 'ar' ? 'المطعم مغلق حالياً' : lang === 'fr' ? 'Restaurant fermé' : 'Restaurant Closed'}
                  </span>
                </>
              ) : !hasValidTable ? (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>{t.scanQrToOrder}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.sendOrder}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

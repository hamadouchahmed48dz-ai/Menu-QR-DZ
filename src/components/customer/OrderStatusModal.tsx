import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { OrderStatus } from '../../types';
import { CheckCircle2, Clock, ChefHat, Bell, Receipt, Sparkles, X, ChevronRight, Utensils } from 'lucide-react';

export const OrderStatusModal: React.FC = () => {
  const {
    activeOrder,
    isOrderStatusOpen,
    setIsOrderStatusOpen,
    hasValidTable,
    isRestaurantOpen,
    callWaiter,
    lang,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  if (!isOrderStatusOpen || !activeOrder) return null;

  const steps: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: 'new',
      label: t.statusReceived,
      desc: t.statusReceivedDesc,
      icon: <Clock className="w-4 h-4" />,
    },
    {
      key: 'preparing',
      label: t.statusPreparing,
      desc: t.statusPreparingDesc,
      icon: <ChefHat className="w-4 h-4" />,
    },
    {
      key: 'ready',
      label: t.statusReady,
      desc: t.statusReadyDesc,
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      key: 'served',
      label: t.statusServed,
      desc: t.statusServedDesc,
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  ];

  const statusOrder: OrderStatus[] = ['new', 'preparing', 'ready', 'served'];
  const currentStepIndex = statusOrder.indexOf(activeOrder.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with status badge */}
        <div className="relative p-6 bg-gradient-to-br from-stone-900 to-stone-950 text-white border-b border-stone-800">
          <button
            onClick={() => setIsOrderStatusOpen(false)}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            aria-label={t.cancel}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/30 border border-orange-500/40 text-orange-400 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span>{t.table} {activeOrder.tableNumber}</span>
          </div>

          <h2 className="text-2xl font-black text-white">
            {t.orderNumber} #{activeOrder.orderNumber}
          </h2>
          <p className="text-xs text-stone-300 mt-1">{t.estWaitTime}</p>
        </div>

        {/* Status Tracker */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isPassed = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {/* Vertical line connecting nodes */}
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-8 start-4 -translate-x-1/2 w-0.5 h-10 ${
                        index < currentStepIndex ? 'bg-[#FF5A1F]' : 'bg-stone-200 dark:bg-stone-800'
                      }`}
                    />
                  )}

                  {/* Step Icon Node */}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs shrink-0 ${
                      isCurrent
                        ? 'bg-[#FF5A1F] text-white ring-4 ring-orange-500/20'
                        : isPassed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {isPassed && !isCurrent ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Step Description */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-[#FF5A1F]'
                            : isPassed
                            ? 'text-stone-900 dark:text-stone-100'
                            : 'text-stone-500 dark:text-stone-300'
                        }`}
                      >
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Service Buttons (Call Waiter / Request Bill) */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!hasValidTable || !isRestaurantOpen}
              onClick={() => callWaiter('waiter')}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-orange-500/50 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Bell className="w-4 h-4 text-orange-500" />
              <span>{t.callWaiter}</span>
            </button>

            <button
              type="button"
              disabled={!hasValidTable || !isRestaurantOpen}
              onClick={() => callWaiter('bill')}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500/50 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>{t.requestBill}</span>
            </button>
          </div>

          {/* Order Items Breakdown */}
          <div className="bg-stone-50 dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Ordered Items
            </h5>
            <div className="space-y-1.5 divide-y divide-stone-200/50 dark:divide-stone-750">
              {activeOrder.items.map((item) => (
                <div key={item.id} className="pt-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-600 dark:text-stone-200">
                      {item.quantity}×
                    </span>
                    <span className="font-medium text-stone-800 dark:text-stone-100">
                      {item.product.name[lang] || item.product.name.en}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-stone-700 dark:text-stone-200 font-semibold">
                    {item.totalPrice} {t.currency}
                  </span>
                </div>
              ))}
            </div>

            {/* Subtotal, Discount & Total */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-1.5 text-xs">
              {activeOrder.discountTotal != null && activeOrder.discountTotal > 0 && (
                <>
                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                    <span>{t.subtotal}</span>
                    <span className="font-mono tabular-nums">
                      {activeOrder.subtotal ?? activeOrder.total + activeOrder.discountTotal} {t.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{lang === 'ar' ? 'الخصم الترويجي المطبق' : lang === 'fr' ? 'Réduction appliquée' : 'Applied Promotion Discount'}</span>
                    <span className="font-mono tabular-nums">-{activeOrder.discountTotal} {t.currency}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-750 font-bold text-sm">
                <span className="text-stone-900 dark:text-stone-100">{t.total}</span>
                <span className="font-mono tabular-nums text-[#FF5A1F]">
                  {activeOrder.total} {t.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-750 flex items-center justify-between gap-3">
          <button
            onClick={() => setIsOrderStatusOpen(false)}
            className="w-full py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold text-xs sm:text-sm hover:opacity-90 active:scale-98 transition-all"
          >
            {t.orderMore}
          </button>
        </div>
      </div>
    </div>
  );
};

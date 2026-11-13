import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getReopenFormatted, DEFAULT_CLOSED_MESSAGES } from '../../utils/restaurantStatus';
import { ConfirmModal } from '../common/ConfirmModal';
import { Store, Clock, Power, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

export const RestaurantStatusQuickToggle: React.FC = () => {
  const { restaurant, isRestaurantOpen, setRestaurantStatus, lang } = useApp();
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const isRtl = lang === 'ar';
  const reopenInfo = getReopenFormatted(restaurant.reopenAt, lang);

  const handleToggleClick = () => {
    if (isToggling) return;

    if (isRestaurantOpen) {
      // Prompt confirmation before closing
      setIsConfirmCloseOpen(true);
    } else {
      // Reopen immediately
      handleConfirmReopen();
    }
  };

  const handleConfirmReopen = async () => {
    setIsToggling(true);
    try {
      await setRestaurantStatus(true, {}, null);
    } finally {
      setIsToggling(false);
    }
  };

  const handleConfirmClose = async () => {
    setIsConfirmCloseOpen(false);
    setIsToggling(true);
    try {
      await setRestaurantStatus(
        false,
        {
          ar: restaurant.closedMessageAr || DEFAULT_CLOSED_MESSAGES.ar,
          fr: restaurant.closedMessageFr || DEFAULT_CLOSED_MESSAGES.fr,
          en: restaurant.closedMessageEn || DEFAULT_CLOSED_MESSAGES.en,
        },
        restaurant.reopenAt || null
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-1.5 sm:gap-2 select-none"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Closed Info Chip (Shown only when closed) */}
        {!isRestaurantOpen && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] sm:text-xs font-bold font-mono tracking-tight animate-in fade-in"
            title={reopenInfo?.detailedText || (lang === 'ar' ? 'المطعم مغلق حالياً' : 'Restaurant closed')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span className="font-extrabold">{lang === 'ar' ? 'مغلق' : lang === 'fr' ? 'Fermé' : 'Closed'}</span>
            {reopenInfo && !reopenInfo.isPassed && (
              <>
                <span className="opacity-60">·</span>
                <span className="truncate max-w-[110px] sm:max-w-none">{reopenInfo.badgeLabel}</span>
              </>
            )}
          </div>
        )}

        {/* Compact Toggle Switch Container */}
        <button
          type="button"
          onClick={handleToggleClick}
          disabled={isToggling}
          aria-label={
            isRestaurantOpen
              ? lang === 'ar' ? 'إغلاق المطعم' : 'Close restaurant'
              : lang === 'ar' ? 'فتح المطعم' : 'Open restaurant'
          }
          className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
            isRestaurantOpen
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
              : 'bg-stone-100 dark:bg-stone-850 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
          } ${isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
          title={
            isRestaurantOpen
              ? lang === 'ar'
                ? 'المطعم مفتوح حالياً ويستقبل الطلبات. انقر للإغلاق.'
                : lang === 'fr'
                ? 'Restaurant ouvert. Cliquer pour fermer.'
                : 'Restaurant open. Click to close.'
              : lang === 'ar'
              ? 'المطعم مغلق حالياً. انقر للفتح الفوري واستقبال الطلبات.'
              : lang === 'fr'
              ? 'Restaurant fermé. Cliquer pour rouvrir.'
              : 'Restaurant closed. Click to reopen.'
          }
        >
          {/* Status Dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
              isRestaurantOpen
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : 'bg-red-500'
            }`}
          />

          {/* Text Label */}
          <span className="text-xs font-extrabold hidden md:inline">
            {isRestaurantOpen
              ? lang === 'ar'
                ? 'مفتوح'
                : lang === 'fr'
                ? 'Ouvert'
                : 'Open'
              : lang === 'ar'
              ? 'مغلق'
              : lang === 'fr'
              ? 'Fermé'
              : 'Closed'}
          </span>

          {/* Compact visual switch thumb */}
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative flex items-center ${
              isRestaurantOpen ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ${
                isRestaurantOpen
                  ? isRtl
                    ? '-translate-x-3.5'
                    : 'translate-x-3.5'
                  : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Confirmation modal before closing */}
      <ConfirmModal
        isOpen={isConfirmCloseOpen}
        variant="warning"
        lang={lang}
        title={
          lang === 'ar'
            ? 'تأكيد إغلاق المطعم'
            : lang === 'fr'
            ? 'Confirmer la fermeture du restaurant'
            : 'Confirm Restaurant Closure'
        }
        message={
          lang === 'ar'
            ? 'هل أنت متأكد من إغلاق المطعم؟\n\nعند الإغلاق، لن يتمكن الزبائن من إرسال طلبات جديدة أو استدعاء النادل، ولكن ستبقى قائمة الطعام متاحة للتصفح. يمكنك إعادة الفتح في أي وقت.'
            : lang === 'fr'
            ? 'Êtes-vous sûr de vouloir fermer le restaurant ?\n\nLes clients ne pourront plus passer de commande ni appeler un serveur, mais le menu restera consultable. Vous pourrez rouvrir à tout moment.'
            : 'Are you sure you want to close the restaurant?\n\nCustomers will not be able to place new orders or call waiters, though the menu will remain browsable. You can reopen anytime.'
        }
        confirmLabel={
          lang === 'ar'
            ? 'نعم، إغلاق المطعم'
            : lang === 'fr'
            ? 'Oui, fermer'
            : 'Yes, Close Restaurant'
        }
        cancelLabel={lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel'}
        onConfirm={handleConfirmClose}
        onCancel={() => setIsConfirmCloseOpen(false)}
      />
    </>
  );
};

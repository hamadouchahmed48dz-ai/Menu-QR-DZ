import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DEFAULT_CLOSED_MESSAGES,
  formatToAlgiersDatetimeLocal,
  parseAlgiersDatetimeLocalToIso,
  getQuickReopenIso,
  getReopenFormatted,
} from '../../utils/restaurantStatus';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Store,
  Clock,
  Power,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const RestaurantStatusCard: React.FC = () => {
  const { restaurant, isRestaurantOpen, setRestaurantStatus, lang } = useApp();

  const isRtl = lang === 'ar';

  // Form states for closure settings
  const [messageAr, setMessageAr] = useState<string>(
    restaurant.closedMessageAr ?? DEFAULT_CLOSED_MESSAGES.ar
  );
  const [messageFr, setMessageFr] = useState<string>(
    restaurant.closedMessageFr ?? DEFAULT_CLOSED_MESSAGES.fr
  );
  const [messageEn, setMessageEn] = useState<string>(
    restaurant.closedMessageEn ?? DEFAULT_CLOSED_MESSAGES.en
  );
  const [reopenAtInput, setReopenAtInput] = useState<string>(() =>
    formatToAlgiersDatetimeLocal(restaurant.reopenAt)
  );

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with restaurant prop if it changes via Realtime or external update
  useEffect(() => {
    if (restaurant.closedMessageAr !== undefined) {
      setMessageAr(restaurant.closedMessageAr ?? DEFAULT_CLOSED_MESSAGES.ar);
    }
    if (restaurant.closedMessageFr !== undefined) {
      setMessageFr(restaurant.closedMessageFr ?? DEFAULT_CLOSED_MESSAGES.fr);
    }
    if (restaurant.closedMessageEn !== undefined) {
      setMessageEn(restaurant.closedMessageEn ?? DEFAULT_CLOSED_MESSAGES.en);
    }
    setReopenAtInput(formatToAlgiersDatetimeLocal(restaurant.reopenAt));
  }, [
    restaurant.closedMessageAr,
    restaurant.closedMessageFr,
    restaurant.closedMessageEn,
    restaurant.reopenAt,
  ]);

  const reopenInfo = getReopenFormatted(restaurant.reopenAt, lang);

  // Handle Switch Click
  const handleSwitchClick = () => {
    if (isSaving) return;

    if (isRestaurantOpen) {
      // Opening confirm modal before turning OFF
      setIsConfirmCloseOpen(true);
    } else {
      // Reopening immediately
      handleDirectReopen();
    }
  };

  const handleDirectReopen = async () => {
    setIsSaving(true);
    try {
      await setRestaurantStatus(true, {}, null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmClose = async () => {
    setIsConfirmCloseOpen(false);
    setIsSaving(true);
    try {
      const reopenIso = parseAlgiersDatetimeLocalToIso(reopenAtInput);
      await setRestaurantStatus(
        false,
        {
          ar: messageAr.slice(0, 200),
          fr: messageFr.slice(0, 200),
          en: messageEn.slice(0, 200),
        },
        reopenIso
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClosureSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isRestaurantOpen) return;

    setIsSaving(true);
    try {
      const reopenIso = parseAlgiersDatetimeLocalToIso(reopenAtInput);
      await setRestaurantStatus(
        false,
        {
          ar: messageAr.slice(0, 200),
          fr: messageFr.slice(0, 200),
          en: messageEn.slice(0, 200),
        },
        reopenIso
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickButton = (type: '1h' | '2h' | 'tomorrow_morning') => {
    const iso = getQuickReopenIso(type);
    setReopenAtInput(formatToAlgiersDatetimeLocal(iso));
  };

  const handleClearReopen = () => {
    setReopenAtInput('');
  };

  const handleResetDefaultMessages = () => {
    setMessageAr(DEFAULT_CLOSED_MESSAGES.ar);
    setMessageFr(DEFAULT_CLOSED_MESSAGES.fr);
    setMessageEn(DEFAULT_CLOSED_MESSAGES.en);
  };

  return (
    <div
      className={`p-5 sm:p-7 rounded-3xl border shadow-sm transition-all duration-300 ${
        isRestaurantOpen
          ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
          : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Header: Title, Status Badge & Large Open/Closed Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isRestaurantOpen
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            <Power className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-stone-50 tracking-tight">
                {lang === 'ar'
                  ? 'حالة المطعم (مفتوح / مغلق)'
                  : lang === 'fr'
                  ? 'Statut du restaurant (Ouvert / Fermé)'
                  : 'Restaurant Status (Open / Closed)'}
              </h3>

              {/* Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                  isRestaurantOpen
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRestaurantOpen
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                {isRestaurantOpen
                  ? lang === 'ar'
                    ? 'مفتوح ويستقبل الطلبات'
                    : lang === 'fr'
                    ? 'Ouvert · Commandes actives'
                    : 'Open · Accepting Orders'
                  : lang === 'ar'
                  ? 'مغلق مؤقتاً'
                  : lang === 'fr'
                  ? 'Fermé temporairement'
                  : 'Temporarily Closed'}
              </span>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {isRestaurantOpen
                ? lang === 'ar'
                  ? 'المطعم متاح للزبائن: يمكنهم تصفح القائمة، إضافة الأطباق للسلة، إرسال الطلبات وطلب النادل.'
                  : lang === 'fr'
                  ? 'Le restaurant est actif : les clients peuvent commander et appeler le serveur.'
                  : 'Restaurant is active: customers can add dishes, submit orders and call waiters.'
                : lang === 'ar'
                ? 'المطعم مغلق: القائمة متاحة للتصفح، ولكن إضافة الطلبات واستدعاء النادل معطلين للمستخدمين.'
                : lang === 'fr'
                ? 'Restaurant fermé : le menu reste consultable, mais les commandes et appels serveur sont bloqués.'
                : 'Restaurant is closed: menu is browsable, but orders and waiter calls are disabled.'}
            </p>
          </div>
        </div>

        {/* Large Open/Closed Switch */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleSwitchClick}
            disabled={isSaving}
            className={`group relative flex items-center justify-between w-40 sm:w-44 h-12 p-1.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 ${
              isRestaurantOpen
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
            } ${isSaving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
            aria-label="Toggle restaurant status"
          >
            {/* Labels inside the button */}
            <span
              className={`flex-1 text-center font-black transition-opacity ${
                isRestaurantOpen ? 'opacity-100 font-extrabold' : 'opacity-40'
              }`}
            >
              {lang === 'ar' ? 'مفتوح' : lang === 'fr' ? 'OUVERT' : 'OPEN'}
            </span>

            <span
              className={`flex-1 text-center font-black transition-opacity ${
                !isRestaurantOpen ? 'opacity-100 font-extrabold' : 'opacity-40'
              }`}
            >
              {lang === 'ar' ? 'مغلق' : lang === 'fr' ? 'FERMÉ' : 'CLOSED'}
            </span>

            {/* Moving Switch Thumb */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-18 sm:w-20 bg-white rounded-xl shadow-md flex items-center justify-center font-black text-xs transition-transform duration-200 ${
                isRestaurantOpen
                  ? isRtl
                    ? 'translate-x-0 text-emerald-700'
                    : 'translate-x-0 text-emerald-700'
                  : isRtl
                  ? '-translate-x-[76px] sm:-translate-x-[84px] text-red-700'
                  : 'translate-x-[76px] sm:translate-x-[84px] text-red-700'
              }`}
            >
              <Power className="w-3.5 h-3.5 me-1" />
              <span>
                {isRestaurantOpen
                  ? lang === 'ar' ? 'مفتوح' : 'ON'
                  : lang === 'ar' ? 'مغلق' : 'OFF'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Reopening Countdown Banner when Closed */}
      {!isRestaurantOpen && reopenInfo && !reopenInfo.isPassed && (
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold">{reopenInfo.detailedText}</span>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 font-mono font-black text-[11px]">
            {reopenInfo.badgeLabel}
          </span>
        </div>
      )}

      {/* Closure Customization Section (Editable for when closing or already closed) */}
      <div className="mt-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF5A1F]" />
              <span>
                {lang === 'ar'
                  ? 'إعادة الفتح التلقائي والرسائل المخصصة للزبائن'
                  : lang === 'fr'
                  ? 'Réouverture automatique & messages aux clients'
                  : 'Automatic Reopening & Customer Notice Messages'}
              </span>
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {lang === 'ar'
                ? 'تظهر هذه الرسائل في أعلى قائمة الزبائن عند الإغلاق بتوقيت الجزائر (UTC+1).'
                : 'These notices and opening time appear in the top banner of the customer menu.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultMessages}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            title="Reset default sentences"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{lang === 'ar' ? 'الرسائل الافتراضية' : 'Reset Defaults'}</span>
          </button>
        </div>

        {/* 1. Reopen Automatically At Section */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>
                {lang === 'ar'
                  ? 'إعادة الفتح تلقائياً في (توقيت الجزائر UTC+1):'
                  : lang === 'fr'
                  ? 'Réouverture automatique le (Heure d\'Algérie UTC+1) :'
                  : 'Reopen automatically at (Algiers Time UTC+1):'}
              </span>
            </label>

            {/* Quick Helper Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickButton('1h')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-[#FF5A1F] hover:text-[#FF5A1F] transition-colors"
              >
                {lang === 'ar' ? '+1 ساعة' : '+1 hour'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickButton('2h')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-[#FF5A1F] hover:text-[#FF5A1F] transition-colors"
              >
                {lang === 'ar' ? '+2 ساعة' : '+2 hours'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickButton('tomorrow_morning')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-[#FF5A1F] hover:text-[#FF5A1F] transition-colors"
              >
                {lang === 'ar' ? 'غداً 09:00 ص' : 'Tomorrow 09:00'}
              </button>
              {reopenAtInput && (
                <button
                  type="button"
                  onClick={handleClearReopen}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء الموعد' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              value={reopenAtInput}
              onChange={(e) => setReopenAtInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-stone-500 dark:text-stone-400">
            {lang === 'ar'
              ? 'اختياري: إذا حُدد موعد، سيُفتح المطعم تلقائياً للزبائن فور حلول الوقت المحدد دون الحاجة لتدخل يدوي.'
              : 'Optional: If set, the restaurant will automatically reopen at this exact time.'}
          </p>
        </div>

        {/* 2. Three Notice Messages (AR / FR / EN - Max 200 chars each) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Arabic Message */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1">
                <span>🇩🇿</span>
                <span>رسالة الإغلاق (عربي)</span>
              </span>
              <span
                className={`font-mono text-[10px] ${
                  messageAr.length > 200
                    ? 'text-red-600 dark:text-red-400 font-black'
                    : 'text-stone-400'
                }`}
              >
                {messageAr.length}/200
              </span>
            </div>
            <textarea
              dir="rtl"
              maxLength={200}
              rows={2}
              value={messageAr}
              onChange={(e) => setMessageAr(e.target.value.slice(0, 200))}
              placeholder="نحن مغلقون حالياً، سنعاود استقبال طلباتكم قريباً..."
              className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium text-xs focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none"
            />
          </div>

          {/* French Message */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1">
                <span>🇫🇷</span>
                <span>Message de fermeture (Français)</span>
              </span>
              <span
                className={`font-mono text-[10px] ${
                  messageFr.length > 200
                    ? 'text-red-600 dark:text-red-400 font-black'
                    : 'text-stone-400'
                }`}
              >
                {messageFr.length}/200
              </span>
            </div>
            <textarea
              dir="ltr"
              maxLength={200}
              rows={2}
              value={messageFr}
              onChange={(e) => setMessageFr(e.target.value.slice(0, 200))}
              placeholder="Nous sommes actuellement fermés. À très bientôt !"
              className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium text-xs focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none"
            />
          </div>

          {/* English Message */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1">
                <span>🇬🇧</span>
                <span>Closure Notice (English)</span>
              </span>
              <span
                className={`font-mono text-[10px] ${
                  messageEn.length > 200
                    ? 'text-red-600 dark:text-red-400 font-black'
                    : 'text-stone-400'
                }`}
              >
                {messageEn.length}/200
              </span>
            </div>
            <textarea
              dir="ltr"
              maxLength={200}
              rows={2}
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value.slice(0, 200))}
              placeholder="We are currently closed. We look forward to serving you soon!"
              className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium text-xs focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Update Closure Settings button (Available when currently closed) */}
        {!isRestaurantOpen && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveClosureSettings}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                {isSaving
                  ? lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'
                  : lang === 'ar'
                  ? 'حفظ وتحديث رسائل الإغلاق وموعد الفتح'
                  : lang === 'fr'
                  ? 'Enregistrer les messages et l\'heure'
                  : 'Save Closure Settings & Reopen Time'}
              </span>
            </button>
          </div>
        )}
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
            ? `هل أنت متأكد من إغلاق المطعم الآن؟\n\n- لن يتمكن الزبائن من إرسال طلبات جديدة أو استدعاء النادل.\n- القائمة ستظل قابلة للتصفح مع ظهور رسائل الإغلاق وموعد الفتح المجدول.\n- يمكنك إعادة الفتح يدوياً في أي لحظة.`
            : lang === 'fr'
            ? `Êtes-vous sûr de vouloir fermer le restaurant maintenant ?\n\n- Les clients ne pourront plus commander ni appeler un serveur.\n- Le menu restera consultable avec le message de fermeture.\n- Vous pourrez rouvrir manuellement à tout moment.`
            : `Are you sure you want to close the restaurant now?\n\n- Customers will be blocked from submitting orders or calling waiters.\n- The menu will remain viewable with closure notices.\n- You can manually reopen anytime.`
        }
        confirmLabel={
          lang === 'ar'
            ? 'تأكيد الإغلاق'
            : lang === 'fr'
            ? 'Confirmer la fermeture'
            : 'Confirm Closure'
        }
        cancelLabel={lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel'}
        onConfirm={handleConfirmClose}
        onCancel={() => setIsConfirmCloseOpen(false)}
      />
    </div>
  );
};

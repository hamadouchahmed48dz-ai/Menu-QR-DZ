import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { AdminTab } from './AdminSidebar';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingBag,
  DollarSign,
  Utensils,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileDown,
  RotateCw,
  Calendar,
  Lock,
  Layers,
  BarChart3,
  PieChart,
  Users,
  Flame,
} from 'lucide-react';
import {
  StatsPeriod,
  FullPeriodStats,
  MetricDelta,
} from '../../types';
import { supabaseService } from '../../services/supabaseService';
import {
  getAlgiersDateString,
  getMsUntilNextAlgiersMidnight,
  formatAlgiersTime,
  formatAlgiersDateYmd,
  formatAlgiersDayMonth,
} from '../../utils/statistics';
import { exportStatsToPDF } from '../../utils/pdfExport';

interface AdminOverviewProps {
  onNavigateTab?: (tab: AdminTab) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const {
    orders,
    products,
    serviceRequests,
    resolveServiceRequest,
    restaurant,
    lang,
    isOnboardingChecklistOpen,
    dismissOnboardingChecklist,
    onboardingStatus,
    userRole,
    showToast,
  } = useApp();
  const { t } = useTranslation(lang);

  const isAdmin = userRole !== 'staff';
  const weekStartDay = restaurant.weekStartDay || 'saturday';

  // Period state
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('today');
  const [customStart, setCustomStart] = useState<string>(() => formatAlgiersDateYmd());
  const [customEnd, setCustomEnd] = useState<string>(() => formatAlgiersDateYmd());
  const [showCustomPickers, setShowCustomPickers] = useState<boolean>(false);

  // Chart view toggle: revenue vs orders count (staff can only view orders count)
  const [timeseriesMetric, setTimeseriesMetric] = useState<'revenue' | 'orders'>(
    isAdmin ? 'revenue' : 'orders'
  );

  useEffect(() => {
    if (!isAdmin && timeseriesMetric !== 'orders') {
      setTimeseriesMetric('orders');
    }
  }, [isAdmin, timeseriesMetric]);

  // Loading & refresh state
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => formatAlgiersTime());
  const [statsError, setStatsError] = useState<string | null>(null);

  // PDF Export state
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Stats data
  const [statsData, setStatsData] = useState<FullPeriodStats | null>(null);

  // PART 1: Refs for Midnight tracking, in-memory cache, and concurrency guards
  const lastAlgiersDateRef = useRef<string>(getAlgiersDateString());
  const cacheRef = useRef<Map<string, { data: FullPeriodStats; timestamp: number }>>(new Map());
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const midnightTimerRef = useRef<any>(null);

  // Unique cache key
  const getCacheKey = useCallback(
    (period: StatsPeriod, cStart: string, cEnd: string) => {
      return `${restaurant.id || 'default'}_${period}_${weekStartDay}_${cStart}_${cEnd}_${isAdmin}`;
    },
    [restaurant.id, weekStartDay, isAdmin]
  );

  // Core statistics fetcher
  const loadStatistics = useCallback(
    async (forceRefresh: boolean = false) => {
      if (isFetchingRef.current) return;

      const cacheKey = getCacheKey(selectedPeriod, customStart, customEnd);
      const now = Date.now();

      // Check in-memory cache (fresh for 30 seconds unless forced)
      if (!forceRefresh) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && now - cached.timestamp < 30000) {
          setStatsData(cached.data);
          setIsLoadingStats(false);
          return;
        }
      }

      isFetchingRef.current = true;
      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const result = await supabaseService.fetchPeriodStatistics(
          selectedPeriod,
          weekStartDay,
          customStart,
          customEnd,
          orders,
          products,
          isAdmin
        );

        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        setStatsData(result);
        setLastRefreshedAt(formatAlgiersTime());
        lastAlgiersDateRef.current = getAlgiersDateString();
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setStatsError(
          lang === 'ar'
            ? 'تعذر تحميل الإحصائيات في الوقت الحالي. يرجى المحاولة لاحقاً.'
            : lang === 'fr'
            ? 'Impossible de charger les statistiques pour le moment.'
            : 'Could not load statistics at the moment.'
        );
      } finally {
        setIsLoadingStats(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
        lastFetchTimeRef.current = Date.now();
      }
    },
    [selectedPeriod, customStart, customEnd, getCacheKey, weekStartDay, orders, products, isAdmin, lang]
  );

  // Initial load and period change
  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod, customStart, customEnd, loadStatistics]);

  // PART 1 (Items 2, 3, 4): Automatic midnight update in Africa/Algiers (UTC+1)
  useEffect(() => {
    let isMounted = true;

    // Checks whether the Algiers calendar date has transitioned past midnight
    const handleCheckMidnightTransition = () => {
      if (!isMounted) return;
      const currentAlgiersDate = getAlgiersDateString();

      if (currentAlgiersDate !== lastAlgiersDateRef.current) {
        lastAlgiersDateRef.current = currentAlgiersDate;

        // Clear in-memory cache so periods recalculated for the new day
        cacheRef.current.clear();

        // Refetch fresh data for the new day (does not alter custom ranges)
        loadStatistics(true);
      }
    };

    // Schedule timer for exact next midnight in Africa/Algiers
    const scheduleNextMidnight = () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      const msUntilMidnight = getMsUntilNextAlgiersMidnight();

      midnightTimerRef.current = setTimeout(() => {
        handleCheckMidnightTransition();
        // Reschedule for subsequent midnight
        scheduleNextMidnight();
      }, msUntilMidnight);
    };

    scheduleNextMidnight();

    // 60-second periodic heartbeat check (catches sleeping phones / backgrounded tabs)
    const intervalId = setInterval(handleCheckMidnightTransition, 60000);

    // Window focus and visibilitychange handlers
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        handleCheckMidnightTransition();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      isMounted = false;
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [loadStatistics]);

  // Realtime order arrival: debounced refresh (at most once every 10 seconds)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current >= 10000 && !isFetchingRef.current) {
        loadStatistics(true);
      }
    }, 1200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [orders.length, loadStatistics]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadStatistics(true);
  };

  // PART 2: Export to PDF
  const handleExportPDF = async () => {
    if (!statsData || isExportingPDF) return;

    setIsExportingPDF(true);
    setPdfError(null);

    try {
      const res = await exportStatsToPDF(statsData, restaurant, lang, isAdmin);

      if (res.success) {
        showToast(
          res.openedInTab
            ? lang === 'ar'
              ? 'تم فتح تقرير PDF في نافذة جديدة'
              : 'Rapport PDF ouvert dans un nouvel onglet'
            : t.pdfExportSuccess
        );
      } else {
        setPdfError(res.error || t.pdfExportError);
      }
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setPdfError(t.pdfExportError);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const pendingRequests = serviceRequests.filter((r) => r.status === 'pending');

  // Delta badge renderer
  const renderDeltaBadge = (delta: MetricDelta, invertColors: boolean = false) => {
    if (delta.isNeutral) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-stone-500 dark:text-stone-300">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </span>
      );
    }

    const isGood = invertColors ? !delta.isUp : delta.isUp;
    const colorClass = isGood
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/20'
      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-500/20';

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${colorClass}`}
        title={t.vsPreviousPeriod}
      >
        {delta.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>
          {delta.isUp ? '+' : '-'}
          {delta.percent}%
        </span>
      </span>
    );
  };

  // Helper for formatting DZD
  const formatCurrency = (val: number) => {
    if (!isAdmin) return '—';
    return `${val.toLocaleString()} ${t.currency}`;
  };

  // Format "Last updated: HH:mm (Algiers)"
  const lastUpdatedLabel = t.lastUpdatedAlgiers.replace('{time}', lastRefreshedAt);

  return (
    <div className="space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
              {t.overview}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#FF5A1F] text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
              Live Realtime
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-300 mt-0.5">
            {lang === 'ar'
              ? `لوحة الإحصائيات الشاملة وتحليلات الأداء لمطعم ${restaurant.name} (بتوقيت الجزائر UTC+1)`
              : lang === 'fr'
              ? `Analytique des ventes et performance pour ${restaurant.name} (heure d'Alger UTC+1)`
              : `Sales performance & activity analytics for ${restaurant.name} (Africa/Algiers UTC+1)`}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Last updated indicator (Part 1, Item 5) */}
          <span className="text-[11px] font-mono font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
            {lastUpdatedLabel}
          </span>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title={t.refreshStats}
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#FF5A1F] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{t.refreshStats}</span>
          </button>

          {/* Export PDF Button (Admin only) */}
          {isAdmin && (
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || !statsData}
              className="h-9 px-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t.exportPDF}
            >
              {isExportingPDF ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#FF5A1F]" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#FF5A1F]" />
              )}
              <span>{isExportingPDF ? t.generatingPDF : t.exportPDF}</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Export Error Banner if any */}
      {isAdmin && pdfError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{pdfError}</span>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Onboarding Checklist Banner (admin only) */}
      {isAdmin && isOnboardingChecklistOpen && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 shadow-lg text-stone-900 dark:text-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF5A1F] text-white flex items-center justify-center font-black shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {lang === 'ar'
                    ? 'دليل تهيئة المطعم الجديد (3 خطوات للبدء)'
                    : lang === 'fr'
                    ? 'Guide de démarrage du restaurant (3 étapes)'
                    : 'Restaurant Setup Checklist (3 steps)'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-300">
                  {lang === 'ar'
                    ? 'أكمل هذه الخطوات ليكون مطعمك جاهزاً لاستقبال طلبات الزبائن عبر الـ QR'
                    : lang === 'fr'
                    ? 'Complétez ces étapes pour préparer votre restaurant aux commandes QR'
                    : 'Complete these steps to start accepting QR table orders'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/15 px-3 py-1 rounded-full border border-orange-500/30">
                {onboardingStatus.completedCount} / {onboardingStatus.totalCount}{' '}
                {lang === 'ar' ? 'مكتمل' : lang === 'fr' ? 'terminé' : 'done'}
              </span>
              <button
                onClick={dismissOnboardingChecklist}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-bold px-2 py-1"
                title={lang === 'ar' ? 'إخفاء الدليل' : 'Masquer'}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div
              className={`p-4 rounded-2xl border transition-all ${
                onboardingStatus.hasLogo
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-stone-500 dark:text-stone-300">
                  1. {lang === 'ar' ? 'شعار وهوية المطعم' : lang === 'fr' ? 'Logo & Infos' : 'Logo & Branding'}
                </span>
                {onboardingStatus.hasLogo ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-bold mb-3">
                {lang === 'ar'
                  ? 'أضف شعار مطعمك ورقم الهاتف وساعات العمل'
                  : lang === 'fr'
                  ? 'Ajoutez le logo, téléphone et horaires'
                  : 'Upload your logo and business hours'}
              </p>
              <button
                onClick={() => onNavigateTab?.('settings')}
                className="w-full h-8 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{lang === 'ar' ? 'تعديل الإعدادات' : lang === 'fr' ? 'Paramètres' : 'Go to Settings'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className={`p-4 rounded-2xl border transition-all ${
                onboardingStatus.hasDishes
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-stone-500 dark:text-stone-300">
                  2. {lang === 'ar' ? 'إضافة أطباق القائمة' : lang === 'fr' ? 'Plats du Menu' : 'Menu Dishes'}
                </span>
                {onboardingStatus.hasDishes ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-bold mb-3">
                {lang === 'ar'
                  ? 'تم تجهيز قسم مبدئي، أضف أطباقك مع الأسعار والصور'
                  : lang === 'fr'
                  ? 'Ajoutez vos plats avec prix et photos'
                  : 'Add your signature dishes and prices'}
              </p>
              <button
                onClick={() => onNavigateTab?.('products')}
                className="w-full h-8 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{lang === 'ar' ? 'إدارة الأطباق' : lang === 'fr' ? 'Gérer les plats' : 'Manage Dishes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className={`p-4 rounded-2xl border transition-all ${
                onboardingStatus.hasPrintedQR
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-stone-500 dark:text-stone-300">
                  3. {lang === 'ar' ? 'طباعة رموز QR للطاولات' : lang === 'fr' ? 'Codes QR des Tables' : 'Print Table QR Codes'}
                </span>
                {onboardingStatus.hasPrintedQR ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-bold mb-3">
                {lang === 'ar'
                  ? 'تم إنشاء طاولات تلقائياً، قم بطباعة بطاقاتها فوراً'
                  : lang === 'fr'
                  ? 'Imprimez les QR codes des tables'
                  : 'Print table cards with QR codes'}
              </p>
              <button
                onClick={() => onNavigateTab?.('qrcodes')}
                className="w-full h-8 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>{lang === 'ar' ? 'معاينة وطباعة QR' : lang === 'fr' ? 'Imprimer les QR' : 'Print QR Codes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Waiter Calls & Bill Requests Banner */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>Active Table Assistance Requests ({pendingRequests.length})</span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300">Real-time table summons</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-white dark:bg-stone-850 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    {t.table} {req.tableNumber}
                  </span>
                  <p className="text-xs text-stone-600 dark:text-stone-300 capitalize font-mono">
                    {req.type === 'bill' ? t.requestBill : t.callWaiter} · {req.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => resolveServiceRequest(req.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                >
                  Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERIOD SELECTOR STRIP (Part 1, Item 1 & 2) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Period Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300 me-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>{lang === 'ar' ? 'الفترة الزمنية:' : 'Period:'}</span>
            </span>

            {[
              { id: 'today', label: t.periodToday },
              { id: 'yesterday', label: t.periodYesterday },
              { id: 'this_week', label: t.periodThisWeek },
              { id: 'last_week', label: t.periodLastWeek },
              { id: 'this_month', label: t.periodThisMonth },
              { id: 'last_month', label: t.periodLastMonth },
              { id: 'custom', label: t.periodCustom },
            ].map((p) => {
              const isActive = selectedPeriod === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPeriod(p.id as StatsPeriod);
                    if (p.id === 'custom') {
                      setShowCustomPickers(true);
                    }
                  }}
                  className={`h-8 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF5A1F] text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-750'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Active Date Range Label & Timezone Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono text-stone-600 dark:text-stone-300">
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold">
              {statsData?.dateRangeLabel[lang] || statsData?.dateRangeLabel.ar}
            </span>
          </div>
        </div>

        {/* Custom Range Date Pickers (if Custom selected) */}
        {(selectedPeriod === 'custom' || showCustomPickers) && (
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                {lang === 'ar' ? 'من تاريخ:' : 'From:'}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                {lang === 'ar' ? 'إلى تاريخ:' : 'To:'}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setSelectedPeriod('custom');
                loadStatistics(true);
              }}
              className="h-8 px-3 rounded-lg bg-[#FF5A1F] text-white text-xs font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              {lang === 'ar' ? 'تطبيق التاريخ' : 'Apply Range'}
            </button>
          </div>
        )}
      </div>

      {/* Staff Permission Notice (Confidential financial metrics) */}
      {!isAdmin && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'أنت مسجل بحساب طاقم العمل (Staff): تم حجب أرقام الإيرادات ومبالغ الخصومات لحماية خصوصية المطعم، مع إتاحة عدد الطلبات وحركة الأطباق.'
              : 'Signed in as Staff: Financial revenue and discount amounts are masked for business privacy, while order quantities and operational trends remain visible.'}
          </span>
        </div>
      )}

      {/* Error state if any */}
      {statsError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{statsError}</span>
          </div>
          <button
            onClick={() => loadStatistics(true)}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* KPI CARDS STRIP (Revenue cards hidden for staff) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
          isAdmin ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-3'
        }`}
      >
        {/* Card 1: Total Revenue (Admin only) */}
        {isAdmin && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                  {t.totalRevenue}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                  {isLoadingStats ? (
                    <span className="inline-block w-20 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                  ) : (
                    <>
                      {statsData?.summary.total_revenue.toLocaleString()}{' '}
                      <span className="text-xs font-bold text-[#FF5A1F]">{t.currency}</span>
                    </>
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              {statsData && renderDeltaBadge(statsData.deltas.revenue)}
              <span className="text-[10px] text-stone-500 dark:text-stone-300">
                {lang === 'ar' ? 'الطلبات المؤكدة' : 'Confirmed'}
              </span>
            </div>
          </div>
        )}

        {/* Card 2: Number of Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                {t.ordersCount}
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF5A1F] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                {isLoadingStats ? (
                  <span className="inline-block w-14 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                ) : (
                  statsData?.summary.orders_count || 0
                )}
              </h3>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            {statsData && renderDeltaBadge(statsData.deltas.orders)}
            <span className="text-[10px] text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'غير ملغاة' : 'Valid'}
            </span>
          </div>
        </div>

        {/* Card 3: Average Order Value (Admin only) */}
        {isAdmin && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                  {t.avgOrderValue}
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                  {isLoadingStats ? (
                    <span className="inline-block w-16 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                  ) : (
                    <>
                      {statsData?.summary.avg_order_value.toLocaleString()}{' '}
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-300">{t.currency}</span>
                    </>
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              {statsData && renderDeltaBadge(statsData.deltas.aov)}
              <span className="text-[10px] text-stone-500 dark:text-stone-300">
                {lang === 'ar' ? 'لكل طاولة' : 'Per Ticket'}
              </span>
            </div>
          </div>
        )}

        {/* Card 4: Items Sold */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                {t.itemsSold}
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                {isLoadingStats ? (
                  <span className="inline-block w-14 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                ) : (
                  statsData?.summary.items_sold || 0
                )}
              </h3>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            {statsData && renderDeltaBadge(statsData.deltas.items)}
            <span className="text-[10px] text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'كمية الأطباق' : 'Dishes'}
            </span>
          </div>
        </div>

        {/* Card 5: Discounts Given (Admin only) */}
        {isAdmin && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                  {t.discountsGiven}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                  {isLoadingStats ? (
                    <span className="inline-block w-14 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                  ) : (
                    <>
                      {statsData?.summary.total_discounts.toLocaleString()}{' '}
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{t.currency}</span>
                    </>
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              {statsData && renderDeltaBadge(statsData.deltas.discounts)}
              <span className="text-[10px] text-stone-500 dark:text-stone-300">
                {lang === 'ar' ? 'عروض ترويجية' : 'Promos'}
              </span>
            </div>
          </div>
        )}

        {/* Card 6: Cancelled Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-300">
                {t.cancelledOrders}
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl sm:text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {isLoadingStats ? (
                  <span className="inline-block w-10 h-7 rounded-md bg-stone-200 dark:bg-stone-800 animate-pulse" />
                ) : (
                  statsData?.summary.cancelled_orders || 0
                )}
              </h3>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            {statsData && renderDeltaBadge(statsData.deltas.cancelled, true)}
            <span className="text-[10px] text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'مستبعدة من المبيعات' : 'Excluded'}
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart (a): Revenue & Order Count Over Time */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF5A1F]" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isAdmin
                    ? t.salesOverTime
                    : lang === 'ar'
                    ? 'الطلبات عبر الزمن'
                    : lang === 'fr'
                    ? 'Commandes dans le temps'
                    : 'Orders Over Time'}
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5">
                {statsData?.bucket === 'hour'
                  ? lang === 'ar'
                    ? 'التوزيع لكل ساعة من اليوم'
                    : lang === 'fr'
                    ? 'Répartition horaire sur la journée'
                    : 'Hourly distribution for the day'
                  : lang === 'ar'
                  ? 'التوزيع اليومي خلال الفترة المحددة'
                  : lang === 'fr'
                  ? 'Évolution journalière sur la période'
                  : 'Daily timeline during selected range'}
              </p>
            </div>

            {/* Metric Switcher: Revenue vs Orders */}
            {isAdmin && (
              <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 self-start sm:self-auto">
                <button
                  onClick={() => setTimeseriesMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeseriesMetric === 'revenue'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {t.totalRevenue}
                </button>
                <button
                  onClick={() => setTimeseriesMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeseriesMetric === 'orders'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {t.ordersCount}
                </button>
              </div>
            )}
          </div>

          {/* SVG / Bar Timeline */}
          {isLoadingStats ? (
            <div className="h-56 rounded-2xl bg-stone-50 dark:bg-stone-800/40 animate-pulse flex items-center justify-center">
              <span className="text-xs text-stone-400 font-mono">Loading timeseries...</span>
            </div>
          ) : !statsData || statsData.timeseries.length === 0 ? (
            <div className="h-56 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <BarChart3 className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bars container */}
              <div className="h-48 pt-6 pb-2 flex items-end justify-between gap-1.5 sm:gap-2 border-b border-stone-100 dark:border-stone-800">
                {(() => {
                  const effectiveMetric = isAdmin ? timeseriesMetric : 'orders';
                  const maxVal = Math.max(
                    ...statsData.timeseries.map((pt) =>
                      effectiveMetric === 'revenue' ? pt.revenue : pt.orders_count
                    ),
                    1
                  );

                  return statsData.timeseries.map((pt, idx) => {
                    const currentVal = effectiveMetric === 'revenue' ? pt.revenue : pt.orders_count;
                    const heightPercent = Math.max(12, Math.round((currentVal / maxVal) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 px-2 py-1 rounded-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-mono whitespace-nowrap shadow-md">
                          <span className="font-bold">{pt.time_bucket}</span>: {currentVal.toLocaleString()}{' '}
                          {effectiveMetric === 'revenue' ? t.currency : 'orders'}
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                            effectiveMetric === 'revenue'
                              ? 'bg-orange-500 hover:bg-[#FF5A1F]'
                              : 'bg-emerald-500 hover:bg-emerald-600'
                          }`}
                        />

                        {/* Label */}
                        <span className="text-[10px] font-mono text-stone-500 dark:text-stone-300 truncate w-full text-center">
                          {pt.time_bucket.includes(' ')
                            ? pt.time_bucket.split(' ')[1]
                            : pt.time_bucket.slice(5)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Legend & Summary Footer */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-300 font-mono">
                <span>
                  {lang === 'ar' ? 'مجموع نقاط البيانات:' : 'Data points:'}{' '}
                  {statsData.timeseries.length}
                </span>
                <span>
                  {lang === 'ar' ? 'التوقيت: إفريقيا/الجزائر (UTC+1)' : 'Timezone: Africa/Algiers (UTC+1)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart (b): Top 5 Best-Selling Dishes */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#FF5A1F]" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t.topSellingDishes}
                </h3>
              </div>
              <span className="text-xs font-bold text-[#FF5A1F] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                Top 5
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {isAdmin
                ? lang === 'ar'
                  ? 'الترتيب بالكمية والمبيعات خلال الفترة'
                  : 'Ranked by quantity & revenue generated'
                : lang === 'ar'
                ? 'الترتيب حسب عدد الطلبات خلال الفترة'
                : lang === 'fr'
                ? 'Classé par quantité commandée'
                : 'Ranked by quantity ordered'}
            </p>
          </div>

          {isLoadingStats ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : !statsData || statsData.topProducts.length === 0 ? (
            <div className="h-56 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <Utensils className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {statsData.topProducts.map((p, idx) => {
                const displayName =
                  lang === 'ar'
                    ? p.name_ar || p.product_name
                    : lang === 'fr'
                    ? p.name_fr || p.product_name
                    : p.name_en || p.product_name;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                        <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                          {p.quantity} {lang === 'ar' ? 'طلب' : 'sold'}
                        </span>
                        {isAdmin && (
                          <span className="text-[#FF5A1F]">{p.revenue.toLocaleString()} DA</span>
                        )}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        style={{ width: `${p.percent || 10}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#FF5A1F]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <span className="text-[11px] text-stone-500 dark:text-stone-300 font-medium">
              {lang === 'ar' ? 'أفضل الوجبات أداءً في المطعم' : 'Top kitchen performers'}
            </span>
          </div>
        </div>

        {/* Chart (c): Orders by Hour of Day (Busiest Hours) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t.busiestHours}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                24 Hours
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'تحديد أوقات الذروة لخدمتي الغداء والعشاء' : 'Peak service hours detection'}
            </p>
          </div>

          {/* 24-Hour Column Chart */}
          {isLoadingStats ? (
            <div className="h-44 rounded-2xl bg-stone-50 dark:bg-stone-800/40 animate-pulse" />
          ) : !statsData || statsData.hourly.every((h) => h.orders_count === 0) ? (
            <div className="h-44 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <Clock className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div>
              <div className="h-40 pt-4 pb-1 flex items-end justify-between gap-1 border-b border-stone-100 dark:border-stone-800">
                {(() => {
                  const maxHourOrders = Math.max(...statsData.hourly.map((h) => h.orders_count), 1);
                  return statsData.hourly.map((h) => {
                    const pct = Math.max(8, Math.round((h.orders_count / maxHourOrders) * 100));
                    const isPeak = h.orders_count === maxHourOrders && maxHourOrders > 0;
                    const isLunch = h.hour >= 12 && h.hour <= 15;
                    const isDinner = h.hour >= 18 && h.hour <= 22;

                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 px-1.5 py-0.5 rounded bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-mono whitespace-nowrap shadow-md">
                          {h.hour}:00 · {h.orders_count} orders
                        </div>

                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-sm transition-all duration-200 ${
                            isPeak
                              ? 'bg-rose-500'
                              : isLunch
                              ? 'bg-amber-400 dark:bg-amber-500'
                              : isDinner
                              ? 'bg-[#FF5A1F]'
                              : 'bg-stone-200 dark:bg-stone-700'
                          }`}
                        />
                        <span className="text-[9px] font-mono text-stone-400 dark:text-stone-300 mt-1">
                          {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Service Time Tags */}
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 pt-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>{lang === 'ar' ? 'الغداء (12h - 15h)' : 'Lunch (12h - 15h)'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F]" />
                  <span>{lang === 'ar' ? 'العشاء (18h - 22h)' : 'Dinner (18h - 22h)'}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart (d): Sales by Category */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isAdmin
                    ? t.salesByCategory
                    : lang === 'ar'
                    ? 'الأصناف حسب القسم'
                    : lang === 'fr'
                    ? 'Articles par catégorie'
                    : 'Items by Category'}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                Categories
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {isAdmin
                ? lang === 'ar'
                  ? 'حصة كل قسم من المبيعات والكميات'
                  : 'Revenue and item share by menu category'
                : lang === 'ar'
                ? 'حصة كل قسم من عدد الأطباق المطلوبة'
                : lang === 'fr'
                ? 'Répartition des articles par catégorie'
                : 'Item share by menu category'}
            </p>
          </div>

          {isLoadingStats ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : !statsData || statsData.categories.length === 0 ? (
            <div className="h-44 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <PieChart className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statsData.categories.slice(0, 6).map((c, i) => {
                const catName =
                  lang === 'ar' ? c.name_ar : lang === 'fr' ? c.name_fr : c.name_en;
                const colors = [
                  'bg-orange-500',
                  'bg-amber-500',
                  'bg-purple-500',
                  'bg-blue-500',
                  'bg-emerald-500',
                  'bg-rose-500',
                ];
                const bgCol = colors[i % colors.length];

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-stone-800 dark:text-stone-200">{catName}</span>
                      <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                        {c.items_sold} {lang === 'ar' ? 'عنصر' : 'items'}
                        {isAdmin && (
                          <span className="ms-2 text-stone-500 dark:text-stone-300">
                            ({c.revenue.toLocaleString()} DA)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        style={{ width: `${c.percent || 15}%` }}
                        className={`h-full rounded-full ${bgCol}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <span className="text-[11px] text-stone-500 dark:text-stone-300 font-medium">
              {statsData?.categories.length || 0} {lang === 'ar' ? 'أقسام نشطة' : 'active categories'}
            </span>
          </div>
        </div>

        {/* Chart (e): Orders by Dining Table */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t.ordersByTable}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Tables
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'أكثر الطاولات حركة وطلباً في الصالة' : 'Dining tables with highest order frequency'}
            </p>
          </div>

          {isLoadingStats ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : !statsData || statsData.tables.length === 0 ? (
            <div className="h-44 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <Users className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {statsData.tables.map((tbl, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 flex flex-col items-center text-center justify-center"
                >
                  <span className="text-xs font-bold uppercase text-stone-500 dark:text-stone-300">
                    {t.table}
                  </span>
                  <span className="text-lg font-black font-mono text-stone-900 dark:text-stone-50">
                    #{tbl.table_number}
                  </span>
                  <span className="mt-1 text-[11px] font-mono font-bold text-[#FF5A1F]">
                    {tbl.orders_count} {lang === 'ar' ? 'طلبات' : 'orders'}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] font-mono text-stone-500 dark:text-stone-300">
                      {tbl.revenue.toLocaleString()} DA
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <span className="text-[11px] text-stone-500 dark:text-stone-300 font-medium">
              {lang === 'ar' ? 'توزيع إشغال الطاولات' : 'Floor seating utilization'}
            </span>
          </div>
        </div>

        {/* Chart (f): Order Status Breakdown */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF5A1F]" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t.orderStatuses}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#FF5A1F] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                Statuses
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-300">
              {lang === 'ar' ? 'توزيع حالات الطلبات ونتائج المطبخ' : 'Order workflow & completion breakdown'}
            </p>
          </div>

          {isLoadingStats ? (
            <div className="h-44 rounded-2xl bg-stone-50 dark:bg-stone-800/40 animate-pulse" />
          ) : !statsData || statsData.statuses.length === 0 ? (
            <div className="h-44 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <Layers className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statsData.statuses.map((st, i) => {
                const statusStyles: Record<string, { label: string; badge: string; bar: string }> = {
                  received: {
                    label: t.statusReceived,
                    badge: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
                    bar: 'bg-blue-500',
                  },
                  preparing: {
                    label: t.statusPreparing,
                    badge: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
                    bar: 'bg-amber-500',
                  },
                  ready: {
                    label: t.statusReady,
                    badge: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
                    bar: 'bg-purple-500',
                  },
                  served: {
                    label: t.statusServed,
                    badge: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                    bar: 'bg-emerald-500',
                  },
                  cancelled: {
                    label: lang === 'ar' ? 'ملغى' : 'Cancelled',
                    badge: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
                    bar: 'bg-rose-500',
                  },
                };
                const style = statusStyles[st.status] || {
                  label: st.status,
                  badge: 'text-stone-600 bg-stone-100',
                  bar: 'bg-stone-500',
                };

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${style.badge}`}>
                          {style.label}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {st.count} ({st.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        style={{ width: `${st.percent || 10}%` }}
                        className={`h-full rounded-full ${style.bar}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <span className="text-[11px] text-stone-500 dark:text-stone-300 font-medium">
              {lang === 'ar' ? 'معدل إلغاء الطلبات:' : 'Cancellation rate:'}{' '}
              {statsData
                ? Math.round(
                    (statsData.summary.cancelled_orders /
                      Math.max(
                        statsData.summary.orders_count + statsData.summary.cancelled_orders,
                        1
                      )) *
                      100
                  )
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* LATEST ORDERS TABLE SECTION */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FF5A1F]" />
              <span>{t.latestOrders}</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5">
              {lang === 'ar'
                ? 'قائمة بأحدث تذاكر الطلبات الواردة خلال الفترة المحددة'
                : 'Recent order tickets submitted during the selected period'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab?.('orders')}
              className="h-8 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{lang === 'ar' ? 'عرض لوحة كانبان' : 'Open Kanban'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table of Orders */}
        {isLoadingStats ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
            ))}
          </div>
        ) : !statsData || statsData.latestOrders.length === 0 ? (
          <div className="py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center text-center">
            <ShoppingBag className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
            <p className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.noStatsData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700/80 text-[11px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</th>
                  <th className="py-2.5 px-3">{t.table}</th>
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  {isAdmin && <th className="py-2.5 px-3">{t.total}</th>}
                  <th className="py-2.5 px-3">{lang === 'ar' ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-xs font-medium">
                {statsData.latestOrders.map((ord) => {
                  const statusColors: Record<string, string> = {
                    received: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
                    preparing: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
                    ready: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
                    served: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
                    cancelled: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
                  };
                  const badgeColor =
                    statusColors[ord.status] || 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                        #{ord.order_number}
                        <span className="text-stone-400 dark:text-stone-500 ms-1">
                          • {formatAlgiersDayMonth(ord.order_date || ord.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-800 dark:text-stone-200">
                        {t.table} {ord.table_number}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 font-mono font-bold tabular-nums text-stone-900 dark:text-stone-100">
                          {formatCurrency(ord.total)}
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-500 dark:text-stone-300">
                        {new Date(ord.created_at).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                          timeZone: 'Africa/Algiers',
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Order, OrderHistoryResult, OrderStatus, getOptionName } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import {
  getAlgiersDateString,
  shiftAlgiersYmd,
  getAlgiersStartOfDayUtcIso,
  getAlgiersEndOfDayUtcIso,
  formatAlgiersTime,
  formatAlgiersShortDate,
  formatAlgiersDayMonth,
} from '../../utils/statistics';
import { loadPrintSettings } from '../../utils/printSettings';
import {
  PrintableDocumentPayload,
  TicketPrintMode,
  buildOrderPrintDocument,
  executeHiddenIframePrint,
  formatAlgiersTicketTime,
} from '../../utils/printEngine';
import { PrintFallbackModal } from './PrintFallbackModal';
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Archive,
  Receipt,
  UtensilsCrossed,
  X,
  RefreshCw,
  AlertCircle,
  History,
  ShieldAlert,
  Eye,
  Clock,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

const PAGE_SIZE = 50;

export const AdminOrderHistory: React.FC = () => {
  const {
    lang,
    userRole,
    restaurant,
    adminProfile,
    currentRestaurantId,
    isSupabaseLive,
    demoAllOrders,
    showToast,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const isAdmin = userRole !== 'staff';
  const todayYmd = getAlgiersDateString();
  const yesterdayYmd = shiftAlgiersYmd(todayYmd, -1);
  const minStaffYmd = shiftAlgiersYmd(todayYmd, -3);

  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleYmd, setSingleYmd] = useState<string>(yesterdayYmd);
  const [rangeFromYmd, setRangeFromYmd] = useState<string>(yesterdayYmd);
  const [rangeToYmd, setRangeToYmd] = useState<string>(yesterdayYmd);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  const [historyResult, setHistoryResult] = useState<OrderHistoryResult>({
    orders: [],
    totalCount: 0,
    summary: {
      ordersCount: 0,
      totalRecordsCount: 0,
      cancelledCount: 0,
      revenue: isAdmin ? 0 : null,
    },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [staffDateClampedNotice, setStaffDateClampedNotice] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printModalPayload, setPrintModalPayload] = useState<PrintableDocumentPayload | null>(null);
  const [printSandboxNotice, setPrintSandboxNotice] = useState<boolean>(false);

  const fetchVersionRef = useRef<number>(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Compute safe bounded dates (enforcing 3-day limit for staff)
  const getSafeDates = useCallback((): { fromYmd: string; toYmd: string; wasClamped: boolean } => {
    let rawFrom = dateMode === 'single' ? singleYmd : rangeFromYmd;
    let rawTo = dateMode === 'single' ? singleYmd : rangeToYmd;
    if (!rawFrom) rawFrom = yesterdayYmd;
    if (!rawTo) rawTo = rawFrom;

    if (rawFrom > rawTo) {
      const tmp = rawFrom;
      rawFrom = rawTo;
      rawTo = tmp;
    }

    let wasClamped = false;
    if (!isAdmin) {
      if (rawFrom < minStaffYmd) {
        rawFrom = minStaffYmd;
        wasClamped = true;
      }
      if (rawTo < minStaffYmd) {
        rawTo = minStaffYmd;
        wasClamped = true;
      }
      if (rawFrom > todayYmd) {
        rawFrom = todayYmd;
      }
      if (rawTo > todayYmd) {
        rawTo = todayYmd;
      }
    }

    return { fromYmd: rawFrom, toYmd: rawTo, wasClamped };
  }, [dateMode, singleYmd, rangeFromYmd, rangeToYmd, yesterdayYmd, isAdmin, minStaffYmd, todayYmd]);

  const fetchHistory = useCallback(async () => {
    const version = ++fetchVersionRef.current;
    const { fromYmd, toYmd, wasClamped } = getSafeDates();
    setStaffDateClampedNotice(wasClamped);

    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseLive) {
      // Standalone Demo Mode: filter demoAllOrders identically
      const fromUtc = getAlgiersStartOfDayUtcIso(fromYmd);
      const toUtc = getAlgiersEndOfDayUtcIso(toYmd);
      const cleanQ = debouncedSearch.trim().replace(/^#+/, '').toLowerCase();

      const inRange = demoAllOrders
        .filter((o) => o.createdAt >= fromUtc && o.createdAt <= toUtc)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let ordersCount = 0;
      let cancelledCount = 0;
      let revenue = 0;
      for (const o of inRange) {
        if (o.status === 'cancelled') cancelledCount += 1;
        else {
          ordersCount += 1;
          if (isAdmin) revenue += Number(o.total || 0);
        }
      }

      const filtered = inRange.filter((o) => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (cleanQ) {
          const numMatch = o.orderNumber.toLowerCase().includes(cleanQ);
          const tableMatch = String(o.tableNumber) === cleanQ;
          if (!numMatch && !tableMatch) return false;
        }
        return true;
      });

      const offset = page * PAGE_SIZE;
      if (version === fetchVersionRef.current) {
        setHistoryResult({
          orders: filtered.slice(offset, offset + PAGE_SIZE),
          totalCount: filtered.length,
          summary: {
            ordersCount,
            totalRecordsCount: inRange.length,
            cancelledCount,
            revenue: isAdmin ? revenue : null,
          },
        });
        setIsLoading(false);
      }
      return;
    }

    const targetRestId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.getOrderHistory({
      restaurantId: targetRestId,
      fromYmd,
      toYmd,
      status: statusFilter,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
      isAdmin,
    });

    if (version !== fetchVersionRef.current) return;

    if (res.error) {
      setErrorMessage(
        lang === 'ar'
          ? 'تعذر تحميل سجل الطلبات، يرجى المحاولة مرة أخرى.'
          : lang === 'fr'
          ? "Impossible de charger l'historique des commandes. Veuillez réessayer."
          : 'Could not load order history. Please try again.'
      );
    } else {
      setHistoryResult(res.data);
    }
    setIsLoading(false);
  }, [
    getSafeDates,
    isSupabaseLive,
    demoAllOrders,
    debouncedSearch,
    statusFilter,
    page,
    isAdmin,
    adminProfile?.restaurantId,
    currentRestaurantId,
    lang,
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSingleDateChange = (val: string) => {
    if (!val) return;
    if (!isAdmin && val < minStaffYmd) {
      setSingleYmd(minStaffYmd);
      setStaffDateClampedNotice(true);
    } else {
      setSingleYmd(val);
      setStaffDateClampedNotice(false);
    }
    setPage(0);
  };

  const handleRangeFromChange = (val: string) => {
    if (!val) return;
    const bounded = !isAdmin && val < minStaffYmd ? minStaffYmd : val;
    if (!isAdmin && val < minStaffYmd) setStaffDateClampedNotice(true);
    setRangeFromYmd(bounded);
    if (bounded > rangeToYmd) setRangeToYmd(bounded);
    setPage(0);
  };

  const handleRangeToChange = (val: string) => {
    if (!val) return;
    const bounded = !isAdmin && val < minStaffYmd ? minStaffYmd : val;
    if (!isAdmin && val < minStaffYmd) setStaffDateClampedNotice(true);
    setRangeToYmd(bounded);
    if (bounded < rangeFromYmd) setRangeFromYmd(bounded);
    setPage(0);
  };

  const handleReprintOrder = async (order: Order, mode: TicketPrintMode) => {
    const targetRestId = adminProfile?.restaurantId || restaurant.id;
    if (order.restaurantId && targetRestId && order.restaurantId !== targetRestId) {
      showToast(
        lang === 'ar'
          ? 'غير مصرح بطباعة هذا الطلب'
          : lang === 'fr'
          ? 'Non autorisé à imprimer cette commande'
          : 'Not authorized to print this order'
      );
      return;
    }

    try {
      const settings = loadPrintSettings(targetRestId);
      const payload = buildOrderPrintDocument(order, restaurant, settings, mode, lang);
      const res = await executeHiddenIframePrint(payload.htmlDocument);
      if (res.iframeRestricted || !res.success) {
        setPrintSandboxNotice(true);
        setPrintModalPayload(payload);
      }
    } catch {
      showToast(
        lang === 'ar'
          ? 'تعذر تجهيز التذكرة للطباعة، يرجى المحاولة مرة أخرى'
          : lang === 'fr'
          ? "Impossible de préparer le ticket pour l'impression"
          : 'Could not prepare ticket for printing'
      );
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return {
          label: t.statusReceived,
          cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        };
      case 'preparing':
        return {
          label: t.statusPreparing,
          cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'ready':
        return {
          label: t.statusReady,
          cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        };
      case 'served':
        return {
          label: t.statusServed,
          cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'cancelled':
        return {
          label: t.statusCancelled,
          cls: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
    }
  };

  const totalPages = Math.max(1, Math.ceil(historyResult.totalCount / PAGE_SIZE));
  const { fromYmd, toYmd } = getSafeDates();
  const isMultiDay = fromYmd !== toYmd;

  return (
    <div className="space-y-4">
      {/* Staff 3-day restriction notice */}
      {!isAdmin && (
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold ${
            staffDateClampedNotice
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
              : 'bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{t.staffHistoryLimitNotice}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Mode + Date Pickers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Single Day / Date Range toggle */}
            <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setDateMode('single');
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateMode === 'single'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {t.singleDayMode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateMode('range');
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateMode === 'range'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {t.dateRangeMode}
              </button>
            </div>

            {dateMode === 'single' ? (
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-stone-400 absolute start-3 pointer-events-none" />
                  <input
                    type="date"
                    value={singleYmd}
                    min={!isAdmin ? minStaffYmd : undefined}
                    max={todayYmd}
                    onChange={(e) => handleSingleDateChange(e.target.value)}
                    className="h-9 ps-8 pe-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSingleYmd(yesterdayYmd);
                    setPage(0);
                  }}
                  className={`h-9 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    singleYmd === yesterdayYmd
                      ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-[#FF5A1F]'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {t.periodYesterday}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSingleYmd(todayYmd);
                    setPage(0);
                  }}
                  className={`h-9 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    singleYmd === todayYmd
                      ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-[#FF5A1F]'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {t.periodToday}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={rangeFromYmd}
                  min={!isAdmin ? minStaffYmd : undefined}
                  max={todayYmd}
                  onChange={(e) => handleRangeFromChange(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
                <span className="text-xs font-bold text-stone-400">→</span>
                <input
                  type="date"
                  value={rangeToYmd}
                  min={!isAdmin ? minStaffYmd : undefined}
                  max={todayYmd}
                  onChange={(e) => handleRangeToChange(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>
            )}
          </div>

          {/* Search, Status Filter, Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchHistoryPlaceholder}
                className="w-full h-9 ps-9 pe-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | 'all');
                setPage(0);
              }}
              className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs font-bold text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="new">{t.statusReceived}</option>
              <option value="preparing">{t.statusPreparing}</option>
              <option value="ready">{t.statusReady}</option>
              <option value="served">{t.statusServed}</option>
              <option value="cancelled">{t.statusCancelled}</option>
            </select>

            <button
              type="button"
              onClick={fetchHistory}
              disabled={isLoading}
              className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.refreshStats}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Day / Range Summary Strip */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              {t.ordersCount}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-50">
                {historyResult.summary.ordersCount}
              </span>
              {historyResult.summary.cancelledCount > 0 && (
                <span className="text-[11px] font-semibold text-red-500 dark:text-red-400">
                  +{historyResult.summary.cancelledCount} {t.statusCancelled}
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              {isMultiDay ? t.dateRangeMode : t.singleDayMode}
            </p>
            <p className="text-sm sm:text-base font-black font-mono text-stone-900 dark:text-stone-50 mt-1.5">
              {isMultiDay
                ? `${formatAlgiersShortDate(fromYmd)} → ${formatAlgiersShortDate(toYmd)}`
                : formatAlgiersShortDate(fromYmd)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {t.totalRevenue}
              </p>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {Math.round(historyResult.summary.revenue ?? 0).toLocaleString()} {t.currency}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            {t.retry}
          </button>
        </div>
      )}

      {/* Orders List / Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-14 rounded-xl bg-stone-100 dark:bg-stone-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : historyResult.orders.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mb-3">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
              {t.emptyHistoryTitle}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm">
              {t.emptyHistoryDesc}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  <th className="py-3 px-4 text-start">{t.orderNumber}</th>
                  <th className="py-3 px-4 text-start">{t.table}</th>
                  <th className="py-3 px-4 text-start">
                    {lang === 'ar' ? 'الوقت' : lang === 'fr' ? 'Heure' : 'Time'}
                  </th>
                  <th className="py-3 px-4 text-start">
                    {lang === 'ar' ? 'الحالة' : lang === 'fr' ? 'Statut' : 'Status'}
                  </th>
                  <th className="py-3 px-4 text-start hidden sm:table-cell">
                    {t.itemsCount}
                  </th>
                  {isAdmin && <th className="py-3 px-4 text-end">{t.total}</th>}
                  <th className="py-3 px-4 text-end">
                    {lang === 'ar' ? 'إجراءات' : lang === 'fr' ? 'Actions' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 text-xs">
                {historyResult.orders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const algiersTime = formatAlgiersTime(new Date(order.createdAt));
                  const algiersDayMonth = formatAlgiersDayMonth(order.orderDate || order.createdAt);
                  const algiersShortDate = formatAlgiersShortDate(order.createdAt);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>
                            #{order.orderNumber}
                            <span className="text-stone-400 dark:text-stone-500 font-bold ms-1">
                              • {algiersDayMonth}
                            </span>
                          </span>
                          {order.archivedAt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-sans font-bold border border-stone-300/60 dark:border-stone-700">
                              <Archive className="w-2.5 h-2.5" />
                              {t.archivedBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] border border-orange-200 dark:border-orange-900/50 font-extrabold text-[11px]">
                          {t.table} {order.tableNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-bold">{algiersTime}</span>
                          {isMultiDay && (
                            <span className="text-[11px] text-stone-400 dark:text-stone-500">
                              · {algiersShortDate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300 hidden sm:table-cell font-mono">
                        {order.items.reduce((acc, it) => acc + it.quantity, 0)} {t.itemsCount}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-end font-mono font-black text-stone-900 dark:text-stone-100 whitespace-nowrap tabular-nums">
                          {order.total.toLocaleString()} {t.currency}
                        </td>
                      )}
                      <td
                        className="py-3.5 px-4 text-end whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title={lang === 'ar' ? 'التفاصيل' : lang === 'fr' ? 'Détails' : 'Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">
                              {lang === 'ar' ? 'عرض' : lang === 'fr' ? 'Voir' : 'View'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReprintOrder(order, 'kitchen')}
                            className="h-8 px-2.5 rounded-lg bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title={t.reprintTicket}
                          >
                            <UtensilsCrossed className="w-3 h-3 text-[#FF5A1F]" />
                            <span className="hidden xl:inline">{t.reprintTicket}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {historyResult.totalCount > 0 && (
          <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-mono">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, historyResult.totalCount)} /{' '}
              {historyResult.totalCount}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8 px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{lang === 'ar' ? 'السابق' : lang === 'fr' ? 'Précédent' : 'Prev'}</span>
              </button>

              <span className="font-mono font-bold text-stone-700 dark:text-stone-200 px-2">
                {page + 1} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page + 1 >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{lang === 'ar' ? 'التالي' : lang === 'fr' ? 'Suivant' : 'Next'}</span>
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-850">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FF5A1F]" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                  {lang === 'ar'
                    ? `تفاصيل الطلب #${selectedOrder.orderNumber} • ${formatAlgiersDayMonth(selectedOrder.orderDate || selectedOrder.createdAt)}`
                    : lang === 'fr'
                    ? `Détails commande #${selectedOrder.orderNumber} • ${formatAlgiersDayMonth(selectedOrder.orderDate || selectedOrder.createdAt)}`
                    : `Order #${selectedOrder.orderNumber} • ${formatAlgiersDayMonth(selectedOrder.orderDate || selectedOrder.createdAt)}`}
                </h3>
                {selectedOrder.archivedAt && (
                  <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold">
                    {t.archivedBadge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-stone-900 dark:text-stone-100">
              <div className="text-center pb-3 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                <p className="text-base font-black tracking-wider uppercase text-[#FF5A1F]">
                  {restaurant.name}
                </p>
                <div className="flex items-center justify-center gap-3 mt-1 text-sm font-black">
                  <span>
                    TICKET #{selectedOrder.orderNumber} •{' '}
                    {formatAlgiersDayMonth(selectedOrder.orderDate || selectedOrder.createdAt)}
                  </span>
                  <span>•</span>
                  <span>TABLE #{selectedOrder.tableNumber}</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {formatAlgiersTicketTime(selectedOrder.createdAt, true)} (Africa/Algiers)
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {selectedOrder.items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="pb-2.5 border-b border-stone-200 dark:border-stone-800 space-y-1"
                  >
                    <div className="flex items-start justify-between text-sm">
                      <div className="font-bold">
                        <span className="text-[#FF5A1F] me-2 font-black">{it.quantity}×</span>
                        <span>{it.product.name[lang] || it.product.name.en}</span>
                      </div>
                      {isAdmin && (
                        <span className="tabular-nums font-semibold text-stone-600 dark:text-stone-300">
                          {it.totalPrice} {restaurant.currency || 'DZD'}
                        </span>
                      )}
                    </div>

                    {it.selectedSize && (
                      <p className="ps-6 text-[11px] text-stone-600 dark:text-stone-300">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {lang === 'ar' ? 'الحجم:' : lang === 'fr' ? 'Taille:' : 'Size:'}
                        </span>{' '}
                        {getOptionName(it.selectedSize, lang)}
                      </p>
                    )}

                    {it.selectedExtras && it.selectedExtras.length > 0 && (
                      <p className="ps-6 text-[11px] text-stone-600 dark:text-stone-300">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {lang === 'ar' ? 'إضافات:' : lang === 'fr' ? 'Extras:' : 'Extras:'}
                        </span>{' '}
                        +{it.selectedExtras.map((e) => getOptionName(e, lang)).join(', ')}
                      </p>
                    )}

                    {it.selectedComplements && it.selectedComplements.length > 0 && (
                      <div className="ps-6 text-[11px] text-stone-600 dark:text-stone-300 space-y-0.5">
                        {it.selectedComplements.map((sc, scIdx) => (
                          <p key={sc.itemId || scIdx}>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {sc.groupTitle[lang] || sc.groupTitle.en}:
                            </span>{' '}
                            {sc.name[lang] || sc.name.en}
                          </p>
                        ))}
                      </div>
                    )}

                    {it.notes && (
                      <p className="ps-6 text-[11px] text-amber-600 dark:text-amber-400 italic font-sans">
                        Note: "{it.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-sans text-xs">
                  <span className="font-bold block mb-0.5">
                    {lang === 'ar'
                      ? 'ملاحظة الزبون:'
                      : lang === 'fr'
                      ? 'Note de la commande:'
                      : 'Customer Note:'}
                  </span>
                  <p className="italic">"{selectedOrder.notes}"</p>
                </div>
              )}

              {/* Discounts & Totals — strictly Admin only */}
              {isAdmin && (
                <div className="pt-2 border-t-2 border-dashed border-stone-300 dark:border-stone-700 space-y-1">
                  {selectedOrder.subtotal != null && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-300">
                      <span>{t.subtotal}</span>
                      <span>
                        {selectedOrder.subtotal} {restaurant.currency || 'DZD'}
                      </span>
                    </div>
                  )}
                  {selectedOrder.discountTotal != null && selectedOrder.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{lang === 'ar' ? 'الخصم' : lang === 'fr' ? 'Remises' : 'Discounts'}</span>
                      <span>
                        -{selectedOrder.discountTotal} {restaurant.currency || 'DZD'}
                      </span>
                    </div>
                  )}
                  {selectedOrder.appliedOffers && selectedOrder.appliedOffers.length > 0 && (
                    <div className="pt-1 space-y-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      {selectedOrder.appliedOffers.map((ao, idx) => (
                        <div key={ao.id || idx} className="flex justify-between">
                          <span>• {ao.title}</span>
                          <span>
                            -{ao.discountAmount} {restaurant.currency || 'DZD'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black pt-1 border-t border-stone-200 dark:border-stone-800">
                    <span>TOTAL</span>
                    <span className="text-[#FF5A1F]">
                      {selectedOrder.total} {restaurant.currency || 'DZD'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Reprint Actions */}
            <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer"
              >
                {t.cancel || 'Close'}
              </button>

              <button
                type="button"
                onClick={() => handleReprintOrder(selectedOrder, 'kitchen')}
                className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold flex items-center gap-1.5 shadow-xs hover:opacity-90 cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>
                  {lang === 'ar'
                    ? 'إعادة طباعة تذكرة المطبخ'
                    : lang === 'fr'
                    ? 'Réimprimer ticket cuisine'
                    : 'Reprint kitchen ticket'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleReprintOrder(selectedOrder, 'receipt')}
                className="px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar'
                    ? 'إعادة طباعة الفاتورة'
                    : lang === 'fr'
                    ? 'Réimprimer le reçu'
                    : 'Reprint receipt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Fallback Modal */}
      <PrintFallbackModal
        payload={printModalPayload}
        showSandboxNotice={printSandboxNotice}
        onClose={() => {
          setPrintModalPayload(null);
          setPrintSandboxNotice(false);
        }}
      />
    </div>
  );
};

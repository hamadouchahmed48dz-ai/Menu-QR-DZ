import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Order, OrderStatus, getOptionName } from '../../types';
import { AdminTab } from './AdminSidebar';
import { getNextHappyPathStatus } from '../../utils/orderLifecycle';
import { loadPrintSettings } from '../../utils/printSettings';
import {
  PrintableDocumentPayload,
  TicketPrintMode,
  buildOrderPrintDocument,
  executeHiddenIframePrint,
  formatAlgiersTicketTime,
} from '../../utils/printEngine';
import {
  getAlgiersDateString,
  getAlgiersStartOfDayUtcIso,
  getMsUntilNextAlgiersMidnight,
  formatAlgiersBoardDate,
  formatAlgiersTime,
  formatAlgiersShortDate,
  formatAlgiersDayMonth,
} from '../../utils/statistics';
import { PrintFallbackModal } from '../../components/admin/PrintFallbackModal';
import { AdminOrderHistory } from '../../components/admin/AdminOrderHistory';
import {
  Clock,
  ChefHat,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  MessageSquare,
  Volume2,
  VolumeX,
  XCircle,
  BellRing,
  Receipt,
  Printer,
  X,
  UtensilsCrossed,
  Archive,
  CalendarDays,
  RefreshCw,
  BarChart3,
  History,
  Kanban,
  AlertTriangle,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

interface AdminOrdersKanbanProps {
  onNavigateTab?: (tab: AdminTab) => void;
}

export const AdminOrdersKanban: React.FC<AdminOrdersKanbanProps> = ({ onNavigateTab }) => {
  const {
    orders,
    tables,
    restaurant,
    adminProfile,
    userRole,
    updateOrderStatus,
    refreshDailyOrders,
    archiveOrders,
    isOrdersLoading,
    ordersError,
    ordersLastUpdated,
    lang,
    isSoundEnabled,
    setIsSoundEnabled,
    playTestChime,
    highlightedOrderId,
    confirmAction,
    showToast,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const isAdmin = userRole !== 'staff';

  const [activeSubTab, setActiveSubTab] = useState<'board' | 'history'>('board');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);
  const [printModalPayload, setPrintModalPayload] = useState<PrintableDocumentPayload | null>(null);
  const [printSandboxNotice, setPrintSandboxNotice] = useState<boolean>(false);
  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());

  // Algiers Midnight Renewal State (same mechanism as AdminOverview)
  const [boardAlgiersDate, setBoardAlgiersDate] = useState<string>(() => getAlgiersDateString());
  const lastAlgiersDateRef = useRef<string>(getAlgiersDateString());
  const midnightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDebouncedMidnightRefresh = useCallback(() => {
    if (midnightDebounceRef.current) {
      clearTimeout(midnightDebounceRef.current);
    }
    midnightDebounceRef.current = setTimeout(() => {
      refreshDailyOrders();
    }, 500);
  }, [refreshDailyOrders]);

  useEffect(() => {
    let midnightTimeoutId: ReturnType<typeof setTimeout>;

    const checkDayRollover = () => {
      const currentAlgiersDate = getAlgiersDateString();
      if (currentAlgiersDate !== lastAlgiersDateRef.current) {
        lastAlgiersDateRef.current = currentAlgiersDate;
        setBoardAlgiersDate(currentAlgiersDate);
        triggerDebouncedMidnightRefresh();
      }
    };

    const scheduleNextMidnight = () => {
      const ms = getMsUntilNextAlgiersMidnight();
      midnightTimeoutId = setTimeout(() => {
        checkDayRollover();
        scheduleNextMidnight();
      }, ms);
    };

    scheduleNextMidnight();
    const intervalId = setInterval(checkDayRollover, 60000);

    const onFocus = () => checkDayRollover();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDayRollover();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(midnightTimeoutId);
      clearInterval(intervalId);
      if (midnightDebounceRef.current) clearTimeout(midnightDebounceRef.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [triggerDebouncedMidnightRefresh]);

  const startOfBoardDayUtc = useMemo(
    () => getAlgiersStartOfDayUtcIso(boardAlgiersDate),
    [boardAlgiersDate]
  );

  // Partition unarchived orders into Today (Algiers) vs Open Pending from Previous Days
  const { todayOrders, pendingPreviousOrders } = useMemo(() => {
    const todayList: Order[] = [];
    const prevPendingList: Order[] = [];

    for (const o of orders) {
      if (o.archivedAt) continue;
      if (o.createdAt >= startOfBoardDayUtc) {
        todayList.push(o);
      } else if (o.status === 'new' || o.status === 'preparing' || o.status === 'ready') {
        prevPendingList.push(o);
      }
    }

    return { todayOrders: todayList, pendingPreviousOrders: prevPendingList };
  }, [orders, startOfBoardDayUtc]);

  // Live Today Mini-Statistics
  const todayStats = useMemo(() => {
    const validOrders = todayOrders.filter((o) => o.status !== 'cancelled');
    const cancelledCount = todayOrders.filter((o) => o.status === 'cancelled').length;
    const countNew = todayOrders.filter((o) => o.status === 'new').length;
    const countPreparing = todayOrders.filter((o) => o.status === 'preparing').length;
    const countReady = todayOrders.filter((o) => o.status === 'ready').length;
    const countServed = todayOrders.filter((o) => o.status === 'served').length;
    const revenue = isAdmin
      ? validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      : 0;
    const aov =
      isAdmin && validOrders.length > 0 ? Math.round(revenue / validOrders.length) : 0;

    return {
      totalValid: validOrders.length,
      cancelledCount,
      countNew,
      countPreparing,
      countReady,
      countServed,
      revenue,
      aov,
    };
  }, [todayOrders, isAdmin]);

  // Available table numbers for filter dropdown
  const tableOptions = useMemo(() => {
    const nums = new Set<number>();
    tables.forEach((tb) => nums.add(tb.number));
    todayOrders.forEach((o) => nums.add(o.tableNumber));
    return Array.from(nums).sort((a, b) => a - b);
  }, [tables, todayOrders]);

  const columns: {
    status: OrderStatus;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgAccent: string;
  }[] = [
    {
      status: 'new',
      title: t.kanbanNew,
      icon: <Clock className="w-4 h-4 text-sky-500" />,
      color: 'border-sky-500',
      bgAccent: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
    },
    {
      status: 'preparing',
      title: t.kanbanPreparing,
      icon: <ChefHat className="w-4 h-4 text-amber-500" />,
      color: 'border-amber-500',
      bgAccent: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    },
    {
      status: 'ready',
      title: t.kanbanReady,
      icon: <Sparkles className="w-4 h-4 text-orange-500" />,
      color: 'border-orange-500',
      bgAccent: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    },
    {
      status: 'served',
      title: t.kanbanServed,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      color: 'border-emerald-500',
      bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    },
  ];

  const filteredTodayOrders = useMemo(() => {
    return todayOrders.filter((o) => {
      if (selectedTableFilter !== 'all' && o.tableNumber.toString() !== selectedTableFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchItems = o.items.some((i) =>
          (i.product.name.en + i.product.name.fr + i.product.name.ar).toLowerCase().includes(q)
        );
        if (!matchNum && !matchItems) return false;
      }
      return true;
    });
  }, [todayOrders, selectedTableFilter, searchQuery]);

  const handleCancelOrder = async (order: Order) => {
    const confirmed = await confirmAction({
      title: t.cancelOrder || 'Cancel Order',
      message:
        lang === 'ar'
          ? `هل تريد إلغاء الطلب #${order.orderNumber}؟`
          : lang === 'fr'
          ? `Annuler la commande #${order.orderNumber} ?`
          : `Cancel order #${order.orderNumber}?`,
      confirmLabel: t.cancelOrder || 'Cancel Order',
      cancelLabel: t.cancel || 'Back',
      variant: 'danger',
    });
    if (!confirmed) return;
    await updateOrderStatus(order.id, 'cancelled');
  };

  const handleArchiveSingle = async (order: Order) => {
    const confirmed = await confirmAction({
      title: t.archiveConfirmTitle,
      message: t.archiveConfirmMsg.replace('{orderNumber}', order.orderNumber),
      confirmLabel: t.archiveOrder,
      cancelLabel: t.cancel,
      variant: 'warning',
    });
    if (!confirmed) return;

    setArchivingIds((prev) => new Set(prev).add(order.id));
    try {
      await archiveOrders([order.id]);
    } finally {
      setArchivingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleArchiveAllPrevious = async () => {
    if (pendingPreviousOrders.length === 0) return;
    const confirmed = await confirmAction({
      title: t.archiveAllConfirmTitle,
      message: t.archiveAllConfirmMsg.replace('{count}', String(pendingPreviousOrders.length)),
      confirmLabel: t.archiveAll,
      cancelLabel: t.cancel,
      variant: 'warning',
    });
    if (!confirmed) return;

    const ids = pendingPreviousOrders.map((o) => o.id);
    setArchivingIds((prev) => new Set([...prev, ...ids]));
    try {
      await archiveOrders(ids);
    } finally {
      setArchivingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handlePrintOrder = async (order: Order, mode: TicketPrintMode) => {
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

  const getPreviousStatusLabel = (status: OrderStatus) => {
    if (status === 'new') return t.statusReceived;
    if (status === 'preparing') return t.statusPreparing;
    if (status === 'ready') return t.statusReady;
    return status;
  };

  const formattedBoardDate = useMemo(() => {
    // Re-evaluate whenever boardAlgiersDate changes
    const [y, m, d] = boardAlgiersDate.split('-').map((n) => parseInt(n, 10));
    const refDate = new Date(Date.UTC(y, m - 1, d, 11, 0, 0));
    return formatAlgiersBoardDate(lang, refDate);
  }, [boardAlgiersDate, lang]);

  const formattedLastUpdated = useMemo(
    () => t.lastUpdatedAlgiers.replace('{time}', formatAlgiersTime(ordersLastUpdated)),
    [t.lastUpdatedAlgiers, ordersLastUpdated]
  );

  return (
    <div className="space-y-5">
      {/* Top Title & Sub-Tab Switcher (Daily Board | Order History) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
              {activeSubTab === 'board' ? `${t.orders} Kanban` : t.orderHistoryTab}
            </h2>

            {activeSubTab === 'board' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200">
                <CalendarDays className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>{formattedBoardDate}</span>
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400">
            {activeSubTab === 'board'
              ? formattedLastUpdated
              : lang === 'ar'
              ? 'استعراض الطلبات المؤرشفة والسابقة حسب التاريخ (توقيت الجزائر)'
              : lang === 'fr'
              ? 'Consulter les commandes passées et archivées (heure d’Alger)'
              : 'Browse past and archived orders by date (Africa/Algiers time)'}
          </p>
        </div>

        {/* Sub-Tab Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-900 p-1 border border-stone-200 dark:border-stone-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('board')}
              className={`h-9 px-3.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'board'
                  ? 'bg-[#FF5A1F] text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>{t.dailyBoardTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`h-9 px-3.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-[#FF5A1F] text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t.orderHistoryTab}</span>
            </button>
          </div>

          {activeSubTab === 'board' && (
            <button
              type="button"
              onClick={() => refreshDailyOrders()}
              disabled={isOrdersLoading}
              className="h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title={t.refreshStats}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOrdersLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.refreshStats}</span>
            </button>
          )}
        </div>
      </div>

      {/* Render Order History View when selected */}
      {activeSubTab === 'history' ? (
        <AdminOrderHistory />
      ) : (
        <>
          {/* Board Controls Toolbar: Sound, Search, Table Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sound alert toggle & test */}
              <div className="flex items-center bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl p-1 shadow-2xs">
                <button
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSoundEnabled
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-[#FF5A1F]'
                      : 'text-stone-500 dark:text-stone-300 hover:text-stone-700 dark:hover:text-stone-100'
                  }`}
                  title={isSoundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
                >
                  {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isSoundEnabled ? 'Sound On' : 'Muted'}</span>
                </button>
                <button
                  onClick={playTestChime}
                  className="px-2 py-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  title="Test chime"
                >
                  Test
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchHistoryPlaceholder}
                  className="h-10 ps-9 pe-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              <select
                value={selectedTableFilter}
                onChange={(e) => setSelectedTableFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-xs text-stone-700 dark:text-stone-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
              >
                <option value="all">{t.allTablesFilter}</option>
                {tableOptions.map((num) => (
                  <option key={num} value={String(num)}>
                    {t.table} {num}
                  </option>
                ))}
              </select>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('overview')}
                className="h-10 px-3.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white text-xs font-bold flex items-center gap-1.5 border border-stone-800 dark:border-stone-700 shadow-2xs transition-colors cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>{t.viewFullStatistics}</span>
              </button>
            )}
          </div>

          {/* Today Mini-Statistics Strip (Live + Midnight Reset, Staff sees Counts Only) */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 ${
              isAdmin ? 'lg:grid-cols-7' : 'lg:grid-cols-5'
            } gap-2.5`}
          >
            {/* Orders Today */}
            <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {t.todaysOrders}
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black font-mono text-stone-900 dark:text-stone-50">
                    {todayStats.totalValid}
                  </span>
                  {todayStats.cancelledCount > 0 && (
                    <span className="text-[10px] font-semibold text-red-500">
                      (+{todayStats.cancelledCount} {t.statusCancelled})
                    </span>
                  )}
                </div>
              </div>
              <ShoppingBag className="w-4 h-4 text-[#FF5A1F] shrink-0" />
            </div>

            {/* Admin-Only Money Cards */}
            {isAdmin && (
              <>
                <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      {t.todaysRevenue}
                    </p>
                    <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                      {Math.round(todayStats.revenue).toLocaleString()} {t.currency}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      {t.avgOrderValue}
                    </p>
                    <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-100 mt-0.5 tabular-nums">
                      {todayStats.aov.toLocaleString()} {t.currency}
                    </p>
                  </div>
                  <Receipt className="w-4 h-4 text-orange-500 shrink-0" />
                </div>
              </>
            )}

            {/* Per-Column Live Counts */}
            <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {t.statusReceived}
                </p>
                <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-50 mt-0.5">
                  {todayStats.countNew}
                </p>
              </div>
              <Clock className="w-4 h-4 text-sky-500 shrink-0" />
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t.statusPreparing}
                </p>
                <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-50 mt-0.5">
                  {todayStats.countPreparing}
                </p>
              </div>
              <ChefHat className="w-4 h-4 text-amber-500 shrink-0" />
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {t.statusReady}
                </p>
                <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-50 mt-0.5">
                  {todayStats.countReady}
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t.statusServed}
                </p>
                <p className="text-lg font-black font-mono text-stone-900 dark:text-stone-50 mt-0.5">
                  {todayStats.countServed}
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          </div>

          {/* Friendly Error Banner */}
          {ordersError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ordersError}</span>
              </div>
              <button
                type="button"
                onClick={() => refreshDailyOrders()}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                {t.retry}
              </button>
            </div>
          )}

          {/* Highlighted Strip: Open Orders From Previous Days */}
          {pendingPreviousOrders.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-400/70 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/20 p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-50">
                        {t.pendingPreviousDaysTitle}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono text-xs font-black">
                        {pendingPreviousOrders.length}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                      {t.pendingPreviousDaysSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleArchiveAllPrevious}
                  disabled={archivingIds.size > 0}
                  className="h-9 px-3.5 rounded-xl bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-400 text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{t.archiveAll}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingPreviousOrders.map((order) => {
                  const next = getNextHappyPathStatus(order.status);
                  const isArchiving = archivingIds.has(order.id);
                  const dayMonth = formatAlgiersDayMonth(order.orderDate || order.createdAt);
                  const algiersTime = formatAlgiersTime(new Date(order.createdAt));

                  return (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-300/80 dark:border-amber-800/60 shadow-2xs flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketOrder(order)}
                          className="text-start group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-stone-900 dark:text-stone-50 group-hover:text-[#FF5A1F]">
                              #{order.orderNumber} • {dayMonth}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50 text-[10px] font-mono font-bold">
                              {algiersTime}
                            </span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] font-bold text-stone-600 dark:text-stone-300">
                            {getPreviousStatusLabel(order.status)} · {order.items.reduce((s, it) => s + it.quantity, 0)} {t.itemsCount}
                          </span>
                        </button>

                        <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] border border-orange-200 dark:border-orange-900/50 font-extrabold text-[11px] shrink-0">
                          {t.table} {order.tableNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketOrder(order)}
                            className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold cursor-pointer"
                          >
                            {lang === 'ar' ? 'عرض' : lang === 'fr' ? 'Voir' : 'View'}
                          </button>

                          <button
                            type="button"
                            disabled={isArchiving}
                            onClick={() => handleArchiveSingle(order)}
                            className="h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Archive className="w-3 h-3" />
                            <span>{t.archiveOrder}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {(order.status === 'new' || order.status === 'preparing') && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              className="h-8 px-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              title={t.cancelOrder}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {next && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, next)}
                              className="h-8 px-2.5 rounded-lg bg-[#FF5A1F] hover:bg-orange-600 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span className="capitalize">{next}</span>
                              {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty Day Banner (when today has 0 orders and not loading) */}
          {!isOrdersLoading && todayOrders.length === 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 px-6 py-7 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center mb-2.5">
                <Kanban className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100">
                {t.emptyDayBoardTitle}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                {t.emptyDayBoardDesc}
              </p>
            </div>
          )}

          {/* Kanban Board Columns Grid */}
          {isOrdersLoading && orders.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {columns.map((col) => (
                <div
                  key={col.status}
                  className="bg-stone-100/70 dark:bg-stone-900/70 rounded-2xl p-4 border border-stone-200/70 dark:border-stone-800 min-h-[420px] space-y-3"
                >
                  <div className="h-6 w-32 rounded-lg bg-stone-200 dark:bg-stone-800 animate-pulse" />
                  <div className="h-36 rounded-xl bg-stone-200/70 dark:bg-stone-800/60 animate-pulse" />
                  <div className="h-36 rounded-xl bg-stone-200/70 dark:bg-stone-800/60 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {columns.map((col) => {
                const colOrders = filteredTodayOrders.filter((o) => o.status === col.status);

                return (
                  <div
                    key={col.status}
                    className="bg-stone-100/70 dark:bg-stone-900/70 rounded-2xl p-3 sm:p-4 border border-stone-200/70 dark:border-stone-800 flex flex-col min-h-[500px]"
                  >
                    {/* Column Title Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/80 dark:border-stone-800">
                      <div className="flex items-center gap-2">
                        {col.icon}
                        <h3 className="text-sm font-black text-stone-800 dark:text-stone-200">
                          {col.title}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 shadow-2xs border border-stone-200 dark:border-stone-700">
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Order Cards Container */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {colOrders.length === 0 ? (
                        <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-stone-300 dark:border-stone-800 text-stone-400 text-xs">
                          {lang === 'ar'
                            ? 'لا توجد طلبات في هذه الخانة'
                            : lang === 'fr'
                            ? 'Aucune commande'
                            : 'No tickets in queue'}
                        </div>
                      ) : (
                        colOrders.map((order) => {
                          const next = getNextHappyPathStatus(order.status);
                          const formattedTime = formatAlgiersTicketTime(order.createdAt, false);
                          const isHighlighted = order.id === highlightedOrderId;

                          return (
                            <div
                              key={order.id}
                              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                isHighlighted
                                  ? 'border-orange-500 ring-4 ring-orange-500/30 bg-orange-50/50 dark:bg-orange-950/30 animate-pulse'
                                  : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md'
                              }`}
                            >
                              {/* Top: Order # & Table badge */}
                              <div className="flex items-start justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTicketOrder(order)}
                                  className="text-start group cursor-pointer"
                                  title={lang === 'ar' ? 'عرض تفاصيل الطلب' : 'View order details'}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-sm text-stone-900 dark:text-stone-50 group-hover:text-[#FF5A1F] transition-colors">
                                      #{order.orderNumber}
                                    </span>
                                    {isHighlighted && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-950 px-1.5 py-0.2 rounded-md">
                                        <BellRing className="w-3 h-3 animate-bounce" /> New
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-300 mt-0.5 font-mono">
                                    <Clock className="w-3 h-3 text-stone-400 dark:text-stone-300" />
                                    <span>{formattedTime}</span>
                                  </div>
                                </button>

                                <div className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] border border-orange-200 dark:border-orange-900/50 font-extrabold text-xs">
                                  {t.table} {order.tableNumber}
                                </div>
                              </div>

                              {/* Items List */}
                              <div className="space-y-2 py-2 border-y border-stone-100 dark:border-stone-800/80">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="text-xs space-y-0.5 bg-stone-50/70 dark:bg-stone-800/40 p-2 rounded-lg"
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 text-stone-900 dark:text-stone-100 font-medium">
                                        <span className="font-mono font-bold text-[#FF5A1F]">
                                          {item.quantity}×
                                        </span>
                                        <span className="line-clamp-1">
                                          {item.product.name[lang] || item.product.name.en}
                                        </span>
                                      </div>
                                      <span className="font-mono tabular-nums text-stone-600 dark:text-stone-300 text-[11px] shrink-0 font-semibold">
                                        {item.totalPrice} DA
                                      </span>
                                    </div>

                                    {item.selectedSize && (
                                      <div className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300 ps-5">
                                        <span className="font-semibold text-stone-700 dark:text-stone-200">
                                          {lang === 'ar' ? 'الحجم:' : lang === 'fr' ? 'Taille:' : 'Size:'}
                                        </span>
                                        <span>{getOptionName(item.selectedSize, lang)}</span>
                                      </div>
                                    )}

                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                      <div className="flex items-start gap-1 text-[11px] text-stone-600 dark:text-stone-300 ps-5">
                                        <span className="font-semibold text-stone-700 dark:text-stone-200 shrink-0">
                                          {lang === 'ar' ? 'إضافات:' : lang === 'fr' ? 'Extras:' : 'Extras:'}
                                        </span>
                                        <span className="line-clamp-1">
                                          +{item.selectedExtras.map((e) => getOptionName(e, lang)).join(', ')}
                                        </span>
                                      </div>
                                    )}

                                    {item.selectedComplements && item.selectedComplements.length > 0 && (
                                      <div className="space-y-0.5 ps-5 text-[11px] text-stone-600 dark:text-stone-300">
                                        {item.selectedComplements.map((sc, idx) => (
                                          <div key={sc.itemId || idx} className="flex items-start gap-1">
                                            <span className="font-medium text-stone-700 dark:text-stone-200 shrink-0">
                                              {sc.groupTitle[lang] || sc.groupTitle.en}:
                                            </span>
                                            <span className="line-clamp-1">
                                              {sc.name[lang] || sc.name.en}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {item.notes && (
                                      <p className="text-[11px] text-amber-600 dark:text-amber-400 italic ps-5">
                                        "{item.notes}"
                                      </p>
                                    )}
                                  </div>
                                ))}

                                {order.notes && (
                                  <div className="mt-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5 italic">
                                    <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />
                                    <span className="break-words">"{order.notes}"</span>
                                  </div>
                                )}
                              </div>

                              {/* Quick Print Buttons Row on Card */}
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePrintOrder(order, 'kitchen')}
                                  className="h-8 px-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  title={
                                    lang === 'ar'
                                      ? 'طباعة تذكرة المطبخ'
                                      : lang === 'fr'
                                      ? 'Imprimer bon cuisine'
                                      : 'Print kitchen ticket'
                                  }
                                >
                                  <UtensilsCrossed className="w-3 h-3 text-[#FF5A1F]" />
                                  <span className="truncate">
                                    {lang === 'ar'
                                      ? 'تذكرة مطبخ'
                                      : lang === 'fr'
                                      ? 'Bon cuisine'
                                      : 'Kitchen'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePrintOrder(order, 'receipt')}
                                  className="h-8 px-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  title={
                                    lang === 'ar'
                                      ? 'طباعة الفاتورة'
                                      : lang === 'fr'
                                      ? 'Imprimer le reçu'
                                      : 'Print receipt'
                                  }
                                >
                                  <Receipt className="w-3 h-3 text-emerald-500" />
                                  <span className="truncate">
                                    {lang === 'ar' ? 'فاتورة' : lang === 'fr' ? 'Reçu' : 'Receipt'}
                                  </span>
                                </button>
                              </div>

                              {/* Total & Action Stepper */}
                              <div className="flex items-center justify-between pt-1">
                                <div>
                                  <span className="text-[10px] text-stone-500 dark:text-stone-300 uppercase font-bold block">
                                    Total
                                  </span>
                                  <span className="font-mono font-black text-sm text-stone-900 dark:text-stone-100">
                                    {order.total} {t.currency}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTicketOrder(order)}
                                    className="h-8 px-2 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                    title={
                                      lang === 'ar'
                                        ? 'تفاصيل التذكرة'
                                        : lang === 'fr'
                                        ? 'Détails du ticket'
                                        : 'Ticket Details'
                                    }
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline text-[11px]">
                                      {lang === 'ar' ? 'عرض' : 'View'}
                                    </span>
                                  </button>

                                  {(order.status === 'new' || order.status === 'preparing') && (
                                    <button
                                      onClick={() => handleCancelOrder(order)}
                                      className="h-8 px-2 rounded-lg text-stone-400 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-all cursor-pointer"
                                      title="Cancel order"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {next && (
                                    <button
                                      onClick={() => updateOrderStatus(order.id, next)}
                                      className="h-8 px-3.5 rounded-lg bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                      <span className="capitalize">{next}</span>
                                      {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Order Ticket & Receipt Details Modal */}
      {selectedTicketOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedTicketOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-850">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FF5A1F]" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                  {lang === 'ar'
                    ? `تفاصيل الطلب #${selectedTicketOrder.orderNumber} • ${formatAlgiersDayMonth(selectedTicketOrder.orderDate || selectedTicketOrder.createdAt)}`
                    : lang === 'fr'
                    ? `Détails commande #${selectedTicketOrder.orderNumber} • ${formatAlgiersDayMonth(selectedTicketOrder.orderDate || selectedTicketOrder.createdAt)}`
                    : `Order #${selectedTicketOrder.orderNumber} • ${formatAlgiersDayMonth(selectedTicketOrder.orderDate || selectedTicketOrder.createdAt)}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketOrder(null)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Slip Content */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-stone-900 dark:text-stone-100">
              <div className="text-center pb-3 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                <p className="text-base font-black tracking-wider uppercase text-[#FF5A1F]">
                  {restaurant.name}
                </p>
                <div className="flex items-center justify-center gap-3 mt-1 text-sm font-black">
                  <span>
                    TICKET #{selectedTicketOrder.orderNumber} •{' '}
                    {formatAlgiersDayMonth(selectedTicketOrder.orderDate || selectedTicketOrder.createdAt)}
                  </span>
                  <span>•</span>
                  <span>TABLE #{selectedTicketOrder.tableNumber}</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {formatAlgiersTicketTime(selectedTicketOrder.createdAt, true)} (Africa/Algiers)
                </p>
              </div>

              {/* Items Detail */}
              <div className="space-y-3">
                {selectedTicketOrder.items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="pb-2.5 border-b border-stone-200 dark:border-stone-800 space-y-1"
                  >
                    <div className="flex items-start justify-between text-sm">
                      <div className="font-bold">
                        <span className="text-[#FF5A1F] me-2 font-black">{it.quantity}×</span>
                        <span>{it.product.name[lang] || it.product.name.en}</span>
                      </div>
                      <span className="tabular-nums font-semibold text-stone-600 dark:text-stone-300">
                        {it.totalPrice} {restaurant.currency || 'DZD'}
                      </span>
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

              {selectedTicketOrder.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-sans text-xs">
                  <span className="font-bold block mb-0.5">
                    {lang === 'ar' ? 'ملاحظة الزبون:' : lang === 'fr' ? 'Note de la commande:' : 'Customer Note:'}
                  </span>
                  <p className="italic">"{selectedTicketOrder.notes}"</p>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="pt-2 border-t-2 border-dashed border-stone-300 dark:border-stone-700 space-y-1">
                {selectedTicketOrder.subtotal != null && (
                  <div className="flex justify-between text-stone-600 dark:text-stone-300">
                    <span>{t.subtotal}</span>
                    <span>
                      {selectedTicketOrder.subtotal} {restaurant.currency || 'DZD'}
                    </span>
                  </div>
                )}
                {selectedTicketOrder.discountTotal != null && selectedTicketOrder.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>{lang === 'ar' ? 'الخصم' : lang === 'fr' ? 'Remises' : 'Discounts'}</span>
                    <span>
                      -{selectedTicketOrder.discountTotal} {restaurant.currency || 'DZD'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-1 border-t border-stone-200 dark:border-stone-800">
                  <span>TOTAL</span>
                  <span className="text-[#FF5A1F]">
                    {selectedTicketOrder.total} {restaurant.currency || 'DZD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Print Actions */}
            <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTicketOrder(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer"
              >
                {t.cancel || 'Close'}
              </button>

              <button
                type="button"
                onClick={() => handlePrintOrder(selectedTicketOrder, 'kitchen')}
                className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold flex items-center gap-1.5 shadow-xs hover:opacity-90 cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>
                  {lang === 'ar'
                    ? 'طباعة تذكرة المطبخ'
                    : lang === 'fr'
                    ? 'Imprimer ticket cuisine'
                    : 'Print kitchen ticket'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintOrder(selectedTicketOrder, 'receipt')}
                className="px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar'
                    ? 'طباعة الفاتورة'
                    : lang === 'fr'
                    ? 'Imprimer le reçu'
                    : 'Print receipt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Fallback / PDF Download Modal */}
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

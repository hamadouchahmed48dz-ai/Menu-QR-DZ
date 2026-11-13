import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import { AdminOrdersKanban } from './AdminOrdersKanban';
import { AdminProducts } from './AdminProducts';
import { AdminCategories } from './AdminCategories';
import { AdminTables } from './AdminTables';
import { AdminQRCodes } from './AdminQRCodes';
import { AdminOffers } from './AdminOffers';
import { AdminSettings } from './AdminSettings';
import { AdminLoginModal } from './AdminLoginModal';
import { ErrorView } from '../ErrorView';
import { RestaurantStatusQuickToggle } from '../../components/admin/RestaurantStatusQuickToggle';
import { PrintFallbackModal } from '../../components/admin/PrintFallbackModal';
import { supabaseService } from '../../services/supabaseService';
import {
  hasOrderBeenAutoPrinted,
  loadPrintSettings,
  markOrderAutoPrinted,
} from '../../utils/printSettings';
import {
  PrintableDocumentPayload,
  buildOrderPrintDocument,
  executeHiddenIframePrint,
} from '../../utils/printEngine';
import { Menu, Bell, Utensils, CheckCircle2, LogOut } from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const {
    isAdminAuthenticated,
    isAuthLoading,
    isPasswordRecoveryMode,
    setCurrentView,
    signOutAdmin,
    theme,
    toggleTheme,
    lang,
    setLang,
    userRole,
    serviceRequests,
    resolveServiceRequest,
    toastMessage,
    showToast,
    confirmAction,
    restaurant,
    adminProfile,
    latestRealtimeOrder,
  } = useApp();
  const { t } = useTranslation(lang);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [autoPrintModalPayload, setAutoPrintModalPayload] =
    useState<PrintableDocumentPayload | null>(null);
  const [autoPrintSandboxNotice, setAutoPrintSandboxNotice] = useState<boolean>(false);

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: t.logout || 'Log Out',
      message: t.logoutConfirmMsg || 'Are you sure you want to log out of the admin dashboard?',
      confirmLabel: t.logout || 'Log Out',
      cancelLabel: t.cancel || 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    await signOutAdmin();
  };
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showServiceNotificationDrawer, setShowServiceNotificationDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (userRole === 'staff' && (activeTab === 'settings' || activeTab === 'offers')) {
      setActiveTab('orders');
    }
  }, [userRole, activeTab]);

  // Auto-print incoming kitchen ticket (debounced, strictly deduplicated, current restaurant only)
  useEffect(() => {
    if (!isAdminAuthenticated || isPasswordRecoveryMode || !latestRealtimeOrder) return;
    const adminRestId = adminProfile?.restaurantId;
    if (!adminRestId || latestRealtimeOrder.restaurantId !== adminRestId) return;

    const settings = loadPrintSettings(adminRestId);
    if (!settings.autoPrintKitchen) return;

    const { orderId } = latestRealtimeOrder;
    if (hasOrderBeenAutoPrinted(adminRestId, orderId)) return;

    const timer = setTimeout(async () => {
      if (hasOrderBeenAutoPrinted(adminRestId, orderId)) return;
      try {
        const order = await supabaseService.getOrderById(orderId);
        if (!order || order.restaurantId !== adminRestId) return;
        if (hasOrderBeenAutoPrinted(adminRestId, order.id)) return;

        markOrderAutoPrinted(adminRestId, order.id);
        const latestSettings = loadPrintSettings(adminRestId);
        const payload = buildOrderPrintDocument(order, restaurant, latestSettings, 'kitchen', lang);
        const res = await executeHiddenIframePrint(payload.htmlDocument);

        if (res.iframeRestricted || !res.success) {
          setAutoPrintSandboxNotice(true);
          setAutoPrintModalPayload(payload);
          showToast(
            lang === 'ar'
              ? `الطلب #${order.orderNumber} جاهز للطباعة`
              : lang === 'fr'
              ? `Commande #${order.orderNumber} prête à imprimer`
              : `Order #${order.orderNumber} ready to print`
          );
        }
      } catch {
        // Silently ignore auto-print failures without breaking dashboard
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    latestRealtimeOrder,
    isAdminAuthenticated,
    isPasswordRecoveryMode,
    adminProfile?.restaurantId,
    restaurant,
    lang,
    showToast,
  ]);

  // 1. Session verification & auto-setup phase
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 p-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-600/20 text-[#FF5A1F] border border-orange-500/30 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10">
          <Utensils className="w-7 h-7 animate-pulse text-[#FF5A1F]" />
        </div>
        <p className="text-sm font-bold text-stone-200">
          {lang === 'ar' ? 'جاري إعداد وتجهيز مطعمك...' : lang === 'fr' ? 'Configuration de votre restaurant en cours...' : 'Setting up your restaurant...'}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-300 mt-1">
          {lang === 'ar' ? 'التحقق من الصلاحيات والربط الآمن' : 'Securing tenant session & loading data'}
        </p>
      </div>
    );
  }

  // 2. Unauthenticated or in Password Recovery mode: render protected Auth Modal
  if (!isAdminAuthenticated || isPasswordRecoveryMode) {
    return <AdminLoginModal />;
  }

  const pendingRequests = serviceRequests.filter((r) => r.status === 'pending');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview onNavigateTab={setActiveTab} />;
      case 'orders':
        return <AdminOrdersKanban onNavigateTab={setActiveTab} />;
      case 'products':
        return <AdminProducts />;
      case 'categories':
        return <AdminCategories />;
      case 'tables':
        return (
          <AdminTables
            onNavigateSettings={
              userRole !== 'staff' ? () => setActiveTab('settings') : undefined
            }
          />
        );
      case 'qrcodes':
        return <AdminQRCodes />;
      case 'offers':
        if (userRole === 'staff') {
          return (
            <div className="py-12 flex flex-col items-center justify-center">
              <ErrorView
                type="unauthorized"
                customTitle={lang === 'ar' ? 'صلاحية المدير مطلوبة' : lang === 'fr' ? 'Accès administrateur requis' : 'Admin Role Required'}
                customMessage={
                  lang === 'ar'
                    ? 'إدارة العروض والخصومات متاحة للمديرين فقط.'
                    : lang === 'fr'
                    ? 'La gestion des promotions est réservée aux administrateurs.'
                    : 'Promotions and offers can only be managed by administrators.'
                }
                onRetry={() => setActiveTab('orders')}
              />
            </div>
          );
        }
        return <AdminOffers />;
      case 'settings':
        if (userRole === 'staff') {
          return (
            <div className="py-12 flex flex-col items-center justify-center">
              <ErrorView
                type="unauthorized"
                customTitle={lang === 'ar' ? 'صلاحية المدير مطلوبة' : lang === 'fr' ? 'Accès administrateur requis' : 'Admin Role Required'}
                customMessage={
                  lang === 'ar'
                    ? 'إعدادات المطعم وإدارة الفريق متاحة للمديرين فقط.'
                    : lang === 'fr'
                    ? "Les paramètres du restaurant et l'équipe sont réservés aux administrateurs."
                    : 'Restaurant settings and team management are restricted to administrators.'
                }
                onRetry={() => setActiveTab('orders')}
              />
            </div>
          );
        }
        return <AdminSettings />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-4 py-2.5 rounded-full bg-stone-900/95 dark:bg-white/95 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-md border border-white/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ps-64 min-w-0">

        {/* Top Header Bar */}
        <header className="no-print h-16 bg-white dark:bg-stone-900 border-b border-stone-200/80 dark:border-stone-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="text-stone-500 dark:text-stone-300">Admin</span>
              <span className="text-stone-400 dark:text-stone-500">/</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 capitalize">
                {activeTab}
              </span>
            </div>
          </div>

          {/* Right: Quick actions, notifications, switch to customer view */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Open/Closed Status Toggle */}
            <RestaurantStatusQuickToggle />

            {/* Table Calls Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowServiceNotificationDrawer(!showServiceNotificationDrawer)}
                className="relative p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                title="Service calls"
              >
                <Bell className="w-4 h-4" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center font-mono animate-pulse">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              {/* Service Calls Dropdown */}
              {showServiceNotificationDrawer && (
                <div className="absolute end-0 mt-2 w-72 p-3 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800 font-bold">
                    <span>Active Table Calls</span>
                    <span className="font-mono text-stone-500 dark:text-stone-300">({pendingRequests.length})</span>
                  </div>
                  <div className="py-2 space-y-2 max-h-48 overflow-y-auto">
                    {pendingRequests.length === 0 ? (
                      <p className="text-stone-500 dark:text-stone-300 py-3 text-center">No pending waiter calls</p>
                    ) : (
                      pendingRequests.map((r) => (
                        <div
                          key={r.id}
                          className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold">Table {r.tableNumber}</p>
                            <p className="text-[10px] text-stone-500 dark:text-stone-300 capitalize font-mono">{r.type} · {r.timestamp}</p>
                          </div>
                          <button
                            onClick={() => resolveServiceRequest(r.id)}
                            className="p-1 rounded-lg bg-emerald-500 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Switch to customer view CTA */}
            <button
              onClick={() => setCurrentView('menu')}
              className="h-9 px-3 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.backToCustomerMenu}</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-stone-200 dark:border-stone-700/60"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </header>

        {/* View Content Port */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Auto-Print Fallback / PDF Download Modal */}
      <PrintFallbackModal
        payload={autoPrintModalPayload}
        showSandboxNotice={autoPrintSandboxNotice}
        onClose={() => {
          setAutoPrintModalPayload(null);
          setAutoPrintSandboxNotice(false);
        }}
      />
    </div>
  );
};

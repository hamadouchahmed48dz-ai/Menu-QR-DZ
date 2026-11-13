import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import {
  LayoutDashboard,
  Kanban,
  UtensilsCrossed,
  Tags,
  TableProperties,
  QrCode,
  Flame,
  Settings,
  ArrowLeft,
  Moon,
  Sun,
  LogOut,
  Bell,
  Utensils,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'tables'
  | 'qrcodes'
  | 'offers'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  isMobileOpen,
  onCloseMobile,
}) => {
  const {
    restaurant,
    orders,
    serviceRequests,
    theme,
    toggleTheme,
    lang,
    setLang,
    setCurrentView,
    signOutAdmin,
    userRole,
    adminProfile,
    user,
    confirmAction,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

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

  const pendingOrdersCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing').length;
  const pendingRequestsCount = serviceRequests.filter((r) => r.status === 'pending').length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number; adminOnly?: boolean }[] = [
    { id: 'overview', label: t.overview, icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'orders',
      label: t.orders,
      icon: <Kanban className="w-4 h-4" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    { id: 'products', label: t.products, icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'categories', label: t.categories, icon: <Tags className="w-4 h-4" /> },
    { id: 'tables', label: t.tables, icon: <TableProperties className="w-4 h-4" /> },
    { id: 'qrcodes', label: t.qrCodes, icon: <QrCode className="w-4 h-4" /> },
    { id: 'offers', label: t.offers, icon: <Flame className="w-4 h-4" />, adminOnly: true },
    { id: 'settings', label: t.settings, icon: <Settings className="w-4 h-4" />, adminOnly: true },
  ];

  const handleSelectTab = (tab: AdminTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-stone-900 dark:bg-stone-950 text-stone-200 border-e border-stone-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header / Brand */}
        <div>
          <div className="p-5 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center font-black shadow-md">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight leading-tight">
                  MenuQR Admin
                </h1>
                <p className="text-[11px] text-stone-300 truncate max-w-[120px]">
                  {restaurant.name}
                </p>
              </div>
            </div>

            {/* Waiter calls badge if any */}
            {pendingRequestsCount > 0 && (
              <span
                className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center animate-bounce shadow-md"
                title={`${pendingRequestsCount} active table calls`}
              >
                {pendingRequestsCount}
              </span>
            )}
          </div>

          {/* User Account & Role Badge */}
          <div className="px-5 py-3 border-b border-stone-800/80 bg-stone-950/40 flex items-center justify-between text-xs">
            <div className="truncate me-2">
              <p className="font-bold text-stone-100 truncate">
                {adminProfile?.fullName || (user?.email ? user.email.split('@')[0] : 'Restaurant Manager')}
              </p>
              <p className="text-[10px] text-stone-300 truncate font-mono">
                {user?.email || 'Authenticated Session'}
              </p>
            </div>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                userRole === 'admin'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {userRole}
            </span>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems
              .filter((item) => !(item.adminOnly && userRole === 'staff'))
              .map((item) => {
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full h-11 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-[#FF5A1F] text-white shadow-sm'
                        : 'text-stone-200 hover:text-white hover:bg-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-stone-300'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Bottom Utility Controls */}
        <div className="p-4 border-t border-stone-800 space-y-3">
          {/* Back to Customer Menu */}
          <button
            onClick={() => setCurrentView('menu')}
            className="w-full h-10 px-3 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-100 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-orange-400" />
            <span>{t.backToCustomerMenu}</span>
          </button>

          {/* Secondary bar: Dark mode, Language, Logout */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLang(lang === 'en' ? 'fr' : lang === 'fr' ? 'ar' : 'en')}
                className="px-2 py-1 rounded bg-stone-800 text-stone-200 font-bold hover:text-white"
              >
                {lang.toUpperCase()}
              </button>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded bg-stone-800 text-stone-200 hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="text-stone-300 hover:text-red-400 p-1 flex items-center gap-1"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

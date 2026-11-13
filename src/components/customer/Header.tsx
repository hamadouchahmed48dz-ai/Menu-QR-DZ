import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Language } from '../../types';
import { getReopenFormatted } from '../../utils/restaurantStatus';
import { Moon, Sun, Utensils, Bell, Shield, MapPin, Clock, AlertCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    restaurant,
    isRestaurantOpen,
    lang,
    setLang,
    theme,
    toggleTheme,
    activeTable,
    hasValidTable,
    setCurrentView,
    callWaiter,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const reopenInfo = getReopenFormatted(restaurant.reopenAt, lang);

  const languages: { code: Language; label: string }[] = [
    { code: 'ar', label: 'عربي' },
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <header className="relative w-full overflow-hidden bg-stone-900 text-white select-none">
      {/* Cover Image with gradient overlay and themeColor fallback */}
      <div
        className="relative h-48 sm:h-56 md:h-64 w-full overflow-hidden"
        style={{
          backgroundColor: restaurant.themeColor || '#FF5A1F',
          backgroundImage: !restaurant.coverImage
            ? `radial-gradient(circle at 20% 30%, ${restaurant.themeColor || '#FF5A1F'} 0%, #1c1917 100%)`
            : undefined,
        }}
      >
        {restaurant.coverImage ? (
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover object-center scale-105 filter brightness-90 transform transition-transform duration-700 hover:scale-100"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Hide image if broken so themeColor fallback displays
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-black/40" />

        {/* Top Floating Controls Bar */}
        <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between z-10">
          {/* Read-only Table Badge (set strictly via QR scan) */}
          {hasValidTable ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                {t.table} <strong className="font-extrabold text-orange-400">{activeTable}</strong>
              </span>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          {/* Right Controls: Language switcher, Dark Mode, Quick Waiter, Admin switch */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/15 text-xs font-medium">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-1 rounded-full transition-all ${
                    lang === l.code
                      ? 'bg-orange-600 text-white font-bold shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-stone-200 hover:text-white flex items-center justify-center transition-transform active:scale-90"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick Call Waiter button */}
            <button
              type="button"
              disabled={!isRestaurantOpen || !hasValidTable}
              onClick={() => callWaiter('waiter')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold shadow-md transition-all ${
                isRestaurantOpen && hasValidTable
                  ? 'bg-orange-600/90 hover:bg-orange-600 border-orange-500/40 text-white active:scale-95'
                  : 'bg-stone-800/80 border-stone-700 text-stone-400 opacity-60 cursor-not-allowed'
              }`}
              title={
                !isRestaurantOpen
                  ? lang === 'ar'
                    ? 'المطعم مغلق حالياً - خدمة الطاولات غير متاحة'
                    : lang === 'fr'
                    ? 'Restaurant fermé - service de table indisponible'
                    : 'Restaurant closed - table service unavailable'
                  : !hasValidTable
                  ? t.scanQrToOrder
                  : t.callWaiter
              }
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.callWaiter}</span>
            </button>

            {/* Admin Switch */}
            <button
              onClick={() => setCurrentView('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-850 hover:bg-stone-800 border border-white/20 text-stone-200 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              title={lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Portal'}
            >
              <Shield className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>{lang === 'ar' ? 'الإدارة' : 'Admin'}</span>
            </button>
          </div>
        </div>

        {/* Restaurant Identity overlay at bottom of cover (Circular logo + Name + Tagline) */}
        <div className="absolute bottom-3 sm:bottom-4 inset-x-0 px-4 sm:px-6 flex items-end justify-between">
          <div className="flex items-center gap-3.5">
            {/* Circular Logo */}
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/40 shadow-xl ring-4 ring-orange-500/20 shrink-0 bg-stone-900"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-600 border-2 border-white/30 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                <Utensils className="w-8 h-8 text-white" />
              </div>
            )}

            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                {restaurant.name || t.restaurantName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-200/90 line-clamp-1 max-w-md drop-shadow-xs">
                {restaurant.description || restaurant.tagline?.[lang] || restaurant.tagline?.en || ''}
              </p>
            </div>
          </div>

          {/* Opening Status Badge */}
          <div className="hidden sm:flex flex-col items-end text-xs">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium backdrop-blur-xs border ${
                isRestaurantOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRestaurantOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span>
                {isRestaurantOpen
                  ? t.openNow
                  : reopenInfo && !reopenInfo.isPassed
                  ? `${lang === 'ar' ? 'مغلق' : lang === 'fr' ? 'Fermé' : 'Closed'} · ${reopenInfo.badgeLabel}`
                  : lang === 'ar'
                  ? 'مغلق حالياً'
                  : lang === 'fr'
                  ? 'Fermé actuellement'
                  : 'Currently Closed'}
              </span>
            </div>
            {restaurant.openingHours && (
              <div className="flex items-center gap-1 text-[11px] text-stone-300 mt-1">
                <Clock className="w-3 h-3 text-stone-300" />
                <span>{restaurant.openingHours}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Meta Strip */}
      <div className="sm:hidden px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-300">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isRestaurantOpen ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="text-stone-200 font-medium">
            {isRestaurantOpen
              ? t.openNow
              : reopenInfo && !reopenInfo.isPassed
              ? `${lang === 'ar' ? 'مغلق' : lang === 'fr' ? 'Fermé' : 'Closed'} (${reopenInfo.badgeLabel})`
              : lang === 'ar'
              ? 'مغلق حالياً'
              : lang === 'fr'
              ? 'Fermé'
              : 'Closed'}
          </span>
          {restaurant.openingHours && (
            <>
              <span>·</span>
              <span>{restaurant.openingHours}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-stone-300 truncate max-w-[150px]">
          <MapPin className="w-3 h-3 shrink-0 text-stone-300" />
          <span className="truncate">{restaurant.address || 'Alger Centre'}</span>
        </div>
      </div>
    </header>
  );
};

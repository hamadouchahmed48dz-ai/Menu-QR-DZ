import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { Header } from '../components/customer/Header';
import { Footer } from '../components/customer/Footer';
import { CategoryTabs } from '../components/customer/CategoryTabs';
import { SearchBar, FilterBadge } from '../components/customer/SearchBar';
import { ProductCard } from '../components/customer/ProductCard';
import { ProductDetailModal } from '../components/customer/ProductDetailModal';
import { FloatingCartBar } from '../components/customer/FloatingCartBar';
import { CartDrawer } from '../components/customer/CartDrawer';
import { OrderStatusModal } from '../components/customer/OrderStatusModal';
import { Product } from '../types';
import { isOfferCurrentlyValid, logHiddenOffersInDev } from '../utils/promotions';
import { getRestaurantClosedMessage, getReopenFormatted } from '../utils/restaurantStatus';
import { SearchX, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, Store, Clock, QrCode } from 'lucide-react';

export const CustomerMenuView: React.FC = () => {
  const {
    restaurant,
    isRestaurantOpen,
    products,
    categories,
    offers,
    activeTable,
    hasValidTable,
    isTableInvalid,
    isRestaurantNotFound,
    restaurantErrorMessage,
    selectedProductForDetail,
    setSelectedProductForDetail,
    activeOrder,
    setIsOrderStatusOpen,
    lang,
    toastMessage,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterBadge, setActiveFilterBadge] = useState<FilterBadge>('all');

  // Filtered products logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category filter
      if (selectedCategoryId !== 'all' && product.categoryId !== selectedCategoryId) {
        return false;
      }

      // 2. Search query filter (matches English, French, or Arabic name/description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameEn = product.name.en?.toLowerCase() || '';
        const nameFr = product.name.fr?.toLowerCase() || '';
        const nameAr = product.name.ar || '';
        const descEn = product.description.en?.toLowerCase() || '';
        const descFr = product.description.fr?.toLowerCase() || '';
        const descAr = product.description.ar || '';

        const matches =
          nameEn.includes(query) ||
          nameFr.includes(query) ||
          nameAr.includes(query) ||
          descEn.includes(query) ||
          descFr.includes(query) ||
          descAr.includes(query);

        if (!matches) return false;
      }

      // 3. Badges filter
      if (activeFilterBadge === 'popular' && !product.isPopular) return false;
      if (activeFilterBadge === 'new' && !product.isNew) return false;
      if (activeFilterBadge === 'spicy' && !product.isSpicy) return false;
      if (activeFilterBadge === 'vegetarian' && !product.isVegetarian) return false;

      return true;
    });
  }, [products, selectedCategoryId, searchQuery, activeFilterBadge]);

  // In development only, log why each offer is hidden
  useEffect(() => {
    logHiddenOffersInDev(offers, products, categories, restaurant?.id);
  }, [offers, products, categories, restaurant?.id]);

  // Filter currently valid active promotions for customer view, strictly scoped to current restaurant
  const validActiveOffers = useMemo(() => {
    return offers.filter((o) => {
      if (restaurant?.id && o.restaurantId && o.restaurantId !== restaurant.id) return false;
      return isOfferCurrentlyValid(o);
    });
  }, [offers, restaurant?.id]);

  // Order-level offers show in the top carousel banner
  const orderBanners = useMemo(() => {
    return validActiveOffers.filter((o) => o.appliesTo === 'order');
  }, [validActiveOffers]);

  // Reopening info & closure message
  const reopenInfo = useMemo(() => {
    return getReopenFormatted(restaurant?.reopenAt, lang);
  }, [restaurant?.reopenAt, lang]);

  const closedNotice = useMemo(() => {
    return getRestaurantClosedMessage(restaurant, lang);
  }, [restaurant, lang]);

  // Group products by category when 'all' is selected and not searching
  const isBrowsingAll = selectedCategoryId === 'all' && !searchQuery.trim() && activeFilterBadge === 'all';

  return (
    <div className="min-h-screen bg-[#FAFAF7] dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-28 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-4 py-2.5 rounded-full bg-stone-900/90 dark:bg-white/90 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-md border border-white/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header />

      {/* Restaurant Not Found Error Screen */}
      {isRestaurantNotFound && (
        <div className="mx-4 mt-6 p-8 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-red-900 dark:text-red-100">
              {lang === 'ar' ? 'المطعم غير موجود أو غير متاح' : 'Restaurant Not Found'}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 max-w-sm mt-1.5 leading-relaxed">
              {restaurantErrorMessage || (lang === 'ar' ? 'يرجى مسح رمز QR من طاولتك أو التأكد من صحة الرابط.' : 'Please scan the QR code at your table or verify the URL.')}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="px-6 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            {lang === 'ar' ? 'العودة للصفحة الرئيسية' : 'Return to Menu'}
          </button>
        </div>
      )}

      {/* Friendly error banner when URL ?table= is invalid, inactive, or belongs to another restaurant */}
      {isTableInvalid && !isRestaurantNotFound && (
        <div className="mx-4 mt-4 p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start sm:items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-100">
              {t.tableInvalidTitle}
              {activeTable ? ` (${t.table} ${activeTable})` : ''}
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-1 leading-relaxed">
              {t.tableInvalidScanAgain}
            </p>
          </div>
        </div>
      )}

      {/* Browse-only notice banner when no table QR has been scanned */}
      {!hasValidTable && !isTableInvalid && !isRestaurantNotFound && (
        <div className="mx-4 mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center gap-3 text-xs shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs sm:text-sm">{t.scanQrToOrder}</p>
            <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">{t.scanQrBrowseHint}</p>
          </div>
        </div>
      )}

      {/* Prominent Restaurant Closed Banner */}
      {!isRestaurantOpen && (
        <div className="mx-4 mt-3.5 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg border border-red-400/30 overflow-hidden relative animate-in fade-in duration-300">
          <div className="flex items-start gap-3 sm:gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs text-[11px] font-black uppercase tracking-wider">
                  {lang === 'ar' ? 'المطعم مغلق حالياً' : lang === 'fr' ? 'Restaurant fermé' : 'Restaurant Currently Closed'}
                </span>
                {reopenInfo && !reopenInfo.isPassed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-xs text-[11px] font-bold font-mono">
                    {reopenInfo.badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white/95 leading-relaxed">
                {closedNotice}
              </p>
              {reopenInfo && !reopenInfo.isPassed && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-white/90 font-medium">
                  <Clock className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  <span>{reopenInfo.detailedText}</span>
                </div>
              )}
              <div className="mt-2.5 pt-2 border-t border-white/20 text-[11px] text-white/80 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  {lang === 'ar'
                    ? 'يمكنك تصفح قائمة الأطباق بحرية، وسيتاح إرسال الطلبات وطلب النادل فور إعادة الفتح.'
                    : lang === 'fr'
                    ? 'Vous pouvez consulter le menu librement. Les commandes seront possibles dès la réouverture.'
                    : 'You can browse dishes freely. Ordering and waiter service will resume upon reopening.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Order Banner (if placed order is active) */}
      {activeOrder && activeOrder.status !== 'served' && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-orange-500 text-white shadow-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-sm">
                {t.orderNumber} #{activeOrder.orderNumber} · {activeOrder.status.toUpperCase()}
              </p>
              <p className="text-[11px] opacity-90">{t.estWaitTime}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOrderStatusOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white text-orange-600 font-bold text-xs hover:bg-orange-50 active:scale-95 shadow-xs"
          >
            {t.viewOrderStatus}
          </button>
        </div>
      )}

      {/* Featured Promo Offers Carousel (order-level promotions) */}
      {orderBanners.length > 0 && !searchQuery && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {orderBanners.map((offer) => {
              const badgeText = offer.type === 'percentage' ? `-${offer.value}%` : `-${offer.value} DA`;
              const offerTitle = offer.title?.[lang] || offer.title?.en || '';
              const offerDesc = offer.description?.[lang] || offer.description?.en || '';

              return (
                <div
                  key={offer.id}
                  className="snap-start shrink-0 w-full sm:w-[calc(50%-6px)] p-4 rounded-2xl text-white shadow-xs relative overflow-hidden flex items-center justify-between gap-3 transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: offer.bannerColor || '#FF5A1F' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex flex-col items-center justify-center font-black text-xs shrink-0 font-mono">
                      <span>{badgeText}</span>
                      <span className="text-[9px] font-bold opacity-80 uppercase">DEAL</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-extrabold leading-tight line-clamp-1">
                          {offerTitle}
                        </h4>
                        {offer.startTime && offer.endTime && (
                          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                            {offer.startTime} - {offer.endTime}
                          </span>
                        )}
                      </div>
                      {offerDesc && (
                        <p className="text-[11px] text-white/90 line-clamp-1 mt-0.5">
                          {offerDesc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Categories & Search */}
      <div className="sticky top-0 z-30 shadow-xs">
        <CategoryTabs
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            if (searchQuery) setSearchQuery('');
          }}
        />
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilterBadge={activeFilterBadge}
          onFilterBadgeChange={setActiveFilterBadge}
        />
      </div>

      {/* Products Content Container */}
      <main className="max-w-6xl mx-auto px-4 pt-5">
        {/* Results Header when searching or filtering */}
        {(searchQuery || activeFilterBadge !== 'all') && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Showing {filteredProducts.length} dishes
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilterBadge('all');
              }}
              className="text-xs font-bold text-[#FF5A1F] hover:underline"
            >
              {t.clearSearch}
            </button>
          </div>
        )}

        {/* Empty State: No search results */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mb-3">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
              {t.noResultsTitle}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mt-1">
              {t.noResultsDesc}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilterBadge('all');
                setSelectedCategoryId('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-bold active:scale-95 transition-all"
            >
              {t.clearSearch}
            </button>
          </div>
        ) : isBrowsingAll ? (
          /* Browsing all: group by category sections */
          <div className="space-y-8">
            {categories.map((category) => {
              const catDishes = products.filter((p) => p.categoryId === category.id);
              if (catDishes.length === 0) return null;

              return (
                <section key={category.id} className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-2">
                    <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                      <span>{category.name[lang] || category.name.en}</span>
                      <span className="text-xs font-mono font-semibold text-stone-400">
                        ({catDishes.length})
                      </span>
                    </h2>
                    <button
                      onClick={() => setSelectedCategoryId(category.id)}
                      className="text-xs font-bold text-[#FF5A1F] hover:underline flex items-center gap-1"
                    >
                      <span>View All</span>
                      {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catDishes.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpenDetails={setSelectedProductForDetail}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          /* Single category or search results grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetails={setSelectedProductForDetail}
              />
            ))}
          </div>
        )}
      </main>

      {/* Rich Customer Menu Footer with social links, contacts, opening hours */}
      <Footer />

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
      />
      <CartDrawer />
      <FloatingCartBar />
      <OrderStatusModal />
    </div>
  );
};

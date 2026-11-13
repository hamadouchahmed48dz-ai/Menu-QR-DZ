import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { getBestDiscountForProduct } from '../../utils/promotions';
import { Plus, Award, Flame, Leaf, Sparkles, SlidersHorizontal, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { lang, addToCart, offers, isRestaurantOpen, hasValidTable } = useApp();
  const { t } = useTranslation(lang);

  const discountResult = getBestDiscountForProduct(product, offers);
  const hasDiscount = discountResult.discountAmount > 0;

  const hasOptions =
    (product.sizes && product.sizes.length > 0) ||
    (product.extras && product.extras.length > 0) ||
    (product.complements && product.complements.length > 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable || !hasValidTable) return;

    if (!isRestaurantOpen) {
      // Menu stays browsable: open details to inspect dish
      onOpenDetails(product);
      return;
    }

    if (hasOptions) {
      // If product has options/customization, open details
      onOpenDetails(product);
    } else {
      // Direct instant add to cart
      addToCart(product, 1);
    }
  };

  return (
    <div
      onClick={() => product.isAvailable && onOpenDetails(product)}
      className={`group relative flex flex-col justify-between bg-white dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 ${
        product.isAvailable
          ? 'cursor-pointer hover:-translate-y-0.5'
          : 'opacity-60 cursor-not-allowed filter grayscale-[25%]'
      }`}
    >
      {/* Product Image & Badges */}
      <div className="relative w-full aspect-[4/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
        <img
          src={product.image}
          alt={product.name[lang] || product.name.en}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Styled graceful CSS fallback
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Unavailable Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
            <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-950/80 border border-white/20">
              {t.unavailable}
            </span>
          </div>
        )}

        {/* Promotional Discount Badge (Top End) */}
        {hasDiscount && (
          <div className="absolute top-2.5 end-2.5 pointer-events-none z-10 animate-in fade-in zoom-in-95">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-black shadow-md font-mono tracking-tight"
              style={{ backgroundColor: discountResult.offer?.bannerColor || '#FF5A1F' }}
            >
              <Tag className="w-3 h-3" />
              <span>{discountResult.discountBadge}</span>
            </span>
          </div>
        )}

        {/* Dietary / Feature Badges */}
        <div className="absolute top-2.5 start-2.5 flex flex-wrap gap-1.5 pointer-events-none">
          {product.isPopular && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[11px] font-bold shadow-xs backdrop-blur-xs">
              <Award className="w-3 h-3" />
              <span>{t.popular}</span>
            </span>
          )}
          {product.isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/90 text-white text-[11px] font-bold shadow-xs backdrop-blur-xs">
              <Sparkles className="w-3 h-3" />
              <span>{t.new}</span>
            </span>
          )}
          {product.isSpicy && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/90 text-white text-[11px] font-bold shadow-xs backdrop-blur-xs">
              <Flame className="w-3 h-3" />
              <span>{t.spicy}</span>
            </span>
          )}
          {product.isVegetarian && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[11px] font-bold shadow-xs backdrop-blur-xs">
              <Leaf className="w-3 h-3" />
              <span>{t.vegetarian}</span>
            </span>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#FF5A1F] transition-colors line-clamp-1">
            {product.name[lang] || product.name.en}
          </h3>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
            {product.description[lang] || product.description.en}
          </p>
        </div>

        {/* Price & Add Action */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex flex-col">
            {hasDiscount ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-[#FF5A1F]">
                  {discountResult.discountedPrice}
                </span>
                <span className="text-xs font-bold text-[#FF5A1F]">
                  {t.currency}
                </span>
                <span className="line-through text-xs font-mono text-stone-500 dark:text-stone-300 font-normal ms-1">
                  {product.price}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-stone-900 dark:text-stone-50">
                  {product.price}
                </span>
                <span className="text-xs font-bold text-[#FF5A1F]">
                  {t.currency}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!product.isAvailable || !hasValidTable}
            onClick={handleQuickAdd}
            aria-label={!hasValidTable ? t.scanQrToOrder : !isRestaurantOpen ? 'Details' : hasOptions ? t.customize : t.add}
            className={`flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl font-bold text-xs transition-all ${
              !hasValidTable || !product.isAvailable
                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed opacity-70 border border-stone-200 dark:border-stone-700'
                : !isRestaurantOpen
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750 active:scale-95'
                : hasOptions
                ? 'bg-stone-100 dark:bg-stone-800 hover:bg-[#FF5A1F] hover:text-white text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 active:scale-95'
                : 'bg-[#FF5A1F] hover:bg-orange-600 text-white shadow-xs active:scale-95'
            }`}
            title={
              !hasValidTable
                ? t.scanQrToOrder
                : !isRestaurantOpen
                ? lang === 'ar'
                  ? 'المطعم مغلق حالياً - انقر لتصفح تفاصيل ومكونات الطبق'
                  : lang === 'fr'
                  ? 'Restaurant fermé - cliquer pour voir les détails'
                  : 'Restaurant closed - click to view dish details'
                : undefined
            }
          >
            {!isRestaurantOpen && hasValidTable ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تفاصيل' : lang === 'fr' ? 'Détails' : 'Details'}</span>
              </>
            ) : hasOptions ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.customize}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.add}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

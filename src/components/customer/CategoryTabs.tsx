import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Pizza, Sandwich, UtensilsCrossed, Drumstick, IceCream, CupSoda, Flame, Sparkles } from 'lucide-react';

interface CategoryTabsProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { categories, products, lang } = useApp();
  const { t, isRTL } = useTranslation(lang);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Icon map for category icons
  const renderIcon = (iconName: string) => {
    const props = { className: 'w-4 h-4 shrink-0' };
    switch (iconName.toLowerCase()) {
      case 'pizza':
        return <Pizza {...props} />;
      case 'sandwich':
      case 'burgers':
        return <Sandwich {...props} />;
      case 'tacos':
      case 'utensilscrossed':
        return <UtensilsCrossed {...props} />;
      case 'chicken':
      case 'drumstick':
        return <Drumstick {...props} />;
      case 'desserts':
      case 'icecream':
        return <IceCream {...props} />;
      case 'drinks':
      case 'cupsoda':
        return <CupSoda {...props} />;
      default:
        return <Sparkles {...props} />;
    }
  };

  // Auto scroll active item into view
  useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedCategoryId]);

  return (
    <div className="w-full bg-[#FAFAF7]/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 sticky top-0 z-20 transition-colors">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {/* "All" button */}
        <button
          data-active={selectedCategoryId === 'all'}
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 min-h-[44px] ${
            selectedCategoryId === 'all'
              ? 'bg-[#FF5A1F] text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span>{t.allCategories}</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
              selectedCategoryId === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
            }`}
          >
            {products.length}
          </span>
        </button>

        {/* Categories */}
        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          const isActive = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              data-active={isActive}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 min-h-[44px] ${
                isActive
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-[#FF5A1F]'}>{renderIcon(cat.icon)}</span>
              <span>{cat.name[lang] || cat.name.en}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

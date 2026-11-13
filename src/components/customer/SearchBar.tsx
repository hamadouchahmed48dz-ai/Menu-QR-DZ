import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Search, X, Sparkles, Flame, Leaf, Award } from 'lucide-react';

export type FilterBadge = 'all' | 'popular' | 'spicy' | 'vegetarian' | 'new';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilterBadge: FilterBadge;
  onFilterBadgeChange: (badge: FilterBadge) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilterBadge,
  onFilterBadgeChange,
}) => {
  const { lang } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const filterBadges: { id: FilterBadge; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.allCategories, icon: null },
    { id: 'popular', label: t.popular, icon: <Award className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'spicy', label: t.spicy, icon: <Flame className="w-3.5 h-3.5 text-red-500" /> },
    { id: 'vegetarian', label: t.vegetarian, icon: <Leaf className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'new', label: t.new, icon: <Sparkles className="w-3.5 h-3.5 text-sky-500" /> },
  ];

  return (
    <div className="w-full px-4 pt-3 pb-2 bg-[#FAFAF7] dark:bg-stone-900 border-b border-stone-200/50 dark:border-stone-800 transition-colors">
      {/* Search Input Box */}
      <div className="relative flex items-center w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-stone-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full h-11 ps-10 pe-10 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm rounded-xl border border-stone-200/80 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] focus:border-transparent transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 end-0 flex items-center pe-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            aria-label={t.clearSearch}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Badges Filter Bar */}
      <div className="flex items-center gap-1.5 pt-2.5 pb-1 overflow-x-auto no-scrollbar">
        {filterBadges.map((badge) => {
          const isActive = activeFilterBadge === badge.id;
          return (
            <button
              key={badge.id}
              onClick={() => onFilterBadgeChange(badge.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200/70 dark:border-stone-700'
              }`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Category } from '../../types';
import {
  Check,
  ChevronsUpDown,
  Plus,
  Loader2,
  Sparkles,
  Tag,
  X,
  AlertCircle,
} from 'lucide-react';

export interface CategoryComboboxProps {
  value: string;
  onChange: (categoryId: string) => void;
  error?: string | null;
  onClearError?: () => void;
  disabled?: boolean;
}

// Case-insensitive, diacritics/accents stripped, Arabic variants normalized
export const normalizeCategoryText = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Latin diacritics / accents
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel / harakat
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
};

interface CategoryPreset {
  en: string;
  fr: string;
  ar: string;
}

const STARTER_SUGGESTIONS: CategoryPreset[] = [
  { en: 'Pizza', fr: 'Pizzas', ar: 'بيتزا' },
  { en: 'Burgers', fr: 'Burgers', ar: 'برغر' },
  { en: 'Tacos', fr: 'Tacos', ar: 'تاكوس' },
  { en: 'Sandwiches', fr: 'Sandwichs', ar: 'سندويشات' },
  { en: 'Salads', fr: 'Salades', ar: 'سلطات' },
  { en: 'Desserts', fr: 'Desserts', ar: 'حلويات' },
  { en: 'Drinks', fr: 'Boissons', ar: 'مشروبات باردة' },
  { en: 'Hot Drinks', fr: 'Boissons chaudes', ar: 'مشروبات ساخنة' },
];

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  value,
  onChange,
  error,
  onClearError,
  disabled = false,
}) => {
  const { categories, addCategory, lang, showToast } = useApp();
  const { isRTL } = useTranslation(lang);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected category record
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === value) || null;
  }, [categories, value]);

  // Current language label getter
  const getCategoryLabel = (c: Category): string => {
    if (lang === 'ar') return c.name.ar || c.name.fr || c.name.en;
    if (lang === 'fr') return c.name.fr || c.name.en || c.name.ar;
    return c.name.en || c.name.fr || c.name.ar;
  };

  const selectedLabel = selectedCategory ? getCategoryLabel(selectedCategory) : '';

  // Synchronize input query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedLabel);
    }
  }, [isOpen, selectedLabel]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const normQuery = normalizeCategoryText(query);
    return categories.filter((c) => {
      const enMatch = normalizeCategoryText(c.name.en).includes(normQuery);
      const frMatch = normalizeCategoryText(c.name.fr).includes(normQuery);
      const arMatch = normalizeCategoryText(c.name.ar).includes(normQuery);
      return enMatch || frMatch || arMatch;
    });
  }, [categories, query]);

  // Check if query exactly matches an existing category
  const exactMatchCategory = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const normQuery = normalizeCategoryText(trimmed);
    return categories.find((c) => {
      return (
        normalizeCategoryText(c.name.en) === normQuery ||
        normalizeCategoryText(c.name.fr) === normQuery ||
        normalizeCategoryText(c.name.ar) === normQuery
      );
    }) || null;
  }, [categories, query]);

  // Validation: query is valid for creation
  const trimmedQuery = query.trim();
  const isValidLength = trimmedQuery.length > 0 && trimmedQuery.length <= 40;
  // Reject empty names and names made only of symbols
  const hasValidChars = /[\p{L}\p{N}]/u.test(trimmedQuery);
  const canShowAddOption = trimmedQuery.length > 0 && !exactMatchCategory && hasValidChars && isValidLength;

  // Total selectable items (filtered categories + optionally "+ Add")
  const totalItems = filteredCategories.length + (canShowAddOption ? 1 : 0);

  // Keep highlighted index in bounds
  useEffect(() => {
    if (highlightedIndex >= totalItems) {
      setHighlightedIndex(Math.max(0, totalItems - 1));
    }
  }, [totalItems, highlightedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Select an existing category
  const handleSelectCategory = (cat: Category) => {
    onChange(cat.id);
    onClearError?.();
    setQuery(getCategoryLabel(cat));
    setIsOpen(false);
  };

  // Create a new category from typed text
  const handleCreateCategory = async (nameToCreate: string) => {
    const cleanName = nameToCreate.trim().slice(0, 40);
    if (!cleanName) return;

    if (!/[\p{L}\p{N}]/u.test(cleanName)) {
      showToast(
        lang === 'ar'
          ? 'يرجى إدخال اسم تصنيف صالح يحتوي على أحرف أو أرقام'
          : lang === 'fr'
          ? 'Veuillez saisir un nom de catégorie valide'
          : 'Please enter a valid category name with letters or numbers'
      );
      return;
    }

    // Duplicate check: if exists, just select it
    const norm = normalizeCategoryText(cleanName);
    const existing = categories.find((c) => {
      return (
        normalizeCategoryText(c.name.en) === norm ||
        normalizeCategoryText(c.name.fr) === norm ||
        normalizeCategoryText(c.name.ar) === norm
      );
    });

    if (existing) {
      handleSelectCategory(existing);
      return;
    }

    setIsCreating(true);
    try {
      const nextOrder = categories.length + 1;
      const newCat = await addCategory({
        name: {
          en: cleanName,
          fr: cleanName,
          ar: cleanName,
        },
        order: nextOrder,
        icon: 'Utensils',
      });

      if (newCat) {
        onChange(newCat.id);
        onClearError?.();
        setQuery(getCategoryLabel(newCat));
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to create category:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Create from preset suggestion
  const handleSelectPreset = async (preset: CategoryPreset) => {
    // Check if preset already exists
    const normEn = normalizeCategoryText(preset.en);
    const normFr = normalizeCategoryText(preset.fr);
    const normAr = normalizeCategoryText(preset.ar);

    const existing = categories.find((c) => {
      return (
        normalizeCategoryText(c.name.en) === normEn ||
        normalizeCategoryText(c.name.fr) === normFr ||
        normalizeCategoryText(c.name.ar) === normAr
      );
    });

    if (existing) {
      handleSelectCategory(existing);
      return;
    }

    setIsCreating(true);
    try {
      const nextOrder = categories.length + 1;
      const newCat = await addCategory({
        name: {
          en: preset.en,
          fr: preset.fr,
          ar: preset.ar,
        },
        order: nextOrder,
        icon: 'Utensils',
      });

      if (newCat) {
        onChange(newCat.id);
        onClearError?.();
        setQuery(getCategoryLabel(newCat));
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to create suggestion category:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Keyboard navigation inside combobox input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isCreating) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, totalItems - 1)));
        break;

      case 'Enter':
        e.preventDefault();
        if (totalItems === 0) {
          if (canShowAddOption) {
            handleCreateCategory(trimmedQuery);
          }
          return;
        }

        if (highlightedIndex < filteredCategories.length) {
          handleSelectCategory(filteredCategories[highlightedIndex]);
        } else if (canShowAddOption) {
          handleCreateCategory(trimmedQuery);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery(selectedLabel);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox Input Box */}
      <div
        className={`relative flex items-center w-full h-10 rounded-xl border bg-stone-50 dark:bg-stone-850 transition-all ${
          error
            ? 'border-red-500 ring-2 ring-red-500/20'
            : isOpen
            ? 'border-[#FF5A1F] ring-2 ring-orange-500/20'
            : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <div className="ps-3 pe-2 text-stone-400 shrink-0 pointer-events-none">
          <Tag className="w-4 h-4 text-[#FF5A1F]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled || isCreating}
          value={query}
          placeholder={
            lang === 'ar'
              ? 'اختر أو اكتب تصنيفاً جديداً...'
              : lang === 'fr'
              ? 'Sélectionnez ou créez une catégorie...'
              : 'Select or type a new category...'
          }
          dir={isRTL ? 'rtl' : 'ltr'}
          maxLength={40}
          onChange={(e) => {
            setQuery(e.target.value);
            onClearError?.();
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 h-full bg-transparent text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none min-w-0"
        />

        {/* Clear / Status / Chevron Actions */}
        <div className="flex items-center gap-1 pe-2 shrink-0">
          {isCreating ? (
            <Loader2 className="w-4 h-4 text-[#FF5A1F] animate-spin" />
          ) : query && query !== selectedLabel ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setHighlightedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-stone-400 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-750 transition-colors"
              title="Clear text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-stone-400 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 transition-colors"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error text under input */}
      {error && (
        <p className="mt-1 text-[11px] font-semibold text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="absolute z-50 mt-1.5 w-full bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Case A: Restaurant has NO categories yet -> Show Starter Suggestions */}
          {categories.length === 0 && !trimmedQuery ? (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {lang === 'ar'
                    ? 'اقتراحات لبدء القائمة (اضغط للإضافة مباشرة):'
                    : lang === 'fr'
                    ? 'Suggestions pour démarrer (cliquez pour créer) :'
                    : 'Suggestions to get started (click to create):'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {STARTER_SUGGESTIONS.map((preset) => {
                  const label = lang === 'ar' ? preset.ar : lang === 'fr' ? preset.fr : preset.en;
                  return (
                    <button
                      key={preset.en}
                      type="button"
                      disabled={isCreating}
                      onClick={() => handleSelectPreset(preset)}
                      className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-[#FF5A1F] border border-orange-200 dark:border-orange-800/60 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-300">
                {lang === 'ar'
                  ? 'أو اكتب أي اسم تصنيف مخصص في الحقل أعلاه.'
                  : lang === 'fr'
                  ? 'Ou saisissez un nom personnalisé dans le champ ci-dessus.'
                  : 'Or type any custom category name in the field above.'}
              </div>
            </div>
          ) : (
            /* Case B: Standard Category List with filtering & "+ Add" */
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-stone-100 dark:divide-stone-800/60"
            >
              {filteredCategories.length > 0 ? (
                filteredCategories.map((c, index) => {
                  const isSelected = c.id === value;
                  const isHighlighted = index === highlightedIndex;
                  const label = getCategoryLabel(c);

                  return (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectCategory(c)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-[#FF5A1F]'
                          : isSelected
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 font-bold'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold truncate">{label}</span>
                        {/* Secondary language badge if available and different */}
                        {lang !== 'en' && c.name.en && c.name.en !== label && (
                          <span className="text-[10px] text-stone-500 dark:text-stone-300 font-mono hidden sm:inline truncate">
                            ({c.name.en})
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                      )}
                    </li>
                  );
                })
              ) : !canShowAddOption ? (
                <li className="px-3 py-4 text-center text-stone-500 dark:text-stone-300 text-xs">
                  {lang === 'ar'
                    ? 'لم يتم العثور على تصنيفات مطابقة'
                    : lang === 'fr'
                    ? 'Aucune catégorie correspondante'
                    : 'No matching categories'}
                </li>
              ) : null}

              {/* "+ Add <typed text>" Option */}
              {canShowAddOption && (
                <li
                  role="option"
                  aria-selected={false}
                  onClick={() => handleCreateCategory(trimmedQuery)}
                  onMouseEnter={() => setHighlightedIndex(filteredCategories.length)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    highlightedIndex === filteredCategories.length
                      ? 'bg-[#FF5A1F] text-white font-bold'
                      : 'bg-orange-500/10 text-[#FF5A1F] hover:bg-orange-500/20 font-bold'
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  <span className="truncate">
                    {lang === 'ar'
                      ? `+ إضافة "${trimmedQuery}"`
                      : lang === 'fr'
                      ? `+ Ajouter "${trimmedQuery}"`
                      : `+ Add "${trimmedQuery}"`}
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

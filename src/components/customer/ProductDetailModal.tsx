import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  DishSize,
  DishExtra,
  DishComplementGroup,
  DishComplementItem,
  SelectedComplement,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { getBestDiscountForProduct } from '../../utils/promotions';
import {
  X,
  Plus,
  Minus,
  Check,
  Award,
  Flame,
  Leaf,
  Sparkles,
  MessageSquare,
  Tag,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { lang, addToCart, offers, isRestaurantOpen, hasValidTable, isTableInvalid } = useApp();
  const { t, isRTL } = useTranslation(lang);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<DishSize | undefined>(undefined);
  const [selectedExtras, setSelectedExtras] = useState<DishExtra[]>([]);
  const [selectedComplementsMap, setSelectedComplementsMap] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Name resolution helpers with current language fallbacks
  const getSizeName = (s: DishSize): string =>
    (lang === 'ar' ? s.name_ar : lang === 'fr' ? s.name_fr : s.name_en) ||
    s.name_fr ||
    s.name_en ||
    s.name_ar ||
    (s.name ? s.name[lang] || s.name.en : '') ||
    '';

  const getExtraName = (e: DishExtra): string =>
    (lang === 'ar' ? e.name_ar : lang === 'fr' ? e.name_fr : e.name_en) ||
    e.name_fr ||
    e.name_en ||
    e.name_ar ||
    (e.name ? e.name[lang] || e.name.en : '') ||
    '';

  const getGroupTitle = (g: DishComplementGroup): string =>
    (lang === 'ar' ? g.title_ar : lang === 'fr' ? g.title_fr : g.title_en) ||
    g.title_fr ||
    g.title_en ||
    g.title_ar;

  const getItemName = (it: DishComplementItem): string =>
    (lang === 'ar' ? it.name_ar : lang === 'fr' ? it.name_fr : it.name_en) ||
    it.name_fr ||
    it.name_en ||
    it.name_ar;

  // Reset internal state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      // Preselect default size
      const defaultSize =
        (product.sizes || []).find((s) => s.is_default) || product.sizes?.[0];
      setSelectedSize(defaultSize);
      setSelectedExtras([]);

      // Initialize complements preselection
      const initialMap: Record<string, string[]> = {};
      if (product.complements && product.complements.length > 0) {
        for (const group of product.complements) {
          if (group.required && group.selection === 'single') {
            const firstAvail = group.items.find((item) => item.available !== false);
            if (firstAvail) {
              initialMap[group.id] = [firstAvail.id];
            }
          }
        }
      }
      setSelectedComplementsMap(initialMap);
      setNotes('');
      setValidationError(null);
    }
  }, [product]);

  if (!product) return null;

  const discountResult = getBestDiscountForProduct(product, offers);
  const hasDiscount = discountResult.discountAmount > 0;

  // 1. Base dish price from selected size (or dish base price if sizes array is empty)
  const basePrice = selectedSize ? Number(selectedSize.price) : Number(product.price);

  // 2. Extras price
  const extrasPrice = selectedExtras.reduce((acc, curr) => acc + Number(curr.price), 0);

  // 3. Complements price from selected items
  let complementsPrice = 0;
  if (product.complements && product.complements.length > 0) {
    for (const group of product.complements) {
      const chosenIds = selectedComplementsMap[group.id] || [];
      for (const itemId of chosenIds) {
        const item = group.items.find((it) => it.id === itemId);
        if (item) {
          complementsPrice += Number(item.price || 0);
        }
      }
    }
  }

  const baseUnitPrice = basePrice + extrasPrice + complementsPrice;
  const unitPrice = Math.max(0, baseUnitPrice - discountResult.discountAmount);

  const baseTotalPrice = baseUnitPrice * quantity;
  const totalPrice = unitPrice * quantity;

  // Toggle Extra
  const toggleExtra = (extra: DishExtra) => {
    if (extra.available === false) return;
    setValidationError(null);
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  // Toggle Complement Single
  const toggleComplementSingle = (groupId: string, itemId: string, isRequired: boolean) => {
    setValidationError(null);
    setSelectedComplementsMap((prev) => {
      const current = prev[groupId] || [];
      const isAlreadySelected = current.includes(itemId);
      if (isAlreadySelected) {
        // If not required, diner can unselect
        if (!isRequired) {
          return { ...prev, [groupId]: [] };
        }
        return prev;
      }
      return { ...prev, [groupId]: [itemId] };
    });
  };

  // Toggle Complement Multiple
  const toggleComplementMultiple = (
    groupId: string,
    itemId: string,
    max: number
  ) => {
    setValidationError(null);
    setSelectedComplementsMap((prev) => {
      const current = prev[groupId] || [];
      const isAlreadySelected = current.includes(itemId);
      if (isAlreadySelected) {
        return { ...prev, [groupId]: current.filter((id) => id !== itemId) };
      }
      // Check maximum limit
      if (max > 0 && current.length >= max) {
        return prev; // At limit
      }
      return { ...prev, [groupId]: [...current, itemId] };
    });
  };

  const handleAddToCart = () => {
    setValidationError(null);

    // Validate required size
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى اختيار حجم للطبق'
          : lang === 'fr'
          ? 'Veuillez choisir une taille pour ce plat'
          : 'Please select a size for this dish'
      );
      return;
    }

    // Validate complement groups (required, min, max)
    if (product.complements && product.complements.length > 0) {
      for (const group of product.complements) {
        const title = getGroupTitle(group);
        const chosen = selectedComplementsMap[group.id] || [];

        if (group.required && chosen.length === 0) {
          setValidationError(
            lang === 'ar'
              ? `يرجى تحديد اختيارك لمجموعة "${title}" (إجباري)`
              : lang === 'fr'
              ? `Veuillez faire un choix pour "${title}" (obligatoire)`
              : `Please make a selection for "${title}" (required)`
          );
          return;
        }

        if (group.selection === 'multiple') {
          if (group.min > 0 && chosen.length < group.min) {
            setValidationError(
              lang === 'ar'
                ? `يرجى اختيار ${group.min} عناصر على الأقل لمجموعة "${title}"`
                : lang === 'fr'
                ? `Veuillez sélectionner au moins ${group.min} option(s) pour "${title}"`
                : `Please select at least ${group.min} option(s) for "${title}"`
            );
            return;
          }
          if (group.max > 0 && chosen.length > group.max) {
            setValidationError(
              lang === 'ar'
                ? `يمكنك اختيار حتى ${group.max} عناصر فقط لمجموعة "${title}"`
                : lang === 'fr'
                ? `Vous pouvez choisir jusqu'à ${group.max} option(s) pour "${title}"`
                : `You can choose at most ${group.max} option(s) for "${title}"`
            );
            return;
          }
        }
      }
    }

    // Flatten selected complements into structured list
    const flatComplements: SelectedComplement[] = [];
    if (product.complements && product.complements.length > 0) {
      for (const [groupId, itemIds] of Object.entries(selectedComplementsMap)) {
        const group = product.complements.find((g) => g.id === groupId);
        if (!group) continue;
        for (const itemId of itemIds) {
          const item = group.items.find((it) => it.id === itemId);
          if (!item) continue;
          flatComplements.push({
            groupId,
            groupTitle: {
              en: group.title_en || group.title_fr || group.title_ar,
              fr: group.title_fr || group.title_en || group.title_ar,
              ar: group.title_ar || group.title_en || group.title_fr,
            },
            itemId,
            name: {
              en: item.name_en || item.name_fr || item.name_ar,
              fr: item.name_fr || item.name_en || item.name_ar,
              ar: item.name_ar || item.name_en || item.name_fr,
            },
            price: Number(item.price || 0),
          });
        }
      }
    }

    if (!isRestaurantOpen || !hasValidTable) return;

    addToCart(product, quantity, selectedSize, selectedExtras, flatComplements, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-stone-200 dark:border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 z-20 w-9 h-9 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
          aria-label={t.cancel}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Header Food Image */}
          <div className="relative w-full h-52 sm:h-60 bg-stone-100 dark:bg-stone-800">
            <img
              src={product.image}
              alt={product.name[lang] || product.name.en}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Badges in image */}
            <div className="absolute bottom-3 start-4 flex flex-wrap gap-1.5">
              {product.isPopular && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-xs font-bold shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                  <span>{t.popular}</span>
                </span>
              )}
              {product.isNew && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-500 text-white text-xs font-bold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.new}</span>
                </span>
              )}
              {product.isSpicy && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-500 text-white text-xs font-bold shadow-xs">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{t.spicy}</span>
                </span>
              )}
              {product.isVegetarian && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold shadow-xs">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>{t.vegetarian}</span>
                </span>
              )}
              {hasDiscount && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-white text-xs font-black shadow-md font-mono"
                  style={{ backgroundColor: discountResult.offer?.bannerColor || '#FF5A1F' }}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{discountResult.discountBadge}</span>
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="p-5 sm:p-6 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 leading-tight">
                  {product.name[lang] || product.name.en}
                </h2>
                <div className="text-end shrink-0">
                  {hasDiscount ? (
                    <div>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#FF5A1F]">
                          {unitPrice}
                        </span>
                        <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{t.currency}</span>
                      </div>
                      <span className="line-through text-xs font-mono text-stone-500 dark:text-stone-300">
                        {baseUnitPrice} {t.currency}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#FF5A1F]">
                        {unitPrice}
                      </span>
                      <span className="ms-1 text-xs font-bold text-stone-600 dark:text-stone-300">{t.currency}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {product.description[lang] || product.description.en}
              </p>
            </div>

            {/* Validation Banner if user forgot required option */}
            {validationError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-bold">{validationError}</span>
              </div>
            )}

            {/* 1. SIZE OPTIONS (Chips with prices, default preselected) */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {lang === 'ar' ? 'اختر الحجم' : lang === 'fr' ? 'Choisissez la taille' : 'Select Size'}
                  </label>
                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                    {lang === 'ar' ? 'إجباري' : lang === 'fr' ? 'Obligatoire' : 'Required'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize?.id === size.id;
                    const sizeLabel = getSizeName(size);
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          setSelectedSize(size);
                        }}
                        className={`flex flex-col items-start justify-between p-3 rounded-2xl border text-xs font-semibold transition-all min-h-[58px] ${
                          isSelected
                            ? 'border-[#FF5A1F] bg-orange-50/70 dark:bg-orange-950/30 text-stone-900 dark:text-stone-100 ring-2 ring-orange-500/25 shadow-xs'
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm truncate">{sizeLabel}</span>
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" />
                          )}
                        </div>
                        <span className="font-mono tabular-nums text-[#FF5A1F] text-xs font-extrabold mt-1">
                          {size.price} {t.currency}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. EXTRAS (Checkboxes with prices, unavailable items hidden/disabled) */}
            {product.extras && product.extras.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'الإضافات' : lang === 'fr' ? 'Suppléments' : 'Extras / Add-ons'}
                  </label>
                  <span className="text-[11px] text-stone-500 dark:text-stone-300 font-semibold">
                    {lang === 'ar' ? 'اختياري' : lang === 'fr' ? 'Optionnel' : 'Optional'}
                  </span>
                </div>
                <div className="space-y-2">
                  {product.extras.map((extra) => {
                    const isChecked = selectedExtras.some((e) => e.id === extra.id);
                    const isAvailable = extra.available !== false;
                    const extraLabel = getExtraName(extra);

                    return (
                      <div
                        key={extra.id}
                        onClick={() => isAvailable && toggleExtra(extra)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[46px] select-none ${
                          !isAvailable
                            ? 'opacity-40 cursor-not-allowed bg-stone-100 dark:bg-stone-850 border-stone-200 dark:border-stone-800'
                            : isChecked
                            ? 'border-[#FF5A1F] bg-orange-50/50 dark:bg-orange-950/20 text-stone-900 dark:text-stone-100 cursor-pointer shadow-xs'
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-stone-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                              !isAvailable
                                ? 'border-stone-300 bg-stone-200'
                                : isChecked
                                ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-semibold">{extraLabel}</span>
                            {!isAvailable && (
                              <span className="ms-2 text-[10px] text-stone-500 dark:text-stone-300 font-bold">
                                ({lang === 'ar' ? 'غير متوفر' : 'Épuisé'})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-black text-[#FF5A1F]">
                          +{extra.price} {t.currency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. COMPLEMENT GROUPS (Sides and drinks, single/multiple, required/optional, min/max) */}
            {product.complements && product.complements.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                {product.complements.map((group) => {
                  const title = getGroupTitle(group);
                  const chosenIds = selectedComplementsMap[group.id] || [];
                  const isSingle = group.selection === 'single';

                  return (
                    <div
                      key={group.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-800 space-y-3"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <span>{title}</span>
                          </h4>
                          <p className="text-[10px] text-stone-500 dark:text-stone-300 mt-0.5">
                            {isSingle
                              ? lang === 'ar'
                                ? 'اختر عنصراً واحداً'
                                : 'Choisissez 1 option'
                              : group.max > 0
                              ? lang === 'ar'
                                ? `اختر حتى ${group.max} عناصر`
                                : `Jusqu'à ${group.max} choix`
                              : lang === 'ar'
                              ? 'اختيار متعدد'
                              : 'Choix multiple'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {group.required ? (
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-bold">
                              {lang === 'ar' ? 'إجباري' : lang === 'fr' ? 'Obligatoire' : 'Required'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-[10px] font-semibold">
                              {lang === 'ar' ? 'اختياري' : lang === 'fr' ? 'Optionnel' : 'Optional'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Group Items List */}
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isSelected = chosenIds.includes(item.id);
                          const isAvailable = item.available !== false;
                          const itemName = getItemName(item);

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (!isAvailable) return;
                                if (isSingle) {
                                  toggleComplementSingle(group.id, item.id, group.required);
                                } else {
                                  toggleComplementMultiple(group.id, item.id, group.max || 0);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-xs transition-all select-none ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-stone-100 dark:bg-stone-850 border-stone-200 dark:border-stone-750'
                                  : isSelected
                                  ? 'border-[#FF5A1F] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 ring-1 ring-orange-500/20 shadow-xs cursor-pointer'
                                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-stone-300 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {isSingle ? (
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                      isSelected
                                        ? 'border-[#FF5A1F] bg-[#FF5A1F] text-white'
                                        : 'border-stone-300 dark:border-stone-600'
                                    }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                ) : (
                                  <div
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                                      isSelected
                                        ? 'border-[#FF5A1F] bg-[#FF5A1F] text-white'
                                        : 'border-stone-300 dark:border-stone-600'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                )}

                                <span className="font-semibold text-xs sm:text-sm">{itemName}</span>
                                {!isAvailable && (
                                  <span className="text-[10px] text-stone-500 dark:text-stone-300">
                                    ({lang === 'ar' ? 'غير متوفر' : 'Épuisé'})
                                  </span>
                                )}
                              </div>

                              <span className="font-mono tabular-nums text-xs font-bold text-stone-700 dark:text-stone-300">
                                {item.price > 0 ? (
                                  <span className="text-[#FF5A1F]">+{item.price} {t.currency}</span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {lang === 'ar' ? 'مشمول' : lang === 'fr' ? 'Inclus' : 'Included'}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Special Instructions Notes Field */}
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t.specialInstructions}</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.instructionsPlaceholder}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-1 shadow-xs shrink-0">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-mono tabular-nums font-bold text-sm text-stone-900 dark:text-stone-100">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 active:scale-95 transition-all"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to Cart Submit CTA / Disabled state */}
            <button
              type="button"
              disabled={!isRestaurantOpen || !hasValidTable}
              onClick={handleAddToCart}
              className={`flex-1 h-12 flex items-center justify-between px-5 rounded-xl font-bold text-sm sm:text-base transition-all ${
                isRestaurantOpen && hasValidTable
                  ? 'bg-[#FF5A1F] hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 active:scale-98 cursor-pointer'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed border border-stone-300 dark:border-stone-700'
              }`}
              title={
                !isRestaurantOpen
                  ? lang === 'ar'
                    ? 'المطعم مغلق حالياً - لا يمكن إضافة طلبات'
                    : lang === 'fr'
                    ? 'Restaurant actuellement fermé - commandes suspendues'
                    : 'Restaurant currently closed - ordering unavailable'
                  : !hasValidTable
                  ? isTableInvalid
                    ? t.tableInvalidScanAgain
                    : t.scanQrToOrder
                  : undefined
              }
            >
              <span>
                {!isRestaurantOpen
                  ? lang === 'ar'
                    ? 'المطعم مغلق حالياً'
                    : lang === 'fr'
                    ? 'Restaurant fermé'
                    : 'Restaurant Closed'
                  : t.addToCart}
              </span>
              <div
                className={`flex items-center gap-1.5 font-mono tabular-nums text-sm font-extrabold px-2 py-0.5 rounded-md ${
                  isRestaurantOpen && hasValidTable
                    ? 'bg-white/20'
                    : 'bg-stone-300/60 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300'
                }`}
              >
                {hasDiscount && (
                  <span className="line-through text-xs font-normal opacity-75">
                    {baseTotalPrice}
                  </span>
                )}
                <span>
                  {totalPrice} {t.currency}
                </span>
              </div>
            </button>
          </div>
          {!isRestaurantOpen ? (
            <p className="mt-2 text-center text-[11px] text-red-600 dark:text-red-400 font-semibold">
              {lang === 'ar'
                ? 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات الجديدة.'
                : lang === 'fr'
                ? 'Le restaurant est actuellement fermé. Les commandes ne sont pas acceptées.'
                : 'The restaurant is currently closed. Orders cannot be accepted.'}
            </p>
          ) : !hasValidTable ? (
            <p className="mt-2 text-center text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              {isTableInvalid ? t.tableInvalidScanAgain : t.scanQrToOrder}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

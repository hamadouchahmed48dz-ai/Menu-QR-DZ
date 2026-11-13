import React, { useState } from 'react';
import {
  DishSize,
  DishExtra,
  DishComplementGroup,
  DishComplementItem,
  Language,
} from '../../types';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Layers,
  Sparkles,
  UtensilsCrossed,
  HelpCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DishOptionsEditorProps {
  sizes: DishSize[];
  setSizes: React.Dispatch<React.SetStateAction<DishSize[]>>;
  extras: DishExtra[];
  setExtras: React.Dispatch<React.SetStateAction<DishExtra[]>>;
  complements: DishComplementGroup[];
  setComplements: React.Dispatch<React.SetStateAction<DishComplementGroup[]>>;
  lang: Language;
  confirmAction: (options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
  }) => Promise<boolean>;
  basePrice: number;
}

function normalizeName(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Validates sizes, extras and complements according to strict business rules:
 * - name required in at least one language
 * - price numeric and >= 0
 * - no duplicate names in the same list
 * - exactly one default size if sizes are defined
 * - min <= max for complement groups
 * - required complement groups need at least one available item
 */
export function validateDishOptions(
  sizes: DishSize[],
  extras: DishExtra[],
  complements: DishComplementGroup[],
  lang: Language
): { isValid: boolean; error: string | null } {
  // 1. Validate Sizes
  if (sizes.length > 0) {
    let defaultCount = 0;
    const seenNames = new Set<string>();

    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      const hasName = Boolean(s.name_ar?.trim() || s.name_fr?.trim() || s.name_en?.trim());
      if (!hasName) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `يرجى إدخال اسم للحجم رقم ${i + 1}`
              : lang === 'fr'
              ? `Veuillez saisir un nom pour la taille n°${i + 1}`
              : `Please enter a name for size #${i + 1}`,
        };
      }

      if (typeof s.price !== 'number' || isNaN(s.price) || s.price < 0) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? 'سعر الحجم يجب أن يكون رقماً غير سالب'
              : lang === 'fr'
              ? 'Le prix de chaque taille doit être un nombre positif ou nul'
              : 'Size price must be non-negative',
        };
      }

      const primaryName = normalizeName(s.name_fr || s.name_en || s.name_ar || '');
      if (seenNames.has(primaryName)) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `اسم الحجم "${primaryName}" مكرر في القائمة`
              : lang === 'fr'
              ? `Le nom de taille "${primaryName}" est dupliqué`
              : `Duplicate size name: "${primaryName}"`,
        };
      }
      seenNames.add(primaryName);

      if (s.is_default) {
        defaultCount++;
      }
    }

    if (defaultCount !== 1) {
      return {
        isValid: false,
        error:
          lang === 'ar'
            ? 'يرجى تحديد حجم افتراضي واحد بالضبط للطبق'
            : lang === 'fr'
            ? 'Veuillez définir exactement une taille par défaut'
            : 'Please set exactly one size as the default size',
      };
    }
  }

  // 2. Validate Extras
  if (extras.length > 0) {
    const seenNames = new Set<string>();

    for (let i = 0; i < extras.length; i++) {
      const e = extras[i];
      const hasName = Boolean(e.name_ar?.trim() || e.name_fr?.trim() || e.name_en?.trim());
      if (!hasName) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `يرجى إدخال اسم للإضافة رقم ${i + 1}`
              : lang === 'fr'
              ? `Veuillez saisir un nom pour le supplément n°${i + 1}`
              : `Please enter a name for extra #${i + 1}`,
        };
      }

      if (typeof e.price !== 'number' || isNaN(e.price) || e.price < 0) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? 'سعر الإضافة يجب أن يكون رقماً غير سالب'
              : lang === 'fr'
              ? 'Le prix du supplément doit être un nombre positif ou nul'
              : 'Extra price must be non-negative',
        };
      }

      const primaryName = normalizeName(e.name_fr || e.name_en || e.name_ar || '');
      if (seenNames.has(primaryName)) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `اسم الإضافة "${primaryName}" مكرر`
              : lang === 'fr'
              ? `Le supplément "${primaryName}" est dupliqué`
              : `Duplicate extra name: "${primaryName}"`,
        };
      }
      seenNames.add(primaryName);
    }
  }

  // 3. Validate Complements
  if (complements.length > 0) {
    for (let i = 0; i < complements.length; i++) {
      const g = complements[i];
      const groupTitle = g.title_fr?.trim() || g.title_en?.trim() || g.title_ar?.trim();
      if (!groupTitle) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `يرجى إدخال عنوان لمجموعة المكملات رقم ${i + 1}`
              : lang === 'fr'
              ? `Veuillez saisir un titre pour le groupe de compléments n°${i + 1}`
              : `Please provide a title for complement group #${i + 1}`,
        };
      }

      if (g.selection === 'multiple') {
        const minVal = Number(g.min) || 0;
        const maxVal = Number(g.max) || 1;
        if (minVal < 0 || maxVal < 0) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `الحدود في المجموعة "${groupTitle}" يجب أن تكون أرقاماً غير سالبة`
                : lang === 'fr'
                ? `Les limites du groupe "${groupTitle}" doivent être positives ou nulles`
                : `Limits in group "${groupTitle}" must be non-negative`,
          };
        }
        if (maxVal > 0 && minVal > maxVal) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `الحد الأدنى في المجموعة "${groupTitle}" لا يمكن أن يتجاوز الحد الأقصى`
                : lang === 'fr'
                ? `La sélection minimale dans "${groupTitle}" ne peut dépasser le maximum`
                : `Minimum selection in "${groupTitle}" cannot exceed maximum`,
          };
        }
      }

      // Check items in group
      if (!g.items || g.items.length === 0) {
        return {
          isValid: false,
          error:
            lang === 'ar'
              ? `المجموعة "${groupTitle}" فارغة. يرجى إضافة خيار واحد على الأقل أو حذف المجموعة`
              : lang === 'fr'
              ? `Le groupe "${groupTitle}" est vide. Ajoutez au moins une option ou supprimez-le`
              : `Complement group "${groupTitle}" has no options. Add at least one option or remove it`,
        };
      }

      // Required groups need at least one available item
      if (g.required) {
        const hasAvailableItem = g.items.some((item) => item.available !== false);
        if (!hasAvailableItem) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `المجموعة الإجبارية "${groupTitle}" تحتاج إلى خيار متاح واحد على الأقل`
                : lang === 'fr'
                ? `Le groupe obligatoire "${groupTitle}" nécessite au moins un choix disponible`
                : `Required group "${groupTitle}" requires at least one available choice`,
          };
        }
      }

      const seenItemNames = new Set<string>();
      for (let j = 0; j < g.items.length; j++) {
        const item = g.items[j];
        const hasItemName = Boolean(item.name_ar?.trim() || item.name_fr?.trim() || item.name_en?.trim());
        if (!hasItemName) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `يرجى إدخال اسم للخيار رقم ${j + 1} في المجموعة "${groupTitle}"`
                : lang === 'fr'
                ? `Veuillez saisir un nom pour l'option n°${j + 1} du groupe "${groupTitle}"`
                : `Please provide a name for option #${j + 1} in group "${groupTitle}"`,
          };
        }

        if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `سعر الخيار في "${groupTitle}" يجب أن يكون رقماً غير سالب`
                : lang === 'fr'
                ? `Le prix de l'option dans "${groupTitle}" doit être positif ou nul`
                : `Option price in "${groupTitle}" must be non-negative`,
          };
        }

        const itemNameNorm = normalizeName(item.name_fr || item.name_en || item.name_ar || '');
        if (seenItemNames.has(itemNameNorm)) {
          return {
            isValid: false,
            error:
              lang === 'ar'
                ? `الخيار "${itemNameNorm}" مكرر داخل المجموعة "${groupTitle}"`
                : lang === 'fr'
                ? `L'option "${itemNameNorm}" est dupliquée dans le groupe "${groupTitle}"`
                : `Duplicate option name "${itemNameNorm}" in group "${groupTitle}"`,
          };
        }
        seenItemNames.add(itemNameNorm);
      }
    }
  }

  return { isValid: true, error: null };
}

export const DishOptionsEditor: React.FC<DishOptionsEditorProps> = ({
  sizes,
  setSizes,
  extras,
  setExtras,
  complements,
  setComplements,
  lang,
  confirmAction,
  basePrice,
}) => {
  const [activeTab, setActiveTab] = useState<'sizes' | 'extras' | 'complements'>('sizes');

  // ==========================================
  // SIZES HANDLERS
  // ==========================================
  const handleAddSize = () => {
    const isFirst = sizes.length === 0;
    const newSize: DishSize = {
      id: crypto.randomUUID(),
      name_ar: isFirst ? 'عادي' : '',
      name_fr: isFirst ? 'Standard' : '',
      name_en: isFirst ? 'Standard' : '',
      price: basePrice > 0 ? basePrice : 800,
      is_default: isFirst,
    };
    setSizes((prev) => [...prev, newSize]);
  };

  const handleUpdateSize = (index: number, updates: Partial<DishSize>) => {
    setSizes((prev) =>
      prev.map((s, idx) => {
        if (idx !== index) return s;
        return { ...s, ...updates };
      })
    );
  };

  const handleSetDefaultSize = (index: number) => {
    setSizes((prev) =>
      prev.map((s, idx) => ({
        ...s,
        is_default: idx === index,
      }))
    );
  };

  const handleMoveSize = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sizes.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setSizes((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleDeleteSize = async (index: number) => {
    const size = sizes[index];
    const sizeName = size.name_fr || size.name_en || size.name_ar || `#${index + 1}`;
    const confirmed = await confirmAction({
      title: lang === 'ar' ? 'حذف الحجم' : lang === 'fr' ? 'Supprimer la taille' : 'Delete Size',
      message:
        lang === 'ar'
          ? `هل أنت متأكد من حذف الحجم "${sizeName}"؟`
          : lang === 'fr'
          ? `Supprimer définitivement la taille "${sizeName}" ?`
          : `Are you sure you want to delete size "${sizeName}"?`,
      confirmLabel: lang === 'ar' ? 'حذف' : lang === 'fr' ? 'Supprimer' : 'Delete',
      cancelLabel: lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setSizes((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      // If the deleted size was default and other sizes remain, designate the first one as default
      if (size.is_default && next.length > 0) {
        next[0].is_default = true;
      }
      return next;
    });
  };

  // ==========================================
  // EXTRAS HANDLERS
  // ==========================================
  const handleAddExtra = () => {
    const newExtra: DishExtra = {
      id: crypto.randomUUID(),
      name_ar: '',
      name_fr: '',
      name_en: '',
      price: 100,
      available: true,
    };
    setExtras((prev) => [...prev, newExtra]);
  };

  const handleUpdateExtra = (index: number, updates: Partial<DishExtra>) => {
    setExtras((prev) =>
      prev.map((e, idx) => {
        if (idx !== index) return e;
        return { ...e, ...updates };
      })
    );
  };

  const handleMoveExtra = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === extras.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setExtras((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleDeleteExtra = async (index: number) => {
    const extra = extras[index];
    const extraName = extra.name_fr || extra.name_en || extra.name_ar || `#${index + 1}`;
    const confirmed = await confirmAction({
      title: lang === 'ar' ? 'حذف الإضافة' : lang === 'fr' ? 'Supprimer le supplément' : 'Delete Extra',
      message:
        lang === 'ar'
          ? `هل أنت متأكد من حذف الإضافة "${extraName}"؟`
          : lang === 'fr'
          ? `Supprimer définitivement l'extra "${extraName}" ?`
          : `Are you sure you want to delete extra "${extraName}"?`,
      confirmLabel: lang === 'ar' ? 'حذف' : lang === 'fr' ? 'Supprimer' : 'Delete',
      cancelLabel: lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setExtras((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ==========================================
  // COMPLEMENTS HANDLERS
  // ==========================================
  const handleAddComplementGroup = () => {
    const newGroup: DishComplementGroup = {
      id: crypto.randomUUID(),
      title_ar: 'المشروب أو المرافق',
      title_fr: 'Boisson ou Accompagnement',
      title_en: 'Drink or Side Choice',
      selection: 'single',
      required: false,
      min: 0,
      max: 1,
      items: [
        {
          id: crypto.randomUUID(),
          name_ar: 'ماء معدني',
          name_fr: 'Eau Minérale',
          name_en: 'Mineral Water',
          price: 0,
          available: true,
        },
      ],
    };
    setComplements((prev) => [...prev, newGroup]);
  };

  const handleUpdateGroup = (groupIndex: number, updates: Partial<DishComplementGroup>) => {
    setComplements((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        return { ...g, ...updates };
      })
    );
  };

  const handleMoveGroup = (groupIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && groupIndex === 0) return;
    if (direction === 'down' && groupIndex === complements.length - 1) return;
    const targetIdx = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    setComplements((prev) => {
      const next = [...prev];
      const temp = next[groupIndex];
      next[groupIndex] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleDeleteGroup = async (groupIndex: number) => {
    const group = complements[groupIndex];
    const groupTitle = group.title_fr || group.title_en || group.title_ar || `#${groupIndex + 1}`;
    const confirmed = await confirmAction({
      title: lang === 'ar' ? 'حذف مجموعة المكملات' : lang === 'fr' ? 'Supprimer le groupe' : 'Delete Complement Group',
      message:
        lang === 'ar'
          ? `هل أنت متأكد من حذف مجموعة "${groupTitle}" وجميع خياراتها؟`
          : lang === 'fr'
          ? `Supprimer définitivement le groupe "${groupTitle}" et toutes ses options ?`
          : `Are you sure you want to delete complement group "${groupTitle}"?`,
      confirmLabel: lang === 'ar' ? 'حذف' : lang === 'fr' ? 'Supprimer' : 'Delete',
      cancelLabel: lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setComplements((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  // Group Items
  const handleAddItemToGroup = (groupIndex: number) => {
    const newItem: DishComplementItem = {
      id: crypto.randomUUID(),
      name_ar: '',
      name_fr: '',
      name_en: '',
      price: 0,
      available: true,
    };
    setComplements((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        return { ...g, items: [...g.items, newItem] };
      })
    );
  };

  const handleUpdateGroupItem = (
    groupIndex: number,
    itemIndex: number,
    updates: Partial<DishComplementItem>
  ) => {
    setComplements((prev) =>
      prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        const newItems = g.items.map((it, iIdx) => {
          if (iIdx !== itemIndex) return it;
          return { ...it, ...updates };
        });
        return { ...g, items: newItems };
      })
    );
  };

  const handleMoveGroupItem = (
    groupIndex: number,
    itemIndex: number,
    direction: 'up' | 'down'
  ) => {
    setComplements((prev) =>
      prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        if (direction === 'up' && itemIndex === 0) return g;
        if (direction === 'down' && itemIndex === g.items.length - 1) return g;
        const targetIdx = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
        const nextItems = [...g.items];
        const temp = nextItems[itemIndex];
        nextItems[itemIndex] = nextItems[targetIdx];
        nextItems[targetIdx] = temp;
        return { ...g, items: nextItems };
      })
    );
  };

  const handleDeleteGroupItem = async (groupIndex: number, itemIndex: number) => {
    const group = complements[groupIndex];
    const item = group.items[itemIndex];
    const itemName = item.name_fr || item.name_en || item.name_ar || `#${itemIndex + 1}`;
    const confirmed = await confirmAction({
      title: lang === 'ar' ? 'حذف الخيار' : lang === 'fr' ? 'Supprimer l\'option' : 'Delete Option',
      message:
        lang === 'ar'
          ? `هل أنت متأكد من حذف الخيار "${itemName}"؟`
          : lang === 'fr'
          ? `Supprimer l'option "${itemName}" ?`
          : `Are you sure you want to delete option "${itemName}"?`,
      confirmLabel: lang === 'ar' ? 'حذف' : lang === 'fr' ? 'Supprimer' : 'Delete',
      cancelLabel: lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setComplements((prev) =>
      prev.map((g, gIdx) => {
        if (gIdx !== groupIndex) return g;
        return { ...g, items: g.items.filter((_, iIdx) => iIdx !== itemIndex) };
      })
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF5A1F]" />
            <span>
              {lang === 'ar'
                ? 'خيارات وتخصيصات الطبق'
                : lang === 'fr'
                ? 'Options et personnalisation du plat'
                : 'Dish Options & Customization'}
            </span>
          </h4>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'ar'
              ? 'الأحجام بأسعارها الكاملة، الإضافات، ومجموعات المكملات (المشروبات والمرافقات)'
              : lang === 'fr'
              ? 'Tailles (prix complet), suppléments et compléments (boissons, frites, sauces)'
              : 'Portion sizes with full price, add-on extras, and complement groups'}
          </p>
        </div>
      </div>

      {/* Tabs for the 3 sections */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('sizes')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'sizes'
              ? 'border-[#FF5A1F] text-[#FF5A1F]'
              : 'border-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <span>{lang === 'ar' ? 'الأحجام' : lang === 'fr' ? 'Tailles' : 'Sizes'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-200 font-mono">
            {sizes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('extras')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'extras'
              ? 'border-[#FF5A1F] text-[#FF5A1F]'
              : 'border-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <span>{lang === 'ar' ? 'الإضافات' : lang === 'fr' ? 'Extras / Suppléments' : 'Extras'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-200 font-mono">
            {extras.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('complements')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'complements'
              ? 'border-[#FF5A1F] text-[#FF5A1F]'
              : 'border-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <span>{lang === 'ar' ? 'المكملات والمشروبات' : lang === 'fr' ? 'Compléments & Boissons' : 'Complements & Drinks'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-200 font-mono">
            {complements.length}
          </span>
        </button>
      </div>

      {/* 1. SIZES TAB */}
      {activeTab === 'sizes' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">
                  {lang === 'ar'
                    ? 'السعر هنا هو السعر الكامل للطبق بذلك الحجم بالدينار الجزائري. يجب تحديد حجم افتراضي واحد بالضبط. إذا تركت القائمة فارغة، سيُعتمد السعر الأساسي للطبق.'
                    : lang === 'fr'
                    ? 'Le prix est le prix total du plat pour cette taille en DZD. Exactement une taille doit être définie par défaut. Si vide, le prix de base du plat est utilisé.'
                    : 'The price here is the full dish price in that size in DZD. Exactly one size must be the default. If empty, the dish uses its base price.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddSize}
              className="px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === 'ar' ? 'إضافة حجم' : lang === 'fr' ? 'Ajouter une taille' : 'Add Size'}</span>
            </button>
          </div>

          {sizes.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-xs text-stone-500 dark:text-stone-300">
              <p>
                {lang === 'ar'
                  ? 'لا توجد أحجام مخصصة (الطبق يقدم بحجم قياسي وسعره الأساسي)'
                  : lang === 'fr'
                  ? 'Aucune taille spécifique (le plat est servi en format unique à son prix de base)'
                  : 'No sizes configured (dish is served in standard single size at its base price)'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sizes.map((size, idx) => (
                <div
                  key={size.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
                    size.is_default
                      ? 'border-[#FF5A1F] bg-orange-50/30 dark:bg-orange-950/20'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850'
                  }`}
                >
                  {/* Reorder and default indicator */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSize(idx, 'up')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sizes.length - 1}
                        onClick={() => handleMoveSize(idx, 'down')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetDefaultSize(idx)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        size.is_default
                          ? 'bg-[#FF5A1F] text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                      title={lang === 'ar' ? 'تعيين كحجم افتراضي' : 'Set as default size'}
                    >
                      {size.is_default && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{lang === 'ar' ? 'افتراضي' : lang === 'fr' ? 'Défaut' : 'Default'}</span>
                    </button>
                  </div>

                  {/* Name inputs in FR, AR, EN */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      type="text"
                      value={size.name_fr}
                      onChange={(e) => handleUpdateSize(idx, { name_fr: e.target.value })}
                      placeholder="Taille (FR) e.g. Moyenne (M)"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                    />
                    <input
                      type="text"
                      value={size.name_ar}
                      onChange={(e) => handleUpdateSize(idx, { name_ar: e.target.value })}
                      placeholder="الحجم (عربي) مثل متوسط (M)"
                      dir="rtl"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 font-arabic"
                    />
                    <input
                      type="text"
                      value={size.name_en}
                      onChange={(e) => handleUpdateSize(idx, { name_en: e.target.value })}
                      placeholder="Size (EN) e.g. Medium (M)"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative w-28">
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={size.price}
                        onChange={(e) => handleUpdateSize(idx, { price: Number(e.target.value) })}
                        placeholder="Prix DZD"
                        className="w-full h-8 ps-2 pe-7 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono font-bold text-xs text-stone-900 dark:text-stone-100"
                      />
                      <span className="absolute end-2 top-1.5 text-[10px] text-stone-500 dark:text-stone-300 font-bold">DA</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSize(idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. EXTRAS TAB */}
      {activeTab === 'extras' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-850 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300">
            <p>
              {lang === 'ar'
                ? 'إضافات مدفوعة اختيارية مثل: جبن إضافي، بيض، صلصة خاصة.'
                : lang === 'fr'
                ? 'Suppléments payants au choix : double fromage, sauce spéciale, bacon.'
                : 'Optional add-ons diner can add to this dish (extra cheese, special sauce, etc.).'}
            </p>
            <button
              type="button"
              onClick={handleAddExtra}
              className="px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === 'ar' ? 'إضافة خيار' : lang === 'fr' ? 'Ajouter un extra' : 'Add Extra'}</span>
            </button>
          </div>

          {extras.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-xs text-stone-500 dark:text-stone-300">
              <p>
                {lang === 'ar'
                  ? 'لا توجد إضافات لهذا الطبق'
                  : lang === 'fr'
                  ? 'Aucun supplément pour ce plat'
                  : 'No extras configured for this dish'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {extras.map((extra, idx) => (
                <div
                  key={extra.id}
                  className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  {/* Reorder and Availability */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveExtra(idx, 'up')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === extras.length - 1}
                        onClick={() => handleMoveExtra(idx, 'down')}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateExtra(idx, { available: !extra.available })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        extra.available
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                      title="Toggle availability"
                    >
                      {extra.available ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{extra.available ? (lang === 'ar' ? 'متاح' : 'Dispo') : (lang === 'ar' ? 'معطل' : 'Épuisé')}</span>
                    </button>
                  </div>

                  {/* Name inputs in FR, AR, EN */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      type="text"
                      value={extra.name_fr}
                      onChange={(e) => handleUpdateExtra(idx, { name_fr: e.target.value })}
                      placeholder="Nom (FR) e.g. Double Fromage"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                    />
                    <input
                      type="text"
                      value={extra.name_ar}
                      onChange={(e) => handleUpdateExtra(idx, { name_ar: e.target.value })}
                      placeholder="الاسم (عربي) مثل جبن مضاعف"
                      dir="rtl"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 font-arabic"
                    />
                    <input
                      type="text"
                      value={extra.name_en}
                      onChange={(e) => handleUpdateExtra(idx, { name_en: e.target.value })}
                      placeholder="Name (EN) e.g. Double Cheese"
                      className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative w-28">
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={extra.price}
                        onChange={(e) => handleUpdateExtra(idx, { price: Number(e.target.value) })}
                        placeholder="+ DZD"
                        className="w-full h-8 ps-2 pe-7 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono font-bold text-xs text-stone-900 dark:text-stone-100"
                      />
                      <span className="absolute end-2 top-1.5 text-[10px] text-stone-500 dark:text-stone-300 font-bold">DA</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteExtra(idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLEMENTS TAB (Sides and drinks) */}
      {activeTab === 'complements' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-850 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300">
            <p>
              {lang === 'ar'
                ? 'مجموعات المرافقات والمشروبات (اختيار مفرد أو متعدد، إجباري أو اختياري مع حدود أدنى وأقصى).'
                : lang === 'fr'
                ? 'Groupes de compléments et boissons (choix unique ou multiple, obligatoire ou facultatif avec min/max).'
                : 'Complement and drink groups (single or multiple choice, required or optional with min/max).'}
            </p>
            <button
              type="button"
              onClick={handleAddComplementGroup}
              className="px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === 'ar' ? 'إضافة مجموعة' : lang === 'fr' ? 'Nouveau groupe' : 'Add Group'}</span>
            </button>
          </div>

          {complements.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-xs text-stone-500 dark:text-stone-300">
              <p>
                {lang === 'ar'
                  ? 'لا توجد مجموعات مكملات أو مشروبات'
                  : lang === 'fr'
                  ? 'Aucun groupe d\'accompagnement ou de boisson'
                  : 'No complement or drink groups configured'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {complements.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850/70 space-y-3.5"
                >
                  {/* Group Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-200/80 dark:border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={gIdx === 0}
                          onClick={() => handleMoveGroup(gIdx, 'up')}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                          title="Move Group Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={gIdx === complements.length - 1}
                          onClick={() => handleMoveGroup(gIdx, 'down')}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                          title="Move Group Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono text-xs font-black text-[#FF5A1F]">
                        #{gIdx + 1}
                      </span>
                    </div>

                    {/* Group Title Inputs in 3 languages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                      <input
                        type="text"
                        value={group.title_fr}
                        onChange={(e) => handleUpdateGroup(gIdx, { title_fr: e.target.value })}
                        placeholder="Titre du groupe (FR) e.g. Choix de la boisson"
                        className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-900 dark:text-stone-100"
                      />
                      <input
                        type="text"
                        value={group.title_ar}
                        onChange={(e) => handleUpdateGroup(gIdx, { title_ar: e.target.value })}
                        placeholder="عنوان المجموعة (عربي) مثل اختر المشروب"
                        dir="rtl"
                        className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-900 dark:text-stone-100 font-arabic"
                      />
                      <input
                        type="text"
                        value={group.title_en}
                        onChange={(e) => handleUpdateGroup(gIdx, { title_en: e.target.value })}
                        placeholder="Title (EN) e.g. Choice of Drink"
                        className="h-8 px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(gIdx)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 self-end sm:self-center"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Group Settings: selection (single | multiple), required, min, max */}
                  <div className="flex flex-wrap items-center gap-3 text-xs bg-white dark:bg-stone-800 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-700">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-stone-600 dark:text-stone-300">
                        {lang === 'ar' ? 'نوع الاختيار:' : lang === 'fr' ? 'Sélection :' : 'Selection:'}
                      </span>
                      <select
                        value={group.selection}
                        onChange={(e) =>
                          handleUpdateGroup(gIdx, {
                            selection: e.target.value as 'single' | 'multiple',
                            max: e.target.value === 'single' ? 1 : Math.max(1, group.max || 1),
                          })
                        }
                        className="h-7 px-2 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-semibold text-xs"
                      >
                        <option value="single">{lang === 'ar' ? 'مفرد (واحد فقط)' : 'Choix unique'}</option>
                        <option value="multiple">{lang === 'ar' ? 'متعدد' : 'Choix multiple'}</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => handleUpdateGroup(gIdx, { required: e.target.checked })}
                        className="accent-[#FF5A1F] w-4 h-4"
                      />
                      <span className="font-bold text-[11px] text-stone-700 dark:text-stone-200">
                        {lang === 'ar' ? 'إجباري (Required)' : lang === 'fr' ? 'Obligatoire' : 'Required'}
                      </span>
                    </label>

                    {group.selection === 'multiple' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-600 dark:text-stone-300 font-bold uppercase">Min:</span>
                          <input
                            type="number"
                            min={0}
                            value={group.min}
                            onChange={(e) => handleUpdateGroup(gIdx, { min: Math.max(0, Number(e.target.value)) })}
                            className="w-12 h-7 px-1.5 text-center font-mono font-bold text-xs rounded border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-600 dark:text-stone-300 font-bold uppercase">Max:</span>
                          <input
                            type="number"
                            min={1}
                            value={group.max}
                            onChange={(e) => handleUpdateGroup(gIdx, { max: Math.max(1, Number(e.target.value)) })}
                            className="w-12 h-7 px-1.5 text-center font-mono font-bold text-xs rounded border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group Items Sub-list */}
                  <div className="space-y-2 ps-2 sm:ps-4 border-s-2 border-orange-300 dark:border-orange-900/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {lang === 'ar' ? 'خيارات هذه المجموعة' : lang === 'fr' ? 'Options de ce groupe' : 'Group Options'} ({group.items.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddItemToGroup(gIdx)}
                        className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'إضافة خيار' : lang === 'fr' ? 'Ajouter une option' : 'Add Option'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((item, iIdx) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                        >
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={iIdx === 0}
                                onClick={() => handleMoveGroupItem(gIdx, iIdx, 'up')}
                                className="p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                                title="Move Option Up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={iIdx === group.items.length - 1}
                                onClick={() => handleMoveGroupItem(gIdx, iIdx, 'down')}
                                className="p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                                title="Move Option Down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUpdateGroupItem(gIdx, iIdx, { available: !item.available })}
                              className={`p-1 rounded text-[10px] ${
                                item.available ? 'text-emerald-600' : 'text-stone-400'
                              }`}
                              title="Toggle option availability"
                            >
                              {item.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 flex-1">
                            <input
                              type="text"
                              value={item.name_fr}
                              onChange={(e) => handleUpdateGroupItem(gIdx, iIdx, { name_fr: e.target.value })}
                              placeholder="Nom (FR) e.g. Coca-Cola"
                              className="h-7 px-2 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-900 dark:text-stone-100"
                            />
                            <input
                              type="text"
                              value={item.name_ar}
                              onChange={(e) => handleUpdateGroupItem(gIdx, iIdx, { name_ar: e.target.value })}
                              placeholder="الاسم (عربي) مثل كوكاكولا"
                              dir="rtl"
                              className="h-7 px-2 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-900 dark:text-stone-100 font-arabic"
                            />
                            <input
                              type="text"
                              value={item.name_en}
                              onChange={(e) => handleUpdateGroupItem(gIdx, iIdx, { name_en: e.target.value })}
                              placeholder="Name (EN) e.g. Coca-Cola"
                              className="h-7 px-2 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-900 dark:text-stone-100"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative w-24">
                              <input
                                type="number"
                                min={0}
                                step={10}
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateGroupItem(gIdx, iIdx, { price: Number(e.target.value) })
                                }
                                placeholder="0 = Inclus"
                                className="w-full h-7 ps-2 pe-6 rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 font-mono font-bold text-xs text-stone-900 dark:text-stone-100"
                              />
                              <span className="absolute end-1.5 top-1 text-[9px] text-stone-500 dark:text-stone-300 font-bold">DA</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteGroupItem(gIdx, iIdx)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete option"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

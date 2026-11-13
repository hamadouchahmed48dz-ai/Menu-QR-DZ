import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Offer, OfferType, OfferAppliesTo } from '../../types';
import { getOfferStatus, getAlgiersDateInfo } from '../../utils/promotions';
import { ImageUpload } from '../../components/common/ImageUpload';
import { deleteStorageMedia, supabase } from '../../lib/supabase';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Clock,
  Tag,
  Check,
  X,
  Sparkles,
  ShoppingBag,
  Layers,
  UtensilsCrossed,
  Eye,
  AlertCircle,
  Pause,
  Play,
  Search,
  ChevronDown,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#FF5A1F', // Orange (Default Brand)
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#E11D48', // Rose
];

const WEEKDAYS = [
  { day: 0, en: 'Sun', fr: 'Dim', ar: 'الأحد' },
  { day: 1, en: 'Mon', fr: 'Lun', ar: 'الإثنين' },
  { day: 2, en: 'Tue', fr: 'Mar', ar: 'الثلاثاء' },
  { day: 3, en: 'Wed', fr: 'Mer', ar: 'الأربعاء' },
  { day: 4, en: 'Thu', fr: 'Jeu', ar: 'الخميس' },
  { day: 5, en: 'Fri', fr: 'Ven', ar: 'الجمعة' },
  { day: 6, en: 'Sat', fr: 'Sam', ar: 'السبت' },
];

// Normalization helper for Arabic (tashkeel, hamza) and Latin (accents, case)
function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip Latin accents
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip Arabic diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/[ةه]/g, 'ه');
}

export const AdminOffers: React.FC = () => {
  const {
    offers,
    categories,
    products,
    addOffer,
    updateOffer,
    deleteOffer,
    toggleOffer,
    confirmAction,
    lang,
    showToast,
    adminProfile,
    userRole,
  } = useApp();
  const { t } = useTranslation(lang);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'paused' | 'expired'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formLangTab, setFormLangTab] = useState<'en' | 'fr' | 'ar'>('en');
  const [titleEn, setTitleEn] = useState('');
  const [titleFr, setTitleFr] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');

  const [type, setType] = useState<OfferType>('percentage');
  const [value, setValue] = useState<number>(15);
  const [appliesTo, setAppliesTo] = useState<OfferAppliesTo>('order');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [targetProductIds, setTargetProductIds] = useState<string[]>([]);
  const [dishSearch, setDishSearch] = useState<string>('');
  const [shortcutCatId, setShortcutCatId] = useState<string>('');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('');

  const [startDate, setStartDate] = useState<string>(getAlgiersDateInfo().dateStr);
  const [endDate, setEndDate] = useState<string>('');
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [hasHappyHour, setHasHappyHour] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('16:00');

  const [bannerColor, setBannerColor] = useState<string>('#FF5A1F');
  const [offerImageUrl, setOfferImageUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const status = getOfferStatus(o);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch =
        (o.title.en && o.title.en.toLowerCase().includes(q)) ||
        (o.title.fr && o.title.fr.toLowerCase().includes(q)) ||
        (o.title.ar && o.title.ar.toLowerCase().includes(q));
      const descMatch =
        (o.description?.en && o.description.en.toLowerCase().includes(q)) ||
        (o.description?.fr && o.description.fr.toLowerCase().includes(q)) ||
        (o.description?.ar && o.description.ar.toLowerCase().includes(q));
      return titleMatch || descMatch;
    });
  }, [offers, statusFilter, searchQuery]);

  // Dish filtering for product multi-select modal (normalized search)
  const filteredDishes = useMemo(() => {
    if (!dishSearch.trim()) return products;
    const norm = normalizeSearchText(dishSearch);
    return products.filter((p) => {
      const en = normalizeSearchText(p.name?.en || '');
      const fr = normalizeSearchText(p.name?.fr || '');
      const ar = normalizeSearchText(p.name?.ar || '');
      return en.includes(norm) || fr.includes(norm) || ar.includes(norm);
    });
  }, [products, dishSearch]);

  // Selected dishes objects
  const selectedDishes = useMemo(() => {
    return products.filter((p) => targetProductIds.includes(p.id));
  }, [products, targetProductIds]);

  const handleToggleDish = (productId: string) => {
    setTargetProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleRemoveDish = (productId: string) => {
    setTargetProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleSelectAllCategoryDishes = (catId: string) => {
    if (!catId) return;
    const catDishIds = products.filter((p) => p.categoryId === catId).map((p) => p.id);
    setTargetProductIds((prev) => Array.from(new Set([...prev, ...catDishIds])));
  };

  const handleDeselectAllDishes = () => {
    setTargetProductIds([]);
  };

  const openAddModal = () => {
    setEditingOffer(null);
    setTitleEn('');
    setTitleFr('');
    setTitleAr('');
    setDescEn('');
    setDescFr('');
    setDescAr('');
    setType('percentage');
    setValue(15);
    setAppliesTo('order');
    setTargetCategoryId(categories[0]?.id || '');
    setTargetProductIds([]);
    setDishSearch('');
    setShortcutCatId(categories[0]?.id || '');
    setMinOrderAmount('');
    setStartDate(getAlgiersDateInfo().dateStr);
    setEndDate('');
    setActiveDays([]);
    setHasHappyHour(false);
    setStartTime('12:00');
    setEndTime('16:00');
    setBannerColor('#FF5A1F');
    setOfferImageUrl('');
    setFormError(null);
    setFormLangTab(lang);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setTitleEn(offer.title.en || '');
    setTitleFr(offer.title.fr || '');
    setTitleAr(offer.title.ar || '');
    setDescEn(offer.description?.en || '');
    setDescFr(offer.description?.fr || '');
    setDescAr(offer.description?.ar || '');
    setType(offer.type);
    setValue(offer.value);
    setAppliesTo(offer.appliesTo);
    setTargetCategoryId(offer.targetCategoryId || categories[0]?.id || '');

    const initialProductIds = Array.isArray(offer.targetProductIds) && offer.targetProductIds.length > 0
      ? offer.targetProductIds
      : offer.targetProductId
      ? [offer.targetProductId]
      : [];
    setTargetProductIds(initialProductIds);
    setDishSearch('');
    setShortcutCatId(categories[0]?.id || '');

    setMinOrderAmount(offer.minOrderAmount != null ? String(offer.minOrderAmount) : '');
    setStartDate(offer.startDate || getAlgiersDateInfo().dateStr);
    setEndDate(offer.endDate || '');
    setActiveDays(offer.activeDays || []);
    setHasHappyHour(!!(offer.startTime && offer.endTime));
    setStartTime(offer.startTime || '12:00');
    setEndTime(offer.endTime || '16:00');
    setBannerColor(offer.bannerColor || '#FF5A1F');
    setOfferImageUrl(offer.imageUrl || '');
    setFormError(null);
    setFormLangTab(lang);
    setIsModalOpen(true);
  };

  const handleDuplicateOffer = (offer: Offer) => {
    const copySuffix = lang === 'ar' ? ' (نسخة)' : ' (Copy)';
    setEditingOffer(null);
    setTitleEn((offer.title.en || '') + copySuffix);
    setTitleFr((offer.title.fr || '') + copySuffix);
    setTitleAr((offer.title.ar || '') + copySuffix);
    setDescEn(offer.description?.en || '');
    setDescFr(offer.description?.fr || '');
    setDescAr(offer.description?.ar || '');
    setType(offer.type);
    setValue(offer.value);
    setAppliesTo(offer.appliesTo);
    setTargetCategoryId(offer.targetCategoryId || categories[0]?.id || '');

    const initialProductIds = Array.isArray(offer.targetProductIds) && offer.targetProductIds.length > 0
      ? offer.targetProductIds
      : offer.targetProductId
      ? [offer.targetProductId]
      : [];
    setTargetProductIds(initialProductIds);
    setDishSearch('');
    setShortcutCatId(categories[0]?.id || '');

    setMinOrderAmount(offer.minOrderAmount != null ? String(offer.minOrderAmount) : '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(offer.endDate || '');
    setActiveDays(offer.activeDays || []);
    setHasHappyHour(!!(offer.startTime && offer.endTime));
    setStartTime(offer.startTime || '12:00');
    setEndTime(offer.endTime || '16:00');
    setBannerColor(offer.bannerColor || '#FF5A1F');
    setOfferImageUrl(offer.imageUrl || '');
    setFormError(null);
    setFormLangTab(lang);
    setIsModalOpen(true);
  };

  const handleDeleteOffer = async (offer: Offer) => {
    const offerTitle = offer.title?.[lang] || offer.title?.en || '';
    const message = offerTitle
      ? `${t.deleteOfferConfirm || 'Are you sure you want to delete this promotional offer?'}\n"${offerTitle}"`
      : (t.deleteOfferConfirm || 'Are you sure you want to delete this promotional offer?');

    const confirmed = await confirmAction({
      title: lang === 'ar' ? 'حذف العرض الترويجي' : 'Delete Promotion',
      message,
      confirmLabel: t.delete || 'Delete',
      cancelLabel: t.cancel || 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    // Delete image from storage if hosted in menuqr-media
    if (offer.imageUrl) {
      await deleteStorageMedia(offer.imageUrl);
    }
    await deleteOffer(offer.id);
  };

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const primaryTitle = titleEn.trim() || titleFr.trim() || titleAr.trim();
    if (!primaryTitle) {
      setFormError(
        lang === 'ar'
          ? 'يرجى كتابة عنوان العرض في إحدى اللغات على الأقل'
          : 'Please provide at least one title for the promotion'
      );
      return;
    }

    if (type === 'percentage') {
      if (value < 1 || value > 100) {
        setFormError(
          lang === 'ar'
            ? 'نسبة الخصم يجب أن تكون بين 1% و 100%'
            : 'Discount percentage must be between 1% and 100%'
        );
        return;
      }
    } else {
      if (value <= 0) {
        setFormError(
          lang === 'ar'
            ? 'قيمة الخصم يجب أن تكون أكبر من 0 د.ج'
            : 'Discount amount must be greater than 0'
        );
        return;
      }
    }

    if (endDate && startDate && endDate < startDate) {
      setFormError(
        lang === 'ar'
          ? 'تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء'
          : 'End date cannot be earlier than start date'
      );
      return;
    }

    if (appliesTo === 'category' && !targetCategoryId) {
      setFormError(
        lang === 'ar' ? 'يرجى تحديد قسم للأطباق' : 'Please select a target category'
      );
      return;
    }

    if (appliesTo === 'product' && targetProductIds.length === 0) {
      setFormError(
        lang === 'ar'
          ? 'يرجى تحديد طبق واحد على الأقل للعرض'
          : lang === 'fr'
          ? 'Veuillez sélectionner au moins un plat ciblé'
          : 'Please select at least one target dish'
      );
      return;
    }

    setIsSaving(true);
    try {
      const cleanMinOrder = minOrderAmount.trim() ? Number(minOrderAmount) : null;
      const cleanStartDate = startDate.trim() || getAlgiersDateInfo().dateStr;
      const cleanEndDate = endDate.trim() || null;
      const cleanStartTime = hasHappyHour ? startTime : null;
      const cleanEndTime = hasHappyHour ? endTime : null;

      const offerData: Omit<Offer, 'id'> = {
        title: {
          en: titleEn.trim() || primaryTitle,
          fr: titleFr.trim() || primaryTitle,
          ar: titleAr.trim() || primaryTitle,
        },
        description: {
          en: descEn.trim(),
          fr: descFr.trim(),
          ar: descAr.trim(),
        },
        type,
        value: Number(value),
        appliesTo,
        targetCategoryId: appliesTo === 'category' ? targetCategoryId : null,
        targetProductId: appliesTo === 'product' ? targetProductIds[0] || null : null,
        targetProductIds: appliesTo === 'product' ? targetProductIds : [],
        minOrderAmount: cleanMinOrder,
        startDate: cleanStartDate,
        endDate: cleanEndDate,
        activeDays: activeDays.length > 0 ? activeDays : null,
        startTime: cleanStartTime,
        endTime: cleanEndTime,
        isActive: editingOffer ? editingOffer.isActive : true,
        bannerColor,
        imageUrl: offerImageUrl ? offerImageUrl.trim() : null,
      };

      if (editingOffer) {
        const oldImage = editingOffer.imageUrl;
        const ok = await updateOffer(editingOffer.id, offerData);
        if (ok) {
          if (oldImage && offerImageUrl && oldImage !== offerImageUrl) {
            await deleteStorageMedia(oldImage);
          }
          setIsModalOpen(false);
        }
      } else {
        const created = await addOffer(offerData);
        if (created) setIsModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Preview computation
  const previewTitle =
    (formLangTab === 'ar' ? titleAr : formLangTab === 'fr' ? titleFr : titleEn) ||
    titleEn ||
    titleFr ||
    titleAr ||
    (lang === 'ar' ? 'عرض ترويجي خاص' : 'Special Promotional Offer');

  const previewDesc =
    (formLangTab === 'ar' ? descAr : formLangTab === 'fr' ? descFr : descEn) ||
    descEn ||
    descFr ||
    descAr ||
    (lang === 'ar'
      ? 'استفد من أفضل العروض الحصرية على أطباقنا اللذيذة'
      : 'Enjoy our signature menu favorites with special savings');

  const previewBadge = type === 'percentage' ? `-${value}%` : `-${value} DA`;

  const targetCategory = categories.find((c) => c.id === targetCategoryId);
  const firstSelectedDish = selectedDishes[0];

  if (userRole === 'staff') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[#FF5A1F]" />
            <span>{lang === 'ar' ? 'العروض والخصومات الترويجية' : lang === 'fr' ? 'Promotions & Offres' : 'Promotions & Deals'}</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {lang === 'ar'
              ? 'إدارة الخصومات، ساعات السعادة (Happy Hour)، والعروض على الأطباق والقائمة'
              : lang === 'fr'
              ? 'Gérez vos remises, happy hours et offres spéciales affichées sur le menu digital'
              : 'Configure discounts, happy hour time windows, and promotional deals displayed to diners'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إضافة عرض جديد' : lang === 'fr' ? 'Nouvelle promotion' : 'New Promotion'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-850 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', labelEn: 'All', labelFr: 'Toutes', labelAr: 'الكل' },
              { id: 'active', labelEn: 'Active', labelFr: 'Actives', labelAr: 'نشطة' },
              { id: 'scheduled', labelEn: 'Scheduled', labelFr: 'Programmées', labelAr: 'مجدولة' },
              { id: 'paused', labelEn: 'Paused', labelFr: 'En pause', labelAr: 'متوقفة' },
              { id: 'expired', labelEn: 'Expired', labelFr: 'Expirées', labelAr: 'منتهية' },
            ] as const
          ).map((tab) => {
            const isSel = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSel
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {lang === 'ar' ? tab.labelAr : lang === 'fr' ? tab.labelFr : tab.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في العروض...' : 'Search promotions...'}
            className="w-full ps-9 pe-3 py-1.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
          />
        </div>
      </div>

      {/* Offers Cards Grid */}
      {filteredOffers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 flex items-center justify-center mb-3">
            <Tag className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
            {lang === 'ar' ? 'لا توجد عروض ترويجية مطابقة' : 'No promotions match your filter'}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-300 mt-1 max-w-sm mx-auto">
            {lang === 'ar'
              ? 'قم بإنشاء عرض جديد للفت انتباه زبائنك لخصومات حصرية وساعات سعيدة'
              : 'Create a new promotion to boost sales and attract diners during key hours'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const status = getOfferStatus(offer);
            const offerTitle = offer.title?.[lang] || offer.title?.en || '';
            const offerDesc = offer.description?.[lang] || offer.description?.en || '';
            const badgeText = offer.type === 'percentage' ? `-${offer.value}%` : `-${offer.value} DA`;

            return (
              <div
                key={offer.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all p-5 shadow-xs overflow-hidden ${
                  offer.isActive
                    ? 'bg-white dark:bg-stone-850 border-stone-200/80 dark:border-stone-800 hover:shadow-md'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200/60 dark:border-stone-800/80 opacity-75'
                }`}
              >
                {/* Accent Top Bar */}
                <div
                  className="absolute top-0 start-0 end-0 h-1.5"
                  style={{ backgroundColor: offer.bannerColor || '#FF5A1F' }}
                />

                <div className="space-y-4 pt-1">
                  {/* Status Badges & Quick Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {lang === 'ar' ? 'نشط' : lang === 'fr' ? 'Actif' : 'Active'}
                        </span>
                      )}
                      {status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                          <Calendar className="w-3 h-3" />
                          {lang === 'ar' ? 'مجدول' : lang === 'fr' ? 'Programmé' : 'Scheduled'}
                        </span>
                      )}
                      {status === 'paused' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          <Pause className="w-3 h-3" />
                          {lang === 'ar' ? 'متوقف' : lang === 'fr' ? 'En pause' : 'Paused'}
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                          <Clock className="w-3 h-3" />
                          {lang === 'ar' ? 'منتهي' : lang === 'fr' ? 'Expiré' : 'Expired'}
                        </span>
                      )}

                      {/* Scope Summary Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {offer.appliesTo === 'order' && (
                          <>
                            <ShoppingBag className="w-3 h-3 text-[#FF5A1F]" />
                            <span>{lang === 'ar' ? 'كامل الطلب' : lang === 'fr' ? 'Toute la commande' : 'Whole order'}</span>
                          </>
                        )}
                        {offer.appliesTo === 'category' && (() => {
                          const cat = categories.find((c) => c.id === offer.targetCategoryId);
                          const catName = cat?.name?.[lang] || cat?.name?.en || (lang === 'ar' ? 'قسم' : 'Category');
                          return (
                            <>
                              <Layers className="w-3 h-3 text-indigo-500" />
                              <span>{lang === 'ar' ? `قسم: ${catName}` : lang === 'fr' ? `Catégorie : ${catName}` : `Category: ${catName}`}</span>
                            </>
                          );
                        })()}
                        {offer.appliesTo === 'product' && (() => {
                          const rawIds = (offer.targetProductIds && offer.targetProductIds.length > 0)
                            ? offer.targetProductIds
                            : offer.targetProductId ? [offer.targetProductId] : [];
                          const count = rawIds.length;
                          let dishCountText = `${count} ${count === 1 ? 'dish' : 'dishes'}`;
                          if (lang === 'ar') {
                            dishCountText = count === 1 ? 'طبق واحد' : count === 2 ? 'طبقين' : count <= 10 ? `${count} أطباق` : `${count} طبق`;
                          } else if (lang === 'fr') {
                            dishCountText = `${count} ${count === 1 ? 'plat' : 'plats'}`;
                          }
                          return (
                            <>
                              <UtensilsCrossed className="w-3 h-3 text-emerald-500" />
                              <span>{dishCountText}</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>

                    {/* Pause / Resume Button */}
                    <button
                      onClick={() => toggleOffer(offer.id)}
                      title={offer.isActive ? 'Pause' : 'Activate'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        offer.isActive
                          ? 'text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100'
                      }`}
                    >
                      {offer.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Main Banner Presentation */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: offer.bannerColor || '#FF5A1F' }}
                    >
                      <span className="text-xs font-mono font-black tracking-tight">{badgeText}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">
                        {offer.type === 'percentage' ? 'OFF' : 'DEAL'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                        {offerTitle}
                      </h3>
                      {offerDesc ? (
                        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mt-0.5 leading-relaxed">
                          {offerDesc}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-500 dark:text-stone-300 italic mt-0.5">
                          {offer.title.fr || offer.title.ar || ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scheduling Details */}
                  <div className="space-y-1.5 pt-2 text-[11px] text-stone-600 dark:text-stone-300 border-t border-stone-100 dark:border-stone-800">
                    {/* Dates */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-500 dark:text-stone-300 shrink-0" />
                      <span>
                        {offer.startDate}
                        {offer.endDate ? ` → ${offer.endDate}` : ` (${lang === 'ar' ? 'مستمر' : 'Ongoing'})`}
                      </span>
                    </div>

                    {/* Happy Hour Time */}
                    {offer.startTime && offer.endTime && (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Happy Hour: {offer.startTime} - {offer.endTime}
                        </span>
                      </div>
                    )}

                    {/* Active Days */}
                    {offer.activeDays && offer.activeDays.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-stone-500 dark:text-stone-300 me-0.5">{lang === 'ar' ? 'الأيام:' : 'Days:'}</span>
                        {offer.activeDays.map((d) => {
                          const w = WEEKDAYS.find((item) => item.day === d);
                          return (
                            <span
                              key={d}
                              className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-700 dark:text-stone-300"
                            >
                              {w ? (lang === 'ar' ? w.ar : lang === 'fr' ? w.fr : w.en) : d}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Min order */}
                    {offer.minOrderAmount != null && offer.minOrderAmount > 0 && (
                      <div className="text-stone-500 dark:text-stone-300">
                        {lang === 'ar'
                          ? `الحد الأدنى للطلب: ${offer.minOrderAmount} د.ج`
                          : `Min order: ${offer.minOrderAmount} DA`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleDuplicateOffer(offer)}
                    className="p-1.5 rounded-lg text-stone-400 dark:text-stone-300 hover:text-stone-700 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title={lang === 'ar' ? 'نسخ هذا العرض' : 'Duplicate offer'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(offer)}
                    className="p-1.5 rounded-lg text-stone-400 dark:text-stone-300 hover:text-[#FF5A1F] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                    title={lang === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteOffer(offer)}
                    className="p-1.5 rounded-lg text-stone-400 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title={lang === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-850 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                  {editingOffer
                    ? lang === 'ar'
                      ? 'تعديل العرض الترويجي'
                      : 'Edit Promotion'
                    : lang === 'ar'
                    ? 'إنشاء عرض ترويجي جديد'
                    : 'Create New Promotion'}
                </h3>
                <p className="text-xs text-stone-400">
                  {lang === 'ar'
                    ? 'حدد نوع الخصم، النطاق المستهدف، والجدول الزمني'
                    : 'Configure discount value, targets, and time availability'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two columns (Form left, Live Preview right) */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT FORM COLUMN (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Title & Description with Language Tabs */}
                  <div className="space-y-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {lang === 'ar' ? 'العنوان والوصف' : 'Title & Description'}
                      </label>
                      <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFormLangTab('en')}
                          className={`px-2 py-0.5 rounded ${
                            formLangTab === 'en'
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                              : 'text-stone-500'
                          }`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormLangTab('fr')}
                          className={`px-2 py-0.5 rounded ${
                            formLangTab === 'fr'
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                              : 'text-stone-500'
                          }`}
                        >
                          FR
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormLangTab('ar')}
                          className={`px-2 py-0.5 rounded ${
                            formLangTab === 'ar'
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                              : 'text-stone-500'
                          }`}
                        >
                          العربية
                        </button>
                      </div>
                    </div>

                    {formLangTab === 'en' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={titleEn}
                          onChange={(e) => setTitleEn(e.target.value)}
                          placeholder="e.g. 20% Off Family Pizza Combo"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                        />
                        <textarea
                          rows={2}
                          value={descEn}
                          onChange={(e) => setDescEn(e.target.value)}
                          placeholder="Short description displayed to diners (English)..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] resize-none"
                        />
                      </div>
                    )}

                    {formLangTab === 'fr' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={titleFr}
                          onChange={(e) => setTitleFr(e.target.value)}
                          placeholder="ex. 20% de réduction Formule Famille"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                        />
                        <textarea
                          rows={2}
                          value={descFr}
                          onChange={(e) => setDescFr(e.target.value)}
                          placeholder="Description affichée aux clients (Français)..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] resize-none"
                        />
                      </div>
                    )}

                    {formLangTab === 'ar' && (
                      <div className="space-y-2" dir="rtl">
                        <input
                          type="text"
                          value={titleAr}
                          onChange={(e) => setTitleAr(e.target.value)}
                          placeholder="مثال: خصم 20% على عرض البيتزا العائلي"
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                        />
                        <textarea
                          rows={2}
                          value={descAr}
                          onChange={(e) => setDescAr(e.target.value)}
                          placeholder="وصف مختصر يظهر للزبائن في قائمة الطعام..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Discount Type & Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        {lang === 'ar' ? 'نوع الخصم' : 'Discount Type'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
                        <button
                          type="button"
                          onClick={() => setType('percentage')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            type === 'percentage'
                              ? 'bg-white dark:bg-stone-700 text-[#FF5A1F] shadow-xs'
                              : 'text-stone-500'
                          }`}
                        >
                          % {lang === 'ar' ? 'نسبة' : 'Percent'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setType('fixed_amount')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            type === 'fixed_amount'
                              ? 'bg-white dark:bg-stone-700 text-[#FF5A1F] shadow-xs'
                              : 'text-stone-500'
                          }`}
                        >
                          DA {lang === 'ar' ? 'مبلغ ثابت' : 'Fixed'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        {type === 'percentage'
                          ? lang === 'ar'
                            ? 'قيمة النسبة (%)'
                            : 'Percentage Value (%)'
                          : lang === 'ar'
                          ? 'قيمة الخصم (د.ج)'
                          : 'Amount Value (DA)'}
                      </label>
                      <input
                        type="number"
                        min={type === 'percentage' ? 1 : 10}
                        max={type === 'percentage' ? 100 : 50000}
                        step={type === 'percentage' ? 1 : 10}
                        value={value}
                        onChange={(e) => setValue(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                      />
                    </div>
                  </div>

                  {/* Applies To Scope */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      {lang === 'ar' ? 'نطاق تطبيق الخصم *' : 'Applies To *'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'order', labelEn: 'Whole Order', labelFr: 'Toute la commande', labelAr: 'كامل الطلب' },
                        { id: 'category', labelEn: 'A Category', labelFr: 'Une catégorie', labelAr: 'قسم كامل' },
                        { id: 'product', labelEn: 'Specific Dishes', labelFr: 'Plats spécifiques', labelAr: 'أطباق محددة' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAppliesTo(item.id as OfferAppliesTo)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                            appliesTo === item.id
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-[#FF5A1F] text-[#FF5A1F] shadow-xs ring-1 ring-[#FF5A1F]'
                              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <span>{lang === 'ar' ? item.labelAr : lang === 'fr' ? item.labelFr : item.labelEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scope Target: A Category */}
                  {appliesTo === 'category' && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                        {lang === 'ar' ? 'اختر القسم المستهدف' : 'Select Target Category'}
                      </label>
                      <select
                        value={targetCategoryId}
                        onChange={(e) => setTargetCategoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name[lang] || c.name.en}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-stone-400">
                        {lang === 'ar'
                          ? 'يطبق الخصم تلقائياً على كل الأطباق التي تنتمي إلى هذا القسم'
                          : 'Discount automatically applies to all dishes belonging to this category'}
                      </p>
                    </div>
                  )}

                  {/* Scope Target: Specific Dishes (Multi-Select Searchable) */}
                  {appliesTo === 'product' && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                            {lang === 'ar' ? 'الأطباق المستهدفة *' : 'Target Dishes *'}
                          </label>
                          <span className="text-[11px] text-stone-500 dark:text-stone-300">
                            {lang === 'ar'
                              ? `تم تحديد ${targetProductIds.length} طبق`
                              : `${targetProductIds.length} dishes selected`}
                          </span>
                        </div>

                        {targetProductIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDeselectAllDishes}
                            className="text-xs text-stone-500 dark:text-stone-300 hover:text-red-500 font-bold transition-colors"
                          >
                            {lang === 'ar' ? 'إلغاء التحديد' : 'Clear all'}
                          </button>
                        )}
                      </div>

                      {/* Removable Chips of Selected Dishes */}
                      {selectedDishes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 max-h-28 overflow-y-auto">
                          {selectedDishes.map((p) => (
                            <div
                              key={p.id}
                              className="inline-flex items-center gap-1.5 ps-1 pe-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-[#FF5A1F]/30 text-xs font-bold text-stone-800 dark:text-stone-200 shadow-2xs"
                            >
                              <img
                                src={p.image}
                                alt={p.name[lang] || p.name.en}
                                className="w-5 h-5 rounded-md object-cover"
                              />
                              <span className="max-w-[120px] truncate">{p.name[lang] || p.name.en}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDish(p.id)}
                                className="w-4 h-4 rounded-full hover:bg-orange-200/60 dark:hover:bg-orange-900/60 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                                title="Remove"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Shortcut: Select all of a category */}
                      <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800/80">
                        <span className="text-[11px] font-bold text-stone-500 shrink-0">
                          {lang === 'ar' ? 'اختصار:' : 'Shortcut:'}
                        </span>
                        <select
                          value={shortcutCatId}
                          onChange={(e) => setShortcutCatId(e.target.value)}
                          className="px-2 py-1 rounded-lg text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-800 dark:text-stone-200 flex-1 truncate"
                        >
                          <option value="">{lang === 'ar' ? 'اختر قسماً...' : 'Select category...'}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name[lang] || c.name.en}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!shortcutCatId}
                          onClick={() => handleSelectAllCategoryDishes(shortcutCatId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-200 dark:bg-stone-800 hover:bg-[#FF5A1F] hover:text-white dark:hover:bg-[#FF5A1F] text-stone-700 dark:text-stone-300 transition-colors disabled:opacity-40 shrink-0"
                        >
                          {lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                        </button>
                      </div>

                      {/* Search Dishes Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={dishSearch}
                          onChange={(e) => setDishSearch(e.target.value)}
                          placeholder={
                            lang === 'ar'
                              ? 'ابحث بالاسم باللغة العربية أو اللاتينية...'
                              : 'Search dishes by name (ignoring accents & case)...'
                          }
                          className="w-full ps-9 pe-8 py-2 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                        />
                        {dishSearch && (
                          <button
                            type="button"
                            onClick={() => setDishSearch('')}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Multi-Select Dishes Options List */}
                      <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-stone-200/80 dark:border-stone-750 bg-white dark:bg-stone-850">
                        {filteredDishes.length === 0 ? (
                          <div className="p-4 text-center text-xs text-stone-400">
                            {lang === 'ar' ? 'لم يتم العثور على أطباق مطابقة للبحث' : 'No dishes found matching your search'}
                          </div>
                        ) : (
                          filteredDishes.map((dish) => {
                            const isSelected = targetProductIds.includes(dish.id);
                            const cat = categories.find((c) => c.id === dish.categoryId);
                            return (
                              <div
                                key={dish.id}
                                onClick={() => handleToggleDish(dish.id)}
                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                  isSelected
                                    ? 'bg-orange-50/70 dark:bg-orange-950/30 border-[#FF5A1F]/40'
                                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/60 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by parent onClick
                                    className="w-4 h-4 text-[#FF5A1F] rounded border-stone-300 dark:border-stone-600 focus:ring-[#FF5A1F] shrink-0"
                                  />
                                  <img
                                    src={dish.image}
                                    alt={dish.name[lang] || dish.name.en}
                                    className="w-9 h-9 rounded-lg object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                                      {dish.name[lang] || dish.name.en}
                                    </div>
                                    <div className="text-[10px] text-stone-400 truncate">
                                      {cat?.name[lang] || cat?.name.en || ''}
                                    </div>
                                  </div>
                                </div>

                                <span className="font-mono tabular-nums text-xs font-extrabold text-stone-900 dark:text-stone-100 shrink-0 ms-2">
                                  {dish.price} DA
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Min order amount */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      {lang === 'ar' ? 'الحد الأدنى للطلب (اختياري - د.ج)' : 'Minimum Order Amount (Optional DA)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        {lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        {lang === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'End Date (Optional)'}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                      />
                    </div>
                  </div>

                  {/* Weekday Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {lang === 'ar' ? 'أيام الأسبوع النشطة' : 'Active Days of Week'}
                      </label>
                      <span className="text-[10px] text-stone-400">
                        {activeDays.length === 0
                          ? lang === 'ar'
                            ? '(كل الأيام)'
                            : '(All Days)'
                          : `${activeDays.length} selected`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {WEEKDAYS.map((w) => {
                        const isDayActive = activeDays.includes(w.day);
                        return (
                          <button
                            key={w.day}
                            type="button"
                            onClick={() => toggleDay(w.day)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isDayActive
                                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200'
                            }`}
                          >
                            {lang === 'ar' ? w.ar : lang === 'fr' ? w.fr : w.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Happy Hour Toggle */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            {lang === 'ar' ? 'ساعات السعادة (Happy Hour)' : 'Happy Hour Time Window'}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            {lang === 'ar'
                              ? 'تفعيل الخصم في ساعات محددة فقط من اليوم'
                              : 'Limit this deal to specific hours of the day'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasHappyHour}
                        onChange={(e) => setHasHappyHour(e.target.checked)}
                        className="w-4 h-4 text-[#FF5A1F] rounded focus:ring-[#FF5A1F]"
                      />
                    </label>

                    {hasHappyHour && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200/60 dark:border-stone-800">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-500 mb-1">
                            {lang === 'ar' ? 'من الساعة' : 'From Time'}
                          </label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required={hasHappyHour}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-500 mb-1">
                            {lang === 'ar' ? 'إلى الساعة' : 'Until Time'}
                          </label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required={hasHappyHour}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner Theme Color */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      {lang === 'ar' ? 'لون البانر والشارة' : 'Banner Color Theme'}
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setBannerColor(col)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                            bannerColor === col ? 'scale-115 ring-2 ring-stone-900 dark:ring-white ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: col }}
                        >
                          {bannerColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                      <input
                        type="color"
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        className="w-7 h-7 rounded-full p-0 cursor-pointer border-0"
                      />
                    </div>
                  </div>

                  {/* Promotional Banner Image (menuqr-media) */}
                  <div className="pt-2">
                    <ImageUpload
                      value={offerImageUrl}
                      onChange={setOfferImageUrl}
                      restaurantId={adminProfile?.restaurantId}
                      folder="offers"
                      aspectRatio="cover"
                      label={lang === 'ar' ? 'صورة العرض الترويجي (اختياري)' : lang === 'fr' ? 'Bannière de l\'offre (optionnel)' : 'Promotional Banner Image (optional)'}
                      onUploadAndVerify={
                        editingOffer
                          ? async (newUrl) => {
                              if (!adminProfile?.restaurantId) return { success: true };
                              const { data, error } = await supabase
                                .from('offers')
                                .update({ image_url: newUrl, updated_at: new Date().toISOString() })
                                .eq('id', editingOffer.id)
                                .eq('restaurant_id', adminProfile.restaurantId)
                                .select('*');

                              if (error || !data || data.length === 0 || data[0].image_url !== newUrl) {
                                console.error('[AdminOffers] Failed to verify offer image update in database:', {
                                  error,
                                  data,
                                  newUrl,
                                });
                                return {
                                  success: false,
                                  error:
                                    lang === 'ar'
                                      ? 'تعذر حفظ صورة العرض في قاعدة البيانات.'
                                      : 'Failed to update offer image in database.',
                                };
                              }

                              await updateOffer(editingOffer.id, { imageUrl: newUrl });
                              return { success: true };
                            }
                          : undefined
                      }
                      onDelete={
                        editingOffer
                          ? async (oldUrl) => {
                              await deleteStorageMedia(oldUrl);
                              if (adminProfile?.restaurantId) {
                                await supabase
                                  .from('offers')
                                  .update({ image_url: null, updated_at: new Date().toISOString() })
                                  .eq('id', editingOffer.id)
                                  .eq('restaurant_id', adminProfile.restaurantId);
                              }
                              await updateOffer(editingOffer.id, { imageUrl: null });
                              setOfferImageUrl('');
                              return true;
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE CUSTOMER PREVIEW (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                      <Eye className="w-4 h-4 text-[#FF5A1F]" />
                      <span>{lang === 'ar' ? 'معاينة العرض للزبائن' : 'Live Customer Preview'}</span>
                    </div>

                    {/* Customer Menu Banner Card Preview */}
                    <div
                      className="p-5 rounded-2xl text-white shadow-md relative overflow-hidden transition-all"
                      style={{ backgroundColor: bannerColor }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex flex-col items-center justify-center font-mono font-black text-sm shrink-0">
                          <span>{previewBadge}</span>
                          <span className="text-[9px] font-bold opacity-80 uppercase">DEAL</span>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider">
                          {appliesTo === 'order' && (lang === 'ar' ? 'كامل الطلب' : 'Whole Order')}
                          {appliesTo === 'category' && (targetCategory?.name[lang] || 'Category')}
                          {appliesTo === 'product' && (
                            lang === 'ar'
                              ? `${selectedDishes.length} أطباق محددة`
                              : `${selectedDishes.length} dishes`
                          )}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="font-black text-base leading-snug">{previewTitle}</h4>
                        <p className="text-xs opacity-90 line-clamp-2 mt-1 leading-relaxed">{previewDesc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] opacity-90 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {startDate}
                            {endDate ? ` → ${endDate}` : ''}
                          </span>
                        </div>

                        {hasHappyHour && (
                          <div className="flex items-center gap-1 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {startTime} - {endTime}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* LIVE DISH-BY-DISH PRICING PREVIEW */}
                    {appliesTo === 'product' && (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                          <span className="flex items-center gap-1.5">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF5A1F]" />
                            <span>
                              {lang === 'ar'
                                ? 'معاينة أسعار الأطباق المختارة بعد الخصم'
                                : 'Selected Dishes Pricing Preview'}
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-stone-500 dark:text-stone-300">
                            {selectedDishes.length} {lang === 'ar' ? 'طبق' : 'dishes'}
                          </span>
                        </div>

                        {selectedDishes.length === 0 ? (
                          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-300">
                            {lang === 'ar'
                              ? 'لم يتم تحديد أطباق بعد. اختر الأطباق من القائمة على اليمين لرؤية الأسعار الجديدة.'
                              : 'No dishes selected yet. Check dishes on the left to see their discounted prices.'}
                          </div>
                        ) : (
                          <div className="max-h-44 overflow-y-auto space-y-1.5 pe-1">
                            {selectedDishes.map((dish) => {
                              const disc =
                                type === 'percentage'
                                  ? Math.round((dish.price * (value / 100)) * 100) / 100
                                  : Math.min(dish.price, value);
                              const newPrice = Math.max(0, dish.price - disc);

                              return (
                                <div
                                  key={dish.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={dish.image}
                                      alt={dish.name[lang] || dish.name.en}
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                                        {dish.name[lang] || dish.name.en}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px]">
                                        <span className="line-through font-mono text-stone-500 dark:text-stone-400">
                                          {dish.price} DA
                                        </span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          {lang === 'ar' ? `توفير ${disc} د.ج` : `Save ${disc} DA`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ms-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F]">
                                      {previewBadge}
                                    </span>
                                    <span className="font-mono tabular-nums text-xs font-black text-stone-900 dark:text-stone-100">
                                      {newPrice} DA
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {appliesTo === 'category' && (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2">
                        <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {lang === 'ar'
                              ? `تخفيض شامل لأطباق قسم: ${targetCategory?.name[lang] || targetCategory?.name.en || ''}`
                              : `Category Discount: ${targetCategory?.name[lang] || targetCategory?.name.en || ''}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300">
                          {lang === 'ar'
                            ? `يحصل الزبائن تلقائياً على خصم ${previewBadge} على أي طبق يتم اختياره من هذا القسم.`
                            : `Diners automatically receive a ${previewBadge} discount on any dish ordered from this category.`}
                        </p>
                      </div>
                    )}

                    {appliesTo === 'order' && (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2">
                        <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-[#FF5A1F]" />
                          <span>
                            {lang === 'ar' ? 'خصم على إجمالي الطلب' : 'Whole Order Cart Discount'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300">
                          {lang === 'ar'
                            ? `يتم تطبيق خصم ${previewBadge} عند إرسال الطلب في السلة${minOrderAmount ? ` للطلبات التي تتجاوز ${minOrderAmount} د.ج` : ''}.`
                            : `A ${previewBadge} discount will be deducted from the cart total at checkout${minOrderAmount ? ` for orders exceeding ${minOrderAmount} DA` : ''}.`}
                        </p>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
                      <p className="font-bold text-stone-700 dark:text-stone-300">
                        {lang === 'ar' ? 'حساب السعر التلقائي:' : 'Server Price Guarantee:'}
                      </p>
                      <p>
                        {lang === 'ar'
                          ? 'يتم حساب وتطبيق الخصم على خوادم قاعدة البيانات بصورة آمنة وموثوقة، مع اختيار أفضل خصم تلقائياً.'
                          : 'Discounts are calculated server-side. The best available discount is automatically applied to items or the whole order.'}
                      </p>
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSaving}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      {t.cancel || 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>
                        {editingOffer
                          ? lang === 'ar'
                            ? 'حفظ التعديلات'
                            : 'Save Changes'
                          : lang === 'ar'
                          ? 'إنشاء العرض'
                          : 'Create Promotion'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

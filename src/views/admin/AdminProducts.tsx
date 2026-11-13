import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Product, DishSize, DishExtra, DishComplementGroup } from '../../types';
import { ImageUpload } from '../../components/common/ImageUpload';
import { deleteStorageMedia, supabase } from '../../lib/supabase';
import { CategoryCombobox } from './CategoryCombobox';
import { DishOptionsEditor, validateDishOptions } from './DishOptionsEditor';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Flame,
  Award,
  Sparkles,
  Leaf,
  Eye,
  EyeOff,
  Image,
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
    lang,
    showToast,
    confirmAction,
    adminProfile,
    userRole,
  } = useApp();
  const isAdmin = userRole !== 'staff';
  const { t } = useTranslation(lang);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State for Add / Edit
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formNameFr, setFormNameFr] = useState<string>('');
  const [formNameAr, setFormNameAr] = useState<string>('');
  const [formDescEn, setFormDescEn] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(750);
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formCategoryError, setFormCategoryError] = useState<string | null>(null);
  const [formImage, setFormImage] = useState<string>('');
  const [formPopular, setFormPopular] = useState<boolean>(false);
  const [formNew, setFormNew] = useState<boolean>(false);
  const [formSpicy, setFormSpicy] = useState<boolean>(false);
  const [formVegetarian, setFormVegetarian] = useState<boolean>(false);
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [formSizes, setFormSizes] = useState<DishSize[]>([]);
  const [formExtras, setFormExtras] = useState<DishExtra[]>([]);
  const [formComplements, setFormComplements] = useState<DishComplementGroup[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const openAddModal = () => {
    if (!isAdmin) return;
    setEditingProduct(null);
    setFormNameEn('');
    setFormNameFr('');
    setFormNameAr('');
    setFormDescEn('');
    setFormPrice(800);
    setFormCategoryId(categories[0]?.id || '');
    setFormCategoryError(null);
    setFormImage('/src/assets/images/dish_gourmet_burger_1793918999411.jpg');
    setFormPopular(false);
    setFormNew(true);
    setFormSpicy(false);
    setFormVegetarian(false);
    setFormAvailable(true);
    setFormSizes([]);
    setFormExtras([]);
    setFormComplements([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    if (!isAdmin) return;
    setEditingProduct(p);
    setFormNameEn(p.name.en || '');
    setFormNameFr(p.name.fr || '');
    setFormNameAr(p.name.ar || '');
    setFormDescEn(p.description.en || '');
    setFormPrice(p.price);
    setFormCategoryId(p.categoryId);
    setFormCategoryError(null);
    setFormImage(p.image);
    setFormPopular(!!p.isPopular);
    setFormNew(!!p.isNew);
    setFormSpicy(!!p.isSpicy);
    setFormVegetarian(!!p.isVegetarian);
    setFormAvailable(p.isAvailable);
    setFormSizes(Array.isArray(p.sizes) ? JSON.parse(JSON.stringify(p.sizes)) : []);
    setFormExtras(Array.isArray(p.extras) ? JSON.parse(JSON.stringify(p.extras)) : []);
    setFormComplements(Array.isArray(p.complements) ? JSON.parse(JSON.stringify(p.complements)) : []);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryName = formNameEn.trim() || formNameFr.trim() || formNameAr.trim();
    if (!primaryName) {
      showToast(lang === 'ar' ? 'يرجى إدخال اسم الطبق' : 'Please enter a dish name');
      return;
    }

    if (!formCategoryId) {
      setFormCategoryError(
        lang === 'ar'
          ? 'يرجى اختيار أو إنشاء تصنيف للطبق'
          : lang === 'fr'
          ? 'Veuillez sélectionner ou créer une catégorie'
          : 'Please select or create a category'
      );
      showToast(
        lang === 'ar'
          ? 'يرجى تحديد تصنيف للطبق'
          : lang === 'fr'
          ? 'Veuillez sélectionner une catégorie'
          : 'Please select a category'
      );
      return;
    }

    // Validate sizes, extras, complements
    const optionsValidation = validateDishOptions(formSizes, formExtras, formComplements, lang);
    if (!optionsValidation.isValid) {
      showToast(optionsValidation.error || 'Please review options');
      return;
    }

    const payload = {
      categoryId: formCategoryId,
      name: {
        en: formNameEn.trim() || primaryName,
        fr: formNameFr.trim() || primaryName,
        ar: formNameAr.trim() || primaryName,
      },
      description: {
        en: formDescEn.trim(),
        fr: formDescEn.trim(),
        ar: formDescEn.trim(),
      },
      price: Number(formPrice),
      image: formImage || '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
      isPopular: formPopular,
      isNew: formNew,
      isSpicy: formSpicy,
      isVegetarian: formVegetarian,
      isAvailable: formAvailable,
      sizes: formSizes,
      extras: formExtras,
      complements: formComplements,
    };

    setIsSaving(true);
    let success = false;
    if (editingProduct) {
      const oldImage = editingProduct.image;
      success = await updateProduct(editingProduct.id, payload);
      // If image changed and previous image was uploaded to storage, delete the old file
      if (success && oldImage && formImage && oldImage !== formImage) {
        await deleteStorageMedia(oldImage);
      }
    } else {
      success = await addProduct(payload);
    }
    setIsSaving(false);
    if (success) {
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!isAdmin) return;
    const dishTitle = p.name[lang] || p.name.en || p.name.fr || '';
    const message = dishTitle ? `${t.deleteConfirm}\n"${dishTitle}"` : t.deleteConfirm;
    const confirmed = await confirmAction({
      title: t.deleteProduct || 'Delete Dish',
      message,
      confirmLabel: t.delete || 'Delete',
      cancelLabel: t.cancel || 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    // Delete image from storage if hosted in menuqr-media
    if (p.image) {
      await deleteStorageMedia(p.image);
    }
    await deleteProduct(p.id);
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = (p.name.en + p.name.fr + p.name.ar).toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            {t.products} Management
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'ar' ? 'إدارة قائمة الطعام، الأسعار، الصور وتوفر الأطباق' : lang === 'fr' ? 'Gestion du menu, des prix, des photos et de la disponibilité' : 'Catalog management, pricing, images, and availability'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="h-11 px-4 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addProduct}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu dishes..."
            className="w-full h-10 ps-9 pe-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-xs text-stone-700 dark:text-stone-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
        >
          <option value="all">All Categories ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.en} ({products.filter((p) => p.categoryId === c.id).length})
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 text-start">Dish</th>
                <th className="py-3 px-4 text-start">Category</th>
                <th className="py-3 px-4 text-start">Price</th>
                <th className="py-3 px-4 text-start">Badges</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                {isAdmin && <th className="py-3 px-4 text-end">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {filteredProducts.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    {/* Dish image + Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name.en}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                        />
                        <div>
                          <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            {p.name.en}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-300 line-clamp-1 max-w-xs">
                            {p.name.ar} · {p.name.fr}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 font-semibold text-stone-600 dark:text-stone-300">
                      {cat?.name.en || 'General'}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-mono font-black text-stone-900 dark:text-stone-100">
                      {p.price} <span className="text-[#FF5A1F] text-[10px] font-bold">DA</span>
                    </td>

                    {/* Badges */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.isPopular && (
                          <span className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600" title="Popular">
                            <Award className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {p.isNew && (
                          <span className="p-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600" title="New">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {p.isSpicy && (
                          <span className="p-1 rounded bg-red-50 dark:bg-red-950/40 text-red-600" title="Spicy">
                            <Flame className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {p.isVegetarian && (
                          <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" title="Vegetarian">
                            <Leaf className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Availability Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleProductAvailability(p.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                          p.isAvailable
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {p.isAvailable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{p.isAvailable ? 'Available' : 'Disabled'}</span>
                      </button>
                    </td>

                    {/* Actions (Admin only) */}
                    {isAdmin && (
                      <td className="py-3 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 rounded-lg text-stone-400 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dish Modal (Admin only) */}
      {isAdmin && isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                {editingProduct ? t.editProduct : t.addProduct}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4 text-xs">
              {/* Names: English, French, Arabic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                    Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Smash Burger"
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                    Nom (FR)
                  </label>
                  <input
                    type="text"
                    value={formNameFr}
                    onChange={(e) => setFormNameFr(e.target.value)}
                    placeholder="e.g. Burger Smash"
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                    الاسم (عربي)
                  </label>
                  <input
                    type="text"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    placeholder="سماش برغر"
                    dir="rtl"
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-arabic"
                  />
                </div>
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                    {t.category} *
                  </label>
                  <CategoryCombobox
                    value={formCategoryId}
                    onChange={(catId) => {
                      setFormCategoryId(catId);
                      setFormCategoryError(null);
                    }}
                    error={formCategoryError}
                    onClearError={() => setFormCategoryError(null)}
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                    {t.price} (DZD) *
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={10}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescEn}
                  onChange={(e) => setFormDescEn(e.target.value)}
                  placeholder="Ingredients, preparation, sauces..."
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              {/* Image Upload */}
              <ImageUpload
                value={formImage}
                onChange={setFormImage}
                restaurantId={adminProfile?.restaurantId}
                folder="products"
                aspectRatio="square"
                label={lang === 'ar' ? 'صورة الطبق' : lang === 'fr' ? 'Photo du plat' : 'Dish Photo'}
                onUploadAndVerify={
                  editingProduct
                    ? async (newUrl) => {
                        const { data, error } = await supabase
                          .from('products')
                          .update({ image_url: newUrl, updated_at: new Date().toISOString() })
                          .eq('id', editingProduct.id)
                          .eq('restaurant_id', adminProfile?.restaurantId)
                          .select('*');

                        if (error || !data || data.length === 0 || data[0].image_url !== newUrl) {
                          console.error('[AdminProducts] Failed to verify product image update in database:', {
                            error,
                            data,
                            newUrl,
                          });
                          return {
                            success: false,
                            error:
                              lang === 'ar'
                                ? 'تعذر حفظ رابط الصورة في قاعدة البيانات.'
                                : 'Failed to persist image URL in database.',
                          };
                        }

                        // Also update editingProduct and local product state
                        await updateProduct(editingProduct.id, { image: newUrl });
                        return { success: true };
                      }
                    : undefined
                }
              />

              {/* Direct URL alternative */}
              <div>
                <label className="font-bold text-stone-500 dark:text-stone-300 uppercase text-[10px] block mb-1">
                  Or Direct Image URL / Path
                </label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="/src/assets/images/... or https://..."
                  className="w-full h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* Checkboxes: Popular, New, Spicy, Vegetarian, Available */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="accent-[#FF5A1F] w-4 h-4"
                  />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Popular</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formNew}
                    onChange={(e) => setFormNew(e.target.checked)}
                    className="accent-[#FF5A1F] w-4 h-4"
                  />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">New</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSpicy}
                    onChange={(e) => setFormSpicy(e.target.checked)}
                    className="accent-[#FF5A1F] w-4 h-4"
                  />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Spicy</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formVegetarian}
                    onChange={(e) => setFormVegetarian(e.target.checked)}
                    className="accent-[#FF5A1F] w-4 h-4"
                  />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Vegetarian</span>
                </label>
              </div>

              {/* Dish Options Editor: Sizes, Extras, Complements */}
              <DishOptionsEditor
                sizes={formSizes}
                setSizes={setFormSizes}
                extras={formExtras}
                setExtras={setFormExtras}
                complements={formComplements}
                setComplements={setFormComplements}
                lang={lang}
                confirmAction={confirmAction}
                basePrice={Number(formPrice) || 0}
              />

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-50 text-white font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                >
                  {isSaving ? '...' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

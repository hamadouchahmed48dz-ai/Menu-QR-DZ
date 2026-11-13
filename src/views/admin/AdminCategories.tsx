import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { Category } from '../../types';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Tags,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  Drumstick,
  IceCream,
  CupSoda,
  Sparkles,
} from 'lucide-react';

export const AdminCategories: React.FC = () => {
  const {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    lang,
    showToast,
    confirmAction,
    userRole,
  } = useApp();
  const isAdmin = userRole !== 'staff';
  const { t } = useTranslation(lang);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formNameFr, setFormNameFr] = useState<string>('');
  const [formNameAr, setFormNameAr] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('Pizza');

  const availableIcons = ['Pizza', 'Sandwich', 'UtensilsCrossed', 'Drumstick', 'IceCream', 'CupSoda'];

  const openAdd = () => {
    if (!isAdmin) return;
    setEditingCategory(null);
    setFormNameEn('');
    setFormNameFr('');
    setFormNameAr('');
    setFormIcon('Pizza');
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    if (!isAdmin) return;
    setEditingCategory(cat);
    setFormNameEn(cat.name.en);
    setFormNameFr(cat.name.fr);
    setFormNameAr(cat.name.ar);
    setFormIcon(cat.icon);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameEn.trim()) return;

    const payload = {
      name: {
        en: formNameEn.trim(),
        fr: formNameFr.trim() || formNameEn.trim(),
        ar: formNameAr.trim() || formNameEn.trim(),
      },
      icon: formIcon,
      order: editingCategory ? editingCategory.order : categories.length + 1,
    };

    setIsSaving(true);
    let success = false;
    if (editingCategory) {
      success = await updateCategory(editingCategory.id, payload);
    } else {
      const added = await addCategory(payload);
      success = Boolean(added);
    }
    setIsSaving(false);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const items = [...categories];
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;
    reorderCategories(items);
    showToast('Categories reordered');
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const items = [...categories];
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;
    reorderCategories(items);
    showToast('Categories reordered');
  };

  const handleDeleteCategory = async (cat: Category) => {
    const catTitle = cat.name[lang] || cat.name.en || cat.name.fr || '';
    const message = catTitle
      ? `${t.deleteCategoryConfirm || 'Are you sure you want to delete this category?'}\n"${catTitle}"`
      : (t.deleteCategoryConfirm || 'Are you sure you want to delete this category?');

    const confirmed = await confirmAction({
      title: t.deleteCategory || 'Delete Category',
      message,
      confirmLabel: t.delete || 'Delete',
      cancelLabel: t.cancel || 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    await deleteCategory(cat.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            {t.categories}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Organize menu tabs, reorder positions, and edit names in EN, FR, and Arabic
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAdd}
            className="h-11 px-4 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Category</span>
          </button>
        )}
      </div>

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, index) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF5A1F] flex items-center justify-center font-bold text-sm">
                  #{index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                    {cat.name.en}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-300">
                    {cat.name.fr} · {cat.name.ar} · {count} dishes
                  </p>
                </div>
              </div>

              {/* Action Buttons: Reorder, Edit, Delete (Admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    className="p-2 rounded-lg text-stone-400 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 disabled:opacity-20 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === categories.length - 1}
                    onClick={() => moveDown(index)}
                    className="p-2 rounded-lg text-stone-400 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 disabled:opacity-20 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-lg text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-2 rounded-lg text-stone-400 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal (Admin only) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                  Name (EN) *
                </label>
                <input
                  type="text"
                  required
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="e.g. Pasta"
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
                  placeholder="e.g. Pâtes"
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
                  placeholder="معكرونة وبسطا"
                  dir="rtl"
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-arabic"
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                  Category Icon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormIcon(ic)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                        formIcon === ic
                          ? 'border-[#FF5A1F] bg-orange-50 dark:bg-orange-950/40 text-[#FF5A1F] font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-200'
                      }`}
                    >
                      <span>{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  lang?: 'en' | 'fr' | 'ar';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  lang = 'en',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isRtl = lang === 'ar';
  const defaultConfirm =
    confirmLabel ||
    (variant === 'danger'
      ? lang === 'ar'
        ? 'حذف'
        : lang === 'fr'
        ? 'Supprimer'
        : 'Delete'
      : lang === 'ar'
      ? 'تأكيد'
      : lang === 'fr'
      ? 'Confirmer'
      : 'Confirm');

  const defaultCancel =
    cancelLabel ||
    (lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel');

  const defaultTitle =
    title ||
    (variant === 'danger'
      ? lang === 'ar'
        ? 'تأكيد الحذف'
        : lang === 'fr'
        ? 'Confirmer la suppression'
        : 'Confirm Deletion'
      : lang === 'ar'
      ? 'تأكيد العملية'
      : lang === 'fr'
      ? 'Confirmer'
      : 'Confirm Action');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-start animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-[#FF5A1F] dark:text-orange-400'
              }`}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              ) : (
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-50 tracking-tight">
                {defaultTitle}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                {lang === 'ar'
                  ? 'يرجى تأكيد رغبتك في المتابعة'
                  : lang === 'fr'
                  ? 'Veuillez confirmer pour continuer'
                  : 'Please confirm to proceed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-normal whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs sm:text-sm transition-all active:scale-95"
          >
            {defaultCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                : 'bg-[#FF5A1F] hover:bg-orange-600 shadow-orange-500/20'
            }`}
          >
            {variant === 'danger' ? <Trash2 className="w-4 h-4" /> : null}
            <span>{defaultConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

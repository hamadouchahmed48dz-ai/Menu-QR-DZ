import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  uploadStorageMedia,
  deleteStorageMedia,
  isSupabaseConfigured,
  StorageFolder,
} from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

export interface ImageUploadProps {
  /**
   * The current image public URL or path
   */
  value: string;
  /**
   * Callback invoked when the image URL changes (or is cleared)
   */
  onChange: (url: string) => void;
  /**
   * Admin restaurant ID (enforced as first path segment: <restaurantId>/<folder>/<uuid>.<ext>)
   */
  restaurantId?: string;
  /**
   * Media subfolder: products, logo, cover, offers
   */
  folder?: StorageFolder;
  /**
   * Label above the upload input
   */
  label?: string;
  /**
   * Container CSS class name
   */
  className?: string;
  /**
   * Visual aspect ratio for preview container
   */
  aspectRatio?: 'square' | 'circle' | 'cover' | 'auto';
  /**
   * Optional hook called immediately after storage upload to save and verify row in database.
   * If this callback returns { success: false, error }, the newly uploaded file is rolled back/deleted.
   */
  onUploadAndVerify?: (newUrl: string, oldUrl?: string) => Promise<{ success: boolean; error?: string }>;
  /**
   * Optional hook called when the user clicks remove/delete image
   */
  onDelete?: (oldUrl: string) => Promise<boolean>;
  /**
   * Legacy prop compatibility
   */
  bucket?: string;
  folderPrefix?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  restaurantId: propRestaurantId,
  folder = 'products',
  label,
  className = '',
  aspectRatio = 'square',
  onUploadAndVerify,
  onDelete,
}) => {
  const { lang, adminProfile, currentRestaurantId, showToast } = useApp();

  // Resolved restaurant ID: props > adminProfile.restaurantId > currentRestaurantId
  const effectiveRestaurantId =
    propRestaurantId || adminProfile?.restaurantId || currentRestaurantId || '';

  const [uploading, setUploading] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<'idle' | 'resizing' | 'uploading' | 'verifying'>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview if value changes externally
  useEffect(() => {
    if (value) {
      setLocalPreviewUrl(value);
    } else {
      setLocalPreviewUrl(null);
    }
  }, [value]);

  const getStageText = () => {
    switch (progressStage) {
      case 'resizing':
        return lang === 'ar'
          ? 'جارٍ تحسين وضغط الصورة (WebP 80%)...'
          : lang === 'fr'
          ? 'Optimisation et compression (WebP 80%)...'
          : 'Optimizing & compressing image (WebP 80%)...';
      case 'uploading':
        return lang === 'ar'
          ? `جارٍ الرفع السحابي... ${progressPercent}%`
          : lang === 'fr'
          ? `Téléchargement dans le cloud... ${progressPercent}%`
          : `Uploading to cloud storage... ${progressPercent}%`;
      case 'verifying':
        return lang === 'ar'
          ? 'جارٍ التحقق وحفظ الصورة في قاعدة البيانات...'
          : lang === 'fr'
          ? 'Vérification et enregistrement...'
          : 'Verifying and saving in database...';
      default:
        return lang === 'ar' ? 'جارٍ المعالجة...' : 'Processing...';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Initial MIME and size quick validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = /\.(jpe?g|png|webp)$/i;
    if (!allowedTypes.includes(file.type.toLowerCase()) && !allowedExts.test(file.name)) {
      const err =
        lang === 'ar'
          ? 'نوع الملف غير مدعوم. الصيغ المقبولة: JPEG و PNG و WebP فقط.'
          : lang === 'fr'
          ? 'Format non supporté. Formats acceptés : JPEG, PNG, WebP uniquement.'
          : 'Unsupported file format. Only JPEG, PNG, and WebP are accepted.';
      setError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const err =
        lang === 'ar'
          ? 'حجم الصورة كبير جداً (أكثر من 5 ميغابايت). يرجى اختيار صورة أصغر.'
          : lang === 'fr'
          ? "L'image dépasse la taille limite de 5 Mo."
          : 'Image file size exceeds 5 MB limit.';
      setError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!effectiveRestaurantId) {
      const err =
        lang === 'ar'
          ? 'معرف المطعم غير متاح لرفع الصورة. يرجى إعادة تحميل الصفحة.'
          : lang === 'fr'
          ? 'Identifiant du restaurant manquant. Veuillez rafraîchir.'
          : 'Missing restaurant ID for media upload. Please refresh.';
      setError(err);
      return;
    }

    setUploading(true);
    setProgressStage('resizing');
    setProgressPercent(15);

    // Immediate client-side temporary preview while processing
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);

    try {
      if (!isSupabaseConfigured()) {
        // Dev fallback if keys aren't set
        onChange(objectUrl);
        setUploading(false);
        setProgressStage('idle');
        return;
      }

      // Upload to menuqr-media: <restaurantId>/<folder>/<uuid>.<ext>
      const uploadResult = await uploadStorageMedia({
        file,
        restaurantId: effectiveRestaurantId,
        folder,
        lang,
        onProgress: (stage, percent) => {
          setProgressStage(stage);
          setProgressPercent(percent);
        },
      });

      if (uploadResult.error || !uploadResult.url) {
        setError(uploadResult.error || 'Failed to upload image');
        setLocalPreviewUrl(value || null);
        return;
      }

      const newUrl = uploadResult.url;
      const previousUrl = value;

      // Verification hook (saves in row and verifies row updated)
      if (onUploadAndVerify) {
        setProgressStage('verifying');
        setProgressPercent(90);

        const verifyResult = await onUploadAndVerify(newUrl, previousUrl);
        if (!verifyResult.success) {
          console.error('[ImageUpload] Row verification failed. Rolling back uploaded file:', {
            newUrl,
            error: verifyResult.error,
          });
          // Roll back: delete newly uploaded file from storage
          await deleteStorageMedia(newUrl);

          const err =
            verifyResult.error ||
            (lang === 'ar'
              ? 'تعذر تحديث الصورة في قاعدة البيانات.'
              : lang === 'fr'
              ? "Échec de la mise à jour de l'image en base de données."
              : 'Failed to update image in database.');
          setError(err);
          setLocalPreviewUrl(value || null);
          return;
        }

        // Successfully verified and saved! Delete old file from storage
        if (previousUrl && previousUrl !== newUrl) {
          await deleteStorageMedia(previousUrl);
        }
      } else {
        // If no direct database verification hook is passed (e.g. creating new dish before submit),
        // delete previous uncommitted upload if it belongs to menuqr-media
        if (previousUrl && previousUrl !== newUrl && previousUrl.includes('menuqr-media')) {
          await deleteStorageMedia(previousUrl);
        }
      }

      // Update state
      setLocalPreviewUrl(newUrl);
      onChange(newUrl);
      setError(null);

      showToast(
        lang === 'ar'
          ? 'تم رفع الصورة وحفظها بنجاح!'
          : lang === 'fr'
          ? 'Image téléchargée et enregistrée avec succès !'
          : 'Image uploaded and saved successfully!'
      );
    } catch (err: any) {
      console.error('[ImageUpload Exception]', err);
      setError(err?.message || 'Failed to upload image');
      setLocalPreviewUrl(value || null);
    } finally {
      setUploading(false);
      setProgressStage('idle');
      setProgressPercent(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) return;

    const oldUrl = value;
    if (onDelete) {
      setUploading(true);
      await onDelete(oldUrl);
      setUploading(false);
    } else if (oldUrl) {
      await deleteStorageMedia(oldUrl);
    }

    setLocalPreviewUrl(null);
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isCircle = aspectRatio === 'circle' || folder === 'logo';
  const isCover = aspectRatio === 'cover' || folder === 'cover';

  const previewClass = isCircle
    ? 'w-24 h-24 rounded-full object-cover border-2 border-stone-200 dark:border-stone-700 shadow-md ring-4 ring-orange-500/10'
    : isCover
    ? 'aspect-video w-full max-h-48 rounded-2xl object-cover border border-stone-200 dark:border-stone-700 shadow-xs'
    : aspectRatio === 'square'
    ? 'h-24 w-24 rounded-2xl object-cover border border-stone-200 dark:border-stone-700 shadow-xs'
    : 'h-28 w-full rounded-2xl object-cover border border-stone-200 dark:border-stone-700 shadow-xs';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] tracking-wider block">
          {label}
        </label>
      )}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative group border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          error
            ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20'
            : localPreviewUrl
            ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 hover:border-orange-500/50'
            : 'border-stone-300 dark:border-stone-700 hover:border-[#FF5A1F] hover:bg-orange-50/20 dark:hover:bg-orange-950/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading ? (
          /* ======================================================== */
          /* PROGRESS BAR & SPINNER STATE                             */
          /* ======================================================== */
          <div className="py-4 px-2 w-full max-w-sm flex flex-col items-center gap-2.5 text-stone-700 dark:text-stone-200">
            <Loader2 className="w-7 h-7 animate-spin text-[#FF5A1F]" />
            <div className="w-full space-y-1.5 text-center">
              <p className="text-xs font-bold">{getStageText()}</p>
              <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF5A1F] h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-stone-400">
              {lang === 'ar' ? 'جارٍ المعالجة في المتصفح والرفع...' : 'Processing & uploading...'}
            </p>
          </div>
        ) : localPreviewUrl ? (
          /* ======================================================== */
          /* PREVIEW READY STATE                                      */
          /* ======================================================== */
          <div className="relative w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={`flex ${isCover ? 'flex-col sm:flex-row' : 'items-center'} gap-3 w-full sm:w-auto`}>
              <img
                src={localPreviewUrl}
                alt="Uploaded Preview"
                className={`${previewClass} shrink-0`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-start flex-1 min-w-0">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'ar' ? 'الصورة جاهزة ومحفوظة' : lang === 'fr' ? 'Image prête et enregistrée' : 'Image Ready & Saved'}</span>
                </span>
                <p className="text-[11px] text-stone-400 dark:text-stone-400 truncate mt-0.5">
                  {lang === 'ar'
                    ? 'انقر هنا لاستبدال الصورة أو اختيار ملف جديد'
                    : lang === 'fr'
                    ? 'Cliquer pour remplacer ou choisir un fichier'
                    : 'Click to replace or choose new file'}
                </p>
                <span className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500">
                  menuqr-media ({folder})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title={lang === 'ar' ? 'حذف الصورة' : 'Remove image'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'حذف' : lang === 'fr' ? 'Supprimer' : 'Remove'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* EMPTY DROPZONE STATE                                     */
          /* ======================================================== */
          <div className="py-2.5 flex flex-col items-center gap-2 text-stone-500 dark:text-stone-400">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
                {lang === 'ar'
                  ? 'انقر لرفع صورة'
                  : lang === 'fr'
                  ? 'Télécharger une image'
                  : 'Upload Image'}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {lang === 'ar'
                  ? 'JPEG, PNG, WebP (بحد أقصى 5 ميغابايت - تحسين تلقائي)'
                  : 'JPEG, PNG, WebP (max 5 MB - auto optimized)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Localized friendly error notification */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span className="font-bold">{error}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
            }}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

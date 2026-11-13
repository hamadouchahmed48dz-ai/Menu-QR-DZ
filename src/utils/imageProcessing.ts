/**
 * Image processing utilities for MenuQR
 * - Validates file types (JPEG, PNG, WebP only)
 * - Rejects files over 5 MB
 * - Resizes images to max 1200px on the longest side
 * - Compresses images to WebP (or JPEG) at 80% quality
 * - Generates client-side previews
 */

export interface ProcessedImageResult {
  blob: Blob;
  ext: string;
  mimeType: string;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_DIMENSION = 1200; // 1200px

/**
 * Validates and processes an image on the client before upload.
 */
export async function processImageBeforeUpload(
  file: File,
  lang: 'ar' | 'fr' | 'en' = 'en',
  maxDimension: number = MAX_IMAGE_DIMENSION
): Promise<ProcessedImageResult> {
  // 1. Validate file type
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const isExtValid = ALLOWED_EXTENSIONS.test(file.name);

  if (!isMimeValid && !isExtValid) {
    const errorMsg =
      lang === 'ar'
        ? 'نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP فقط.'
        : lang === 'fr'
        ? 'Format de fichier non pris en charge. Veuillez choisir une image JPEG, PNG ou WebP.'
        : 'Unsupported file format. Please upload a JPEG, PNG, or WebP image only.';
    throw new Error(errorMsg);
  }

  // 2. Validate file size (max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const errorMsg =
      lang === 'ar'
        ? 'حجم الصورة كبير جداً (أكثر من 5 ميغابايت). يرجى اختيار صورة أصغر من 5 ميغابايت.'
        : lang === 'fr'
        ? "L'image dépasse la taille maximale autorisée (5 Mo). Veuillez choisir une image plus petite."
        : 'Image file size exceeds 5 MB. Please select an image smaller than 5 MB.';
    throw new Error(errorMsg);
  }

  // 3. Load image to read natural dimensions
  const img = await loadImageElement(file);
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (!naturalWidth || !naturalHeight) {
    const errorMsg =
      lang === 'ar'
        ? 'تعذر قراءة أبعاد الصورة. الملف قد يكون تالفاً.'
        : lang === 'fr'
        ? "Impossible de lire les dimensions de l'image. Le fichier est peut-être corrompu."
        : 'Failed to read image dimensions. The file may be corrupted.';
    throw new Error(errorMsg);
  }

  // 4. Calculate target dimensions (maxDimension on longest side, keep aspect ratio)
  const targetMax = Math.max(100, maxDimension);
  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (naturalWidth > targetMax || naturalHeight > targetMax) {
    if (naturalWidth >= naturalHeight) {
      targetWidth = targetMax;
      targetHeight = Math.max(1, Math.round((naturalHeight * targetMax) / naturalWidth));
    } else {
      targetHeight = targetMax;
      targetWidth = Math.max(1, Math.round((naturalWidth * targetMax) / naturalHeight));
    }
  }

  // 5. Render onto HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const errorMsg =
      lang === 'ar'
        ? 'تعذر معالجة الصورة في المتصفح.'
        : lang === 'fr'
        ? "Impossible d'initialiser le traitement graphique dans le navigateur."
        : 'Failed to initialize canvas graphics context in browser.';
    throw new Error(errorMsg);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 6. Compress to WebP at 80% quality (0.8), with fallback to JPEG at 80%
  let ext = 'webp';
  let mimeType = 'image/webp';
  let compressedBlob = await canvasToBlob(canvas, 'image/webp', 0.8);

  if (!compressedBlob || compressedBlob.type !== 'image/webp') {
    compressedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
    ext = 'jpg';
    mimeType = 'image/jpeg';
  }

  if (!compressedBlob) {
    const errorMsg =
      lang === 'ar'
        ? 'حدث خطأ أثناء ضغط وتحسين الصورة.'
        : lang === 'fr'
        ? "Erreur lors de la compression de l'image."
        : 'Failed to compress image blob.';
    throw new Error(errorMsg);
  }

  const previewUrl = URL.createObjectURL(compressedBlob);

  return {
    blob: compressedBlob,
    ext,
    mimeType,
    previewUrl,
    width: targetWidth,
    height: targetHeight,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
  };
}

/**
 * Loads a File into an HTMLImageElement using an object URL.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file into browser Image element'));
    };

    img.src = objectUrl;
  });
}

/**
 * Wraps canvas.toBlob in a Promise.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

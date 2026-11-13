import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

/**
 * Sanitizes and normalizes the Supabase URL.
 * Automatically strips trailing slashes, /rest/v1, /auth/v1 endpoints which cause
 * "Invalid path specified in request URL" errors from PostgREST.
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const cleaned = rawUrl.trim();
  try {
    const parsed = new URL(cleaned);
    // Returning origin strips any appended paths like /rest/v1 or trailing slashes
    return parsed.origin;
  } catch {
    return cleaned.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  }
}

const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = rawSupabaseAnonKey;

// Validates whether the URL is a real https/http address and anon key is non-placeholder
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('placeholder-menuqr') ||
    supabaseAnonKey.includes('your-anon-public-key') ||
    supabaseAnonKey.includes('placeholder-key')
  ) {
    return false;
  }
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Create the Supabase client
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : // Safe dummy client to prevent runtime crash before user puts in keys
    createClient('https://placeholder-menuqr.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
      },
    });

/**
 * Universal public storage bucket for all MenuQR media (dishes, logos, covers, offers)
 */
export const MEDIA_BUCKET = 'menuqr-media';

export type StorageFolder = 'products' | 'logo' | 'cover' | 'offers';

export interface UploadMediaParams {
  file: File;
  restaurantId: string;
  folder: StorageFolder;
  lang?: 'ar' | 'fr' | 'en';
  maxDimension?: number;
  onProgress?: (step: 'resizing' | 'uploading' | 'verifying', percent: number) => void;
}

export interface UploadMediaResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Extracts the storage relative path (e.g. "<restaurantId>/products/<uuid>.webp")
 * from a public URL or path string. Returns null for external/bundled assets.
 */
export function extractMediaPath(publicUrlOrPath: string): string | null {
  if (!publicUrlOrPath) return null;
  const trimmed = publicUrlOrPath.trim();

  // Ignore bundled local static images, uncompressed unsplash URLs, data/blob URLs
  if (
    trimmed.startsWith('/src/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.includes('images.unsplash.com') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return null;
  }

  // Check Supabase public object URL patterns:
  // /storage/v1/object/public/(menuqr-media|product-images|restaurant-assets)/(<path>)
  const match = trimmed.match(
    /\/storage\/v1\/object\/public\/(?:menuqr-media|product-images|restaurant-assets)\/(.+)$/
  );
  if (match && match[1]) {
    return decodeURIComponent(match[1].split('?')[0]);
  }

  // Check direct bucket mention: /menuqr-media/<path>
  if (trimmed.includes(`/${MEDIA_BUCKET}/`)) {
    const parts = trimmed.split(`/${MEDIA_BUCKET}/`);
    if (parts[1]) return decodeURIComponent(parts[1].split('?')[0]);
  }

  // If already relative path starting with a UUID-like folder (not http/https)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

/**
 * Uploads an image to the menuqr-media bucket.
 * 1. Verifies active admin session
 * 2. Preprocesses image: max 1200px, 80% WebP compression
 * 3. Builds path: <restaurantId>/<folder>/<uuid>.<ext>
 * 4. Uploads with upsert: false and unique filename
 * 5. Returns public URL and path
 */
export async function uploadStorageMedia(params: UploadMediaParams): Promise<UploadMediaResult> {
  const { file, restaurantId, folder, lang = 'en', onProgress } = params;

  if (!isSupabaseConfigured()) {
    return {
      url: null,
      path: null,
      error:
        lang === 'ar'
          ? 'خدمة التخزين السحابي غير مهيأة بعد.'
          : lang === 'fr'
          ? 'Le stockage cloud Supabase n\'est pas encore configuré.'
          : 'Cloud storage is not configured yet.',
    };
  }

  if (!restaurantId) {
    console.error('[Storage Error Details] uploadStorageMedia: missing restaurantId', {
      folder,
      fileName: file.name,
    });
    return {
      url: null,
      path: null,
      error:
        lang === 'ar'
          ? 'معرف المطعم غير محدد.'
          : lang === 'fr'
          ? 'Identifiant du restaurant manquant.'
          : 'Restaurant ID is missing.',
    };
  }

  // 1. Session check to prevent uploading with expired credentials
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      console.error('[Storage Error Details] Admin session is missing or expired:', {
        sessionErr,
        hasSession: !!sessionData?.session,
      });
      return {
        url: null,
        path: null,
        error:
          lang === 'ar'
            ? 'انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً والمحاولة ثانية.'
            : lang === 'fr'
            ? 'Votre session a expiré. Veuillez vous reconnecter et réessayer.'
            : 'Your session has expired. Please log in again and retry.',
      };
    }
  } catch (authException) {
    console.error('[Storage Error Details] Auth check failed:', authException);
    return {
      url: null,
      path: null,
      error:
        lang === 'ar'
          ? 'انتهت صلاحية جلسة تسجيل الدخول.'
          : lang === 'fr'
          ? 'Votre session a expiré.'
          : 'Your session has expired.',
    };
  }

  // 2. Validate, Resize (logo max 512px, cover max 1600px, dishes 1200px), and Compress (WebP 80%) on the client
  onProgress?.('resizing', 20);
  let processed;
  try {
    const targetMaxDim =
      params.maxDimension || (folder === 'logo' ? 512 : folder === 'cover' ? 1600 : 1200);
    // Dynamic import to avoid circular dependency
    const { processImageBeforeUpload } = await import('../utils/imageProcessing');
    processed = await processImageBeforeUpload(file, lang, targetMaxDim);
  } catch (processErr: any) {
    console.error('[Storage Error Details] Image validation/resize error:', processErr);
    return {
      url: null,
      path: null,
      error: processErr?.message || 'Failed to process image',
    };
  }

  // 3. Construct upload path: <restaurantId>/<folder>/<uuid>.<ext>
  onProgress?.('uploading', 50);
  const uniqueUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const filePath = `${restaurantId}/${folder}/${uniqueUuid}.${processed.ext}`;

  // 4. Upload with upsert: false
  try {
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, processed.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: processed.mimeType,
      });

    if (uploadError) {
      const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
      console.error('[Storage Error Details] Upload failed:', {
        message: uploadError.message,
        statusCode,
        error: uploadError,
        bucket: MEDIA_BUCKET,
        filePath,
      });

      // User-friendly non-technical message based on error type
      let friendlyError =
        lang === 'ar'
          ? 'حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.'
          : lang === 'fr'
          ? 'Une erreur est survenue lors du téléchargement. Veuillez réessayer.'
          : 'Failed to upload image. Please try again.';

      if (statusCode === 401 || uploadError.message?.toLowerCase().includes('jwt')) {
        friendlyError =
          lang === 'ar'
            ? 'انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً.'
            : lang === 'fr'
            ? 'Votre session a expiré. Veuillez vous reconnecter.'
            : 'Your session has expired. Please log in again.';
      } else if (
        statusCode === 403 ||
        uploadError.message?.toLowerCase().includes('policy') ||
        uploadError.message?.toLowerCase().includes('permission') ||
        uploadError.message?.toLowerCase().includes('row-level security')
      ) {
        friendlyError =
          lang === 'ar'
            ? 'ليس لديك الصلاحية لرفع ملفات لهذا المطعم.'
            : lang === 'fr'
            ? 'Vous n\'avez pas l\'autorisation de télécharger des fichiers pour ce restaurant.'
            : 'Permission denied for uploading files to this restaurant.';
      } else if (
        uploadError.message?.toLowerCase().includes('failed to fetch') ||
        uploadError.message?.toLowerCase().includes('network')
      ) {
        friendlyError =
          lang === 'ar'
            ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.'
            : lang === 'fr'
            ? 'Erreur de connexion réseau. Veuillez vérifier votre accès Internet.'
            : 'Network connection error. Please check your internet connection.';
      }

      return {
        url: null,
        path: null,
        error: friendlyError,
      };
    }

    onProgress?.('verifying', 85);

    // 5. Get Public URL
    const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

    onProgress?.('verifying', 100);

    return {
      url: publicData.publicUrl,
      path: filePath,
      error: null,
    };
  } catch (networkErr: any) {
    console.error('[Storage Error Details] Network exception during upload:', networkErr);
    return {
      url: null,
      path: null,
      error:
        lang === 'ar'
          ? 'تعذر إتمام الرفع بسبب مشكلة في الاتصال بالإنترنت.'
          : lang === 'fr'
          ? 'Échec du téléchargement en raison d\'un problème de réseau.'
          : 'Upload failed due to a network connection issue.',
    };
  }
}

/**
 * Deletes an image from Supabase Storage (menuqr-media)
 */
export async function deleteStorageMedia(publicUrlOrPath: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !publicUrlOrPath) return false;

  const path = extractMediaPath(publicUrlOrPath);
  if (!path) return true; // External or seed image; no storage file to delete

  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) {
      console.error('[Storage Error Details] Delete image failed:', {
        message: error.message,
        statusCode: (error as any)?.statusCode || (error as any)?.status,
        path,
        bucket: MEDIA_BUCKET,
        error,
      });
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Storage Error Details] Exception during deleteStorageMedia:', {
      message: err?.message,
      path,
      err,
    });
    return false;
  }
}

/**
 * Backward compatibility aliases pointing to the unified menuqr-media bucket
 */
export async function uploadStorageImage(
  _bucket: string,
  file: File,
  folderPrefix: string = 'products'
): Promise<{ url: string | null; error: string | null }> {
  // Infer folder and restaurantId if embedded, else fallback
  const parts = folderPrefix.split('/');
  const restaurantId = parts.length > 1 ? parts[0] : parts[0] || 'general';
  const folder = (parts.length > 1 ? parts[1] : 'products') as StorageFolder;

  const result = await uploadStorageMedia({
    file,
    restaurantId,
    folder,
  });

  return { url: result.url, error: result.error };
}

export async function deleteStorageImage(
  _bucket: string,
  publicUrlOrPath: string
): Promise<boolean> {
  return await deleteStorageMedia(publicUrlOrPath);
}


import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { isSupabaseConfigured, deleteStorageMedia, supabase } from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { ImageUpload } from '../../components/common/ImageUpload';
import { RestaurantStatusCard } from '../../components/admin/RestaurantStatusCard';
import { TeamManagementTab } from '../../components/admin/TeamManagementTab';
import { normalizeUrlInput, openTestLink } from '../../utils/urlValidation';
import { validatePublicBaseUrl, buildTableQrUrl } from '../../utils/publicUrl';
import {
  PrintSettings,
  PaperWidth,
  TicketFontSize,
  getDefaultPrintSettings,
  loadPrintSettings,
  savePrintSettings,
} from '../../utils/printSettings';
import {
  PrintableDocumentPayload,
  buildOrderPrintDocument,
  createSampleTestOrder,
  executeHiddenIframePrint,
} from '../../utils/printEngine';
import { PrintFallbackModal } from '../../components/admin/PrintFallbackModal';
import {
  Save,
  Store,
  Clock,
  Phone,
  MapPin,
  DollarSign,
  Users,
  Mail,
  Shield,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Lock,
  User,
  Loader2,
  Share2,
  Eye,
  FileText,
  AlertCircle,
  Sparkles,
  Printer,
  Link2,
  Info,
} from 'lucide-react';

// Platform Brand Icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = 'w-4 h-4' }) => {
  switch (platform) {
    case 'facebook':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'snapchat':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.004 0c-4.49 0-7.854 3.055-7.854 6.787 0 .895.203 1.875.54 2.802-.27.08-.553.136-.838.167-.783.085-1.328.614-1.328 1.285 0 .57.404 1.058 1.01 1.22.428.115.827-.087 1.134-.249.255.672.637 1.258 1.127 1.73-.398.54-.93.978-1.572 1.284-.66.314-1.12.923-1.12 1.624 0 .964.872 1.688 2.072 1.72.646.018 1.343-.16 2.012-.446.544.75 1.393 1.246 2.457 1.36.31.034.628.051.95.051.323 0 .64-.017.95-.051 1.064-.114 1.913-.61 2.457-1.36.67.286 1.366.464 2.012.446 1.2-.032 2.072-.756 2.072-1.72 0-.701-.46-1.31-1.12-1.624-.642-.306-1.174-.744-1.572-1.284.49-.472.872-1.058 1.127-1.73.307.162.706.364 1.134.249.606-.162 1.01-.65 1.01-1.22 0-.671-.545-1.2-1.328-1.285-.285-.031-.568-.087-.838-.167.337-.927.54-1.907.54-2.802C19.858 3.055 16.494 0 12.004 0z" />
        </svg>
      );
    case 'x':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.87 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.965z" />
        </svg>
      );
    case 'website':
    default:
      return <Globe className={className} />;
  }
};

const SOCIAL_PLATFORMS: Array<{
  key: 'facebookUrl' | 'instagramUrl' | 'tiktokUrl' | 'youtubeUrl' | 'snapchatUrl' | 'xUrl' | 'telegramUrl' | 'websiteUrl';
  id: string;
  name: string;
  placeholder: string;
  colorClass: string;
}> = [
  {
    key: 'facebookUrl',
    id: 'facebook',
    name: 'Facebook',
    placeholder: 'https://facebook.com/yourrestaurant',
    colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
  },
  {
    key: 'instagramUrl',
    id: 'instagram',
    name: 'Instagram',
    placeholder: 'https://instagram.com/yourrestaurant',
    colorClass: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/60',
  },
  {
    key: 'tiktokUrl',
    id: 'tiktok',
    name: 'TikTok',
    placeholder: 'https://tiktok.com/@yourrestaurant',
    colorClass: 'text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700',
  },
  {
    key: 'youtubeUrl',
    id: 'youtube',
    name: 'YouTube',
    placeholder: 'https://youtube.com/@yourrestaurant',
    colorClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60',
  },
  {
    key: 'snapchatUrl',
    id: 'snapchat',
    name: 'Snapchat',
    placeholder: 'https://snapchat.com/add/yourrestaurant',
    colorClass: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
  },
  {
    key: 'xUrl',
    id: 'x',
    name: 'X (Twitter)',
    placeholder: 'https://x.com/yourrestaurant',
    colorClass: 'text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700',
  },
  {
    key: 'telegramUrl',
    id: 'telegram',
    name: 'Telegram',
    placeholder: 'https://t.me/yourrestaurant',
    colorClass: 'text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60',
  },
  {
    key: 'websiteUrl',
    id: 'website',
    name: 'Website',
    placeholder: 'https://yourrestaurant.com',
    colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
  },
];

export const AdminSettings: React.FC = () => {
  const {
    restaurant,
    updateRestaurant,
    lang,
    showToast,
    adminProfile,
    user,
    userRole,
    updateAdminProfileName,
  } = useApp();
  const { t } = useTranslation(lang);

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'team'>('general');

  // Section 1a: Restaurant details form
  const [name, setName] = useState<string>(restaurant.name || '');
  const [description, setDescription] = useState<string>(
    restaurant.description || (typeof restaurant.tagline === 'object' ? restaurant.tagline?.fr || restaurant.tagline?.en || '' : '')
  );
  const [openingHours, setOpeningHours] = useState<string>(restaurant.openingHours || '');
  const [phone, setPhone] = useState<string>(restaurant.phone || '');
  const [whatsapp, setWhatsapp] = useState<string>(restaurant.whatsapp || '');
  const [address, setAddress] = useState<string>(restaurant.address || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>(restaurant.googleMapsUrl || '');
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>(restaurant.currency || 'DZD');
  const [weekStartDay, setWeekStartDay] = useState<'saturday' | 'sunday' | 'monday'>(
    restaurant.weekStartDay || 'saturday'
  );
  const [logo, setLogo] = useState<string>(restaurant.logo || '');
  const [coverImage, setCoverImage] = useState<string>(restaurant.coverImage || '');
  const [publicBaseUrl, setPublicBaseUrl] = useState<string>(restaurant.publicBaseUrl || '');
  const [publicBaseUrlError, setPublicBaseUrlError] = useState<string | null>(null);

  // Printing preferences per restaurant (stored in non-menuqr_ localStorage key)
  const effectiveRestaurantId = adminProfile?.restaurantId || restaurant.id;
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    loadPrintSettings(effectiveRestaurantId)
  );
  const [testPrintModalPayload, setTestPrintModalPayload] =
    useState<PrintableDocumentPayload | null>(null);
  const [testPrintSandboxNotice, setTestPrintSandboxNotice] = useState<boolean>(false);

  // Section 1c: 8 Social Media Links
  const [socialLinks, setSocialLinks] = useState<{
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    snapchatUrl: string;
    xUrl: string;
    telegramUrl: string;
    websiteUrl: string;
  }>({
    facebookUrl: restaurant.facebookUrl || '',
    instagramUrl: restaurant.instagramUrl || '',
    tiktokUrl: restaurant.tiktokUrl || '',
    youtubeUrl: restaurant.youtubeUrl || '',
    snapchatUrl: restaurant.snapchatUrl || '',
    xUrl: restaurant.xUrl || '',
    telegramUrl: restaurant.telegramUrl || '',
    websiteUrl: restaurant.websiteUrl || '',
  });

  const [socialErrors, setSocialErrors] = useState<Record<string, string | null>>({});

  // Section 1d: My Account
  const [adminFullName, setAdminFullName] = useState<string>(adminProfile?.fullName || '');

  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load initial values from the logged-in admin's restaurant
  useEffect(() => {
    let isMounted = true;
    async function loadAdminSettings() {
      const restId = adminProfile?.restaurantId;
      if (restId && isSupabaseConfigured()) {
        setIsLoadingSettings(true);
        const data = await supabaseService.getRestaurantById(restId);
        if (data && isMounted) {
          setName(data.name || '');
          setDescription(data.description || (typeof data.tagline === 'object' ? data.tagline?.fr || data.tagline?.en || '' : '') || '');
          setOpeningHours(data.openingHours || '');
          setPhone(data.phone || '');
          setWhatsapp(data.whatsapp || '');
          setAddress(data.address || '');
          setGoogleMapsUrl(data.googleMapsUrl || '');
          setCurrency(data.currency || 'DZD');
          setWeekStartDay(data.weekStartDay || 'saturday');
          setLogo(data.logo || '');
          setCoverImage(data.coverImage || '');
          setPublicBaseUrl(data.publicBaseUrl || '');
          setPrintSettings(loadPrintSettings(restId));
          setSocialLinks({
            facebookUrl: data.facebookUrl || '',
            instagramUrl: data.instagramUrl || '',
            tiktokUrl: data.tiktokUrl || '',
            youtubeUrl: data.youtubeUrl || '',
            snapchatUrl: data.snapchatUrl || '',
            xUrl: data.xUrl || '',
            telegramUrl: data.telegramUrl || '',
            websiteUrl: data.websiteUrl || '',
          });
        }
        if (isMounted) setIsLoadingSettings(false);
      } else if (restaurant) {
        setName(restaurant.name || '');
        setDescription(restaurant.description || (typeof restaurant.tagline === 'object' ? restaurant.tagline?.fr || restaurant.tagline?.en || '' : '') || '');
        setOpeningHours(restaurant.openingHours || '');
        setPhone(restaurant.phone || '');
        setWhatsapp(restaurant.whatsapp || '');
        setAddress(restaurant.address || '');
        setGoogleMapsUrl(restaurant.googleMapsUrl || '');
        setCurrency(restaurant.currency || 'DZD');
        setWeekStartDay(restaurant.weekStartDay || 'saturday');
        setLogo(restaurant.logo || '');
        setCoverImage(restaurant.coverImage || '');
        setPublicBaseUrl(restaurant.publicBaseUrl || '');
        setPrintSettings(loadPrintSettings(restaurant.id));
        setSocialLinks({
          facebookUrl: restaurant.facebookUrl || '',
          instagramUrl: restaurant.instagramUrl || '',
          tiktokUrl: restaurant.tiktokUrl || '',
          youtubeUrl: restaurant.youtubeUrl || '',
          snapchatUrl: restaurant.snapchatUrl || '',
          xUrl: restaurant.xUrl || '',
          telegramUrl: restaurant.telegramUrl || '',
          websiteUrl: restaurant.websiteUrl || '',
        });
      }
    }

    loadAdminSettings();
    return () => {
      isMounted = false;
    };
  }, [adminProfile?.restaurantId]);

  // Keep adminFullName in sync with profile
  useEffect(() => {
    if (adminProfile?.fullName) {
      setAdminFullName(adminProfile.fullName);
    }
  }, [adminProfile?.fullName]);

  // Synchronize from updated restaurant state
  useEffect(() => {
    if (adminProfile?.restaurantId && restaurant.id && restaurant.id !== adminProfile.restaurantId) {
      return;
    }
    if (restaurant.name) setName(restaurant.name);
    if (restaurant.description !== undefined) setDescription(restaurant.description);
    if (restaurant.openingHours) setOpeningHours(restaurant.openingHours);
    if (restaurant.phone) setPhone(restaurant.phone);
    if (restaurant.whatsapp !== undefined) setWhatsapp(restaurant.whatsapp);
    if (restaurant.address) setAddress(restaurant.address);
    if (restaurant.googleMapsUrl !== undefined) setGoogleMapsUrl(restaurant.googleMapsUrl);
    if (restaurant.currency) setCurrency(restaurant.currency);
    if (restaurant.logo !== undefined) setLogo(restaurant.logo);
    if (restaurant.coverImage !== undefined) setCoverImage(restaurant.coverImage);
    if (restaurant.publicBaseUrl !== undefined) setPublicBaseUrl(restaurant.publicBaseUrl || '');
    if (restaurant.facebookUrl !== undefined || restaurant.instagramUrl !== undefined) {
      setSocialLinks({
        facebookUrl: restaurant.facebookUrl || '',
        instagramUrl: restaurant.instagramUrl || '',
        tiktokUrl: restaurant.tiktokUrl || '',
        youtubeUrl: restaurant.youtubeUrl || '',
        snapchatUrl: restaurant.snapchatUrl || '',
        xUrl: restaurant.xUrl || '',
        telegramUrl: restaurant.telegramUrl || '',
        websiteUrl: restaurant.websiteUrl || '',
      });
    }
  }, [restaurant, adminProfile?.restaurantId]);

  // Live input handlers for social links with normalization and clear validation errors
  const handleSocialChange = (key: keyof typeof socialLinks, rawValue: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: rawValue }));

    if (!rawValue.trim()) {
      setSocialErrors((prev) => ({ ...prev, [key]: null }));
    } else {
      const res = normalizeUrlInput(rawValue, lang);
      setSocialErrors((prev) => ({ ...prev, [key]: res.error || null }));
    }
  };

  const handleSocialBlur = (key: keyof typeof socialLinks) => {
    const raw = socialLinks[key];
    if (!raw.trim()) {
      setSocialLinks((prev) => ({ ...prev, [key]: '' }));
      setSocialErrors((prev) => ({ ...prev, [key]: null }));
      return;
    }
    const res = normalizeUrlInput(raw, lang);
    if (res.valid && res.value) {
      setSocialLinks((prev) => ({ ...prev, [key]: res.value }));
      setSocialErrors((prev) => ({ ...prev, [key]: null }));
    } else {
      setSocialErrors((prev) => ({ ...prev, [key]: res.error || null }));
    }
  };

  // Live input handler for Google Maps URL
  const handleGoogleMapsChange = (val: string) => {
    setGoogleMapsUrl(val);
    if (!val.trim()) {
      setGoogleMapsError(null);
    } else {
      const res = normalizeUrlInput(val, lang);
      setGoogleMapsError(res.error || null);
    }
  };

  const handleGoogleMapsBlur = () => {
    if (!googleMapsUrl.trim()) {
      setGoogleMapsUrl('');
      setGoogleMapsError(null);
      return;
    }
    const res = normalizeUrlInput(googleMapsUrl, lang);
    if (res.valid && res.value) {
      setGoogleMapsUrl(res.value);
      setGoogleMapsError(null);
    } else {
      setGoogleMapsError(res.error || null);
    }
  };

  const handlePublicBaseUrlChange = (val: string) => {
    setPublicBaseUrl(val);
    if (val === '') {
      setPublicBaseUrlError(null);
    } else {
      const res = validatePublicBaseUrl(val, lang);
      setPublicBaseUrlError(res.error || null);
    }
  };

  const updatePrintSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setPrintSettings((prev) => {
      const next = { ...prev, [key]: value };
      savePrintSettings(effectiveRestaurantId, next);
      return next;
    });
  };

  const handlePrintTestTicket = async (mode: 'kitchen' | 'receipt' = 'kitchen') => {
    const sampleOrder = createSampleTestOrder(restaurant);
    const payload = buildOrderPrintDocument(sampleOrder, restaurant, printSettings, mode, lang);
    const res = await executeHiddenIframePrint(payload.htmlDocument);
    if (res.iframeRestricted || !res.success) {
      setTestPrintSandboxNotice(true);
      setTestPrintModalPayload(payload);
    }
  };

  // Primary single Save button handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Public Website URL, Google Maps, and Social URLs before saving
    let hasValidationError = false;
    const newErrors: Record<string, string | null> = {};

    const publicUrlCheck = validatePublicBaseUrl(publicBaseUrl, lang);
    if (!publicUrlCheck.valid) {
      setPublicBaseUrlError(publicUrlCheck.error || 'Invalid URL');
      hasValidationError = true;
    } else {
      setPublicBaseUrlError(null);
    }

    if (googleMapsUrl.trim()) {
      const gRes = normalizeUrlInput(googleMapsUrl, lang);
      if (!gRes.valid) {
        setGoogleMapsError(gRes.error || 'Invalid link');
        hasValidationError = true;
      }
    }

    const normalizedSocial: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(socialLinks)) {
      if (val.trim()) {
        const res = normalizeUrlInput(val, lang);
        if (!res.valid) {
          newErrors[key] = res.error || 'Invalid URL';
          hasValidationError = true;
        } else {
          normalizedSocial[key] = res.value;
          newErrors[key] = null;
        }
      } else {
        normalizedSocial[key] = null;
        newErrors[key] = null;
      }
    }
    setSocialErrors(newErrors);

    if (hasValidationError) {
      showToast(
        lang === 'ar'
          ? 'يرجى تصحيح الروابط غير الصالحة قبل الحفظ'
          : lang === 'fr'
          ? 'Veuillez corriger les liens invalides avant d\'enregistrer'
          : 'Please correct the invalid links before saving'
      );
      return;
    }

    setIsSaving(true);

    try {
      // Save printing preferences locally per restaurant
      savePrintSettings(effectiveRestaurantId, printSettings);

      // 2. Prepare payload scoped to adminProfile.restaurantId
      const cleanGmaps = googleMapsUrl.trim()
        ? normalizeUrlInput(googleMapsUrl, lang).value || null
        : null;

      const success = await updateRestaurant({
        name: name.trim(),
        description: description.trim(),
        openingHours: openingHours.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        googleMapsUrl: cleanGmaps || undefined,
        publicBaseUrl: publicUrlCheck.value,
        currency,
        weekStartDay,
        logo,
        coverImage,
        facebookUrl: normalizedSocial.facebookUrl,
        instagramUrl: normalizedSocial.instagramUrl,
        tiktokUrl: normalizedSocial.tiktokUrl,
        youtubeUrl: normalizedSocial.youtubeUrl,
        snapchatUrl: normalizedSocial.snapchatUrl,
        xUrl: normalizedSocial.xUrl,
        telegramUrl: normalizedSocial.telegramUrl,
        websiteUrl: normalizedSocial.websiteUrl,
      });

      // 3. Update Admin Profile name if modified
      if (adminFullName.trim() && adminFullName.trim() !== (adminProfile?.fullName || '')) {
        await updateAdminProfileName(adminFullName.trim());
      }

      if (success) {
        // Updated state will reflect through context
      }
    } catch (err) {
      console.error('Settings save exception:', err);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ الإعدادات، يرجى المحاولة لاحقاً'
          : 'Failed to save settings, please try again'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            Restaurant {t.settings} &amp; Team
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'ar'
              ? 'الملف التعريفي للمطعم، الهوية البصرية، روابط التواصل وإدارة الحساب'
              : lang === 'fr'
              ? 'Profil du restaurant, identité visuelle, réseaux sociaux et gestion du compte'
              : 'Restaurant profile, visual branding, social media links and account access'}
          </p>
        </div>

        {/* Sub-tab Navigation (Team tab hidden for non-admins) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-200/70 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('general')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'general'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {lang === 'ar' ? 'الإعدادات العامة' : lang === 'fr' ? 'Général' : 'General'}
          </button>
          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveSubTab('team')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'team'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>{lang === 'ar' ? 'طاقم العمل (Team)' : lang === 'fr' ? 'Équipe & Accès' : 'Team'}</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'team' && userRole === 'admin' ? (
        <TeamManagementTab />
      ) : (
        /* ======================================================== */
        /* GENERAL SETTINGS SUB-TAB                                  */
        /* ======================================================== */
        <form onSubmit={handleSave} className="space-y-6">
          {/* ======================================================== */}
          {/* RESTAURANT STATUS (OPEN / CLOSED)                         */}
          {/* ======================================================== */}
          <RestaurantStatusCard />

          {/* ======================================================== */}
          {/* SECTION 1: RESTAURANT PROFILE                            */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                  {lang === 'ar' ? 'الملف التعريفي للمطعم' : lang === 'fr' ? 'Profil du restaurant' : 'Restaurant Profile'}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {lang === 'ar'
                    ? 'الشعار الدائري، الاسم، الوصف التفصيلي ومعلومات التواصل'
                    : lang === 'fr'
                    ? 'Logo circulaire, nom, description et coordonnées du restaurant'
                    : 'Circular logo, name, description and direct contact information'}
                </p>
              </div>
            </div>

            {/* Circular Logo Upload */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800">
              <ImageUpload
                value={logo}
                onChange={setLogo}
                restaurantId={adminProfile?.restaurantId}
                folder="logo"
                aspectRatio="circle"
                label={lang === 'ar' ? 'شعار المطعم الدائري (Logo)' : lang === 'fr' ? 'Logo circulaire du restaurant' : 'Circular Restaurant Logo'}
                onUploadAndVerify={async (newUrl) => {
                  if (!adminProfile?.restaurantId) return { success: true };
                  const { data, error } = await supabase
                    .from('restaurants')
                    .update({ logo_url: newUrl, updated_at: new Date().toISOString() })
                    .eq('id', adminProfile.restaurantId)
                    .select('*');

                  if (error || !data || data.length === 0 || data[0].logo_url !== newUrl) {
                    console.error('[AdminSettings] Failed to verify logo update in database:', { error, data, newUrl });
                    return {
                      success: false,
                      error: lang === 'ar' ? 'تعذر حفظ رابط الشعار في قاعدة البيانات.' : 'Failed to persist logo in database.',
                    };
                  }

                  await updateRestaurant({ logo: newUrl });
                  return { success: true };
                }}
                onDelete={async (oldUrl) => {
                  const defaultLogo = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&h=120&q=80';
                  await deleteStorageMedia(oldUrl);
                  if (adminProfile?.restaurantId) {
                    await supabase
                      .from('restaurants')
                      .update({ logo_url: defaultLogo, updated_at: new Date().toISOString() })
                      .eq('id', adminProfile.restaurantId);
                  }
                  await updateRestaurant({ logo: defaultLogo });
                  setLogo('');
                  return true;
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Restaurant Name */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <Store className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{lang === 'ar' ? 'اسم المطعم' : lang === 'fr' ? 'Nom du restaurant' : 'Restaurant Name'}</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مطعم النخلة الذهبية' : 'e.g. Le Gourmet Palace'}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* Description (Textarea) */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{lang === 'ar' ? 'نبذة عن المطعم (الوصف)' : lang === 'fr' ? 'Description du restaurant' : 'Restaurant Description'}</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'نبذة ترحيبية تظهر في رأس القائمة للزبائن وتوضح أطباقكم المميزة وساعات العمل...'
                      : 'Short welcoming bio displayed in your digital menu header for customers...'
                  }
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-normal focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'ar' ? 'رقم الهاتف' : lang === 'fr' ? 'Numéro de téléphone' : 'Phone Number'}</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213 21 00 00 00"
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'ar' ? 'واتساب الطلبات' : lang === 'fr' ? 'WhatsApp' : 'WhatsApp Number'}</span>
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+213 550 12 34 56"
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-mono"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>{lang === 'ar' ? 'العنوان الفعلي' : lang === 'fr' ? 'Adresse physique' : 'Physical Address'}</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={lang === 'ar' ? 'شارع ديدوش مراد، الجزائر العاصمة' : 'Rue Didouche Mourad, Alger'}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* Google Maps Link with Live Validation & Test Button */}
              <div className="sm:col-span-2">
                <label className="flex items-center justify-between font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>{lang === 'ar' ? 'رابط خرائط جوجل (Google Maps)' : 'Google Maps Location Link'}</span>
                  </span>
                  {googleMapsUrl && !googleMapsError && (
                    <button
                      type="button"
                      onClick={() => openTestLink(googleMapsUrl)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 lowercase font-semibold cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'تجربة الرابط' : 'test link'}</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={googleMapsUrl}
                    onChange={(e) => handleGoogleMapsChange(e.target.value)}
                    onBlur={handleGoogleMapsBlur}
                    placeholder="https://maps.google.com/?q=..."
                    className={`w-full h-11 px-3.5 rounded-xl border bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:outline-none ${
                      googleMapsError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-stone-200 dark:border-stone-700 focus:ring-[#FF5A1F]'
                    }`}
                  />
                </div>
                {googleMapsError && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{googleMapsError}</span>
                  </p>
                )}
              </div>

              {/* Opening Hours */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'ar' ? 'ساعات العمل' : lang === 'fr' ? 'Horaires d\'ouverture' : 'Opening Hours'}</span>
                </label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="11:30 - 23:30 (Everyday)"
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'ar' ? 'العملة' : 'Currency'}</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                >
                  <option value="DZD">DZD (Algerian Dinar - د.ج)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="MAD">MAD (Moroccan Dirham)</option>
                  <option value="TND">TND (Tunisian Dinar)</option>
                </select>
              </div>

              {/* First Day of the Week (Analytics) */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{lang === 'ar' ? 'أول يوم في الأسبوع (للإحصائيات والتقارير)' : 'First Day of Week'}</span>
                </label>
                <select
                  value={weekStartDay}
                  onChange={(e) => setWeekStartDay(e.target.value as 'saturday' | 'sunday' | 'monday')}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                >
                  <option value="saturday">
                    {lang === 'ar' ? 'السبت (الافتراضي للجزائر)' : 'Saturday (Algeria Default)'}
                  </option>
                  <option value="sunday">
                    {lang === 'ar' ? 'الأحد' : 'Sunday'}
                  </option>
                  <option value="monday">
                    {lang === 'ar' ? 'الإثنين' : 'Monday'}
                  </option>
                </select>
              </div>

              {/* Public Website URL for QR Codes */}
              <div className="sm:col-span-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <label className="flex items-center justify-between font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>
                      {lang === 'ar'
                        ? 'رابط الموقع العام (Public website URL)'
                        : lang === 'fr'
                        ? 'URL publique du site web'
                        : 'Public website URL'}
                    </span>
                  </span>
                  {publicBaseUrl && !publicBaseUrlError && (
                    <button
                      type="button"
                      onClick={() => openTestLink(publicBaseUrl)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 lowercase font-semibold cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'معاينة الرابط' : 'open'}</span>
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={publicBaseUrl}
                  onChange={(e) => handlePublicBaseUrlChange(e.target.value)}
                  placeholder="https://my-menu.vercel.app"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-semibold focus:ring-2 focus:outline-none ${
                    publicBaseUrlError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-stone-200 dark:border-stone-700 focus:ring-[#FF5A1F]'
                  }`}
                />
                {publicBaseUrlError ? (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{publicBaseUrlError}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'يُستخدم في إنشاء روابط QR للطاولات (https:// فقط، بدون شرطة مائلة في النهاية أو مسافات). مثال: '
                      : lang === 'fr'
                      ? 'Utilisé pour les liens QR des tables (https:// uniquement, sans slash final ni espaces). Exemple : '
                      : 'Used for printed table QR links (https:// only, no trailing slash, no spaces). Preview: '}
                    <code className="font-mono text-stone-700 dark:text-stone-300" dir="ltr">
                      {buildTableQrUrl(
                        {
                          slug: restaurant.slug,
                          publicBaseUrl: publicBaseUrl || restaurant.publicBaseUrl || null,
                        },
                        1
                      )}
                    </code>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: COVER IMAGE & LIVE CUSTOMER HEADER PREVIEW    */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                  {lang === 'ar' ? 'صورة الغلاف والمعاينة المباشرة' : lang === 'fr' ? 'Bannière de couverture & Aperçu' : 'Cover Banner & Live Header Preview'}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {lang === 'ar'
                    ? 'صورة أفقية 16:9 تظهر في أعلى قائمة الزبائن مع معاينة تفاعلية حية'
                    : lang === 'fr'
                    ? 'Bannière 16:9 au sommet du menu client avec simulation en direct'
                    : '16:9 panoramic banner for the customer menu header with live instant preview'}
                </p>
              </div>
            </div>

            {/* Cover Banner Upload with 16:9 preview and Remove button */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800">
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                restaurantId={adminProfile?.restaurantId}
                folder="cover"
                aspectRatio="cover"
                label={lang === 'ar' ? 'صورة الغلاف الأفقية (16:9)' : lang === 'fr' ? 'Bannière de couverture (16:9)' : 'Panoramic Cover Banner (16:9)'}
                onUploadAndVerify={async (newUrl) => {
                  if (!adminProfile?.restaurantId) return { success: true };
                  const { data, error } = await supabase
                    .from('restaurants')
                    .update({ cover_url: newUrl, updated_at: new Date().toISOString() })
                    .eq('id', adminProfile.restaurantId)
                    .select('*');

                  if (error || !data || data.length === 0 || data[0].cover_url !== newUrl) {
                    console.error('[AdminSettings] Failed to verify cover update in database:', { error, data, newUrl });
                    return {
                      success: false,
                      error: lang === 'ar' ? 'تعذر حفظ رابط الغلاف في قاعدة البيانات.' : 'Failed to persist cover in database.',
                    };
                  }

                  await updateRestaurant({ coverImage: newUrl });
                  return { success: true };
                }}
                onDelete={async (oldUrl) => {
                  const defaultCover = '/src/assets/images/restaurant_cover_interior_1793918997325.jpg';
                  await deleteStorageMedia(oldUrl);
                  if (adminProfile?.restaurantId) {
                    await supabase
                      .from('restaurants')
                      .update({ cover_url: defaultCover, updated_at: new Date().toISOString() })
                      .eq('id', adminProfile.restaurantId);
                  }
                  await updateRestaurant({ coverImage: defaultCover });
                  setCoverImage('');
                  return true;
                }}
              />
            </div>

            {/* Live Preview Card: How customer menu header looks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{lang === 'ar' ? 'معاينة حية: كيف يرى الزبون رأس القائمة' : 'Live Preview: Customer Menu Header'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-[#FF5A1F] uppercase tracking-wider font-extrabold">
                  {lang === 'ar' ? 'مباشر' : 'Live Mockup'}
                </span>
              </div>

              {/* Mockup Frame */}
              <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-md bg-white dark:bg-stone-900">
                {/* Banner Area */}
                <div className="relative h-36 sm:h-44 w-full bg-stone-900 overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Preview Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white/50 text-xs"
                      style={{
                        background: 'linear-gradient(135deg, #FF5A1F 0%, #1c1917 100%)',
                      }}
                    >
                      <span>{lang === 'ar' ? 'التدرج اللوني الافتراضي' : 'Default Theme Gradient'}</span>
                    </div>
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                  {/* Circular Logo Overlapping Header */}
                  <div className="absolute bottom-3 left-4 rtl:left-auto rtl:right-4 flex items-end gap-3 z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white dark:border-stone-900 bg-white dark:bg-stone-850 shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-8 h-8 text-[#FF5A1F]" />
                      )}
                    </div>
                    <div className="text-white pb-1">
                      <h4 className="text-base sm:text-lg font-black drop-shadow-md leading-tight">
                        {name || 'Restaurant Name'}
                      </h4>
                      <p className="text-[11px] text-stone-200/90 line-clamp-1 max-w-xs drop-shadow-xs">
                        {description || 'Welcoming bio & cuisine description...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header Info Bottom Strip */}
                <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-850/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>{openingHours || 'Open: 11:30 - 23:30'}</span>
                  </div>
                  {address && (
                    <div className="hidden sm:flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[11px]">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: SOCIAL MEDIA LINKS (8 PLATFORMS)               */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                    {lang === 'ar' ? 'روابط شبكات التواصل الاجتماعي' : lang === 'fr' ? 'Réseaux sociaux' : 'Social Media Links'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'تظهر أزرارها الدائرية تلقائياً في أسفل قائمة الزبائن للمنصات المدخلة فقط'
                      : lang === 'fr'
                      ? 'Icônes circulaires affichées en bas du menu uniquement pour les plateformes renseignées'
                      : 'Round branded icons appear in the customer menu footer only for platforms with a link'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 hidden sm:inline-block">
                8 {lang === 'ar' ? 'منصات' : 'platforms'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
              {SOCIAL_PLATFORMS.map((platform) => {
                const currentVal = (socialLinks as any)[platform.key] || '';
                const currentError = socialErrors[platform.key];
                const hasValidUrl = currentVal.trim() && !currentError;

                return (
                  <div
                    key={platform.key}
                    className="p-3 rounded-2xl bg-stone-50/70 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-xs ${platform.colorClass}`}
                        >
                          <PlatformIcon platform={platform.id} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                          {platform.name}
                        </span>
                      </div>

                      {/* Small "Test link" Button */}
                      <button
                        type="button"
                        disabled={!hasValidUrl}
                        onClick={() => openTestLink(currentVal)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          hasValidUrl
                            ? 'bg-stone-200/80 hover:bg-[#FF5A1F] hover:text-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer active:scale-95'
                            : 'opacity-30 cursor-not-allowed text-stone-400 dark:text-stone-600'
                        }`}
                        title={lang === 'ar' ? 'فتح الرابط لتجربته في تبويب جديد' : 'Test link in new tab'}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{lang === 'ar' ? 'تجربة' : 'Test'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                        onBlur={() => handleSocialBlur(platform.key)}
                        placeholder={platform.placeholder}
                        maxLength={300}
                        className={`w-full h-10 px-3 rounded-xl border bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:outline-none transition-all text-xs ${
                          currentError
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-stone-200 dark:border-stone-700 focus:ring-[#FF5A1F]'
                        }`}
                      />
                    </div>

                    {currentError && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{currentError}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3.5: PRINTING & THERMAL TICKETS                  */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                    {lang === 'ar'
                      ? 'إعدادات الطباعة والتذاكر الحرارية'
                      : lang === 'fr'
                      ? 'Impression & Tickets Thermiques'
                      : 'Printing & Thermal Tickets'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'عرض الورق، حجم الخط، نص التذييل، والطباعة التلقائية لتذاكر المطبخ'
                      : lang === 'fr'
                      ? 'Largeur papier, police, pied de page et impression automatique en cuisine'
                      : 'Paper width, font scale, receipt footers and automatic kitchen printing'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintTestTicket('kitchen')}
                  className="h-9 px-3.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>
                    {lang === 'ar'
                      ? 'طباعة تذكرة تجريبية'
                      : lang === 'fr'
                      ? 'Imprimer un ticket test'
                      : 'Print test ticket'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintTestTicket('receipt')}
                  className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'ar'
                      ? 'فاتورة تجريبية'
                      : lang === 'fr'
                      ? 'Reçu test'
                      : 'Test receipt'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Paper Width */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] block mb-1.5">
                  {lang === 'ar' ? 'عرض الورق' : lang === 'fr' ? 'Largeur papier' : 'Paper width'}
                </label>
                <select
                  value={printSettings.paperWidth}
                  onChange={(e) => updatePrintSetting('paperWidth', e.target.value as PaperWidth)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                >
                  <option value="58mm">58 mm (Thermal Roll)</option>
                  <option value="80mm">80 mm (Thermal POS)</option>
                  <option value="A4">A4 (Office Printer)</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] block mb-1.5">
                  {lang === 'ar' ? 'حجم الخط' : lang === 'fr' ? 'Taille de police' : 'Font size'}
                </label>
                <select
                  value={printSettings.fontSize}
                  onChange={(e) => updatePrintSetting('fontSize', e.target.value as TicketFontSize)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                >
                  <option value="small">
                    {lang === 'ar' ? 'صغير' : lang === 'fr' ? 'Petite' : 'Small'}
                  </option>
                  <option value="medium">
                    {lang === 'ar' ? 'متوسط' : lang === 'fr' ? 'Moyenne' : 'Medium'}
                  </option>
                  <option value="large">
                    {lang === 'ar' ? 'كبير' : lang === 'fr' ? 'Grande' : 'Large'}
                  </option>
                </select>
              </div>

              {/* Copies */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] block mb-1.5">
                  {lang === 'ar' ? 'عدد النسخ' : lang === 'fr' ? 'Nombre de copies' : 'Number of copies'}
                </label>
                <select
                  value={printSettings.copies}
                  onChange={(e) => updatePrintSetting('copies', Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">
                    {lang === 'ar'
                      ? 'إظهار الشعار على الفاتورة'
                      : lang === 'fr'
                      ? 'Afficher le logo sur le reçu'
                      : 'Show logo on receipt'}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'يُطبع بالأبيض والأسود لتوضيح الطباعة الحرارية'
                      : lang === 'fr'
                      ? 'Imprimé en noir et blanc haute netteté'
                      : 'Printed in high-contrast black & white'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={printSettings.showLogo}
                  onChange={(e) => updatePrintSetting('showLogo', e.target.checked)}
                  className="w-4 h-4 accent-[#FF5A1F] cursor-pointer shrink-0"
                />
              </label>

              <label className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">
                    {lang === 'ar'
                      ? 'إظهار الأسعار في تذكرة المطبخ'
                      : lang === 'fr'
                      ? 'Afficher les prix sur le ticket cuisine'
                      : 'Show prices on kitchen ticket'}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'مُعطّل افتراضياً للتركيز على تحضير الأطباق'
                      : lang === 'fr'
                      ? 'Désactivé par défaut pour la cuisine'
                      : 'Off by default for cleaner kitchen prep slips'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={printSettings.showPricesOnKitchenTicket}
                  onChange={(e) => updatePrintSetting('showPricesOnKitchenTicket', e.target.checked)}
                  className="w-4 h-4 accent-[#FF5A1F] cursor-pointer shrink-0"
                />
              </label>

              {/* Auto Print Toggle */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-2">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">
                      {lang === 'ar'
                        ? 'طباعة تذكرة المطبخ تلقائياً عند وصول طلب جديد'
                        : lang === 'fr'
                        ? 'Imprimer automatiquement le ticket cuisine à chaque nouvelle commande'
                        : 'Auto-print kitchen ticket when a new order arrives'}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      {lang === 'ar'
                        ? 'يطبع كل طلب جديد مرة واحدة فقط أثناء فتح لوحة التحكم'
                        : lang === 'fr'
                        ? 'Imprime chaque nouvelle commande une seule fois tant que le tableau de bord est ouvert'
                        : 'Prints each incoming order once while the dashboard is open'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={printSettings.autoPrintKitchen}
                    onChange={(e) => updatePrintSetting('autoPrintKitchen', e.target.checked)}
                    className="w-4 h-4 accent-[#FF5A1F] cursor-pointer shrink-0"
                  />
                </label>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {lang === 'ar'
                      ? 'ملاحظة: قد يطلب المتصفح تأكيداً عند الطباعة التلقائية أو يحظرها داخل نافذة المعاينة.'
                      : lang === 'fr'
                      ? "Remarque : le navigateur peut demander une confirmation avant l'impression automatique."
                      : 'Note: your browser may prompt for confirmation before printing automatically.'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Language Receipt Footer Texts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 text-[11px] block mb-1">
                  {lang === 'ar' ? 'نص التذييل (عربي)' : 'Footer text (AR)'}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  maxLength={140}
                  value={printSettings.footerAr}
                  onChange={(e) => updatePrintSetting('footerAr', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 text-[11px] block mb-1">
                  {lang === 'ar' ? 'نص التذييل (فرنسي)' : 'Footer text (FR)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={140}
                  value={printSettings.footerFr}
                  onChange={(e) => updatePrintSetting('footerFr', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 text-[11px] block mb-1">
                  {lang === 'ar' ? 'نص التذييل (إنجليزي)' : 'Footer text (EN)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={140}
                  value={printSettings.footerEn}
                  onChange={(e) => updatePrintSetting('footerEn', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const defaults = getDefaultPrintSettings();
                  setPrintSettings(defaults);
                  savePrintSettings(effectiveRestaurantId, defaults);
                }}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 underline cursor-pointer"
              >
                {lang === 'ar'
                  ? 'استعادة إعدادات الطباعة الافتراضية'
                  : lang === 'fr'
                  ? 'Réinitialiser les paramètres d’impression'
                  : 'Reset printing defaults'}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: MY ACCOUNT (ADMIN PROFILE & ROLE)             */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">
                  {lang === 'ar' ? 'حسابي (My Account)' : lang === 'fr' ? 'Mon compte' : 'My Account'}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {lang === 'ar'
                    ? 'الاسم الشخصي للمدير، البريد الإلكتروني وصلاحية الحساب'
                    : lang === 'fr'
                    ? 'Nom complet du gestionnaire, adresse e-mail et rôle d\'accès'
                    : 'Admin full name, authentication email, and account security role'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* Editable Full Name */}
              <div className="sm:col-span-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[10px] block mb-1">
                  {lang === 'ar' ? 'الاسم الكامل للمدير' : 'Admin Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="e.g. Samir Admin"
                  className="w-full h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              {/* Read-only Email with Lock */}
              <div className="sm:col-span-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[10px] block mb-1 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'البريد الإلكتروني (للقراءة فقط)' : 'Email (Read-Only)'}</span>
                  <Lock className="w-3 h-3 text-stone-400" />
                </label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={user?.email || 'admin@restaurant.com'}
                    className="w-full h-11 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-850 text-stone-500 dark:text-stone-400 font-medium cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Role Badge */}
              <div className="sm:col-span-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[10px] block mb-1">
                  {lang === 'ar' ? 'صلاحية الحساب' : 'Role & Permissions'}
                </label>
                <div className="h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-stone-800 dark:text-stone-200 text-xs capitalize">
                      {adminProfile?.role || 'Admin'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {lang === 'ar' ? 'مالك المطعم' : 'Verified Owner'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PRIMARY SINGLE SAVE BUTTON                               */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
              <Sparkles className="w-4 h-4 text-[#FF5A1F] shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'سيتم تحديث القائمة الرقمية للزبائن فوراً بعد الحفظ'
                  : lang === 'fr'
                  ? 'Vos modifications seront immédiatement appliquées au menu en ligne'
                  : 'Customer menu will update immediately upon saving'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto min-w-[200px] h-12 px-7 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ar' ? 'جارٍ الحفظ...' : lang === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حفظ التعديلات' : lang === 'fr' ? 'Enregistrer les modifications' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Test Ticket Print Preview / PDF Fallback Modal */}
      <PrintFallbackModal
        payload={testPrintModalPayload}
        showSandboxNotice={testPrintSandboxNotice}
        onClose={() => {
          setTestPrintModalPayload(null);
          setTestPrintSandboxNotice(false);
        }}
      />
    </div>
  );
};

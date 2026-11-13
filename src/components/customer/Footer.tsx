import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Globe,
  ExternalLink,
  Shield,
} from 'lucide-react';

/**
 * Platform SVG icons for social media links
 */
const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.48-.05 2.75-1.07 3.09-2.51.13-.5.17-1.02.16-1.54V.02h-.03z" />
  </svg>
);

const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 12 5 12 5s6.255 0 7.812.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
  </svg>
);

const SnapchatIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.03 2c-3.3 0-5.96 2.3-6.02 5.58v.43c-.02.43-.22 1.72-.88 2.08-.43.24-1.04.22-1.5.17-.33-.04-.64-.07-.86.11-.29.23-.33.64-.17.96.34.69 1.15 1.19 2.05 1.3.15.02.26.15.26.3 0 .42-.16 1.25-.97 1.65-.63.31-1.42.34-2.12.36-.33.01-.6.18-.7.48-.12.34.02.73.34.94.88.58 2.04.83 3.12.83.18 0 .34.1.42.26.43.91 1.26 1.78 2.45 2.22.44.17.91.24 1.38.24.47 0 .94-.07 1.38-.24 1.19-.44 2.02-1.31 2.45-2.22.08-.16.24-.26.42-.26 1.08 0 2.24-.25 3.12-.83.32-.21.46-.6.34-.94-.1-.3-.37-.47-.7-.48-.7-.02-1.49-.05-2.12-.36-.81-.4-.97-1.23-.97-1.65 0-.15.11-.28.26-.3.9-.11 1.71-.61 2.05-1.3.16-.32.12-.73-.17-.96-.22-.18-.53-.15-.86-.11-.46.05-1.07.07-1.5-.17-.66-.36-.86-1.65-.88-2.08v-.43C17.99 4.3 15.33 2 12.03 2z" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

/**
 * Validates that a string starts strictly with http:// or https://
 */
function isValidExternalUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Extracts raw digits for WhatsApp link (e.g. +213550123456 -> 213550123456)
 */
function getWhatsAppDigits(phoneStr?: string | null): string {
  if (!phoneStr) return '';
  return phoneStr.replace(/\D/g, '');
}

export const Footer: React.FC = () => {
  const { restaurant, lang, setCurrentView } = useApp();
  const { isRTL } = useTranslation(lang);

  const currentYear = new Date().getFullYear();

  // Social Links List - Only platforms that have a verified http/https link
  const socialLinks = [
    {
      name: 'Facebook',
      url: restaurant.facebookUrl,
      icon: FacebookIcon,
      bgColor: 'hover:bg-[#1877F2] hover:text-white',
    },
    {
      name: 'Instagram',
      url: restaurant.instagramUrl,
      icon: InstagramIcon,
      bgColor: 'hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white',
    },
    {
      name: 'TikTok',
      url: restaurant.tiktokUrl,
      icon: TikTokIcon,
      bgColor: 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
    },
    {
      name: 'YouTube',
      url: restaurant.youtubeUrl,
      icon: YouTubeIcon,
      bgColor: 'hover:bg-[#FF0000] hover:text-white',
    },
    {
      name: 'Snapchat',
      url: restaurant.snapchatUrl,
      icon: SnapchatIcon,
      bgColor: 'hover:bg-[#FFFC00] hover:text-black',
    },
    {
      name: 'X',
      url: restaurant.xUrl,
      icon: XIcon,
      bgColor: 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
    },
    {
      name: 'Telegram',
      url: restaurant.telegramUrl,
      icon: TelegramIcon,
      bgColor: 'hover:bg-[#229ED9] hover:text-white',
    },
    {
      name: 'Website',
      url: restaurant.websiteUrl,
      icon: Globe,
      bgColor: 'hover:bg-orange-600 hover:text-white',
    },
  ].filter((item) => isValidExternalUrl(item.url));

  const hasPhone = Boolean(restaurant.phone && restaurant.phone.trim());
  const waDigits = getWhatsAppDigits(restaurant.whatsapp);
  const hasWhatsApp = Boolean(waDigits.length >= 7);
  const hasMaps = isValidExternalUrl(restaurant.googleMapsUrl);
  const hasAddress = Boolean(restaurant.address && restaurant.address.trim());
  const hasOpeningHours = Boolean(restaurant.openingHours && restaurant.openingHours.trim());

  return (
    <footer className="mt-16 pt-10 pb-32 border-t border-stone-200/80 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 text-stone-700 dark:text-stone-300 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 text-center">
        {/* Brand identity */}
        <div className="flex flex-col items-center justify-center space-y-2">
          {restaurant.logo ? (
            <img
              src={restaurant.logo}
              alt={restaurant.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-stone-800 shadow-md ring-2 ring-orange-500/20"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-400 text-white font-black text-xl flex items-center justify-center shadow-md">
              {restaurant.name?.charAt(0) || 'M'}
            </div>
          )}

          <h3 className="text-lg font-black text-stone-900 dark:text-stone-50 tracking-tight">
            {restaurant.name}
          </h3>

          {restaurant.description && (
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>

        {/* Contact and Location Actions */}
        {(hasPhone || hasWhatsApp || hasMaps || hasAddress) && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-semibold">
            {hasPhone && (
              <a
                href={`tel:${restaurant.phone?.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:border-orange-500/50 shadow-xs transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{restaurant.phone}</span>
              </a>
            )}

            {hasWhatsApp && (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {hasMaps && (
              <a
                href={restaurant.googleMapsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:border-orange-500/50 shadow-xs transition-all active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>{lang === 'ar' ? 'الموقع على الخريطة' : lang === 'fr' ? 'Google Maps' : 'Google Maps'}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}

            {hasAddress && !hasMaps && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>{restaurant.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Opening Hours Info */}
        {hasOpeningHours && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <span>
              {lang === 'ar' ? 'ساعات العمل:' : lang === 'fr' ? 'Horaires :' : 'Opening Hours:'}{' '}
              <strong className="font-bold text-stone-800 dark:text-stone-100">{restaurant.openingHours}</strong>
            </span>
          </div>
        )}

        {/* Social Media Circular Icons (ONLY platforms that have a link) */}
        {socialLinks.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {lang === 'ar' ? 'تابعونا على وسائل التواصل' : lang === 'fr' ? 'Suivez-nous' : 'Connect With Us'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${restaurant.name} on ${social.name}`}
                    className={`w-10 h-10 rounded-full bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 ${social.bgColor}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin Switch Portal Button */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
          <p className="font-medium text-[11px]">
            &copy; {currentYear} {restaurant.name}.{' '}
            {lang === 'ar' ? 'جميع الحقوق محفوظة' : lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}.
          </p>

          <button
            onClick={() => setCurrentView('admin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-200/80 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-[11px] transition-all active:scale-95 shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <span>{lang === 'ar' ? 'لوحة تحكم المطعم' : 'Restaurant Admin'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

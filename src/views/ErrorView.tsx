import React from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  ShieldAlert,
  WifiOff,
  Store,
  Utensils,
} from 'lucide-react';

export type ErrorType =
  | '404'
  | 'invalid_table'
  | 'restaurant_unavailable'
  | 'network_error'
  | 'unauthorized'
  | 'server_error';

interface ErrorViewProps {
  type: ErrorType;
  customTitle?: string;
  customMessage?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  type,
  customTitle,
  customMessage,
  onRetry,
}) => {
  const { setCurrentView, restaurant, lang } = useApp();
  const { t } = useTranslation(lang);

  const getErrorContent = () => {
    switch (type) {
      case 'invalid_table':
        return {
          icon: <AlertTriangle className="w-10 h-10 text-amber-500" />,
          title: customTitle || t.tableInvalidTitle,
          message: customMessage || t.tableInvalidScanAgain,
          actionText: t.exploreMenu,
          action: () => setCurrentView('menu'),
        };
      case 'restaurant_unavailable':
        return {
          icon: <Store className="w-10 h-10 text-orange-500" />,
          title: customTitle || 'Restaurant Currently Closed',
          message:
            customMessage ||
            `${restaurant.name} is currently not accepting new orders. Please check back during opening hours (${restaurant.openingHours}).`,
          actionText: 'View Restaurant Hours',
          action: () => setCurrentView('menu'),
        };
      case 'unauthorized':
        return {
          icon: <ShieldAlert className="w-10 h-10 text-red-500" />,
          title: customTitle || 'Staff Access Restricted',
          message:
            customMessage ||
            'Your account role does not have permission to view or modify this administrative setting. Please ask a Restaurant Admin.',
          actionText: 'Return to Orders Kanban',
          action: () => setCurrentView('admin'),
        };
      case 'network_error':
        return {
          icon: <WifiOff className="w-10 h-10 text-sky-500" />,
          title: customTitle || 'Connection Interrupted',
          message:
            customMessage ||
            'Unable to communicate with the restaurant kitchen server. Please verify your connection and try again.',
          actionText: 'Retry Connection',
          action: onRetry || (() => window.location.reload()),
        };
      case '404':
      default:
        return {
          icon: <Utensils className="w-10 h-10 text-stone-400" />,
          title: customTitle || 'Page or Menu Section Not Found',
          message:
            customMessage ||
            'The page or dish you are looking for does not exist or has been moved.',
          actionText: 'Return to Digital Menu',
          action: () => setCurrentView('menu'),
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="min-h-screen bg-[#FAFAF7] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 shadow-xl text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-5">
          {content.icon}
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight leading-tight">
          {content.title}
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-sm">
          {content.message}
        </p>

        <div className="mt-6 w-full space-y-2.5">
          <button
            onClick={content.action}
            className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>{content.actionText}</span>
          </button>

          <button
            onClick={() => setCurrentView('menu')}
            className="w-full h-11 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Customer Menu</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400">
          <span>{restaurant.name} · MenuQR Ordering</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const NetworkBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <aside
      aria-label="Network Status"
      className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
        <span>You are currently browsing offline. Changes will sync when connection returns.</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Reconnect</span>
      </button>
    </aside>
  );
};

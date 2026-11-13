import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { cart, cartCount, cartTotal, setIsCartOpen, lang } = useApp();
  const { t, isRTL } = useTranslation(lang);

  if (cartCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-6 sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full h-14 px-4 bg-[#FF5A1F] hover:bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between border border-orange-400/30 active:scale-98 transition-all group"
      >
        {/* Left: Cart Icon & Item Count */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-stone-950 text-white text-[11px] font-black flex items-center justify-center font-mono ring-2 ring-white">
              {cartCount}
            </span>
          </div>
          <div className="text-start">
            <p className="text-xs uppercase tracking-wider font-semibold opacity-90 leading-tight">
              {t.yourCart}
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums leading-tight">
              {cartTotal} <span className="text-xs font-bold">{t.currency}</span>
            </p>
          </div>
        </div>

        {/* Right: Action Prompt */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-all">
          <span>{t.exploreMenu}</span>
          {isRTL ? (
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          )}
        </div>
      </button>
    </div>
  );
};

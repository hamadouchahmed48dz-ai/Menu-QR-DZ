import React from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { QRCodeSVG } from '../components/common/QRCodeSVG';
import { buildTableQrUrl } from '../utils/publicUrl';
import { Printer, ArrowLeft, Utensils, Smartphone } from 'lucide-react';

export const QRPrintView: React.FC = () => {
  const { tables, restaurant, lang, setCurrentView } = useApp();
  const { t } = useTranslation(lang);

  const getTableMenuUrl = (tableNum: number) => buildTableQrUrl(restaurant, tableNum);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top action bar (hidden on print) */}
      <div className="no-print max-w-5xl mx-auto mb-6 flex items-center justify-between bg-white dark:bg-stone-850 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800">
        <button
          onClick={() => setCurrentView('admin')}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500 hidden sm:inline">
            Print Table Cards (A4 / Letter size)
          </span>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Cards Now</span>
          </button>
        </div>
      </div>

      {/* Printable Cards Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:max-w-none">
        {tables.map((table) => {
          const url = getTableMenuUrl(table.number);
          return (
            <div
              key={table.id}
              className="p-6 rounded-3xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-sm flex flex-col items-center justify-between text-center min-h-[460px] print:bg-white print:text-black print:border-2 print:border-dashed print:border-black print:break-inside-avoid print:shadow-none"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-50">
                  {restaurant.name}
                </h3>
                <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-0.5">
                  Scan to order
                </p>
              </div>

              <div className="my-4 p-2 bg-white dark:bg-white rounded-2xl border border-stone-200 dark:border-stone-700">
                <QRCodeSVG
                  value={url}
                  size={170}
                  tableNumber={table.number}
                />
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-200">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span>Open camera and point at code</span>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-arabic">
                  امسح الرمز بكاميرا هاتفك للطلب مباشرة
                </p>
                <div className="inline-block px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono font-black text-sm">
                  {t.table.toUpperCase()} {table.number}
                </div>
              </div>

              <div className="w-full pt-3 mt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-400 font-mono">
                <span>Table Service</span>
                <span>MenuQR System</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

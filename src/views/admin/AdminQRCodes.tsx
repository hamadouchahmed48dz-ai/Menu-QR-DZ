import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { QRCodeSVG } from '../../components/common/QRCodeSVG';
import { downloadTableQRPng } from '../../utils/qrExport';
import { QRPrintDialogModal } from '../../components/admin/QRPrintDialogModal';
import { RestaurantTable } from '../../types';
import { buildTableQrUrl, isPreviewOrDevOrigin } from '../../utils/publicUrl';
import {
  Printer,
  Download,
  Utensils,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';

export const AdminQRCodes: React.FC = () => {
  const { tables, restaurant, lang, showToast } = useApp();
  const { t } = useTranslation(lang);

  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);
  const [downloadingTableNum, setDownloadingTableNum] = useState<number | null>(null);
  const [tablesToPrint, setTablesToPrint] = useState<RestaurantTable[] | null>(null);

  const showPreviewOriginWarning =
    !restaurant.publicBaseUrl &&
    typeof window !== 'undefined' &&
    isPreviewOrDevOrigin(window.location.origin);

  const getTableMenuUrl = (tableNum: number) => buildTableQrUrl(restaurant, tableNum);

  const handlePrintAll = () => {
    const list =
      selectedTableFilter === 'all'
        ? tables
        : tables.filter((tbl) => tbl.number.toString() === selectedTableFilter);
    if (list.length > 0) setTablesToPrint(list);
  };

  const handlePrintSingle = (tableNum: number) => {
    const target = tables.filter((tbl) => tbl.number === tableNum);
    if (target.length > 0) setTablesToPrint(target);
  };

  const handleDownloadSingle = async (tableNum: number) => {
    try {
      setDownloadingTableNum(tableNum);
      const url = getTableMenuUrl(tableNum);
      await downloadTableQRPng({
        restaurantName: restaurant.name,
        tableNumber: tableNum,
        url,
      });
      showToast(`Downloaded Stand Card for Table ${tableNum}`);
    } catch (e) {
      showToast('Error generating PNG card');
    } finally {
      setDownloadingTableNum(null);
    }
  };

  const handleDownloadAll = async () => {
    if (isExportingAll) return;
    setIsExportingAll(true);
    showToast(`Generating PNG cards for ${tables.length} tables...`);

    try {
      for (let i = 0; i < tables.length; i++) {
        const tbl = tables[i];
        const url = getTableMenuUrl(tbl.number);
        await downloadTableQRPng({
          restaurantName: restaurant.name,
          tableNumber: tbl.number,
          url,
        });
        // Small interval between browser triggers to prevent pop-up blocking
        await new Promise((res) => setTimeout(res, 400));
      }
      showToast(`Exported ${tables.length} QR cards successfully`);
    } catch (e) {
      showToast('Failed to export all cards');
    } finally {
      setIsExportingAll(false);
    }
  };

  const displayedTables =
    selectedTableFilter === 'all'
      ? tables
      : tables.filter((t) => t.number.toString() === selectedTableFilter);

  return (
    <div className="space-y-6">
      {showPreviewOriginWarning && (
        <div className="no-print p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-700/80 text-red-900 dark:text-red-200 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-black text-sm">
              {lang === 'ar'
                ? 'تحذير: رموز QR لن تعمل للزبائن قبل تعيين رابط الموقع العام في الإعدادات!'
                : lang === 'fr'
                ? 'Attention : les QR codes ne fonctionneront pas pour les clients sans URL publique dans Paramètres !'
                : 'Warning: Printed QR codes will NOT work for customers until Public website URL is set in Settings!'}
            </p>
          </div>
        </div>
      )}

      {/* Control Bar (hidden on print) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
              {t.qrCodes} System &amp; Print Stand Cards
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F] text-[11px] font-bold font-mono">
              A4 Print Ready
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Dynamic QR codes matching URL format: <code className="font-mono text-stone-700 dark:text-stone-300">?r={restaurant.slug || 'slug'}&table=N</code>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Table filter selector */}
          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="h-10 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
          >
            <option value="all">All Tables ({tables.length} total)</option>
            {tables.map((tbl) => (
              <option key={tbl.id} value={tbl.number.toString()}>
                Table {tbl.number} Only
              </option>
            ))}
          </select>

          {/* Download all PNGs */}
          <button
            onClick={handleDownloadAll}
            disabled={isExportingAll}
            className="h-10 px-4 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Download PNG for all tables"
          >
            <Download className="w-4 h-4 text-[#FF5A1F]" />
            <span>{isExportingAll ? 'Exporting...' : 'Download All PNGs'}</span>
          </button>

          {/* Print all A4 */}
          <button
            onClick={handlePrintAll}
            className="h-10 px-5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{selectedTableFilter === 'all' ? t.printQR : `Print Table ${selectedTableFilter}`}</span>
          </button>
        </div>
      </div>

      {/* Filter notification if single table selected */}
      {selectedTableFilter !== 'all' && (
        <div className="no-print p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-xs text-orange-800 dark:text-orange-200 flex items-center justify-between">
          <span>Filtering preview to Table {selectedTableFilter} only.</span>
          <button
            onClick={() => setSelectedTableFilter('all')}
            className="font-bold underline text-[#FF5A1F]"
          >
            Show All Tables
          </button>
        </div>
      )}

      {/* Print-Ready Tent Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-6 print:m-0">
        {displayedTables.map((table) => {
          const tableUrl = getTableMenuUrl(table.number);
          const isDownloadingThis = downloadingTableNum === table.number;

          return (
            <div
              key={table.id}
              className="relative p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-850 border-2 border-stone-800/10 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-lg flex flex-col items-center text-center justify-between min-h-[480px] print:shadow-none print:border-2 print:border-stone-800 print:break-inside-avoid print:page-break-after-avoid"
            >
              {/* Card Header: Restaurant Identity */}
              <div className="flex flex-col items-center">
                <div className="w-13 h-13 rounded-2xl bg-[#FF5A1F] text-white flex items-center justify-center mb-2 shadow-sm overflow-hidden">
                  {restaurant.logo ? (
                    <img
                      src={restaurant.logo}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <Utensils className="w-6 h-6" />
                  )}
                </div>
                <h3 className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-50">
                  {restaurant.name}
                </h3>
                <p className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold mt-0.5">
                  Digital Menu &amp; Instant Ordering
                </p>
              </div>

              {/* Center: High-Resolution QR Code */}
              <div className="my-3 p-3.5 bg-white dark:bg-white rounded-2xl border border-stone-200 dark:border-stone-700 shadow-inner">
                <QRCodeSVG
                  value={tableUrl}
                  size={180}
                  tableNumber={table.number}
                />
              </div>

              {/* Call to Action: Scan to Order */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-200">
                  <Smartphone className="w-4 h-4 text-[#FF5A1F]" />
                  <span>{t.scanToOrder}</span>
                </div>

                {/* Multilingual scan instruction subtitle */}
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-arabic">
                  امسح الرمز بكاميرا هاتفك لفتح القائمة والطلب مباشرة
                </p>

                {/* Table Number Badge */}
                <div className="inline-block px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono font-black text-sm tracking-wide shadow-xs">
                  {t.table.toUpperCase()} {table.number}
                </div>
              </div>

              {/* Action Buttons for this card (hidden on physical print) */}
              <div className="no-print w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(table.number)}
                  disabled={isDownloadingThis}
                  className="h-9 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{isDownloadingThis ? 'Exporting...' : 'Download PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintSingle(table.number)}
                  className="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                  <span>Print Card</span>
                </button>
              </div>

              {/* Footer print small credit */}
              <div className="w-full pt-3 mt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-400 font-mono">
                <span>Free WiFi Available</span>
                <span>Powered by MenuQR</span>
              </div>
            </div>
          );
        })}
      </div>

      <QRPrintDialogModal
        isOpen={Boolean(tablesToPrint && tablesToPrint.length > 0)}
        tables={tablesToPrint || []}
        restaurant={restaurant}
        onClose={() => setTablesToPrint(null)}
      />
    </div>
  );
};

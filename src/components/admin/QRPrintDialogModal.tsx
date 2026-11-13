import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Restaurant, RestaurantTable } from '../../types';
import {
  PrintableDocumentPayload,
  QRPrintLayout,
  buildTableQRPrintDocument,
  downloadPrintableAsPdf,
  executeHiddenIframePrint,
} from '../../utils/printEngine';
import {
  Printer,
  FileDown,
  X,
  QrCode,
  Loader2,
  Info,
  Image as ImageIcon,
  LayoutGrid,
} from 'lucide-react';

interface QRPrintDialogModalProps {
  isOpen: boolean;
  tables: RestaurantTable[];
  restaurant: Restaurant;
  onClose: () => void;
}

export const QRPrintDialogModal: React.FC<QRPrintDialogModalProps> = ({
  isOpen,
  tables,
  restaurant,
  onClose,
}) => {
  const { lang, showToast } = useApp();

  const [layout, setLayout] = useState<QRPrintLayout>('6');
  const [showLogo, setShowLogo] = useState<boolean>(Boolean(restaurant.logo));
  const [instructionText, setInstructionText] = useState<string>(
    lang === 'ar'
      ? 'افتح الكاميرا ووجّهها نحو الرمز'
      : lang === 'fr'
      ? 'Ouvrez votre appareil photo pour commander'
      : 'Point your phone camera to browse & order'
  );

  const [payload, setPayload] = useState<PrintableDocumentPayload | null>(null);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [iframePrintNotice, setIframePrintNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || tables.length === 0) {
      setPayload(null);
      return;
    }

    let cancelled = false;
    setIsBuilding(true);

    buildTableQRPrintDocument(tables, restaurant, {
      layout,
      showLogo,
      instructionText,
    })
      .then((doc) => {
        if (!cancelled) {
          setPayload(doc);
        }
      })
      .catch((err) => {
        console.error('Failed to build QR print sheet:', err);
      })
      .finally(() => {
        if (!cancelled) setIsBuilding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tables, restaurant, layout, showLogo, instructionText]);

  if (!isOpen) return null;

  const layoutChoices: Array<{
    id: QRPrintLayout;
    title: string;
    subtitle: string;
  }> = [
    {
      id: '1',
      title: lang === 'ar' ? '1 في الصفحة' : lang === 'fr' ? '1 / page' : '1 per page',
      subtitle: lang === 'ar' ? 'بطاقة طاولة A5' : lang === 'fr' ? 'Chevalet A5' : 'A5 Stand card',
    },
    {
      id: '2',
      title: lang === 'ar' ? '2 في الصفحة' : lang === 'fr' ? '2 / page' : '2 per page',
      subtitle: 'A4 (2×1)',
    },
    {
      id: '6',
      title: lang === 'ar' ? '6 في الصفحة' : lang === 'fr' ? '6 / page' : '6 per page',
      subtitle: lang === 'ar' ? 'شبكة A4' : 'A4 Grid (2×3)',
    },
    {
      id: '12',
      title: lang === 'ar' ? '12 في الصفحة' : lang === 'fr' ? '12 / page' : '12 per page',
      subtitle: lang === 'ar' ? 'ملصقات (≥3 سم)' : lang === 'fr' ? 'Stickers (≥3 cm)' : 'Stickers (≥3 cm)',
    },
  ];

  const handlePrint = async () => {
    if (!payload) return;
    setIsPrinting(true);
    try {
      const res = await executeHiddenIframePrint(payload.htmlDocument);
      if (res.iframeRestricted || !res.success) {
        setIframePrintNotice(true);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!payload) return;
    setIsDownloadingPdf(true);
    try {
      await downloadPrintableAsPdf(payload);
      showToast(
        lang === 'ar'
          ? 'تم تحميل ملف PDF لرموز الطاولات بنجاح'
          : lang === 'fr'
          ? 'PDF des QR codes téléchargé avec succès'
          : 'Table QR codes PDF downloaded'
      );
    } catch {
      showToast(
        lang === 'ar'
          ? 'تعذر إنشاء ملف PDF، يرجى المحاولة مرة أخرى'
          : lang === 'fr'
          ? 'Impossible de générer le PDF, veuillez réessayer'
          : 'Could not generate PDF, please try again'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-50">
                {lang === 'ar'
                  ? `طباعة رموز QR للطاولات (${tables.length})`
                  : lang === 'fr'
                  ? `Imprimer les codes QR (${tables.length} table${tables.length > 1 ? 's' : ''})`
                  : `Print Table QR Codes (${tables.length})`}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {lang === 'ar'
                  ? 'خلفية بيضاء عالية التباين مع حدود قص واضحة'
                  : lang === 'fr'
                  ? 'Fond blanc haute lisibilité avec repères de découpe'
                  : 'High-contrast black on white paper with cut guides'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Controls */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 space-y-4 bg-white dark:bg-stone-900">
          {/* Layout selector */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-2">
              <LayoutGrid className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>
                {lang === 'ar'
                  ? 'تخطيط الصفحة'
                  : lang === 'fr'
                  ? 'Mise en page'
                  : 'Page Layout'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {layoutChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setLayout(choice.id)}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    layout === choice.id
                      ? 'border-[#FF5A1F] bg-orange-500/10 text-stone-900 dark:text-white ring-1 ring-[#FF5A1F]'
                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  <div className="font-extrabold text-xs">{choice.title}</div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {choice.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Show Logo Toggle & Editable Instruction Text */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1">
                {lang === 'ar'
                  ? 'نص التوجيه الإضافي (اختياري)'
                  : lang === 'fr'
                  ? 'Texte d’instruction personnalisé'
                  : 'Instruction text'}
              </label>
              <input
                type="text"
                maxLength={100}
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'امسح الرمز للطلب مباشرة...'
                    : 'Point your phone camera to order...'
                }
                className="w-full h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
              />
            </div>

            <label className="h-10 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-200">
                <ImageIcon className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>
                  {lang === 'ar'
                    ? 'إظهار الشعار'
                    : lang === 'fr'
                    ? 'Afficher le logo'
                    : 'Show logo'}
                </span>
              </span>
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="w-4 h-4 accent-[#FF5A1F] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Sandboxed Iframe Helpful Hint */}
        {iframePrintNotice && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              {lang === 'ar'
                ? 'إذا لم تظهر نافذة الطباعة بسبب بيئة المعاينة، اضغط على "تحميل PDF" لطباعة البطاقات بجودة كاملة.'
                : lang === 'fr'
                ? "Si la fenêtre d'impression est bloquée par l'aperçu, cliquez sur « Télécharger PDF » pour imprimer facilement."
                : 'If native printing is blocked in this embedded preview, click Download PDF to print cleanly.'}
            </span>
          </div>
        )}

        {/* White-Paper Preview Area */}
        <div className="p-5 overflow-auto flex-1 bg-stone-200/80 dark:bg-stone-950">
          {isBuilding || !payload ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-500 dark:text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF5A1F]" />
              <span className="text-xs font-semibold">
                {lang === 'ar' ? 'جاري تجهيز البطاقات...' : 'Generating QR sheets...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className="origin-top shadow-xl"
                style={{
                  transform: 'scale(0.62)',
                  transformOrigin: 'top center',
                  marginBottom: '-32%',
                  colorScheme: 'light',
                }}
                dir="rtl"
                dangerouslySetInnerHTML={{
                  __html: payload.qrPageHtmlList?.[0] || payload.bodyHtml,
                }}
              />
              {(payload.qrPageHtmlList?.length || 1) > 1 && (
                <p className="mt-4 text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  {lang === 'ar'
                    ? `عرض الصفحة 1 من ${payload.qrPageHtmlList?.length}`
                    : lang === 'fr'
                    ? `Aperçu page 1 sur ${payload.qrPageHtmlList?.length}`
                    : `Showing page 1 of ${payload.qrPageHtmlList?.length}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : lang === 'fr' ? 'Fermer' : 'Close'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!payload || isDownloadingPdf}
            className="h-10 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>
              {isDownloadingPdf
                ? lang === 'ar'
                  ? 'جاري الإنشاء...'
                  : 'Generating...'
                : lang === 'ar'
                ? 'تحميل PDF'
                : lang === 'fr'
                ? 'Télécharger PDF'
                : 'Download PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!payload || isPrinting}
            className="h-10 px-5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>
              {lang === 'ar' ? 'طباعة' : lang === 'fr' ? 'Imprimer' : 'Print'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

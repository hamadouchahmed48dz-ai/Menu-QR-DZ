import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PrintableDocumentPayload,
  downloadPrintableAsPdf,
  executeHiddenIframePrint,
} from '../../utils/printEngine';
import { Printer, FileDown, X, Info, Loader2 } from 'lucide-react';

interface PrintFallbackModalProps {
  payload: PrintableDocumentPayload | null;
  onClose: () => void;
  showSandboxNotice?: boolean;
}

export const PrintFallbackModal: React.FC<PrintFallbackModalProps> = ({
  payload,
  onClose,
  showSandboxNotice = false,
}) => {
  const { lang, showToast } = useApp();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printTriedInIframe, setPrintTriedInIframe] = useState(showSandboxNotice);

  if (!payload) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const res = await executeHiddenIframePrint(payload.htmlDocument);
      if (res.iframeRestricted || !res.success) {
        setPrintTriedInIframe(true);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadPrintableAsPdf(payload);
      showToast(
        lang === 'ar'
          ? 'تم تحميل ملف PDF بنجاح'
          : lang === 'fr'
          ? 'PDF téléchargé avec succès'
          : 'PDF downloaded successfully'
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
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#FF5A1F] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-50">
                {lang === 'ar'
                  ? 'معاينة الطباعة و PDF'
                  : lang === 'fr'
                  ? 'Aperçu d’impression & PDF'
                  : 'Print Preview & PDF'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {payload.pageFormat} · {payload.title}
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

        {/* Sandboxed iframe friendly notice */}
        {printTriedInIframe && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar'
                ? 'إذا لم تفتح نافذة الطابعة تلقائياً داخل المعاينة المدمجة، يمكنك تحميل التذكرة كملف PDF وطباعتها مباشرة.'
                : lang === 'fr'
                ? "Si la fenêtre d'impression ne s'ouvre pas dans cet aperçu intégré, téléchargez le document en PDF pour l'imprimer directement."
                : 'If your browser preview blocks the native print dialog, use Download PDF below to print cleanly.'}
            </p>
          </div>
        )}

        {/* Always pure-white paper preview area */}
        <div className="p-5 overflow-y-auto flex-1 bg-stone-200/70 dark:bg-stone-950 flex justify-center">
          <div
            className="bg-white text-black shadow-lg rounded-xl p-4 overflow-x-auto max-w-full"
            dir="rtl"
            style={{ colorScheme: 'light' }}
            dangerouslySetInnerHTML={{ __html: payload.bodyHtml }}
          />
        </div>

        {/* Footer Buttons */}
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
            disabled={isDownloadingPdf}
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
                  ? 'جاري التحضير...'
                  : 'Generating...'
                : lang === 'ar'
                ? 'تحميل كملف PDF'
                : lang === 'fr'
                ? 'Télécharger en PDF'
                : 'Download PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="h-10 px-5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>
              {lang === 'ar' ? 'طباعة الآن' : lang === 'fr' ? 'Imprimer' : 'Print Now'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

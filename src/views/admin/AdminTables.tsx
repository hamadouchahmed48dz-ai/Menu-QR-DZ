import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { QRCodeSVG } from '../../components/common/QRCodeSVG';
import { QRPrintDialogModal } from '../../components/admin/QRPrintDialogModal';
import { RestaurantTable } from '../../types';
import { downloadTableQRPng } from '../../utils/qrExport';
import { isValidUuid } from '../../utils/validation';
import {
  buildTableQrUrl,
  formatShortDisplayUrl,
  isPreviewOrDevOrigin,
} from '../../utils/publicUrl';
import {
  Copy,
  Check,
  ExternalLink,
  Plus,
  Printer,
  Trash2,
  Eye,
  EyeOff,
  X,
  Download,
  AlertTriangle,
  Settings,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AdminTablesProps {
  onNavigateSettings?: () => void;
}

export const AdminTables: React.FC<AdminTablesProps> = ({ onNavigateSettings }) => {
  const {
    tables,
    addTable,
    updateTable,
    deleteTable,
    setActiveTable,
    setCurrentView,
    restaurant,
    userRole,
    lang,
    showToast,
    confirmAction,
  } = useApp();
  const isAdmin = userRole !== 'staff';
  const { t } = useTranslation(lang);

  const [copiedTableNumber, setCopiedTableNumber] = useState<number | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState<boolean>(false);
  const [downloadingTableNum, setDownloadingTableNum] = useState<number | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [tablesToPrint, setTablesToPrint] = useState<RestaurantTable[] | null>(null);

  const [newTableNum, setNewTableNum] = useState<number>(() => {
    const highest = tables.reduce((max, tbl) => Math.max(max, tbl.number), 0);
    return highest + 1;
  });

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.number - b.number),
    [tables]
  );

  const showPreviewOriginWarning =
    !restaurant.publicBaseUrl &&
    typeof window !== 'undefined' &&
    isPreviewOrDevOrigin(window.location.origin);

  const getTableMenuUrl = (tableNum: number) => buildTableQrUrl(restaurant, tableNum);

  const copyUrl = (tableNum: number) => {
    const url = getTableMenuUrl(tableNum);
    navigator.clipboard.writeText(url);
    setCopiedTableNumber(tableNum);
    showToast(t.urlCopied);
    setTimeout(() => {
      setCopiedTableNumber(null);
    }, 2500);
  };

  const handleDownloadPng = async (tableNum: number) => {
    try {
      setDownloadingTableNum(tableNum);
      const url = getTableMenuUrl(tableNum);
      await downloadTableQRPng({
        restaurantName: restaurant.name,
        tableNumber: tableNum,
        url,
      });
      showToast(
        lang === 'ar'
          ? `تم تحميل بطاقة PNG للطاولة ${tableNum}`
          : lang === 'fr'
          ? `Carte PNG téléchargée pour la Table ${tableNum}`
          : `Downloaded QR stand card for Table ${tableNum}`
      );
    } catch {
      showToast(
        lang === 'ar'
          ? 'تعذر تحميل صورة QR'
          : lang === 'fr'
          ? 'Erreur lors du téléchargement du QR PNG'
          : 'Error downloading QR PNG'
      );
    } finally {
      setDownloadingTableNum(null);
    }
  };

  const handleTestMenuAsCustomer = (tableNum: number) => {
    setActiveTable(tableNum);
    setCurrentView('menu');
  };

  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTableNum <= 0) return;
    if (tables.some((tbl) => tbl.number === newTableNum)) {
      showToast(
        lang === 'ar'
          ? `الطاولة ${newTableNum} موجودة بالفعل`
          : lang === 'fr'
          ? `La table ${newTableNum} existe déjà`
          : `Table ${newTableNum} already exists`
      );
      return;
    }
    const success = await addTable(newTableNum);
    if (success) {
      setIsAddTableOpen(false);
      setNewTableNum((prev) => prev + 1);
    }
  };

  const toggleTableActive = async (table: RestaurantTable) => {
    if (!isValidUuid(table.id)) {
      showToast(
        lang === 'ar'
          ? 'تعذر تعديل هذه الطاولة'
          : lang === 'fr'
          ? 'Impossible de modifier cette table.'
          : 'Could not modify table. Please try again.'
      );
      return;
    }

    const current = table.active !== false;
    const nextActive = !current;

    const success = await updateTable(table.id, {
      active: nextActive,
      status: nextActive ? 'available' : 'occupied',
    });
    if (success) {
      showToast(
        lang === 'ar'
          ? `تم ${nextActive ? 'تفعيل' : 'تعطيل'} الطاولة ${table.number}`
          : `Table ${table.number} ${nextActive ? 'enabled' : 'disabled'}`
      );
    }
  };

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (!isValidUuid(table.id)) {
      showToast(
        lang === 'ar'
          ? 'تعذر حذف هذه الطاولة'
          : lang === 'fr'
          ? 'Impossible de supprimer cette table.'
          : 'Could not delete table. Please try again.'
      );
      return;
    }

    const confirmed = await confirmAction({
      title: t.deleteTable || 'Delete Table',
      message:
        lang === 'ar'
          ? `حذف الطاولة ${table.number}؟ ستبقى الطلبات السابقة محفوظة بدون طاولة.`
          : lang === 'fr'
          ? `Supprimer la table ${table.number} ? Les commandes passées seront conservées.`
          : `Delete table ${table.number}? Previous orders will be kept without a table.`,
      confirmLabel: t.delete || 'Delete',
      cancelLabel: t.cancel || 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    await deleteTable(table.id);
    setSelectedTableIds((prev) => prev.filter((id) => id !== table.id));
  };

  const toggleSelectTable = (tableId: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const allSelected =
    sortedTables.length > 0 && sortedTables.every((tbl) => selectedTableIds.includes(tbl.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTableIds([]);
    } else {
      setSelectedTableIds(sortedTables.map((tbl) => tbl.id));
    }
  };

  const handlePrintSelected = () => {
    const selected = sortedTables.filter((tbl) => selectedTableIds.includes(tbl.id));
    if (selected.length === 0) {
      showToast(
        lang === 'ar'
          ? 'يرجى تحديد طاولة واحدة على الأقل للطباعة'
          : lang === 'fr'
          ? 'Veuillez sélectionner au moins une table à imprimer'
          : 'Select at least one table to print'
      );
      return;
    }
    setTablesToPrint(selected);
  };

  const handlePrintAll = () => {
    if (sortedTables.length === 0) return;
    setTablesToPrint(sortedTables);
  };

  return (
    <div className="space-y-5">
      {/* Preview / Localhost Red Warning Banner when Public Website URL is unset */}
      {showPreviewOriginWarning && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-700/80 text-red-900 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs leading-relaxed">
              <p className="font-black text-sm text-red-800 dark:text-red-200">
                {lang === 'ar'
                  ? 'تحذير: رموز QR المطبوعة الآن لن تعمل للزبائن!'
                  : lang === 'fr'
                  ? 'Attention : les QR codes imprimés ne fonctionneront PAS pour les clients !'
                  : 'Warning: Printed QR codes will NOT work for customers yet!'}
              </p>
              <p className="mt-0.5 text-red-700 dark:text-red-300">
                {lang === 'ar'
                  ? 'أنت تستخدم رابط معاينة/تطوير مؤقت ولم تقم بتعيين "رابط الموقع العام". عيّن رابط موقعك المنشور (https://...) في الإعدادات قبل الطباعة.'
                  : lang === 'fr'
                  ? 'Vous utilisez une adresse de prévisualisation/développement et « URL publique du site web » est vide. Définissez votre domaine public (https://...) dans Paramètres avant d’imprimer.'
                  : 'Current URL is a preview or development address and Public website URL is empty. Set your live https:// URL in Settings before printing QR cards.'}
              </p>
            </div>
          </div>

          {isAdmin && onNavigateSettings && (
            <button
              type="button"
              onClick={onNavigateSettings}
              className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer self-start sm:self-center"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? 'تعيين الرابط في الإعدادات'
                  : lang === 'fr'
                  ? 'Configurer dans Paramètres'
                  : 'Set URL in Settings'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
            {t.tables} Management
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'ar'
              ? 'إدارة طاولات الطعام، رموز QR والطباعة الاحترافية'
              : lang === 'fr'
              ? 'Gestion des tables, codes QR et impression de chevalets'
              : 'Dining tables, QR codes, and print layouts'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sortedTables.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-[#FF5A1F]" />
              ) : (
                <Square className="w-4 h-4 text-stone-400" />
              )}
              <span>
                {allSelected
                  ? lang === 'ar'
                    ? 'إلغاء التحديد'
                    : lang === 'fr'
                    ? 'Tout désélectionner'
                    : 'Clear selection'
                  : lang === 'ar'
                  ? 'تحديد الكل'
                  : lang === 'fr'
                  ? 'Tout sélectionner'
                  : 'Select all'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintSelected}
            disabled={selectedTableIds.length === 0}
            className="h-10 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs font-bold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#FF5A1F]" />
            <span>
              {lang === 'ar'
                ? `طباعة المحدد (${selectedTableIds.length})`
                : lang === 'fr'
                ? `Imprimer la sélection (${selectedTableIds.length})`
                : `Print selected (${selectedTableIds.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrintAll}
            disabled={sortedTables.length === 0}
            className="h-10 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'طباعة الكل'
                : lang === 'fr'
                ? 'Tout imprimer'
                : 'Print all'}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddTableOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>
                {lang === 'ar' ? 'إضافة طاولة' : lang === 'fr' ? 'Ajouter table' : 'Add Table'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedTables.map((table) => {
          const tableUrl = getTableMenuUrl(table.number);
          const isCopied = copiedTableNumber === table.number;
          const isActive = table.active !== false;
          const isSelected = selectedTableIds.includes(table.id);

          return (
            <div
              key={table.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-xs ${
                isSelected
                  ? 'ring-2 ring-[#FF5A1F] border-[#FF5A1F] bg-white dark:bg-stone-850'
                  : isActive
                  ? 'bg-white dark:bg-stone-850 border-stone-200/80 dark:border-stone-800'
                  : 'bg-stone-100/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800/80 opacity-75'
              }`}
            >
              {/* Table Info Header + Checkbox */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectTable(table.id)}
                    aria-label={`Select table ${table.number}`}
                    className="mt-1 w-4 h-4 accent-[#FF5A1F] rounded cursor-pointer shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg font-mono font-black text-sm flex items-center justify-center ${
                          isActive
                            ? 'bg-orange-100 dark:bg-orange-950/60 text-[#FF5A1F]'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        {table.number}
                      </span>
                      <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-50">
                        {t.table} {table.number}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">{table.label}</p>
                  </div>
                </div>

                {/* Active Toggle & Delete */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleTableActive(table)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                    title={isActive ? 'Disable table' : 'Enable table'}
                  >
                    {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{isActive ? 'Active' : 'Disabled'}</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTable(table)}
                      className="p-1 rounded-md text-stone-400 dark:text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Delete table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Preview Widget */}
              <div className="flex items-center justify-center py-2 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-100 dark:border-stone-800">
                <QRCodeSVG value={tableUrl} size={130} tableNumber={table.number} />
              </div>

              {/* URL preview text */}
              <div
                className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-mono text-stone-600 dark:text-stone-300 truncate flex items-center justify-between gap-2"
                dir="ltr"
              >
                <span className="truncate">{formatShortDisplayUrl(tableUrl)}</span>
                <span
                  className={`text-[10px] font-bold shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-300'
                  }`}
                >
                  {isActive ? 'Ready' : 'Inactive'}
                </span>
              </div>

              {/* Action Buttons: Print QR, PNG, URL, Test */}
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setTablesToPrint([table])}
                  className="h-9 px-2 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  title={lang === 'ar' ? 'طباعة رمز QR' : lang === 'fr' ? 'Imprimer QR' : 'Print QR'}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'طباعة' : 'Print QR'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPng(table.number)}
                  disabled={downloadingTableNum === table.number}
                  className="h-9 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Download PNG QR card"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{downloadingTableNum === table.number ? '...' : 'PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyUrl(table.number)}
                  className="h-9 px-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                      <span>URL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTestMenuAsCustomer(table.number)}
                  className="h-9 px-2 rounded-xl bg-orange-50 hover:bg-[#FF5A1F] text-[#FF5A1F] hover:text-white dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-600 text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Table Modal (Admin only) */}
      {isAdmin && isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                {lang === 'ar' ? 'إضافة طاولة جديدة' : lang === 'fr' ? 'Ajouter une table' : 'Add New Table'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTableOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTable} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 uppercase text-[10px] block mb-1">
                  Table Number *
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold text-base focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Print Layout & PDF Dialog */}
      <QRPrintDialogModal
        isOpen={Boolean(tablesToPrint && tablesToPrint.length > 0)}
        tables={tablesToPrint || []}
        restaurant={restaurant}
        onClose={() => setTablesToPrint(null)}
      />
    </div>
  );
};

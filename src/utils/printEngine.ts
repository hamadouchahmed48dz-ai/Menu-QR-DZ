import QRCode from 'qrcode';
import { Language, Order, Restaurant, RestaurantTable, getOptionName } from '../types';
import { PaperWidth, PrintSettings } from './printSettings';
import { buildTableQrUrl, formatShortDisplayUrl } from './publicUrl';
import { formatAlgiersDayMonth, getAlgiersDateString } from './statistics';

export type QRPrintLayout = '1' | '2' | '6' | '12';
export type TicketPrintMode = 'kitchen' | 'receipt';

export interface QRPrintOptions {
  layout: QRPrintLayout;
  showLogo: boolean;
  instructionText: string;
}

export interface PrintableDocumentPayload {
  kind: 'qr' | 'kitchen' | 'receipt';
  title: string;
  htmlDocument: string;
  bodyHtml: string;
  pageFormat: 'A5' | 'A4' | '58mm' | '80mm';
  filename: string;
  /** Used for multi-page crisp PDF export of QR sheets */
  qrPageHtmlList?: string[];
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats dates strictly in Africa/Algiers timezone so kitchen tickets and receipts
 * always reflect local Algerian restaurant wall-clock time.
 */
export function formatAlgiersTicketTime(dateInput: string | Date, includeDate = false): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';

  try {
    if (includeDate) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Algiers',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function isRunningInsideIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

function wrapFullPrintDocument(title: string, extraCss: string, bodyContent: string, dir: 'rtl' | 'ltr' = 'rtl'): string {
  return `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet" />
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Cairo', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    .ltr-isolate {
      direction: ltr;
      unicode-bidi: isolate;
      display: inline-block;
    }
    ${extraCss}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// =============================================================================
// 1. ORDER TICKET & RECEIPT DOCUMENT GENERATOR
// =============================================================================

function getTicketDimensions(paperWidth: PaperWidth, fontSize: PrintSettings['fontSize']) {
  const widthCss = paperWidth === '58mm' ? '54mm' : paperWidth === '80mm' ? '74mm' : '190mm';
  const pageSizeCss =
    paperWidth === '58mm' ? '58mm auto' : paperWidth === '80mm' ? '80mm auto' : 'A4 portrait';
  const pageMarginCss = paperWidth === 'A4' ? '10mm' : '2mm';

  const basePx =
    paperWidth === '58mm'
      ? fontSize === 'small'
        ? 10.5
        : fontSize === 'large'
        ? 13
        : 11.5
      : paperWidth === '80mm'
      ? fontSize === 'small'
        ? 11.5
        : fontSize === 'large'
        ? 14.5
        : 13
      : fontSize === 'small'
      ? 12.5
      : fontSize === 'large'
      ? 16
      : 14;

  return { widthCss, pageSizeCss, pageMarginCss, basePx };
}

function buildSingleTicketCopyHtml(
  order: Order,
  restaurant: Restaurant,
  settings: PrintSettings,
  mode: TicketPrintMode,
  lang: Language
): string {
  const isKitchen = mode === 'kitchen';
  const showPrices = !isKitchen || settings.showPricesOnKitchenTicket;
  const currency = restaurant.currency || 'DZD';
  const timeStr = formatAlgiersTicketTime(order.createdAt, true);
  const dayMonth = formatAlgiersDayMonth(order.orderDate || order.createdAt);
  const { widthCss, basePx } = getTicketDimensions(settings.paperWidth, settings.fontSize);

  const logoHtml =
    !isKitchen && settings.showLogo && restaurant.logo
      ? `<div style="text-align:center;margin-bottom:6px;">
           <img src="${escapeHtml(restaurant.logo)}" alt="${escapeHtml(restaurant.name)}" crossorigin="anonymous" style="width:46px;height:46px;object-fit:cover;border-radius:8px;filter:grayscale(100%) contrast(135%);border:1px solid #000000;" />
         </div>`
      : '';

  const headerHtml = isKitchen
    ? `
      <div style="text-align:center;border-bottom:2px solid #000000;padding-bottom:8px;margin-bottom:8px;">
        <div style="font-size:${Math.round(basePx * 1.1)}px;font-weight:900;letter-spacing:0.5px;">
          تذكرة المطبخ · BON CUISINE · KITCHEN
        </div>
        <div style="font-size:${Math.round(basePx * 0.95)}px;font-weight:700;margin-top:2px;">
          ${escapeHtml(restaurant.name)}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:7px 9px;border:2.5px solid #000000;">
          <div style="text-align:start;line-height:1.1;">
            <span class="ltr-isolate" style="font-size:${Math.round(basePx * 1.85)}px;font-weight:900;">#${escapeHtml(order.orderNumber)}</span>
            ${dayMonth ? `<span class="ltr-isolate" style="font-size:${Math.round(basePx * 0.9)}px;font-weight:800;margin-inline-start:4px;">• ${escapeHtml(dayMonth)}</span>` : ''}
          </div>
          <span style="font-size:${Math.round(basePx * 1.4)}px;font-weight:900;">
            طاولة <span class="ltr-isolate">${escapeHtml(order.tableNumber)}</span> / T<span class="ltr-isolate">${escapeHtml(order.tableNumber)}</span>
          </span>
        </div>
        <div style="font-size:${Math.round(basePx * 0.95)}px;font-weight:800;margin-top:5px;">
          التاريخ والوقت (الجزائر): <span class="ltr-isolate">${escapeHtml(timeStr)}</span>
        </div>
      </div>
    `
    : `
      <div style="text-align:center;border-bottom:2px dashed #000000;padding-bottom:8px;margin-bottom:8px;">
        ${logoHtml}
        <div style="font-size:${Math.round(basePx * 1.3)}px;font-weight:900;line-height:1.25;">
          ${escapeHtml(restaurant.name)}
        </div>
        ${
          restaurant.address
            ? `<div style="font-size:${Math.round(basePx * 0.85)}px;margin-top:2px;">${escapeHtml(restaurant.address)}</div>`
            : ''
        }
        ${
          restaurant.phone
            ? `<div style="font-size:${Math.round(basePx * 0.85)}px;margin-top:1px;"><span class="ltr-isolate">${escapeHtml(restaurant.phone)}</span></div>`
            : ''
        }
        <div style="border:2px solid #000000;margin-top:7px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;">
          <div style="line-height:1.1;">
            <span style="font-size:${Math.round(basePx * 0.9)}px;font-weight:800;display:block;">طلب / N°</span>
            <span class="ltr-isolate" style="font-size:${Math.round(basePx * 1.65)}px;font-weight:900;">#${escapeHtml(order.orderNumber)}</span>
            ${dayMonth ? `<span class="ltr-isolate" style="font-size:${Math.round(basePx * 0.85)}px;font-weight:800;margin-inline-start:4px;">• ${escapeHtml(dayMonth)}</span>` : ''}
          </div>
          <span style="font-size:${Math.round(basePx * 1.25)}px;font-weight:900;">
            طاولة <span class="ltr-isolate">${escapeHtml(order.tableNumber)}</span>
          </span>
        </div>
        <div style="font-size:${Math.round(basePx * 0.9)}px;font-weight:700;margin-top:5px;">
          <span class="ltr-isolate">${escapeHtml(timeStr)}</span> (Africa/Algiers)
        </div>
      </div>
    `;

  const itemsHtml = order.items
    .map((item) => {
      const displayName =
        item.product.name[lang] || item.product.name.ar || item.product.name.fr || item.product.name.en;

      const sizeText = item.selectedSize ? getOptionName(item.selectedSize, lang) : '';
      const extrasText =
        item.selectedExtras && item.selectedExtras.length > 0
          ? item.selectedExtras.map((ex) => getOptionName(ex, lang)).join('، ')
          : '';
      const complementsLines =
        item.selectedComplements && item.selectedComplements.length > 0
          ? item.selectedComplements
              .map((sc) => {
                const gTitle = sc.groupTitle[lang] || sc.groupTitle.ar || sc.groupTitle.en || '';
                const cName = sc.name[lang] || sc.name.ar || sc.name.en || '';
                return `${gTitle}: ${cName}`;
              })
              .join('<br/>')
          : '';

      const unitPriceLine =
        !isKitchen
          ? `<div style="font-size:${Math.round(basePx * 0.82)}px;">
               <span class="ltr-isolate">${item.quantity} × ${item.unitPrice} ${escapeHtml(currency)}</span>
             </div>`
          : '';

      return `
        <div style="padding:${isKitchen ? '6px 0' : '5px 0'};border-bottom:1px dashed #000000;break-inside:avoid;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
            <div style="font-size:${isKitchen ? Math.round(basePx * 1.2) : Math.round(basePx * 1.02)}px;font-weight:900;line-height:1.3;">
              <span class="ltr-isolate" style="margin-inline-end:4px;">${item.quantity}×</span>${escapeHtml(displayName)}
            </div>
            ${
              showPrices
                ? `<div class="ltr-isolate" style="font-size:${Math.round(basePx * 0.98)}px;font-weight:800;white-space:nowrap;">
                     ${escapeHtml(item.totalPrice)} ${escapeHtml(currency)}
                   </div>`
                : ''
            }
          </div>
          ${unitPriceLine}
          ${
            sizeText
              ? `<div style="font-size:${Math.round(basePx * (isKitchen ? 1.02 : 0.88))}px;font-weight:700;padding-inline-start:12px;margin-top:2px;">
                   • الحجم / Taille: ${escapeHtml(sizeText)}
                 </div>`
              : ''
          }
          ${
            extrasText
              ? `<div style="font-size:${Math.round(basePx * (isKitchen ? 1.02 : 0.88))}px;font-weight:700;padding-inline-start:12px;margin-top:2px;">
                   • إضافات / Extras: +${escapeHtml(extrasText)}
                 </div>`
              : ''
          }
          ${
            complementsLines
              ? `<div style="font-size:${Math.round(basePx * (isKitchen ? 1.0 : 0.86))}px;font-weight:700;padding-inline-start:12px;margin-top:2px;">
                   ${complementsLines}
                 </div>`
              : ''
          }
          ${
            item.notes
              ? `<div style="font-size:${Math.round(basePx * (isKitchen ? 1.04 : 0.88))}px;font-weight:800;padding-inline-start:12px;margin-top:3px;border-inline-start:2px solid #000000;padding-inline:6px;">
                   ملاحظة / Note: ${escapeHtml(item.notes)}
                 </div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  // Highlighted Customer Note (very prominent in Kitchen ticket, visible cleanly in Receipt too)
  const customerNoteHtml = order.notes
    ? `<div style="margin-top:8px;padding:7px 8px;border:2px solid #000000;break-inside:avoid;page-break-inside:avoid;">
         <div style="font-size:${Math.round(basePx * 0.92)}px;font-weight:900;text-transform:uppercase;">
           ★ ملاحظة الزبون / NOTE CLIENT / CUSTOMER NOTE:
         </div>
         <div style="font-size:${Math.round(basePx * (isKitchen ? 1.15 : 0.98))}px;font-weight:800;margin-top:3px;">
           ${escapeHtml(order.notes)}
         </div>
       </div>`
    : '';

  // Totals & Discounts (always on receipt, optional on kitchen if showPricesOnKitchenTicket)
  const totalsHtml = showPrices
    ? `<div style="margin-top:8px;padding-top:7px;border-top:2px solid #000000;break-inside:avoid;page-break-inside:avoid;">
         ${
           order.subtotal != null && order.discountTotal && order.discountTotal > 0
             ? `<div style="display:flex;justify-content:space-between;font-size:${Math.round(basePx * 0.92)}px;margin-bottom:3px;">
                  <span>المجموع الفرعي / Sous-total</span>
                  <span class="ltr-isolate">${escapeHtml(order.subtotal)} ${escapeHtml(currency)}</span>
                </div>`
             : ''
         }
         ${
           order.appliedOffers && order.appliedOffers.length > 0
             ? order.appliedOffers
                 .map(
                   (of) => `
                   <div style="display:flex;justify-content:space-between;font-size:${Math.round(basePx * 0.9)}px;font-weight:700;margin-bottom:2px;">
                     <span>خصم (${escapeHtml(of.title)})</span>
                     <span class="ltr-isolate">-${escapeHtml(of.discountAmount)} ${escapeHtml(currency)}</span>
                   </div>`
                 )
                 .join('')
             : order.discountTotal && order.discountTotal > 0
             ? `<div style="display:flex;justify-content:space-between;font-size:${Math.round(basePx * 0.92)}px;font-weight:700;margin-bottom:3px;">
                  <span>الخصم / Remise</span>
                  <span class="ltr-isolate">-${escapeHtml(order.discountTotal)} ${escapeHtml(currency)}</span>
                </div>`
             : ''
         }
         <div style="display:flex;justify-content:space-between;align-items:center;font-size:${Math.round(basePx * 1.32)}px;font-weight:900;margin-top:4px;padding-top:4px;border-top:1px dashed #000000;">
           <span>الإجمالي · TOTAL</span>
           <span class="ltr-isolate">${escapeHtml(order.total)} ${escapeHtml(currency)}</span>
         </div>
       </div>`
    : '';

  // Footer text on receipts
  const footerLines = [settings.footerAr, settings.footerFr, settings.footerEn]
    .map((line) => (line || '').trim())
    .filter(Boolean);

  const receiptFooterHtml = !isKitchen
    ? `<div style="margin-top:10px;padding-top:8px;border-top:2px dashed #000000;text-align:center;font-size:${Math.round(basePx * 0.88)}px;font-weight:700;line-height:1.45;break-inside:avoid;page-break-inside:avoid;">
         ${
           footerLines.length > 0
             ? footerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')
             : `<div>شكراً لزيارتكم · Merci · Thank you</div>`
         }
       </div>`
    : '';

  return `
    <div class="ticket-sheet" style="width:${widthCss};max-width:100%;margin:0 auto;padding:${settings.paperWidth === 'A4' ? '12px 16px' : '4px 2px'};background:#ffffff;color:#000000;font-size:${basePx}px;line-height:1.35;">
      ${headerHtml}
      <div>${itemsHtml}</div>
      ${customerNoteHtml}
      ${totalsHtml}
      ${receiptFooterHtml}
    </div>
  `;
}

export function buildOrderPrintDocument(
  order: Order,
  restaurant: Restaurant,
  settings: PrintSettings,
  mode: TicketPrintMode,
  lang: Language
): PrintableDocumentPayload {
  const { pageSizeCss, pageMarginCss } = getTicketDimensions(settings.paperWidth, settings.fontSize);
  const copies = Math.min(5, Math.max(1, Math.round(settings.copies || 1)));

  const copiesHtml = Array.from({ length: copies })
    .map((_, idx) => {
      const ticketBody = buildSingleTicketCopyHtml(order, restaurant, settings, mode, lang);
      const breakStyle = idx < copies - 1 ? 'page-break-after:always;break-after:page;' : '';
      return `<div style="${breakStyle}">${ticketBody}</div>`;
    })
    .join('');

  const extraCss = `
    @page {
      size: ${pageSizeCss};
      margin: ${pageMarginCss};
    }
    .ticket-sheet {
      background: #ffffff !important;
      color: #000000 !important;
    }
    @media screen {
      body {
        padding: 8px;
      }
      .ticket-sheet + div {
        margin-top: 16px;
      }
    }
  `;

  const titlePrefix = mode === 'kitchen' ? 'Kitchen-Ticket' : 'Receipt';
  const dayMonthLabel = formatAlgiersDayMonth(order.orderDate || order.createdAt);
  const dateSlug = order.orderDate || getAlgiersDateString(new Date(order.createdAt));
  const title = `${titlePrefix} #${order.orderNumber}${dayMonthLabel ? ` (${dayMonthLabel})` : ''} - Table ${order.tableNumber}`;
  const htmlDocument = wrapFullPrintDocument(title, extraCss, copiesHtml, 'rtl');

  return {
    kind: mode,
    title,
    htmlDocument,
    bodyHtml: copiesHtml,
    pageFormat: settings.paperWidth,
    filename: `${mode}-ticket-${order.orderNumber}-${dateSlug}-T${order.tableNumber}.pdf`,
  };
}

// =============================================================================
// 2. TABLE QR CODES PRINT DOCUMENT GENERATOR
// =============================================================================

function getLayoutConfig(layout: QRPrintLayout) {
  switch (layout) {
    case '1':
      return {
        perPage: 1,
        cols: 1,
        rows: 1,
        pageFormat: 'A5' as const,
        pageSizeCss: 'A5 portrait',
        pageWidthMm: 148,
        pageHeightMm: 210,
        qrMm: 72,
        tableFontPx: 30,
        nameFontPx: 22,
        logoSizePx: 54,
        paddingMm: 8,
        gapMm: 0,
      };
    case '2':
      return {
        perPage: 2,
        cols: 1,
        rows: 2,
        pageFormat: 'A4' as const,
        pageSizeCss: 'A4 portrait',
        pageWidthMm: 210,
        pageHeightMm: 297,
        qrMm: 56,
        tableFontPx: 26,
        nameFontPx: 20,
        logoSizePx: 46,
        paddingMm: 8,
        gapMm: 6,
      };
    case '6':
      return {
        perPage: 6,
        cols: 2,
        rows: 3,
        pageFormat: 'A4' as const,
        pageSizeCss: 'A4 portrait',
        pageWidthMm: 210,
        pageHeightMm: 297,
        qrMm: 38,
        tableFontPx: 19,
        nameFontPx: 15,
        logoSizePx: 34,
        paddingMm: 6,
        gapMm: 4,
      };
    case '12':
      return {
        perPage: 12,
        cols: 3,
        rows: 4,
        pageFormat: 'A4' as const,
        pageSizeCss: 'A4 portrait',
        pageWidthMm: 210,
        pageHeightMm: 297,
        qrMm: 31, // Strictly >= 3cm (30mm)
        tableFontPx: 15,
        nameFontPx: 12,
        logoSizePx: 24,
        paddingMm: 5,
        gapMm: 3,
      };
  }
}

export async function buildTableQRPrintDocument(
  tablesToPrint: RestaurantTable[],
  restaurant: Restaurant,
  options: QRPrintOptions
): Promise<PrintableDocumentPayload> {
  const sortedTables = [...tablesToPrint].sort((a, b) => a.number - b.number);
  const cfg = getLayoutConfig(options.layout);

  // Generate crisp high-contrast PNG data URLs with clean quiet zone (>= 3) and zero obstructive center badge
  const qrEntries = await Promise.all(
    sortedTables.map(async (tbl) => {
      const fullUrl = buildTableQrUrl(restaurant, tbl.number);
      const qrDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 640,
        margin: 3,
        errorCorrectionLevel: 'Q',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      return {
        table: tbl,
        fullUrl,
        shortUrl: formatShortDisplayUrl(fullUrl),
        qrDataUrl,
      };
    })
  );

  // Chunk into sheets per layout
  const pages: typeof qrEntries[] = [];
  for (let i = 0; i < qrEntries.length; i += cfg.perPage) {
    pages.push(qrEntries.slice(i, i + cfg.perPage));
  }

  const customNote = (options.instructionText || '').trim();

  const renderCardHtml = (entry: (typeof qrEntries)[number]) => {
    const logoMarkup =
      options.showLogo && restaurant.logo
        ? `<img src="${escapeHtml(restaurant.logo)}" alt="${escapeHtml(restaurant.name)}" crossorigin="anonymous" style="width:${cfg.logoSizePx}px;height:${cfg.logoSizePx}px;border-radius:9999px;object-fit:cover;border:1.5px solid #000000;flex-shrink:0;" />`
        : '';

    const isCompact = options.layout === '12';
    const scanTextSize = isCompact ? 8.5 : options.layout === '6' ? 10 : 12;
    const urlTextSize = isCompact ? 7 : options.layout === '6' ? 8.5 : 10;

    return `
      <div style="border:1px dashed #6b7280;border-radius:${isCompact ? 8 : 12}px;padding:${isCompact ? '2.5mm 3mm' : '4.5mm 5mm'};background:#ffffff;color:#000000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;height:100%;break-inside:avoid;page-break-inside:avoid;overflow:hidden;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
            ${logoMarkup}
            <div style="font-size:${cfg.nameFontPx}px;font-weight:900;color:#000000;line-height:1.15;word-break:break-word;">
              ${escapeHtml(restaurant.name)}
            </div>
          </div>
          <div style="margin-top:${isCompact ? 2 : 4}px;padding:${isCompact ? '1px 8px' : '2px 14px'};border:2px solid #000000;border-radius:6px;font-size:${cfg.tableFontPx}px;font-weight:900;color:#000000;line-height:1.15;">
            TABLE <span class="ltr-isolate">${entry.table.number}</span> · طاولة <span class="ltr-isolate">${entry.table.number}</span>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;margin:${isCompact ? '2mm 0' : '3mm 0'};background:#ffffff;">
          <img src="${entry.qrDataUrl}" alt="QR Table ${entry.table.number}" style="width:${cfg.qrMm}mm;height:${cfg.qrMm}mm;display:block;image-rendering:pixelated;" />
        </div>

        <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="font-size:${scanTextSize}px;font-weight:800;color:#000000;line-height:1.25;">
            <span>امسح الرمز للطلب</span> · <span>Scannez pour commander</span> · <span>Scan to order</span>
          </div>
          ${
            customNote
              ? `<div style="font-size:${Math.max(7.5, scanTextSize - 1)}px;font-weight:600;color:#111827;line-height:1.2;">${escapeHtml(customNote)}</div>`
              : ''
          }
          <div class="ltr-isolate" style="font-size:${urlTextSize}px;font-family:monospace;color:#111827;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;">
            ${escapeHtml(entry.shortUrl)}
          </div>
        </div>
      </div>
    `;
  };

  const pageHtmlList = pages.map((pageEntries, pageIdx) => {
    const innerCards = pageEntries.map(renderCardHtml).join('');
    const pageBreak = pageIdx < pages.length - 1 ? 'page-break-after:always;break-after:page;' : '';
    const innerHeightMm = cfg.pageHeightMm - cfg.paddingMm * 2;
    const innerWidthMm = cfg.pageWidthMm - cfg.paddingMm * 2;

    return `
      <div class="qr-sheet-page" style="width:${cfg.pageWidthMm}mm;min-height:${cfg.pageHeightMm}mm;padding:${cfg.paddingMm}mm;background:#ffffff;color:#000000;${pageBreak}">
        <div style="width:${innerWidthMm}mm;height:${innerHeightMm}mm;display:grid;grid-template-columns:repeat(${cfg.cols}, 1fr);grid-template-rows:repeat(${cfg.rows}, 1fr);gap:${cfg.gapMm}mm;">
          ${innerCards}
        </div>
      </div>
    `;
  });

  const fullBody = pageHtmlList.join('');
  const extraCss = `
    @page {
      size: ${cfg.pageSizeCss};
      margin: 0;
    }
    .qr-sheet-page {
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 auto;
    }
    @media screen {
      .qr-sheet-page {
        border: 1px solid #e5e7eb;
        margin-bottom: 16px;
      }
    }
  `;

  const title = `QR Codes (${sortedTables.length}) - ${restaurant.name}`;
  const htmlDocument = wrapFullPrintDocument(title, extraCss, fullBody, 'rtl');

  return {
    kind: 'qr',
    title,
    htmlDocument,
    bodyHtml: fullBody,
    pageFormat: cfg.pageFormat,
    filename: `qr-tables-${restaurant.slug || 'menu'}-${options.layout}perpage.pdf`,
    qrPageHtmlList: pageHtmlList,
  };
}

// =============================================================================
// 3. SAMPLE TEST TICKET BUILDER (SETTINGS "PRINT TEST TICKET")
// =============================================================================

export function createSampleTestOrder(restaurant: Restaurant): Order {
  const currency = restaurant.currency || 'DZD';
  return {
    id: '00000000-0000-0000-0000-000000000000',
    restaurantId: restaurant.id,
    orderNumber: '7',
    tableNumber: 7,
    createdAt: new Date().toISOString(),
    status: 'new',
    notes: 'بدون بصل من فضلك · Sans oignons · Extra crispy',
    subtotal: 2150,
    discountTotal: 200,
    appliedOffers: [
      {
        id: 'sample-offer',
        title: `عرض تجريبي (-200 ${currency})`,
        type: 'fixed_amount',
        value: 200,
        discountAmount: 200,
      },
    ],
    total: 1950,
    items: [
      {
        id: 'sample-1',
        quantity: 2,
        unitPrice: 850,
        totalPrice: 1700,
        selectedSize: {
          id: 'sz-l',
          name_ar: 'كبير',
          name_fr: 'Large',
          name_en: 'Large',
        },
        selectedExtras: [
          {
            id: 'ex-cheese',
            name_ar: 'جبن إضافي',
            name_fr: 'Double fromage',
            name_en: 'Extra cheese',
            price: 150,
          },
        ],
        selectedComplements: [
          {
            groupId: 'grp-sauce',
            groupTitle: { ar: 'الصلصة', fr: 'Sauce', en: 'Sauce' },
            itemId: 'cmp-alg',
            name: { ar: 'صلصة جزائرية', fr: 'Sauce algérienne', en: 'Algerian sauce' },
            price: 0,
          },
        ],
        notes: 'قليل الحار',
        product: {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: {
            ar: 'بيتزا مارغريتا تقليدية',
            fr: 'Pizza Margherita Artisanale',
            en: 'Artisan Margherita Pizza',
          },
          description: { ar: '', fr: '', en: '' },
          price: 700,
          image: '',
          isAvailable: true,
        },
      },
      {
        id: 'sample-2',
        quantity: 1,
        unitPrice: 450,
        totalPrice: 450,
        product: {
          id: 'prod-2',
          categoryId: 'cat-2',
          name: {
            ar: 'عصير برتقال طازج',
            fr: "Jus d'orange frais",
            en: 'Fresh Orange Juice',
          },
          description: { ar: '', fr: '', en: '' },
          price: 450,
          image: '',
          isAvailable: true,
        },
      },
    ],
  };
}

// =============================================================================
// 4. RELIABLE HIDDEN-IFRAME PRINT & PDF DOWNLOAD FALLBACK
// =============================================================================

export interface PrintExecutionResult {
  success: boolean;
  iframeRestricted: boolean;
}

/**
 * Attempts clean silent print via an invisible iframe containing ONLY the printable document.
 * Detects sandboxed iframe environments or browser print blocks gracefully without throwing.
 */
export async function executeHiddenIframePrint(htmlDocument: string): Promise<PrintExecutionResult> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { success: false, iframeRestricted: true };
  }

  return new Promise<PrintExecutionResult>((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2500);
    };

    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) {
          cleanup();
          resolve({ success: false, iframeRestricted: true });
          return;
        }

        // Wait for fonts and images inside iframe before invoking print
        try {
          if ((doc as any).fonts?.ready) {
            await Promise.race([
              (doc as any).fonts.ready,
              new Promise((r) => setTimeout(r, 1200)),
            ]);
          }
          const imgs = Array.from(doc.querySelectorAll('img'));
          await Promise.all(
            imgs.map(
              (img) =>
                new Promise<void>((r) => {
                  if (img.complete) return r();
                  const timer = setTimeout(() => r(), 1200);
                  img.onload = () => {
                    clearTimeout(timer);
                    r();
                  };
                  img.onerror = () => {
                    clearTimeout(timer);
                    r();
                  };
                })
            )
          );
        } catch {
          // Proceed even if image decode waits time out
        }

        win.focus();
        win.print();
        cleanup();
        resolve({
          success: true,
          iframeRestricted: isRunningInsideIframe(),
        });
      } catch {
        cleanup();
        resolve({ success: false, iframeRestricted: true });
      }
    };

    try {
      document.body.appendChild(iframe);
      iframe.srcdoc = htmlDocument;
    } catch {
      cleanup();
      resolve({ success: false, iframeRestricted: true });
    }
  });
}

/**
 * Renders any PrintableDocumentPayload cleanly into a high-resolution white-paper PDF
 * matching the exact selected page format (A5, A4, 58mm, 80mm) using html2canvas + jsPDF.
 */
export async function downloadPrintableAsPdf(payload: PrintableDocumentPayload): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Cairo', 'Plus Jakarta Sans', system-ui, sans-serif";
  container.setAttribute('dir', 'rtl');
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1000))]);
    }

    if (payload.kind === 'qr' && payload.qrPageHtmlList && payload.qrPageHtmlList.length > 0) {
      const isA5 = payload.pageFormat === 'A5';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA5 ? 'a5' : 'a4',
      });
      const targetW = isA5 ? 148 : 210;
      const targetH = isA5 ? 210 : 297;

      for (let i = 0; i < payload.qrPageHtmlList.length; i++) {
        container.innerHTML = payload.qrPageHtmlList[i];
        const pageEl = (container.firstElementChild as HTMLElement) || container;

        // Wait for images on this page
        const imgs = Array.from(pageEl.querySelectorAll('img'));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((r) => {
                if (img.complete) return r();
                const timer = setTimeout(() => r(), 1500);
                img.onload = () => {
                  clearTimeout(timer);
                  r();
                };
                img.onerror = () => {
                  clearTimeout(timer);
                  r();
                };
              })
          )
        );

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });

        if (i > 0) pdf.addPage(isA5 ? 'a5' : 'a4', 'portrait');
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, targetW, targetH, undefined, 'FAST');
      }

      pdf.save(payload.filename);
      return;
    }

    // Order ticket / receipt PDF (58mm, 80mm, or A4)
    container.innerHTML = payload.bodyHtml;
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((r) => {
            if (img.complete) return r();
            const timer = setTimeout(() => r(), 1200);
            img.onload = () => {
              clearTimeout(timer);
              r();
            };
            img.onerror = () => {
              clearTimeout(timer);
              r();
            };
          })
      )
    );

    const targetWidthMm =
      payload.pageFormat === '58mm' ? 58 : payload.pageFormat === '80mm' ? 80 : 210;
    const children = Array.from(container.children) as HTMLElement[];
    const pagesToRender = children.length > 0 ? children : [container];

    let pdf: InstanceType<typeof jsPDF> | null = null;

    for (let i = 0; i < pagesToRender.length; i++) {
      const el = pagesToRender[i];
      const canvas = await html2canvas(el, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const contentHeightMm =
        payload.pageFormat === 'A4'
          ? Math.max(120, Math.min(287, (canvas.height * (targetWidthMm - 20)) / canvas.width))
          : Math.max(40, (canvas.height * (targetWidthMm - 4)) / canvas.width + 6);

      const pageHeightMm = payload.pageFormat === 'A4' ? 297 : contentHeightMm;

      if (!pdf) {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: payload.pageFormat === 'A4' ? 'a4' : [targetWidthMm, pageHeightMm],
        });
      } else {
        pdf.addPage(payload.pageFormat === 'A4' ? 'a4' : [targetWidthMm, pageHeightMm], 'portrait');
      }

      const marginMm = payload.pageFormat === 'A4' ? 10 : 2;
      const drawWidthMm = targetWidthMm - marginMm * 2;
      const drawHeightMm = (canvas.height * drawWidthMm) / canvas.width;
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, drawWidthMm, drawHeightMm, undefined, 'FAST');
    }

    if (pdf) {
      pdf.save(payload.filename);
    }
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

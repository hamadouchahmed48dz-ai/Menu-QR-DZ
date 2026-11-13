import { FullPeriodStats, Restaurant, Language } from '../types';
import { formatAlgiersDateTime, formatAlgiersDayMonth } from './statistics';

interface ExportPDFResult {
  success: boolean;
  filename: string;
  blobUrl?: string;
  openedInTab?: boolean;
  error?: string;
}

/**
 * Lazily loads jsPDF and html2canvas, constructs a pristine, high-contrast light-themed
 * A4 report element with connected Arabic (Cairo font) & RTL support, renders it to canvas
 * at scale 2, paginates cleanly without cutting rows, and triggers download with fallback.
 */
export async function exportStatsToPDF(
  stats: FullPeriodStats,
  restaurant: Restaurant,
  lang: Language = 'ar',
  isAdmin: boolean = true
): Promise<ExportPDFResult> {
  const isRTL = lang === 'ar';

  // 1. Lazy load jsPDF and html2canvas to keep bundle light
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const slug = restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'restaurant';
  const filename = `stats-${slug}-${stats.period}.pdf`;

  // Format labels & values
  const reportTitles: Record<Language, string> = {
    ar: 'تقرير الأداء والإحصائيات ونشاط المبيعات',
    fr: 'Rapport de Performance et Ventes',
    en: 'Sales Performance & Analytics Report',
  };

  const periodLabel = stats.dateRangeLabel[lang] || stats.dateRangeLabel.ar;
  const generatedAt = `${formatAlgiersDateTime(new Date())} (UTC+1)`;

  // Pagination planning:
  // Page 1: Header, KPIs, Chart, Top Dishes, Peak Hours, Categories & Tables
  // Page 2+: Orders Ledger (if orders exist, 15 orders per page)
  const ordersList = stats.latestOrders || [];
  const ORDERS_PER_PAGE = 15;
  const orderPagesCount = ordersList.length > 0 ? Math.ceil(ordersList.length / ORDERS_PER_PAGE) : 0;
  const totalPages = 1 + orderPagesCount;

  // 2. Build off-screen HTML render container
  const container = document.createElement('div');
  container.id = 'menuqr-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Cairo', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  container.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

  const escapeHtml = (str: any) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const renderDeltaHtml = (delta: { percent: number; isUp: boolean; isNeutral: boolean }, invert: boolean = false) => {
    if (delta.isNeutral) {
      return `<span style="font-size: 11px; font-weight: bold; color: #64748b;">0%</span>`;
    }
    const isPositive = invert ? !delta.isUp : delta.isUp;
    const color = isPositive ? '#059669' : '#dc2626';
    const arrow = delta.isUp ? '↑' : '↓';
    const sign = delta.isUp ? '+' : '-';
    return `<span style="font-size: 11px; font-weight: bold; color: ${color}; background: ${isPositive ? '#ecfdf5' : '#fef2f2'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${color}30;">${arrow} ${sign}${delta.percent}%</span>`;
  };

  // -------------------------------------------------------------
  // PAGE 1: Executive Analytics Summary
  // -------------------------------------------------------------
  const page1 = document.createElement('div');
  page1.className = 'pdf-page';
  page1.style.cssText = `
    width: 794px;
    height: 1123px;
    padding: 32px 36px;
    box-sizing: border-box;
    background: #ffffff !important;
    color: #0f172a !important;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  `;

  // Header HTML
  const headerHtml = `
    <div style="border-bottom: 2px solid #ff5a1f; padding-bottom: 14px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: #ff5a1f; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(255,90,31,0.25);">
            ${escapeHtml(restaurant.name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2;">${escapeHtml(restaurant.name)}</h1>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">${escapeHtml(restaurant.address || 'Alger, Algérie')} · ${escapeHtml(restaurant.phone || '')}</p>
          </div>
        </div>
        <div style="text-align: ${isRTL ? 'left' : 'right'};">
          <span style="display: inline-block; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; margin-bottom: 4px;">
            ${escapeHtml(reportTitles[lang])}
          </span>
          <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${escapeHtml(periodLabel)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${isRTL ? 'تاريخ التصدير:' : 'Généré le :'} ${escapeHtml(generatedAt)}</div>
        </div>
      </div>
    </div>
  `;

  // KPI Grid (6 cards)
  const kpisHtml = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
      <!-- Total Revenue -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'إجمالي المبيعات' : 'Chiffre d’affaires'}</span>
          ${isAdmin ? renderDeltaHtml(stats.deltas.revenue) : ''}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">
          ${isAdmin ? `${stats.summary.total_revenue.toLocaleString()} <span style="font-size: 11px; color: #ff5a1f;">DZD</span>` : '—'}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'الطلبات المؤكدة فقط' : 'Commandes confirmées'}</div>
      </div>

      <!-- Orders Count -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'عدد الطلبات' : 'Commandes'}</span>
          ${renderDeltaHtml(stats.deltas.orders)}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">
          ${stats.summary.orders_count}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'طلبات غير ملغاة' : 'Commandes valides'}</div>
      </div>

      <!-- Average Order Value -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'متوسط قيمة الطلب' : 'Panier moyen'}</span>
          ${isAdmin ? renderDeltaHtml(stats.deltas.aov) : ''}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">
          ${isAdmin ? `${stats.summary.avg_order_value.toLocaleString()} <span style="font-size: 11px; color: #64748b;">DZD</span>` : '—'}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'لكل طاولة' : 'Par commande'}</div>
      </div>

      <!-- Items Sold -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'الأطباق المباعة' : 'Articles vendus'}</span>
          ${renderDeltaHtml(stats.deltas.items)}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">
          ${stats.summary.items_sold}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'كمية الأطباق' : 'Dishes prepared'}</div>
      </div>

      <!-- Total Discounts -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'إجمالي الخصومات' : 'Total remises'}</span>
          ${isAdmin ? renderDeltaHtml(stats.deltas.discounts) : ''}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #b45309; font-family: monospace;">
          ${isAdmin ? `${stats.summary.total_discounts.toLocaleString()} <span style="font-size: 11px;">DZD</span>` : '—'}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'عروض ترويجية' : 'Promotions'}</div>
      </div>

      <!-- Cancelled Orders -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b;">${isRTL ? 'الطلبات الملغاة' : 'Annulées'}</span>
          ${renderDeltaHtml(stats.deltas.cancelled, true)}
        </div>
        <div style="font-size: 18px; font-weight: 900; color: #dc2626; font-family: monospace;">
          ${stats.summary.cancelled_orders}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${isRTL ? 'مستبعدة من الإيراد' : 'Non facturées'}</div>
      </div>
    </div>
  `;

  // Timeseries Bar Chart (SVG rendered cleanly)
  let chartSvgHtml = '';
  if (stats.timeseries && stats.timeseries.length > 0) {
    const maxVal = Math.max(...stats.timeseries.map((pt) => pt.revenue), 1);
    const chartW = 720;
    const chartH = 140;
    const barCount = stats.timeseries.length;
    const slotW = chartW / barCount;
    const barW = Math.min(Math.max(slotW * 0.6, 6), 34);

    const bars = stats.timeseries
      .map((pt, i) => {
        const h = Math.max(Math.round((pt.revenue / maxVal) * 105), 6);
        const x = i * slotW + (slotW - barW) / 2;
        const y = chartH - 24 - h;
        const label = pt.time_bucket.includes(' ')
          ? pt.time_bucket.split(' ')[1]
          : pt.time_bucket.slice(5);

        return `
          <g>
            <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="#ff5a1f" opacity="0.9" />
            <text x="${x + barW / 2}" y="${y - 4}" font-size="8" font-family="monospace" text-anchor="middle" fill="#334155" font-weight="bold">${pt.orders_count} ord</text>
            <text x="${x + barW / 2}" y="${chartH - 8}" font-size="9" font-family="monospace" text-anchor="middle" fill="#64748b">${label}</text>
          </g>
        `;
      })
      .join('');

    chartSvgHtml = `
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${isRTL ? 'تطور المبيعات والطلبات مع الوقت' : 'Évolution des Ventes et Commandes'}</span>
          <span style="font-size: 10px; color: #64748b; font-family: monospace;">Timezone: Africa/Algiers (UTC+1)</span>
        </div>
        <svg width="${chartW}" height="${chartH}" style="display: block; margin: 0 auto; overflow: visible;">
          <line x1="0" y1="${chartH - 24}" x2="${chartW}" y2="${chartH - 24}" stroke="#cbd5e1" stroke-width="1" />
          ${bars}
        </svg>
      </div>
    `;
  }

  // Two-column section: Top Dishes & (Busiest Hours + Categories)
  const topDishesRows = stats.topProducts
    .slice(0, 5)
    .map((p, idx) => {
      const name = isRTL ? p.name_ar || p.product_name : lang === 'fr' ? p.name_fr || p.product_name : p.name_en || p.product_name;
      return `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: 800; color: #ff5a1f; width: 24px;">#${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${escapeHtml(name)}</td>
          <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: 800;">${p.quantity}</td>
          <td style="padding: 6px 8px; text-align: ${isRTL ? 'left' : 'right'}; font-family: monospace; font-weight: 800; color: #0f172a;">${isAdmin ? `${p.revenue.toLocaleString()} DZD` : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const busiestHoursBars = stats.hourly
    .filter((h) => h.hour >= 11 && h.hour <= 23)
    .map((h) => {
      const maxH = Math.max(...stats.hourly.map((x) => x.orders_count), 1);
      const pct = Math.round((h.orders_count / maxH) * 100);
      const isPeak = h.orders_count === maxH && maxH > 0;
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 50px;">
          <div style="width: 80%; height: ${Math.max(pct, 8)}%; background: ${isPeak ? '#ef4444' : '#ff5a1f'}; border-radius: 2px;"></div>
          <span style="font-size: 8px; color: #64748b; font-family: monospace; margin-top: 2px;">${h.hour}h</span>
        </div>
      `;
    })
    .join('');

  const categoriesRows = stats.categories
    .slice(0, 3)
    .map((c) => {
      const name = isRTL ? c.name_ar : lang === 'fr' ? c.name_fr : c.name_en;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-bottom: 4px;">
          <span style="font-weight: 700; color: #334155;">${escapeHtml(name)}</span>
          <span style="font-family: monospace; font-weight: 800; color: #0f172a;">${c.items_sold} art. (${isAdmin ? `${c.revenue.toLocaleString()} DA` : ''})</span>
        </div>
      `;
    })
    .join('');

  const tablesPills = stats.tables
    .slice(0, 4)
    .map((tbl) => {
      return `
        <div style="background: #f1f5f9; border-radius: 6px; padding: 4px 6px; font-size: 10px; text-align: center; flex: 1;">
          <div style="font-weight: 800; color: #0f172a;">T-${tbl.table_number}</div>
          <div style="color: #ff5a1f; font-weight: bold; font-family: monospace;">${tbl.orders_count} ord</div>
        </div>
      `;
    })
    .join('');

  const middleSectionHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
      <!-- Top 5 Dishes -->
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #ffffff;">
        <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>${isRTL ? 'أكثر 5 أطباق طلباً ومبيعاً' : 'Top 5 Plats Vendus'}</span>
          <span style="font-size: 10px; color: #ff5a1f; font-weight: bold;">Top 5</span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: ${isRTL ? 'right' : 'left'};">
              <th style="padding: 4px 8px;">#</th>
              <th style="padding: 4px 8px;">${isRTL ? 'الطبق' : 'Plat'}</th>
              <th style="padding: 4px 8px; text-align: center;">${isRTL ? 'الكمية' : 'Qté'}</th>
              <th style="padding: 4px 8px; text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'المبيعات' : 'Revenu'}</th>
            </tr>
          </thead>
          <tbody>
            ${topDishesRows || '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">No data</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Activity & Categories -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Busiest Hours -->
        <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
            ${isRTL ? 'نشاط ساعات اليوم (أوقات الذروة)' : 'Heures de pointe'}
          </div>
          <div style="display: flex; gap: 4px; align-items: flex-end; height: 50px;">
            ${busiestHoursBars}
          </div>
        </div>

        <!-- Categories & Top Tables -->
        <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
            ${isRTL ? 'حصة الأقسام وأكثر الطاولات طلباً' : 'Catégories & Tables'}
          </div>
          ${categoriesRows}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            ${tablesPills}
          </div>
        </div>
      </div>
    </div>
  `;

  // Page 1 Footer
  const footer1Html = `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b;">
      <div>${escapeHtml(restaurant.name)} · MenuQR Enterprise Platform</div>
      <div>${isRTL ? `صفحة 1 من ${totalPages}` : `Page 1 / ${totalPages}`}</div>
    </div>
  `;

  page1.innerHTML = `
    <div>
      ${headerHtml}
      ${kpisHtml}
      ${chartSvgHtml}
      ${middleSectionHtml}
    </div>
    ${footer1Html}
  `;

  container.appendChild(page1);

  // -------------------------------------------------------------
  // PAGE 2+: Orders Ledger Table (Multi-Page Paginated without split)
  // -------------------------------------------------------------
  if (orderPagesCount > 0) {
    for (let pageIdx = 0; pageIdx < orderPagesCount; pageIdx++) {
      const pageNum = pageIdx + 2;
      const sliceStart = pageIdx * ORDERS_PER_PAGE;
      const sliceOrders = ordersList.slice(sliceStart, sliceStart + ORDERS_PER_PAGE);

      const pageEl = document.createElement('div');
      pageEl.className = 'pdf-page';
      pageEl.style.cssText = `
        width: 794px;
        height: 1123px;
        padding: 32px 36px;
        box-sizing: border-box;
        background: #ffffff !important;
        color: #0f172a !important;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      `;

      const rowsHtml = sliceOrders
        .map((ord, idx) => {
          const isZebra = idx % 2 === 1;
          const statusColors: Record<string, string> = {
            received: 'color: #2563eb; background: #eff6ff;',
            preparing: 'color: #d97706; background: #fffbeb;',
            ready: 'color: #7c3aed; background: #f5f3ff;',
            served: 'color: #059669; background: #ecfdf5;',
            cancelled: 'color: #dc2626; background: #fef2f2;',
          };
          const pillStyle = statusColors[ord.status] || 'color: #475569; background: #f1f5f9;';
          const timeStr = new Date(ord.created_at).toLocaleString('fr-DZ', {
            timeZone: 'Africa/Algiers',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return `
            <tr style="border-bottom: 1px solid #e2e8f0; ${isZebra ? 'background-color: #f8fafc;' : ''}">
              <td style="padding: 8px 10px; font-weight: 800; font-family: monospace; color: #0f172a;">#${escapeHtml(ord.order_number)} • ${escapeHtml(formatAlgiersDayMonth(ord.order_date || ord.created_at))}</td>
              <td style="padding: 8px 10px; font-weight: bold; color: #334155;">Table ${ord.table_number}</td>
              <td style="padding: 8px 10px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; ${pillStyle}">
                  ${escapeHtml(ord.status)}
                </span>
              </td>
              <td style="padding: 8px 10px; font-weight: 800; font-family: monospace; color: #0f172a; text-align: ${isRTL ? 'left' : 'right'};">
                ${isAdmin ? `${ord.total.toLocaleString()} DZD` : '—'}
              </td>
              <td style="padding: 8px 10px; font-family: monospace; font-size: 10px; color: #64748b; text-align: ${isRTL ? 'left' : 'right'};">
                ${escapeHtml(timeStr)}
              </td>
            </tr>
          `;
        })
        .join('');

      pageEl.innerHTML = `
        <div>
          <!-- Header strip -->
          <div style="border-bottom: 2px solid #ff5a1f; padding-bottom: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-weight: 800; font-size: 16px; color: #0f172a;">${escapeHtml(restaurant.name)}</span>
              <span style="font-size: 12px; color: #64748b; margin: 0 8px;">·</span>
              <span style="font-size: 12px; font-weight: bold; color: #ff5a1f;">${isRTL ? 'سجل طلبات الفترة (متابعة)' : 'Journal des commandes'}</span>
            </div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace;">
              ${escapeHtml(periodLabel)}
            </div>
          </div>

          <!-- Orders Table with repeated headers -->
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155; font-weight: 800; text-align: ${isRTL ? 'right' : 'left'};">
                  <th style="padding: 10px 10px;">${isRTL ? 'رقم التذكرة' : 'N° Ticket'}</th>
                  <th style="padding: 10px 10px;">${isRTL ? 'الطاولة' : 'Table'}</th>
                  <th style="padding: 10px 10px;">${isRTL ? 'الحالة' : 'Statut'}</th>
                  <th style="padding: 10px 10px; text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'المجموع' : 'Total (DZD)'}</th>
                  <th style="padding: 10px 10px; text-align: ${isRTL ? 'left' : 'right'};">${isRTL ? 'التوقيت' : 'Heure (Alger)'}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b;">
          <div>${escapeHtml(restaurant.name)} · MenuQR Enterprise Platform</div>
          <div>${isRTL ? `صفحة ${pageNum} من ${totalPages}` : `Page ${pageNum} / ${totalPages}`}</div>
        </div>
      `;

      container.appendChild(pageEl);
    }
  }

  // 3. Mount to DOM to compute styles and fonts
  document.body.appendChild(container);

  try {
    // Wait for fonts & layout rendering
    await new Promise((r) => setTimeout(r, 120));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pages = container.querySelectorAll('.pdf-page');

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const canvas = await html2canvas(pages[i] as HTMLElement, {
        scale: 2, // 2x sharp Retina quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    // 4. Output Blob and trigger download
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    let openedInTab = false;

    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      // Fallback if browser sandboxed iframe restricts download attribute
      window.open(blobUrl, '_blank');
      openedInTab = true;
    }

    return {
      success: true,
      filename,
      blobUrl,
      openedInTab,
    };
  } catch (err: any) {
    console.error('PDF export error:', err);
    return {
      success: false,
      filename,
      error: err?.message || 'Failed to render PDF',
    };
  } finally {
    // Always cleanup offscreen element
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

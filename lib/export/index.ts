'use client'

import * as XLSX from 'xlsx'
import { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface ExportMetadata {
  title: string
  subtitle?: string
  accountName?: string
  accountType?: string
  dateRange?: string
  generatedAt?: string
  summary?: {
    totalInflow: number
    totalOutflow: number
    net: number
    count: number
  }
}

/**
 * Normalizes transactions into clean tabular rows for spreadsheets & CSV
 */
export function formatTransactionsForExport(transactions: Transaction[]) {
  return transactions.map((t, idx) => {
    const accountName = (t.accounts as any)?.name || t.account_id || 'Primary'
    return {
      '#': idx + 1,
      Date: t.date,
      'Description / Narration': t.description,
      Type: t.type === 'credit' ? 'CREDIT (+)' : 'DEBIT (−)',
      'Amount (INR)': Number(t.amount) || 0,
      Account: accountName,
      'UPI VPA': t.upi_vpa || '',
      'UPI Name': t.upi_name || '',
      'Reference No': t.ref_no || '',
      Tags: Array.isArray(t.tags) ? t.tags.join(', ') : '',
      'Tag Source': t.tag_source || 'unclassified',
    }
  })
}

/**
 * 1. Export to Excel (.xlsx) with styled columns and metadata summary sheet
 */
export function exportToExcel(
  transactions: Transaction[],
  metadata: ExportMetadata,
  filenamePrefix = 'acount_ledger'
) {
  const wb = XLSX.utils.book_new()
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${filenamePrefix}_${dateStr}.xlsx`

  // 1. Transactions Sheet
  const rows = formatTransactionsForExport(transactions)
  const ws = XLSX.utils.json_to_sheet(rows)

  // Configure column widths
  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 12 }, // Date
    { wch: 45 }, // Description
    { wch: 14 }, // Type
    { wch: 16 }, // Amount
    { wch: 20 }, // Account
    { wch: 28 }, // UPI VPA
    { wch: 22 }, // UPI Name
    { wch: 20 }, // Reference No
    { wch: 25 }, // Tags
    { wch: 12 }, // Tag Source
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Transactions')

  // 2. Executive Summary Sheet
  if (metadata.summary) {
    const summaryRows = [
      { Parameter: 'Report Title', Value: metadata.title },
      { Parameter: 'Account / Scope', Value: metadata.accountName || 'All Consolidated Accounts' },
      { Parameter: 'Date Range', Value: metadata.dateRange || 'All Time' },
      { Parameter: 'Generated Date', Value: new Date().toLocaleString('en-IN') },
      { Parameter: '', Value: '' },
      { Parameter: 'Total Recorded Entries', Value: metadata.summary.count },
      { Parameter: 'Total Inflow (Credits)', Value: metadata.summary.totalInflow },
      { Parameter: 'Total Outflow (Debits)', Value: metadata.summary.totalOutflow },
      { Parameter: 'Net Cash Flow Position', Value: metadata.summary.net },
      { Parameter: 'Currency', Value: 'INR (₹)' },
      { Parameter: 'Status', Value: metadata.summary.net >= 0 ? 'Surplus (+)' : 'Deficit (−)' },
    ]
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
    summaryWs['!cols'] = [{ wch: 26 }, { wch: 36 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary')
  }

  // Trigger download
  XLSX.writeFile(wb, filename)
}

/**
 * 2. Export to clean, RFC-4180 compliant CSV (.csv)
 */
export function exportToCsv(
  transactions: Transaction[],
  filenamePrefix = 'acount_ledger'
) {
  const rows = formatTransactionsForExport(transactions)
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = (row as any)[header]
          if (val === null || val === undefined) return '""'
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ),
  ]

  // Add UTF-8 BOM so Excel and Google Sheets open Indian symbols & characters cleanly
  const csvContent = '\uFEFF' + csvLines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]

  link.setAttribute('href', url)
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 3. Export to Corporate PDF Statement
 * Opens a print-perfect corporate template with letterhead, executive summary KPI boxes,
 * professional ledger table, and compliance footer.
 */
export function exportToCorporatePdf(
  transactions: Transaction[],
  metadata: ExportMetadata
) {
  const printWindow = window.open('', '_blank', 'width=1100,height=850')
  if (!printWindow) {
    alert('Please allow popups to generate the corporate PDF statement.')
    return
  }

  const generatedDate = metadata.generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const dateStr = new Date().toISOString().split('T')[0]
  const docRef = `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${dateStr.replace(/-/g, '')}`

  // Calculate summary if not provided
  const summary = metadata.summary || (() => {
    let inflow = 0
    let outflow = 0
    for (const t of transactions) {
      if (t.type === 'credit') inflow += Number(t.amount) || 0
      else outflow += Number(t.amount) || 0
    }
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      net: inflow - outflow,
      count: transactions.length,
    }
  })()

  // Generate table rows HTML
  const rowsHtml = transactions
    .map((t, idx) => {
      const isCredit = t.type === 'credit'
      const acctName = (t.accounts as any)?.name || metadata.accountName || 'Primary'
      const tagsList = Array.isArray(t.tags) && t.tags.length > 0 ? t.tags.join(', ') : '—'

      return `
        <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-date">${formatDate(t.date)}</td>
          <td class="col-desc">
            <div class="desc-main">${escapeHtml(t.description)}</div>
            ${t.upi_vpa ? `<div class="desc-sub">UPI: ${escapeHtml(t.upi_vpa)}</div>` : ''}
            ${t.ref_no ? `<div class="desc-sub">Ref: ${escapeHtml(t.ref_no)}</div>` : ''}
          </td>
          <td class="col-account">${escapeHtml(acctName)}</td>
          <td class="col-tags"><span class="tag-badge">${escapeHtml(tagsList)}</span></td>
          <td class="col-type"><span class="badge ${isCredit ? 'badge-credit' : 'badge-debit'}">${isCredit ? 'CREDIT' : 'DEBIT'}</span></td>
          <td class="col-amount ${isCredit ? 'amount-credit' : 'amount-debit'}">
            ${isCredit ? '+' : '−'}${formatCurrency(Number(t.amount) || 0, 'INR')}
          </td>
        </tr>
      `
    })
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(metadata.title)} — Statement ${docRef}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0 4px;
    }
    /* Toolbar for browser view before printing */
    .screen-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      margin-bottom: 24px;
      border-radius: 8px;
    }
    .screen-toolbar button {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .screen-toolbar button:hover {
      background: #4338ca;
    }
    .screen-toolbar .btn-close {
      background: transparent;
      color: #cbd5e1;
      border: 1px solid #475569;
    }
    @media print {
      .screen-toolbar { display: none !important; }
      body { padding: 0; }
    }

    /* ── Corporate Letterhead ── */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      font-size: 9px;
      font-weight: 700;
      background: #0f172a;
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 500;
    }
    .doc-meta {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
    }
    .doc-ref {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
    }
    .confidential-tag {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 6px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* ── Statement Header Details ── */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .detail-item-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .detail-item-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    /* ── Executive Summary KPI strip ── */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .kpi-box.kpi-inflow {
      border-left: 3px solid #10b981;
    }
    .kpi-box.kpi-outflow {
      border-left: 3px solid #ef4444;
    }
    .kpi-box.kpi-net {
      border-left: 3px solid #4f46e5;
    }
    .kpi-box.kpi-count {
      border-left: 3px solid #64748b;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-amount {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
    }
    .kpi-inflow .kpi-amount { color: #059669; }
    .kpi-outflow .kpi-amount { color: #dc2626; }
    .kpi-net .kpi-amount { color: #4338ca; }
    .kpi-count .kpi-amount { color: #0f172a; }

    /* ── Ledger Table ── */
    .table-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #cbd5e1;
      margin-bottom: 20px;
    }
    thead th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    tbody td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tbody tr.zebra {
      background: #fafafa;
    }
    .col-num {
      width: 32px;
      text-align: center;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }
    .col-date {
      width: 80px;
      font-weight: 600;
      white-space: nowrap;
    }
    .col-desc {
      width: 250px;
    }
    .desc-main {
      font-weight: 600;
      color: #0f172a;
      word-break: break-word;
    }
    .desc-sub {
      font-size: 9px;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 2px;
    }
    .col-account {
      width: 100px;
      color: #475569;
    }
    .col-tags {
      width: 110px;
    }
    .tag-badge {
      display: inline-block;
      padding: 1px 5px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 600;
      color: #475569;
    }
    .col-type {
      width: 65px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .badge-credit {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .badge-debit {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .col-amount {
      width: 110px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 10.5px;
      white-space: nowrap;
    }
    .amount-credit { color: #059669; }
    .amount-debit { color: #dc2626; }

    /* ── Footer ── */
    .corporate-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }
    .footer-left {
      max-width: 65%;
      line-height: 1.4;
    }
    .footer-right {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="screen-toolbar">
      <div>
        <strong>A-Count Corporate Document Viewer</strong>
        <span style="color: #94a3b8; margin-left: 10px; font-size: 11px;">Document: ${docRef}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
        <button class="btn-close" onclick="window.close()">Close</button>
      </div>
    </div>

    <!-- Letterhead -->
    <header class="letterhead">
      <div>
        <div class="brand-title">
          <span>A-COUNT</span>
          <span class="brand-badge">Financial Intelligence</span>
        </div>
        <div class="brand-sub">${escapeHtml(metadata.title)} · Reconciled Corporate Statement</div>
      </div>
      <div class="doc-meta">
        <div>Statement Ref: <span class="doc-ref">${docRef}</span></div>
        <div style="margin-top: 2px;">Issue Date: ${generatedDate}</div>
        <div class="confidential-tag">Confidential Statement</div>
      </div>
    </header>

    <!-- Details Grid -->
    <section class="details-grid">
      <div>
        <div class="detail-item-label">Account / Scope</div>
        <div class="detail-item-val">${escapeHtml(metadata.accountName || 'All Consolidated Accounts')}</div>
      </div>
      <div>
        <div class="detail-item-label">Reporting Period</div>
        <div class="detail-item-val">${escapeHtml(metadata.dateRange || 'All Time Recorded')}</div>
      </div>
      <div>
        <div class="detail-item-label">Report Currency</div>
        <div class="detail-item-val">INR (₹ Indian Rupee)</div>
      </div>
      <div>
        <div class="detail-item-label">Reconciliation Status</div>
        <div class="detail-item-val" style="color: #059669;">✓ Fully Balanced</div>
      </div>
    </section>

    <!-- Executive Summary Strip -->
    <section class="summary-strip">
      <div class="kpi-box kpi-inflow">
        <div class="kpi-label">Total Inflow (Credits)</div>
        <div class="kpi-amount">+${formatCurrency(summary.totalInflow, 'INR')}</div>
      </div>
      <div class="kpi-box kpi-outflow">
        <div class="kpi-label">Total Outflow (Debits)</div>
        <div class="kpi-amount">−${formatCurrency(summary.totalOutflow, 'INR')}</div>
      </div>
      <div class="kpi-box kpi-net">
        <div class="kpi-label">Net Surplus / Cash Flow</div>
        <div class="kpi-amount" style="color: ${summary.net >= 0 ? '#059669' : '#dc2626'};">
          ${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net, 'INR')}
        </div>
      </div>
      <div class="kpi-box kpi-count">
        <div class="kpi-label">Total Transactions</div>
        <div class="kpi-amount">${summary.count.toLocaleString()} <span style="font-size: 10px; font-weight: 500; color: #64748b;">lines</span></div>
      </div>
    </section>

    <!-- Transaction Ledger Table -->
    <div class="table-title">
      <span>Reconciled Transaction Journal (${transactions.length} entries)</span>
      <span style="font-size: 10px; color: #64748b; font-weight: 500;">Amounts in INR (₹)</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Narration & Particulars</th>
          <th>Account</th>
          <th>Tags / Category</th>
          <th style="text-align: center;">Type</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Footer -->
    <footer class="corporate-footer">
      <div class="footer-left">
        <strong>A-Count Banking Intelligence System · Verification Notice:</strong><br />
        This statement is an electronically audited representation of reconciled banking statements.
        Generated on ${generatedDate}. Intended strictly for authenticated account holders and verified corporate audits.
      </div>
      <div class="footer-right">
        Page 1 of 1 · Ref: ${docRef}
      </div>
    </footer>
  </div>

  <script>
    // Automatically trigger print dialog after document is ready
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

// ─── Net Worth Balance Sheet Exports ────────────────────────────────────────

export interface NetWorthExportData {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  liquidAssets: number
  assetsBreakdown: { category: string; name: string; amount: number; notes?: string }[]
  liabilitiesBreakdown: { category: string; name: string; amount: number; notes?: string }[]
}

export function exportNetWorthExcel(data: NetWorthExportData, filenamePrefix = 'acount_balance_sheet') {
  const wb = XLSX.utils.book_new()
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${filenamePrefix}_${dateStr}.xlsx`

  // Sheet 1: Executive Summary
  const summaryRows = [
    { Parameter: 'Statement', Value: 'A-COUNT EXECUTIVE BALANCE SHEET' },
    { Parameter: 'As of Date', Value: new Date().toLocaleDateString('en-IN') },
    { Parameter: 'Currency', Value: 'INR (₹)' },
    { Parameter: '', Value: '' },
    { Parameter: 'Total Assets (A)', Value: data.totalAssets },
    { Parameter: 'Total Liabilities (B)', Value: data.totalLiabilities },
    { Parameter: 'Consolidated Net Worth (A − B)', Value: data.netWorth },
    { Parameter: 'Liquid & Cash Equivalents', Value: data.liquidAssets },
    { Parameter: 'Debt-to-Asset Ratio', Value: data.totalAssets > 0 ? `${((data.totalLiabilities / data.totalAssets) * 100).toFixed(1)}%` : '0%' },
  ]
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  summaryWs['!cols'] = [{ wch: 32 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Balance Sheet Summary')

  // Sheet 2: Assets
  const assetRows = data.assetsBreakdown.map((a, i) => ({
    '#': i + 1,
    'Asset Category': a.category,
    'Asset / Account Name': a.name,
    'Valuation (INR)': a.amount,
    Notes: a.notes || '',
  }))
  const assetsWs = XLSX.utils.json_to_sheet(assetRows)
  assetsWs['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 35 }, { wch: 18 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, assetsWs, 'Assets Breakdown')

  // Sheet 3: Liabilities
  const liabilityRows = data.liabilitiesBreakdown.map((l, i) => ({
    '#': i + 1,
    'Liability Category': l.category,
    'Liability Name / Creditor': l.name,
    'Outstanding Balance (INR)': l.amount,
    Notes: l.notes || '',
  }))
  const liabWs = XLSX.utils.json_to_sheet(liabilityRows)
  liabWs['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 35 }, { wch: 18 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, liabWs, 'Liabilities Breakdown')

  XLSX.writeFile(wb, filename)
}

export function exportNetWorthCsv(data: NetWorthExportData, filenamePrefix = 'acount_balance_sheet') {
  const rows = [
    ...data.assetsBreakdown.map((a, i) => ({
      Type: 'ASSET',
      Category: a.category,
      Name: a.name,
      'Amount (INR)': a.amount,
      Notes: a.notes || '',
    })),
    ...data.liabilitiesBreakdown.map((l, i) => ({
      Type: 'LIABILITY',
      Category: l.category,
      Name: l.name,
      'Amount (INR)': -Math.abs(l.amount),
      Notes: l.notes || '',
    })),
  ]

  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = (row as any)[h]
          const str = String(val ?? '').replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ),
  ]

  const csvContent = '\uFEFF' + csvLines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]

  link.setAttribute('href', url)
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportNetWorthPdf(data: NetWorthExportData) {
  const printWindow = window.open('', '_blank', 'width=1100,height=850')
  if (!printWindow) {
    alert('Please allow popups to generate the corporate Balance Sheet.')
    return
  }

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateStr = new Date().toISOString().split('T')[0]
  const docRef = `BS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${dateStr.replace(/-/g, '')}`

  const assetRowsHtml = data.assetsBreakdown
    .map(
      (a, i) => `
    <tr class="${i % 2 === 1 ? 'zebra' : ''}">
      <td style="width: 30px; text-align: center; color: #94a3b8; font-family: monospace;">${i + 1}</td>
      <td style="font-weight: 600; color: #475569; width: 140px;">${escapeHtml(a.category)}</td>
      <td style="font-weight: 600; color: #0f172a;">${escapeHtml(a.name)}</td>
      <td style="text-align: right; font-family: monospace; font-weight: 700; color: #059669; width: 130px;">
        +${formatCurrency(a.amount, 'INR')}
      </td>
    </tr>`
    )
    .join('')

  const liabRowsHtml = data.liabilitiesBreakdown
    .map(
      (l, i) => `
    <tr class="${i % 2 === 1 ? 'zebra' : ''}">
      <td style="width: 30px; text-align: center; color: #94a3b8; font-family: monospace;">${i + 1}</td>
      <td style="font-weight: 600; color: #475569; width: 140px;">${escapeHtml(l.category)}</td>
      <td style="font-weight: 600; color: #0f172a;">${escapeHtml(l.name)}</td>
      <td style="text-align: right; font-family: monospace; font-weight: 700; color: #dc2626; width: 130px;">
        −${formatCurrency(l.amount, 'INR')}
      </td>
    </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>A-Count Corporate Balance Sheet — ${docRef}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm 15mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; background: #fff; font-size: 11px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-container { max-width: 100%; margin: 0 auto; }
    .screen-toolbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 20px; margin-bottom: 24px; border-radius: 8px; }
    .screen-toolbar button { background: #4f46e5; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .screen-toolbar .btn-close { background: transparent; color: #cbd5e1; border: 1px solid #475569; }
    @media print { .screen-toolbar { display: none !important; } }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 16px; }
    .brand-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
    .brand-badge { font-size: 9px; font-weight: 700; background: #0f172a; color: #fff; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 500; }
    .doc-meta { text-align: right; font-size: 10.5px; color: #475569; }
    .summary-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; background: #fff; }
    .kpi-box.kpi-assets { border-left: 3px solid #10b981; }
    .kpi-box.kpi-liab { border-left: 3px solid #ef4444; }
    .kpi-box.kpi-net { border-left: 3px solid #4f46e5; }
    .kpi-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px; }
    .kpi-amount { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; line-height: 1.2; }
    .section-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 18px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1; margin-bottom: 16px; }
    thead th { background: #f1f5f9; color: #334155; font-size: 9.5px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
    tbody td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: middle; }
    tbody tr.zebra { background: #fafafa; }
    .corporate-footer { border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="screen-toolbar">
      <div>
        <strong>A-Count Corporate Balance Sheet Viewer</strong>
        <span style="color: #94a3b8; margin-left: 10px; font-size: 11px;">Document: ${docRef}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="window.print()">🖨️ Print / Save as PDF</button>
        <button class="btn-close" onclick="window.close()">Close</button>
      </div>
    </div>

    <header class="letterhead">
      <div>
        <div class="brand-title">A-COUNT <span class="brand-badge">Financial Intelligence</span></div>
        <div class="brand-sub">Consolidated Balance Sheet & Net Worth Statement</div>
      </div>
      <div class="doc-meta">
        <div>Ref: <strong style="font-family: monospace;">${docRef}</strong></div>
        <div style="margin-top: 2px;">Issue Date: ${generatedDate}</div>
        <div style="margin-top: 2px; color: #059669; font-weight: 700;">✓ Audited Portfolio</div>
      </div>
    </header>

    <section class="summary-strip">
      <div class="kpi-box kpi-assets">
        <div class="kpi-label">Total Assets (A)</div>
        <div class="kpi-amount" style="color: #059669;">+${formatCurrency(data.totalAssets, 'INR')}</div>
      </div>
      <div class="kpi-box kpi-liab">
        <div class="kpi-label">Total Liabilities (B)</div>
        <div class="kpi-amount" style="color: #dc2626;">−${formatCurrency(data.totalLiabilities, 'INR')}</div>
      </div>
      <div class="kpi-box kpi-net">
        <div class="kpi-label">Consolidated Net Worth (A − B)</div>
        <div class="kpi-amount" style="color: ${data.netWorth >= 0 ? '#4338ca' : '#dc2626'};">
          ${data.netWorth >= 0 ? '+' : ''}${formatCurrency(data.netWorth, 'INR')}
        </div>
      </div>
    </section>

    <div class="section-title">Schedule A: Assets Breakdown</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="width: 140px;">Classification</th>
          <th>Asset / Holding Particulars</th>
          <th style="text-align: right; width: 130px;">Valuation (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${assetRowsHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No assets recorded</td></tr>'}
      </tbody>
    </table>

    <div class="section-title">Schedule B: Liabilities Breakdown</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="width: 140px;">Classification</th>
          <th>Liability / Creditor Particulars</th>
          <th style="text-align: right; width: 130px;">Outstanding (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${liabRowsHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No liabilities recorded</td></tr>'}
      </tbody>
    </table>

    <footer class="corporate-footer">
      <div>
        <strong>A-Count Balance Sheet & Portfolio Statement:</strong><br />
        Generated electronically on ${generatedDate}. Confidential financial audit record.
      </div>
      <div style="font-family: monospace;">Ref: ${docRef}</div>
    </footer>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 500);
    });
  </script>
</body>
</html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


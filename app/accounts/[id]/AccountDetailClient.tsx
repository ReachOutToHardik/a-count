'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Account, Transaction } from '@/lib/types'
import { formatCurrency, formatDate, getMonthLabel } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import {
  ArrowLeft,
  Search,
  UploadCloud,
  Calendar,
  Landmark,
  TrendingUp,
  TrendingDown,
  Layers,
  Check,
  Copy,
  ArrowLeftRight,
  BarChart3,
  BarChart2,
  Activity,
  Clock,
  RefreshCw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  account: Account
  transactions: Transaction[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
}

type DatePreset =
  | 'all'
  | 'last_15'
  | 'last_30'
  | 'this_month'
  | 'last_month'
  | 'last_90'
  | 'last_180'
  | 'this_year'
  | 'custom'

type Granularity = 'auto' | 'daily' | 'weekly' | 'monthly'
type ChartViewType = 'area' | 'bar' | 'net'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const dataPoint = payload[0]?.payload
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: 'var(--shadow-md)',
        minWidth: 168,
      }}
    >
      <div
        style={{
          color: 'var(--text-muted)',
          marginBottom: 6,
          fontWeight: 700,
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {dataPoint?.fullDate || label}
      </div>
      {payload.map((p: any) => (
        <div
          key={p.name}
          style={{
            color: p.color,
            display: 'flex',
            gap: 14,
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.color }}>
            {formatCurrency(p.value, 'INR')}
          </span>
        </div>
      ))}
      {dataPoint?.Net !== undefined && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: dataPoint.Net >= 0 ? 'var(--green)' : 'var(--red)',
            fontWeight: 700,
          }}
        >
          <span>Net {dataPoint.Net >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {dataPoint.Net >= 0 ? '+' : ''}
            {formatCurrency(dataPoint.Net, 'INR')}
          </span>
        </div>
      )}
      {dataPoint?.txCount !== undefined && dataPoint.txCount > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
          {dataPoint.txCount} transaction{dataPoint.txCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default function AccountDetailClient({ account, transactions = [], tagMap = {} }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [chartViewType, setChartViewType] = useState<ChartViewType>('area')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()

  // Find min and max transaction dates from actual data
  const { minTxDate, maxTxDate } = useMemo(() => {
    const dates = (transactions || []).map(t => t.date).filter(Boolean).sort()
    if (dates.length === 0) return { minTxDate: null, maxTxDate: null }
    return { minTxDate: dates[0], maxTxDate: dates[dates.length - 1] }
  }, [transactions])

  // Current date calculations
  const { currentMonthKey, lastMonthKey, currentYearKey } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const cm = `${y}-${String(m).padStart(2, '0')}`

    const lastMonthDate = new Date(y, m - 2, 1)
    const lm = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    return { currentMonthKey: cm, lastMonthKey: lm, currentYearKey: String(y) }
  }, [])

  // Calculate Date Range Boundaries from Active Preset
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Use latest transaction date as anchor if today has no txns and transactions exist
    const anchorDate = maxTxDate && maxTxDate > todayStr ? new Date(maxTxDate) : now
    const anchorStr = anchorDate.toISOString().split('T')[0]

    if (datePreset === 'last_15') {
      const d = new Date(anchorDate.getTime() - 15 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: anchorStr, rangeLabel: 'Last 15 Days' }
    }
    if (datePreset === 'last_30') {
      const d = new Date(anchorDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: anchorStr, rangeLabel: 'Last 30 Days' }
    }
    if (datePreset === 'this_month') {
      const start = `${currentMonthKey}-01`
      return { startDate: start, endDate: todayStr, rangeLabel: `This Month (${getMonthLabel(currentMonthKey)})` }
    }
    if (datePreset === 'last_month') {
      const start = `${lastMonthKey}-01`
      const parts = lastMonthKey.split('-')
      const lastDay = new Date(+parts[0], +parts[1], 0).getDate()
      const end = `${lastMonthKey}-${String(lastDay).padStart(2, '0')}`
      return { startDate: start, endDate: end, rangeLabel: `Last Month (${getMonthLabel(lastMonthKey)})` }
    }
    if (datePreset === 'last_90') {
      const d = new Date(anchorDate.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: anchorStr, rangeLabel: 'Last 90 Days' }
    }
    if (datePreset === 'last_180') {
      const d = new Date(anchorDate.getTime() - 180 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: anchorStr, rangeLabel: 'Last 6 Months' }
    }
    if (datePreset === 'this_year') {
      const start = `${currentYearKey}-01-01`
      return { startDate: start, endDate: todayStr, rangeLabel: `Year ${currentYearKey}` }
    }
    if (datePreset === 'custom') {
      return {
        startDate: customStart || null,
        endDate: customEnd || null,
        rangeLabel: customStart && customEnd ? `${formatDate(customStart)} – ${formatDate(customEnd)}` : 'Custom Range',
      }
    }

    // 'all' — Spans the entire actual history of transactions
    const spanText = minTxDate && maxTxDate ? ` (${formatDate(minTxDate)} – ${formatDate(maxTxDate)})` : ''
    return { startDate: null, endDate: null, rangeLabel: `All Time${spanText}` }
  }, [datePreset, currentMonthKey, lastMonthKey, currentYearKey, customStart, customEnd, minTxDate, maxTxDate])

  // Filter Transactions by Date Range, Type, and Search
  const filtered = useMemo(() => {
    let list = transactions || []

    if (startDate) {
      list = list.filter(t => t.date >= startDate)
    }
    if (endDate) {
      list = list.filter(t => t.date <= endDate)
    }
    if (typeFilter !== 'all') {
      list = list.filter(tx => tx.type === typeFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(tx => {
        return (
          (tx.description ?? '').toLowerCase().includes(q) ||
          (tx.upi_vpa ?? '').toLowerCase().includes(q) ||
          (tx.upi_name ?? '').toLowerCase().includes(q) ||
          (tx.ref_no ?? '').toLowerCase().includes(q) ||
          (Array.isArray(tx.tags) && tx.tags.some(t => t.toLowerCase().includes(q)))
        )
      })
    }

    return list
  }, [transactions, startDate, endDate, typeFilter, search])

  // Reactive KPI summary based on filtered transactions
  const { credit, debit, balance, creditCount, debitCount } = useMemo(() => {
    let c = 0
    let d = 0
    let cc = 0
    let dc = 0
    for (const tx of filtered) {
      if (tx.type === 'credit') {
        c += Number(tx.amount) || 0
        cc++
      } else {
        d += Number(tx.amount) || 0
        dc++
      }
    }
    return { credit: c, debit: d, balance: c - d, creditCount: cc, debitCount: dc }
  }, [filtered])

  // Total account balance across all time
  const totalLedgerBalance = useMemo(() => {
    let c = 0
    let d = 0
    for (const tx of transactions) {
      if (tx.type === 'credit') c += Number(tx.amount) || 0
      else d += Number(tx.amount) || 0
    }
    return c - d
  }, [transactions])

  // Determine effective granularity
  const effectiveGranularity = useMemo(() => {
    if (granularity !== 'auto') return granularity

    if (startDate && endDate) {
      const startMs = new Date(startDate).getTime()
      const endMs = new Date(endDate).getTime()
      const days = Math.max(1, Math.ceil((endMs - startMs) / (24 * 3600 * 1000)))
      if (days <= 35) return 'daily'
      if (days <= 100) return 'weekly'
      return 'monthly'
    }

    if (datePreset === 'last_15' || datePreset === 'last_30' || datePreset === 'this_month' || datePreset === 'last_month') {
      return 'daily'
    }

    return 'monthly'
  }, [granularity, startDate, endDate, datePreset])

  // Smart Chart Data — accurately mapped to the real data
  const chartData = useMemo(() => {
    if (filtered.length === 0) return []

    if (effectiveGranularity === 'daily') {
      let start = startDate
      let end = endDate
      if (!start || !end) {
        const dates = filtered.map(t => t.date).filter(Boolean).sort()
        start = dates[0]
        end = dates[dates.length - 1]
      }
      if (!start || !end) return []

      const dayMap: Record<string, { Income: number; Expense: number; txCount: number }> = {}
      for (const tx of filtered) {
        if (!tx.date) continue
        if (!dayMap[tx.date]) dayMap[tx.date] = { Income: 0, Expense: 0, txCount: 0 }
        if (tx.type === 'credit') dayMap[tx.date].Income += Number(tx.amount) || 0
        else dayMap[tx.date].Expense += Number(tx.amount) || 0
        dayMap[tx.date].txCount++
      }

      const result = []
      const cur = new Date(start + 'T00:00:00')
      const stop = new Date(end + 'T00:00:00')
      let loopGuard = 0

      while (cur <= stop && loopGuard < 366) {
        loopGuard++
        const key = cur.toISOString().split('T')[0]
        const dayData = dayMap[key] || { Income: 0, Expense: 0, txCount: 0 }
        const dayNum = cur.getDate()
        const monthShort = cur.toLocaleString('en', { month: 'short' })
        const weekday = cur.toLocaleString('en', { weekday: 'short' })

        result.push({
          key,
          label: `${dayNum} ${monthShort}`,
          fullDate: `${weekday}, ${dayNum} ${monthShort} ${cur.getFullYear()}`,
          Income: Math.round(dayData.Income),
          Expense: Math.round(dayData.Expense),
          Net: Math.round(dayData.Income - dayData.Expense),
          txCount: dayData.txCount,
        })
        cur.setDate(cur.getDate() + 1)
      }

      return result
    }

    if (effectiveGranularity === 'weekly') {
      const dates = filtered.map(t => t.date).filter(Boolean).sort()
      const start = startDate || dates[0]
      const end = endDate || dates[dates.length - 1]
      if (!start || !end) return []

      const result = []
      const cur = new Date(start + 'T00:00:00')
      const stop = new Date(end + 'T00:00:00')
      let weekIndex = 1

      while (cur <= stop && weekIndex < 60) {
        const weekStartStr = cur.toISOString().split('T')[0]
        const weekEnd = new Date(cur.getTime() + 6 * 24 * 3600 * 1000)
        const weekEndStr = weekEnd.toISOString().split('T')[0]

        let wIncome = 0
        let wExpense = 0
        let wCount = 0

        for (const tx of filtered) {
          if (!tx.date) continue
          if (tx.date >= weekStartStr && tx.date <= weekEndStr) {
            if (tx.type === 'credit') wIncome += Number(tx.amount) || 0
            else wExpense += Number(tx.amount) || 0
            wCount++
          }
        }

        const startLabel = `${cur.getDate()} ${cur.toLocaleString('en', { month: 'short' })}`
        result.push({
          key: weekStartStr,
          label: `W${weekIndex} (${startLabel})`,
          fullDate: `Week ${weekIndex}: ${weekStartStr} to ${weekEndStr}`,
          Income: Math.round(wIncome),
          Expense: Math.round(wExpense),
          Net: Math.round(wIncome - wExpense),
          txCount: wCount,
        })

        cur.setDate(cur.getDate() + 7)
        weekIndex++
      }

      return result
    }

    // Monthly Aggregation — Spanning the exact months of the actual data
    const monthMap: Record<string, { Income: number; Expense: number; txCount: number }> = {}

    // Find all distinct months in the filtered data
    const activeMonths = new Set<string>()
    for (const tx of filtered) {
      if (!tx.date) continue
      const mKey = tx.date.substring(0, 7)
      activeMonths.add(mKey)
      if (!monthMap[mKey]) monthMap[mKey] = { Income: 0, Expense: 0, txCount: 0 }
      if (tx.type === 'credit') monthMap[mKey].Income += Number(tx.amount) || 0
      else monthMap[mKey].Expense += Number(tx.amount) || 0
      monthMap[mKey].txCount++
    }

    const sortedMonths = Array.from(activeMonths).sort()
    return sortedMonths.map(mKey => {
      const data = monthMap[mKey] || { Income: 0, Expense: 0, txCount: 0 }
      return {
        key: mKey,
        label: getMonthLabel(mKey),
        fullDate: getMonthLabel(mKey),
        Income: Math.round(data.Income),
        Expense: Math.round(data.Expense),
        Net: Math.round(data.Income - data.Expense),
        txCount: data.txCount,
      }
    })
  }, [filtered, effectiveGranularity, startDate, endDate])

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div>
      {/* Back Button & Account Identity */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/accounts" className="btn btn-secondary btn-sm">
            <ArrowLeft size={13} /> Back to Accounts
          </Link>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: account.color, flexShrink: 0 }} />
          <div>
            <h1 className="page-title" style={{ fontSize: 18, marginBottom: 0 }}>
              {account.name}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {account.bank_name || 'Bank Account'} ·{' '}
              <span style={{ textTransform: 'capitalize' }}>{account.account_type}</span> · INR (₹)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/transactions?account=${account.id}`} className="btn btn-secondary btn-sm">
            <ArrowLeftRight size={13} /> View in Ledger
          </Link>
          <Link href={`/analytics?account=${account.id}`} className="btn btn-secondary btn-sm">
            <BarChart3 size={13} /> Account Analytics
          </Link>
          <Link href={`/import?account=${account.id}`} className="btn btn-primary btn-sm">
            <UploadCloud size={13} /> Import Statement
          </Link>
        </div>
      </div>

      {/* ── Period & Resolution Filter Control Bar ──────────────────────── */}
      <div className="card mb-6" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginRight: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Calendar size={13} style={{ color: 'var(--accent)' }} /> Period:
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'last_15', label: '15 Days' },
                { id: 'last_30', label: '30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_90', label: '90 Days' },
                { id: 'last_180', label: '6 Months' },
                { id: 'this_year', label: `${currentYearKey}` },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                className={`filter-chip ${datePreset === preset.id ? 'active' : ''}`}
                onClick={() => setDatePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Resolution & Reset Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Resolution:</span>
            <select
              className="select"
              value={granularity}
              onChange={e => setGranularity(e.target.value as Granularity)}
              style={{ width: 110, fontSize: 12, height: 32 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="auto">Auto ({effectiveGranularity})</option>
            </select>

            {(datePreset !== 'all' || search || typeFilter !== 'all') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDatePreset('all')
                  setSearch('')
                  setTypeFilter('all')
                  setCustomStart('')
                  setCustomEnd('')
                }}
                title="Reset all filters"
                style={{ color: 'var(--text-muted)', fontSize: 11, padding: '4px 8px' }}
              >
                <RefreshCw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers Row */}
        {datePreset === 'custom' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className="input"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              style={{ width: 140, height: 30, fontSize: 12 }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="input"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              style={{ width: 140, height: 30, fontSize: 12 }}
            />
          </div>
        )}

        {/* Active Range Feedback Bar */}
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} style={{ color: 'var(--accent)' }} />
            <span>
              Active Range: <strong style={{ color: 'var(--text-primary)' }}>{rangeLabel}</strong>
            </span>
          </div>
          <div>
            Showing <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{filtered.length.toLocaleString()}</strong> transaction{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Account KPI Ribbon (Reactive to selected timeframe) */}
      <div className="kpi-grid mb-6">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">
              {datePreset === 'all' ? 'All-Time Net Balance' : 'Period Net Cash Flow'}
            </span>
            <div className="kpi-icon-wrap" style={{ background: balance >= 0 ? 'var(--green-subtle)' : 'var(--red-subtle)', color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              <Landmark size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: balance >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance, 'INR')}
          </div>
          <div className="kpi-footer">
            <span>
              {datePreset === 'all' ? `Lifetime ledger total` : `Net change in ${rangeLabel}`}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Credits (Inflow)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>
            +{formatCurrency(credit, 'INR')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-tag positive">{creditCount} Credit Transaction{creditCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Debits (Outflow)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>
            −{formatCurrency(debit, 'INR')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-tag negative">{debitCount} Debit Entry{debitCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Transactions in View</span>
            <div className="kpi-icon-wrap">
              <Layers size={14} />
            </div>
          </div>
          <div className="kpi-value">{filtered.length.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>Matching current filters</span>
          </div>
        </div>
      </div>

      {/* ── Cash Flow Chart (Waves, Bars, Net Curve) ────────────────────── */}
      <div className="chart-wrap mb-6">
        <div className="chart-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="chart-title">Account Inflow vs Outflow History</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {chartData.length > 0
                ? `Cash flow mapped across ${chartData.length} ${effectiveGranularity} point${chartData.length !== 1 ? 's' : ''} in ${rangeLabel}`
                : 'No cash flow records found in this window'}
            </div>
          </div>

          {/* Visual Mode Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className={`btn btn-sm ${chartViewType === 'area' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                onClick={() => setChartViewType('area')}
                title="Gradient Waves"
              >
                <Activity size={12} /> Waves
              </button>
              <button
                type="button"
                className={`btn btn-sm ${chartViewType === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                onClick={() => setChartViewType('bar')}
                title="Side-by-side Bars"
              >
                <BarChart2 size={12} /> Bars
              </button>
              <button
                type="button"
                className={`btn btn-sm ${chartViewType === 'net' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                onClick={() => setChartViewType('net')}
                title="Net Flow Curve"
              >
                <TrendingUp size={12} /> Net
              </button>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            {chartViewType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="acctInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="acctExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={chartData.length > 25 ? Math.ceil(chartData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="#10b981"
                  fill="url(#acctInc)"
                  strokeWidth={2}
                  name="Income (+)"
                  dot={chartData.length <= 15}
                />
                <Area
                  type="monotone"
                  dataKey="Expense"
                  stroke="#ef4444"
                  fill="url(#acctExp)"
                  strokeWidth={2}
                  name="Expense (−)"
                  dot={chartData.length <= 15}
                />
              </AreaChart>
            ) : chartViewType === 'bar' ? (
              <BarChart data={chartData} barGap={3} barCategoryGap={chartData.length > 20 ? '15%' : '28%'}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={chartData.length > 25 ? Math.ceil(chartData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income (+)" />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense (−)" />
              </BarChart>
            ) : (
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="acctNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={chartData.length > 25 ? Math.ceil(chartData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="Net"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#acctNetGrad)"
                  name="Net Flow"
                  dot={chartData.length <= 15}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: 36 }}>
            <div className="empty-state-title">No transactions found in this period</div>
            <div className="empty-state-sub">Try switching to &quot;All Time&quot; or uploading new statement entries.</div>
          </div>
        )}
      </div>

      {/* ── Search & Type Filter Toolbar ─────────────────────────────────── */}
      <div className="filter-toolbar mb-4">
        <div className="filter-group">
          <div className="search-input-wrap" style={{ width: 280 }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              placeholder="Search narration, UPI, ref, or tag…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(['all', 'credit', 'debit'] as const).map(t => (
            <button
              key={t}
              className={`filter-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All Entries' : t === 'credit' ? 'Credits (+)' : 'Debits (−)'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length.toLocaleString()} matching entry{filtered.length !== 1 ? 's' : ''}
          </span>
          <Link href={`/transactions?account=${account.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
            Open Filtered in Full Ledger →
          </Link>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-container">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description / Narration</th>
                <th>Tags</th>
                <th>Reference ID</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 300).map(tx => (
                  <tr key={tx.id}>
                    <td className="td-date">{formatDate(tx.date)}</td>
                    <td>
                      <div style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {tx.description}
                      </div>
                      {tx.upi_vpa && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tx.upi_vpa}</span>
                          <button
                            onClick={() => handleCopy(tx.upi_vpa!, tx.id)}
                            style={{ opacity: 0.5, cursor: 'pointer', padding: 1, background: 'none', border: 'none' }}
                            title="Copy UPI VPA"
                          >
                            {copiedId === tx.id ? <Check size={10} style={{ color: 'var(--green)' }} /> : <Copy size={10} />}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="tags-cell">
                        {Array.isArray(tx.tags) && tx.tags.map(t => (
                          <Link key={t} href={`/transactions?tag=${encodeURIComponent(t)}`} style={{ textDecoration: 'none' }}>
                            <TagPill tag={t} color={tagMap[t]?.color} small />
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      {tx.ref_no || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`td-mono ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                        {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount, 'INR')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

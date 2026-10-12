'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Transaction, Account } from '@/lib/types'
import { formatCurrency, formatDate, getMonthLabel, computeCategoryStats } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  ArrowUpRight,
  Landmark,
  Plus,
  UploadCloud,
  Layers,
  Calendar,
  Check,
  Copy,
  RefreshCw,
  Clock,
  BarChart2,
  Activity,
  PieChart as PieIcon,
  ListOrdered,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine,
} from 'recharts'

interface Props {
  accounts?: Account[]
  transactions?: Transaction[]
  tagMap?: Record<string, { name: string; color: string; icon: string }>
}

type DatePreset =
  | 'all'
  | 'last_7'
  | 'last_15'
  | 'last_30'
  | 'this_month'
  | 'last_month'
  | 'last_90'
  | 'last_180'
  | 'this_year'
  | 'month_select'
  | 'custom'

type Granularity = 'auto' | 'daily' | 'weekly' | 'monthly'
type ChartViewType = 'bar' | 'area' | 'net'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const dataPoint = payload[0]?.payload
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
      minWidth: 168,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {dataPoint?.fullDate || (typeof label === 'string' && label.length === 7 ? getMonthLabel(label) : label)}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 14, justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.color }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
      {dataPoint?.Net !== undefined && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: dataPoint.Net >= 0 ? 'var(--green)' : 'var(--red)',
          fontWeight: 700,
        }}>
          <span>Net {dataPoint.Net >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {dataPoint.Net >= 0 ? '+' : ''}{formatCurrency(dataPoint.Net)}
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

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const pct = item.payload?.percentage || '0'
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
        {formatCurrency(item.value)} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({pct}%)</span>
      </div>
    </div>
  )
}

export default function DashboardClient({
  accounts = [],
  transactions = [],
  tagMap = {},
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Chart visual and aggregation states
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [chartViewType, setChartViewType] = useState<ChartViewType>('bar')
  const [categoryView, setCategoryView] = useState<'donut' | 'bars'>('donut')

  // Extract all distinct months available in transaction history (sorted descending)
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    const txList = transactions || []
    for (const tx of txList) {
      if (tx?.date) {
        months.add(tx.date.substring(0, 7))
      }
    }
    const now = new Date()
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    months.add(cur)
    return Array.from(months).sort().reverse()
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

    if (datePreset === 'last_7') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 7 Days' }
    }
    if (datePreset === 'last_15') {
      const d = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 15 Days' }
    }
    if (datePreset === 'last_30') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 30 Days' }
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
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 90 Days' }
    }
    if (datePreset === 'last_180') {
      const d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 6 Months' }
    }
    if (datePreset === 'this_year') {
      const start = `${currentYearKey}-01-01`
      return { startDate: start, endDate: todayStr, rangeLabel: `Year ${currentYearKey}` }
    }
    if (datePreset === 'month_select' && selectedMonth) {
      const start = `${selectedMonth}-01`
      const parts = selectedMonth.split('-')
      const lastDay = new Date(+parts[0], +parts[1], 0).getDate()
      const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
      return { startDate: start, endDate: end, rangeLabel: `Month of ${getMonthLabel(selectedMonth)}` }
    }
    if (datePreset === 'custom') {
      return {
        startDate: customStart || null,
        endDate: customEnd || null,
        rangeLabel: customStart && customEnd ? `${formatDate(customStart)} – ${formatDate(customEnd)}` : 'Custom Range',
      }
    }
    return { startDate: null, endDate: null, rangeLabel: 'All Time' }
  }, [datePreset, currentMonthKey, lastMonthKey, currentYearKey, selectedMonth, customStart, customEnd])

  // Filter Transactions by Account and Date Range
  const filteredTransactions = useMemo(() => {
    let list = transactions || []

    if (accountFilter !== 'all') {
      list = list.filter(t => t.account_id === accountFilter)
    }

    if (startDate) {
      list = list.filter(t => t.date >= startDate)
    }
    if (endDate) {
      list = list.filter(t => t.date <= endDate)
    }

    return list
  }, [transactions, accountFilter, startDate, endDate])

  // Reactive KPI Calculations
  const { totalInflow, totalOutflow, netFlow, creditCount, debitCount, savingsRate } = useMemo(() => {
    let inflow = 0
    let outflow = 0
    let cCount = 0
    let dCount = 0

    for (const tx of filteredTransactions) {
      if (tx.type === 'credit') {
        inflow += tx.amount
        cCount++
      } else {
        outflow += tx.amount
        dCount++
      }
    }

    const net = inflow - outflow
    const rate = inflow > 0 ? Math.max(0, ((inflow - outflow) / inflow) * 100) : 0

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netFlow: net,
      creditCount: cCount,
      debitCount: dCount,
      savingsRate: rate,
    }
  }, [filteredTransactions])

  // Per-account balances in the filtered timeframe
  const accountBalances = useMemo(() => {
    const balances: Record<string, { credit: number; debit: number; net: number }> = {}
    for (const acc of (accounts || [])) {
      balances[acc.id] = { credit: 0, debit: 0, net: 0 }
    }
    for (const tx of filteredTransactions) {
      if (!balances[tx.account_id]) {
        balances[tx.account_id] = { credit: 0, debit: 0, net: 0 }
      }
      if (tx.type === 'credit') balances[tx.account_id].credit += tx.amount
      else balances[tx.account_id].debit += tx.amount
      balances[tx.account_id].net = balances[tx.account_id].credit - balances[tx.account_id].debit
    }
    return balances
  }, [accounts, filteredTransactions])

  // Reactive Category Stats
  const categoryStats = useMemo(() => {
    const safeTagMap = tagMap || {}
    const colorLookup: Record<string, string> = {}
    for (const [k, v] of Object.entries(safeTagMap)) {
      if (v?.color) colorLookup[k] = v.color
    }
    return computeCategoryStats(filteredTransactions, colorLookup)
  }, [filteredTransactions, tagMap])

  const totalCategorySpend = useMemo(() => categoryStats.reduce((s, c) => s + c.amount, 0), [categoryStats])

  const topCategories = useMemo(() => {
    return categoryStats.slice(0, 6).map(c => ({
      ...c,
      percentage: totalCategorySpend > 0 ? ((c.amount / totalCategorySpend) * 100).toFixed(0) : '0',
    }))
  }, [categoryStats, totalCategorySpend])

  // Determine effective granularity based on user preference or timeframe duration
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

    if (datePreset === 'last_7' || datePreset === 'last_15' || datePreset === 'last_30' || datePreset === 'this_month' || datePreset === 'last_month') {
      return 'daily'
    }

    return 'monthly'
  }, [granularity, startDate, endDate, datePreset])

  // Smart Chart Data (Daily continuous timeline for short periods, Weekly or Monthly for longer)
  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return []

    if (effectiveGranularity === 'daily') {
      let start = startDate
      let end = endDate
      if (!start || !end) {
        const dates = filteredTransactions.map(t => t.date).filter(Boolean).sort()
        start = dates[0]
        end = dates[dates.length - 1]
      }
      if (!start || !end) return []

      const dayMap: Record<string, { Income: number; Expense: number; txCount: number }> = {}
      for (const tx of filteredTransactions) {
        if (!tx.date) continue
        if (!dayMap[tx.date]) dayMap[tx.date] = { Income: 0, Expense: 0, txCount: 0 }
        if (tx.type === 'credit') dayMap[tx.date].Income += tx.amount
        else dayMap[tx.date].Expense += tx.amount
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
      const dates = filteredTransactions.map(t => t.date).filter(Boolean).sort()
      const start = startDate || dates[0] || new Date().toISOString().split('T')[0]
      const end = endDate || dates[dates.length - 1] || new Date().toISOString().split('T')[0]

      const result = []
      const cur = new Date(start + 'T00:00:00')
      const stop = new Date(end + 'T00:00:00')
      let weekIndex = 1
      let loopGuard = 0

      while (cur <= stop && loopGuard < 54) {
        loopGuard++
        const weekStart = new Date(cur)
        const weekEnd = new Date(cur.getTime() + 6 * 24 * 60 * 60 * 1000)
        const actualEnd = weekEnd > stop ? stop : weekEnd

        const startStr = weekStart.toISOString().split('T')[0]
        const endStr = actualEnd.toISOString().split('T')[0]

        let income = 0
        let expense = 0
        let count = 0

        for (const tx of filteredTransactions) {
          if (tx.date && tx.date >= startStr && tx.date <= endStr) {
            if (tx.type === 'credit') income += tx.amount
            else expense += tx.amount
            count++
          }
        }

        const sLabel = `${weekStart.getDate()} ${weekStart.toLocaleString('en', { month: 'short' })}`
        const eLabel = `${actualEnd.getDate()} ${actualEnd.toLocaleString('en', { month: 'short' })}`

        result.push({
          key: `W${weekIndex}`,
          label: `W${weekIndex} (${sLabel})`,
          fullDate: `${sLabel} – ${eLabel}`,
          Income: Math.round(income),
          Expense: Math.round(expense),
          Net: Math.round(income - expense),
          txCount: count,
        })

        cur.setDate(cur.getDate() + 7)
        weekIndex++
      }

      return result
    }

    // Monthly Aggregation
    const monthlyMap: Record<string, { Income: number; Expense: number; txCount: number }> = {}

    for (const tx of filteredTransactions) {
      const m = tx.date ? tx.date.substring(0, 7) : 'Unknown'
      if (!monthlyMap[m]) monthlyMap[m] = { Income: 0, Expense: 0, txCount: 0 }
      if (tx.type === 'credit') monthlyMap[m].Income += tx.amount
      else monthlyMap[m].Expense += tx.amount
      monthlyMap[m].txCount++
    }

    return Object.keys(monthlyMap).sort().map(month => {
      const parts = month.split('-')
      const formattedLabel = parts.length >= 2
        ? new Date(+parts[0], +parts[1] - 1).toLocaleString('en', { month: 'short', year: '2-digit' })
        : month

      return {
        key: month,
        label: formattedLabel,
        fullDate: getMonthLabel(month),
        Income: Math.round(monthlyMap[month].Income),
        Expense: Math.round(monthlyMap[month].Expense),
        Net: Math.round(monthlyMap[month].Income - monthlyMap[month].Expense),
        txCount: monthlyMap[month].txCount,
      }
    })
  }, [filteredTransactions, effectiveGranularity, startDate, endDate])

  // Highlights / Stats for Chart
  const chartHighlights = useMemo(() => {
    if (chartData.length === 0) return null
    let maxExpense = 0
    let maxExpenseLabel = ''
    let totalExpense = 0

    for (const d of chartData) {
      if (d.Expense > maxExpense) {
        maxExpense = d.Expense
        maxExpenseLabel = d.label
      }
      totalExpense += d.Expense
    }

    const avgSpend = Math.round(totalExpense / chartData.length)

    return {
      maxExpense,
      maxExpenseLabel,
      avgSpend,
    }
  }, [chartData])

  // Recent Transactions slice
  const recent = useMemo(() => filteredTransactions.slice(0, 8), [filteredTransactions])

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function handleMonthDropdown(month: string) {
    if (!month) {
      setDatePreset('all')
      setSelectedMonth('')
    } else {
      setSelectedMonth(month)
      setDatePreset('month_select')
    }
  }

  return (
    <div>
      {/* Top Header */}
      <motion.div
        className="page-header"
        style={{ marginBottom: 16 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Cash flow · account ledgers · spending analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/import" className="btn btn-primary">
            <UploadCloud size={14} />
            Import Statement
          </Link>
          <Link href="/accounts" className="btn btn-secondary">
            <Landmark size={14} />
            Accounts ({accounts.length})
          </Link>
        </div>
      </motion.div>

      {/* ── Comprehensive Filter Control Bar ─────────────────────────────── */}
      <div className="card mb-6" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          
          {/* Preset Buttons with 15 Days, 30 Days, 90 Days, 6 Months, All Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                onClick={() => {
                  setDatePreset(preset.id)
                  setSelectedMonth('')
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Selectors: Month Dropdown & Account Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Specific Month Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                className="select"
                value={datePreset === 'month_select' ? selectedMonth : ''}
                onChange={e => handleMonthDropdown(e.target.value)}
                style={{ width: 160, fontSize: 12, height: 32 }}
              >
                <option value="">Specific Month…</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Selector */}
            <select
              className="select"
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              style={{ width: 170, fontSize: 12, height: 32 }}
            >
              <option value="all">All Accounts ({accounts.length})</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Clear / Reset Filter Button */}
            {(datePreset !== 'all' || accountFilter !== 'all') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDatePreset('all')
                  setAccountFilter('all')
                  setSelectedMonth('')
                  setCustomStart('')
                  setCustomEnd('')
                }}
                title="Reset all filters to All Time"
                style={{ color: 'var(--text-muted)', fontSize: 11, padding: '4px 8px' }}
              >
                <RefreshCw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers Row (When 'custom' is active) */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
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
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} style={{ color: 'var(--accent)' }} />
            <span>Active Range: <strong style={{ color: 'var(--text-primary)' }}>{rangeLabel}</strong></span>
            {accountFilter !== 'all' && (
              <span>· Account: <strong style={{ color: 'var(--text-primary)' }}>{accounts.find(a => a.id === accountFilter)?.name}</strong></span>
            )}
          </div>
          <div>
            Showing <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{filteredTransactions.length.toLocaleString()}</strong> transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── KPI Metrics Cards (100% Reactive & Inter-linked) ───────────── */}
      <div className="kpi-grid mb-6">
        {/* Net Flow / Net Worth */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
        <Link
          href="/networth"
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}
          title="Explore Net Worth breakdown & financial goals"
        >
          <div className="kpi-header">
            <span className="kpi-label">
              {datePreset === 'all' ? 'Consolidated Net Worth' : 'Period Net Cash Flow'}
            </span>
            <div className="kpi-icon-wrap" style={{ background: netFlow >= 0 ? 'var(--green-subtle)' : 'var(--red-subtle)', color: netFlow >= 0 ? 'var(--green)' : 'var(--red)' }}>
              <Wallet size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: netFlow >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
          </div>
          <div className="kpi-footer">
            <span>
              {datePreset === 'all'
                ? `Across ${accounts.length} linked account${accounts.length !== 1 ? 's' : ''}`
                : `Net change in ${rangeLabel}`}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Net Worth →</span>
          </div>
        </Link>
        </motion.div>

        {/* Inflow Credits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
        <Link
          href={`/transactions?type=credit${accountFilter !== 'all' ? `&account=${accountFilter}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}
          title="Click to view all credit inflows in ledger"
        >
          <div className="kpi-header">
            <span className="kpi-label">Total Inflow (Credits)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>
            +{formatCurrency(totalInflow)}
          </div>
          <div className="kpi-footer">
            <span className="kpi-tag positive">{creditCount} Credit Transaction{creditCount !== 1 ? 's' : ''}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>View Inflow →</span>
          </div>
        </Link>
        </motion.div>

        {/* Outflow Debits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
        <Link
          href={`/transactions?type=debit${accountFilter !== 'all' ? `&account=${accountFilter}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}
          title="Click to view all debit outflows in ledger"
        >
          <div className="kpi-header">
            <span className="kpi-label">Total Outflow (Debits)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>
            −{formatCurrency(totalOutflow)}
          </div>
          <div className="kpi-footer">
            <span className="kpi-tag negative">{debitCount} Debit Entry{debitCount !== 1 ? 's' : ''}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>View Outflow →</span>
          </div>
        </Link>
        </motion.div>

        {/* Savings Rate */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
        <Link
          href={`/analytics${accountFilter !== 'all' ? `?account=${accountFilter}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}
          title="Deep dive in Financial Analytics"
        >
          <div className="kpi-header">
            <span className="kpi-label">Savings Rate / Surplus</span>
            <div className="kpi-icon-wrap">
              <Percent size={14} />
            </div>
          </div>
          <div className="kpi-value">{savingsRate.toFixed(1)}%</div>
          <div className="kpi-footer">
            <span className={`kpi-tag ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'neutral' : 'negative'}`}>
              {savingsRate >= 20 ? 'Target Achieved (≥20%)' : savingsRate >= 10 ? 'Moderate' : savingsRate > 0 ? 'Low Margin' : 'Deficit / No Income'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Analytics →</span>
          </div>
        </Link>
        </motion.div>
      </div>

      {/* ── Linked Accounts Grid (Reactive to selected timeframe) ────────── */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">
            <Landmark size={13} style={{ color: 'var(--accent)' }} />
            Account Ledgers ({rangeLabel})
          </div>
          <div className="grid-auto">
            {accounts.map((acc, idx) => {
              const b = accountBalances[acc.id] || { credit: 0, debit: 0, net: 0 }
              const isSelected = accountFilter === acc.id
              return (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="account-card"
                  onClick={() => setAccountFilter(isSelected ? 'all' : acc.id)}
                  style={{
                    '--account-color': acc.color,
                    cursor: 'pointer',
                    outline: isSelected ? `2px solid ${acc.color}` : 'none',
                    outlineOffset: 2,
                  } as React.CSSProperties}
                  title="Click to filter dashboard to this account"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{acc.name}</div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: acc.color }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{acc.bank_name} · {acc.account_type}</div>
                  
                  <div className="account-balance" style={{ fontSize: 18, marginTop: 10, color: b.net >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
                    {b.net >= 0 ? '+' : ''}{formatCurrency(b.net)}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{formatCurrency(b.credit)}</span>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>−{formatCurrency(b.debit)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--accent)', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{isSelected ? '✓ Filter Active' : 'Filter to account'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/transactions?account=${acc.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit', fontWeight: 600 }} title="View account transactions">
                        Txns
                      </Link>
                      <Link href={`/accounts/${acc.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit' }} title="Open account ledger">
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts Section (Supercharged & Interactive) ─────────────────── */}
      <div className="grid-2 mb-6">
        {/* Cash Flow & Burn Trends Chart */}
        <div className="chart-wrap">
          <div className="chart-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="chart-title">Cash Flow & Burn Trends</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {chartData.length > 0
                  ? `Inflow vs outflow across ${chartData.length} ${effectiveGranularity} point${chartData.length !== 1 ? 's' : ''}`
                  : 'No cash flow in this period'}
              </div>
            </div>

            {/* View Mode & Granularity Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Chart Visual Mode */}
              <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${chartViewType === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                  onClick={() => setChartViewType('bar')}
                  title="Side-by-side Inflow vs Outflow Bars"
                >
                  <BarChart2 size={12} /> Bars
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chartViewType === 'area' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                  onClick={() => setChartViewType('area')}
                  title="Smooth Gradient Area Waves"
                >
                  <Activity size={12} /> Waves
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chartViewType === 'net' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                  onClick={() => setChartViewType('net')}
                  title="Net Flow Curve (Surplus vs Deficit)"
                >
                  <TrendingUp size={12} /> Net
                </button>
              </div>

              {/* Granularity Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Resolution:</span>
                <select
                  className="select"
                  value={granularity}
                  onChange={e => setGranularity(e.target.value as Granularity)}
                  style={{ height: 26, padding: '0 6px', fontSize: 11, width: 85 }}
                  title="Aggregation Resolution"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="auto">Auto ({effectiveGranularity})</option>
                </select>
              </div>

              <Link href="/analytics" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', marginLeft: 4 }}>
                Analytics →
              </Link>
            </div>
          </div>

          {/* Highlights summary bar */}
          {chartHighlights && (
            <div style={{ display: 'flex', gap: 14, padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: 12, fontSize: 11 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Avg Burn: </span>
                <strong style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>₹{chartHighlights.avgSpend.toLocaleString('en-IN')}/{effectiveGranularity === 'daily' ? 'day' : effectiveGranularity === 'weekly' ? 'wk' : 'mo'}</strong>
              </div>
              {chartHighlights.maxExpense > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Peak Spend: </span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{chartHighlights.maxExpense.toLocaleString('en-IN')}</strong> ({chartHighlights.maxExpenseLabel})
                </div>
              )}
            </div>
          )}

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              {chartViewType === 'bar' ? (
                <BarChart data={chartData} barGap={3} barCategoryGap={chartData.length > 20 ? '15%' : '28%'}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                    interval={chartData.length > 25 ? Math.ceil(chartData.length / 10) : 0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow (+)" />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outflow (−)" />
                </BarChart>
              ) : chartViewType === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dbInflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dbOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
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
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2.5} fill="url(#dbInflowGrad)" name="Inflow (+)" dot={chartData.length <= 15} />
                  <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#dbOutflowGrad)" name="Outflow (−)" dot={chartData.length <= 15} />
                </AreaChart>
              ) : (
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="dbNetGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="Net" stroke="#2563eb" strokeWidth={2.5} fill="url(#dbNetGrad)" name="Net Flow" dot={chartData.length <= 15} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 36 }}>
              <div className="empty-state-title">No cashflow data in this window</div>
              <div className="empty-state-sub">Try selecting "All Time" or import new bank statements.</div>
            </div>
          )}
        </div>

        {/* Category Spending Breakdown with Donut & Ranked Progress Bars */}
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Spending Breakdown</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {totalCategorySpend > 0 ? `₹${totalCategorySpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })} total debits in ${rangeLabel}` : 'Top expense categories'}
              </div>
            </div>
            
            {/* Donut vs Bars Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${categoryView === 'donut' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                  onClick={() => setCategoryView('donut')}
                  title="Donut Chart"
                >
                  <PieIcon size={12} /> Donut
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${categoryView === 'bars' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                  onClick={() => setCategoryView('bars')}
                  title="Ranked Progress Bars"
                >
                  <ListOrdered size={12} /> List
                </button>
              </div>
              <Link href="/tags" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                Rules →
              </Link>
            </div>
          </div>

          {topCategories.length > 0 ? (
            categoryView === 'donut' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'center', minHeight: 220 }}>
                <div style={{ position: 'relative', width: 140, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        dataKey="amount"
                        nameKey="tag"
                        paddingAngle={3}
                      >
                        {topCategories.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="var(--bg-card)" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Spent</span>
                    <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{(totalCategorySpend / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topCategories.map(cat => (
                    <Link
                      key={cat.tag}
                      href={`/transactions?tag=${encodeURIComponent(cat.tag)}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      className="hover-subtle"
                      title={`View all ${cat.tag} transactions`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat.tag}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${cat.percentage}%`, background: cat.color, borderRadius: 2 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              /* Full Ranked Bar List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                {topCategories.map((cat, idx) => (
                  <Link
                    key={cat.tag}
                    href={`/transactions?tag=${encodeURIComponent(cat.tag)}`}
                    style={{ textDecoration: 'none', color: 'inherit', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}
                    className="hover-subtle"
                    title={`View all ${cat.tag} transactions`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 14 }}>#{idx + 1}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{cat.tag}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({cat.count} txs)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatCurrency(cat.amount)}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.percentage}%`, background: cat.color, borderRadius: 3 }} />
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="empty-state" style={{ padding: 36 }}>
              <div className="empty-state-title">No categorized expenses</div>
              <div className="empty-state-sub">Transactions will be tagged automatically according to rules.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filtered Transactions Table ─────────────────────────────────── */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transactions in Period ({rangeLabel})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Showing {recent.length} of {filteredTransactions.length.toLocaleString()} matching entries
            </div>
          </div>
          <Link href="/transactions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Open Full Ledger <ArrowUpRight size={13} />
          </Link>
        </div>

        {recent.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / Narration</th>
                  <th>Account</th>
                  <th>Tags</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id}>
                    <td className="td-date">{formatDate(tx.date)}</td>
                    <td>
                      <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {tx.description}
                      </div>
                      {tx.upi_vpa && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Link
                            href={`/transactions?search=${encodeURIComponent(tx.upi_vpa)}`}
                            style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'underline' }}
                          >
                            {tx.upi_vpa}
                          </Link>
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
                      <Link
                        href={`/accounts/${tx.account_id}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}
                        title="View account"
                      >
                        <div className="account-dot" style={{ background: (tx.accounts as any)?.color || 'var(--accent)' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{(tx.accounts as any)?.name || '—'}</span>
                      </Link>
                    </td>
                    <td>
                      <div className="tags-cell">
                        {tx.tags.slice(0, 2).map(t => (
                          <Link key={t} href={`/transactions?tag=${encodeURIComponent(t)}`} style={{ textDecoration: 'none' }}>
                            <TagPill tag={t} color={tagMap[t]?.color} small />
                          </Link>
                        ))}
                        {tx.tags.length > 2 && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>+{tx.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`td-mono ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                        {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <UploadCloud size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="empty-state-title">No transactions found for this period</div>
            <div className="empty-state-sub">Try selecting another month or &ldquo;All Time&rdquo;.</div>
          </div>
        )}
      </div>
    </div>
  )
}

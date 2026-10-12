'use client'

import { useMemo, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Transaction, Account } from '@/lib/types'
import { formatCurrency, formatDate, getMonthLabel } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, ReferenceLine, Line, AreaChart, Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  Layers,
  Store,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart as PieIcon,
  ArrowRight,
  SlidersHorizontal,
  Landmark,
  ShieldCheck,
  BarChart2,
  Clock,
  RefreshCw,
} from 'lucide-react'

interface Props {
  transactions: Transaction[]
  accounts: Account[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
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
  | 'custom'

type Granularity = 'auto' | 'daily' | 'weekly' | 'monthly'
type TrajectoryView = 'area' | 'bar' | 'net'

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const dataPoint = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
      minWidth: 160,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, fontSize: 11.5 }}>
        {dataPoint?.fullDate || (typeof label === 'string' && label.length === 7 ? getMonthLabel(label) : label)}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(p.value, 'INR')}</span>
        </div>
      ))}
      {dataPoint?.Net !== undefined && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: dataPoint.Net >= 0 ? 'var(--green)' : 'var(--red)',
          fontWeight: 600,
        }}>
          <span>Net {dataPoint.Net >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {dataPoint.Net >= 0 ? '+' : ''}{formatCurrency(dataPoint.Net, 'INR')}
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

function AnalyticsContent({ transactions, accounts, tagMap }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedAccount, setSelectedAccount] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [trajectoryView, setTrajectoryView] = useState<TrajectoryView>('area')

  useEffect(() => {
    const acc = searchParams?.get('account')
    if (acc && (acc === 'all' || accounts.some(a => a.id === acc))) {
      setSelectedAccount(acc)
    }
  }, [searchParams, accounts])

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
    if (datePreset === 'custom') {
      return {
        startDate: customStart || null,
        endDate: customEnd || null,
        rangeLabel: customStart && customEnd ? `${formatDate(customStart)} – ${formatDate(customEnd)}` : 'Custom Range',
      }
    }
    return { startDate: null, endDate: null, rangeLabel: 'All Time' }
  }, [datePreset, currentMonthKey, lastMonthKey, currentYearKey, customStart, customEnd])

  // Filtered transactions
  const filtered = useMemo(() => {
    let list = transactions || []
    if (selectedAccount !== 'all') {
      list = list.filter(t => t.account_id === selectedAccount)
    }
    if (startDate) {
      list = list.filter(t => t.date >= startDate)
    }
    if (endDate) {
      list = list.filter(t => t.date <= endDate)
    }
    return list
  }, [transactions, selectedAccount, startDate, endDate])

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

    if (datePreset === 'last_7' || datePreset === 'last_15' || datePreset === 'last_30' || datePreset === 'this_month' || datePreset === 'last_month') {
      return 'daily'
    }

    return 'monthly'
  }, [granularity, startDate, endDate, datePreset])

  // Net Cash Flow Trajectory Data
  const netFlowData = useMemo(() => {
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
      const dates = filtered.map(t => t.date).filter(Boolean).sort()
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

        for (const tx of filtered) {
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

    // Monthly aggregation
    const monthlyMap: Record<string, { Income: number; Expense: number; txCount: number }> = {}
    for (const tx of filtered) {
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
  }, [filtered, effectiveGranularity, startDate, endDate])

  // Category breakdown
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tx of filtered) {
      if (tx.type !== 'debit') continue
      for (const tag of tx.tags) counts[tag] = (counts[tag] || 0) + tx.amount
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([tag]) => tag)
  }, [filtered])

  const stackedData = useMemo(() => {
    if (netFlowData.length === 0) return []
    const byBucket: Record<string, Record<string, number>> = {}

    for (const tx of filtered) {
      if (tx.type !== 'debit' || !tx.date) continue
      let bucketKey = ''
      if (effectiveGranularity === 'daily') {
        bucketKey = tx.date
      } else if (effectiveGranularity === 'weekly') {
        bucketKey = tx.date.substring(0, 7) // fallback to month
      } else {
        bucketKey = tx.date.substring(0, 7)
      }

      if (!byBucket[bucketKey]) byBucket[bucketKey] = {}
      const tag = tx.tags[0] || 'untagged'
      if (topTags.includes(tag) || tag === 'untagged') {
        byBucket[bucketKey][tag] = (byBucket[bucketKey][tag] || 0) + tx.amount
      }
    }

    return netFlowData.map(d => ({
      label: d.label,
      fullDate: d.fullDate,
      ...byBucket[d.key],
    }))
  }, [filtered, netFlowData, topTags, effectiveGranularity])

  // Top merchants
  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of filtered) {
      if (tx.type !== 'debit') continue
      const key = tx.upi_name || tx.upi_vpa || tx.description.slice(0, 30)
      map[key] = (map[key] || 0) + tx.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amount]) => ({ name, amount }))
  }, [filtered])

  // Day of week heatmap
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const amounts = Array(7).fill(0)
    const counts = Array(7).fill(0)
    for (const tx of filtered) {
      if (tx.type !== 'debit' || !tx.date) continue
      const d = new Date(tx.date).getDay()
      amounts[d] += tx.amount
      counts[d]++
    }
    return days.map((day, i) => ({ day, amount: Math.round(amounts[i]), count: counts[i] }))
  }, [filtered])

  // Largest transactions
  const largestDebits = useMemo(() =>
    [...filtered].filter(t => t.type === 'debit').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [filtered]
  )
  const largestCredits = useMemo(() =>
    [...filtered].filter(t => t.type === 'credit').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [filtered]
  )

  const totalTx = filtered.length
  const totalCredit = filtered.reduce((s, t) => t.type === 'credit' ? s + t.amount : s, 0)
  const totalDebit = filtered.reduce((s, t) => t.type === 'debit' ? s + t.amount : s, 0)
  const netSurplus = totalCredit - totalDebit
  const activeDays = Math.max(1, netFlowData.length)
  const avgBurnRate = Math.round(totalDebit / activeDays)

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Financial Analytics & Insights</h1>
          <p className="page-subtitle">Cash flow dynamics, merchant distribution, and spending trajectories</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/networth" className="btn btn-secondary" title="View Net Worth allocation">
            <TrendingUp size={14} /> Net Worth
          </Link>
          <Link href="/tags" className="btn btn-secondary" title="Manage categorization rules">
            <SlidersHorizontal size={14} /> Rules & Tags
          </Link>
          <select
            className="select"
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            style={{ width: 170, fontWeight: 600 }}
          >
            <option value="all">All Accounts ({accounts.length})</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Comprehensive Date Filter Toolbar ────────────────────────────── */}
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
                onClick={() => setDatePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Granularity switch & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

            {(datePreset !== 'all' || selectedAccount !== 'all') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDatePreset('all')
                  setSelectedAccount('all')
                  setCustomStart('')
                  setCustomEnd('')
                }}
                style={{ color: 'var(--text-muted)', fontSize: 11, padding: '4px 8px' }}
                title="Reset filters to All Time"
              >
                <RefreshCw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers */}
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
            <span>Active Window: <strong style={{ color: 'var(--text-primary)' }}>{rangeLabel}</strong></span>
            {selectedAccount !== 'all' && (
              <span>· Account: <strong style={{ color: 'var(--text-primary)' }}>{accounts.find(a => a.id === selectedAccount)?.name}</strong></span>
            )}
            <span>· Timeline: <strong style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{effectiveGranularity}</strong></span>
          </div>
          <div>
            Analyzed <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{filtered.length.toLocaleString()}</strong> transaction{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* KPI Grid with Inter-linked Filters */}
      <div className="kpi-grid mb-6">
        <Link
          href={`/transactions?type=credit${selectedAccount !== 'all' ? `&account=${selectedAccount}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          title="Click to view all credit inflow transactions"
        >
          <div className="kpi-header">
            <span className="kpi-label">Cumulative Inflow</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>+{formatCurrency(totalCredit, 'INR')}</div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--text-muted)' }}>In {rangeLabel}</span>
            <span className="kpi-tag positive" style={{ marginLeft: 'auto' }}>View Inflows →</span>
          </div>
        </Link>

        <Link
          href={`/transactions?type=debit${selectedAccount !== 'all' ? `&account=${selectedAccount}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          title="Click to view all debit outflow transactions"
        >
          <div className="kpi-header">
            <span className="kpi-label">Cumulative Outflow</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>−{formatCurrency(totalDebit, 'INR')}</div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--text-muted)' }}>In {rangeLabel}</span>
            <span className="kpi-tag negative" style={{ marginLeft: 'auto' }}>View Outflows →</span>
          </div>
        </Link>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Net Surplus / Deficit</span>
            <div className="kpi-icon-wrap">
              <Activity size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: netSurplus >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {netSurplus >= 0 ? '+' : ''}{formatCurrency(netSurplus, 'INR')}
          </div>
          <div className="kpi-footer">
            <span>Avg burn: ₹{avgBurnRate.toLocaleString('en-IN')}/{effectiveGranularity === 'daily' ? 'day' : effectiveGranularity === 'weekly' ? 'wk' : 'mo'}</span>
          </div>
        </div>

        <Link
          href={`/transactions${selectedAccount !== 'all' ? `?account=${selectedAccount}` : ''}`}
          className="kpi-card"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          title="Click to explore full ledger"
        >
          <div className="kpi-header">
            <span className="kpi-label">Transactions Analyzed</span>
            <div className="kpi-icon-wrap">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="kpi-value">{totalTx.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>In selected window</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Ledger →</span>
          </div>
        </Link>
      </div>

      {/* Net Cashflow Trajectory Chart with View Mode Toggles */}
      <div className="chart-wrap mb-6">
        <div className="chart-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="chart-title">Net Cash Flow Trajectory</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Inflows vs outflows across {netFlowData.length} {effectiveGranularity} point{netFlowData.length !== 1 ? 's' : ''} in {rangeLabel}
            </div>
          </div>

          {/* Visual Mode Toggles */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className={`btn btn-sm ${trajectoryView === 'area' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 26, padding: '0 8px', fontSize: 11 }}
              onClick={() => setTrajectoryView('area')}
              title="Smooth Gradient Area Waves"
            >
              <Activity size={12} /> Waves
            </button>
            <button
              type="button"
              className={`btn btn-sm ${trajectoryView === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 26, padding: '0 8px', fontSize: 11 }}
              onClick={() => setTrajectoryView('bar')}
              title="Side-by-side Inflow vs Outflow Bars"
            >
              <BarChart2 size={12} /> Bars
            </button>
            <button
              type="button"
              className={`btn btn-sm ${trajectoryView === 'net' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 26, padding: '0 8px', fontSize: 11 }}
              onClick={() => setTrajectoryView('net')}
              title="Net Cash Flow Surplus / Deficit Curve"
            >
              <TrendingUp size={12} /> Net Flow
            </button>
          </div>
        </div>

        {netFlowData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {trajectoryView === 'area' ? (
              <AreaChart data={netFlowData}>
                <defs>
                  <linearGradient id="anInflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={netFlowData.length > 25 ? Math.ceil(netFlowData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<MoneyTooltip />} />
                <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2.5} fill="url(#anInflowGrad)" name="Income (+)" dot={netFlowData.length <= 15} />
                <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#anOutflowGrad)" name="Expense (−)" dot={netFlowData.length <= 15} />
              </AreaChart>
            ) : trajectoryView === 'bar' ? (
              <BarChart data={netFlowData} barGap={3} barCategoryGap={netFlowData.length > 20 ? '15%' : '26%'}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={netFlowData.length > 25 ? Math.ceil(netFlowData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} name="Income (+)" />
                <Bar dataKey="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} name="Expense (−)" />
              </BarChart>
            ) : (
              <ComposedChart data={netFlowData}>
                <defs>
                  <linearGradient id="anNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }}
                  interval={netFlowData.length > 25 ? Math.ceil(netFlowData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<MoneyTooltip />} />
                <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Net" stroke="#2563eb" strokeWidth={2.5} fill="url(#anNetGrad)" name="Net Flow" dot={netFlowData.length <= 15} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: 36 }}>
            <div className="empty-state-title">No transactions in this period</div>
            <div className="empty-state-sub">Select another timeframe or import statements.</div>
          </div>
        )}
      </div>

      {/* Stacked Category Chart & Top Merchants */}
      <div className="grid-2 mb-6">
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Spending Distribution</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top categories stacked across {rangeLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {topTags.map(tag => (
                <Link
                  key={tag}
                  href={`/transactions?tag=${encodeURIComponent(tag)}`}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: tagMap[tag]?.color ? `${tagMap[tag]?.color}15` : '#f1f5f9',
                    color: tagMap[tag]?.color || '#475569',
                    textDecoration: 'none',
                    border: `1px solid ${tagMap[tag]?.color ? `${tagMap[tag]?.color}30` : '#e2e8f0'}`,
                  }}
                  title={`View all ${tag} transactions`}
                >
                  {tag} →
                </Link>
              ))}
            </div>
          </div>
          {stackedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stackedData} barCategoryGap={stackedData.length > 20 ? '15%' : '25%'}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                  interval={stackedData.length > 25 ? Math.ceil(stackedData.length / 10) : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<MoneyTooltip />} />
                {topTags.map(tag => (
                  <Bar key={tag} dataKey={tag} stackId="a" fill={tagMap[tag]?.color || '#94a3b8'} />
                ))}
                <Bar dataKey="untagged" stackId="a" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-sub">No categorized transactions in this period</div>
            </div>
          )}
        </div>

        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Top 10 Outflow Merchants</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click any merchant to drill into ledger</div>
            </div>
          </div>
          {topMerchants.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topMerchants.map((m, i) => {
                const max = topMerchants[0].amount
                return (
                  <Link
                    key={i}
                    href={`/transactions?search=${encodeURIComponent(m.name)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textDecoration: 'none',
                      color: 'inherit',
                      padding: '3px 6px',
                      borderRadius: 'var(--radius)',
                      transition: 'background 0.1s ease',
                    }}
                    className="hover-subtle"
                    title={`View all transactions with "${m.name}"`}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 16, textAlign: 'right', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)', flexShrink: 0 }}>
                          {formatCurrency(m.amount, 'INR')}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2 }}>
                        <div style={{ height: 4, width: `${(m.amount / max) * 100}%`, background: '#dc2626', borderRadius: 2, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-sub">No debit transactions found</div>
            </div>
          )}
        </div>
      </div>

      {/* Day of Week Heatmap & Largest Transactions */}
      <div className="grid-2 mb-6">
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Spending by Day of Week</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Weekly spending concentration in {rangeLabel}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dayOfWeekData} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v as number, 'INR')} />
              <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]} name="Total Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Largest Single Transactions</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>In active window ({rangeLabel})</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Top Debits (−)
            </div>
            {largestDebits.map(tx => (
              <Link
                key={tx.id}
                href={`/transactions?search=${encodeURIComponent(tx.description.slice(0, 20))}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  borderBottom: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 4,
                }}
                className="hover-subtle"
                title="View in Transactions"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)', marginLeft: 12, flexShrink: 0 }}>
                  −{formatCurrency(tx.amount, 'INR')}
                </span>
              </Link>
            ))}

            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '12px 0 6px' }}>
              Top Credits (+)
            </div>
            {largestCredits.map(tx => (
              <Link
                key={tx.id}
                href={`/transactions?search=${encodeURIComponent(tx.description.slice(0, 20))}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  borderBottom: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 4,
                }}
                className="hover-subtle"
                title="View in Transactions"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)', marginLeft: 12, flexShrink: 0 }}>
                  +{formatCurrency(tx.amount, 'INR')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsClient(props: Props) {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading analytics…</div>}>
      <AnalyticsContent {...props} />
    </Suspense>
  )
}

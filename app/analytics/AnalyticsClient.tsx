'use client'

import { useMemo, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Transaction, Account } from '@/lib/types'
import { formatCurrency, formatDate, getMonthLabel } from '@/lib/utils'
import ExportDropdown from '@/components/ui/ExportDropdown'
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
  | 'this_quarter'
  | 'last_quarter'
  | 'last_90'
  | 'last_180'
  | 'this_year'
  | 'custom'

type Granularity = 'auto' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
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
  const { currentMonthKey, lastMonthKey, currentYearKey, currentQuarterInfo, lastQuarterInfo } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const cm = `${y}-${String(m).padStart(2, '0')}`

    const lastMonthDate = new Date(y, m - 2, 1)
    const lm = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    const currentQ = Math.ceil(m / 3)
    const qStartMonth = (currentQ - 1) * 3 + 1
    const qEndMonth = currentQ * 3
    const qEndDay = new Date(y, qEndMonth, 0).getDate()
    const thisQStart = `${y}-${String(qStartMonth).padStart(2, '0')}-01`
    const thisQEnd = `${y}-${String(qEndMonth).padStart(2, '0')}-${String(qEndDay).padStart(2, '0')}`

    let lastQ = currentQ - 1
    let lastQYear = y
    if (lastQ < 1) {
      lastQ = 4
      lastQYear = y - 1
    }
    const lastQStartMonth = (lastQ - 1) * 3 + 1
    const lastQEndMonth = lastQ * 3
    const lastQEndDay = new Date(lastQYear, lastQEndMonth, 0).getDate()
    const lastQStart = `${lastQYear}-${String(lastQStartMonth).padStart(2, '0')}-01`
    const lastQEnd = `${lastQYear}-${String(lastQEndMonth).padStart(2, '0')}-${String(lastQEndDay).padStart(2, '0')}`

    return {
      currentMonthKey: cm,
      lastMonthKey: lm,
      currentYearKey: String(y),
      currentQuarterInfo: { q: currentQ, year: y, start: thisQStart, end: thisQEnd, label: `Q${currentQ} ${y}` },
      lastQuarterInfo: { q: lastQ, year: lastQYear, start: lastQStart, end: lastQEnd, label: `Q${lastQ} ${lastQYear}` },
    }
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
    if (datePreset === 'this_quarter') {
      return {
        startDate: currentQuarterInfo.start,
        endDate: todayStr < currentQuarterInfo.end ? todayStr : currentQuarterInfo.end,
        rangeLabel: `This Quarter (${currentQuarterInfo.label})`,
      }
    }
    if (datePreset === 'last_quarter') {
      return {
        startDate: lastQuarterInfo.start,
        endDate: lastQuarterInfo.end,
        rangeLabel: `Last Quarter (${lastQuarterInfo.label})`,
      }
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
  }, [datePreset, currentMonthKey, lastMonthKey, currentYearKey, currentQuarterInfo, lastQuarterInfo, customStart, customEnd])

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

    if (effectiveGranularity === 'quarterly') {
      const quarterlyMap: Record<string, { Income: number; Expense: number; txCount: number; year: number; q: number }> = {}

      for (const tx of filtered) {
        if (!tx.date) continue
        const year = parseInt(tx.date.substring(0, 4), 10)
        const month = parseInt(tx.date.substring(5, 7), 10)
        if (isNaN(year) || isNaN(month)) continue
        const q = Math.ceil(month / 3)
        const key = `${year}-Q${q}`

        if (!quarterlyMap[key]) {
          quarterlyMap[key] = { Income: 0, Expense: 0, txCount: 0, year, q }
        }
        if (tx.type === 'credit') quarterlyMap[key].Income += tx.amount
        else quarterlyMap[key].Expense += tx.amount
        quarterlyMap[key].txCount++
      }

      const quarterNames: Record<number, string> = {
        1: 'Jan – Mar',
        2: 'Apr – Jun',
        3: 'Jul – Sep',
        4: 'Oct – Dec',
      }

      return Object.keys(quarterlyMap).sort().map(k => {
        const item = quarterlyMap[k]
        return {
          key: k,
          label: `Q${item.q} '${String(item.year).slice(-2)}`,
          fullDate: `Q${item.q} ${item.year} (${quarterNames[item.q] || ''})`,
          Income: Math.round(item.Income),
          Expense: Math.round(item.Expense),
          Net: Math.round(item.Income - item.Expense),
          txCount: item.txCount,
        }
      })
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
      } else if (effectiveGranularity === 'quarterly') {
        const year = parseInt(tx.date.substring(0, 4), 10)
        const month = parseInt(tx.date.substring(5, 7), 10)
        const q = Math.ceil(month / 3)
        bucketKey = `${year}-Q${q}`
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

  // Comprehensive Quarterly Financial Analysis & Health Intelligence
  const quarterlyAnalysis = useMemo(() => {
    if (filtered.length === 0) {
      return { quarters: [], bestQuarter: null, avgQuarterlyBurn: 0, totalInflow: 0, totalOutflow: 0 }
    }

    const qMap: Record<string, {
      key: string
      year: number
      quarter: number
      label: string
      periodLabel: string
      inflow: number
      outflow: number
      net: number
      txCount: number
      savingsRate: number
      qoqInflowChange: number | null
      qoqOutflowChange: number | null
    }> = {}

    const quarterMonths: Record<number, string> = {
      1: 'Jan 1 – Mar 31',
      2: 'Apr 1 – Jun 30',
      3: 'Jul 1 – Sep 30',
      4: 'Oct 1 – Dec 31',
    }

    for (const tx of filtered) {
      if (!tx.date) continue
      const year = parseInt(tx.date.substring(0, 4), 10)
      const month = parseInt(tx.date.substring(5, 7), 10)
      if (isNaN(year) || isNaN(month)) continue
      const q = Math.ceil(month / 3)
      const key = `${year}-Q${q}`

      if (!qMap[key]) {
        qMap[key] = {
          key,
          year,
          quarter: q,
          label: `Q${q} ${year}`,
          periodLabel: quarterMonths[q] || '',
          inflow: 0,
          outflow: 0,
          net: 0,
          txCount: 0,
          savingsRate: 0,
          qoqInflowChange: null,
          qoqOutflowChange: null,
        }
      }

      if (tx.type === 'credit') qMap[key].inflow += tx.amount
      else qMap[key].outflow += tx.amount
      qMap[key].txCount++
    }

    const sortedKeys = Object.keys(qMap).sort()
    const quarters = sortedKeys.map((k, idx) => {
      const item = qMap[k]
      item.net = item.inflow - item.outflow
      item.savingsRate = item.inflow > 0 ? (item.net / item.inflow) * 100 : (item.outflow > 0 ? -100 : 0)

      if (idx > 0) {
        const prev = qMap[sortedKeys[idx - 1]]
        if (prev.inflow > 0) {
          item.qoqInflowChange = ((item.inflow - prev.inflow) / prev.inflow) * 100
        }
        if (prev.outflow > 0) {
          item.qoqOutflowChange = ((item.outflow - prev.outflow) / prev.outflow) * 100
        }
      }
      return item
    })

    const totalInflow = quarters.reduce((s, q) => s + q.inflow, 0)
    const totalOutflow = quarters.reduce((s, q) => s + q.outflow, 0)
    const avgQuarterlyBurn = quarters.length > 0 ? Math.round(totalOutflow / quarters.length) : 0
    const bestQuarter = quarters.length > 0 ? [...quarters].sort((a, b) => b.net - a.net)[0] : null

    return {
      quarters,
      bestQuarter,
      avgQuarterlyBurn,
      totalInflow,
      totalOutflow,
    }
  }, [filtered])

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
          <ExportDropdown
            transactions={filtered}
            metadata={{
              title: 'Financial Analytics & Spending Intelligence',
              subtitle: 'Cash flow dynamics, merchant distribution, and spending trajectories',
              accountName: selectedAccount !== 'all' ? accounts.find(a => a.id === selectedAccount)?.name : 'All Consolidated Accounts',
              dateRange: rangeLabel,
              summary: {
                totalInflow: totalCredit,
                totalOutflow: totalDebit,
                net: netSurplus,
                count: filtered.length,
              },
            }}
            variant="primary"
            filenamePrefix="analytics_statement"
          />
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
                { id: 'this_quarter', label: 'This Quarter' },
                { id: 'last_quarter', label: 'Last Quarter' },
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
              style={{ width: 115, fontSize: 12, height: 32 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
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

      {/* ── Quarterly Performance & Health Analysis ──────────────────────── */}
      {quarterlyAnalysis.quarters.length > 0 && (
        <div className="card mb-6" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Calendar size={15} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Quarterly Performance & Financial Health (QoQ)</h2>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0 36px' }}>
                Multi-quarter revenue retention, expense burn trajectories, and quarter-over-quarter velocity
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-neutral" style={{ fontSize: 11, fontWeight: 600 }}>
                {quarterlyAnalysis.quarters.length} Quarters Analyzed
              </span>
            </div>
          </div>

          {/* Mini Quarterly KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Quarterly Burn</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--red)', marginTop: 4 }}>
                −{formatCurrency(quarterlyAnalysis.avgQuarterlyBurn, 'INR')}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Average operational outflow per quarter</div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Best Net Quarter</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color: quarterlyAnalysis.bestQuarter && quarterlyAnalysis.bestQuarter.net >= 0 ? 'var(--green)' : 'var(--text-primary)', marginTop: 4 }}>
                {quarterlyAnalysis.bestQuarter ? (
                  <>
                    {quarterlyAnalysis.bestQuarter.label} ({quarterlyAnalysis.bestQuarter.net >= 0 ? '+' : ''}{formatCurrency(quarterlyAnalysis.bestQuarter.net, 'INR')})
                  </>
                ) : 'N/A'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Peak net cash surplus generation</div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Inflows Analyzed</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', marginTop: 4 }}>
                +{formatCurrency(quarterlyAnalysis.totalInflow, 'INR')}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Across all active quarters</div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net Cash Generation</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color: (quarterlyAnalysis.totalInflow - quarterlyAnalysis.totalOutflow) >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
                {(quarterlyAnalysis.totalInflow - quarterlyAnalysis.totalOutflow) >= 0 ? '+' : ''}{formatCurrency(quarterlyAnalysis.totalInflow - quarterlyAnalysis.totalOutflow, 'INR')}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Cumulative quarterly surplus</div>
            </div>
          </div>

          {/* Quarterly Comparison Chart */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Quarterly Inflow vs Outflow Comparison
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={quarterlyAnalysis.quarters} barGap={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(value as number, 'INR'),
                    name === 'inflow' ? 'Total Inflow (+)' : name === 'outflow' ? 'Total Outflow (−)' : 'Net Flow'
                  ]}
                  labelFormatter={(label: any) => `Quarter: ${label}`}
                />
                <Bar dataKey="inflow" fill="#10b981" radius={[3, 3, 0, 0]} name="inflow" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[3, 3, 0, 0]} name="outflow" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Corporate Quarterly Breakdown Table */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Quarter</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Inflow (+)</th>
                  <th style={{ textAlign: 'right' }}>Outflow (−)</th>
                  <th style={{ textAlign: 'right' }}>Net Surplus / Deficit</th>
                  <th style={{ textAlign: 'center' }}>Savings Margin</th>
                  <th style={{ textAlign: 'center' }}>QoQ Outflow Trend</th>
                  <th style={{ textAlign: 'right' }}>Volume</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyAnalysis.quarters.map(q => {
                  const inflowShare = quarterlyAnalysis.totalInflow > 0 ? ((q.inflow / quarterlyAnalysis.totalInflow) * 100).toFixed(1) : '0'
                  const outflowShare = quarterlyAnalysis.totalOutflow > 0 ? ((q.outflow / quarterlyAnalysis.totalOutflow) * 100).toFixed(1) : '0'
                  return (
                    <tr key={q.key} className="hover-subtle">
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {q.label}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {q.periodLabel}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>
                        <div>+{formatCurrency(q.inflow, 'INR')}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{inflowShare}% of total</div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)' }}>
                        <div>−{formatCurrency(q.outflow, 'INR')}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{outflowShare}% of total</div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: q.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {q.net >= 0 ? '+' : ''}{formatCurrency(q.net, 'INR')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: q.savingsRate >= 0 ? 'var(--green-subtle)' : 'var(--red-subtle)',
                            color: q.savingsRate >= 0 ? 'var(--green)' : 'var(--red)',
                          }}
                        >
                          {q.savingsRate >= 0 ? '+' : ''}{q.savingsRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {q.qoqOutflowChange !== null ? (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              color: q.qoqOutflowChange <= 0 ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {q.qoqOutflowChange <= 0 ? '↓ ' : '↑ '}
                            {Math.abs(q.qoqOutflowChange).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— (Base)</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {q.txCount} txs
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10.5, padding: '2px 8px', height: 24, color: 'var(--accent)', fontWeight: 600 }}
                          onClick={() => {
                            const year = q.year
                            const qNum = q.quarter
                            const sMonth = (qNum - 1) * 3 + 1
                            const eMonth = qNum * 3
                            const lastDay = new Date(year, eMonth, 0).getDate()
                            const startStr = `${year}-${String(sMonth).padStart(2, '0')}-01`
                            const endStr = `${year}-${String(eMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
                            setDatePreset('custom')
                            setCustomStart(startStr)
                            setCustomEnd(endStr)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          title={`Filter analytics to ${q.label}`}
                        >
                          Filter {q.label} →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                          {formatCurrency(m.amount, 'INR')} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>({totalDebit > 0 ? ((m.amount / totalDebit) * 100).toFixed(1) : 0}%)</span>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 6px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Top Debits (−)
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Total: {formatCurrency(totalDebit, 'INR')}
              </span>
            </div>
            {largestDebits.map(tx => {
              const pct = totalDebit > 0 ? ((tx.amount / totalDebit) * 100).toFixed(1) : '0'
              const pctNum = parseFloat(pct)
              const acc = accounts.find(a => a.id === tx.account_id)
              return (
                <Link
                  key={tx.id}
                  href={`/transactions?search=${encodeURIComponent(tx.description.slice(0, 20))}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderRadius: 4,
                    gap: 5,
                  }}
                  className="hover-subtle"
                  title={`View in Transactions — represents ${pct}% of total debits`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span>{formatDate(tx.date)}</span>
                        {acc && <span>· {acc.name}</span>}
                        {tx.tags?.[0] && <span style={{ textTransform: 'capitalize' }}>· {tx.tags[0]}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)' }}>
                        −{formatCurrency(tx.amount, 'INR')}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--red)',
                          background: 'var(--red-subtle)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-block',
                          marginTop: 2,
                        }}
                      >
                        {pct}% of total debits
                      </div>
                    </div>
                  </div>
                  {/* Share Progress Bar */}
                  <div style={{ height: 3, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(3, pctNum))}%`,
                        background: 'var(--red)',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </Link>
              )
            })}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 6px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Top Credits (+)
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Total: {formatCurrency(totalCredit, 'INR')}
              </span>
            </div>
            {largestCredits.map(tx => {
              const pct = totalCredit > 0 ? ((tx.amount / totalCredit) * 100).toFixed(1) : '0'
              const pctNum = parseFloat(pct)
              const acc = accounts.find(a => a.id === tx.account_id)
              return (
                <Link
                  key={tx.id}
                  href={`/transactions?search=${encodeURIComponent(tx.description.slice(0, 20))}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderRadius: 4,
                    gap: 5,
                  }}
                  className="hover-subtle"
                  title={`View in Transactions — represents ${pct}% of total credits`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span>{formatDate(tx.date)}</span>
                        {acc && <span>· {acc.name}</span>}
                        {tx.tags?.[0] && <span style={{ textTransform: 'capitalize' }}>· {tx.tags[0]}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>
                        +{formatCurrency(tx.amount, 'INR')}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--green)',
                          background: 'var(--green-subtle)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-block',
                          marginTop: 2,
                        }}
                      >
                        {pct}% of total credits
                      </div>
                    </div>
                  </div>
                  {/* Share Progress Bar */}
                  <div style={{ height: 3, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(3, pctNum))}%`,
                        background: 'var(--green)',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </Link>
              )
            })}
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

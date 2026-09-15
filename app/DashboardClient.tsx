'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

interface Props {
  accounts?: Account[]
  transactions?: Transaction[]
  tagMap?: Record<string, { name: string; color: string; icon: string }>
}

type DatePreset =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_30'
  | 'last_90'
  | 'this_year'
  | 'month_select'
  | 'custom'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
        {typeof label === 'string' && label.length === 7 ? getMonthLabel(label) : formatDate(label)}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 14, justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600 }}>{formatCurrency(item.value)}</div>
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
    if (datePreset === 'last_30') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 30 Days' }
    }
    if (datePreset === 'last_90') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr, rangeLabel: 'Last 90 Days' }
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

  const topCategories = useMemo(() => categoryStats.slice(0, 6), [categoryStats])
  const totalCategorySpend = useMemo(() => categoryStats.reduce((s, c) => s + c.amount, 0), [categoryStats])

  // Reactive Chart Data (Monthly aggregation based on filtered transactions)
  const chartData = useMemo(() => {
    const monthlyMap: Record<string, { Income: number; Expense: number }> = {}

    for (const tx of filteredTransactions) {
      const m = tx.date ? tx.date.substring(0, 7) : 'Unknown'
      if (!monthlyMap[m]) monthlyMap[m] = { Income: 0, Expense: 0 }
      if (tx.type === 'credit') monthlyMap[m].Income += tx.amount
      else monthlyMap[m].Expense += tx.amount
    }

    return Object.keys(monthlyMap).sort().map(month => ({
      month,
      Income: monthlyMap[month].Income,
      Expense: monthlyMap[month].Expense,
    }))
  }, [filteredTransactions])

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
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Reconciled financial intelligence, cash flow velocity, and account ledgers</p>
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
      </div>

      {/* ── Comprehensive Filter Control Bar ─────────────────────────────── */}
      <div className="card mb-6" style={{ padding: '14px 18px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} style={{ color: 'var(--accent)' }} /> Period:
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_30', label: '30 Days' },
                { id: 'last_90', label: '90 Days' },
                { id: 'this_year', label: `${currentYearKey}` },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                className={`filter-chip ${datePreset === preset.id ? 'active' : ''}`}
                onClick={() => {
                  setDatePreset(preset.id)
                  if (preset.id !== 'month_select') setSelectedMonth('')
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

      {/* ── KPI Metrics Cards (100% Reactive) ───────────────────────────── */}
      <div className="kpi-grid mb-6">
        {/* Net Flow / Net Worth */}
        <div className="kpi-card">
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
          </div>
        </div>

        {/* Inflow Credits */}
        <div className="kpi-card">
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
          </div>
        </div>

        {/* Outflow Debits */}
        <div className="kpi-card">
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
          </div>
        </div>

        {/* Savings Rate */}
        <div className="kpi-card">
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
          </div>
        </div>
      </div>

      {/* ── Linked Accounts Grid (Reactive to selected timeframe) ────────── */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">
            <Landmark size={14} style={{ color: 'var(--accent)' }} />
            Account Ledgers ({rangeLabel})
          </div>
          <div className="grid-auto">
            {accounts.map(acc => {
              const b = accountBalances[acc.id] || { credit: 0, debit: 0, net: 0 }
              const isSelected = accountFilter === acc.id
              return (
                <div
                  key={acc.id}
                  className="account-card"
                  onClick={() => setAccountFilter(isSelected ? 'all' : acc.id)}
                  style={{
                    '--account-color': acc.color,
                    cursor: 'pointer',
                    outline: isSelected ? `2px solid ${acc.color}` : 'none',
                  } as React.CSSProperties}
                  title="Click to filter dashboard to this account"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{acc.name}</div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: acc.color }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{acc.bank_name} · {acc.account_type}</div>
                  
                  <div className="account-balance" style={{ fontSize: 17, marginTop: 8, color: b.net >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
                    {b.net >= 0 ? '+' : ''}{formatCurrency(b.net)}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span style={{ color: 'var(--green)' }}>+{formatCurrency(b.credit)}</span>
                    <span style={{ color: 'var(--red)' }}>−{formatCurrency(b.debit)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--accent)', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                    <span>{isSelected ? '✓ Filter Active' : 'Filter to account'}</span>
                    <Link href={`/accounts/${acc.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit' }}>
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts Section (Reactive) ────────────────────────────────────── */}
      <div className="grid-2 mb-6">
        {/* Cash Flow Monthly / Period Comparison Bar Chart */}
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Cash Flow & Burn Trends</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {chartData.length > 0 ? `Inflow vs outflow across ${chartData.length} active month${chartData.length !== 1 ? 's' : ''}` : 'No cash flow in this period'}
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} barGap={4} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickFormatter={m => {
                    const parts = m.split('-')
                    if (parts.length >= 2) {
                      return new Date(+parts[0], +parts[1] - 1).toLocaleString('en', { month: 'short', year: '2-digit' })
                    }
                    return m
                  }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Income" fill="#16a34a" radius={[3, 3, 0, 0]} name="Inflow (+)" />
                <Bar dataKey="Expense" fill="#dc2626" radius={[3, 3, 0, 0]} name="Outflow (−)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 36 }}>
              <div className="empty-state-title">No cashflow data</div>
              <div className="empty-state-sub">Try changing the date filter or importing statements.</div>
            </div>
          )}
        </div>

        {/* Category Spending Donut & Ranked Breakdown */}
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Category Spending Breakdown</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {totalCategorySpend > 0 ? `₹${totalCategorySpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })} total debits in ${rangeLabel}` : 'Top expense categories'}
              </div>
            </div>
          </div>
          {topCategories.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 16, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={topCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="amount" nameKey="tag" paddingAngle={3}>
                    {topCategories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topCategories.map(cat => {
                  const pct = totalCategorySpend > 0 ? ((cat.amount / totalCategorySpend) * 100).toFixed(0) : '0'
                  return (
                    <div key={cat.tag}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color }} />
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat.tag}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(cat.amount)} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 28 }}>
              <div className="empty-state-icon-wrap">
                <Layers size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="empty-state-title">No expenses in this period</div>
              <div className="empty-state-sub">Select another date range or import statements to analyze categories.</div>
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
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tx.upi_vpa}</span>
                          <button
                            onClick={() => handleCopy(tx.upi_vpa!, tx.id)}
                            style={{ opacity: 0.5, cursor: 'pointer', padding: 1 }}
                            title="Copy UPI VPA"
                          >
                            {copiedId === tx.id ? <Check size={10} style={{ color: 'var(--green)' }} /> : <Copy size={10} />}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="account-dot" style={{ background: (tx.accounts as any)?.color || 'var(--accent)' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{(tx.accounts as any)?.name || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="tags-cell">
                        {tx.tags.slice(0, 2).map(t => <TagPill key={t} tag={t} color={tagMap[t]?.color} small />)}
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

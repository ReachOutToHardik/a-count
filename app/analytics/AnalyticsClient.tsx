'use client'

import { useMemo, useState } from 'react'
import { Transaction, Account } from '@/lib/types'
import { formatCurrency, formatDate, computeMonthlyStats, getMonthLabel } from '@/lib/utils'
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
} from 'lucide-react'

interface Props {
  transactions: Transaction[]
  accounts: Account[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
}

function MoneyTooltip({ active, payload, label }: any) {
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
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{getMonthLabel(label)}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(p.value, 'INR')}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsClient({ transactions, accounts, tagMap }: Props) {
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [months, setMonths] = useState(12)

  const filtered = useMemo(() =>
    selectedAccount === 'all' ? transactions : transactions.filter(t => t.account_id === selectedAccount),
    [transactions, selectedAccount]
  )

  const monthlyStats = useMemo(() => computeMonthlyStats(filtered, months), [filtered, months])

  // Category breakdown by month (stacked bar)
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tx of filtered) {
      if (tx.type !== 'debit') continue
      for (const tag of tx.tags) counts[tag] = (counts[tag] || 0) + tx.amount
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([tag]) => tag)
  }, [filtered])

  const stackedData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}
    for (const tx of filtered) {
      if (tx.type !== 'debit') continue
      const key = tx.date.substring(0, 7)
      if (!byMonth[key]) byMonth[key] = {}
      const tag = tx.tags[0] || 'untagged'
      if (topTags.includes(tag) || tag === 'untagged') {
        byMonth[key][tag] = (byMonth[key][tag] || 0) + tx.amount
      }
    }
    return monthlyStats.map(m => ({ month: m.month, ...byMonth[m.month] }))
  }, [filtered, monthlyStats, topTags])

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
      if (tx.type !== 'debit') continue
      const d = new Date(tx.date).getDay()
      amounts[d] += tx.amount
      counts[d]++
    }
    return days.map((day, i) => ({ day, amount: amounts[i], count: counts[i] }))
  }, [filtered])

  // Net cashflow area chart
  const netFlowData = useMemo(() => monthlyStats.map(m => ({
    month: m.month,
    Net: Math.round(m.net),
    Income: Math.round(m.income),
    Expense: Math.round(m.expense),
  })), [monthlyStats])

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
  const avgMonthlySpend = totalDebit / Math.max(months, 1)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Analytics & Insights</h1>
          <p className="page-subtitle">Cash flow dynamics, merchant distribution, and spending trajectories</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className="select"
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            style={{ width: 180, fontWeight: 600 }}
          >
            <option value="all">All Accounts ({accounts.length})</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            className="select"
            value={months}
            onChange={e => setMonths(+e.target.value)}
            style={{ width: 130, fontWeight: 600 }}
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
            <option value={24}>Last 24 Months</option>
          </select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Cumulative Inflow</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>+{formatCurrency(totalCredit, 'INR')}</div>
          <div className="kpi-footer"><span>Over {months} months</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Cumulative Outflow</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>−{formatCurrency(totalDebit, 'INR')}</div>
          <div className="kpi-footer"><span>Over {months} months</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Avg Monthly Burn</span>
            <div className="kpi-icon-wrap">
              <Activity size={14} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(avgMonthlySpend, 'INR')}</div>
          <div className="kpi-footer"><span>Average monthly debit</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Transactions Processed</span>
            <div className="kpi-icon-wrap">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="kpi-value">{totalTx.toLocaleString()}</div>
          <div className="kpi-footer"><span>In selected window</span></div>
        </div>
      </div>

      {/* Net Cashflow Composed Chart */}
      <div className="chart-wrap mb-6">
        <div className="chart-header">
          <div>
            <div className="chart-title">Net Cash Flow Trajectory</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly credits vs debits with net surplus curve</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={netFlowData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString('en', { month: 'short' }) }} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<MoneyTooltip />} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Bar dataKey="Income" fill="#16a34a" radius={[3, 3, 0, 0]} name="Income (+)" opacity={0.8} />
            <Bar dataKey="Expense" fill="#dc2626" radius={[3, 3, 0, 0]} name="Expense (−)" opacity={0.8} />
            <Line type="monotone" dataKey="Net" stroke="#2563eb" strokeWidth={2.5} dot={false} name="Net Flow" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked Category Chart & Top Merchants */}
      <div className="grid-2 mb-6">
        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Monthly Category Distribution</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top categories stacked over time</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stackedData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString('en', { month: 'short' }) }} tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<MoneyTooltip />} />
              {topTags.map(tag => (
                <Bar key={tag} dataKey={tag} stackId="a" fill={tagMap[tag]?.color || '#94a3b8'} />
              ))}
              <Bar dataKey="untagged" stackId="a" fill="#cbd5e1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Top 10 Outflow Merchants</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Highest cumulative debit recipients</div>
            </div>
          </div>
          {topMerchants.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topMerchants.map((m, i) => {
                const max = topMerchants[0].amount
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 16, textAlign: 'right', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{m.name}</span>
                        <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)', flexShrink: 0 }}>
                          {formatCurrency(m.amount, 'INR')}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2 }}>
                        <div style={{ height: 4, width: `${(m.amount / max) * 100}%`, background: '#dc2626', borderRadius: 2, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  </div>
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
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Weekly spending concentration</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dayOfWeekData} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v as number, 'INR')} />
              <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]} name="Total Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrap">
          <div className="chart-header">
            <div>
              <div className="chart-title">Largest Single Transactions</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top individual debits and credits</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Top Debits (−)
            </div>
            {largestDebits.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)', marginLeft: 12, flexShrink: 0 }}>
                  −{formatCurrency(tx.amount, 'INR')}
                </span>
              </div>
            ))}

            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '12px 0 6px' }}>
              Top Credits (+)
            </div>
            {largestCredits.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)', marginLeft: 12, flexShrink: 0 }}>
                  +{formatCurrency(tx.amount, 'INR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Account, Transaction } from '@/lib/types'
import { formatCurrency, formatDate, computeMonthlyStats } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import {
  ArrowLeft,
  Search,
  UploadCloud,
  Download,
  Calendar,
  Landmark,
  TrendingUp,
  TrendingDown,
  Layers,
  Check,
  Copy,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Props {
  account: Account
  transactions: Transaction[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
}

function AccountTooltip({ active, payload, label }: any) {
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
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 14, justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(p.value, 'INR')}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountDetailClient({ account, transactions, tagMap }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          tx.description.toLowerCase().includes(q) ||
          (tx.upi_vpa ?? '').toLowerCase().includes(q) ||
          (tx.upi_name ?? '').toLowerCase().includes(q) ||
          (tx.ref_no ?? '').toLowerCase().includes(q) ||
          tx.tags.some(t => t.includes(q))
        )
      }
      return true
    })
  }, [transactions, search, typeFilter])

  const monthlyStats = computeMonthlyStats(transactions, 12)
  const credit = transactions.reduce((s, t) => t.type === 'credit' ? s + t.amount : s, 0)
  const debit = transactions.reduce((s, t) => t.type === 'debit' ? s + t.amount : s, 0)
  const balance = credit - debit

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
            <h1 className="page-title" style={{ fontSize: 18, marginBottom: 0 }}>{account.name}</h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {account.bank_name || 'Bank Account'} · <span style={{ textTransform: 'capitalize' }}>{account.account_type}</span> · INR (₹)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/import" className="btn btn-primary">
            <UploadCloud size={14} /> Import into Account
          </Link>
        </div>
      </div>

      {/* Account KPI Ribbon */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Current Ledger Balance</span>
            <div className="kpi-icon-wrap">
              <Landmark size={14} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(balance, 'INR')}</div>
          <div className="kpi-footer">
            <span>Net calculated balance</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Credits (Inflow)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>+{formatCurrency(credit, 'INR')}</div>
          <div className="kpi-footer">
            <span className="kpi-tag positive">Inflow</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Debits (Outflow)</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>−{formatCurrency(debit, 'INR')}</div>
          <div className="kpi-footer">
            <span className="kpi-tag negative">Outflow</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Transactions</span>
            <div className="kpi-icon-wrap">
              <Layers size={14} />
            </div>
          </div>
          <div className="kpi-value">{transactions.length.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>Recorded statement lines</span>
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Area Chart */}
      <div className="chart-wrap mb-6">
        <div className="chart-header">
          <div>
            <div className="chart-title">Account Inflow vs Outflow History</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>12-month rolling cash flow trajectory</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyStats}>
            <defs>
              <linearGradient id="acctInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="acctExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tickFormatter={m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString('en', { month: 'short' }) }} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<AccountTooltip />} />
            <Area type="monotone" dataKey="income" stroke="#16a34a" fill="url(#acctInc)" strokeWidth={2} name="Income (+)" dot={false} />
            <Area type="monotone" dataKey="expense" stroke="#dc2626" fill="url(#acctExp)" strokeWidth={2} name="Expense (−)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <div className="search-input-wrap" style={{ width: 260 }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search in this account…" value={search} onChange={e => setSearch(e.target.value)} />
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
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length.toLocaleString()} transactions found
        </span>
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
              {filtered.slice(0, 200).map(tx => (
                <tr key={tx.id}>
                  <td className="td-date">{formatDate(tx.date)}</td>
                  <td>
                    <div style={{ maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
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
                    <div className="tags-cell">
                      {tx.tags.map(t => <TagPill key={t} tag={t} color={tagMap[t]?.color} small />)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

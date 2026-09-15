'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Account, Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import {
  Search,
  Download,
  Filter,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Tag as TagIcon,
} from 'lucide-react'

interface Props {
  accounts: Account[]
  transactions: Transaction[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
  allTags: { name: string; color: string; icon: string }[]
}

type SortKey = 'date' | 'amount' | 'description'
type SortDir = 'asc' | 'desc'
type DatePreset = 'all' | 'this_month' | 'last_30' | 'last_90'

export default function TransactionsClient({ accounts, transactions, tagMap, allTags }: Props) {
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit' | 'untagged'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()
  const PAGE_SIZE = 100

  // Date range calculation from preset
  const dateThreshold = useMemo(() => {
    const now = new Date()
    if (datePreset === 'this_month') {
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}-01`
    }
    if (datePreset === 'last_30') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return d.toISOString().split('T')[0]
    }
    if (datePreset === 'last_90') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return d.toISOString().split('T')[0]
    }
    return null
  }, [datePreset])

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (accountFilter !== 'all') list = list.filter(t => t.account_id === accountFilter)
    if (typeFilter === 'credit') list = list.filter(t => t.type === 'credit')
    if (typeFilter === 'debit') list = list.filter(t => t.type === 'debit')
    if (typeFilter === 'untagged') list = list.filter(t => t.tags.length === 0)
    if (tagFilter !== 'all') list = list.filter(t => t.tags.includes(tagFilter))
    if (dateThreshold) list = list.filter(t => t.date >= dateThreshold)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.upi_vpa ?? '').toLowerCase().includes(q) ||
        (t.upi_name ?? '').toLowerCase().includes(q) ||
        (t.ref_no ?? '').toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      )
    }
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'amount') cmp = a.amount - b.amount
      else cmp = a.description.localeCompare(b.description)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [transactions, accountFilter, typeFilter, tagFilter, dateThreshold, search, sortKey, sortDir])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const totalCredit = filtered.reduce((s, t) => t.type === 'credit' ? s + t.amount : s, 0)
  const totalDebit = filtered.reduce((s, t) => t.type === 'debit' ? s + t.amount : s, 0)
  const netFlow = totalCredit - totalDebit

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function exportCSV() {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'UPI VPA', 'UPI Name', 'Reference No', 'Tags']
    const rows = filtered.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      t.upi_vpa || '',
      t.upi_name || '',
      t.ref_no || '',
      `"${t.tags.join(', ')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Ledger</h1>
          <p className="page-subtitle">Search, filter, and reconcile all entries across your accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download size={14} />
            Export CSV ({filtered.length.toLocaleString()})
          </button>
        </div>
      </div>

      {/* Summary Stat Ribbon */}
      <div className="summary-ribbon">
        <div className="summary-item">
          <span className="summary-item-label">Inflow Credits:</span>
          <span className="summary-item-val" style={{ color: 'var(--green)' }}>+{formatCurrency(totalCredit)}</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div className="summary-item">
          <span className="summary-item-label">Outflow Debits:</span>
          <span className="summary-item-val" style={{ color: 'var(--red)' }}>−{formatCurrency(totalDebit)}</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div className="summary-item">
          <span className="summary-item-label">Net Flow:</span>
          <span className="summary-item-val" style={{ color: netFlow >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
          </span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div className="summary-item">
          <span className="summary-item-label">Entries:</span>
          <span className="summary-item-val">{filtered.length.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          {/* Search Box */}
          <div className="search-input-wrap" style={{ width: 260 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Search description, UPI, ref…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ opacity: 0.5, cursor: 'pointer' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Account Filter */}
          <select
            className="select"
            value={accountFilter}
            onChange={e => { setAccountFilter(e.target.value); setPage(0) }}
            style={{ width: 160 }}
          >
            <option value="all">All Accounts ({accounts.length})</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          {/* Tag Filter */}
          <select
            className="select"
            value={tagFilter}
            onChange={e => { setTagFilter(e.target.value); setPage(0) }}
            style={{ width: 150 }}
          >
            <option value="all">All Tags</option>
            {allTags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {/* Date and Type Filter Chips */}
        <div className="filter-group">
          {(['all', 'credit', 'debit', 'untagged'] as const).map(t => (
            <button
              key={t}
              className={`filter-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => { setTypeFilter(t); setPage(0) }}
            >
              {t === 'all' ? 'All Types' : t === 'credit' ? 'Credits (+)' : t === 'debit' ? 'Debits (−)' : 'Untagged'}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
          {(['all', 'this_month', 'last_30', 'last_90'] as const).map(p => (
            <button
              key={p}
              className={`filter-chip ${datePreset === p ? 'active' : ''}`}
              onClick={() => { setDatePreset(p); setPage(0) }}
            >
              {p === 'all' ? 'All Time' : p === 'this_month' ? 'This Month' : p === 'last_30' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-container">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('date')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Date {sortKey === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('description')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Description / UPI {sortKey === 'description' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th>Account</th>
                <th>Tags</th>
                <th>Reference ID</th>
                <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    Amount (₹) {sortKey === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map(tx => (
                  <tr key={tx.id}>
                    <td className="td-date">{formatDate(tx.date)}</td>
                    <td>
                      <div style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
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
                        {tx.tags.length > 0 ? (
                          tx.tags.map(t => <TagPill key={t} tag={t} color={tagMap[t]?.color} small />)
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>untagged</span>
                        )}
                      </div>
                    </td>
                    <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      {tx.ref_no || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`td-mono ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                        {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    No transactions match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {Math.min(filtered.length, page * PAGE_SIZE + 1)}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length.toLocaleString()} entries
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 6px' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Account, Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import TagPickerModal from '@/components/tags/TagPickerModal'
import ExportDropdown from '@/components/ui/ExportDropdown'
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
  BarChart3,
  Landmark,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  Loader2,
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

function TransactionsContent({ accounts, transactions, tagMap, allTags }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [txList, setTxList] = useState<Transaction[]>(transactions)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [availableTags, setAvailableTags] = useState(allTags)
  const [currentTagMap, setCurrentTagMap] = useState(tagMap)
  const [isApplyingRules, setIsApplyingRules] = useState(false)
  const [ruleMessage, setRuleMessage] = useState<string | null>(null)
  const [showStandaloneTagModal, setShowStandaloneTagModal] = useState(false)

  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit' | 'untagged'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const PAGE_SIZE = 100

  useEffect(() => {
    setTxList(transactions)
  }, [transactions])

  useEffect(() => {
    setAvailableTags(allTags)
    setCurrentTagMap(tagMap)
  }, [allTags, tagMap])

  // Read URL search params on mount / navigation
  useEffect(() => {
    if (!searchParams) return
    const paramAccount = searchParams.get('account')
    const paramTag = searchParams.get('tag')
    const paramType = searchParams.get('type')
    const paramSearch = searchParams.get('search')
    const paramDatePreset = searchParams.get('datePreset')

    if (paramAccount && (paramAccount === 'all' || accounts.some(a => a.id === paramAccount))) {
      setAccountFilter(paramAccount)
    }
    if (paramTag && (paramTag === 'all' || allTags.some(t => t.name.toLowerCase() === paramTag.toLowerCase()))) {
      setTagFilter(paramTag)
    }
    if (paramType && ['all', 'credit', 'debit', 'untagged'].includes(paramType)) {
      setTypeFilter(paramType as any)
    }
    if (paramSearch !== null && paramSearch !== undefined) {
      setSearch(paramSearch)
    }
    if (paramDatePreset && ['all', 'this_month', 'last_30', 'last_90'].includes(paramDatePreset)) {
      setDatePreset(paramDatePreset as any)
    }
  }, [searchParams, accounts, allTags])

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
    let list = [...txList]
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
        t.tags.some(tag => tag.toLowerCase().includes(q))
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
  }, [txList, accountFilter, typeFilter, tagFilter, dateThreshold, search, sortKey, sortDir])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const totalCredit = filtered.reduce((s, t) => t.type === 'credit' ? s + t.amount : s, 0)
  const totalDebit = filtered.reduce((s, t) => t.type === 'debit' ? s + t.amount : s, 0)
  const netFlow = totalCredit - totalDebit

  const activeFiltersCount = (accountFilter !== 'all' ? 1 : 0) +
    (tagFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (datePreset !== 'all' ? 1 : 0) +
    (search ? 1 : 0)

  function clearAllFilters() {
    setAccountFilter('all')
    setTagFilter('all')
    setTypeFilter('all')
    setDatePreset('all')
    setSearch('')
    setPage(0)
    router.push('/transactions')
  }

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
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Account', 'UPI VPA', 'UPI Name', 'Reference No', 'Tags']
    const rows = filtered.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      `"${(t.accounts as any)?.name || t.account_id}"`,
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

  async function handleSaveTags(newTags: string[]) {
    if (!editingTx) return
    const targetId = editingTx.id
    // Optimistic UI update
    setTxList(prev => prev.map(t => t.id === targetId ? { ...t, tags: newTags, tag_source: 'manual' } : t))
    setEditingTx(null)

    try {
      await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, tags: newTags, tag_source: 'manual' }),
      })
      router.refresh()
    } catch (err) {
      console.error('Failed to update tags', err)
    }
  }

  function handleTagCreated(newTag: { name: string; color: string }) {
    setAvailableTags(prev => {
      if (prev.some(t => t.name === newTag.name)) return prev
      return [...prev, { name: newTag.name, color: newTag.color, icon: '' }]
    })
    setCurrentTagMap(prev => ({
      ...prev,
      [newTag.name]: { name: newTag.name, color: newTag.color, icon: '' },
    }))
  }

  async function handleReapplyRules(scope: 'untagged' | 'all') {
    setIsApplyingRules(true)
    setRuleMessage(null)
    try {
      const res = await fetch('/api/rules/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, accountId: accountFilter !== 'all' ? accountFilter : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setRuleMessage(`✓ Rules applied! Updated tags on ${data.updatedCount} of ${data.totalProcessed} transactions.`)
        setTimeout(() => setRuleMessage(null), 6000)
        router.refresh()
      } else {
        setRuleMessage(`Failed to apply rules: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setRuleMessage(`Error applying rules: ${err.message}`)
    } finally {
      setIsApplyingRules(false)
    }
  }

  const selectedAccountObj = accounts.find(a => a.id === accountFilter)

  const exportMeta = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const t of filtered) {
      if (t.type === 'credit') inflow += Number(t.amount) || 0
      else outflow += Number(t.amount) || 0
    }
    const acctName = selectedAccountObj ? selectedAccountObj.name : 'All Consolidated Accounts'
    return {
      title: 'Financial Transaction Ledger',
      subtitle: 'Reconciled banking transaction journal',
      accountName: acctName,
      dateRange: datePreset === 'all' ? 'All Time Recorded' : datePreset.replace(/_/g, ' ').toUpperCase(),
      summary: {
        totalInflow: inflow,
        totalOutflow: outflow,
        net: inflow - outflow,
        count: filtered.length,
      },
    }
  }, [filtered, selectedAccountObj, datePreset])

  return (
    <div>
      {/* Header with Inter-linking Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Ledger</h1>
          <p className="page-subtitle">Search, filter, and reconcile all entries across your accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleReapplyRules('untagged')}
            disabled={isApplyingRules}
            title="Re-run rules engine across untagged transactions"
          >
            {isApplyingRules ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            {isApplyingRules ? 'Applying Rules…' : 'Re-apply Rules'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowStandaloneTagModal(true)}
            title="Create a new custom tag"
          >
            <Plus size={14} /> Custom Tag
          </button>
          <Link
            href={`/analytics${accountFilter !== 'all' ? `?account=${accountFilter}` : ''}`}
            className="btn btn-secondary"
            title="Analyze spending trends for these transactions"
          >
            <BarChart3 size={14} /> View Analytics
          </Link>
          <Link href="/tags" className="btn btn-secondary" title="Configure categorization rules">
            <SlidersHorizontal size={14} /> Rules & Tags
          </Link>
          <Link href="/import" className="btn btn-secondary" title="Upload statement file">
            <Plus size={14} /> Import Statement
          </Link>
          <ExportDropdown
            transactions={filtered}
            metadata={exportMeta}
            variant="primary"
            filenamePrefix="ledger_statement"
          />
        </div>
      </div>

      {ruleMessage && (
        <div
          style={{
            background: 'var(--green-subtle, rgba(22,163,74,0.08))',
            border: '1px solid rgba(22,163,74,0.25)',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
            fontSize: 12.5,
            color: 'var(--green, #16a34a)',
            fontWeight: 600,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{ruleMessage}</span>
          <button onClick={() => setRuleMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={14} />
          </button>
        </div>
      )}

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
          <span className="summary-item-label">Filtered Entries:</span>
          <span className="summary-item-val">{filtered.length.toLocaleString()}</span>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
            padding: '8px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={12} /> Active Filters ({activeFiltersCount}):
          </span>

          {search && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
              Search: "{search}"
              <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setSearch(''); setPage(0) }} />
            </span>
          )}

          {accountFilter !== 'all' && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
              Account: {selectedAccountObj?.name || accountFilter}
              <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setAccountFilter('all'); setPage(0) }} />
            </span>
          )}

          {tagFilter !== 'all' && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#faf5ff', color: '#7e22ce', borderColor: '#e9d5ff' }}>
              Tag: {tagFilter}
              <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setTagFilter('all'); setPage(0) }} />
            </span>
          )}

          {typeFilter !== 'all' && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}>
              Type: {typeFilter}
              <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setTypeFilter('all'); setPage(0) }} />
            </span>
          )}

          {datePreset !== 'all' && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
              Range: {datePreset === 'this_month' ? 'This Month' : datePreset === 'last_30' ? 'Last 30 Days' : 'Last 90 Days'}
              <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setDatePreset('all'); setPage(0) }} />
            </span>
          )}

          <button
            onClick={clearAllFilters}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={11} /> Reset All
          </button>
        </div>
      )}

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
                paginated.map(tx => {
                  const accountObj = (tx.accounts as any) || accounts.find(a => a.id === tx.account_id)
                  return (
                    <tr key={tx.id}>
                      <td className="td-date">{formatDate(tx.date)}</td>
                      <td>
                        <div style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {tx.description}
                        </div>
                        {tx.upi_vpa && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <button
                              onClick={() => { setSearch(tx.upi_vpa!); setPage(0) }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                              }}
                              title="Filter by this UPI VPA"
                            >
                              {tx.upi_vpa}
                            </button>
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
                        {accountObj ? (
                          <Link
                            href={`/accounts/${accountObj.id || tx.account_id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              textDecoration: 'none',
                              color: 'inherit',
                            }}
                            title={`View ${accountObj.name} Ledger`}
                          >
                            <div className="account-dot" style={{ background: accountObj.color || 'var(--accent)' }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{accountObj.name}</span>
                          </Link>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div
                          className="tags-cell"
                          onClick={() => setEditingTx(tx)}
                          style={{
                            display: 'inline-flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid transparent',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.background = 'var(--bg-subtle)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.background = 'transparent'
                          }}
                          title="Click to select or change tags"
                        >
                          {tx.tags.length > 0 ? (
                            tx.tags.map(t => (
                              <TagPill key={t} tag={t} color={currentTagMap[t]?.color} small />
                            ))
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px dashed var(--border)',
                                background: 'var(--bg-subtle)',
                              }}
                            >
                              <Plus size={10} /> Tag
                            </span>
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
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    No transactions match your current filters.{' '}
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textDecoration: 'underline',
                          marginLeft: 6,
                        }}
                      >
                        Reset filters
                      </button>
                    )}
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

      {/* Tag Picker Modal for selecting/changing tags on a transaction */}
      {editingTx && (
        <TagPickerModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          currentTags={editingTx.tags}
          availableTags={availableTags}
          onSave={handleSaveTags}
          onTagCreated={handleTagCreated}
          title="Select or Change Tags"
          subtitle={`${editingTx.description} · ${formatDate(editingTx.date)} · ${formatCurrency(editingTx.amount)}`}
        />
      )}

      {/* Standalone Modal for creating a new custom tag */}
      {showStandaloneTagModal && (
        <TagPickerModal
          isOpen={showStandaloneTagModal}
          onClose={() => setShowStandaloneTagModal(false)}
          currentTags={[]}
          availableTags={availableTags}
          onSave={() => setShowStandaloneTagModal(false)}
          onTagCreated={handleTagCreated}
          title="Create New Custom Tag"
        />
      )}
    </div>
  )
}

export default function TransactionsClient(props: Props) {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading transactions ledger…</div>}>
      <TransactionsContent {...props} />
    </Suspense>
  )
}

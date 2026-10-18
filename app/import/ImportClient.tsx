'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Landmark,
  Plus,
  Zap,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowLeftRight,
  Copy,
  BarChart3,
  TrendingUp,
  RefreshCw,
  X,
} from 'lucide-react'
import { Account, TagRule, COLUMN_MAP_FIELDS, ParsedRow } from '@/lib/types'
import { parseXlsx, parseCsv, autoDetectColumns, parseRows } from '@/lib/parsers'
import { runRulesEngine, extractUpiInfo } from '@/lib/tagger/engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import TagPill from '@/components/tags/TagPill'
import TagPickerModal from '@/components/tags/TagPickerModal'
import ModalPortal from '@/components/ui/ModalPortal'
import {
  TxLike,
  BatchDuplicateResult,
  TransferMatch,
  batchFindDuplicates,
  detectInternalTransfers,
  findDuplicates,
} from '@/lib/duplicate-detector'

type Step = 'drop' | 'map' | 'preview' | 'importing' | 'done' | 'manual'

interface ImportResult {
  total: number
  ruleTagged: number
  aiTagged: number
  saved: number
}

interface Props {
  accounts: Account[]
  rules: TagRule[]
  tagMap: Record<string, { name: string; color: string; icon: string }>
}

const BANK_PRESETS = [
  'HDFC Bank', 'ICICI Bank', 'State Bank of India (SBI)', 'Axis Bank', 'Kotak Mahindra', 'Custom CSV / Excel',
]

export default function ImportClient({ accounts, rules, tagMap }: Props) {
  const [step, setStep] = useState<Step>('drop')
  const [dragging, setDragging] = useState(false)
  const [accountList, setAccountList] = useState<Account[]>(accounts)
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '')
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    bank_name: '',
    account_type: 'credit' as Account['account_type'],
    color: '#2563eb',
  })
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newAccountError, setNewAccountError] = useState<string | null>(null)

  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Tag state & refreshing ─────────────────────────────────────────────
  const [currentRules, setCurrentRules] = useState<TagRule[]>(rules)
  const [currentTagMap, setCurrentTagMap] = useState<Record<string, { name: string; color: string; icon: string }>>(tagMap)
  const [availableTags, setAvailableTags] = useState<{ name: string; color: string; icon?: string }[]>(() =>
    Object.values(tagMap)
  )
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null)
  const [refreshingTags, setRefreshingTags] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [showStandaloneTagModal, setShowStandaloneTagModal] = useState(false)

  // ── Duplicate detection state ──────────────────────────────────────────
  const [dupResults, setDupResults] = useState<BatchDuplicateResult[]>([])
  const [transfers, setTransfers] = useState<TransferMatch[]>([])
  const [dupLoading, setDupLoading] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  // Manual entry duplicate warning
  const [manualDupWarning, setManualDupWarning] = useState<{ description: string; date: string; amount: number } | null>(null)
  const [manualDupChecked, setManualDupChecked] = useState(false)

  useEffect(() => {
    // Merge, don't replace: a refresh must never drop an account created on this page
    setAccountList(prev => [...accounts, ...prev.filter(p => !accounts.some(a => a.id === p.id))])
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id)
    }
  }, [accounts, selectedAccount])

  useEffect(() => {
    const tab = searchParams?.get('tab')
    const acc = searchParams?.get('account')
    if (acc && accountList.some(a => a.id === acc)) {
      setSelectedAccount(acc)
    }
    if (tab === 'manual') setStep('manual')
    else if (tab === 'statement') setStep('drop')
  }, [searchParams, accountList])

  async function handleCreateAccount() {
    if (!newAccountForm.name.trim()) {
      setNewAccountError('Account label is required.')
      return
    }
    setCreatingAccount(true)
    setNewAccountError(null)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccountForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }
      const created = data.account
      setAccountList(prev => [...prev, created])
      setSelectedAccount(created.id)
      setShowNewAccountModal(false)
      setNewAccountForm({
        name: '',
        bank_name: '',
        account_type: 'credit',
        color: '#2563eb',
      })
      router.refresh()
    } catch (err: any) {
      setNewAccountError(err.message || 'Error creating account')
    } finally {
      setCreatingAccount(false)
    }
  }

  // Manual entry state
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'debit' as 'credit' | 'debit',
    ref_no: '',
  })
  const [manualSaving, setManualSaving] = useState(false)

  // ── Fetch existing transactions for duplicate detection ────────────────
  const fetchExistingForDupCheck = useCallback(async (accountId: string): Promise<TxLike[]> => {
    try {
      const res = await fetch(`/api/transactions/check-duplicates?account_id=${accountId}&days=30`)
      if (!res.ok) return []
      const data = await res.json()
      return data.transactions || []
    } catch { return [] }
  }, [])

  async function handleFile(file: File) {
    setError('')
    setFilename(file.name)
    try {
      let res: { headers: string[]; rows: Record<string, string>[] }
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text()
        res = await parseCsv(text)
      } else {
        const buf = await file.arrayBuffer()
        res = await parseXlsx(buf)
      }

      if (res.rows.length === 0) {
        setError('No valid transaction rows found in this file.')
        return
      }

      setHeaders(res.headers)
      setRawRows(res.rows)
      const detected = autoDetectColumns(res.headers)
      setColumnMap(detected)
      setStep('map')
    } catch {
      setError('Failed to parse statement file. Please verify it is a valid CSV or Excel (.xlsx) file.')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handlePreview() {
    const parsed = parseRows(rawRows, columnMap)
    if (parsed.length === 0) {
      setError('Could not extract any valid transactions. Please check column mapping.')
      return
    }
    setError('')

    // Evaluate rules on parsed statement rows immediately for preview
    for (const r of parsed) {
      r.tags = []
      r.tag_source = null
    }
    runRulesEngine(parsed as any, currentRules)

    setParsedRows(parsed)
    setStep('preview')

    // Run duplicate detection against existing transactions
    setDupLoading(true)
    try {
      // Check against same account's existing transactions (last 30 days)
      const existing = await fetchExistingForDupCheck(selectedAccount)

      // Also fetch all accounts' transactions for transfer detection
      const allRes = await fetch(`/api/transactions/check-duplicates?account_id=all&days=7`)
      const allData = allRes.ok ? await allRes.json() : { transactions: [] }
      const allExisting: TxLike[] = allData.transactions || []

      // Convert parsed rows to TxLike for detection
      const incoming: TxLike[] = parsed.map((r, i) => ({
        id: `new-${i}`,
        account_id: selectedAccount,
        date: r.date,
        amount: r.amount,
        type: r.type as 'credit' | 'debit',
        description: r.description,
        ref_no: r.ref_no || null,
        upi_vpa: r.upi_vpa || null,
      }))

      // 1. Find duplicates against existing DB rows
      const dupBatch = batchFindDuplicates(incoming, existing)
      setDupResults(dupBatch)

      // 2. Detect internal transfers among all (incoming + existing from all accounts)
      const allCombined: TxLike[] = [...incoming, ...allExisting]
      const transferMatches = detectInternalTransfers(allCombined)
        .filter(t => t.debitId.startsWith('new-') || t.creditId.startsWith('new-'))
      setTransfers(transferMatches)
    } finally {
      setDupLoading(false)
    }
  }

  async function handleRefreshStatementTags() {
    setRefreshingTags(true)
    setRefreshMessage(null)
    try {
      const [rulesRes, tagsRes] = await Promise.all([
        fetch('/api/rules'),
        fetch('/api/tags'),
      ])

      let activeRules = currentRules
      if (rulesRes.ok) {
        const data = await rulesRes.json()
        if (Array.isArray(data.rules)) {
          activeRules = data.rules
          setCurrentRules(data.rules)
        }
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json()
        if (Array.isArray(data.tags)) {
          const map = Object.fromEntries(data.tags.map((t: any) => [t.name, t]))
          setCurrentTagMap(map)
          setAvailableTags(data.tags)
        }
      }

      // Re-run rules on parsed rows (preserve user-selected manual tags)
      const updated = [...parsedRows]
      for (const r of updated) {
        if (r.tag_source !== 'manual') {
          r.tags = []
          r.tag_source = null
        }
      }
      runRulesEngine(updated as any, activeRules)
      setParsedRows(updated)

      const totalTagged = updated.filter(r => (r.tags || []).length > 0).length
      setRefreshMessage(`✓ Tags refreshed! ${totalTagged} of ${updated.length} transactions now categorized.`)
      setTimeout(() => setRefreshMessage(null), 6000)
    } catch (err: any) {
      setRefreshMessage(`Failed to refresh tags: ${err.message}`)
    } finally {
      setRefreshingTags(false)
    }
  }

  function handleSaveRowTags(newTags: string[]) {
    if (editingRowIdx === null) return
    setParsedRows(prev => {
      const copy = [...prev]
      if (copy[editingRowIdx]) {
        copy[editingRowIdx] = {
          ...copy[editingRowIdx],
          tags: newTags,
          tag_source: 'manual',
        }
      }
      return copy
    })
    setEditingRowIdx(null)
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

  async function handleImport() {
    if (!selectedAccount) { setError('Select a target account.'); return }
    setStep('importing')
    setProgress(15)

    let txObjects = parsedRows.map((row, i) => ({
      _idx: i,
      account_id: selectedAccount,
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      balance_after: row.balance_after,
      upi_vpa: row.upi_vpa,
      upi_name: row.upi_name,
      ref_no: row.ref_no,
      tags: row.tags && row.tags.length > 0 ? [...row.tags] : ([] as string[]),
      tag_source: row.tag_source || (null as null | string),
      raw_row: row.raw_row,
    }))

    // Skip confirmed duplicates if toggle is on
    if (skipDuplicates && dupResults.length > 0) {
      txObjects = txObjects.filter((_, i) => !dupResults[i]?.isDuplicate)
    }

    setProgress(35)
    // Run rules engine only on rows that are not yet tagged
    const untaggedForRules = txObjects.filter((t: any) => t.tags.length === 0)
    const ruleTagged = runRulesEngine(untaggedForRules as any, currentRules)
    const untagged = txObjects.filter((t: any) => t.tags.length === 0)

    setProgress(60)
    let aiTaggedCount = 0

    if (untagged.length > 0) {
      try {
        const availableTags = Object.keys(tagMap)
        const batch = untagged.slice(0, 100)
        const res = await fetch('/api/tag-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: batch.map((t: any) => ({ id: t.description, description: t.description, upi_vpa: t.upi_vpa, upi_name: t.upi_name, amount: t.amount, type: t.type })),
            availableTags,
          }),
        })
        if (res.ok) {
          const { results } = await res.json()
          if (Array.isArray(results)) {
            const resultMap = Object.fromEntries(results.map((r: any) => [r.id, r.tags]))
            for (const tx of untagged) {
              const tags = resultMap[tx.description]
              if (tags && tags.length > 0) {
                tx.tags = tags
                tx.tag_source = 'ai'
                aiTaggedCount++
              }
            }
          }
        }
      } catch {
        // AI fallback skipped gracefully
      }
    }

    setProgress(80)

    const BATCH = 200
    let savedCount = 0
    for (let i = 0; i < txObjects.length; i += BATCH) {
      const chunk = txObjects.slice(i, i + BATCH)
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Database write error' }))
        setError(`Database write error: ${errData.error || 'Failed to save entries'}`)
        setStep('preview')
        return
      }
      savedCount += chunk.length
      setProgress(80 + Math.round((savedCount / txObjects.length) * 20))
    }

    // Update account last_imported_at
    await fetch(`/api/accounts/${selectedAccount}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_imported_at: new Date().toISOString() }),
    })

    setProgress(100)
    setResult({
      total: txObjects.length,
      ruleTagged,
      aiTagged: aiTaggedCount,
      saved: savedCount,
    })
    setStep('done')
    router.refresh()
  }

  async function handleManualSave(forceOverride = false) {
    if (!selectedAccount) { setError('Select an account'); return }
    if (!manualForm.description.trim()) { setError('Enter description'); return }
    if (!manualForm.amount || isNaN(+manualForm.amount)) { setError('Enter valid amount'); return }

    // ── Duplicate check before saving ──────────────────────────────────────
    if (!forceOverride && !manualDupChecked) {
      const existing = await fetchExistingForDupCheck(selectedAccount)
      const incoming: TxLike = {
        account_id: selectedAccount,
        date: manualForm.date,
        amount: parseFloat(manualForm.amount),
        type: manualForm.type,
        description: manualForm.description.trim(),
        ref_no: manualForm.ref_no || null,
        upi_vpa: null,
      }
      const matches = findDuplicates(incoming, existing)
      if (matches.length > 0 && matches[0].confidence >= 0.7) {
        const m = matches[0]
        setManualDupWarning({
          description: m.existingDescription,
          date: m.existingDate,
          amount: m.existingAmount,
        })
        setManualDupChecked(true)
        return   // pause — user must confirm
      }
    }

    setManualDupWarning(null)
    setManualDupChecked(false)
    setManualSaving(true)
    setError('')

    const { upi_vpa, upi_name } = extractUpiInfo(manualForm.description)

    const tx = {
      account_id: selectedAccount,
      date: manualForm.date,
      description: manualForm.description.trim(),
      amount: parseFloat(manualForm.amount),
      type: manualForm.type,
      balance_after: null,
      upi_vpa,
      upi_name,
      ref_no: manualForm.ref_no || null,
      tags: [] as string[],
      tag_source: null as null | string,
      raw_row: {},
    }

    runRulesEngine([tx] as any, rules)

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      setError(errData.error || 'Failed to save transaction')
      setManualSaving(false)
      return
    }

    setManualSaving(false)
    setManualForm(f => ({ ...f, description: '', amount: '', ref_no: '' }))
    router.refresh()
  }

  const stepIdx = { drop: 0, manual: 0, map: 1, preview: 2, importing: 3, done: 3 }[step]

  if (accountList.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon-wrap">
          <Landmark size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="empty-state-title">No bank or credit accounts linked</div>
        <div className="empty-state-sub">Please create a bank or credit card account first to start importing statements.</div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => {
            setNewAccountError(null)
            setShowNewAccountModal(true)
          }}
        >
          <Plus size={14} /> Add Bank / Credit Account
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Statement Import Engine</h1>
          <p className="page-subtitle">Reconcile and categorize CSV or Excel statements from any bank</p>
        </div>
      </div>

      {/* Target Account Selector */}
      <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Destination Ledger
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
            Transactions will be recorded under this ledger
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="select"
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            style={{ width: 280, fontWeight: 600 }}
          >
            {accountList.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.bank_name || a.account_type})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setNewAccountError(null)
              setShowNewAccountModal(true)
            }}
            title="Create New Account"
            style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
          >
            <Plus size={14} /> New Account
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {(['Statement Upload', 'Manual Single Entry'] as const).map((tab, i) => (
          <button
            key={tab}
            onClick={() => setStep(i === 0 ? 'drop' : 'manual')}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: (i === 0 ? step !== 'manual' : step === 'manual') ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: (i === 0 ? step !== 'manual' : step === 'manual') ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'all 0.12s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Step Indicator */}
      {step !== 'manual' && step !== 'drop' && (
        <div className="steps mb-6">
          {['Upload Statement', 'Map Headers', 'Preview & Ingest'].map((s, i) => (
            <div key={s} className="step">
              <div className={`step-dot ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === stepIdx ? 700 : 500, color: i === stepIdx ? 'var(--text-primary)' : 'var(--text-muted)', marginLeft: 8, marginRight: 12 }}>
                {s}
              </span>
              {i < 2 && <div className={`step-line ${i < stepIdx ? 'done' : ''}`} />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--red-subtle)',
          border: '1px solid var(--red-border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          fontSize: 12.5,
          color: 'var(--red)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: DROPZONE */}
      {step === 'drop' && (
        <div>
          <div
            className={`dropzone ${dragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <div className="dropzone-title">Upload your Bank Statement</div>
            <div className="dropzone-sub">Drag & drop CSV or Excel (.xlsx, .xls) files here</div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 16 }}
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
            >
              <FileSpreadsheet size={14} />
              Browse Statement File
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Bank Presets Badge list */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Supported Bank Statement Formats
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BANK_PRESETS.map(b => (
                <span key={b} className="filter-chip" style={{ cursor: 'default', background: 'var(--bg-subtle)' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPER */}
      {step === 'map' && (
        <div>
          <div className="card mb-4">
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{filename}</strong> — {rawRows.length.toLocaleString()} rows detected.
              Match your bank file headers to the standard ledger fields.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COLUMN_MAP_FIELDS.map(field => (
                <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {field.label}
                      {field.required && <span className="field-required">*</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{field.description}</div>
                  </div>
                  <select
                    className="select"
                    value={columnMap[field.key] || ''}
                    onChange={e => setColumnMap(m => ({ ...m, [field.key]: e.target.value }))}
                  >
                    <option value="">— Not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep('drop')}>
              <ArrowLeft size={13} /> Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={!columnMap.date || !columnMap.description || !(columnMap.amount || (columnMap.debit && columnMap.credit))}
            >
              Verify Transactions <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW */}
      {step === 'preview' && (
        <div>
          {/* Duplicate + Transfer Summary */}
          {dupLoading && (
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={13} className="spin" /> Scanning for duplicates and internal transfers…
            </div>
          )}

          {!dupLoading && dupResults.some(d => d.isDuplicate || d.isSuspect) && (
            <div style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} />
                Possible Duplicates Detected
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--amber)' }}>{dupResults.filter(d => d.isDuplicate).length}</strong> likely duplicates (🔴) and{' '}
                <strong>{dupResults.filter(d => d.isSuspect && !d.isDuplicate).length}</strong> suspects (🟡) found against your last 30 days.
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                  />
                  <strong>Auto-skip duplicates (confidence ≥ 85%)</strong>
                </label>
              </div>
            </div>
          )}

          {!dupLoading && transfers.length > 0 && (
            <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ArrowLeftRight size={14} />
                Internal Transfers Detected
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} detected between your accounts (same amount, within 3 days).
                These are flagged as <strong>↔ Transfer</strong> and will be excluded from Income/Expense totals.
              </div>
            </div>
          )}

          {refreshMessage && (
            <div
              style={{
                background: 'var(--green-subtle, rgba(22,163,74,0.08))',
                border: '1px solid rgba(22,163,74,0.25)',
                borderRadius: 'var(--radius)',
                padding: '10px 16px',
                fontSize: 12.5,
                color: 'var(--green, #16a34a)',
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{refreshMessage}</span>
              <button onClick={() => setRefreshMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Ready to ingest <strong style={{ color: 'var(--text-primary)' }}>{parsedRows.length.toLocaleString()}</strong> transactions from <strong style={{ color: 'var(--text-primary)' }}>{filename}</strong>
              {skipDuplicates && dupResults.filter(d => d.isDuplicate).length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--amber)', fontWeight: 600 }}>
                  ({dupResults.filter(d => d.isDuplicate).length} duplicates will be skipped)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={handleRefreshStatementTags}
                disabled={refreshingTags}
                title="Re-run rules engine across all rows in this statement"
              >
                {refreshingTags ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                {refreshingTags ? 'Refreshing Tags…' : 'Refresh Tags'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowStandaloneTagModal(true)}
                title="Create a new custom tag"
              >
                <Plus size={13} /> Custom Tag
              </button>
              <button className="btn btn-secondary" onClick={() => setStep('map')}>
                <ArrowLeft size={13} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleImport}>
                Confirm & Import <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Tags</th>
                    <th>UPI VPA</th>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, i) => {
                    const dup = dupResults[i]
                    const isTransfer = transfers.some(t => t.debitId === `new-${i}` || t.creditId === `new-${i}`)
                    const isDuplicate = dup?.isDuplicate
                    const isSuspect  = dup?.isSuspect && !isDuplicate
                    return (
                      <tr
                        key={i}
                        style={{
                          opacity: isDuplicate && skipDuplicates ? 0.4 : 1,
                          background: isDuplicate ? 'rgba(220,38,38,0.04)' : isSuspect ? 'rgba(217,119,6,0.04)' : isTransfer ? 'rgba(37,99,235,0.04)' : undefined,
                        }}
                      >
                        <td style={{ padding: '4px 8px', width: 28 }}>
                          {isDuplicate && <span title={`Likely duplicate — confidence ${Math.round((dup.matches[0]?.confidence || 0) * 100)}%`} style={{ cursor: 'help' }}>🔴</span>}
                          {isSuspect  && <span title={`Possible duplicate — confidence ${Math.round((dup.matches[0]?.confidence || 0) * 100)}%`} style={{ cursor: 'help' }}>🟡</span>}
                          {isTransfer && <span title="Internal transfer detected">↔</span>}
                        </td>
                        <td className="td-date">{formatDate(row.date)}</td>
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {row.description}
                          {isDuplicate && dup.matches[0] && (
                            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>
                              Matches: "{dup.matches[0].existingDescription.slice(0, 40)}" on {formatDate(dup.matches[0].existingDate)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div
                            onClick={() => setEditingRowIdx(i)}
                            style={{
                              display: 'inline-flex',
                              flexWrap: 'wrap',
                              gap: 4,
                              alignItems: 'center',
                              cursor: 'pointer',
                              padding: '3px 6px',
                              borderRadius: 6,
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
                            title="Click to select or change tags for this statement row"
                          >
                            {row.tags && row.tags.length > 0 ? (
                              row.tags.map(t => (
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
                        <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{row.upi_vpa || '—'}</td>
                        <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{row.ref_no || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`td-mono ${row.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                            {row.type === 'credit' ? '+' : '−'}{formatCurrency(row.amount)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING PROGRESS */}
      {step === 'importing' && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-subtle)', color: 'var(--accent)', marginBottom: 16 }}>
            <Loader2 size={24} className="spin" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
            Processing Bank Statement…
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Matching your custom rules, organizing transaction descriptions, and updating your accounts…
          </div>
          <div className="progress" style={{ width: '100%', height: 6 }}>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>{progress}%</div>
        </div>
      )}

      {/* STEP 5: RECEIPT & CONFIRMATION */}
      {step === 'done' && result && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--green-subtle)', color: 'var(--green)', marginBottom: 16 }}>
            <CheckCircle2 size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
            Statement Import Successful
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {result.saved.toLocaleString()} transactions ingested into your account ledger.
          </p>

          <div className="kpi-grid" style={{ margin: '20px 0', textAlign: 'left' }}>
            <div className="kpi-card">
              <div className="kpi-label">Total Ingested</div>
              <div className="kpi-value">{result.total.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Rule Classified</div>
              <div className="kpi-value" style={{ color: 'var(--green)' }}>{result.ruleTagged.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">AI Fallback Tagged</div>
              <div className="kpi-value" style={{ color: 'var(--accent)' }}>{result.aiTagged.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Untagged</div>
              <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>
                {(result.total - result.ruleTagged - result.aiTagged).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { setStep('drop'); setResult(null); setProgress(0) }}>
              <UploadCloud size={13} /> Import Another
            </button>
            <Link href={`/transactions?account=${selectedAccount}`} className="btn btn-primary">
              <ArrowLeftRight size={13} /> View in Ledger
            </Link>
            <Link href={`/analytics?account=${selectedAccount}`} className="btn btn-secondary">
              <BarChart3 size={13} /> View Analytics
            </Link>
            <Link href="/tags" className="btn btn-secondary">
              <Sparkles size={13} /> Rules & Tags
            </Link>
            <Link href="/networth" className="btn btn-secondary">
              <TrendingUp size={13} /> Net Worth
            </Link>
          </div>
        </div>
      )}

      {/* TAB: MANUAL ENTRY */}
      {step === 'manual' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} style={{ color: 'var(--accent)' }} />
            Add Single Transaction
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">Date <span className="field-required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={manualForm.date}
                  onChange={e => { setManualForm(f => ({ ...f, date: e.target.value })); setManualDupWarning(null); setManualDupChecked(false) }}
                />
              </div>
              <div className="field">
                <label className="field-label">Type</label>
                <select
                  className="select"
                  value={manualForm.type}
                  onChange={e => { setManualForm(f => ({ ...f, type: e.target.value as any })); setManualDupWarning(null); setManualDupChecked(false) }}
                >
                  <option value="debit">Debit (Outflow / Expense)</option>
                  <option value="credit">Credit (Inflow / Income)</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Description / Narration <span className="field-required">*</span></label>
              <input
                className="input"
                placeholder="e.g. UPI-Swiggy-swiggy@icici-Food Order"
                value={manualForm.description}
                onChange={e => { setManualForm(f => ({ ...f, description: e.target.value })); setManualDupWarning(null); setManualDupChecked(false) }}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="field-label">Amount (₹) <span className="field-required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={manualForm.amount}
                  onChange={e => { setManualForm(f => ({ ...f, amount: e.target.value })); setManualDupWarning(null); setManualDupChecked(false) }}
                />
              </div>
              <div className="field">
                <label className="field-label">Reference No.</label>
                <input
                  className="input"
                  placeholder="Optional"
                  value={manualForm.ref_no}
                  onChange={e => setManualForm(f => ({ ...f, ref_no: e.target.value }))}
                />
              </div>
            </div>

            {/* ── Duplicate warning inline ─────────────────────────────────── */}
            {manualDupWarning && (
              <div style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(217,119,6,0.35)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--amber)', marginBottom: 6, fontSize: 13 }}>
                  <AlertTriangle size={14} />
                  Possible Duplicate Detected
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  A similar transaction already exists in your ledger:
                </div>
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{manualDupWarning.description}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(manualDupWarning.date)} · {formatCurrency(manualDupWarning.amount)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => { setManualDupWarning(null); setManualDupChecked(false) }}
                    style={{ fontSize: 12 }}
                  >
                    Cancel — Don't Save
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleManualSave(true)}
                    disabled={manualSaving}
                    style={{ fontSize: 12 }}
                  >
                    <Copy size={12} /> Save Anyway (It's Different)
                  </button>
                </div>
              </div>
            )}

            {!manualDupWarning && (
              <button
                className="btn btn-primary"
                onClick={() => handleManualSave(false)}
                disabled={manualSaving || !manualForm.description || !manualForm.amount || !selectedAccount}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              >
                {manualSaving ? <><Loader2 size={13} className="spin" /> Saving…</> : 'Save Transaction'}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Tag Picker Modal for statement rows */}
      {editingRowIdx !== null && parsedRows[editingRowIdx] && (
        <TagPickerModal
          isOpen={editingRowIdx !== null}
          onClose={() => setEditingRowIdx(null)}
          currentTags={parsedRows[editingRowIdx].tags || []}
          availableTags={availableTags}
          onSave={handleSaveRowTags}
          onTagCreated={handleTagCreated}
          title="Select or Change Statement Tags"
          subtitle={`${parsedRows[editingRowIdx].description} · ${formatDate(parsedRows[editingRowIdx].date)} · ${formatCurrency(parsedRows[editingRowIdx].amount)}`}
        />
      )}

      {/* Standalone Custom Tag Creator */}
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

      {/* Quick Add Account Modal */}
      {showNewAccountModal && (
        <ModalPortal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: 16,
            }}
            onClick={e => e.target === e.currentTarget && setShowNewAccountModal(false)}
          >
            <div className="modal slide-up" style={{ maxWidth: 460, width: '100%', background: '#ffffff' }}>
              <div className="modal-header">
                <div className="modal-title">Create New Ledger Account</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowNewAccountModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {newAccountError && (
                  <div style={{
                    background: 'var(--red-subtle)',
                    border: '1px solid var(--red-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: 12,
                    color: 'var(--red)',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{newAccountError}</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Account Label <span className="field-required">*</span></label>
                    <input
                      className="input"
                      placeholder="e.g. HDFC Millennia Credit Card"
                      value={newAccountForm.name}
                      onChange={e => setNewAccountForm(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Bank Institution</label>
                    <input
                      className="input"
                      placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                      value={newAccountForm.bank_name}
                      onChange={e => setNewAccountForm(f => ({ ...f, bank_name: e.target.value }))}
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label className="field-label">Account Type</label>
                      <select
                        className="select"
                        value={newAccountForm.account_type}
                        onChange={e => setNewAccountForm(f => ({ ...f, account_type: e.target.value as any }))}
                      >
                        <option value="credit">Credit Card</option>
                        <option value="savings">Savings Account</option>
                        <option value="current">Current Account</option>
                        <option value="wallet">Wallet / Pre-paid</option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label">Currency</label>
                      <input
                        className="input"
                        value="INR (₹)"
                        disabled
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowNewAccountModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateAccount}
                  disabled={!newAccountForm.name.trim() || creatingAccount}
                >
                  {creatingAccount ? <><Loader2 size={13} className="spin" /> Creating…</> : 'Create & Select'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

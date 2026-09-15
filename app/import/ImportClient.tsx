'use client'

import { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import { Account, TagRule, COLUMN_MAP_FIELDS, ParsedRow } from '@/lib/types'
import { parseXlsx, parseCsv, autoDetectColumns, parseRows } from '@/lib/parsers'
import { runRulesEngine, extractUpiInfo } from '@/lib/tagger/engine'
import { formatCurrency, formatDate } from '@/lib/utils'

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
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '')
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

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'manual') setStep('manual')
    else if (tab === 'statement') setStep('drop')
  }, [searchParams])

  // Manual entry state
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'debit' as 'credit' | 'debit',
    ref_no: '',
  })
  const [manualSaving, setManualSaving] = useState(false)

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

  function handlePreview() {
    const parsed = parseRows(rawRows, columnMap)
    if (parsed.length === 0) {
      setError('Could not extract any valid transactions. Please check column mapping.')
      return
    }
    setError('')
    setParsedRows(parsed)
    setStep('preview')
  }

  async function handleImport() {
    if (!selectedAccount) { setError('Select a target account.'); return }
    setStep('importing')
    setProgress(15)

    const txObjects = parsedRows.map(row => ({
      account_id: selectedAccount,
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      balance_after: row.balance_after,
      upi_vpa: row.upi_vpa,
      upi_name: row.upi_name,
      ref_no: row.ref_no,
      tags: [] as string[],
      tag_source: null as null | string,
      raw_row: row.raw_row,
    }))

    setProgress(35)
    const ruleTagged = runRulesEngine(txObjects as any, rules)
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

  async function handleManualSave() {
    if (!selectedAccount) { setError('Select an account'); return }
    if (!manualForm.description.trim()) { setError('Enter description'); return }
    if (!manualForm.amount || isNaN(+manualForm.amount)) { setError('Enter valid amount'); return }

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

    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    })

    setManualSaving(false)
    setManualForm(f => ({ ...f, description: '', amount: '', ref_no: '' }))
    router.refresh()
  }

  const stepIdx = { drop: 0, manual: 0, map: 1, preview: 2, importing: 3, done: 3 }[step]

  if (accounts.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon-wrap">
          <Landmark size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="empty-state-title">No bank accounts linked</div>
        <div className="empty-state-sub">Please create an account first before importing your statements.</div>
        <Link href="/accounts" className="btn btn-primary" style={{ marginTop: 16 }}>
          <Plus size={14} /> Add First Account
        </Link>
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
      <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Destination Account
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
            Transactions will be recorded under this ledger
          </div>
        </div>
        <select
          className="select"
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          style={{ width: 280, fontWeight: 600 }}
        >
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
        </select>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Ready to ingest <strong style={{ color: 'var(--text-primary)' }}>{parsedRows.length.toLocaleString()}</strong> transactions from <strong style={{ color: 'var(--text-primary)' }}>{filename}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep('map')}>
                <ArrowLeft size={13} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleImport}>
                Confirm & Import {parsedRows.length.toLocaleString()} Entries <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>UPI VPA</th>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td className="td-date">{formatDate(row.date)}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{row.description}</td>
                      <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{row.upi_vpa || '—'}</td>
                      <td className="td-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{row.ref_no || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`td-mono ${row.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                          {row.type === 'credit' ? '+' : '−'}{formatCurrency(row.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
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
            Applying deterministic classification rules, reconciling UPI strings, writing to Neon PostgreSQL…
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => { setStep('drop'); setResult(null); setProgress(0) }}>
              Import Another Statement
            </button>
            <Link href="/transactions" className="btn btn-primary">
              Open Transaction Ledger <ArrowRight size={13} />
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
                  onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Type</label>
                <select
                  className="select"
                  value={manualForm.type}
                  onChange={e => setManualForm(f => ({ ...f, type: e.target.value as any }))}
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
                onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
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
                  onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))}
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

            <button
              className="btn btn-primary"
              onClick={handleManualSave}
              disabled={manualSaving || !manualForm.description || !manualForm.amount || !selectedAccount}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              {manualSaving ? <><Loader2 size={13} className="spin" /> Saving…</> : 'Save Transaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

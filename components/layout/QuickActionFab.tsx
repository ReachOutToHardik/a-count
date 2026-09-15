'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FileSpreadsheet,
  Receipt,
  Landmark,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { extractUpiInfo } from '@/lib/tagger/engine'
import { Account } from '@/lib/types'

export default function QuickActionFab() {
  const [isOpen, setIsOpen] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // Manual transaction form state
  const [form, setForm] = useState({
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'debit' as 'credit' | 'debit',
    ref_no: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Fetch accounts when modal opens
  useEffect(() => {
    if (showManualModal && accounts.length === 0) {
      setLoadingAccounts(true)
      fetch('/api/accounts')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.accounts)) {
            setAccounts(data.accounts)
            if (data.accounts.length > 0 && !form.account_id) {
              setForm(f => ({ ...f, account_id: data.accounts[0].id }))
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingAccounts(false))
    }
  }, [showManualModal, accounts.length, form.account_id])

  // Close on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowManualModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleButtonEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsOpen(true)
  }

  function handleMenuEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function handleLeave() {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id) { setError('Select a target account'); return }
    if (!form.description.trim()) { setError('Enter description'); return }
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) {
      setError('Enter a valid amount')
      return
    }

    setSaving(true)
    setError('')

    const { upi_vpa, upi_name } = extractUpiInfo(form.description)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: form.account_id,
          date: form.date,
          description: form.description.trim(),
          amount: parseFloat(form.amount),
          type: form.type,
          balance_after: null,
          upi_vpa,
          upi_name,
          ref_no: form.ref_no || null,
          tags: [],
          tag_source: 'manual',
          raw_row: {},
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save entry')
      }

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowManualModal(false)
        setForm(f => ({ ...f, description: '', amount: '', ref_no: '' }))
        router.refresh()
      }, 600)
    } catch (err: any) {
      setError(err.message || 'Error recording transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Darkened & Blurred backdrop overlay when hovering or clicking the FAB */}
      {isOpen && (
        <div
          className="fab-hover-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Container: Sized strictly to the button so zero invisible hover captures happen */}
      <div className="fab-wrapper">
        {/* Floating Menu: Only appears when isOpen is true */}
        {isOpen && (
          <div
            ref={menuRef}
            className="fab-popover-menu"
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleLeave}
          >
            <div className="fab-popover-header">Quick Action</div>

            {/* Option 1: Statement Upload */}
            <Link
              href="/import"
              className="fab-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <div className="fab-menu-icon">
                <FileSpreadsheet size={15} />
              </div>
              <div className="fab-menu-content">
                <div className="fab-menu-title">Upload Statement</div>
                <div className="fab-menu-desc">Import CSV or Excel files</div>
              </div>
            </Link>

            {/* Option 2: Manual Single Entry */}
            <button
              type="button"
              className="fab-menu-item"
              onClick={() => {
                setIsOpen(false)
                setShowManualModal(true)
              }}
            >
              <div className="fab-menu-icon">
                <Receipt size={15} />
              </div>
              <div className="fab-menu-content">
                <div className="fab-menu-title">Manual Transaction</div>
                <div className="fab-menu-desc">Record single credit or debit</div>
              </div>
            </button>

            {/* Option 3: Add Account */}
            <Link
              href="/accounts"
              className="fab-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <div className="fab-menu-icon">
                <Landmark size={15} />
              </div>
              <div className="fab-menu-content">
                <div className="fab-menu-title">New Bank Account</div>
                <div className="fab-menu-desc">Link a savings or current account</div>
              </div>
            </Link>
          </div>
        )}

        {/* Floating Trigger Button: STRICT hover target */}
        <button
          ref={buttonRef}
          type="button"
          className={`fab-trigger-btn ${isOpen ? 'active' : ''}`}
          onMouseEnter={handleButtonEnter}
          onMouseLeave={handleLeave}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="New action"
          title="New action (+)"
        >
          <Plus size={18} strokeWidth={2.2} className={`fab-trigger-icon ${isOpen ? 'rotated' : ''}`} />
        </button>
      </div>

      {/* ── Minimalist In-Place Modal ────────────────────────────────────── */}
      {showManualModal && (
        <div
          className="modal-backdrop"
          onClick={e => e.target === e.currentTarget && setShowManualModal(false)}
        >
          <div className="modal slide-up" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">New Transaction Entry</div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowManualModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && (
                <div style={{
                  background: 'var(--red-subtle)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              {/* Target Account */}
              <div className="field">
                <label className="field-label">Account <span className="field-required">*</span></label>
                <select
                  className="select"
                  value={form.account_id}
                  onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                  disabled={loadingAccounts}
                >
                  {accounts.length > 0 ? (
                    accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.bank_name})
                      </option>
                    ))
                  ) : (
                    <option value="">{loadingAccounts ? 'Loading accounts…' : 'No accounts available'}</option>
                  )}
                </select>
              </div>

              {/* Date & Type */}
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Date <span className="field-required">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Type</label>
                  <select
                    className="select"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  >
                    <option value="debit">Debit (− Outflow)</option>
                    <option value="credit">Credit (+ Inflow)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="field">
                <label className="field-label">Description / Narration <span className="field-required">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Swiggy food delivery, AWS hosting, etc."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              {/* Amount & Reference */}
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Amount (₹) <span className="field-required">*</span></label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Ref / UTR No.</label>
                  <input
                    className="input"
                    placeholder="Optional"
                    value={form.ref_no}
                    onChange={e => setForm(f => ({ ...f, ref_no: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 0 0 0', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !form.description || !form.amount || !form.account_id}
                >
                  {saveSuccess ? (
                    <><CheckCircle2 size={14} /> Saved</>
                  ) : saving ? (
                    <><Loader2 size={14} className="spin" /> Saving…</>
                  ) : (
                    'Record Entry'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

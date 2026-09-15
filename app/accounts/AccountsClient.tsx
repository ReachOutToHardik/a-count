'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Account, AccountType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Landmark,
  CreditCard,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react'

const ACCOUNT_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2',
  '#9333ea', '#db2777', '#ea580c', '#0d9488', '#65a30d',
]

interface Props {
  accounts: Account[]
  accountStats: Record<string, { credit: number; debit: number; count: number }>
}

interface AccountForm {
  name: string
  bank_name: string
  account_type: AccountType
  currency: string
  color: string
}

const EMPTY_FORM: AccountForm = {
  name: '',
  bank_name: '',
  account_type: 'savings',
  currency: 'INR',
  color: '#2563eb',
}

export default function AccountsClient({ accounts, accountStats }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  function openNew() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(acct: Account) {
    setForm({
      name: acct.name,
      bank_name: acct.bank_name,
      account_type: acct.account_type,
      currency: acct.currency,
      color: acct.color,
    })
    setEditId(acct.id)
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    if (editId) {
      await fetch(`/api/accounts/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setSaving(false)
    setShowModal(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this account and all its transaction history?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Accounts & Ledgers</h1>
          <p className="page-subtitle">Manage multi-bank holdings, current balances, and statement history</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={14} /> Add Bank Account
        </button>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon-wrap">
            <Landmark size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="empty-state-title">No accounts added yet</div>
          <div className="empty-state-sub">Add your savings, current, credit card, or wallet accounts to track balances.</div>
          <button className="btn btn-primary" onClick={openNew} style={{ marginTop: 16 }}>
            <Plus size={14} /> Add First Account
          </button>
        </div>
      ) : (
        <div className="grid-auto">
          {accounts.map(acct => {
            const stats = accountStats[acct.id] || { credit: 0, debit: 0, count: 0 }
            const balance = stats.credit - stats.debit
            return (
              <div key={acct.id} className="account-card" style={{ '--account-color': acct.color } as React.CSSProperties}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{acct.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {acct.bank_name || 'Bank Account'} · <span style={{ textTransform: 'capitalize' }}>{acct.account_type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(acct)} title="Edit Account">
                      <Pencil size={13} />
                    </button>
                    <Link href={`/accounts/${acct.id}`} className="btn btn-ghost btn-icon btn-sm" title="View Ledger">
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                <div className="account-balance">{formatCurrency(balance, 'INR')}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0 10px', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credits (+)</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)', marginTop: 2 }}>
                      +{formatCurrency(stats.credit, 'INR')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Debits (−)</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)', marginTop: 2 }}>
                      −{formatCurrency(stats.debit, 'INR')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                  <span>{stats.count.toLocaleString()} transactions</span>
                  {acct.last_imported_at && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {new Date(acct.last_imported_at).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(acct.id)}
                  style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                >
                  <Trash2 size={12} /> Remove Account
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Account Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal slide-up">
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Account Details' : 'Add New Bank Account'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label className="field-label">Account Label <span className="field-required">*</span></label>
                  <input
                    className="input"
                    placeholder="e.g. HDFC Salary Account"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label className="field-label">Bank Institution</label>
                  <input
                    className="input"
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    value={form.bank_name}
                    onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  />
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label className="field-label">Account Type</label>
                    <select
                      className="select"
                      value={form.account_type}
                      onChange={e => setForm(f => ({ ...f, account_type: e.target.value as AccountType }))}
                    >
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                      <option value="credit">Credit Card</option>
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

                <div className="field">
                  <label className="field-label">Accent Theme</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCOUNT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c,
                          border: form.color === c ? '3px solid white' : '3px solid transparent',
                          outline: form.color === c ? `2px solid ${c}` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name || saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

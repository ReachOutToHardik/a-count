'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    })

    if (res.ok) {
      const next = params.get('next') || '/'
      router.push(next)
      router.refresh()
    } else {
      setError('Incorrect passphrase. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="login-card slide-up">
      <div style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div className="brand-badge" style={{ width: 36, height: 36, borderRadius: 'var(--radius)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>A-Count</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Financial Statement Intelligence</div>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Enter your local passphrase to unlock your financial vault.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="passphrase">Passphrase</label>
          <div style={{ position: 'relative' }}>
            <input
              id="passphrase"
              type="password"
              className="input"
              placeholder="Enter passphrase…"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              autoFocus
              required
              style={{ paddingLeft: 34 }}
            />
            <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-subtle)',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--red)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading || !passphrase}
          style={{ justifyContent: 'center', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {loading ? <><Loader2 size={13} className="spin" /> Authenticating…</> : <>Unlock Session <ArrowRight size={13} /></>}
        </button>
      </form>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 22, textAlign: 'center', lineHeight: 1.5 }}>
        Configured via <code style={{ background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>APP_PASSPHRASE</code> in <code style={{ background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>.env.local</code>.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <Suspense fallback={
        <div className="login-card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}

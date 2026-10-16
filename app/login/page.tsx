'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'

function LoginForm() {
  const [passphrase, setPassphrase] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      // Securely unlock this browser tab session
      sessionStorage.setItem('acount_tab_unlocked', '1')
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
          <div className="brand-badge" style={{ width: 44, height: 44 }}>
            <AppLogo size={44} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>A-Count</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Personal Financial Vault · INR</div>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>
          <ShieldCheck size={13} />
          <span>Encrypted Session Locked</span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Enter your vault passphrase to unlock your banking statements, ledgers, and net worth dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="passphrase">Passphrase</label>
          <div style={{ position: 'relative' }}>
            <input
              id="passphrase"
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="Enter passphrase…"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              autoFocus
              required
              style={{ paddingLeft: 34, paddingRight: 36 }}
            />
            <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
              }}
              title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
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
          style={{ justifyContent: 'center', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          {loading ? <><Loader2 size={14} className="spin" /> Verifying Passphrase…</> : <>Unlock Financial Vault <ArrowRight size={14} /></>}
        </button>
      </form>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 22, textAlign: 'center', lineHeight: 1.5 }}>
        Session automatically locks when the tab is closed. Configured via <code style={{ background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>APP_PASSPHRASE</code>.
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

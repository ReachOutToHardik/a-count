'use client'

import { useRouter } from 'next/navigation'
import { Lock, Sparkles, Database, Info, LogOut, CheckCircle2, Shield } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="page-title">System Settings & Vault</h1>
          <p className="page-subtitle">Security parameters, database credentials, and classification settings</p>
        </div>
      </div>

      {/* Passphrase section */}
      <div className="card mb-4">
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Lock size={15} style={{ color: 'var(--accent)' }} />
          Session Passphrase Protection
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Your passphrase is configured via the <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>APP_PASSPHRASE</code> variable in <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>.env.local</code>.
        </p>
        <button className="btn btn-danger" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={13} /> Lock Session & Log Out
        </button>
      </div>

      {/* AI Fallback */}
      <div className="card mb-4">
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Sparkles size={15} style={{ color: 'var(--accent)' }} />
          Automated Classification Engine
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          Statement entries first match against your prioritized deterministic rules. Unmatched entries optionally fallback to Gemini AI if <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>GEMINI_API_KEY</code> is set in your environment.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Deterministic rule engine is active and prioritized.
          </span>
        </div>
      </div>

      {/* Neon Serverless PostgreSQL Vault */}
      <div className="card mb-4">
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Database size={15} style={{ color: 'var(--accent)' }} />
          Free Neon Serverless PostgreSQL
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Connected via <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>DATABASE_URL</code> in <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>.env.local</code>.
          Schema migrations reside in <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>neon/schema.sql</code>.
        </p>
      </div>

      {/* Architecture & Privacy */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={15} style={{ color: 'var(--accent)' }} />
          Architecture & Privacy Guarantee
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div>Self-hosted personal bank statement intelligence</div>
          <div>All data stays exclusively in your local database. Zero external telemetry.</div>
        </div>
      </div>
    </div>
  )
}

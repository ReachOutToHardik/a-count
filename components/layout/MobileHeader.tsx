'use client'

import Link from 'next/link'
import { UploadCloud, Download } from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'

export default function MobileHeader() {
  return (
    <header className="mobile-top-header">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="brand-badge" style={{ width: 30, height: 30 }}>
          <AppLogo size={30} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>A-Count</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>FINTECH VAULT</div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => (window as any).__openPwaInstallPrompt?.()}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          title="Install App"
        >
          <Download size={13} />
          <span>App</span>
        </button>
        <Link href="/import" className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: 11.5 }}>
          <UploadCloud size={13} />
          <span>Import</span>
        </Link>
      </div>
    </header>
  )
}

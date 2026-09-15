'use client'

import Link from 'next/link'
import { UploadCloud, Plus } from 'lucide-react'

export default function MobileHeader() {
  return (
    <header className="mobile-top-header">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="brand-badge" style={{ width: 28, height: 28, borderRadius: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>A-Count</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>FINTECH VAULT</div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 6 }}>
        <Link href="/import" className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: 11.5 }}>
          <UploadCloud size={13} />
          <span>Import</span>
        </Link>
      </div>
    </header>
  )
}

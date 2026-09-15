'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  UploadCloud,
  BarChart3,
  Tags,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',             Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts',     Icon: Landmark,        label: 'Accounts' },
  { href: '/transactions', Icon: ArrowLeftRight,  label: 'Transactions' },
  { href: '/import',       Icon: UploadCloud,     label: 'Import Statement' },
  { href: '/analytics',    Icon: BarChart3,       label: 'Analytics' },
  { href: '/tags',         Icon: Tags,            label: 'Tags & Rules' },
  { href: '/settings',     Icon: SlidersHorizontal, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <div className="brand-title">A-Count</div>
          <div className="brand-subtitle">Bank Intelligence</div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`nav-link ${isActive ? 'active' : ''}`}>
              <div className="nav-link-left">
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className="nav-icon" />
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Workspace Footer */}
      <div className="sidebar-footer">
        <div className="workspace-badge">
          <div className="workspace-avatar">
            <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>Personal Vault</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Neon PostgreSQL · INR ₹</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

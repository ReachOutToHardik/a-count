'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AppLogo from '@/components/ui/AppLogo'
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  UploadCloud,
  BarChart3,
  Tags,
  SlidersHorizontal,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Download,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',             Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts',     Icon: Landmark,        label: 'Accounts' },
  { href: '/transactions', Icon: ArrowLeftRight,  label: 'Transactions' },
  { href: '/import',       Icon: UploadCloud,     label: 'Import Statement' },
  { href: '/analytics',    Icon: BarChart3,       label: 'Analytics' },
  { href: '/networth',     Icon: TrendingUp,      label: 'Net Worth' },
  { href: '/tags',         Icon: Tags,            label: 'Tags & Rules' },
  { href: '/glossary',     Icon: BookOpen,        label: 'Glossary' },
  { href: '/settings',     Icon: SlidersHorizontal, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge" style={{ width: 32, height: 32 }}>
          <AppLogo size={32} />
        </div>
        <div>
          <div className="brand-title">A-Count</div>
          <div className="brand-subtitle">Personal Finance · INR</div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        {NAV_ITEMS.map(({ href, Icon, label }, i) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{ overflow: 'hidden' }}
              >
                {/* Sliding active background pill */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'var(--radius)',
                        background: 'var(--accent-subtle)',
                        border: '1px solid var(--accent-border)',
                        zIndex: 0,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <div className="nav-link-left">
                  <motion.div
                    animate={isActive
                      ? { color: 'var(--accent)', opacity: 1 }
                      : { color: 'var(--text-muted)', opacity: 0.7 }
                    }
                    transition={{ duration: 0.2 }}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                  </motion.div>
                  <motion.span
                    animate={isActive
                      ? { color: 'var(--text-primary)' }
                      : { color: 'var(--text-muted)' }
                    }
                    transition={{ duration: 0.2 }}
                  >
                    {label}
                  </motion.span>
                </div>

                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                      zIndex: 1,
                      position: 'relative',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <button
            onClick={() => (window as any).__openPwaInstallPrompt?.()}
            className="nav-link"
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.2s',
            }}
            title="Install A-Count application"
          >
            <div className="nav-link-left">
              <Download size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Install App</span>
            </div>
            <span
              style={{
                fontSize: 10,
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700,
                letterSpacing: '0.4px',
              }}
            >
              PWA
            </span>
          </button>
        </div>
      </nav>

      {/* Workspace Footer */}
      <div className="sidebar-footer">
        <div className="workspace-badge">
          <div className="workspace-avatar">
            <ShieldCheck size={13} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>Personal Vault</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Supabase PostgreSQL · INR ₹</div>
          </div>
        </div>
        <motion.div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 0 3px var(--green-dim)',
          }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </aside>
  )
}

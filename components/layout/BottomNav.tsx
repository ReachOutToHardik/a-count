'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  UploadCloud,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react'

const MOBILE_TABS = [
  { href: '/',             Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts',     Icon: Landmark,        label: 'Accounts' },
  { href: '/transactions', Icon: ArrowLeftRight,  label: 'Ledger' },
  { href: '/import',       Icon: UploadCloud,     label: 'Import' },
  { href: '/analytics',    Icon: BarChart3,       label: 'Analytics' },
  { href: '/settings',     Icon: SlidersHorizontal, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_TABS.map(({ href, Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className={`mobile-tab-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} className="mobile-tab-icon" />
            <span className="mobile-tab-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

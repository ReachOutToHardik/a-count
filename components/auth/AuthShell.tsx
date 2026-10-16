'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import MobileHeader from '@/components/layout/MobileHeader'
import QuickActionFab from '@/components/layout/QuickActionFab'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isVerifying, setIsVerifying] = useState(true)
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // On the login page, no tab verification needed
    if (isLoginPage) {
      setIsVerifying(false)
      return
    }

    // Tab-level session check:
    // When the user closes or removes the tab, sessionStorage is completely wiped!
    // So re-opening the tab or opening in a new tab requires entering the passcode again.
    const isTabUnlocked = sessionStorage.getItem('acount_tab_unlocked')
    if (!isTabUnlocked) {
      // Invalidate cookie and redirect to login
      fetch('/api/auth', { method: 'DELETE' }).finally(() => {
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`
      })
      return
    }

    setIsVerifying(false)
  }, [pathname, isLoginPage])

  // If on login page, render ONLY the children without any sidebar, headers, tabs, or navigation
  if (isLoginPage) {
    return <div className="login-screen-wrap">{children}</div>
  }

  // While verifying tab lock state on a protected route, prevent any content from flashing
  if (isVerifying) {
    return (
      <div className="vault-lock-screen">
        <div className="vault-lock-spinner" />
      </div>
    )
  }

  // Once authenticated and tab unlocked, render the full application shell
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <MobileHeader />
        <main className="page-content fade-in">{children}</main>
        <BottomNav />
        <QuickActionFab />
      </div>
    </div>
  )
}

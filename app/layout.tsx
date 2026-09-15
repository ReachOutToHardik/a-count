import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import MobileHeader from '@/components/layout/MobileHeader'
import QuickActionFab from '@/components/layout/QuickActionFab'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: { template: '%s · A-Count', default: 'A-Count — Bank Intelligence' },
  description: 'Personal bank statement manager — search, tag, and analyse all your accounts in one place.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'A-Count',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">
            <MobileHeader />
            <main className="page-content fade-in">
              {children}
            </main>
            <BottomNav />
            <QuickActionFab />
          </div>
        </div>
      </body>
    </html>
  )
}

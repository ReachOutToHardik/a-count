'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, WifiOff, CheckCircle2, Share, PlusSquare } from 'lucide-react'

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSTip, setShowIOSTip] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [showOnlineToast, setShowOnlineToast] = useState(false)

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[A-Count PWA] Service Worker registered:', reg.scope)
          })
          .catch((err) => {
            console.warn('[A-Count PWA] Service Worker registration failed:', err)
          })
      })
    }

    // 2. Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)
    setIsIOS(isIOSDevice && isSafari)

    // 4. Capture beforeinstallprompt for Chrome / Edge / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      const dismissedAt = localStorage.getItem('acount_pwa_dismissed')
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (!isStandalone && (!dismissedAt || Date.now() - Number(dismissedAt) > sevenDays)) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Global hook to trigger install prompt programmatically
    ;(window as any).__openPwaInstallPrompt = () => {
      if (deferredPrompt) {
        setShowInstallBanner(true)
      } else if (isIOSDevice) {
        setShowIOSTip(true)
      } else {
        alert('A-Count is ready! You can install it using your browser menu (Install app / Add to Home Screen).')
      }
    }

    // 5. Offline / Online network listeners
    const handleOnline = () => {
      setIsOffline(false)
      setShowOnlineToast(true)
      setTimeout(() => setShowOnlineToast(false), 3500)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (!navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [deferredPrompt])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSTip(true)
      }
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log('[A-Count PWA] User installation choice:', outcome)
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    setShowIOSTip(false)
    localStorage.setItem('acount_pwa_dismissed', Date.now().toString())
  }

  return (
    <>
      {/* Offline Alert Bar */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: '#ef4444',
              color: '#ffffff',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            <WifiOff size={16} />
            <span>You are currently offline. Viewing cached accounts and balances.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Online Toast */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: '#10b981',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Connection restored!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Install App Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9990,
              maxWidth: 380,
              width: 'calc(100vw - 32px)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 18,
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.18), 0 0 1px 1px rgba(0,0,0,0.04)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--bg-secondary, #f8fafc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <Image
                  src="/brand-icon.png"
                  alt="A-Count"
                  width={34}
                  height={34}
                  style={{ objectFit: 'contain' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 2 }}>
                  Install A-Count App
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #64748b)', lineHeight: 1.4 }}>
                  Fast standalone access, offline bank view, and mobile home screen icon.
                </div>
              </div>

              <button
                onClick={handleDismiss}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary, #94a3b8)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                }}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleDismiss}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 10,
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                }}
              >
                Not Now
              </button>
              <button
                onClick={handleInstallClick}
                style={{
                  background: 'var(--color-primary, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '7px 16px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                }}
              >
                <Download size={14} />
                <span>Install</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      <AnimatePresence>
        {showIOSTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--card-bg, #ffffff)',
                borderRadius: 20,
                padding: '24px 22px',
                maxWidth: 360,
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 14px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Image src="/brand-icon.png" alt="A-Count" width={40} height={40} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                Install A-Count on iOS
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                Install directly from Safari to launch A-Count like a native app from your home screen:
              </p>

              <div
                style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>1.</span>
                  <span>Tap the <strong>Share</strong> button <Share size={15} style={{ verticalAlign: 'middle', display: 'inline' }} /> in Safari</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>2.</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={15} style={{ verticalAlign: 'middle', display: 'inline' }} /></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>3.</span>
                  <span>Tap <strong>Add</strong> in the top-right corner</span>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                style={{
                  width: '100%',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

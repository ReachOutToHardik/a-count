'use client'

import React, { useEffect, useRef, useState } from 'react'

interface AppLogoProps {
  size?: number
  className?: string
  loop?: boolean
  autoplay?: boolean
  mode?: 'brand' | 'dark' | 'light'
  primaryColor?: string
  secondaryColor?: string
  style?: React.CSSProperties
}

/**
 * Animated Lottie App Logo using Lordicon wired-outline-298-coins
 * Supports interactive hover play, looping coin drops, and dynamic color styling.
 */
export default function AppLogo({
  size = 28,
  className = '',
  loop = true,
  autoplay = true,
  mode = 'brand',
  primaryColor,
  secondaryColor,
  style,
}: AppLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Determine colors based on mode or explicit props
  const resolvedPrimary = primaryColor || (mode === 'brand' ? '#ffffff' : mode === 'dark' ? '#0f172a' : '#ffffff')
  const resolvedSecondary = secondaryColor || (mode === 'brand' ? '#38bdf8' : '#2563eb')

  useEffect(() => {
    let isMounted = true

    async function loadLottie() {
      if (!containerRef.current) return

      try {
        const lottie = (await import('lottie-web')).default

        // Fetch the wired-outline-298-coins JSON
        const response = await fetch('/wired-outline-298-coins.json')
        const animationData = await response.json()

        if (!isMounted || !containerRef.current) return

        // Clean up previous instance if any
        if (animRef.current) {
          animRef.current.destroy()
        }

        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: loop,
          autoplay: autoplay,
          animationData: animationData,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true,
          },
        })

        animRef.current = anim
        anim.addEventListener('DOMLoaded', () => {
          if (isMounted) setIsLoaded(true)
        })
      } catch (err) {
        console.warn('Lottie animation failed to initialize, using fallback SVG:', err)
      }
    }

    loadLottie()

    return () => {
      isMounted = false
      if (animRef.current) {
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [loop, autoplay])

  const handleMouseEnter = () => {
    if (animRef.current) {
      animRef.current.stop()
      animRef.current.play()
    }
  }

  return (
    <div
      className={`lottie-logo-wrap ${className}`}
      onMouseEnter={handleMouseEnter}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        ...style,
      }}
      title="A-Count"
    >
      <style>{`
        .lottie-logo-wrap svg path.primary,
        .lottie-logo-wrap svg g.primary path,
        .lottie-logo-wrap svg [stroke="#121331"],
        .lottie-logo-wrap svg [stroke="rgb(18,19,49)"] {
          stroke: ${resolvedPrimary} !important;
        }
        .lottie-logo-wrap svg path.secondary,
        .lottie-logo-wrap svg g.secondary path,
        .lottie-logo-wrap svg [stroke="#66d7ee"],
        .lottie-logo-wrap svg [stroke="rgb(102,215,238)"] {
          stroke: ${resolvedSecondary} !important;
        }
      `}</style>

      {/* Container for Lottie SVG */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: isLoaded ? 'block' : 'none',
        }}
      />

      {/* Fallback Static SVG before Lottie renders */}
      {!isLoaded && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 430 430"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          <g stroke={resolvedPrimary} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
            <rect x="62" y="249" width="237" height="56" rx="28" fill="none" />
            <rect x="87" y="193" width="237" height="56" rx="28" fill="none" />
            <rect x="34" y="137" width="237" height="56" rx="28" fill="none" />
            <rect x="88" y="81" width="237" height="56" rx="28" fill="none" />
          </g>
          <g transform="translate(274, 249)">
            <circle cx="0" cy="0" r="119.4" fill="none" stroke={resolvedPrimary} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="0" cy="0" r="84.2" fill="none" stroke={resolvedSecondary} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      )}
    </div>
  )
}

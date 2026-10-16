'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface AppLogoProps {
  size?: number
  className?: string
  animated?: boolean
  style?: React.CSSProperties
}

/**
 * AppLogo - Calculator with Stacks of Gold Coins
 * Clean, modern fintech icon with optional interactive micro-interactions.
 */
export default function AppLogo({
  size = 32,
  className = '',
  animated = true,
  style,
}: AppLogoProps) {
  const imageElement = (
    <Image
      src="/brand-icon.png"
      alt="A-Count Logo"
      width={size}
      height={size}
      priority
      unoptimized
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))',
      }}
    />
  )

  if (!animated) {
    return (
      <div
        className={`app-logo-wrap ${className}`}
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style,
        }}
      >
        {imageElement}
      </div>
    )
  }

  return (
    <motion.div
      className={`app-logo-wrap ${className}`}
      whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        ...style,
      }}
      title="A-Count"
    >
      {imageElement}
    </motion.div>
  )
}

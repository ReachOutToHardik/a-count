'use client'

import { X } from 'lucide-react'

interface TagPillProps {
  tag: string
  color?: string
  onRemove?: () => void
  small?: boolean
}

export default function TagPill({ tag, color, onRemove, small }: TagPillProps) {
  const style = color
    ? { background: color + '1a', color: color, borderColor: color + '40' }
    : {}

  return (
    <span
      className="tag-pill"
      style={{ fontSize: small ? 10 : undefined, ...style }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 0 2px', color: 'inherit', opacity: 0.5,
            display: 'flex', alignItems: 'center',
          }}
          aria-label={`Remove ${tag}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

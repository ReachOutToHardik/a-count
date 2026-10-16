'use client'

import { useState, useRef, useEffect } from 'react'
import { Transaction } from '@/lib/types'
import {
  exportToCorporatePdf,
  exportToExcel,
  exportToCsv,
  ExportMetadata,
} from '@/lib/export'
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  ChevronDown,
  Printer,
  Check,
} from 'lucide-react'

interface Props {
  transactions: Transaction[]
  metadata: ExportMetadata
  filenamePrefix?: string
  buttonText?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'default'
  disabled?: boolean
  className?: string
}

export default function ExportDropdown({
  transactions,
  metadata,
  filenamePrefix = 'acount_ledger',
  buttonText,
  variant = 'secondary',
  size = 'default',
  disabled = false,
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleExport(format: 'pdf' | 'excel' | 'csv') {
    setIsOpen(false)
    setLastAction(format)
    setTimeout(() => setLastAction(null), 2500)

    if (format === 'pdf') {
      exportToCorporatePdf(transactions, metadata)
    } else if (format === 'excel') {
      exportToExcel(transactions, metadata, filenamePrefix)
    } else if (format === 'csv') {
      exportToCsv(transactions, filenamePrefix)
    }
  }

  const label = buttonText || (transactions.length > 0 ? `Export (${transactions.length.toLocaleString()})` : 'Export')

  const btnClass = variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-secondary'
  const sizeClass = size === 'sm' ? 'btn-sm' : ''

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <button
        type="button"
        className={`btn ${btnClass} ${sizeClass}`}
        onClick={() => setIsOpen(prev => !prev)}
        disabled={disabled || transactions.length === 0}
        title={`Export ${transactions.length} records as Corporate PDF, Excel, or CSV`}
        style={{ gap: 6, fontWeight: 600 }}
      >
        {lastAction ? (
          <Check size={14} style={{ color: 'var(--green, #10b981)' }} />
        ) : (
          <Download size={14} />
        )}
        <span>{lastAction ? 'Exporting…' : label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            minWidth: 260,
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg, 10px)',
            boxShadow: 'var(--shadow-lg, 0 16px 36px rgba(0,0,0,0.12))',
            padding: '6px',
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          <div
            style={{
              padding: '6px 10px 8px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Export Options
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 1 }}>
              {transactions.length.toLocaleString()} transactions selected
            </div>
          </div>

          {/* Option 1: Corporate PDF */}
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Corporate PDF Statement
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Printable executive audit letterhead
              </div>
            </div>
          </button>

          {/* Option 2: Excel (.xlsx) */}
          <button
            type="button"
            onClick={() => handleExport('excel')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--green, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Excel Spreadsheet (.xlsx)
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Multi-sheet workbook with KPI summary
              </div>
            </div>
          </button>

          {/* Option 3: CSV (.csv) */}
          <button
            type="button"
            onClick={() => handleExport('csv')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'rgba(100, 116, 139, 0.1)',
                color: 'var(--slate, #64748b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileCode size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Raw CSV Data (.csv)
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                RFC-4180 standard table with UTF-8 BOM
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

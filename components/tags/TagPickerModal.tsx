'use client'

import { useState, useMemo, useEffect } from 'react'
import ModalPortal from '@/components/ui/ModalPortal'
import TagPill from '@/components/tags/TagPill'
import { Search, Plus, Check, X, Sparkles, Tag as TagIcon, Palette } from 'lucide-react'

interface TagItem {
  name: string
  color: string
  icon?: string
}

interface TagPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentTags: string[]
  availableTags: TagItem[]
  onSave: (newTags: string[]) => void | Promise<void>
  onTagCreated?: (newTag: TagItem) => void
  title?: string
  subtitle?: string
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#16a34a', // Green
  '#64748b', // Slate
]

export default function TagPickerModal({
  isOpen,
  onClose,
  currentTags,
  availableTags,
  onSave,
  onTagCreated,
  title = 'Select & Change Tags',
  subtitle,
}: TagPickerModalProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#2563eb')
  const [savingNewTag, setSavingNewTag] = useState(false)
  const [localAvailable, setLocalAvailable] = useState<TagItem[]>([])

  useEffect(() => {
    if (isOpen) {
      setSelected([...currentTags])
      setSearch('')
      setIsCreating(false)
      setNewTagName('')
    }
  }, [isOpen, currentTags])

  useEffect(() => {
    setLocalAvailable(availableTags)
  }, [availableTags])

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return localAvailable
    return localAvailable.filter(t => t.name.toLowerCase().includes(q))
  }, [localAvailable, search])

  const exactMatch = useMemo(() => {
    const q = search.toLowerCase().trim()
    return localAvailable.some(t => t.name.toLowerCase() === q)
  }, [localAvailable, search])

  if (!isOpen) return null

  function toggleTag(tagName: string) {
    if (selected.includes(tagName)) {
      setSelected(selected.filter(t => t !== tagName))
    } else {
      setSelected([...selected, tagName])
    }
  }

  async function handleCreateTag() {
    const cleanName = (newTagName || search).trim().toLowerCase().replace(/\s+/g, '-')
    if (!cleanName) return

    setSavingNewTag(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, color: newTagColor }),
      })

      if (res.ok) {
        const data = await res.json()
        const created: TagItem = {
          name: data.tag?.name || cleanName,
          color: data.tag?.color || newTagColor,
        }

        // Add to local list if not present
        if (!localAvailable.some(t => t.name === created.name)) {
          setLocalAvailable(prev => [...prev, created])
        }

        // Auto-select the newly created tag
        if (!selected.includes(created.name)) {
          setSelected(prev => [...prev, created.name])
        }

        onTagCreated?.(created)
        setIsCreating(false)
        setNewTagName('')
        setSearch('')
      }
    } catch (err) {
      console.error('Failed to create tag', err)
    } finally {
      setSavingNewTag(false)
    }
  }

  function handleDone() {
    onSave(selected)
    onClose()
  }

  return (
    <ModalPortal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 16,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 14px)',
            width: '100%',
            maxWidth: 460,
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TagIcon size={16} style={{ color: 'var(--accent)' }} />
                {title}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 3,
                    maxWidth: 360,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                borderRadius: 6,
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Assigned Tags */}
          <div style={{ padding: '12px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Assigned Tags ({selected.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28, alignItems: 'center' }}>
              {selected.length > 0 ? (
                selected.map(t => {
                  const tagMeta = localAvailable.find(a => a.name === t)
                  return (
                    <TagPill
                      key={t}
                      tag={t}
                      color={tagMeta?.color}
                      onRemove={() => toggleTag(t)}
                    />
                  )
                })
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No tags assigned yet. Select from below or create a custom tag.
                </span>
              )}
            </div>
          </div>

          {/* Search & Tag List */}
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
            {/* Search Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-input, var(--bg-subtle))',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius, 8px)',
                padding: '8px 12px',
                marginBottom: 12,
              }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search or type new tag…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  width: '100%',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Inline Custom Tag Creator */}
            {isCreating ? (
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius, 8px)',
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} /> Create New Custom Tag
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Tag Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="e.g. travel, gifts, gym, pet-care"
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Accent Color
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: c,
                          border: newTagColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {newTagColor === c && <Check size={11} color="#ffffff" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'none',
                      }}
                      title="Custom color"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCreating(false)}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateTag}
                    disabled={savingNewTag || !(newTagName || search).trim()}
                    style={{ padding: '4px 12px', fontSize: 12 }}
                  >
                    {savingNewTag ? 'Saving…' : 'Create & Apply'}
                  </button>
                </div>
              </div>
            ) : (
              // Prompt to create new tag if search query doesn't match
              search.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    setNewTagName(search.trim())
                    setIsCreating(true)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius, 8px)',
                    border: '1px dashed var(--accent)',
                    background: 'var(--accent-subtle, rgba(37,99,235,0.06))',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 12,
                    textAlign: 'center',
                  }}
                >
                  <Plus size={14} /> Create custom tag "{search.trim().toLowerCase().replace(/\s+/g, '-')}"
                </button>
              )
            )}

            {/* List of Available Tags */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Available Categories ({filteredTags.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
              {filteredTags.map(tag => {
                const isSelected = selected.includes(tag.name)
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: isSelected ? `1.5px solid ${tag.color || 'var(--accent)'}` : '1px solid var(--border)',
                      background: isSelected ? `${tag.color}15` : 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: tag.color || '#2563eb',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? (tag.color || 'var(--accent)') : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    {isSelected && <Check size={12} style={{ color: tag.color || 'var(--accent)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>

            {filteredTags.length === 0 && !search.trim() && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                No tags found. Click below to create your first custom tag.
              </div>
            )}

            {!isCreating && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewTagName('')
                    setIsCreating(true)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={13} /> Make a New Custom Tag
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelected([])}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              Clear All
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDone}
                style={{ fontSize: 12, padding: '6px 16px', fontWeight: 600 }}
              >
                Apply Tags ({selected.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

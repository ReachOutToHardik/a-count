'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, TagRule, RuleCondition, RuleField, RuleOp } from '@/lib/types'
import TagPill from '@/components/tags/TagPill'
import { Plus, Pencil, Trash2, X, Zap, Tag as TagIcon, Sparkles } from 'lucide-react'

interface Props {
  tags: Tag[]
  rules: TagRule[]
}

const FIELD_OPTIONS: { value: RuleField; label: string }[] = [
  { value: 'description', label: 'Description' },
  { value: 'upi_vpa', label: 'UPI VPA (ID)' },
  { value: 'upi_name', label: 'UPI Name' },
  { value: 'type', label: 'Type (credit/debit)' },
  { value: 'amount', label: 'Amount (₹)' },
]

const OP_OPTIONS: { value: RuleOp; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'equals', label: 'equals' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
]

const EMPTY_CONDITION: RuleCondition = { field: 'description', op: 'contains', value: '' }

export default function TagsClient({ tags, rules }: Props) {
  const [activeTab, setActiveTab] = useState<'rules' | 'tags'>('rules')
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [editRule, setEditRule] = useState<TagRule | null>(null)
  const [editTag, setEditTag] = useState<Tag | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [ruleName, setRuleName] = useState('')
  const [rulePriority, setRulePriority] = useState(100)
  const [ruleConditions, setRuleConditions] = useState<RuleCondition[]>([{ ...EMPTY_CONDITION }])
  const [ruleTags, setRuleTags] = useState<string[]>([])
  const [ruleTagInput, setRuleTagInput] = useState('')

  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#2563eb')

  function openNewRule() {
    setEditRule(null)
    setRuleName('')
    setRulePriority(100)
    setRuleConditions([{ ...EMPTY_CONDITION }])
    setRuleTags([])
    setShowRuleModal(true)
  }

  function openEditRule(rule: TagRule) {
    setEditRule(rule)
    setRuleName(rule.name)
    setRulePriority(rule.priority)
    setRuleConditions(rule.conditions.length ? rule.conditions : [{ ...EMPTY_CONDITION }])
    setRuleTags([...rule.tags])
    setShowRuleModal(true)
  }

  async function saveRule() {
    if (!ruleName || ruleConditions.some(c => !c.value) || ruleTags.length === 0) return
    setSaving(true)
    const data = { name: ruleName, priority: rulePriority, conditions: ruleConditions, tags: ruleTags }
    if (editRule) {
      await fetch(`/api/rules/${editRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setSaving(false)
    setShowRuleModal(false)
    router.refresh()
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this automated categorization rule?')) return
    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function openNewTag() {
    setEditTag(null)
    setTagName('')
    setTagColor('#2563eb')
    setShowTagModal(true)
  }

  function openEditTag(tag: Tag) {
    setEditTag(tag)
    setTagName(tag.name)
    setTagColor(tag.color)
    setShowTagModal(true)
  }

  async function saveTag() {
    if (!tagName) return
    setSaving(true)
    const data = { name: tagName.toLowerCase().replace(/\s+/g, '-'), color: tagColor, icon: '' }
    if (editTag) {
      await fetch(`/api/tags/${editTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setSaving(false)
    setShowTagModal(false)
    router.refresh()
  }

  async function deleteTag(id: string) {
    if (!confirm('Delete this tag? Existing transactions will keep the text tag.')) return
    await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tags & Classification Engine</h1>
          <p className="page-subtitle">Configure deterministic IFTTT rules and custom categorization tags</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'rules' ? (
            <button className="btn btn-primary" onClick={openNewRule}>
              <Plus size={14} /> New Rule
            </button>
          ) : (
            <button className="btn btn-primary" onClick={openNewTag}>
              <Plus size={14} /> New Tag
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: activeTab === 'rules' ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'rules' ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer',
            marginBottom: -1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Zap size={14} /> Auto-Tag Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: activeTab === 'tags' ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'tags' ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer',
            marginBottom: -1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <TagIcon size={14} /> Tag Library ({tags.length})
        </button>
      </div>

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <div>
          <div className="table-container">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Priority</th>
                    <th>Rule Name</th>
                    <th>Condition Logic</th>
                    <th>Applied Tags</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id}>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                          #{rule.priority}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {rule.conditions.map((c, i) => (
                            <span key={i} className="filter-chip" style={{ cursor: 'default', fontSize: 11 }}>
                              <span style={{ color: 'var(--text-muted)' }}>{c.field}</span>
                              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{c.op}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>&ldquo;{c.value}&rdquo;</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="tags-cell">
                          {rule.tags.map(t => <TagPill key={t} tag={t} />)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditRule(rule)} title="Edit Rule">
                            <Pencil size={12} />
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteRule(rule.id)} title="Delete Rule">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAGS TAB */}
      {activeTab === 'tags' && (
        <div className="grid-auto">
          {tags.map(tag => (
            <div key={tag.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: tag.color + '18',
                border: `1px solid ${tag.color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tag.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{tag.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tag.color}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditTag(tag)} title="Edit Tag">
                  <Pencil size={12} />
                </button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteTag(tag.id)} title="Delete Tag">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowRuleModal(false)}>
          <div className="modal slide-up" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">{editRule ? 'Edit Rule' : 'New Classification Rule'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRuleModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Rule Name <span className="field-required">*</span></label>
                  <input className="input" placeholder="e.g. Swiggy Food Orders" value={ruleName} onChange={e => setRuleName(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Evaluation Priority (1 = first)</label>
                  <input type="number" className="input" value={rulePriority} onChange={e => setRulePriority(+e.target.value)} min={1} />
                </div>
              </div>

              <div>
                <div className="section-title">Matching Conditions (ALL must match)</div>
                {ruleConditions.map((cond, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select
                      className="select"
                      style={{ width: 140 }}
                      value={cond.field}
                      onChange={e => { const nc = [...ruleConditions]; nc[idx].field = e.target.value as RuleField; setRuleConditions(nc) }}
                    >
                      {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                      className="select"
                      style={{ width: 120 }}
                      value={cond.op}
                      onChange={e => { const nc = [...ruleConditions]; nc[idx].op = e.target.value as RuleOp; setRuleConditions(nc) }}
                    >
                      {OP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input
                      className="input"
                      placeholder="Keyword / string to match"
                      value={cond.value}
                      onChange={e => { const nc = [...ruleConditions]; nc[idx].value = e.target.value; setRuleConditions(nc) }}
                    />
                    {ruleConditions.length > 1 && (
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => setRuleConditions(c => c.filter((_, i) => i !== idx))}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => setRuleConditions(c => [...c, { ...EMPTY_CONDITION }])}>
                  <Plus size={12} /> Add Condition
                </button>
              </div>

              <div className="field">
                <label className="field-label">Assigned Tags <span className="field-required">*</span></label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {ruleTags.map(t => <TagPill key={t} tag={t} onRemove={() => setRuleTags(tg => tg.filter(x => x !== t))} />)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Type tag name and press Enter"
                    value={ruleTagInput}
                    onChange={e => setRuleTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && ruleTagInput.trim()) {
                        setRuleTags(t => [...new Set([...t, ruleTagInput.trim().toLowerCase()])])
                        setRuleTagInput('')
                      }
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (ruleTagInput.trim()) {
                        setRuleTags(t => [...new Set([...t, ruleTagInput.trim().toLowerCase()])])
                        setRuleTagInput('')
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveRule} disabled={!ruleName || ruleConditions.some(c => !c.value) || ruleTags.length === 0 || saving}>
                {saving ? 'Saving…' : editRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowTagModal(false)}>
          <div className="modal slide-up" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title">{editTag ? 'Edit Tag' : 'New Tag'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTagModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">Tag Name <span className="field-required">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. groceries, dining, utilities"
                  value={tagName}
                  onChange={e => setTagName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Color Swatch</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    className="input"
                    value={tagColor}
                    onChange={e => setTagColor(e.target.value)}
                    style={{ width: 44, height: 36, padding: 2, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{tagColor}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTagModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTag} disabled={!tagName || saving}>
                {saving ? 'Saving…' : editTag ? 'Save Changes' : 'Create Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

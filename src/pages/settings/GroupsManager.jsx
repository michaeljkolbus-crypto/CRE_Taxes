import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { hexToRgba } from '../../components/shared/TagInput'

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#64748b', // slate
  '#a16207', // yellow-dark
  '#7c3aed', // purple
]

export default function GroupsManager() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [contactCounts, setContactCounts] = useState({})

  // Modal state: null = closed | 'add' | { ...groupRecord } for edit
  const [modal, setModal] = useState(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: groupData } = await supabase
      .from('contact_group_definitions')
      .select('*')
      .order('name')

    const allGroups = groupData || []
    setGroups(allGroups)

    // Count contacts per group
    if (allGroups.length > 0) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('contact_groups')
        .not('contact_groups', 'is', null)

      const counts = {}
      allGroups.forEach(g => { counts[g.name] = 0 })
      ;(contactData || []).forEach(c => {
        ;(c.contact_groups || []).forEach(name => {
          if (name in counts) counts[name]++
        })
      })
      setContactCounts(counts)
    } else {
      setContactCounts({})
    }
    setLoading(false)
  }

  const openAdd = () => {
    setFormName('')
    setFormColor(PRESET_COLORS[0])
    setError('')
    setModal('add')
  }

  const openEdit = (group) => {
    setFormName(group.name)
    setFormColor(group.color)
    setError('')
    setModal(group)
  }

  const handleSave = async () => {
    const trimName = formName.trim()
    if (!trimName) { setError('Group name is required.'); return }
    setSaving(true)
    setError('')

    if (modal === 'add') {
      const { error: err } = await supabase
        .from('contact_group_definitions')
        .insert({ name: trimName, color: formColor })
      if (err) {
        setError('A group with that name already exists.')
        setSaving(false)
        return
      }
    } else {
      // Edit — update catalog
      const oldName = modal.name
      const { error: err } = await supabase
        .from('contact_group_definitions')
        .update({ name: trimName, color: formColor })
        .eq('id', modal.id)
      if (err) {
        setError('A group with that name already exists.')
        setSaving(false)
        return
      }

      // Propagate rename to all contacts that held the old name
      if (oldName !== trimName) {
        const { data: affected } = await supabase
          .from('contacts')
          .select('id, contact_groups')
          .contains('contact_groups', [oldName])

        if (affected && affected.length > 0) {
          for (const contact of affected) {
            const updated = contact.contact_groups.map(n => n === oldName ? trimName : n)
            await supabase.from('contacts').update({ contact_groups: updated }).eq('id', contact.id)
          }
        }
      }
    }

    setSaving(false)
    setModal(null)
    fetchAll()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    // Remove group name from all contacts that have it
    const { data: affected } = await supabase
      .from('contacts')
      .select('id, contact_groups')
      .contains('contact_groups', [deleteTarget.name])

    if (affected && affected.length > 0) {
      for (const contact of affected) {
        const updated = contact.contact_groups.filter(n => n !== deleteTarget.name)
        await supabase.from('contacts').update({ contact_groups: updated }).eq('id', contact.id)
      }
    }

    await supabase.from('contact_group_definitions').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchAll()
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Contact Groups</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            Define the group tags available to your contacts. Groups work like hashtags — assign them quickly from any contact record.
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            flexShrink: 0, padding: '9px 18px', background: '#1e40af', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + New Group
        </button>
      </div>

      {/* Group Table */}
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>No groups yet</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Create your first group to start tagging contacts.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  Group Tag
                </th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', width: 100 }}>
                  Contacts
                </th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right', width: 160 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => (
                <tr
                  key={g.id}
                  style={{ borderBottom: idx < groups.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: g.color, flexShrink: 0,
                      }} />
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 11px', borderRadius: 99,
                        background: hexToRgba(g.color, 0.12),
                        color: g.color,
                        border: `1px solid ${hexToRgba(g.color, 0.3)}`,
                        fontSize: 13, fontWeight: 600,
                      }}>
                        #{g.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 13, color: '#475569' }}>
                    {contactCounts[g.name] ?? 0}
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => openEdit(g)}
                      style={{
                        padding: '4px 12px', background: '#f1f5f9',
                        border: '1px solid #e2e8f0', borderRadius: 6,
                        fontSize: 12, fontWeight: 500, color: '#475569',
                        cursor: 'pointer', marginRight: 6,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(g)}
                      style={{
                        padding: '4px 12px', background: '#fff',
                        border: '1px solid #fca5a5', borderRadius: 6,
                        fontSize: 12, fontWeight: 500, color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modal !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {modal === 'add' ? 'New Group' : 'Edit Group'}
            </h2>

            {/* Name */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Group Name
            </label>
            <input
              value={formName}
              onChange={e => { setFormName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Investor, Attorney, Key Contact"
              autoFocus
              style={{
                width: '100%', padding: '8px 10px',
                border: `1px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: error ? 4 : 16,
              }}
            />
            {error && (
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#ef4444' }}>{error}</p>
            )}

            {/* Color picker */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c, border: 'none', cursor: 'pointer',
                    outline: formColor === c ? `3px solid ${c}` : '2px solid transparent',
                    outlineOffset: 2, transition: 'outline 0.1s',
                  }}
                />
              ))}
            </div>

            {/* Preview */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Preview
            </label>
            <div style={{ marginBottom: 22 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 13px', borderRadius: 99,
                background: hexToRgba(formColor, 0.12),
                color: formColor,
                border: `1px solid ${hexToRgba(formColor, 0.3)}`,
                fontSize: 13, fontWeight: 600,
              }}>
                #{formName || 'Group Name'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: '8px 16px', background: '#f1f5f9',
                  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formName.trim() || saving}
                style={{
                  padding: '8px 20px', background: '#1e40af', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', opacity: !formName.trim() || saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Delete Group?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              This will permanently delete{' '}
              <span style={{
                padding: '1px 8px', borderRadius: 99,
                background: hexToRgba(deleteTarget.color, 0.12),
                color: deleteTarget.color,
                border: `1px solid ${hexToRgba(deleteTarget.color, 0.3)}`,
                fontWeight: 600,
              }}>
                #{deleteTarget.name}
              </span>{' '}
              and remove it from{' '}
              {(contactCounts[deleteTarget.name] ?? 0) > 0
                ? <strong>{contactCounts[deleteTarget.name]} contact{contactCounts[deleteTarget.name] === 1 ? '' : 's'}</strong>
                : 'all contacts'
              }. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '8px 16px', background: '#f1f5f9',
                  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '8px 20px', background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

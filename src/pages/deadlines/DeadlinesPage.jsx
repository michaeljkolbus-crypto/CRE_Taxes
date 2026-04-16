import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const COUNTIES     = ['Peoria', 'Tazewell', 'Woodford', 'Other']
const APPEAL_TYPES = ['BOR', 'PTAB']
const CURRENT_YEAR = new Date().getFullYear()

// ── Urgency helpers ──────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function urgencyBadge(days) {
  if (days === null)    return { label: '—', bg: '#f1f5f9', color: '#94a3b8' }
  if (days < 0)         return { label: 'Closed',           bg: '#f1f5f9', color: '#94a3b8' }
  if (days === 0)       return { label: 'Today!',           bg: '#fee2e2', color: '#991b1b' }
  if (days <= 7)        return { label: `${days}d left`,    bg: '#fee2e2', color: '#991b1b' }
  if (days <= 14)       return { label: `${days}d left`,    bg: '#fed7aa', color: '#9a3412' }
  if (days <= 30)       return { label: `${days}d left`,    bg: '#fef9c3', color: '#713f12' }
  return                       { label: `${days}d left`,    bg: '#dcfce7', color: '#166534' }
}

function statusBadge(open, close) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (!open && !close) return { label: 'Dates TBD', bg: '#f1f5f9', color: '#64748b' }
  const openDate  = open  ? new Date(open  + 'T00:00:00') : null
  const closeDate = close ? new Date(close + 'T00:00:00') : null
  if (closeDate && closeDate < today)   return { label: 'Closed',    bg: '#f1f5f9', color: '#64748b' }
  if (openDate  && openDate  > today)   return { label: 'Not Yet Open', bg: '#e0f2fe', color: '#0c4a6e' }
  return                                       { label: 'Open',      bg: '#dcfce7', color: '#166534' }
}

// ── DeadlineModal (Add / Edit) ───────────────────────────────────────────────
function DeadlineModal({ deadline, onClose, onSaved }) {
  const emptyForm = { county: 'Peoria', appeal_type: 'BOR', tax_year: CURRENT_YEAR, open_date: '', close_date: '', notes: '' }
  const [form, setForm]     = useState(deadline ? { ...deadline } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.county || !form.appeal_type || !form.tax_year) {
      setError('County, Appeal Type, and Tax Year are required.'); return
    }
    setSaving(true); setError(null)
    const payload = {
      county:       form.county,
      appeal_type:  form.appeal_type,
      tax_year:     parseInt(form.tax_year, 10),
      open_date:    form.open_date  || null,
      close_date:   form.close_date || null,
      notes:        form.notes      || null,
    }
    const { error: err } = deadline?.id
      ? await supabase.from('county_deadlines').update(payload).eq('id', deadline.id)
      : await supabase.from('county_deadlines').insert(payload)

    if (err) {
      if (err.code === '23505') setError('A deadline for this county/type/year already exists.')
      else setError('Save failed: ' + err.message)
    } else {
      onSaved(); onClose()
    }
    setSaving(false)
  }

  const INP = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
  const LBL = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            {deadline?.id ? 'Edit Deadline' : 'Add Deadline'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={LBL}>County</label>
            <select value={form.county} onChange={e => f('county', e.target.value)} style={INP}>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Appeal Type</label>
            <select value={form.appeal_type} onChange={e => f('appeal_type', e.target.value)} style={INP}>
              {APPEAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Tax Year</label>
            <input type="number" value={form.tax_year} onChange={e => f('tax_year', e.target.value)} min="2000" max="2099" style={INP} />
          </div>
          <div />
          <div>
            <label style={LBL}>Filing Opens</label>
            <input type="date" value={form.open_date || ''} onChange={e => f('open_date', e.target.value)} style={INP} />
          </div>
          <div>
            <label style={LBL}>Filing Closes</label>
            <input type="date" value={form.close_date || ''} onChange={e => f('close_date', e.target.value)} style={INP} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => f('notes', e.target.value)} rows={3}
              placeholder="e.g. Peoria County BOR typically opens late June. Check peoriacounty.org."
              style={{ ...INP, resize: 'vertical' }} />
          </div>
        </div>

        {error && <div style={{ marginTop: 14, background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : (deadline?.id ? 'Save Changes' : 'Add Deadline')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AlertBanner ──────────────────────────────────────────────────────────────
function AlertBanner({ deadlines }) {
  const urgent = deadlines.filter(d => {
    const days = daysUntil(d.close_date)
    return days !== null && days >= 0 && days <= 30
  }).sort((a, b) => daysUntil(a.close_date) - daysUntil(b.close_date))

  if (urgent.length === 0) return null

  return (
    <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
      <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 8 }}>
        ⚠ {urgent.length} upcoming filing deadline{urgent.length !== 1 ? 's' : ''} within 30 days
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {urgent.map(d => {
          const days = daysUntil(d.close_date)
          const { label, bg, color } = urgencyBadge(days)
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ padding: '1px 8px', borderRadius: 10, background: bg, color, fontWeight: 700, fontSize: 11 }}>{label}</span>
              <span style={{ color: '#78350f' }}>
                <strong>{d.county}</strong> {d.appeal_type} — Tax Year {d.tax_year}
                {d.close_date && <span style={{ color: '#92400e' }}> (closes {new Date(d.close_date + 'T00:00:00').toLocaleDateString()})</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DeadlinesPage() {
  const { user } = useAuth()
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  // Filters
  const [filterYear,    setFilterYear]    = useState(String(CURRENT_YEAR))
  const [filterCounty,  setFilterCounty]  = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')

  useEffect(() => { fetchDeadlines() }, [])

  const fetchDeadlines = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('county_deadlines')
      .select('*')
      .order('tax_year', { ascending: false })
      .order('close_date', { ascending: true })
    if (err) setError('Failed to load deadlines')
    else setDeadlines(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this deadline?')) return
    const { error: err } = await supabase.from('county_deadlines').delete().eq('id', id)
    if (err) setError('Delete failed: ' + err.message)
    else fetchDeadlines()
  }

  const openAdd  = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (d)  => { setEditTarget(d);   setModalOpen(true) }

  // Filter logic
  const filtered = deadlines.filter(d => {
    if (filterYear   && String(d.tax_year)   !== filterYear)   return false
    if (filterCounty && d.county             !== filterCounty) return false
    if (filterType   && d.appeal_type        !== filterType)   return false
    if (filterStatus) {
      const { label } = statusBadge(d.open_date, d.close_date)
      if (filterStatus === 'open'   && label !== 'Open')           return false
      if (filterStatus === 'closed' && label !== 'Closed')         return false
      if (filterStatus === 'soon'   && (daysUntil(d.close_date) > 30 || daysUntil(d.close_date) < 0)) return false
    }
    return true
  })

  // Unique years for filter dropdown
  const years = [...new Set(deadlines.map(d => d.tax_year))].sort((a, b) => b - a)

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#1e293b' }}>County Deadlines</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>BOR and PTAB filing windows for Peoria, Tazewell, and Woodford counties</p>
        </div>
        <button onClick={openAdd}
          style={{ padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Add Deadline
        </button>
      </div>

      {/* Alert banner */}
      <AlertBanner deadlines={deadlines} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', color: '#1e293b', minWidth: 110 }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
          {!years.includes(CURRENT_YEAR) && <option value={String(CURRENT_YEAR)}>{CURRENT_YEAR}</option>}
        </select>
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', color: '#1e293b', minWidth: 120 }}>
          <option value="">All Counties</option>
          {COUNTIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', color: '#1e293b', minWidth: 100 }}>
          <option value="">BOR + PTAB</option>
          {APPEAL_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff', color: '#1e293b', minWidth: 130 }}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="soon">Closing Soon (&le;30d)</option>
          <option value="closed">Closed</option>
        </select>
        {(filterYear || filterCounty || filterType || filterStatus) && (
          <button onClick={() => { setFilterYear(String(CURRENT_YEAR)); setFilterCounty(''); setFilterType(''); setFilterStatus('') }}
            style={{ padding: '7px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ color: '#475569', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No deadlines found</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              {deadlines.length === 0
                ? 'Add your first county deadline to start tracking filing windows.'
                : 'Try adjusting your filters.'}
            </div>
            {deadlines.length === 0 && (
              <button onClick={openAdd}
                style={{ padding: '9px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Add First Deadline
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['County', 'Type', 'Tax Year', 'Filing Opens', 'Filing Closes', 'Days Left', 'Status', 'Notes', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'County' || h === 'Notes' || h === '' ? 'left' : 'center', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const days          = daysUntil(d.close_date)
                const urgency       = urgencyBadge(days)
                const status        = statusBadge(d.open_date, d.close_date)
                const typeColor     = d.appeal_type === 'BOR' ? { bg: '#eff6ff', color: '#1e40af' } : { bg: '#f3e8ff', color: '#6b21a8' }
                const isUrgent      = days !== null && days >= 0 && days <= 7
                return (
                  <tr key={d.id}
                    style={{ background: isUrgent ? '#fff7ed' : idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', transition: 'background 0.1s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{d.county}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, background: typeColor.bg, color: typeColor.color, fontWeight: 700, fontSize: 12 }}>
                        {d.appeal_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#1e293b', fontWeight: 600 }}>{d.tax_year}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                      {d.open_date ? new Date(d.open_date + 'T00:00:00').toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569', fontWeight: d.close_date ? 600 : 400 }}>
                      {d.close_date ? new Date(d.close_date + 'T00:00:00').toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {days !== null ? (
                        <span style={{ padding: '3px 10px', borderRadius: 12, background: urgency.bg, color: urgency.color, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {urgency.label}
                        </span>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: status.bg, color: status.color, fontWeight: 600, fontSize: 12 }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.notes || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(d)}
                          style={{ padding: '5px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 12, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(d.id)}
                          style={{ padding: '5px 10px', background: 'none', border: '1px solid #fca5a5', borderRadius: 5, fontSize: 12, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Record count */}
      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
          {filtered.length} of {deadlines.length} deadlines
        </p>
      )}

      {/* Modal */}
      {modalOpen && (
        <DeadlineModal
          deadline={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
          onSaved={fetchDeadlines}
        />
      )}
    </div>
  )
}

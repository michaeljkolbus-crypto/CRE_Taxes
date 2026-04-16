import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import { useViewPreferences } from '../../hooks/useViewPreferences'

function calcFinancials(appeal) {
  const eavPre  = parseFloat(appeal?.eav_pre)  || 0
  const eavPost = parseFloat(appeal?.eav_post) || 0
  const taxRate = parseFloat(appeal?.tax_rate_filing_year) || 0
  const retainer  = parseFloat(appeal?.retainer_amount) ?? 500
  const commPct   = parseFloat(appeal?.commission_pct)  ?? 50
  const eavReduction = Math.max(0, eavPre - eavPost)
  const totalTaxSavings  = 2 * eavReduction * (taxRate / 100)
  const commissionAmount = (commPct / 100) * Math.max(0, totalTaxSavings - retainer)
  return { eavReduction, totalTaxSavings, commissionAmount }
}

const STORAGE_BUCKET = 'appeal-documents'
const DOC_TYPES = ['Agreement', 'Hearing Notice', 'BOR Decision', 'PTAB Decision', 'Evidence', 'Correspondence', 'Other']

// ── Tab definitions ────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'Appeal',      label: 'Appeal' },
  { id: 'Financials',  label: 'Financials' },
  { id: 'LinkedComps', label: 'Linked Comps' },
  { id: 'Documents',   label: '📎 Documents' },
]
const DEFAULT_TAB_CONFIG = ALL_TABS.map(t => ({ ...t, visible: true }))

// ── LinkCompsModal ─────────────────────────────────────────────────────────
function LinkCompsModal({ appealId, linkedComps, onClose, onSaved }) {
  const [allComps, setAllComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selections, setSelections] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Seed from already-linked comps
    const init = {}
    linkedComps.forEach(ac => {
      init[ac.comp_id] = {
        linked: true,
        relevance_score: ac.relevance_score ?? '',
        is_selected: ac.is_selected ?? false,
        notes: ac.notes ?? '',
        appeal_comp_id: ac.id,
      }
    })
    setSelections(init)

    supabase
      .from('comps')
      .select('id, address, sale_date, sale_price, building_sf, county, property_type')
      .order('sale_date', { ascending: false })
      .then(({ data }) => { if (data) setAllComps(data); setLoading(false) })
  }, [])

  const toggleLink = (compId) => {
    setSelections(prev => {
      const cur = prev[compId]
      if (cur?.linked) {
        return { ...prev, [compId]: { ...cur, linked: false } }
      }
      return {
        ...prev,
        [compId]: { linked: true, relevance_score: '', is_selected: false, notes: '', appeal_comp_id: null }
      }
    })
  }

  const updateSel = (compId, field, value) => {
    setSelections(prev => ({ ...prev, [compId]: { ...prev[compId], [field]: value } }))
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    for (const [compId, sel] of Object.entries(selections)) {
      if (sel.linked) {
        const payload = {
          relevance_score: sel.relevance_score !== '' ? parseFloat(sel.relevance_score) : null,
          is_selected: sel.is_selected || false,
          notes: sel.notes || null,
        }
        if (sel.appeal_comp_id) {
          const { error: e } = await supabase.from('appeal_comps').update(payload).eq('id', sel.appeal_comp_id)
          if (e) { setError('Save failed: ' + e.message); setSaving(false); return }
        } else {
          const { error: e } = await supabase.from('appeal_comps').insert({ appeal_id: appealId, comp_id: compId, ...payload })
          if (e) { setError('Save failed: ' + e.message); setSaving(false); return }
        }
      } else if (sel.appeal_comp_id) {
        await supabase.from('appeal_comps').delete().eq('id', sel.appeal_comp_id)
      }
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const filtered = allComps.filter(c =>
    !search || c.address?.toLowerCase().includes(search.toLowerCase())
  )

  const linkedCount = Object.values(selections).filter(s => s.linked).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 820, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.22)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Link Comparable Sales</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{linkedCount} comp{linkedCount !== 1 ? 's' : ''} linked</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by address..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading comps...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No comps found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: 36, color: '#475569', fontWeight: 600 }}>Link</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Address</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Sale Date</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Sale Price</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Bldg SF</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Relevance (0–1)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Selected</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const sel = selections[c.id]
                  const isLinked = sel?.linked || false
                  return (
                    <tr key={c.id} style={{ background: isLinked ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input type="checkbox" checked={isLinked} onChange={() => toggleLink(c.id)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#1e40af' }} />
                      </td>
                      <td style={{ padding: '8px', color: '#1e293b', fontWeight: isLinked ? 600 : 400 }}>{c.address || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{c.sale_date ? new Date(c.sale_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{fmt.currency(parseFloat(c.sale_price) || 0)}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{c.building_sf ? fmt.number(parseFloat(c.building_sf)) : '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isLinked ? (
                          <input
                            type="number" min="0" max="1" step="0.01"
                            value={sel.relevance_score}
                            onChange={e => updateSel(c.id, 'relevance_score', e.target.value)}
                            placeholder="0.00"
                            style={{ width: 70, padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                          />
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isLinked ? (
                          <input type="checkbox" checked={sel.is_selected || false} onChange={e => updateSel(c.id, 'is_selected', e.target.checked)}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#1e40af' }} />
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error ? <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span> : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Links'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ViewsBar ───────────────────────────────────────────────────────────────
function ViewsBar({ views, activeViewId, onLoadView, onEditLayout }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 14px', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
      {views.length > 0 && (
        <select value={activeViewId || ''} onChange={e => { const v = views.find(v => v.id === e.target.value); if (v) onLoadView(v.id, v.config) }}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#1e293b', background: '#fff', cursor: 'pointer' }}>
          <option value="">— Default Layout —</option>
          {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      <button onClick={onEditLayout}
        style={{ padding: '5px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
        ⚙ Edit Layout
      </button>
    </div>
  )
}

// ── EditLayoutModal ────────────────────────────────────────────────────────
function EditLayoutModal({ tabConfig, views, onSave, onDelete, onClose }) {
  const [tabs, setTabs] = useState(tabConfig.map(t => ({ ...t })))
  const [newViewName, setNewViewName] = useState('')
  const [saving, setSaving] = useState(false)

  const move = (i, dir) => {
    const next = [...tabs]; const swap = i + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[i], next[swap]] = [next[swap], next[i]]; setTabs(next)
  }

  const handleSave = async () => {
    if (!newViewName.trim()) return
    setSaving(true); await onSave(newViewName.trim(), { tabs }); setSaving(false); setNewViewName('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Edit Layout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>Show/hide and reorder tabs. Save as a named view.</p>
        {tabs.map((tab, i) => (
          <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={tab.visible} onChange={e => setTabs(tabs.map((t, idx) => idx === i ? { ...t, visible: e.target.checked } : t))}
              style={{ cursor: 'pointer', accentColor: '#1e40af', width: 15, height: 15 }} />
            <span style={{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{tab.label}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px', cursor: i === 0 ? 'not-allowed' : 'pointer', fontSize: 12, color: '#475569', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === tabs.length - 1} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px', cursor: i === tabs.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: '#475569', opacity: i === tabs.length - 1 ? 0.4 : 1 }}>↓</button>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Save as Named View</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="e.g. My Appeal View"
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
            <button onClick={handleSave} disabled={saving || !newViewName.trim()}
              style={{ padding: '7px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving || !newViewName.trim() ? 'not-allowed' : 'pointer', opacity: saving || !newViewName.trim() ? 0.5 : 1 }}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
        {views.length > 0 && (
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Saved Views</p>
            {views.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#1e293b' }}>{v.name}</span>
                <button onClick={() => onDelete(v.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Date field helper ──────────────────────────────────────────────────────
function DateField({ label, value, editing, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>{label}</label>
      {editing ? (
        <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      ) : (
        <div style={{ fontSize: 14, color: '#1e293b' }}>{value ? new Date(value).toLocaleDateString() : '—'}</div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AppealDetail() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [appeal, setAppeal] = useState(null)
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [comps,   setComps]   = useState([])
  const [docs,    setDocs]    = useState([])
  const [form,    setForm]    = useState({})
  const [error,   setError]   = useState(null)

  // Documents state
  const [uploadingDoc,  setUploadingDoc]  = useState(false)
  const [docError,      setDocError]      = useState(null)
  const [docType,       setDocType]       = useState('Other')
  const [docSuccess,    setDocSuccess]    = useState(null)

  // Comps linking modal
  const [linkCompsOpen, setLinkCompsOpen] = useState(false)

  // ── Views / layout ───────────────────────────────────────────────────────
  const { views, saveView, deleteView } = useViewPreferences('appeal_detail')
  const [tabConfig, setTabConfig]       = useState(DEFAULT_TAB_CONFIG)
  const [activeViewId, setActiveViewId] = useState(null)
  const [activeTab, setActiveTab]       = useState('Appeal')
  const [showLayoutModal, setShowLayoutModal] = useState(false)

  const handleLoadView = (viewId, config) => {
    const merged = ALL_TABS.map(t => {
      const saved = config?.tabs?.find(s => s.id === t.id)
      return saved ? { ...t, visible: saved.visible } : { ...t, visible: true }
    })
    const orderedIds = config?.tabs?.map(s => s.id) || []
    const ordered = [
      ...orderedIds.map(sid => merged.find(t => t.id === sid)).filter(Boolean),
      ...merged.filter(t => !orderedIds.includes(t.id))
    ]
    setTabConfig(ordered); setActiveViewId(viewId)
    const firstVisible = ordered.find(t => t.visible)
    if (firstVisible) setActiveTab(firstVisible.id)
  }

  const handleSaveView = async (name, config) => {
    const saved = await saveView(name, config)
    if (saved) { setTabConfig(config.tabs); setActiveViewId(saved.id) }
  }

  const visibleTabs = tabConfig.filter(t => t.visible)

  useEffect(() => { fetchStages(); fetchAppeal(); fetchComps(); fetchDocs() }, [id])

  const fetchStages = async () => {
    const { data } = await supabase.from('appeal_stages').select('*').order('sort_order', { ascending: true })
    if (data) setStages(data)
  }

  const fetchAppeal = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('appeals')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type), stage:appeal_stages(id, name, color)')
      .eq('id', id).single()
    if (err) { setError('Failed to load appeal'); console.error(err) }
    else { setAppeal(data); setForm(data) }
    setLoading(false)
  }

  const fetchComps = async () => {
    const { data } = await supabase
      .from('appeal_comps')
      .select('*, comp:comps(id, address, sale_date, sale_price, building_sf)')
      .eq('appeal_id', id)
      .order('created_at', { ascending: true })
    if (data) setComps(data)
  }

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('appeal_id', id)
      .order('uploaded_at', { ascending: false })
    if (data) setDocs(data)
  }

  // ── Upload document ──────────────────────────────────────────────────────
  const uploadDoc = async (file) => {
    if (!file) return
    setUploadingDoc(true); setDocError(null); setDocSuccess(null)
    const ext  = file.name.split('.').pop()
    const path = `${id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false })

    if (storageErr) {
      setDocError('Upload failed: ' + storageErr.message)
      setUploadingDoc(false)
      return
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

    const { error: dbErr } = await supabase.from('documents').insert({
      appeal_id:     id,
      file_name:     file.name,
      storage_path:  path,
      public_url:    urlData.publicUrl,
      document_type: docType,
      uploaded_by:   user?.id,
    })

    if (dbErr) {
      setDocError('Failed to save document record: ' + dbErr.message)
    } else {
      setDocSuccess(`"${file.name}" uploaded successfully`)
      fetchDocs()
    }
    setUploadingDoc(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Delete document ──────────────────────────────────────────────────────
  const deleteDoc = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    setDocError(null)
    if (doc.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path])
    }
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (dbErr) setDocError('Failed to delete: ' + dbErr.message)
    else fetchDocs()
  }

  // ── Remove comp link ─────────────────────────────────────────────────────
  const removeComp = async (appealCompId) => {
    await supabase.from('appeal_comps').delete().eq('id', appealCompId)
    fetchComps()
  }

  const handleSave = async () => {
    setSaving(true)
    const { error: err } = await supabase.from('appeals').update({
      stage_id:                 form.stage_id || null,
      bor_filed_date:           form.bor_filed_date || null,
      bor_hearing_date:         form.bor_hearing_date || null,
      bor_result_date:          form.bor_result_date || null,
      bor_result:               form.bor_result || null,
      ptab_filed_date:          form.ptab_filed_date || null,
      ptab_hearing_date:        form.ptab_hearing_date || null,
      ptab_result_date:         form.ptab_result_date || null,
      ptab_result:              form.ptab_result || null,
      eav_pre:                  form.eav_pre || null,
      eav_post:                 form.eav_post || null,
      tax_rate_filing_year:     form.tax_rate_filing_year || null,
      retainer_amount:          form.retainer_amount || 500,
      retainer_received:        form.retainer_received || false,
      retainer_received_date:   form.retainer_received_date || null,
      commission_pct:           form.commission_pct || 50,
      commission_invoiced:      form.commission_invoiced || false,
      commission_invoiced_date: form.commission_invoiced_date || null,
      commission_collected:     form.commission_collected || false,
      commission_collected_date: form.commission_collected_date || null,
      notes:                    form.notes || null,
      updated_at:               new Date().toISOString(),
      last_modified_by:         user?.user_metadata?.full_name || user?.email || '',
    }).eq('id', id)

    if (err) { setError('Failed to save appeal'); console.error(err) }
    else { setAppeal({ ...appeal, ...form }); setEditing(false); setError(null) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appeal?')) return
    const { error: err } = await supabase.from('appeals').delete().eq('id', id)
    if (err) setError('Failed to delete appeal')
    else navigate('/appeals')
  }

  const handleToggleVerified = async () => {
    const newVal = !appeal.verified
    const { error: err } = await supabase.from('appeals').update({
      verified: newVal,
      updated_at: new Date().toISOString(),
      last_modified_by: user?.user_metadata?.full_name || user?.email || ''
    }).eq('id', id)
    if (!err) setAppeal(a => ({ ...a, verified: newVal }))
  }

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Loading...</div>
  if (!appeal)  return <div style={{ padding: 24, color: '#ef4444' }}>Appeal not found</div>

  const fin = calcFinancials(form)
  const showPTAB = form.bor_result === 'Denied' || form.bor_result === 'Partial'

  const INP = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/appeals" style={{ color: '#1e40af', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 12 }}>
          ← Appeals
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#1e293b' }}>
              Appeal — {appeal.property?.address} ({appeal.tax_year})
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to={`/properties/${appeal.property?.id}`}
                style={{ display: 'inline-block', background: '#eff6ff', border: '1px solid #1e40af', color: '#1e40af', padding: '5px 12px', borderRadius: 4, fontSize: 13, textDecoration: 'none' }}>
                {appeal.property?.address}
              </Link>
              {!editing && appeal.stage && (
                <div style={{ display: 'inline-block', background: appeal.stage.color, color: '#fff', padding: '5px 12px', borderRadius: 4, fontSize: 13, fontWeight: 500 }}>
                  {appeal.stage.name}
                </div>
              )}
              {editing && (
                <select value={form.stage_id || ''} onChange={e => f('stage_id', e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }}>
                  <option value="">Select Stage</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button onClick={handleToggleVerified}
                style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: appeal.verified ? '#dcfce7' : '#f1f5f9', color: appeal.verified ? '#16a34a' : '#94a3b8', transition: 'all 0.15s' }}>
                {appeal.verified ? '✓ Verified' : 'Unverified'}
              </button>
            </div>
            {(appeal.updated_at || appeal.last_modified_by) && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Modified {appeal.updated_at ? new Date(appeal.updated_at).toLocaleDateString() : ''}
                {appeal.last_modified_by ? ` by ${appeal.last_modified_by}` : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setForm(appeal); setEditing(false) }}
                  style={{ padding: '8px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
                  ✏️ Edit
                </button>
                <button onClick={handleDelete}
                  style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 4, marginTop: 12, fontSize: 14 }}>{error}</div>
        )}
      </div>

      {/* ── VIEWS BAR + TABS ─────────────────────────────────────────────── */}
      <ViewsBar views={views} activeViewId={activeViewId} onLoadView={handleLoadView} onEditLayout={() => setShowLayoutModal(true)} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {visibleTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1e40af' : '2px solid transparent',
              marginBottom: -2, color: activeTab === tab.id ? '#1e40af' : '#64748b',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── APPEAL TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'Appeal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Board of Review (BOR)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <DateField label="Filed Date"  value={form.bor_filed_date}   editing={editing} onChange={v => f('bor_filed_date', v)} />
              <DateField label="Hearing Date" value={form.bor_hearing_date} editing={editing} onChange={v => f('bor_hearing_date', v)} />
              <DateField label="Result Date"  value={form.bor_result_date}  editing={editing} onChange={v => f('bor_result_date', v)} />
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Result</label>
                {editing ? (
                  <select value={form.bor_result || ''} onChange={e => f('bor_result', e.target.value)} style={INP}>
                    <option value="">Select</option>
                    {['Granted','Denied','Partial','Withdrawn','Pending'].map(r => <option key={r}>{r}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 14, color: '#1e293b' }}>{form.bor_result || '—'}</div>
                )}
              </div>
            </div>
          </div>

          {showPTAB && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Property Tax Appeal Board (PTAB)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <DateField label="Filed Date"   value={form.ptab_filed_date}   editing={editing} onChange={v => f('ptab_filed_date', v)} />
                <DateField label="Hearing Date" value={form.ptab_hearing_date} editing={editing} onChange={v => f('ptab_hearing_date', v)} />
                <DateField label="Result Date"  value={form.ptab_result_date}  editing={editing} onChange={v => f('ptab_result_date', v)} />
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Result</label>
                  {editing ? (
                    <select value={form.ptab_result || ''} onChange={e => f('ptab_result', e.target.value)} style={INP}>
                      <option value="">Select</option>
                      {['Granted','Denied','Partial','Withdrawn','Settled','Pending'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 14, color: '#1e293b' }}>{form.ptab_result || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Notes</h2>
            {editing ? (
              <textarea value={form.notes || ''} onChange={e => f('notes', e.target.value)}
                style={{ width: '100%', minHeight: 120, padding: 12, border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                placeholder="Add notes about this appeal..." />
            ) : (
              <div style={{ fontSize: 14, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{form.notes || '—'}</div>
            )}
          </div>
        </div>
      )}

      {/* ── FINANCIALS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'Financials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Commission Calculator</h2>
            <div style={{ fontSize: 13, display: 'grid', gap: 8 }}>
              {[
                { label: 'EAV (Pre-Reduction)',  field: 'eav_pre',  val: fmt.currency(parseFloat(form.eav_pre) || 0) },
                { label: 'EAV (Post-Reduction)', field: 'eav_post', val: fmt.currency(parseFloat(form.eav_post) || 0) },
              ].map(({ label, field, val }) => (
                <div key={field} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                  <div style={{ color: '#64748b' }}>{label}</div>
                  {editing ? (
                    <input type="number" value={form[field] || ''} onChange={e => f(field, e.target.value)} placeholder="0"
                      style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  ) : <div style={{ color: '#1e293b' }}>{val}</div>}
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', background: '#dbeafe', padding: '8px 10px', borderRadius: 4, fontWeight: 600 }}>
                <div style={{ color: '#1e40af' }}>EAV Reduction</div>
                <div style={{ color: '#1e40af' }}>{fmt.currency(fin.eavReduction)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Tax Rate (filing year)</div>
                {editing ? (
                  <input type="number" step="0.01" value={form.tax_rate_filing_year || ''} onChange={e => f('tax_rate_filing_year', e.target.value)} placeholder="0.00"
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : <div style={{ color: '#1e293b' }}>{(parseFloat(form.tax_rate_filing_year) || 0).toFixed(2)}%</div>}
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', background: '#dcfce7', padding: '8px 10px', borderRadius: 4, fontWeight: 600 }}>
                <div style={{ color: '#166534' }}>Total Tax Savings</div>
                <div style={{ color: '#166534' }}>{fmt.currency(fin.totalTaxSavings)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Retainer Amount</div>
                {editing ? (
                  <input type="number" value={form.retainer_amount || '500'} onChange={e => f('retainer_amount', e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : <div style={{ color: '#1e293b' }}>{fmt.currency(parseFloat(form.retainer_amount) || 500)}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Commission %</div>
                {editing ? (
                  <input type="number" step="0.1" value={form.commission_pct || '50'} onChange={e => f('commission_pct', e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : <div style={{ color: '#1e293b' }}>{(parseFloat(form.commission_pct) || 50).toFixed(1)}%</div>}
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', background: '#22c55e', padding: '8px 10px', borderRadius: 4, fontWeight: 600, color: '#fff' }}>
                <div>Commission Amount</div>
                <div>{fmt.currency(fin.commissionAmount)}</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Payment Tracking</h2>
            <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
              {[
                { label: 'Retainer Received',    field: 'retainer_received',    dateField: 'retainer_received_date' },
                { label: 'Commission Invoiced',  field: 'commission_invoiced',  dateField: 'commission_invoiced_date' },
                { label: 'Commission Collected', field: 'commission_collected', dateField: 'commission_collected_date' },
              ].map(({ label, field, dateField }) => (
                <div key={field} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input type="checkbox" checked={form[field] || false} onChange={e => f(field, e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <label style={{ color: '#64748b', flex: 1 }}>{label}</label>
                      <input type="date" value={form[dateField] || ''} onChange={e => f(dateField, e.target.value)} disabled={!form[field]}
                        style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', opacity: form[field] ? 1 : 0.5 }} />
                    </>
                  ) : (
                    <>
                      <input type="checkbox" checked={form[field] || false} disabled style={{ width: 16, height: 16 }} />
                      <label style={{ color: '#64748b', flex: 1 }}>{label}</label>
                      <div style={{ color: '#1e293b' }}>
                        {form[dateField] ? new Date(form[dateField]).toLocaleDateString() : '—'}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LINKED COMPS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'LinkedComps' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Linked Comps</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{comps.length} comp{comps.length !== 1 ? 's' : ''} linked to this appeal</p>
            </div>
            <button onClick={() => setLinkCompsOpen(true)}
              style={{ padding: '7px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Link / Edit Comps
            </button>
          </div>
          {comps.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '32px 24px', background: '#f8fafc', borderRadius: 8 }}>
              No comps linked yet. Click "+ Link / Edit Comps" to add comparable sales to this appeal.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Address','Sale Date','Sale Price','Bldg SF','$/SF','Relevance','Selected',''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Address' ? 'left' : 'center', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comps.map((c, idx) => {
                  const salePrice = parseFloat(c.comp?.sale_price) || 0
                  const bldgSF    = parseFloat(c.comp?.building_sf) || 1
                  const dollarSF  = salePrice / bldgSF
                  return (
                    <tr key={c.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 10px', color: '#1e293b', fontWeight: 500 }}>{c.comp?.address || '—'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#475569' }}>{c.comp?.sale_date ? new Date(c.comp.sale_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#1e293b' }}>{fmt.currency(salePrice)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#475569' }}>{c.comp?.building_sf ? fmt.number(bldgSF) : '—'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#475569' }}>{c.comp?.building_sf ? fmt.currency(dollarSF) : '—'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {c.relevance_score != null ? (
                          <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {parseFloat(c.relevance_score).toFixed(2)}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <input type="checkbox" checked={c.is_selected || false} disabled style={{ width: 15, height: 15, accentColor: '#1e40af' }} />
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <button onClick={() => removeComp(c.id)}
                          style={{ background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'Documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Upload Document</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', minWidth: 160 }}>
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => uploadDoc(e.target.files[0])}
                  disabled={uploadingDoc}
                  style={{ display: 'block', fontSize: 13, color: '#1e293b', cursor: uploadingDoc ? 'wait' : 'pointer' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
                />
              </div>
              {uploadingDoc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e40af', fontSize: 13 }}>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span> Uploading…
                </div>
              )}
            </div>
            {docError && (
              <div style={{ marginTop: 12, background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>{docError}</div>
            )}
            {docSuccess && (
              <div style={{ marginTop: 12, background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
                ✓ {docSuccess}
                <button onClick={() => setDocSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            )}
          </div>

          {/* Documents list */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Documents</h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
            </div>
            {docs.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '32px 24px', background: '#f8fafc', borderRadius: 8 }}>
                No documents uploaded yet. Use the upload panel above to add agreements, notices, or decisions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docs.map(doc => {
                  const typeColors = {
                    'Agreement':       { bg: '#eff6ff', color: '#1e40af' },
                    'Hearing Notice':  { bg: '#fef3c7', color: '#92400e' },
                    'BOR Decision':    { bg: '#dcfce7', color: '#166534' },
                    'PTAB Decision':   { bg: '#f3e8ff', color: '#6b21a8' },
                    'Evidence':        { bg: '#e0f2fe', color: '#0c4a6e' },
                    'Correspondence':  { bg: '#fce7f3', color: '#9d174d' },
                  }
                  const tc = typeColors[doc.document_type] || { bg: '#f1f5f9', color: '#475569' }
                  const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || ''
                  return (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      {/* File icon */}
                      <div style={{ width: 36, height: 36, background: '#e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#475569', flexShrink: 0 }}>
                        {fileExt || '📄'}
                      </div>
                      {/* File info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.file_name}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: tc.bg, color: tc.color, fontWeight: 600 }}>
                            {doc.document_type || 'Other'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {doc.public_url && (
                          <a href={doc.public_url} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '6px 12px', background: '#1e40af', color: '#fff', borderRadius: 5, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                            ↓ Download
                          </a>
                        )}
                        <button onClick={() => deleteDoc(doc)}
                          style={{ padding: '6px 10px', background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showLayoutModal && (
        <EditLayoutModal tabConfig={tabConfig} views={views} onSave={handleSaveView} onDelete={deleteView} onClose={() => setShowLayoutModal(false)} />
      )}

      {linkCompsOpen && (
        <LinkCompsModal
          appealId={id}
          linkedComps={comps}
          onClose={() => setLinkCompsOpen(false)}
          onSaved={fetchComps}
        />
      )}
    </div>
  )
}

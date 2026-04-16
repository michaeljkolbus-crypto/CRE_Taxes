import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import { useViewPreferences } from '../../hooks/useViewPreferences'

// ── Shared helpers ─────────────────────────────────────────────────────────
function ReadField({ label, value, href }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {href && value
        ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ margin: 0, fontSize: 13, color: '#1e40af', textDecoration: 'none' }}>{value}</a>
        : <p style={{ margin: 0, fontSize: 13, color: value ? '#1e293b' : '#cbd5e1' }}>{value || '—'}</p>
      }
    </div>
  )
}

function SH({ title }) {
  return <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const INP = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }

// ── Tab definitions ────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'Details',            label: 'Details' },
  { id: 'LinkedContacts',     label: 'Linked Contacts' },
  { id: 'LinkedProperties',   label: 'Linked Properties' },
]
const DEFAULT_TAB_CONFIG = ALL_TABS.map(t => ({ ...t, visible: true }))

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
    setSaving(true)
    await onSave(newViewName.trim(), { tabs })
    setSaving(false); setNewViewName('')
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
            <input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="e.g. My Company View"
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

// ── Main Component ─────────────────────────────────────────────────────────
export default function CompanyDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [linkedContacts, setLinkedContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  // Contact linking
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState([])
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [linking, setLinking] = useState(false)

  // ── Views / layout ───────────────────────────────────────────────────────
  const { views, saveView, deleteView } = useViewPreferences('company_detail')
  const [tabConfig, setTabConfig]       = useState(DEFAULT_TAB_CONFIG)
  const [activeViewId, setActiveViewId] = useState(null)
  const [activeTab, setActiveTab]       = useState('Details')
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

  useEffect(() => { fetchCompany(); fetchLinkedContacts() }, [id])

  const fetchCompany = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single()
    if (error) { console.error(error); setLoading(false); return }
    setCompany(data); setForm(data); setLoading(false)
  }

  const fetchLinkedContacts = async () => {
    const { data } = await supabase.from('contacts')
      .select('id, first_name, last_name, contact_type, main_phone, email_address')
      .eq('company_id', id)
      .order('last_name', { ascending: true })
    setLinkedContacts(data || [])
  }

  const searchContacts = async (q) => {
    if (!q.trim()) { setContactResults([]); return }
    const { data } = await supabase.from('contacts')
      .select('id, first_name, last_name, contact_type')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(8)
    // Exclude already-linked contacts
    setContactResults((data || []).filter(c => !linkedContacts.find(lc => lc.id === c.id)))
  }

  const handleLinkContact = async (contact) => {
    setLinking(true)
    const { error } = await supabase.from('contacts').update({ company_id: id }).eq('id', contact.id)
    if (!error) {
      setLinkedContacts(prev => [...prev, contact].sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '')))
    }
    setContactSearch(''); setContactResults([]); setShowContactDropdown(false); setLinking(false)
  }

  const handleUnlinkContact = async (contactId) => {
    const { error } = await supabase.from('contacts').update({ company_id: null }).eq('id', contactId)
    if (!error) setLinkedContacts(prev => prev.filter(c => c.id !== contactId))
  }

  const handleSave = async () => {
    setSaving(true)
    const updateData = {
      ...form,
      updated_at: new Date().toISOString(),
      last_modified_by: user?.user_metadata?.full_name || user?.email || ''
    }
    delete updateData.created_at
    const { error } = await supabase.from('companies').update(updateData).eq('id', id)
    if (error) { console.error(error); alert('Failed to save company'); setSaving(false); return }
    setCompany(updateData); setEditing(false); setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this company?')) return
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) { alert('Failed to delete company'); return }
    navigate('/companies')
  }

  const handleToggleVerified = async () => {
    const newVal = !company.verified
    const { error } = await supabase.from('companies').update({
      verified: newVal,
      updated_at: new Date().toISOString(),
      last_modified_by: user?.user_metadata?.full_name || user?.email || ''
    }).eq('id', id)
    if (!error) setCompany(c => ({ ...c, verified: newVal }))
  }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
  if (!company) return <div style={{ padding: '24px', textAlign: 'center' }}>Company not found</div>

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Back + Header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Link to="/companies" style={{ color: '#1e40af', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Companies</Link>
        </div>

        {/* ── HERO CARD ──────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>
                {company.company_name}
              </h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {company.company_type && (
                  <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                    {company.company_type}
                  </span>
                )}
                {/* Verified toggle */}
                <button onClick={handleToggleVerified}
                  style={{ padding: '3px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: company.verified ? '#dcfce7' : '#f1f5f9',
                    color: company.verified ? '#16a34a' : '#94a3b8',
                    transition: 'all 0.15s' }}>
                  {company.verified ? '✓ Verified' : 'Unverified'}
                </button>
              </div>
              {/* Last modified */}
              {(company.updated_at || company.last_modified_by) && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Modified {company.updated_at ? new Date(company.updated_at).toLocaleDateString() : ''}
                  {company.last_modified_by ? ` by ${company.last_modified_by}` : ''}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {editing ? (
                <>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setForm(company); setEditing(false) }}
                    style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleDelete}
                    style={{ padding: '8px 14px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Delete
                  </button>
                  <button onClick={() => setEditing(true)}
                    style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    ✏️ Edit Company
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── EDIT FORM ──────────────────────────────────────────────────── */}
        {editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
              <SH title="Company Info" />
              <FieldRow label="Company Name">
                <input style={INP} value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })} />
              </FieldRow>
              <FieldRow label="Company Type">
                <input style={INP} value={form.company_type || ''} onChange={e => setForm({ ...form, company_type: e.target.value })} />
              </FieldRow>
              <FieldRow label="Email">
                <input type="email" style={INP} value={form.email_address || ''} onChange={e => setForm({ ...form, email_address: e.target.value })} />
              </FieldRow>
              <FieldRow label="Phone">
                <input style={INP} value={form.company_phone || ''} onChange={e => setForm({ ...form, company_phone: e.target.value })} />
              </FieldRow>
              <FieldRow label="Website">
                <input style={INP} value={form.company_website || ''} onChange={e => setForm({ ...form, company_website: e.target.value })} />
              </FieldRow>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
              <SH title="Address &amp; Notes" />
              <FieldRow label="Street Address">
                <input style={INP} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
              </FieldRow>
              <FieldRow label="Unit/Suite">
                <input style={INP} value={form.unit_suite || ''} onChange={e => setForm({ ...form, unit_suite: e.target.value })} />
              </FieldRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <FieldRow label="City"><input style={INP} value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></FieldRow>
                <FieldRow label="State"><input style={INP} value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></FieldRow>
              </div>
              <FieldRow label="Zip">
                <input style={INP} value={form.zipcode || ''} onChange={e => setForm({ ...form, zipcode: e.target.value })} />
              </FieldRow>
              <FieldRow label="Notes">
                <textarea style={{ ...INP, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </FieldRow>
            </div>
          </div>
        )}

        {/* ── TABBED CONTENT (view mode) ─────────────────────────────────── */}
        {!editing && (
          <div>
            <ViewsBar views={views} activeViewId={activeViewId} onLoadView={handleLoadView} onEditLayout={() => setShowLayoutModal(true)} />
            {/* Tab strip */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1e40af' : '2px solid transparent',
                    marginBottom: -2, color: activeTab === tab.id ? '#1e40af' : '#64748b',
                    fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Details tab */}
            {activeTab === 'Details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
                  <SH title="Company Info" />
                  <ReadField label="Company Name" value={company.company_name} />
                  <ReadField label="Company Type" value={company.company_type} />
                  <ReadField label="Email"        value={company.email_address} href={company.email_address ? `mailto:${company.email_address}` : null} />
                  <ReadField label="Phone"        value={company.company_phone} />
                  <ReadField label="Website"      value={company.company_website} href={company.company_website || null} />
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
                  <SH title="Address &amp; Notes" />
                  <ReadField label="Street Address" value={company.address} />
                  <ReadField label="Unit/Suite"     value={company.unit_suite} />
                  <ReadField label="City"           value={company.city} />
                  <ReadField label="State"          value={company.state} />
                  <ReadField label="Zip"            value={company.zipcode} />
                  <div style={{ padding: '8px 0' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</p>
                    <p style={{ margin: 0, fontSize: 13, color: company.notes ? '#1e293b' : '#cbd5e1', whiteSpace: 'pre-wrap' }}>{company.notes || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Linked Contacts tab */}
            {activeTab === 'LinkedContacts' && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <SH title={`Linked Contacts (${linkedContacts.length})`} />
                </div>

                {/* ── Typeahead to link a new contact ── */}
                <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
                  <input type="text" value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); searchContacts(e.target.value); setShowContactDropdown(true) }}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 150)}
                    placeholder="Search contacts to link…"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  {showContactDropdown && contactResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
                      {contactResults.map(c => (
                        <div key={c.id}
                          onMouseDown={() => handleLinkContact(c)}
                          style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                          <span>{c.first_name} {c.last_name}</span>
                          {c.contact_type && <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 12, fontWeight: 600 }}>{c.contact_type}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Linked contacts list ── */}
                {linkedContacts.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No contacts linked to this company yet. Search above to link one.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linkedContacts.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        {/* Avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase() || '?'}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span onClick={() => navigate(`/contacts/${c.id}`)}
                              style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#1e40af'}
                              onMouseLeave={e => e.currentTarget.style.color = '#1e293b'}>
                              {c.first_name} {c.last_name}
                            </span>
                            {c.contact_type && (
                              <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '1px 8px', borderRadius: 12, fontWeight: 600, flexShrink: 0 }}>{c.contact_type}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {c.main_phone && <span>{c.main_phone}</span>}
                            {c.email_address && <span>{c.email_address}</span>}
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => navigate(`/contacts/${c.id}`)}
                            style={{ padding: '4px 10px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            View →
                          </button>
                          <button onClick={() => handleUnlinkContact(c.id)}
                            style={{ padding: '4px 8px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                            title="Unlink contact">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Linked Properties tab */}
            {activeTab === 'LinkedProperties' && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
                <SH title="Linked Properties" />
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>Property linking — coming in next phase</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Layout Modal ───────────────────────────────────────────── */}
      {showLayoutModal && (
        <EditLayoutModal
          tabConfig={tabConfig}
          views={views}
          onSave={handleSaveView}
          onDelete={deleteView}
          onClose={() => setShowLayoutModal(false)}
        />
      )}
    </div>
  )
}

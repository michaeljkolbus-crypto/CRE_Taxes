import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PhotoGallery } from '../../components/shared/PhotoGallery'
import { useViewPreferences } from '../../hooks/useViewPreferences'

// ── Shared helpers ─────────────────────────────────────────────────────────
function ReadField({ label, value, href }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {href && value
        ? <a href={href} style={{ margin: 0, fontSize: 13, color: '#1e40af', textDecoration: 'none' }}>{value}</a>
        : <p style={{ margin: 0, fontSize: 13, color: value ? '#1e293b' : '#cbd5e1' }}>{value || '—'}</p>
      }
    </div>
  )
}

function EditField({ label, value, type = 'text', onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </label>
      {type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}>
          <option value="">—</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 80 }} />
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  )
}

function SH({ title }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
  )
}

// ── Tab definitions ────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'Details',            label: 'Details' },
  { id: 'LinkedProperties',   label: 'Linked Properties' },
]
const DEFAULT_TAB_CONFIG = ALL_TABS.map(t => ({ ...t, visible: true }))

// ── ViewsBar ───────────────────────────────────────────────────────────────
function ViewsBar({ views, activeViewId, onLoadView, onEditLayout }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 14px', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
      {views.length > 0 && (
        <select
          value={activeViewId || ''}
          onChange={e => {
            const v = views.find(v => v.id === e.target.value)
            if (v) onLoadView(v.id, v.config)
          }}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#1e293b', background: '#fff', cursor: 'pointer' }}
        >
          <option value="">— Default Layout —</option>
          {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      <button onClick={onEditLayout}
        style={{ padding: '5px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
        ⚙ Edit Layout
      </button>
      {activeViewId && (
        <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          {views.find(v => v.id === activeViewId)?.name}
        </span>
      )}
    </div>
  )
}

// ── EditLayoutModal ────────────────────────────────────────────────────────
function EditLayoutModal({ tabConfig, views, onSave, onDelete, onClose }) {
  const [tabs, setTabs] = useState(tabConfig.map(t => ({ ...t })))
  const [newViewName, setNewViewName] = useState('')
  const [saving, setSaving] = useState(false)

  const move = (i, dir) => {
    const next = [...tabs]
    const swap = i + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[i], next[swap]] = [next[swap], next[i]]
    setTabs(next)
  }

  const handleSave = async () => {
    if (!newViewName.trim()) return
    setSaving(true)
    await onSave(newViewName.trim(), { tabs })
    setSaving(false)
    setNewViewName('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Edit Layout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
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
            <input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="e.g. My Contact View"
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
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

const CONTACT_TYPE_OPTIONS = ['Owner', 'Property Manager', 'Attorney', 'Appraiser', 'Accountant', 'Advisor', 'Other']

// ── Main Component ─────────────────────────────────────────────────────────
export default function ContactDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [linkedCompany, setLinkedCompany] = useState(null)
  const [linkedProperties, setLinkedProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  // Company typeahead
  const [companySearch, setCompanySearch] = useState('')
  const [companyResults, setCompanyResults] = useState([])
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)

  // ── Views / layout ───────────────────────────────────────────────────────
  const { views, saveView, deleteView } = useViewPreferences('contact_detail')
  const [tabConfig, setTabConfig]     = useState(DEFAULT_TAB_CONFIG)
  const [activeViewId, setActiveViewId] = useState(null)
  const [activeTab, setActiveTab]     = useState('Details')
  const [showLayoutModal, setShowLayoutModal] = useState(false)

  const handleLoadView = (viewId, config) => {
    const merged = ALL_TABS.map(t => {
      const saved = config?.tabs?.find(s => s.id === t.id)
      return saved ? { ...t, visible: saved.visible } : { ...t, visible: true }
    })
    // Reorder by saved order
    const orderedIds = config?.tabs?.map(s => s.id) || []
    const ordered = [
      ...orderedIds.map(sid => merged.find(t => t.id === sid)).filter(Boolean),
      ...merged.filter(t => !orderedIds.includes(t.id))
    ]
    setTabConfig(ordered)
    setActiveViewId(viewId)
    // Switch to first visible tab
    const firstVisible = ordered.find(t => t.visible)
    if (firstVisible) setActiveTab(firstVisible.id)
  }

  const handleSaveView = async (name, config) => {
    const saved = await saveView(name, config)
    if (saved) {
      setTabConfig(config.tabs)
      setActiveViewId(saved.id)
    }
  }

  const visibleTabs = tabConfig.filter(t => t.visible)

  useEffect(() => { fetchContact() }, [id])

  const searchCompanies = async (q) => {
    if (!q.trim()) { setCompanyResults([]); return }
    const { data } = await supabase.from('companies')
      .select('id, company_name, address, unit_suite, city, state, zipcode')
      .ilike('company_name', `%${q}%`).limit(8)
    setCompanyResults(data || [])
  }

  const fetchContact = async () => {
    setLoading(true)
    const { data: contactData, error } = await supabase
      .from('contacts')
      .select('*, company:companies(id, company_name, address, unit_suite, city, state, zipcode)')
      .eq('id', id).single()
    if (error) { console.error(error); setLoading(false); return }
    setLinkedCompany(contactData.company || null)
    setContact(contactData)
    setForm(contactData)

    const { data: propsData } = await supabase
      .from('property_contacts')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type, property_name, total_building_sqft, total_units)')
      .eq('contact_id', id)
    setLinkedProperties(propsData || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const updateData = { ...form }
    delete updateData.full_name
    delete updateData.created_at
    delete updateData.company   // strip joined relation before upsert
    updateData.updated_at = new Date().toISOString()
    updateData.last_modified_by = user?.user_metadata?.full_name || user?.email || ''

    const { error } = await supabase.from('contacts').update(updateData).eq('id', id)
    if (error) { console.error(error); alert('Failed to save contact'); setSaving(false); return }
    setContact({ ...contact, ...updateData })
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) { setDeleteError('Failed to delete: ' + error.message); return }
    navigate('/contacts')
  }

  const handleToggleVerified = async () => {
    const newVal = !contact.verified
    const { error } = await supabase.from('contacts').update({
      verified: newVal,
      updated_at: new Date().toISOString(),
      last_modified_by: user?.user_metadata?.full_name || user?.email || ''
    }).eq('id', id)
    if (!error) setContact(c => ({ ...c, verified: newVal }))
  }

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const initials = contact
    ? ((contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')).toUpperCase() || '?'
    : '?'

  const useCompanyAddr = !!contact?.use_company_address && !!linkedCompany
  const addrSrc = useCompanyAddr ? linkedCompany : contact
  const fullAddress = [addrSrc?.address, addrSrc?.unit_suite, addrSrc?.city, addrSrc?.state, addrSrc?.zipcode]
    .filter(Boolean).join(', ')

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
  if (!contact) return <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>Contact not found</div>

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Back ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Link to="/contacts" style={{ color: '#1e40af', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Contacts</Link>
        </div>

        {/* ── HERO CARD ──────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 28 }}>
            <div style={{ flexShrink: 0 }}>
              <PhotoGallery recordType="contact" recordId={id} mode="compact" initials={initials}
                onMainPhotoChange={url => setContact(c => ({ ...c, photo_url: url }))} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                      {contact.first_name} {contact.last_name}
                    </h1>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {contact.contact_type && (
                        <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                          {contact.contact_type}
                        </span>
                      )}
                      {linkedCompany && (
                        <span onClick={() => navigate(`/companies/${linkedCompany.id}`)}
                          style={{ background: '#f0f9ff', color: '#0369a1', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #bae6fd' }}>
                          🏢 {linkedCompany.company_name}
                        </span>
                      )}
                      {/* Verified toggle */}
                      <button onClick={handleToggleVerified}
                        style={{ padding: '3px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          background: contact.verified ? '#dcfce7' : '#f1f5f9',
                          color: contact.verified ? '#16a34a' : '#94a3b8',
                          transition: 'all 0.15s' }}>
                        {contact.verified ? '✓ Verified' : 'Unverified'}
                      </button>
                    </div>
                    {/* Last modified */}
                    {(contact.updated_at || contact.last_modified_by) && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
                        Modified {contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : ''}
                        {contact.last_modified_by ? ` by ${contact.last_modified_by}` : ''}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {editing ? (
                      <>
                        <button onClick={handleSave} disabled={saving}
                          style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setForm(contact); setEditing(false) }}
                          style={{ padding: '7px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleDelete}
                          style={{ padding: '7px 14px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Delete
                        </button>
                        <button onClick={() => setEditing(true)}
                          style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          ✏️ Edit Contact
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {deleteError && (
                  <div style={{ fontSize: 12, color: '#dc2626', padding: '6px 10px', background: '#fee2e2', borderRadius: 6, marginBottom: 8 }}>{deleteError}</div>
                )}

                {!editing && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 24px', marginTop: 12 }}>
                    <ReadField label="Email" value={contact.email_address} href={contact.email_address ? `mailto:${contact.email_address}` : null} />
                    <ReadField label="Main Phone" value={contact.main_phone} href={contact.main_phone ? `tel:${contact.main_phone}` : null} />
                    <ReadField label="Cell Phone" value={contact.cell_phone} href={contact.cell_phone ? `tel:${contact.cell_phone}` : null} />
                    <ReadField label={useCompanyAddr ? 'Address (from Company)' : 'Address'} value={fullAddress || null} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── EDIT FORM ──────────────────────────────────────────────────── */}
        {editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
              <SH title="Contact Info" />
              <EditField label="First Name"   value={form.first_name}    onChange={v => f('first_name', v)} />
              <EditField label="Last Name"    value={form.last_name}     onChange={v => f('last_name', v)} />
              <EditField label="Contact Type" value={form.contact_type}  type="select" options={CONTACT_TYPE_OPTIONS} onChange={v => f('contact_type', v)} />
              <EditField label="Email"        value={form.email_address} type="email" onChange={v => f('email_address', v)} />
              <EditField label="Main Phone"   value={form.main_phone}    onChange={v => f('main_phone', v)} />
              <EditField label="Cell Phone"   value={form.cell_phone}    onChange={v => f('cell_phone', v)} />
              {/* ── Company picker ── */}
              <div style={{ marginBottom: 12, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Company</label>
                {linkedCompany && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, flex: 1 }}>🏢 {linkedCompany.company_name}</span>
                    <button onClick={() => { f('company_id', null); setLinkedCompany(null); setCompanySearch('') }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </div>
                )}
                <input type="text" value={companySearch}
                  onChange={e => { setCompanySearch(e.target.value); searchCompanies(e.target.value); setShowCompanyDropdown(true) }}
                  onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 150)}
                  placeholder={linkedCompany ? 'Change company…' : 'Search to link a company…'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                {showCompanyDropdown && companyResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 200, overflowY: 'auto' }}>
                    {companyResults.map(c => (
                      <div key={c.id}
                        onMouseDown={() => { f('company_id', c.id); setLinkedCompany(c); setCompanySearch(''); setShowCompanyDropdown(false) }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        {c.company_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
              <SH title="Address &amp; Notes" />
              {/* ── Use Company Address toggle ── */}
              {linkedCompany && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd', marginBottom: 12 }}>
                  <input type="checkbox" id="useCompanyAddr" checked={!!form.use_company_address}
                    onChange={e => f('use_company_address', e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#1e40af', width: 15, height: 15 }} />
                  <label htmlFor="useCompanyAddr" style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, cursor: 'pointer' }}>
                    Use Company Address
                  </label>
                </div>
              )}
              <div style={{ opacity: form.use_company_address ? 0.45 : 1, pointerEvents: form.use_company_address ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
                <EditField label="Street Address" value={form.address}    onChange={v => f('address', v)} />
                <EditField label="Unit / Suite"   value={form.unit_suite} onChange={v => f('unit_suite', v)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <EditField label="City"  value={form.city}  onChange={v => f('city', v)} />
                  <EditField label="State" value={form.state} onChange={v => f('state', v)} />
                </div>
                <EditField label="Zip"   value={form.zipcode} onChange={v => f('zipcode', v)} />
              </div>
              <EditField label="Notes" value={form.notes}   type="textarea" onChange={v => f('notes', v)} />
            </div>
          </div>
        )}

        {/* ── TABBED CONTENT (view mode) ─────────────────────────────────── */}
        {!editing && (
          <div>
            {/* Views bar */}
            <ViewsBar views={views} activeViewId={activeViewId} onLoadView={handleLoadView} onEditLayout={() => setShowLayoutModal(true)} />

            {/* Tab strip */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1e40af' : '2px solid transparent',
                    marginBottom: -2, color: activeTab === tab.id ? '#1e40af' : '#64748b', fontWeight: activeTab === tab.id ? 700 : 500,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'Details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
                  <SH title="Contact Details" />
                  <ReadField label="First Name"   value={contact.first_name} />
                  <ReadField label="Last Name"    value={contact.last_name} />
                  <ReadField label="Contact Type" value={contact.contact_type} />
                  {linkedCompany && (
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company</p>
                      <span onClick={() => navigate(`/companies/${linkedCompany.id}`)}
                        style={{ fontSize: 13, color: '#1e40af', cursor: 'pointer', fontWeight: 600 }}>
                        🏢 {linkedCompany.company_name}
                      </span>
                    </div>
                  )}
                  <ReadField label="Email"        value={contact.email_address} href={contact.email_address ? `mailto:${contact.email_address}` : null} />
                  <ReadField label="Main Phone"   value={contact.main_phone} href={contact.main_phone ? `tel:${contact.main_phone}` : null} />
                  <ReadField label="Cell Phone"   value={contact.cell_phone} href={contact.cell_phone ? `tel:${contact.cell_phone}` : null} />
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
                  <SH title={useCompanyAddr ? 'Address & Notes (from Company)' : 'Address & Notes'} />
                  {useCompanyAddr && (
                    <div style={{ display: 'flex', align: 'center', gap: 6, padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, marginBottom: 10, fontSize: 12, color: '#0369a1', fontWeight: 600 }}>
                      🏢 Showing address from {linkedCompany.company_name}
                    </div>
                  )}
                  <ReadField label="Street Address" value={addrSrc?.address} />
                  <ReadField label="Unit / Suite"   value={addrSrc?.unit_suite} />
                  <ReadField label="City"           value={addrSrc?.city} />
                  <ReadField label="State"          value={addrSrc?.state} />
                  <ReadField label="Zip"            value={addrSrc?.zipcode} />
                  <div style={{ padding: '8px 0' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</p>
                    <p style={{ margin: 0, fontSize: 13, color: contact.notes ? '#1e293b' : '#cbd5e1', whiteSpace: 'pre-wrap' }}>{contact.notes || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'LinkedProperties' && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <SH title={`Linked Properties (${linkedProperties.length})`} />
                </div>
                {linkedProperties.length === 0 ? (
                  <p style={{ margin: 0, padding: '16px 20px', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No properties linked to this contact yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          {['Property', 'County', 'Parcel ID', 'Type', 'SF', 'Units', 'Role', ''].map(h => (
                            <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Property' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {linkedProperties.map((pc, idx) => {
                          const p = pc.property
                          const propLabel = p?.property_name || p?.address || '—'
                          const propSub = p?.property_name && p?.address ? p.address : null
                          return (
                            <tr key={pc.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{propLabel}</div>
                                {propSub && <div style={{ fontSize: 11, color: '#64748b' }}>{propSub}</div>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>{p?.county || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>{p?.parcel_id || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {p?.property_type && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{p.property_type}</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>
                                {p?.total_building_sqft ? p.total_building_sqft.toLocaleString() + ' SF' : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>{p?.total_units || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{pc.role || '—'}</span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <Link to={`/properties/${p?.id}`} style={{ color: '#1e40af', textDecoration: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>View →</Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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

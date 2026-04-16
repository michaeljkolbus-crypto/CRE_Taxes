import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PhotoGallery } from '../../components/shared/PhotoGallery'

// ── Read-only field ────────────────────────────────────────────────────────
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

// ── Editable field ─────────────────────────────────────────────────────────
function EditField({ label, value, type = 'text', onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </label>
      {type === 'select' ? (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
        >
          <option value="">—</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 80 }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
        />
      )}
    </div>
  )
}

// ── Collapsible section ────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid #e2e8f0' : 'none' }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        <span style={{ fontSize: 16, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', lineHeight: 1 }}>⌄</span>
      </button>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  )
}

// ── CONTACT TYPE OPTIONS ───────────────────────────────────────────────────
const CONTACT_TYPE_OPTIONS = ['Owner', 'Property Manager', 'Attorney', 'Appraiser', 'Accountant', 'Advisor', 'Other']

// ── Main Component ─────────────────────────────────────────────────────────
export default function ContactDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [linkedProperties, setLinkedProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => { fetchContact() }, [id])

  const fetchContact = async () => {
    setLoading(true)
    const { data: contactData, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

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
    delete updateData.updated_at

    const { error } = await supabase.from('contacts').update(updateData).eq('id', id)

    if (error) {
      console.error(error)
      alert('Failed to save contact')
      setSaving(false)
      return
    }

    setContact({ ...contact, ...updateData })
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) {
      setDeleteError('Failed to delete: ' + error.message)
      return
    }
    navigate('/contacts')
  }

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const initials = contact
    ? ((contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')).toUpperCase() || '?'
    : '?'

  const fullAddress = [contact?.address, contact?.unit_suite, contact?.city, contact?.state, contact?.zipcode]
    .filter(Boolean).join(', ')

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
  if (!contact) return <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>Contact not found</div>

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Back + Title Bar ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Link to="/contacts" style={{ color: '#1e40af', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Contacts</Link>
        </div>

        {/* ── HERO CARD ───────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 28 }}>

            {/* LEFT: Photo Gallery (compact) */}
            <div style={{ flexShrink: 0 }}>
              <PhotoGallery
                recordType="contact"
                recordId={id}
                mode="compact"
                initials={initials}
                onMainPhotoChange={url => setContact(c => ({ ...c, photo_url: url }))}
              />
            </div>

            {/* RIGHT: Name, type badge, contact info, action buttons */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Name + type badge + action buttons */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                      {contact.first_name} {contact.last_name}
                    </h1>
                    {contact.contact_type && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                        {contact.contact_type}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {editing ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setForm(contact); setEditing(false) }}
                          style={{ padding: '7px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleDelete}
                          style={{ padding: '7px 14px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setEditing(true)}
                          style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✏️ Edit Contact
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {deleteError && (
                  <div style={{ fontSize: 12, color: '#dc2626', padding: '6px 10px', background: '#fee2e2', borderRadius: 6, marginBottom: 8 }}>{deleteError}</div>
                )}

                {/* Quick contact info (view mode only) */}
                {!editing && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 24px', marginTop: 12 }}>
                    <ReadField label="Email" value={contact.email_address} href={contact.email_address ? `mailto:${contact.email_address}` : null} />
                    <ReadField label="Main Phone" value={contact.main_phone} href={contact.main_phone ? `tel:${contact.main_phone}` : null} />
                    <ReadField label="Cell Phone" value={contact.cell_phone} href={contact.cell_phone ? `tel:${contact.cell_phone}` : null} />
                    <ReadField label="Address" value={fullAddress || null} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── EDIT FORM (shown when editing) ─────────────────────────────── */}
        {editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Contact Info */}
            <Section title="Contact Info">
              <EditField label="First Name"    value={form.first_name}    onChange={v => f('first_name', v)} />
              <EditField label="Last Name"     value={form.last_name}     onChange={v => f('last_name', v)} />
              <EditField label="Contact Type"  value={form.contact_type}  type="select" options={CONTACT_TYPE_OPTIONS} onChange={v => f('contact_type', v)} />
              <EditField label="Email"         value={form.email_address} type="email" onChange={v => f('email_address', v)} />
              <EditField label="Main Phone"    value={form.main_phone}    onChange={v => f('main_phone', v)} />
              <EditField label="Cell Phone"    value={form.cell_phone}    onChange={v => f('cell_phone', v)} />
            </Section>

            {/* Address & Notes */}
            <Section title="Address &amp; Notes">
              <EditField label="Street Address" value={form.address}    onChange={v => f('address', v)} />
              <EditField label="Unit / Suite"   value={form.unit_suite} onChange={v => f('unit_suite', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <EditField label="City"  value={form.city}  onChange={v => f('city', v)} />
                <EditField label="State" value={form.state} onChange={v => f('state', v)} />
              </div>
              <EditField label="Zip" value={form.zipcode} onChange={v => f('zipcode', v)} />
              <EditField label="Notes" value={form.notes} type="textarea" onChange={v => f('notes', v)} />
            </Section>
          </div>
        )}

        {/* ── DETAILS SECTIONS (view mode) ──────────────────────────────── */}
        {!editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Section title="Contact Details">
              <ReadField label="First Name"    value={contact.first_name} />
              <ReadField label="Last Name"     value={contact.last_name} />
              <ReadField label="Contact Type"  value={contact.contact_type} />
              <ReadField label="Email"         value={contact.email_address} href={contact.email_address ? `mailto:${contact.email_address}` : null} />
              <ReadField label="Main Phone"    value={contact.main_phone} href={contact.main_phone ? `tel:${contact.main_phone}` : null} />
              <ReadField label="Cell Phone"    value={contact.cell_phone} href={contact.cell_phone ? `tel:${contact.cell_phone}` : null} />
            </Section>

            <Section title="Address &amp; Notes">
              <ReadField label="Street Address" value={contact.address} />
              <ReadField label="Unit / Suite"   value={contact.unit_suite} />
              <ReadField label="City"           value={contact.city} />
              <ReadField label="State"          value={contact.state} />
              <ReadField label="Zip"            value={contact.zipcode} />
              <ReadField label="Notes"          value={contact.notes} />
            </Section>
          </div>
        )}

        {/* ── LINKED PROPERTIES ──────────────────────────────────────────── */}
        <Section title={`Linked Properties (${linkedProperties.length})`} defaultOpen={true}>
          {linkedProperties.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No properties linked to this contact yet.</p>
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
                          {p?.property_type && (
                            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{p.property_type}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>
                          {p?.total_building_sqft ? p.total_building_sqft.toLocaleString() + ' SF' : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#475569' }}>
                          {p?.total_units || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{pc.role || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Link
                            to={`/properties/${p?.id}`}
                            style={{ color: '#1e40af', textDecoration: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}

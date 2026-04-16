import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import { PhotoGallery } from '../../components/shared/PhotoGallery'

// ── Field edit row ──────────────────────────────────────────────────────────
function FieldRow({ label, value, editing, type = 'text', onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      {editing ? (
        type === 'select' ? (
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          >
            <option value="">—</option>
            {options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={4}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          />
        ) : type === 'boolean' ? (
          <select
            value={value == null ? '' : value ? 'yes' : 'no'}
            onChange={e => onChange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          />
        )
      ) : (
        <span style={{ fontSize: 14, color: (value != null && value !== '') ? '#1e293b' : '#94a3b8' }}>
          {type === 'boolean'
            ? (value == null ? '—' : value ? 'Yes' : 'No')
            : (value != null && value !== '' ? String(value) : '—')}
        </span>
      )}
    </div>
  )
}

// ── Calculated (read-only) row ──────────────────────────────────────────────
function CalcRow({ label, value, format }) {
  let display = '—'
  if (value != null && !isNaN(value)) {
    display = format ? format(value) : (Number.isInteger(value) ? value.toLocaleString() : (Math.round(value * 100) / 100).toLocaleString())
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 9, background: '#dcfce7', color: '#16a34a', padding: '1px 5px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.03em' }}>AUTO</span>
      </div>
      <span style={{ fontSize: 14, color: display !== '—' ? '#1e293b' : '#94a3b8' }}>{display}</span>
    </div>
  )
}

// ── Linked Contacts Panel ───────────────────────────────────────────────────
function PropertyContactsPanel({ propertyId, isAdmin }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [availableContacts, setAvailableContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => { fetchLinkedContacts() }, [propertyId])

  const fetchLinkedContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('property_contacts')
        .select('*, contact:contacts(id, first_name, last_name, main_phone, email_address)')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally { setLoading(false) }
  }

  const fetchAvailableContacts = async () => {
    try {
      const { data, error } = await supabase.from('contacts').select('id, first_name, last_name').order('first_name', { ascending: true })
      if (error) throw error
      setAvailableContacts(data || [])
    } catch (err) { console.error(err) }
  }

  const handleLinkContact = async () => {
    if (!selectedContactId || !selectedRole) return
    try {
      const { error } = await supabase.from('property_contacts').insert([{
        property_id: propertyId, contact_id: selectedContactId, role: selectedRole, is_primary: false
      }])
      if (error) throw error
      setSelectedContactId(''); setSelectedRole(''); setShowLinkModal(false)
      await fetchLinkedContacts()
    } catch (err) { alert('Error linking contact: ' + err.message) }
  }

  const handleRemoveContact = async (propertyContactId) => {
    if (!window.confirm('Remove this contact link?')) return
    try {
      const { error } = await supabase.from('property_contacts').delete().eq('id', propertyContactId)
      if (error) throw error
      await fetchLinkedContacts()
    } catch (err) { alert('Error removing contact: ' + err.message) }
  }

  const handleSetPrimary = async (propertyContactId) => {
    try {
      await supabase.from('property_contacts').update({ is_primary: false }).eq('property_id', propertyId)
      const { error } = await supabase.from('property_contacts').update({ is_primary: true }).eq('id', propertyContactId)
      if (error) throw error
      await fetchLinkedContacts()
    } catch (err) { alert('Error setting primary: ' + err.message) }
  }

  return (
    <div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#64748b' }}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: '16px' }}>No contacts linked yet.</div>
      ) : (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contacts.map(pc => (
            <div key={pc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#1e40af', fontWeight: 600, fontSize: 14 }}>{pc.contact?.first_name} {pc.contact?.last_name}</span>
                  {pc.is_primary && <span style={{ color: '#fbbf24', fontSize: 14 }}>★ Primary</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{pc.role}</span>
                  {pc.contact?.main_phone && <span style={{ fontSize: 12, color: '#64748b' }}>{pc.contact.main_phone}</span>}
                </div>
                {pc.contact?.email_address && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{pc.contact.email_address}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: 8 }}>
                {!pc.is_primary && (
                  <button onClick={() => handleSetPrimary(pc.id)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 6 }} title="Set as primary">★ Set Primary</button>
                )}
                <button onClick={() => handleRemoveContact(pc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, fontWeight: 600, padding: '4px 6px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => { fetchAvailableContacts(); setShowLinkModal(true) }}
        style={{ padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        + Link Contact
      </button>
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0' }}>Link Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Contact</label>
                <select value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="">Select a contact...</option>
                  {availableContacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="">Select a role...</option>
                  <option value="Owner">Owner</option>
                  <option value="Property Manager">Property Manager</option>
                  <option value="Tenant">Tenant</option>
                  <option value="Advisor">Advisor</option>
                  <option value="Appraiser">Appraiser</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLinkModal(false)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLinkContact} style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Appeals Panel ───────────────────────────────────────────────────────────
function AppealsPanel({ propertyId }) {
  const navigate = useNavigate()
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [appealError, setAppealError] = useState(null)

  useEffect(() => { fetchAppeals() }, [propertyId])

  const fetchAppeals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('appeals')
        .select('*, stage:appeal_stages(name, color)')
        .eq('property_id', propertyId)
        .order('tax_year', { ascending: false })
      if (error) throw error
      setAppeals(data || [])
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  const handleNewAppeal = async () => {
    try {
      const { data, error } = await supabase
        .from('appeals')
        .insert([{ property_id: propertyId, tax_year: new Date().getFullYear() }])
        .select()
      if (error) throw error
      navigate(`/appeals/${data[0].id}`)
    } catch (err) {
      setAppealError('Error creating appeal: ' + err.message)
    }
  }

  return (
    <div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#64748b' }}>Loading...</div>
      ) : appeals.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: '16px' }}>No appeals yet.</div>
      ) : (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {appeals.map(appeal => (
            <div key={appeal.id} onClick={() => navigate(`/appeals/${appeal.id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Tax Year {appeal.tax_year}</span>
                {appeal.stage && (
                  <span style={{ display: 'inline-block', marginLeft: '10px', background: appeal.stage.color || '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{appeal.stage.name}</span>
                )}
                {appeal.bor_result && <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>BOR: {appeal.bor_result}</div>}
              </div>
              <span style={{ color: '#94a3b8', fontSize: 16 }}>→</span>
            </div>
          ))}
        </div>
      )}
      {appealError && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: '12px', padding: '8px 10px', background: '#fee2e2', borderRadius: 6 }}>{appealError}</div>
      )}
      <button onClick={handleNewAppeal} style={{ padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        + New Appeal
      </button>
    </div>
  )
}

// ── Stat Cell ───────────────────────────────────────────────────────────────
function StatCell({ label, value, color }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ padding: '6px 16px 6px 0' }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: color || '#1e293b' }}>{value}</p>
    </div>
  )
}

// ── Inline header edit field ─────────────────────────────────────────────────
function HeaderField({ label, value, editing, onChange, type = 'text', options, inputStyle = {} }) {
  const baseInput = { padding: '5px 8px', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 13, background: '#eff6ff', ...inputStyle }
  if (!editing) return null
  if (type === 'select') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <select value={value || ''} onChange={e => onChange(e.target.value)} style={baseInput}>
          <option value="">—</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={baseInput} />
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [primaryContact, setPrimaryContact] = useState(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => { fetchProperty() }, [id])

  const fetchProperty = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()
      if (error) throw error
      setProperty(data)
      setForm(data)
      // Prefer the primary contact; fall back to the first linked contact
      const { data: allPc } = await supabase
        .from('property_contacts')
        .select('*, contact:contacts(id, first_name, last_name, email_address, main_phone, company_id, company:companies(id, company_name))')
        .eq('property_id', id)
        .order('is_primary', { ascending: false })
      const best = allPc?.[0]
      setPrimaryContact(best?.contact || null)
    } catch (err) {
      console.error('Error fetching property:', err)
      navigate('/properties')
    } finally { setLoading(false) }
  }

  // ── Calculated values (derived live from form) ──────────────────────────
  const calcTotalUnits = (form.num_residential_units || 0) + (form.num_commercial_units || 0)
  const calcSalePricePerSqft = form.total_building_sqft > 0 && form.sales_price
    ? form.sales_price / form.total_building_sqft : null
  const calcSalePricePerUnit = calcTotalUnits > 0 && form.sales_price
    ? form.sales_price / calcTotalUnits : null
  const calcVacancyPct = form.total_building_sqft > 0 && form.vacant_sqft != null
    ? (form.vacant_sqft / form.total_building_sqft) * 100 : null
  const calcBldgAssessmentPerSqft = form.total_building_sqft > 0 && form.bldg_assessment
    ? form.bldg_assessment / form.total_building_sqft : null
  const calcTotalLandSqft = form.total_land_acres ? form.total_land_acres * 43560 : null
  const calcLandToBldgRatio = form.total_building_sqft > 0 && calcTotalLandSqft
    ? calcTotalLandSqft / form.total_building_sqft : null
  const rawBathsPerUnit = (form.num_full_baths || 0) + (form.num_half_baths || 0)
  const calcBathsPerUnit = rawBathsPerUnit > 0 ? rawBathsPerUnit / 2 : null
  const calcLivingAreaPerUnit = (form.num_residential_units || 0) > 0 && form.total_living_area_sqft
    ? form.total_living_area_sqft / form.num_residential_units : null
  const calcBasementPerUnit = (form.num_residential_units || 0) > 0 && form.basement_sqft
    ? form.basement_sqft / form.num_residential_units : null
  const calcFinishedBsmtPerUnit = (form.num_residential_units || 0) > 0 && form.finished_basement_sqft
    ? form.finished_basement_sqft / form.num_residential_units : null
  const rawGarage = (form.attached_garage_sqft || 0) + (form.detached_garage_sqft || 0)
  const calcGaragePerUnit = rawGarage > 0 ? rawGarage / 2 : null

  const handleSave = async () => {
    setSaving(true)
    try {
      const updateData = { ...form }
      delete updateData.full_name
      delete updateData.created_at
      delete updateData.updated_at
      // Persist calculated values to DB
      updateData.total_units = calcTotalUnits || null
      updateData.sales_price_per_sqft = calcSalePricePerSqft
      updateData.bldg_assessment_per_sqft = calcBldgAssessmentPerSqft
      updateData.total_land_sqft = calcTotalLandSqft
      updateData.land_to_bldg_ratio = calcLandToBldgRatio
      updateData.num_bathrooms_per_unit = calcBathsPerUnit
      updateData.total_living_area_sqft_per_unit = calcLivingAreaPerUnit
      updateData.basement_area_sqft_per_unit = calcBasementPerUnit
      updateData.finished_bsmt_area_sqft_per_unit = calcFinishedBsmtPerUnit
      updateData.garage_per_unit = calcGaragePerUnit != null ? String(Math.round(calcGaragePerUnit)) : null
      const { error } = await supabase.from('properties').update(updateData).eq('id', id)
      if (error) throw error
      setProperty(updateData)
      setEditing(false)
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    if (!window.confirm('Delete this property? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id)
      if (error) throw error
      navigate('/properties')
    } catch (err) { alert('Error deleting: ' + err.message) }
  }

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading...</div>
  if (!property) return <div style={{ padding: '24px', color: '#ef4444' }}>Property not found</div>

  const propertyTypeOptions = ['Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Agricultural', 'Apartment', 'Mixed Use', 'Retail', 'Office', 'Warehouse', 'Manufacturing', 'Duplex', 'Other']
  const counties = ['Peoria', 'Tazewell', 'Woodford', 'Other']

  const addressParts = [form.address, form.city, form.state, form.zipcode].filter(Boolean)
  const fullAddress = addressParts.join(', ')
  const mapsAddress = encodeURIComponent(fullAddress || form.property_name || '')

  const tabs = ['Overview', 'Tax & Assessment', 'Residential', 'Industrial & Multifamily', 'Contacts', 'Appeals', 'Notes']
  const grid2col = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px', marginBottom: '24px' }

  // ── Section header rendered inside the 2-col grid (spans full width) ──────
  const SH = ({ title }) => (
    <div style={{ gridColumn: '1 / -1', borderBottom: '2px solid #e2e8f0', paddingBottom: 5, marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
    </div>
  )

  const TabContent = () => {
    switch (activeTab) {

      // ── OVERVIEW ──────────────────────────────────────────────────────────
      case 'Overview':
        return (
          <div style={grid2col}>

            <SH title="Property Details" />
            <FieldRow label="Current Use" value={form.current_use} editing={editing} onChange={v => f('current_use', v)} />
            <FieldRow label="# of Buildings" value={form.num_buildings} editing={editing} type="number" onChange={v => f('num_buildings', v)} />
            <FieldRow label="# of Stories" value={form.num_stories} editing={editing} type="number" onChange={v => f('num_stories', v)} />
            <FieldRow label="# of Residential Units" value={form.num_residential_units} editing={editing} type="number" onChange={v => f('num_residential_units', v)} />
            <FieldRow label="# of Commercial Units" value={form.num_commercial_units} editing={editing} type="number" onChange={v => f('num_commercial_units', v)} />
            {editing ? (
              <>
                <FieldRow label="Year Built" value={form.year_built} editing={editing} type="number" onChange={v => f('year_built', v)} />
                <FieldRow label="Year Renovated" value={form.year_renovated} editing={editing} type="number" onChange={v => f('year_renovated', v)} />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year Built / Year Renovated</span>
                <span style={{ fontSize: 14, color: '#1e293b' }}>{[form.year_built, form.year_renovated].filter(Boolean).join(' / ') || '—'}</span>
              </div>
            )}
            <FieldRow label="Exterior Construction" value={form.exterior_construction} editing={editing} onChange={v => f('exterior_construction', v)} />
            <FieldRow label="Total Land Acres" value={form.total_land_acres} editing={editing} type="number" onChange={v => f('total_land_acres', v)} />
            <FieldRow label="Zoning" value={form.zoning} editing={editing} onChange={v => f('zoning', v)} />

            <SH title="Building Breakdown" />
            <FieldRow label="Residential SQ FT" value={form.residential_sqft} editing={editing} type="number" onChange={v => f('residential_sqft', v)} />
            <FieldRow label="Retail Space SQ FT" value={form.retail_space_sqft} editing={editing} type="number" onChange={v => f('retail_space_sqft', v)} />
            <FieldRow label="Office Space SQ FT" value={form.office_space_sqft} editing={editing} type="number" onChange={v => f('office_space_sqft', v)} />
            <FieldRow label="Warehouse SQ FT" value={form.warehouse_sqft} editing={editing} type="number" onChange={v => f('warehouse_sqft', v)} />
            <FieldRow label="Comm Garage SQ FT" value={form.comm_garage_sqft} editing={editing} type="number" onChange={v => f('comm_garage_sqft', v)} />
            <FieldRow label="Vacant SQ FT" value={form.vacant_sqft} editing={editing} type="number" onChange={v => f('vacant_sqft', v)} />
            <CalcRow label="Vacancy %" value={calcVacancyPct} format={v => v.toFixed(1) + '%'} />
            <FieldRow label="# of Parking Spaces" value={form.num_parking_spaces} editing={editing} type="number" onChange={v => f('num_parking_spaces', v)} />
            <FieldRow label="Other Improvements" value={form.other_improvements} editing={editing} onChange={v => f('other_improvements', v)} />

            <SH title="Sale History" />
            <FieldRow label="Last Sale Price" value={form.sales_price} editing={editing} type="number" onChange={v => f('sales_price', v)} />
            <FieldRow label="Last Sale Date" value={form.sale_date} editing={editing} type="date" onChange={v => f('sale_date', v)} />
            <CalcRow label="Sale Price per SQ FT" value={calcSalePricePerSqft} format={v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            <CalcRow label="Sale Price per Unit" value={calcSalePricePerUnit} format={fmt.currency} />
            <FieldRow label="Sale Cap Rate" value={form.sale_cap_rate} editing={editing} type="number" onChange={v => f('sale_cap_rate', v)} />
            <FieldRow label="Sale GRM" value={form.sale_grm} editing={editing} type="number" onChange={v => f('sale_grm', v)} />

            <SH title="Location" />
            <FieldRow label="Address" value={form.address} editing={editing} onChange={v => f('address', v)} />
            <FieldRow label="City" value={form.city} editing={editing} onChange={v => f('city', v)} />
            <FieldRow label="State" value={form.state} editing={editing} onChange={v => f('state', v)} />
            <FieldRow label="Zipcode" value={form.zipcode} editing={editing} onChange={v => f('zipcode', v)} />
            <FieldRow label="County" value={form.county} editing={editing} type="select" options={counties} onChange={v => f('county', v)} />
            <FieldRow label="Township" value={form.township} editing={editing} onChange={v => f('township', v)} />
            <FieldRow label="Neighborhood #" value={form.neighborhood_num} editing={editing} onChange={v => f('neighborhood_num', v)} />
            <FieldRow label="Market" value={form.market} editing={editing} onChange={v => f('market', v)} />
            <FieldRow label="Submarket" value={form.submarket} editing={editing} onChange={v => f('submarket', v)} />
            <FieldRow label="Latitude" value={form.latitude} editing={editing} type="number" onChange={v => f('latitude', v)} />
            <FieldRow label="Longitude" value={form.longitude} editing={editing} type="number" onChange={v => f('longitude', v)} />
            <CalcRow label="Total Land SQ FT" value={calcTotalLandSqft} format={v => Math.round(v).toLocaleString()} />
            <CalcRow label="Land to Bldg Ratio" value={calcLandToBldgRatio} format={v => (Math.round(v * 100) / 100).toFixed(2)} />
            <FieldRow label="Parcel ID 2" value={form.parcel_id2} editing={editing} onChange={v => f('parcel_id2', v)} />
            <FieldRow label="Parcel ID 3" value={form.parcel_id3} editing={editing} onChange={v => f('parcel_id3', v)} />
            <FieldRow label="Parcel ID 4" value={form.parcel_id4} editing={editing} onChange={v => f('parcel_id4', v)} />
            <FieldRow label="Parcel ID 5" value={form.parcel_id5} editing={editing} onChange={v => f('parcel_id5', v)} />
            <FieldRow label="Misc Parcels" value={form.misc_parcels} editing={editing} onChange={v => f('misc_parcels', v)} />

          </div>
        )

      // ── TAX & ASSESSMENT ──────────────────────────────────────────────────
      case 'Tax & Assessment':
        return (
          <div style={grid2col}>
            <FieldRow label="Land Assessment" value={form.land_assessment} editing={editing} type="number" onChange={v => f('land_assessment', v)} />
            <FieldRow label="Bldg Assessment" value={form.bldg_assessment} editing={editing} type="number" onChange={v => f('bldg_assessment', v)} />
            <FieldRow label="Total Assessment" value={form.total_assessment} editing={editing} type="number" onChange={v => f('total_assessment', v)} />
            <CalcRow label="Bldg Assessment per SQ FT" value={calcBldgAssessmentPerSqft} format={v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            <FieldRow label="Tax Class" value={form.tax_class} editing={editing} onChange={v => f('tax_class', v)} />
            <FieldRow label="Tax Code" value={form.tax_code} editing={editing} onChange={v => f('tax_code', v)} />
            <FieldRow label="Tax Rate" value={form.tax_rate} editing={editing} type="number" onChange={v => f('tax_rate', v)} />
            <FieldRow label="Annual Tax Bill" value={form.annual_tax_bill} editing={editing} type="number" onChange={v => f('annual_tax_bill', v)} />
            <FieldRow label="TIF Value" value={form.tif_value} editing={editing} type="number" onChange={v => f('tif_value', v)} />
            <FieldRow label="Tax Year" value={form.tax_year} editing={editing} type="number" onChange={v => f('tax_year', v)} />
            <FieldRow label="Assessed Bldg Value" value={form.assessed_bldg_value} editing={editing} type="number" onChange={v => f('assessed_bldg_value', v)} />
          </div>
        )

      // ── RESIDENTIAL ───────────────────────────────────────────────────────
      case 'Residential':
        return (
          <div style={grid2col}>
            <SH title="Residential Details" />
            <FieldRow label="Total Living Area SQ FT" value={form.total_living_area_sqft} editing={editing} type="number" onChange={v => f('total_living_area_sqft', v)} />
            <FieldRow label="Main Living Area SQ FT" value={form.main_living_area_sqft} editing={editing} type="number" onChange={v => f('main_living_area_sqft', v)} />
            <FieldRow label="Recreation Area SQ FT" value={form.recreation_area_sqft} editing={editing} type="number" onChange={v => f('recreation_area_sqft', v)} />
            <FieldRow label="Attached Garage SQ FT" value={form.attached_garage_sqft} editing={editing} type="number" onChange={v => f('attached_garage_sqft', v)} />
            <FieldRow label="Detached Garage SQ FT" value={form.detached_garage_sqft} editing={editing} type="number" onChange={v => f('detached_garage_sqft', v)} />
            <FieldRow label="# of Bedrooms" value={form.num_bedrooms} editing={editing} type="number" onChange={v => f('num_bedrooms', v)} />
            <FieldRow label="# of Full Baths" value={form.num_full_baths} editing={editing} type="number" onChange={v => f('num_full_baths', v)} />
            <FieldRow label="# of Half Baths" value={form.num_half_baths} editing={editing} type="number" onChange={v => f('num_half_baths', v)} />
            <FieldRow label="# of Fireplaces" value={form.num_fireplaces} editing={editing} type="number" onChange={v => f('num_fireplaces', v)} />
            <FieldRow label="Basement" value={form.basement} editing={editing} type="boolean" onChange={v => f('basement', v)} />
            <FieldRow label="Basement SQ FT" value={form.basement_sqft} editing={editing} type="number" onChange={v => f('basement_sqft', v)} />
            <FieldRow label="Finished Basement SQ FT" value={form.finished_basement_sqft} editing={editing} type="number" onChange={v => f('finished_basement_sqft', v)} />
            <FieldRow label="Style" value={form.style} editing={editing} onChange={v => f('style', v)} />
            <FieldRow label="Grade" value={form.grade} editing={editing} onChange={v => f('grade', v)} />
            <FieldRow label="Condition" value={form.condition} editing={editing} onChange={v => f('condition', v)} />
            <FieldRow label="Air Conditioning" value={form.air_conditioning} editing={editing} type="boolean" onChange={v => f('air_conditioning', v)} />

            <SH title="Duplex / Per-Unit Calculations" />
            <CalcRow label="# of Bathrooms per Unit" value={calcBathsPerUnit} format={v => (Math.round(v * 10) / 10).toFixed(1)} />
            <CalcRow label="Total Living Area SQ FT per Unit" value={calcLivingAreaPerUnit} format={v => Math.round(v).toLocaleString()} />
            <CalcRow label="Basement Area SQ FT per Unit" value={calcBasementPerUnit} format={v => Math.round(v).toLocaleString()} />
            <CalcRow label="Finished BSMT Area SQ FT per Unit" value={calcFinishedBsmtPerUnit} format={v => Math.round(v).toLocaleString()} />
            <CalcRow label="Garage / Carport per Unit (SQ FT)" value={calcGaragePerUnit} format={v => Math.round(v).toLocaleString()} />
          </div>
        )

      // ── INDUSTRIAL & MULTIFAMILY ──────────────────────────────────────────
      case 'Industrial & Multifamily':
        return (
          <div style={grid2col}>

            <SH title="Industrial" />
            <FieldRow label="Manufacturing SQ FT" value={form.manufacturing_sqft} editing={editing} type="number" onChange={v => f('manufacturing_sqft', v)} />
            <FieldRow label="Ceiling Height (ft)" value={form.ceiling_height} editing={editing} type="number" onChange={v => f('ceiling_height', v)} />
            <FieldRow label="# Loading Docks" value={form.num_loading_docks} editing={editing} type="number" onChange={v => f('num_loading_docks', v)} />
            <FieldRow label="Sprinkler System" value={form.sprinkler_system} editing={editing} onChange={v => f('sprinkler_system', v)} />

            <SH title="Multifamily / Apartment" />
            <FieldRow label="Apartment Mix" value={form.apartment_mix} editing={editing} onChange={v => f('apartment_mix', v)} />
            <FieldRow label="Individual Laundry" value={form.individual_laundry} editing={editing} type="boolean" onChange={v => f('individual_laundry', v)} />
            <FieldRow label="# 0-Bed Apts" value={form.num_0bed_apts} editing={editing} type="number" onChange={v => f('num_0bed_apts', v)} />
            <FieldRow label="# 1-Bed Apts" value={form.num_1bed_apts} editing={editing} type="number" onChange={v => f('num_1bed_apts', v)} />
            <FieldRow label="# 2-Bed Apts" value={form.num_2bed_apts} editing={editing} type="number" onChange={v => f('num_2bed_apts', v)} />
            <FieldRow label="# 3-Bed Apts" value={form.num_3bed_apts} editing={editing} type="number" onChange={v => f('num_3bed_apts', v)} />
            <FieldRow label="# 4-Bed Apts" value={form.num_4bed_apts} editing={editing} type="number" onChange={v => f('num_4bed_apts', v)} />

          </div>
        )

      // ── CONTACTS ──────────────────────────────────────────────────────────
      case 'Contacts':
        return (
          <div>
            <PropertyContactsPanel propertyId={id} isAdmin={isAdmin} />
          </div>
        )

      // ── APPEALS ───────────────────────────────────────────────────────────
      case 'Appeals':
        return (
          <div>
            <AppealsPanel propertyId={id} />
          </div>
        )

      // ── NOTES ─────────────────────────────────────────────────────────────
      case 'Notes':
        return (
          <div>
            <FieldRow label="Notes" value={form.notes} editing={editing} type="textarea" onChange={v => f('notes', v)} />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Back Button ─────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate('/properties')}
          style={{ background: 'none', border: 'none', color: '#1e40af', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        >
          ← Properties
        </button>

        {/* ── HERO CARD ───────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '24px 28px' }}>

            {/* Row 1: Badges + Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {editing ? (
                  <>
                    <HeaderField label="Property Type" value={form.property_type} editing={editing} type="select" options={propertyTypeOptions} onChange={v => f('property_type', v)} />
                    <HeaderField label="Property Subtype" value={form.property_subtype} editing={editing} onChange={v => f('property_subtype', v)} />
                  </>
                ) : (
                  <>
                    {form.property_type && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{form.property_type}</span>
                    )}
                    {form.property_subtype && (
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{form.property_subtype}</span>
                    )}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setForm(property); setEditing(false) }} style={{ padding: '7px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {isAdmin && (
                      <button onClick={handleDelete} style={{ padding: '7px 14px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Delete
                      </button>
                    )}
                    <button onClick={() => setEditing(true)} style={{ padding: '7px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✏️ Edit Property
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Name + Address + Owner | Photo + Map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Property Name — editable when in edit mode */}
                {editing ? (
                  <div style={{ marginBottom: 8 }}>
                    <HeaderField
                      label="Property Name"
                      value={form.property_name}
                      editing={editing}
                      onChange={v => f('property_name', v)}
                      inputStyle={{ fontSize: 18, fontWeight: 700, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', lineHeight: 1.2 }}>
                    {form.property_name || form.address || 'Unnamed Property'}
                  </h1>
                )}

                {/* Address — editable inline when editing */}
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 10 }}>
                    <HeaderField label="Street Address" value={form.address} editing={editing} onChange={v => f('address', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                    <HeaderField label="City" value={form.city} editing={editing} onChange={v => f('city', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                    <HeaderField label="State" value={form.state} editing={editing} onChange={v => f('state', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                    <HeaderField label="Zipcode" value={form.zipcode} editing={editing} onChange={v => f('zipcode', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ) : (
                  <>
                    {(form.city || form.state || form.zipcode) && (
                      <p style={{ margin: '0 0 2px', fontSize: 13, color: '#64748b' }}>
                        📍 {[form.city, form.state, form.zipcode].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {form.address && (form.city || form.state) && (
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#94a3b8' }}>{form.address}</p>
                    )}
                  </>
                )}

                {/* Owner Contact + Company — directly under address */}
                {primaryContact && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 120 }}>Owner Name</span>
                      <button
                        onClick={() => navigate(`/contacts/${primaryContact.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1e40af', fontSize: 13, fontWeight: 700, textDecoration: 'underline' }}
                      >
                        {primaryContact.first_name} {primaryContact.last_name}
                      </button>
                    </div>
                    {primaryContact.company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 120 }}>Owner Company</span>
                        <button
                          onClick={() => navigate(`/companies/${primaryContact.company.id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1e40af', fontSize: 13, fontWeight: 700, textDecoration: 'underline' }}
                        >
                          {primaryContact.company.company_name}
                        </button>
                      </div>
                    )}
                    {primaryContact.main_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 120 }}>Phone</span>
                        <span style={{ fontSize: 13, color: '#475569' }}>{primaryContact.main_phone}</span>
                      </div>
                    )}
                    {primaryContact.email_address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 120 }}>Email</span>
                        <a href={`mailto:${primaryContact.email_address}`} style={{ fontSize: 13, color: '#1e40af', textDecoration: 'none' }}>{primaryContact.email_address}</a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photo + Map */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#f8fafc' }}>
                  <PhotoGallery recordType="property" recordId={id} mode="wide" onMainPhotoChange={url => setProperty(p => ({ ...p, image_url: url }))} />
                </div>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', minHeight: 200 }}>
                  {mapsAddress
                    ? <iframe title="Property Map" width="100%" height="100%" style={{ display: 'block', minHeight: 200, border: 0 }} src={`https://maps.google.com/maps?q=${mapsAddress}&output=embed&z=15`} allowFullScreen loading="lazy" />
                    : <div style={{ height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8', fontSize: 12, gap: 8 }}><span style={{ fontSize: 32 }}>🗺️</span><span>No address for map</span></div>
                  }
                </div>
              </div>
            </div>

            {/* ── Stats Strip ─────────────────────────────────────────────── */}
            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px 16px', borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 20 }}>
                <HeaderField label="Parcel ID" value={form.parcel_id} editing={editing} onChange={v => f('parcel_id', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                <HeaderField label="Total Bldg SQ FT" value={form.total_building_sqft != null ? String(form.total_building_sqft) : ''} editing={editing} onChange={v => f('total_building_sqft', v ? parseFloat(v) : null)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                <HeaderField label="Year Built" value={form.year_built != null ? String(form.year_built) : ''} editing={editing} onChange={v => f('year_built', v ? parseInt(v) : null)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                <HeaderField label="Year Renovated" value={form.year_renovated != null ? String(form.year_renovated) : ''} editing={editing} onChange={v => f('year_renovated', v ? parseInt(v) : null)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                <HeaderField label="Last Sale Price" value={form.sales_price != null ? String(form.sales_price) : ''} editing={editing} onChange={v => f('sales_price', v ? parseFloat(v) : null)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
                <HeaderField label="Last Sale Date" value={form.sale_date} editing={editing} type="date" onChange={v => f('sale_date', v)} inputStyle={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0, borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 20 }}>
                <StatCell label="Property Type"    value={form.property_type} />
                <StatCell label="Property Subtype" value={form.property_subtype} />
                <StatCell label="Parcel ID"         value={form.parcel_id} />
                <StatCell label="Total Bldg SF"     value={form.total_building_sqft ? fmt.number(form.total_building_sqft) + ' SF' : null} color="#1e40af" />
                <StatCell label="Total Units"       value={calcTotalUnits > 0 ? calcTotalUnits : null} />
                <StatCell label="Year Built / Reno" value={[form.year_built, form.year_renovated].filter(Boolean).join(' / ') || null} />
                <StatCell label="Last Sale Price"   value={form.sales_price ? fmt.currency(form.sales_price) : null} color="#f59e0b" />
                <StatCell label="Last Sale Date"    value={form.sale_date ? fmt.date(form.sale_date) : null} />
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Tabs (full width — no sidebar) ────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none',
                  padding: '9px 12px', marginBottom: '-1px',
                  borderBottom: activeTab === tab ? '2px solid #1e40af' : '2px solid transparent',
                  color: activeTab === tab ? '#1e40af' : '#64748b',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <TabContent />
        </div>

      </div>
    </div>
  )
}

export default PropertyDetail

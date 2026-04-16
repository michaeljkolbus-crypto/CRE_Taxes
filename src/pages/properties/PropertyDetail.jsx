import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function FieldRow({ label, value, editing, type = 'text', onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </span>
      {editing ? (
        type === 'select' ? (
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13
            }}
          >
            <option value="">—</option>
            {options?.map(o => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={3}
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13
            }}
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13
            }}
          />
        )
      ) : (
        <span style={{ fontSize: 14, color: value ? '#1e293b' : '#94a3b8' }}>{value || '—'}</span>
      )}
    </div>
  )
}

function PropertyContactsPanel({ propertyId, isAdmin }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [availableContacts, setAvailableContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    fetchLinkedContacts()
  }, [propertyId])

  const fetchLinkedContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('property_contacts')
        .select(
          '*, contact:contacts(id, first_name, last_name, main_phone, email_address)'
        )
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true })

      if (error) throw error
      setAvailableContacts(data || [])
    } catch (err) {
      console.error('Error fetching available contacts:', err)
    }
  }

  const handleLinkContact = async () => {
    if (!selectedContactId || !selectedRole) {
      alert('Please select a contact and role')
      return
    }

    try {
      const { error } = await supabase.from('property_contacts').insert([
        {
          property_id: propertyId,
          contact_id: selectedContactId,
          role: selectedRole,
          is_primary: false
        }
      ])

      if (error) throw error

      setSelectedContactId('')
      setSelectedRole('')
      setShowLinkModal(false)
      await fetchLinkedContacts()
    } catch (err) {
      alert('Error linking contact: ' + err.message)
    }
  }

  const handleRemoveContact = async (propertyContactId) => {
    if (window.confirm('Remove this contact link?')) {
      try {
        const { error } = await supabase
          .from('property_contacts')
          .delete()
          .eq('id', propertyContactId)

        if (error) throw error
        await fetchLinkedContacts()
      } catch (err) {
        alert('Error removing contact: ' + err.message)
      }
    }
  }

  const handleSetPrimary = async (propertyContactId) => {
    try {
      await supabase
        .from('property_contacts')
        .update({ is_primary: false })
        .eq('property_id', propertyId)

      const { error } = await supabase
        .from('property_contacts')
        .update({ is_primary: true })
        .eq('id', propertyContactId)

      if (error) throw error
      await fetchLinkedContacts()
    } catch (err) {
      alert('Error setting primary: ' + err.message)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '16px',
        background: '#fff',
        marginBottom: '20px'
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>
        Linked Contacts
      </h3>

      {loading ? (
        <div style={{ fontSize: 13, color: '#64748b' }}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: '12px' }}>
          No contacts linked yet.
        </div>
      ) : (
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contacts.map(pc => (
            <div
              key={pc.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: 6,
                fontSize: 13
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ color: '#1e40af', fontWeight: 500 }}>
                  {pc.contact?.first_name} {pc.contact?.last_name}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: '8px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  {pc.role}
                </span>
                {pc.is_primary && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: '8px',
                      color: '#fbbf24',
                      fontSize: 16
                    }}
                  >
                    ★
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {!pc.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(pc.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 4px'
                    }}
                    title="Set as primary"
                  >
                    ☆
                  </button>
                )}
                <button
                  onClick={() => handleRemoveContact(pc.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 4px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          fetchAvailableContacts()
          setShowLinkModal(true)
        }}
        style={{
          width: '100%',
          padding: '8px',
          background: '#dbeafe',
          color: '#1e40af',
          border: '1px solid #bfdbfe',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Link Contact
      </button>

      {showLinkModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0' }}>
              Link Contact
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Contact
                </label>
                <select
                  value={selectedContactId}
                  onChange={e => setSelectedContactId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select a contact...</option>
                  {availableContacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
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
              <button
                onClick={() => setShowLinkModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#1e293b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkContact}
                style={{
                  padding: '8px 16px',
                  background: '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppealsPanel({ propertyId }) {
  const navigate = useNavigate()
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [appealError, setAppealError] = useState(null)

  useEffect(() => {
    fetchAppeals()
  }, [propertyId])

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
      console.error('Error fetching appeals:', err)
    } finally {
      setLoading(false)
    }
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
      console.error('Error creating appeal:', err.message)
      setAppealError('Error creating appeal: ' + err.message)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '16px',
        background: '#fff'
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>
        Appeals
      </h3>

      {loading ? (
        <div style={{ fontSize: 13, color: '#64748b' }}>Loading...</div>
      ) : appeals.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: '12px' }}>
          No appeals yet.
        </div>
      ) : (
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {appeals.map(appeal => (
            <div
              key={appeal.id}
              onClick={() => navigate(`/appeals/${appeal.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Tax Year {appeal.tax_year}</span>
                {appeal.stage && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: '8px',
                      background: appeal.stage.color || '#dbeafe',
                      color: '#1e40af',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    {appeal.stage.name}
                  </span>
                )}
              </div>
              {appeal.bor_result && (
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  BOR: {appeal.bor_result}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {appealError && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: '8px', padding: '6px 8px', background: '#fee2e2', borderRadius: 4 }}>
          {appealError}
        </div>
      )}

      <button
        onClick={handleNewAppeal}
        style={{
          width: '100%',
          padding: '8px',
          background: '#dbeafe',
          color: '#1e40af',
          border: '1px solid #bfdbfe',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        + New Appeal
      </button>
    </div>
  )
}

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

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchProperty()
  }, [id])

  const fetchProperty = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setProperty(data)
      setForm(data)
    } catch (err) {
      console.error('Error fetching property:', err)
      alert('Property not found')
      navigate('/properties')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updateData = { ...form }
      delete updateData.full_name
      delete updateData.created_at
      delete updateData.updated_at

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setProperty(updateData)
      setEditing(false)
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(property)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!isAdmin) {
      alert('Only admins can delete properties')
      return
    }

    if (window.confirm('Are you sure you want to delete this property? This cannot be undone.')) {
      try {
        const { error } = await supabase.from('properties').delete().eq('id', id)

        if (error) throw error

        navigate('/properties')
      } catch (err) {
        alert('Error deleting: ' + err.message)
      }
    }
  }

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading...</div>
  }

  if (!property) {
    return <div style={{ padding: '24px', color: '#ef4444' }}>Property not found</div>
  }

  const propertyTypeOptions = [
    'Residential',
    'Commercial',
    'Industrial',
    'Mixed-Use',
    'Agricultural'
  ]

  const counties = ['Peoria', 'Tazewell', 'Woodford', 'Other']

  const tabs = [
    'Overview',
    'Physical',
    'Units & Space',
    'Tax & Assessment',
    'Residential',
    'Multifamily',
    'Notes'
  ]

  const TabContent = () => {
    const grid2col = {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px 32px',
      marginBottom: '24px'
    }

    switch (activeTab) {
      case 'Overview':
        return (
          <div style={grid2col}>
            <FieldRow label="Parcel ID" value={form.parcel_id} editing={editing} onChange={v => handleFieldChange('parcel_id', v)} />
            <FieldRow label="Parcel ID 2-5" value={form.parcel_id_2_5} editing={editing} onChange={v => handleFieldChange('parcel_id_2_5', v)} />
            <FieldRow label="Misc Parcels" value={form.misc_parcels} editing={editing} onChange={v => handleFieldChange('misc_parcels', v)} />
            <FieldRow label="County" value={form.county} editing={editing} type="select" options={counties} onChange={v => handleFieldChange('county', v)} />
            <FieldRow label="Township" value={form.township} editing={editing} onChange={v => handleFieldChange('township', v)} />
            <FieldRow label="Address" value={form.address} editing={editing} onChange={v => handleFieldChange('address', v)} />
            <FieldRow label="City" value={form.city} editing={editing} onChange={v => handleFieldChange('city', v)} />
            <FieldRow label="State" value={form.state} editing={editing} onChange={v => handleFieldChange('state', v)} />
            <FieldRow label="Zip" value={form.zipcode} editing={editing} onChange={v => handleFieldChange('zipcode', v)} />
            <FieldRow label="Property Name" value={form.property_name} editing={editing} onChange={v => handleFieldChange('property_name', v)} />
            <FieldRow label="Market" value={form.market} editing={editing} onChange={v => handleFieldChange('market', v)} />
            <FieldRow label="Submarket" value={form.submarket} editing={editing} onChange={v => handleFieldChange('submarket', v)} />
            <FieldRow label="Property Type" value={form.property_type} editing={editing} type="select" options={propertyTypeOptions} onChange={v => handleFieldChange('property_type', v)} />
            <FieldRow label="Property Subtype" value={form.property_subtype} editing={editing} onChange={v => handleFieldChange('property_subtype', v)} />
            <FieldRow label="Current Use" value={form.current_use} editing={editing} onChange={v => handleFieldChange('current_use', v)} />
            <FieldRow label="Zoning" value={form.zoning} editing={editing} onChange={v => handleFieldChange('zoning', v)} />
            <FieldRow label="Tax Class" value={form.tax_class} editing={editing} onChange={v => handleFieldChange('tax_class', v)} />
            <FieldRow label="Grade" value={form.grade} editing={editing} onChange={v => handleFieldChange('grade', v)} />
            <FieldRow label="Condition" value={form.condition} editing={editing} onChange={v => handleFieldChange('condition', v)} />
            <FieldRow label="Style" value={form.style} editing={editing} onChange={v => handleFieldChange('style', v)} />
            <FieldRow label="Last Sale Date" value={form.sale_date} editing={editing} type="date" onChange={v => handleFieldChange('sale_date', v)} />
            <FieldRow label="Last Sale Price" value={form.sales_price} editing={editing} type="number" onChange={v => handleFieldChange('sales_price', v)} />
            <FieldRow label="Sale Price/SF" value={form.sale_price_sf} editing={editing} type="number" onChange={v => handleFieldChange('sale_price_sf', v)} />
          </div>
        )

      case 'Physical':
        return (
          <div style={grid2col}>
            <FieldRow label="Total Land Acres" value={form.total_land_acres} editing={editing} type="number" onChange={v => handleFieldChange('total_land_acres', v)} />
            <FieldRow label="Total Land SF" value={form.total_land_sf} editing={editing} type="number" onChange={v => handleFieldChange('total_land_sf', v)} />
            <FieldRow label="Total Building SF" value={form.total_building_sqft} editing={editing} type="number" onChange={v => handleFieldChange('total_building_sqft', v)} />
            <FieldRow label="Year Built" value={form.year_built} editing={editing} type="number" onChange={v => handleFieldChange('year_built', v)} />
            <FieldRow label="Year Renovated" value={form.year_renovated} editing={editing} type="number" onChange={v => handleFieldChange('year_renovated', v)} />
            <FieldRow label="Land to Bldg Ratio" value={form.land_bldg_ratio} editing={editing} type="number" onChange={v => handleFieldChange('land_bldg_ratio', v)} />
            <FieldRow label="# Buildings" value={form.num_buildings} editing={editing} type="number" onChange={v => handleFieldChange('num_buildings', v)} />
            <FieldRow label="# Stories" value={form.num_stories} editing={editing} type="number" onChange={v => handleFieldChange('num_stories', v)} />
            <FieldRow label="Exterior Construction" value={form.exterior_construction} editing={editing} onChange={v => handleFieldChange('exterior_construction', v)} />
            <FieldRow label="Ceiling Height" value={form.ceiling_height} editing={editing} onChange={v => handleFieldChange('ceiling_height', v)} />
            <FieldRow label="# Loading Docks" value={form.num_loading_docks} editing={editing} type="number" onChange={v => handleFieldChange('num_loading_docks', v)} />
            <FieldRow label="Sprinkler System" value={form.sprinkler_system} editing={editing} onChange={v => handleFieldChange('sprinkler_system', v)} />
          </div>
        )

      case 'Units & Space':
        return (
          <div style={grid2col}>
            <FieldRow label="# Residential Units" value={form.num_residential_units} editing={editing} type="number" onChange={v => handleFieldChange('num_residential_units', v)} />
            <FieldRow label="# Commercial Units" value={form.num_commercial_units} editing={editing} type="number" onChange={v => handleFieldChange('num_commercial_units', v)} />
            <FieldRow label="Total Units" value={form.total_units} editing={editing} type="number" onChange={v => handleFieldChange('total_units', v)} />
            <FieldRow label="# Apartments" value={form.num_apartments} editing={editing} type="number" onChange={v => handleFieldChange('num_apartments', v)} />
            <FieldRow label="Apartment Mix" value={form.apartment_mix} editing={editing} onChange={v => handleFieldChange('apartment_mix', v)} />
            <FieldRow label="Residential SF" value={form.residential_sf} editing={editing} type="number" onChange={v => handleFieldChange('residential_sf', v)} />
            <FieldRow label="Retail SF" value={form.retail_sf} editing={editing} type="number" onChange={v => handleFieldChange('retail_sf', v)} />
            <FieldRow label="Office SF" value={form.office_sf} editing={editing} type="number" onChange={v => handleFieldChange('office_sf', v)} />
            <FieldRow label="Warehouse SF" value={form.warehouse_sf} editing={editing} type="number" onChange={v => handleFieldChange('warehouse_sf', v)} />
            <FieldRow label="Manufacturing SF" value={form.manufacturing_sf} editing={editing} type="number" onChange={v => handleFieldChange('manufacturing_sf', v)} />
            <FieldRow label="Comm Garage SF" value={form.comm_garage_sf} editing={editing} type="number" onChange={v => handleFieldChange('comm_garage_sf', v)} />
            <FieldRow label="Other Improvements" value={form.other_improvements} editing={editing} onChange={v => handleFieldChange('other_improvements', v)} />
          </div>
        )

      case 'Tax & Assessment':
        return (
          <div style={grid2col}>
            <FieldRow label="Tax Code" value={form.tax_code} editing={editing} onChange={v => handleFieldChange('tax_code', v)} />
            <FieldRow label="Tax Rate" value={form.tax_rate} editing={editing} type="number" onChange={v => handleFieldChange('tax_rate', v)} />
            <FieldRow label="Annual Tax Bill" value={form.annual_tax_bill} editing={editing} type="number" onChange={v => handleFieldChange('annual_tax_bill', v)} />
            <FieldRow label="TIF Value" value={form.tif_value} editing={editing} type="number" onChange={v => handleFieldChange('tif_value', v)} />
            <FieldRow label="Tax Year" value={form.tax_year} editing={editing} type="number" onChange={v => handleFieldChange('tax_year', v)} />
            <FieldRow label="Land Assessment" value={form.land_assessment} editing={editing} type="number" onChange={v => handleFieldChange('land_assessment', v)} />
            <FieldRow label="Bldg Assessment" value={form.bldg_assessment} editing={editing} type="number" onChange={v => handleFieldChange('bldg_assessment', v)} />
            <FieldRow label="Total Assessment" value={form.total_assessment} editing={editing} type="number" onChange={v => handleFieldChange('total_assessment', v)} />
            <FieldRow label="Bldg Assessment/SF" value={form.bldg_assessment_sf} editing={editing} type="number" onChange={v => handleFieldChange('bldg_assessment_sf', v)} />
            <FieldRow label="Assessed Bldg Value" value={form.assessed_bldg_value} editing={editing} type="number" onChange={v => handleFieldChange('assessed_bldg_value', v)} />
          </div>
        )

      case 'Residential':
        return (
          <div style={grid2col}>
            <FieldRow label="# Bedrooms" value={form.num_bedrooms} editing={editing} type="number" onChange={v => handleFieldChange('num_bedrooms', v)} />
            <FieldRow label="# Full Baths" value={form.num_full_baths} editing={editing} type="number" onChange={v => handleFieldChange('num_full_baths', v)} />
            <FieldRow label="# Half Baths" value={form.num_half_baths} editing={editing} type="number" onChange={v => handleFieldChange('num_half_baths', v)} />
            <FieldRow label="# Fireplaces" value={form.num_fireplaces} editing={editing} type="number" onChange={v => handleFieldChange('num_fireplaces', v)} />
            <FieldRow label="A/C" value={form.ac} editing={editing} onChange={v => handleFieldChange('ac', v)} />
            <FieldRow label="Total Living Area SF" value={form.total_living_area_sf} editing={editing} type="number" onChange={v => handleFieldChange('total_living_area_sf', v)} />
            <FieldRow label="Main Living Area SF" value={form.main_living_area_sf} editing={editing} type="number" onChange={v => handleFieldChange('main_living_area_sf', v)} />
            <FieldRow label="Recreation Area SF" value={form.recreation_area_sf} editing={editing} type="number" onChange={v => handleFieldChange('recreation_area_sf', v)} />
            <FieldRow label="Attached Garage SF" value={form.attached_garage_sf} editing={editing} type="number" onChange={v => handleFieldChange('attached_garage_sf', v)} />
            <FieldRow label="Detached Garage SF" value={form.detached_garage_sf} editing={editing} type="number" onChange={v => handleFieldChange('detached_garage_sf', v)} />
            <FieldRow label="Basement Y/N" value={form.has_basement} editing={editing} onChange={v => handleFieldChange('has_basement', v)} />
            <FieldRow label="Basement SF" value={form.basement_sf} editing={editing} type="number" onChange={v => handleFieldChange('basement_sf', v)} />
            <FieldRow label="Finished Basement SF" value={form.finished_basement_sf} editing={editing} type="number" onChange={v => handleFieldChange('finished_basement_sf', v)} />
          </div>
        )

      case 'Multifamily':
        return (
          <div style={grid2col}>
            <FieldRow label="Baths/Unit" value={form.baths_per_unit} editing={editing} type="number" onChange={v => handleFieldChange('baths_per_unit', v)} />
            <FieldRow label="Living SF/Unit" value={form.living_sf_per_unit} editing={editing} type="number" onChange={v => handleFieldChange('living_sf_per_unit', v)} />
            <FieldRow label="Basement SF/Unit" value={form.basement_sf_per_unit} editing={editing} type="number" onChange={v => handleFieldChange('basement_sf_per_unit', v)} />
            <FieldRow label="Finished Basement SF/Unit" value={form.finished_basement_sf_per_unit} editing={editing} type="number" onChange={v => handleFieldChange('finished_basement_sf_per_unit', v)} />
            <FieldRow label="Garage/Unit" value={form.garage_per_unit} editing={editing} type="number" onChange={v => handleFieldChange('garage_per_unit', v)} />
            <FieldRow label="# 0-Bed Apts" value={form.num_0bed_apts} editing={editing} type="number" onChange={v => handleFieldChange('num_0bed_apts', v)} />
            <FieldRow label="# 1-Bed Apts" value={form.num_1bed_apts} editing={editing} type="number" onChange={v => handleFieldChange('num_1bed_apts', v)} />
            <FieldRow label="# 2-Bed Apts" value={form.num_2bed_apts} editing={editing} type="number" onChange={v => handleFieldChange('num_2bed_apts', v)} />
            <FieldRow label="# 3-Bed Apts" value={form.num_3bed_apts} editing={editing} type="number" onChange={v => handleFieldChange('num_3bed_apts', v)} />
            <FieldRow label="# 4-Bed Apts" value={form.num_4bed_apts} editing={editing} type="number" onChange={v => handleFieldChange('num_4bed_apts', v)} />
            <FieldRow label="Individual Laundry" value={form.individual_laundry} editing={editing} onChange={v => handleFieldChange('individual_laundry', v)} />
            <FieldRow label="Vacant SF" value={form.vacant_sf} editing={editing} type="number" onChange={v => handleFieldChange('vacant_sf', v)} />
            <FieldRow label="Occupancy %" value={form.occupancy_pct} editing={editing} type="number" onChange={v => handleFieldChange('occupancy_pct', v)} />
            <FieldRow label="# Parking Spaces" value={form.num_parking_spaces} editing={editing} type="number" onChange={v => handleFieldChange('num_parking_spaces', v)} />
          </div>
        )

      case 'Notes':
        return (
          <div>
            <FieldRow label="Notes" value={form.notes} editing={editing} type="textarea" onChange={v => handleFieldChange('notes', v)} />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/properties')}
          style={{
            background: 'none',
            border: 'none',
            color: '#1e40af',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          ← Properties
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
          {form.address || 'Unnamed Property'}
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          {form.parcel_id && `Parcel ID: ${form.parcel_id}`}
          {form.parcel_id && form.county && ' • '}
          {form.county && `County: ${form.county}`}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                style={{
                  background: '#fff',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                style={{
                  background: '#fff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  style={{
                    background: '#fff',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 0',
                  marginBottom: '-1px',
                  borderBottom: activeTab === tab ? '2px solid #1e40af' : 'none',
                  color: activeTab === tab ? '#1e40af' : '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <TabContent />
        </div>

        <div style={{ width: '300px' }}>
          <PropertyContactsPanel propertyId={id} isAdmin={isAdmin} />
          <AppealsPanel propertyId={id} />
        </div>
      </div>
    </div>
  )
}
export default PropertyDetail

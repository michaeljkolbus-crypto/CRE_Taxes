import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/theme'

function AddPropertyModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    parcel_id: '',
    county: '',
    address: '',
    city: '',
    state: 'IL',
    zipcode: '',
    property_type: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.parcel_id.trim()) {
      alert('Parcel ID is required')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([form])
        .select()
      if (error) throw error
      onSave(data[0].id)
    } catch (err) {
      alert('Error creating property: ' + err.message)
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 50
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '12px 12px 0 0',
        padding: '24px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Add Property</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Parcel ID *
            </label>
            <input
              type="text"
              value={form.parcel_id}
              onChange={e => handleChange('parcel_id', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
              placeholder="e.g., 14-001-001"
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              County
            </label>
            <select
              value={form.county}
              onChange={e => handleChange('county', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select county</option>
              <option value="Peoria">Peoria</option>
              <option value="Tazewell">Tazewell</option>
              <option value="Woodford">Woodford</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
              placeholder="Street address"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => handleChange('city', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 0.5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={e => handleChange('state', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Zip Code
            </label>
            <input
              type="text"
              value={form.zipcode}
              onChange={e => handleChange('zipcode', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Property Type
            </label>
            <select
              value={form.property_type}
              onChange={e => handleChange('property_type', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select type</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Mixed-Use">Mixed-Use</option>
              <option value="Agricultural">Agricultural</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
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
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PropertiesPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('All')
  const [propertyType, setPropertyType] = useState('All')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const pageSize = 50

  useEffect(() => {
    fetchProperties()
  }, [search, county, propertyType, page, sortField, sortAsc])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      let query = supabase.from('properties').select('*', { count: 'exact' })

      if (search) {
        query = query.or(
          `address.ilike.%${search}%,parcel_id.ilike.%${search}%,property_name.ilike.%${search}%`
        )
      }

      if (county && county !== 'All') {
        query = query.eq('county', county)
      }

      if (propertyType && propertyType !== 'All') {
        query = query.eq('property_type', propertyType)
      }

      query = query.order(sortField, { ascending: sortAsc })
      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, count, error } = await query

      if (error) throw error

      setProperties(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching properties:', err)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
    setPage(0)
  }

  const handleAddPropertySuccess = (propertyId) => {
    setShowAddModal(false)
    navigate(`/properties/${propertyId}`)
  }

  const propertyTypes = [
    'Residential',
    'Commercial',
    'Industrial',
    'Mixed-Use',
    'Agricultural'
  ]

  const counties = ['Peoria', 'Tazewell', 'Woodford', 'Other']

  const SortHeader = ({ label, field }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        padding: '12px',
        textAlign: field === 'address' ? 'left' : 'center',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        userSelect: 'none'
      }}
    >
      {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Properties</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
              {totalCount} propert{totalCount !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Property
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by address, parcel ID, or name..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(0)
            }}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              width: 280,
              fontSize: 13
            }}
          />

          <select
            value={county}
            onChange={e => {
              setCounty(e.target.value)
              setPage(0)
            }}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              minWidth: '130px'
            }}
          >
            <option value="All">All Counties</option>
            {counties.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={propertyType}
            onChange={e => {
              setPropertyType(e.target.value)
              setPage(0)
            }}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              minWidth: '130px'
            }}
          >
            <option value="All">All Types</option>
            {propertyTypes.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <SortHeader label="Address" field="address" />
                  <SortHeader label="County" field="county" />
                  <SortHeader label="Parcel ID" field="parcel_id" />
                  <SortHeader label="Property Type" field="property_type" />
                  <SortHeader label="Bldg SF" field="total_building_sqft" />
                  <SortHeader label="Tax Bill" field="annual_tax_bill" />
                  <SortHeader label="Tax Year" field="tax_year" />
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, idx) => (
                  <tr
                    key={prop.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#fff',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <td
                      style={{
                        padding: '12px',
                        fontSize: 13,
                        color: '#1e293b',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/properties/${prop.id}`)}
                    >
                      <span style={{ color: '#1e40af', fontWeight: 500 }}>
                        {prop.address || '(No address)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.county || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.parcel_id || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.property_type || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.total_building_sqft ? prop.total_building_sqft.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.annual_tax_bill ? `$${prop.annual_tax_bill.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#1e293b', textAlign: 'center' }}>
                      {prop.tax_year || '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/properties/${prop.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1e40af',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {properties.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: 13 }}>
              No properties found.
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px'
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Showing {properties.length > 0 ? page * pageSize + 1 : 0}–
              {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#1e293b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#1e293b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: (page + 1) * pageSize >= totalCount ? 'not-allowed' : 'pointer',
                  opacity: (page + 1) * pageSize >= totalCount ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <AddPropertyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddPropertySuccess}
      />
    </div>
  )
}

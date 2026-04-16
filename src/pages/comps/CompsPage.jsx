import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt, COUNTIES, PROPERTY_TYPES } from '../../lib/theme'

export default function CompsPage() {
  const { user } = useAuth()
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('All')
  const [propType, setPropType] = useState('All')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const pageSize = 50

  useEffect(() => {
    fetchComps()
  }, [search, county, propType, page])

  async function fetchComps() {
    setLoading(true)
    let query = supabase.from('comps').select('*', { count: 'exact' })
    
    if (search) {
      query = query.or(`address.ilike.%${search}%,parcel_id.ilike.%${search}%`)
    }
    if (county !== 'All') {
      query = query.eq('county', county)
    }
    if (propType !== 'All') {
      query = query.eq('property_type', propType)
    }
    
    const from = page * pageSize
    const to = from + pageSize - 1
    query = query.order('sale_date', { ascending: false }).range(from, to)
    
    const { data, count, error } = await query
    if (error) console.error(error)
    else {
      setComps(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return row
    })
  }

  async function handleImport(file, mappings) {
    if (file.type === 'text/csv') {
      const text = await file.text()
      const rows = parseCSV(text)
      
      // Check for duplicates
      const parcelIds = rows.filter(r => r.parcel_id).map(r => r.parcel_id)
      const { data: existing } = await supabase.from('comps').select('id, parcel_id, sale_date').in('parcel_id', parcelIds)
      const existingKeys = new Set(existing?.map(r => `${r.parcel_id}|${r.sale_date}`) || [])
      
      let imported = 0, duplicates = 0, errors = 0
      const toInsert = []
      
      for (const row of rows) {
        const key = `${row[mappings.parcel_id] || ''}|${row[mappings.sale_date] || ''}`
        if (existingKeys.has(key)) {
          duplicates++
          continue
        }
        
        try {
          const comp = {}
          Object.entries(mappings).forEach(([field, col]) => {
            const value = row[col]
            if (field.includes('sqft') || field.includes('price') || field.includes('rate') || field.includes('income') || field.includes('tax') || field.includes('year_built')) {
              comp[field] = value ? parseFloat(value) : null
            } else if (field === 'sale_date' || field === 'year_built') {
              comp[field] = value || null
            } else {
              comp[field] = value || null
            }
          })
          toInsert.push(comp)
        } catch (e) {
          errors++
        }
      }
      
      if (toInsert.length > 0) {
        const { error } = await supabase.from('comps').insert(toInsert)
        if (!error) imported = toInsert.length
        else errors += toInsert.length
      }
      
      alert(`Import complete: ${imported} imported, ${duplicates} duplicates skipped, ${errors} errors`)
      setShowImportModal(false)
      fetchComps()
    } else {
      alert('XLSX support coming soon. Please use CSV format.')
    }
  }

  async function addComp(formData) {
    const { error } = await supabase.from('comps').insert([formData])
    if (!error) {
      setShowAddModal(false)
      fetchComps()
    } else {
      console.error(error)
    }
  }

  const pageCount = Math.ceil(total / pageSize)
  const canPrevious = page > 0
  const canNext = page < pageCount - 1

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Comparable Sales</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1e293b'
              }}
            >
              Import Comps (Excel/CSV)
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1e40af',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + Add Comp
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '12px' }}>
            <input
              type="text"
              placeholder="Search address or parcel ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <select
              value={county}
              onChange={(e) => { setCounty(e.target.value); setPage(0) }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option>All</option>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={propType}
              onChange={(e) => { setPropType(e.target.value); setPage(0) }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option>All</option>
              {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Address</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>County</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Sale Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Sale Price</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Bldg SF</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Sale$/SF</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Property Type</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Data Source</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
              ) : comps.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No comps found</td></tr>
              ) : (
                comps.map(comp => (
                  <React.Fragment key={comp.id}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.address}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.county}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.sale_date}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>${comp.sales_price ? comp.sales_price.toLocaleString() : '—'}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.total_building_sqft ? comp.total_building_sqft.toLocaleString() : '—'}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>${comp.sales_price_per_sqft || '—'}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.property_type}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{comp.data_source}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e2e8f0',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {expandedId === comp.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === comp.id && (
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td colSpan={9} style={{ padding: '16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Parcel ID</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.parcel_id || '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Year Built</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.year_built || '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Cap Rate</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.cap_rate ? `${comp.cap_rate}%` : '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>GRM</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.grm || '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Gross Income</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>${comp.gross_income ? comp.gross_income.toLocaleString() : '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Net Income</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>${comp.net_income ? comp.net_income.toLocaleString() : '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Occupancy</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.occupancy ? `${comp.occupancy}%` : '—'}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Annual Tax Bill</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>${comp.annual_tax_bill ? comp.annual_tax_bill.toLocaleString() : '—'}</p>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Notes</p>
                              <p style={{ margin: 0, color: '#1e293b' }}>{comp.notes || '—'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!canPrevious}
              style={{
                padding: '8px 12px',
                backgroundColor: canPrevious ? '#e2e8f0' : '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                cursor: canPrevious ? 'pointer' : 'default',
                opacity: canPrevious ? 1 : 0.5
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!canNext}
              style={{
                padding: '8px 12px',
                backgroundColor: canNext ? '#e2e8f0' : '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                cursor: canNext ? 'pointer' : 'default',
                opacity: canNext ? 1 : 0.5
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showAddModal && <AddCompModal onClose={() => setShowAddModal(false)} onAdd={addComp} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
    </div>
  )
}

function AddCompModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({})

  const fields = [
    'parcel_id', 'county', 'address', 'city', 'state', 'property_type',
    'total_building_sqft', 'year_built', 'sale_date', 'sales_price',
    'sales_price_per_sqft', 'price_per_unit', 'cap_rate', 'grm',
    'gross_income', 'net_income', 'occupancy', 'tax_year', 'annual_tax_bill',
    'equalized_assessed_value', 'data_source', 'notes'
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(formData)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '32px', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', width: '90%' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Add Comparable Sale</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {fields.map(field => (
              <div key={field} style={{ gridColumn: field === 'notes' ? '1 / -1' : 'auto' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                {field === 'notes' ? (
                  <textarea
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{
                      width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px',
                      fontFamily: 'inherit', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box'
                    }}
                  />
                ) : field === 'county' ? (
                  <select
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select County</option>
                    {COUNTIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : field === 'property_type' ? (
                  <select
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Type</option>
                    {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.includes('date') ? 'date' : field.includes('sqft') || field.includes('price') || field.includes('rate') || field.includes('income') || field.includes('tax') || field === 'year_built' || field === 'occupancy' ? 'number' : 'text'}
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1',
                borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#1e293b'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}
            >
              Add Comp
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportModal({ onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [mappings, setMappings] = useState({})
  const [headers, setHeaders] = useState([])

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)

    const text = await f.text()
    const lines = text.trim().split('\n')
    const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    setHeaders(fileHeaders)

    const rows = lines.slice(1, 11).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      fileHeaders.forEach((h, i) => { row[h] = values[i] || '' })
      return row
    })
    setPreview(rows)
  }

  const handleMappingChange = (field, column) => {
    setMappings({ ...mappings, [field]: column })
  }

  const handleImport = () => {
    if (!file) {
      alert('Please select a file')
      return
    }
    onImport(file, mappings)
  }

  const requiredFields = ['parcel_id', 'address', 'county', 'sale_date', 'sales_price', 'property_type']

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '32px', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', width: '90%' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Import Comparable Sales</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
            Select CSV or Excel file
          </label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            style={{ display: 'block', marginBottom: '8px' }}
          />
          {file?.name && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Selected: {file.name}</p>}
        </div>

        {headers.length > 0 && (
          <>
            <h3 style={{ margin: '20px 0 12px 0', fontSize: '16px', color: '#1e293b' }}>Column Mapping</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {requiredFields.map(field => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                    {field} *
                  </label>
                  <select
                    value={mappings[field] || ''}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '20px 0 12px 0', fontSize: '16px', color: '#1e293b' }}>Preview (first 10 rows)</h3>
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                    {headers.map(h => (
                      <th key={h} style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {headers.map(h => (
                        <td key={h} style={{ padding: '8px', color: '#1e293b' }}>
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1',
              borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#1e293b'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={headers.length === 0 || requiredFields.some(f => !mappings[f])}
            style={{
              padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
              opacity: headers.length === 0 || requiredFields.some(f => !mappings[f]) ? 0.5 : 1
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt, COUNTIES, PROPERTY_TYPES } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import Pagination from '../../components/shared/Pagination'
import { useViewPreferences } from '../../hooks/useViewPreferences'
import { useResizableColumns } from '../../hooks/useResizableColumns'
import { ExcelImporter } from '../../components/shared/ExcelImporter'

const COMPS_COLUMNS = [
  { key: 'address',              label: 'Address',       visible: true,  defaultWidth: 200 },
  { key: 'county',               label: 'County',        visible: true,  defaultWidth: 110 },
  { key: 'sale_date',            label: 'Sale Date',     visible: true,  defaultWidth: 100 },
  { key: 'sales_price',          label: 'Sale Price',    visible: true,  defaultWidth: 110 },
  { key: 'total_building_sqft',  label: 'Bldg SF',       visible: true,  defaultWidth: 90  },
  { key: 'sales_price_per_sqft', label: 'Sale$/SF',      visible: true,  defaultWidth: 90  },
  { key: 'property_type',        label: 'Prop Type',     visible: true,  defaultWidth: 110 },
  { key: 'data_source',          label: 'Data Source',   visible: true,  defaultWidth: 110 },
  { key: 'verified',             label: 'Verified',      visible: true,  defaultWidth: 90  },
  { key: 'last_modified_by',     label: 'Modified By',   visible: false, defaultWidth: 130 },
  { key: 'updated_at',           label: 'Last Modified', visible: false, defaultWidth: 130 },
]

const MASS_REPLACE_FIELDS = [
  { key: 'county',        label: 'County',        type: 'select', options: COUNTIES },
  { key: 'property_type', label: 'Property Type', type: 'select', options: PROPERTY_TYPES },
  { key: 'data_source',   label: 'Data Source',   type: 'text' },
  { key: 'tax_year',      label: 'Tax Year',      type: 'number' },
]

export default function CompsPage() {
  const { user } = useAuth()
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('All')
  const [propType, setPropType] = useState('All')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [columns, setColumns] = useState(COMPS_COLUMNS)
  const [selectedIds, setSelectedIds] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [activeViewId, setActiveViewId] = useState(null)

  const { views, saveView, deleteView } = useViewPreferences('comps_list')
  const { widths, startResize, resizeHandleStyle } = useResizableColumns(COMPS_COLUMNS)
  const [sortField, setSortField] = useState('sale_date')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(prev => !prev)
    else { setSortField(field); setSortAsc(true) }
    setPage(0)
  }

  const sortInd = (field) => sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''

  const handleLoadView = (viewId, config) => {
    const savedCols = config?.columns || []
    const orderedKeys = savedCols.map(c => c.key)
    const merged = [
      ...orderedKeys.map(k => {
        const base = COMPS_COLUMNS.find(c => c.key === k)
        const saved = savedCols.find(c => c.key === k)
        return base ? { ...base, visible: saved.visible } : null
      }).filter(Boolean),
      ...COMPS_COLUMNS.filter(c => !orderedKeys.includes(c.key)).map(c => ({ ...c, visible: false }))
    ]
    setColumns(merged); setActiveViewId(viewId)
  }

  const handleSaveView = async (name) => {
    const config = { columns: columns.map(c => ({ key: c.key, visible: c.visible })) }
    const saved = await saveView(name, config)
    if (saved) setActiveViewId(saved.id)
  }

  const handleDeleteView = async (viewId) => {
    await deleteView(viewId)
    if (activeViewId === viewId) { setColumns(COMPS_COLUMNS); setActiveViewId(null) }
  }

  const handleColumnsChange = (newCols) => { setColumns(newCols); setActiveViewId(null) }

  useEffect(() => { fetchComps() }, [search, county, propType, page, sortField, sortAsc])

  async function fetchComps() {
    setLoading(true)
    let query = supabase.from('comps').select('*', { count: 'exact' })
    if (search) query = query.or(`address.ilike.%${search}%,parcel_id.ilike.%${search}%`)
    if (county !== 'All') query = query.eq('county', county)
    if (propType !== 'All') query = query.eq('property_type', propType)
    const from = page * pageSize
    query = query.order(sortField, { ascending: sortAsc }).range(from, from + pageSize - 1)
    const { data, count, error } = await query
    if (error) console.error(error)
    else { setComps(data || []); setTotal(count || 0) }
    setLoading(false)
  }

  async function toggleVerified(comp, e) {
    e.stopPropagation()
    const newVal = !comp.verified
    const { error } = await supabase.from('comps').update({ verified: newVal }).eq('id', comp.id)
    if (!error) setComps(prev => prev.map(c => c.id === comp.id ? { ...c, verified: newVal } : c))
  }

  function handleExport() {
    const visibleCols = columns.filter(c => c.visible)
    const header = visibleCols.map(c => c.label).join(',')
    const rows = comps.map(comp =>
      visibleCols.map(c => {
        const v = comp[c.key]
        return v == null ? '' : String(v).replace(/,/g, ';')
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'comps.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleMassReplace({ field, value, ids }) {
    await Promise.all(ids.map(id => supabase.from('comps').update({ [field]: value }).eq('id', id)))
    setSelectedIds([])
    fetchComps()
  }

  async function addComp(formData) {
    const { data, error } = await supabase.from('comps').insert([formData]).select()
    if (!error) {
      setShowAddModal(false)
      if (data?.[0]) {
        setComps(prev => [data[0], ...prev])
        setTotal(prev => prev + 1)
      }
      fetchComps()
    } else {
      console.error(error)
    }
  }

  function toggleSelectAll() {
    setSelectedIds(prev => prev.length === comps.length ? [] : comps.map(c => c.id))
  }
  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const visCol = (key) => columns.find(c => c.key === key)?.visible !== false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Comparable Sales"
        count={total}
        onAdd={() => setShowAddModal(true)}
        addLabel="+ Add Comp"
        onImport={() => setShowImportModal(true)}
        onExport={handleExport}
        columns={columns}
        onColumnsChange={handleColumnsChange}
        selectedIds={selectedIds}
        massReplaceFields={MASS_REPLACE_FIELDS}
        onMassReplace={handleMassReplace}
        savedViews={views}
        activeViewId={activeViewId}
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
      />

      {importResult && (
        <div style={{ background: importResult.startsWith('✓') ? '#dcfce7' : '#fef9c3', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: importResult.startsWith('✓') ? '#166534' : '#854d0e', fontWeight: 500 }}>{importResult}</span>
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search address or parcel ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, width:240 }}
          />
          <select value={county} onChange={e => { setCounty(e.target.value); setPage(0) }} style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, minWidth:130 }}>
            <option value="All">All Counties</option>
            {COUNTIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={propType} onChange={e => { setPropType(e.target.value); setPage(0) }} style={{ padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, minWidth:130 }}>
            <option value="All">All Types</option>
            {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}>
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ ...thStyle({ w: 36, noSort: true }), position: 'relative' }}>
                  <input type="checkbox" checked={selectedIds.length === comps.length && comps.length > 0} onChange={toggleSelectAll} style={{ cursor:'pointer', accentColor:'#1e40af' }} />
                </th>
                {visCol('address') && (
                  <th style={{ ...thStyle({ align: 'left' }), position: 'relative', width: widths['address'] }} onClick={() => handleSort('address')}>
                    Address{sortInd('address')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('address', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('county') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['county'] }} onClick={() => handleSort('county')}>
                    County{sortInd('county')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('county', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('sale_date') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['sale_date'] }} onClick={() => handleSort('sale_date')}>
                    Sale Date{sortInd('sale_date')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('sale_date', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('sales_price') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['sales_price'] }} onClick={() => handleSort('sales_price')}>
                    Sale Price{sortInd('sales_price')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('sales_price', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('total_building_sqft') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['total_building_sqft'] }} onClick={() => handleSort('total_building_sqft')}>
                    Bldg SF{sortInd('total_building_sqft')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('total_building_sqft', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('sales_price_per_sqft') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['sales_price_per_sqft'] }} onClick={() => handleSort('sales_price_per_sqft')}>
                    Sale$/SF{sortInd('sales_price_per_sqft')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('sales_price_per_sqft', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('property_type') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['property_type'] }} onClick={() => handleSort('property_type')}>
                    Prop Type{sortInd('property_type')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('property_type', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('data_source') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['data_source'] }} onClick={() => handleSort('data_source')}>
                    Source{sortInd('data_source')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('data_source', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('verified') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['verified'] }} onClick={() => handleSort('verified')}>
                    Verified{sortInd('verified')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('verified', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('last_modified_by') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['last_modified_by'] }} onClick={() => handleSort('last_modified_by')}>
                    Modified By{sortInd('last_modified_by')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('last_modified_by', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                {visCol('updated_at') && (
                  <th style={{ ...thStyle(), position: 'relative', width: widths['updated_at'] }} onClick={() => handleSort('updated_at')}>
                    Last Modified{sortInd('updated_at')} <span style={resizeHandleStyle} onMouseDown={e => { e.stopPropagation(); startResize('updated_at', e) }} onClick={e => e.stopPropagation()} />
                  </th>
                )}
                <th style={{ ...thStyle({ noSort: true }), width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding:24, textAlign:'center', color:'#64748b' }}>Loading...</td></tr>
              ) : comps.length === 0 ? (
                <tr><td colSpan={12} style={{ padding:24, textAlign:'center', color:'#64748b' }}>No comps found</td></tr>
              ) : comps.map((comp, idx) => (
                <React.Fragment key={comp.id}>
                  <tr
                    style={{ borderBottom:'1px solid #e2e8f0', backgroundColor: selectedIds.includes(comp.id) ? '#eff6ff' : idx%2===0 ? '#f8fafc' : '#fff', cursor:'pointer' }}
                    onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                  >
                    <td style={tdStyle({ center: true })} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(comp.id)} onChange={() => toggleSelect(comp.id)} style={{ cursor:'pointer', accentColor:'#1e40af' }} />
                    </td>
                    {visCol('address') && <td style={tdStyle({ align: 'left' })}><span style={{ color:'#1e40af', fontWeight:500 }}>{comp.address || '—'}</span></td>}
                    {visCol('county') && <td style={tdStyle({ center: true })}>{comp.county || '—'}</td>}
                    {visCol('sale_date') && <td style={tdStyle({ center: true })}>{comp.sale_date || '—'}</td>}
                    {visCol('sales_price') && <td style={tdStyle({ center: true })}>{comp.sales_price ? fmt.currency(comp.sales_price) : '—'}</td>}
                    {visCol('total_building_sqft') && <td style={tdStyle({ center: true })}>{comp.total_building_sqft ? comp.total_building_sqft.toLocaleString() : '—'}</td>}
                    {visCol('sales_price_per_sqft') && <td style={tdStyle({ center: true })}>{comp.sales_price_per_sqft ? `$${comp.sales_price_per_sqft}` : '—'}</td>}
                    {visCol('property_type') && <td style={tdStyle({ center: true })}>{comp.property_type || '—'}</td>}
                    {visCol('data_source') && <td style={tdStyle({ center: true })}>{comp.data_source || '—'}</td>}
                    {visCol('verified') && (
                      <td style={tdStyle({ center: true })} onClick={e=>e.stopPropagation()}>
                        <button
                          onClick={e => toggleVerified(comp, e)}
                          style={{
                            padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700,
                            background: comp.verified ? '#dcfce7' : '#f1f5f9',
                            color: comp.verified ? '#16a34a' : '#94a3b8',
                            transition: 'all 0.15s'
                          }}
                        >
                          {comp.verified ? '✓ Verified' : 'Verify'}
                        </button>
                      </td>
                    )}
                    {visCol('last_modified_by') && <td style={tdStyle({ center: true })}>{comp.last_modified_by || '—'}</td>}
                    {visCol('updated_at')       && <td style={tdStyle({ center: true })}>{comp.updated_at ? new Date(comp.updated_at).toLocaleDateString() : '—'}</td>}
                    <td style={tdStyle({ center: true })}>
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedId(expandedId===comp.id ? null : comp.id) }}
                        style={{ padding:'3px 10px', backgroundColor:'#e2e8f0', border:'1px solid #cbd5e1', borderRadius:6, cursor:'pointer', fontSize:12 }}
                      >
                        {expandedId === comp.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === comp.id && (
                    <tr style={{ backgroundColor:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                      <td colSpan={12} style={{ padding:16 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
                          {[
                            ['Parcel ID', comp.parcel_id],
                            ['Year Built', comp.year_built],
                            ['Cap Rate', comp.cap_rate ? `${comp.cap_rate}%` : null],
                            ['GRM', comp.grm],
                            ['Gross Income', comp.gross_income ? fmt.currency(comp.gross_income) : null],
                            ['Net Income', comp.net_income ? fmt.currency(comp.net_income) : null],
                            ['Occupancy', comp.occupancy ? `${comp.occupancy}%` : null],
                            ['Annual Tax Bill', comp.annual_tax_bill ? fmt.currency(comp.annual_tax_bill) : null],
                            ['EAV', comp.equalized_assessed_value ? fmt.currency(comp.equalized_assessed_value) : null],
                            ['Price/Unit', comp.price_per_unit ? fmt.currency(comp.price_per_unit) : null],
                          ].map(([lbl, val]) => (
                            <div key={lbl}>
                              <p style={{ margin:'0 0 3px 0', fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{lbl}</p>
                              <p style={{ margin:0, fontSize:13, color:'#1e293b' }}>{val || '—'}</p>
                            </div>
                          ))}
                          {comp.notes && (
                            <div style={{ gridColumn:'1 / -1' }}>
                              <p style={{ margin:'0 0 3px 0', fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Notes</p>
                              <p style={{ margin:0, fontSize:13, color:'#1e293b' }}>{comp.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0) }}
      />

      {showAddModal && <AddCompModal onClose={() => setShowAddModal(false)} onAdd={addComp} />}
      {showImportModal && (
        <ExcelImporter
          importType="comps"
          currentUserId={user?.id}
          onClose={() => setShowImportModal(false)}
          onDone={() => { setShowImportModal(false); fetchComps() }}
        />
      )}
    </div>
  )
}

function thStyle({ align, w, noSort } = {}) {
  return {
    padding: '10px 12px', textAlign: align || 'center',
    fontSize: 12, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    userSelect: 'none', whiteSpace: 'nowrap',
    cursor: noSort ? 'default' : 'pointer',
    ...(w ? { width: w } : {})
  }
}
function tdStyle({ center, align } = {}) {
  return { padding: '10px 12px', fontSize: 13, color: '#1e293b', textAlign: center ? 'center' : (align || 'left') }
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
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData) }
  const inp = { width:'100%', padding:'8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }
  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ backgroundColor:'#fff', borderRadius:12, padding:28, maxWidth:600, maxHeight:'90vh', overflowY:'auto', width:'90%' }}>
        <h2 style={{ margin:'0 0 20px 0', color:'#1e293b', fontSize:18 }}>Add Comparable Sale</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {fields.map(field => (
              <div key={field} style={{ gridColumn: field==='notes' ? '1 / -1' : 'auto' }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#64748b', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                  {field.replace(/_/g,' ').replace(/\b\w/g, l=>l.toUpperCase())}
                </label>
                {field === 'notes' ? (
                  <textarea value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} style={{...inp, minHeight:72, fontFamily:'inherit'}} />
                ) : field === 'county' ? (
                  <select value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} style={inp}>
                    <option value="">Select County</option>
                    {COUNTIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                ) : field === 'property_type' ? (
                  <select value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} style={inp}>
                    <option value="">Select Type</option>
                    {PROPERTY_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.includes('date') ? 'date' : (field.includes('sqft')||field.includes('price')||field.includes('rate')||field.includes('income')||field.includes('tax')||field==='year_built'||field==='occupancy') ? 'number' : 'text'}
                    value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} style={inp} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:20, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 16px', backgroundColor:'#e2e8f0', border:'1px solid #cbd5e1', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#1e293b' }}>Cancel</button>
            <button type="submit" style={{ padding:'8px 16px', backgroundColor:'#1e40af', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>Add Comp</button>
          </div>
        </form>
      </div>
    </div>
  )
}


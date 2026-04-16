import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import { useViewPreferences } from '../../hooks/useViewPreferences'

const APPEAL_PROP_TYPES = ['Commercial', 'Industrial', 'Duplex', 'Residential', 'Farmland']

// All columns available for the list view — toggle visibility in the column picker
const ALL_COLUMNS = [
  // ── Core ──────────────────────────────────────────────────────────────────
  { key: 'address',                  label: 'Address',               visible: true,  type: 'link',     align: 'left' },
  { key: 'city',                     label: 'City',                  visible: false, type: 'text' },
  { key: 'county',                   label: 'County',                visible: true,  type: 'text' },
  { key: 'parcel_id',                label: 'Parcel ID',             visible: true,  type: 'mono' },
  { key: 'property_type',            label: 'Property Type',         visible: true,  type: 'text' },
  { key: 'property_subtype',         label: 'Subtype',               visible: false, type: 'text' },
  { key: 'appeal_prop_type',         label: 'Appeal Type',           visible: true,  type: 'badge' },
  { key: 'current_use',              label: 'Current Use',           visible: false, type: 'text' },
  { key: 'zoning',                   label: 'Zoning',                visible: false, type: 'text' },
  // ── Physical ──────────────────────────────────────────────────────────────
  { key: 'total_building_sqft',      label: 'Bldg SF',               visible: true,  type: 'number' },
  { key: 'total_land_acres',         label: 'Land Acres',            visible: false, type: 'number' },
  { key: 'total_land_sqft',          label: 'Land SF',               visible: false, type: 'number' },
  { key: 'num_buildings',            label: '# Buildings',           visible: false, type: 'number' },
  { key: 'num_stories',              label: '# Stories',             visible: false, type: 'number' },
  { key: 'year_built',               label: 'Year Built',            visible: false, type: 'number' },
  { key: 'year_renovated',           label: 'Year Reno.',            visible: false, type: 'number' },
  { key: 'exterior_construction',    label: 'Exterior',              visible: false, type: 'text' },
  { key: 'land_to_bldg_ratio',       label: 'Land/Bldg Ratio',       visible: false, type: 'number' },
  { key: 'sprinkler_system',         label: 'Sprinkler',             visible: false, type: 'text' },
  // ── Units ─────────────────────────────────────────────────────────────────
  { key: 'total_units',              label: 'Total Units',           visible: false, type: 'number' },
  { key: 'num_residential_units',    label: 'Res Units',             visible: false, type: 'number' },
  { key: 'num_commercial_units',     label: 'Comm Units',            visible: false, type: 'number' },
  { key: 'num_parking_spaces',       label: '# Parking',             visible: false, type: 'number' },
  // ── Space Breakdown ───────────────────────────────────────────────────────
  { key: 'residential_sqft',         label: 'Res SF',                visible: false, type: 'number' },
  { key: 'retail_space_sqft',        label: 'Retail SF',             visible: false, type: 'number' },
  { key: 'office_space_sqft',        label: 'Office SF',             visible: false, type: 'number' },
  { key: 'warehouse_sqft',           label: 'Warehouse SF',          visible: false, type: 'number' },
  { key: 'manufacturing_sqft',       label: 'Mfg SF',                visible: false, type: 'number' },
  { key: 'comm_garage_sqft',         label: 'Comm Garage SF',        visible: false, type: 'number' },
  { key: 'vacant_sqft',              label: 'Vacant SF',             visible: false, type: 'number' },
  // ── Tax & Assessment ──────────────────────────────────────────────────────
  { key: 'annual_tax_bill',          label: 'Tax Bill',              visible: true,  type: 'currency' },
  { key: 'tax_year',                 label: 'Tax Year',              visible: true,  type: 'number' },
  { key: 'tax_rate',                 label: 'Tax Rate',              visible: false, type: 'number' },
  { key: 'tax_class',                label: 'Tax Class',             visible: false, type: 'text' },
  { key: 'tax_code',                 label: 'Tax Code',              visible: false, type: 'text' },
  { key: 'total_assessment',         label: 'Total Assessment',      visible: false, type: 'currency' },
  { key: 'land_assessment',          label: 'Land Assessment',       visible: false, type: 'currency' },
  { key: 'bldg_assessment',          label: 'Bldg Assessment',       visible: false, type: 'currency' },
  { key: 'bldg_assessment_per_sqft', label: 'Bldg Asmnt/SF',         visible: false, type: 'currency' },
  { key: 'assessed_bldg_value',      label: 'Assessed Value',        visible: false, type: 'currency' },
  { key: 'tif_value',                label: 'TIF Value',             visible: false, type: 'currency' },
  // ── Sale ──────────────────────────────────────────────────────────────────
  { key: 'sales_price',              label: 'Sale Price',            visible: false, type: 'currency' },
  { key: 'sale_date',                label: 'Sale Date',             visible: false, type: 'date' },
  { key: 'sales_price_per_sqft',     label: 'Sale $/SF',             visible: false, type: 'currency' },
  { key: 'sale_cap_rate',            label: 'Sale Cap Rate',         visible: false, type: 'number' },
  { key: 'sale_grm',                 label: 'Sale GRM',              visible: false, type: 'number' },
  // ── Location ──────────────────────────────────────────────────────────────
  { key: 'state',                    label: 'State',                 visible: false, type: 'text' },
  { key: 'zipcode',                  label: 'Zip',                   visible: false, type: 'text' },
  { key: 'township',                 label: 'Township',              visible: false, type: 'text' },
  { key: 'neighborhood_num',         label: 'Neighborhood #',        visible: false, type: 'text' },
  { key: 'market',                   label: 'Market',                visible: false, type: 'text' },
  { key: 'submarket',                label: 'Submarket',             visible: false, type: 'text' },
  // ── Residential ───────────────────────────────────────────────────────────
  { key: 'num_bedrooms',             label: '# Bedrooms',            visible: false, type: 'number' },
  { key: 'num_full_baths',           label: '# Full Baths',          visible: false, type: 'number' },
  { key: 'num_half_baths',           label: '# Half Baths',          visible: false, type: 'number' },
  { key: 'num_fireplaces',           label: '# Fireplaces',          visible: false, type: 'number' },
  { key: 'total_living_area_sqft',   label: 'Living Area SF',        visible: false, type: 'number' },
  { key: 'basement_sqft',            label: 'Basement SF',           visible: false, type: 'number' },
  { key: 'finished_basement_sqft',   label: 'Fin. Basement SF',      visible: false, type: 'number' },
  { key: 'attached_garage_sqft',     label: 'Att. Garage SF',        visible: false, type: 'number' },
  { key: 'detached_garage_sqft',     label: 'Det. Garage SF',        visible: false, type: 'number' },
  { key: 'grade',                    label: 'Grade',                 visible: false, type: 'text' },
  { key: 'condition',                label: 'Condition',             visible: false, type: 'text' },
  { key: 'style',                    label: 'Style',                 visible: false, type: 'text' },
  // ── Multifamily ───────────────────────────────────────────────────────────
  { key: 'num_0bed_apts',            label: '# Studios',             visible: false, type: 'number' },
  { key: 'num_1bed_apts',            label: '# 1-Beds',              visible: false, type: 'number' },
  { key: 'num_2bed_apts',            label: '# 2-Beds',              visible: false, type: 'number' },
  { key: 'num_3bed_apts',            label: '# 3-Beds',              visible: false, type: 'number' },
  { key: 'num_4bed_apts',            label: '# 4-Beds',              visible: false, type: 'number' },
  // ── Parcel IDs ────────────────────────────────────────────────────────────
  { key: 'parcel_id2',               label: 'Parcel ID 2',           visible: false, type: 'mono' },
  { key: 'parcel_id3',               label: 'Parcel ID 3',           visible: false, type: 'mono' },
  { key: 'parcel_id4',               label: 'Parcel ID 4',           visible: false, type: 'mono' },
  { key: 'parcel_id5',               label: 'Parcel ID 5',           visible: false, type: 'mono' },
  { key: 'misc_parcels',             label: 'Misc Parcels',          visible: false, type: 'text' },
]

const MASS_REPLACE_FIELDS = [
  { key: 'county',           label: 'County',           type: 'select', options: ['Peoria','Tazewell','Woodford','Other'] },
  { key: 'property_type',    label: 'Property Type',    type: 'select', options: ['Residential','Commercial','Industrial','Mixed-Use','Agricultural'] },
  { key: 'appeal_prop_type', label: 'Appeal Prop Type', type: 'select', options: APPEAL_PROP_TYPES },
  { key: 'tax_year',         label: 'Tax Year',         type: 'number' },
  { key: 'state',            label: 'State',            type: 'text' },
]

// ── Render a table cell for a given column ────────────────────────────────
function CellValue({ col, prop, navigate }) {
  const v = prop[col.key]

  if (col.key === 'address') {
    return (
      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/properties/${prop.id}`)}>
        <span style={{ color: '#1e40af', fontWeight: 500 }}>{v || '(No address)'}</span>
        {prop.city && <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 12 }}>{prop.city}</span>}
      </td>
    )
  }

  if (col.key === 'appeal_prop_type') {
    return (
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        {v
          ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>{v}</span>
          : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
      </td>
    )
  }

  let display = '—'
  if (v != null && v !== '') {
    switch (col.type) {
      case 'currency': display = fmt.currency(v); break
      case 'number':   display = typeof v === 'number' ? v.toLocaleString() : v; break
      case 'date':     display = fmt.date(v); break
      default:         display = String(v)
    }
  }

  return (
    <td style={{
      padding: '10px 12px',
      fontSize: 13,
      color: display !== '—' ? '#1e293b' : '#94a3b8',
      textAlign: col.align || 'center',
      fontFamily: col.type === 'mono' ? 'monospace' : undefined,
      whiteSpace: 'nowrap'
    }}>
      {display}
    </td>
  )
}

function AddPropertyModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    parcel_id: '', county: '', address: '', city: '', state: 'IL',
    zipcode: '', property_type: '', appeal_prop_type: ''
  })
  const [loading, setLoading] = useState(false)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    if (!form.parcel_id.trim()) { alert('Parcel ID is required'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('properties').insert([form]).select()
      if (error) throw error
      onSave(data[0].id)
    } catch (err) {
      alert('Error creating property: ' + err.message)
      setLoading(false)
    }
  }

  if (!isOpen) return null
  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 500, borderRadius: '12px 12px 0 0', padding: 24, boxShadow: '0 20px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Add Property</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>Parcel ID *</label><input type="text" value={form.parcel_id} onChange={e => set('parcel_id', e.target.value)} style={inp} placeholder="e.g., 14-001-001" /></div>
          <div><label style={lbl}>County</label>
            <select value={form.county} onChange={e => set('county', e.target.value)} style={inp}>
              <option value="">Select county</option>
              {['Peoria', 'Tazewell', 'Woodford', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Address</label><input type="text" value={form.address} onChange={e => set('address', e.target.value)} style={inp} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><label style={lbl}>City</label><input type="text" value={form.city} onChange={e => set('city', e.target.value)} style={inp} /></div>
            <div style={{ flex: 0.5 }}><label style={lbl}>State</label><input type="text" value={form.state} onChange={e => set('state', e.target.value)} style={inp} /></div>
            <div style={{ flex: 0.6 }}><label style={lbl}>Zip</label><input type="text" value={form.zipcode} onChange={e => set('zipcode', e.target.value)} style={inp} /></div>
          </div>
          <div><label style={lbl}>Property Type</label>
            <select value={form.property_type} onChange={e => set('property_type', e.target.value)} style={inp}>
              <option value="">Select type</option>
              {['Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Agricultural'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Appeal Prop Type</label>
            <select value={form.appeal_prop_type} onChange={e => set('appeal_prop_type', e.target.value)} style={inp}>
              <option value="">Select appeal type</option>
              {APPEAL_PROP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icon / Card view ──────────────────────────────────────────────────────
function PropertyCard({ prop, onClick }) {
  const [hovered, setHovered] = useState(false)
  const typeColor = {
    Residential: '#059669', Commercial: '#1e40af', Industrial: '#7c3aed',
    'Mixed-Use': '#d97706', Agricultural: '#065f46'
  }[prop.property_type] || '#64748b'

  return (
    <div
      onClick={() => onClick(prop.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 10, border: `1px solid ${hovered ? '#93c5fd' : '#e2e8f0'}`,
        padding: '16px', cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: hovered ? '0 4px 16px rgba(30,64,175,0.10)' : '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: 8
      }}
    >
      <div style={{ width: '100%', height: 80, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', lineHeight: 1.3 }}>{prop.address || '(No address)'}</div>
      {prop.city && <div style={{ fontSize: 12, color: '#64748b' }}>{prop.city}, {prop.state}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        {prop.property_type && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: `${typeColor}18`, color: typeColor, fontWeight: 600 }}>{prop.property_type}</span>}
        {prop.appeal_prop_type && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>{prop.appeal_prop_type}</span>}
        {prop.county && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>{prop.county}</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', marginTop: 2 }}>
        {prop.total_building_sqft && <span>{prop.total_building_sqft.toLocaleString()} SF</span>}
        {prop.annual_tax_bill && <span>{fmt.currency(prop.annual_tax_bill)}/yr tax</span>}
      </div>
    </div>
  )
}

// ── Map view ──────────────────────────────────────────────────────────────
function MapView({ properties }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden', position: 'relative', minHeight: 500 }}>
        <iframe title="Property Map" src="https://www.openstreetmap.org/export/embed.html?bbox=-89.9%2C40.5%2C-89.4%2C40.9&layer=mapnik" style={{ width: '100%', height: 500, border: 'none' }} />
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 260, fontSize: 12, color: '#64748b' }}>
          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📍 {properties.length} Properties</div>
          <div>Map shows Peoria area. Full geocoding integration will pin each property address.</div>
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
  const [appealPropType, setAppealPropType] = useState('All')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [columns, setColumns] = useState(ALL_COLUMNS)
  const [selectedIds, setSelectedIds] = useState([])
  const [activeViewId, setActiveViewId] = useState(null)

  // ── Saved list views ────────────────────────────────────────────────────
  const { views: savedViews, saveView, deleteView } = useViewPreferences('property_list')

  const handleLoadView = useCallback((viewId, config) => {
    setActiveViewId(viewId)
    if (config?.columns) {
      // Merge saved column visibility into ALL_COLUMNS (preserves any new cols added later)
      const configMap = Object.fromEntries(config.columns.map(c => [c.key, c]))
      // Reorder by saved order first, then append any columns not in the saved config
      const savedKeys = config.columns.map(c => c.key)
      const reordered = [
        ...config.columns.map(saved => {
          const base = ALL_COLUMNS.find(a => a.key === saved.key)
          return base ? { ...base, visible: saved.visible !== false } : null
        }).filter(Boolean),
        ...ALL_COLUMNS.filter(a => !savedKeys.includes(a.key)).map(a => ({ ...a, visible: false }))
      ]
      setColumns(reordered)
    } else {
      setColumns(ALL_COLUMNS)
    }
  }, [])

  const handleSaveView = useCallback(async (name) => {
    const config = { columns: columns.map(c => ({ key: c.key, visible: c.visible !== false })) }
    const result = await saveView(name, config)
    if (result) setActiveViewId(result.id)
  }, [columns, saveView])

  const handleDeleteView = useCallback(async (viewId) => {
    await deleteView(viewId)
    if (activeViewId === viewId) {
      setActiveViewId(null)
      setColumns(ALL_COLUMNS)
    }
  }, [activeViewId, deleteView])

  const pageSize = 50

  useEffect(() => { fetchProperties() }, [search, county, propertyType, appealPropType, page, sortField, sortAsc])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      let query = supabase.from('properties').select('*', { count: 'exact' })
      if (search) query = query.or(`address.ilike.%${search}%,parcel_id.ilike.%${search}%,property_name.ilike.%${search}%`)
      if (county !== 'All') query = query.eq('county', county)
      if (propertyType !== 'All') query = query.eq('property_type', propertyType)
      if (appealPropType !== 'All') query = query.eq('appeal_prop_type', appealPropType)
      query = query.order(sortField, { ascending: sortAsc })
      query = query.range(page * pageSize, (page + 1) * pageSize - 1)
      const { data, count, error } = await query
      if (error) throw error
      setProperties(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error(err)
      setProperties([])
    } finally { setLoading(false) }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
    setPage(0)
  }

  function handleExport() {
    const visibleCols = columns.filter(c => c.visible)
    const header = visibleCols.map(c => c.label).join(',')
    const rows = properties.map(p =>
      visibleCols.map(c => {
        const v = p[c.key]
        return v == null ? '' : String(v).replace(/,/g, ';')
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'properties.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleMassReplace({ field, value, ids }) {
    const updates = ids.map(id => supabase.from('properties').update({ [field]: value }).eq('id', id))
    await Promise.all(updates)
    setSelectedIds([])
    fetchProperties()
  }

  function toggleSelectAll() {
    if (selectedIds.length === properties.length) setSelectedIds([])
    else setSelectedIds(properties.map(p => p.id))
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const visibleCols = columns.filter(c => c.visible)
  const counties = ['Peoria', 'Tazewell', 'Woodford', 'Other']
  const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Agricultural']

  const SortTh = ({ label, field, align = 'center' }) => (
    <th onClick={() => handleSort(field)} style={{
      padding: '10px 12px', textAlign: align, cursor: 'pointer', fontSize: 12, fontWeight: 600,
      color: sortField === field ? '#1e40af' : '#64748b',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', userSelect: 'none',
      whiteSpace: 'nowrap'
    }}>
      {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Properties"
        count={totalCount}
        onAdd={() => setShowAddModal(true)}
        addLabel="+ Add Property"
        onExport={handleExport}
        columns={columns}
        onColumnsChange={(updated) => { setColumns(updated); setActiveViewId(null) }}
        selectedIds={selectedIds}
        massReplaceFields={MASS_REPLACE_FIELDS}
        onMassReplace={handleMassReplace}
        showViewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        savedViews={savedViews}
        activeViewId={activeViewId}
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
      />

      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by address, parcel ID, or name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', width: 260, fontSize: 13 }}
          />
          <select value={county} onChange={e => { setCounty(e.target.value); setPage(0) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 13, minWidth: 130 }}>
            <option value="All">All Counties</option>
            {counties.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={propertyType} onChange={e => { setPropertyType(e.target.value); setPage(0) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 13, minWidth: 130 }}>
            <option value="All">All Types</option>
            {propertyTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={appealPropType} onChange={e => { setAppealPropType(e.target.value); setPage(0) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 13, minWidth: 160 }}>
            <option value="All">All Appeal Types</option>
            {APPEAL_PROP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {(county !== 'All' || propertyType !== 'All' || appealPropType !== 'All' || search) && (
            <button
              onClick={() => { setSearch(''); setCounty('All'); setPropertyType('All'); setAppealPropType('All'); setPage(0) }}
              style={{ fontSize: 12, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>Loading...</div>
      ) : viewMode === 'map' ? (
        <MapView properties={properties} />
      ) : viewMode === 'icon' ? (
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {properties.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 13 }}>No properties found.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {properties.map(p => <PropertyCard key={p.id} prop={p} onClick={id => navigate(`/properties/${id}`)} />)}
              </div>
          }
          <PaginationRow page={page} setPage={setPage} totalCount={totalCount} pageSize={pageSize} properties={properties} />
        </div>
      ) : (
        /* ── List View ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', width: 36 }}>
                    <input type="checkbox" checked={selectedIds.length === properties.length && properties.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#1e40af' }} />
                  </th>
                  {visibleCols.map(col => (
                    <SortTh key={col.key} label={col.label} field={col.key} align={col.align || 'center'} />
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, idx) => (
                  <tr key={prop.id} style={{ backgroundColor: selectedIds.includes(prop.id) ? '#eff6ff' : idx % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.includes(prop.id)} onChange={() => toggleSelect(prop.id)} style={{ cursor: 'pointer', accentColor: '#1e40af' }} />
                    </td>
                    {visibleCols.map(col => (
                      <CellValue key={col.key} col={col} prop={prop} navigate={navigate} />
                    ))}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button onClick={() => navigate(`/properties/${prop.id}`)} style={{ background: 'none', border: 'none', color: '#1e40af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {properties.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 13 }}>No properties found.</div>}
          <PaginationRow page={page} setPage={setPage} totalCount={totalCount} pageSize={pageSize} properties={properties} />
        </div>
      )}

      <AddPropertyModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={id => { setShowAddModal(false); navigate(`/properties/${id}`) }} />
    </div>
  )
}

function PaginationRow({ page, setPage, totalCount, pageSize, properties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Showing {properties.length > 0 ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ padding: '7px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>Previous</button>
        <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= totalCount} style={{ padding: '7px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: (page + 1) * pageSize >= totalCount ? 'not-allowed' : 'pointer', opacity: (page + 1) * pageSize >= totalCount ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}

export default PropertiesPage

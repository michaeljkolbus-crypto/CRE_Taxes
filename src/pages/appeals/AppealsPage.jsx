import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import Pagination from '../../components/shared/Pagination'
import { useViewPreferences } from '../../hooks/useViewPreferences'
import { useResizableColumns } from '../../hooks/useResizableColumns'

function calcFinancials(appeal) {
  const eavPre   = parseFloat(appeal?.eav_pre)  || 0
  const eavPost  = parseFloat(appeal?.eav_post) || 0
  const taxRate  = parseFloat(appeal?.tax_rate_filing_year) || 0
  const retainer = parseFloat(appeal?.retainer_amount) ?? 500
  const commPct  = parseFloat(appeal?.commission_pct)  ?? 50
  const eavReduction    = Math.max(0, eavPre - eavPost)
  const totalTaxSavings = 2 * eavReduction * (taxRate / 100)
  const commissionAmount = (commPct / 100) * Math.max(0, totalTaxSavings - retainer)
  return { eavReduction, totalTaxSavings, commissionAmount }
}

function getBORBadge(result) {
  const map = { Granted: { bg: '#dcfce7', color: '#166534' }, Denied: { bg: '#fee2e2', color: '#991b1b' }, Partial: { bg: '#fef3c7', color: '#92400e' } }
  return map[result] || { bg: '#f3f4f6', color: '#374151' }
}

const ALL_COLUMNS = [
  { key: 'address',      label: 'Address',       visible: true,  defaultWidth: 200 },
  { key: 'county',       label: 'County',         visible: true,  defaultWidth: 110 },
  { key: 'tax_year',     label: 'Tax Year',       visible: true,  defaultWidth: 90  },
  { key: 'stage',        label: 'Stage',          visible: true,  defaultWidth: 130 },
  { key: 'bor_result',   label: 'BOR Result',     visible: true,  defaultWidth: 110 },
  { key: 'ptab_result',  label: 'PTAB Result',    visible: true,  defaultWidth: 110 },
  { key: 'eav_reduction',label: 'EAV Reduction',  visible: true,  defaultWidth: 120 },
  { key: 'tax_savings',  label: 'Tax Savings',    visible: true,  defaultWidth: 110 },
  { key: 'commission',   label: 'Commission',     visible: true,  defaultWidth: 110 },
  { key: 'verified',         label: 'Verified',      visible: false, defaultWidth: 100 },
  { key: 'last_modified_by', label: 'Modified By',   visible: false, defaultWidth: 130 },
  { key: 'updated_at',       label: 'Last Modified', visible: false, defaultWidth: 130 },
]

export default function AppealsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [appeals, setAppeals] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [searchText, setSearchText] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedYear, setSelectedYear] = useState('')
  const [columns, setColumns] = useState(ALL_COLUMNS)
  const [activeViewId, setActiveViewId] = useState(null)

  const { views, saveView, deleteView } = useViewPreferences('appeals_list')
  const { widths, startResize, resizeHandleStyle } = useResizableColumns(ALL_COLUMNS)

  useEffect(() => { fetchStages(); fetchAppeals() }, [selectedStage, selectedYear, page, pageSize])

  const fetchStages = async () => {
    const { data } = await supabase.from('appeal_stages').select('*').order('sort_order', { ascending: true })
    if (data) setStages(data)
  }

  const fetchAppeals = async () => {
    setLoading(true)
    let query = supabase
      .from('appeals')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type), stage:appeal_stages(id, name, color)', { count: 'exact' })

    if (selectedStage !== 'all') query = query.eq('stage_id', selectedStage)
    if (selectedYear) query = query.eq('tax_year', parseInt(selectedYear))

    const from = page * pageSize
    const to   = from + pageSize - 1
    const { data, count: totalCount, error } = await query.order('created_at', { ascending: false }).range(from, to)

    if (error) console.error(error)
    else { setAppeals(data || []); setCount(totalCount || 0) }
    setLoading(false)
  }

  // ── Saved views ──────────────────────────────────────────────────────────
  const handleLoadView = (viewId, config) => {
    const savedCols = config?.columns || []
    const orderedKeys = savedCols.map(c => c.key)
    const merged = [
      ...orderedKeys.map(k => {
        const base = ALL_COLUMNS.find(c => c.key === k)
        const saved = savedCols.find(c => c.key === k)
        return base ? { ...base, visible: saved.visible } : null
      }).filter(Boolean),
      ...ALL_COLUMNS.filter(c => !orderedKeys.includes(c.key)).map(c => ({ ...c, visible: false }))
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
    if (activeViewId === viewId) { setColumns(ALL_COLUMNS); setActiveViewId(null) }
  }

  const handleColumnsChange = (newCols) => { setColumns(newCols); setActiveViewId(null) }

  // ── Toggle verified ──────────────────────────────────────────────────────
  const toggleVerified = async (appeal, e) => {
    e.stopPropagation()
    const newVal = !appeal.verified
    const { error } = await supabase.from('appeals').update({ verified: newVal }).eq('id', appeal.id)
    if (!error) setAppeals(prev => prev.map(a => a.id === appeal.id ? { ...a, verified: newVal } : a))
  }

  const filtered = appeals.filter(a => {
    const address = a.property?.address?.toLowerCase() || ''
    const parcel  = a.property?.parcel_id?.toLowerCase() || ''
    const s = searchText.toLowerCase()
    return address.includes(s) || parcel.includes(s)
  })

  const visCol = (key) => columns.find(c => c.key === key)?.visible !== false

  const thStyle = (key, extra = {}) => ({
    padding: 12, fontWeight: 600, color: '#1e293b',
    position: 'relative', userSelect: 'none',
    width: widths[key], minWidth: 60,
    ...extra,
  })

  const stageBadge = (stage) => (
    <div style={{ display: 'inline-block', background: stage?.color || '#e2e8f0', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
      {stage?.name}
    </div>
  )

  const resultBadge = (result) => {
    const b = getBORBadge(result)
    return (
      <div style={{ display: 'inline-block', background: b.bg, color: b.color, padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
        {result || '—'}
      </div>
    )
  }

  function handleExport() {
    const visibleCols = ALL_COLUMNS.filter(c => visCol(c.key))
    const header = visibleCols.map(c => c.label).join(',')
    const rows = appeals.map(appeal => {
      const fin = calcFinancials(appeal)
      return visibleCols.map(col => {
        switch(col.key) {
          case 'address':       return appeal.property?.address || ''
          case 'county':        return appeal.property?.county || ''
          case 'tax_year':      return appeal.tax_year || ''
          case 'stage':         return appeal.stage?.name || ''
          case 'bor_result':    return appeal.bor_result || ''
          case 'ptab_result':   return appeal.ptab_result || ''
          case 'eav_reduction': return fin.eavReduction
          case 'tax_savings':   return fin.totalTaxSavings
          case 'commission':    return fin.commissionAmount
          default:              return appeal[col.key] ?? ''
        }
      }).join(',')
    })
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'appeals.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'pipeline') {
    return (
      <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Appeals</h1>
          <button onClick={() => setView('list')}
            style={{ padding: '8px 12px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
            List View
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {stages.map(stage => {
            const stageAppeals = appeals.filter(a => a.stage_id === stage.id)
            return (
              <div key={stage.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: stage.color, borderRadius: '50%' }} />
                  {stage.name} ({stageAppeals.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageAppeals.map(a => {
                    const fin = calcFinancials(a)
                    return (
                      <div key={a.id} onClick={() => navigate(`/appeals/${a.id}`)}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, cursor: 'pointer' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{a.property?.address}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Tax Year: {a.tax_year}</div>
                        <div style={{ fontSize: 12, color: '#1e293b' }}>EAV Reduction: <strong>{fmt.currency(fin.eavReduction)}</strong></div>
                        <div style={{ fontSize: 12, color: '#1e293b' }}>Commission: <strong>{fmt.currency(fin.commissionAmount)}</strong></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Appeals"
        count={count}
        addLabel="Pipeline View"
        onAdd={() => setView('pipeline')}
        onExport={handleExport}
        columns={columns}
        onColumnsChange={handleColumnsChange}
        savedViews={views}
        activeViewId={activeViewId}
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <input type="text" placeholder="Search address or parcel ID" value={searchText} onChange={e => setSearchText(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }} />
          <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setPage(0) }}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }}>
            <option value="all">All Stages</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="text" placeholder="Tax Year" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setPage(0) }}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }} />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {visCol('address') && (
                  <th style={{ ...thStyle('address'), textAlign: 'left' }}>
                    Address <span style={resizeHandleStyle} onMouseDown={e => startResize('address', e)} />
                  </th>
                )}
                {visCol('county') && (
                  <th style={{ ...thStyle('county'), textAlign: 'center' }}>
                    County <span style={resizeHandleStyle} onMouseDown={e => startResize('county', e)} />
                  </th>
                )}
                {visCol('tax_year') && (
                  <th style={{ ...thStyle('tax_year'), textAlign: 'center' }}>
                    Tax Year <span style={resizeHandleStyle} onMouseDown={e => startResize('tax_year', e)} />
                  </th>
                )}
                {visCol('stage') && (
                  <th style={{ ...thStyle('stage'), textAlign: 'center' }}>
                    Stage <span style={resizeHandleStyle} onMouseDown={e => startResize('stage', e)} />
                  </th>
                )}
                {visCol('bor_result') && (
                  <th style={{ ...thStyle('bor_result'), textAlign: 'center' }}>
                    BOR Result <span style={resizeHandleStyle} onMouseDown={e => startResize('bor_result', e)} />
                  </th>
                )}
                {visCol('ptab_result') && (
                  <th style={{ ...thStyle('ptab_result'), textAlign: 'center' }}>
                    PTAB Result <span style={resizeHandleStyle} onMouseDown={e => startResize('ptab_result', e)} />
                  </th>
                )}
                {visCol('eav_reduction') && (
                  <th style={{ ...thStyle('eav_reduction'), textAlign: 'center' }}>
                    EAV Reduction <span style={resizeHandleStyle} onMouseDown={e => startResize('eav_reduction', e)} />
                  </th>
                )}
                {visCol('tax_savings') && (
                  <th style={{ ...thStyle('tax_savings'), textAlign: 'center' }}>
                    Tax Savings <span style={resizeHandleStyle} onMouseDown={e => startResize('tax_savings', e)} />
                  </th>
                )}
                {visCol('commission') && (
                  <th style={{ ...thStyle('commission'), textAlign: 'center' }}>
                    Commission <span style={resizeHandleStyle} onMouseDown={e => startResize('commission', e)} />
                  </th>
                )}
                {visCol('verified') && (
                  <th style={{ ...thStyle('verified'), textAlign: 'center' }}>
                    Verified <span style={resizeHandleStyle} onMouseDown={e => startResize('verified', e)} />
                  </th>
                )}
                {visCol('last_modified_by') && (
                  <th style={{ ...thStyle('last_modified_by'), textAlign: 'center' }}>
                    Modified By <span style={resizeHandleStyle} onMouseDown={e => startResize('last_modified_by', e)} />
                  </th>
                )}
                {visCol('updated_at') && (
                  <th style={{ ...thStyle('updated_at'), textAlign: 'center' }}>
                    Last Modified <span style={resizeHandleStyle} onMouseDown={e => startResize('updated_at', e)} />
                  </th>
                )}
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b', width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No appeals found</td></tr>
              ) : (
                filtered.map((appeal, idx) => {
                  const fin = calcFinancials(appeal)
                  const bg  = idx % 2 === 0 ? '#fff' : '#f8fafc'
                  return (
                    <tr key={appeal.id} style={{ background: bg, borderBottom: '1px solid #e2e8f0' }}>
                      {visCol('address') && (
                        <td style={{ padding: 12, color: '#1e293b' }}>
                          <Link to={`/properties/${appeal.property?.id}`} style={{ color: '#1e40af', textDecoration: 'none' }}>
                            {appeal.property?.address}
                          </Link>
                        </td>
                      )}
                      {visCol('county')        && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{appeal.property?.county}</td>}
                      {visCol('tax_year')      && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{appeal.tax_year}</td>}
                      {visCol('stage')         && <td style={{ padding: 12, textAlign: 'center' }}>{stageBadge(appeal.stage)}</td>}
                      {visCol('bor_result')    && <td style={{ padding: 12, textAlign: 'center' }}>{resultBadge(appeal.bor_result)}</td>}
                      {visCol('ptab_result')   && <td style={{ padding: 12, textAlign: 'center' }}>{resultBadge(appeal.ptab_result)}</td>}
                      {visCol('eav_reduction') && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{fmt.currency(fin.eavReduction)}</td>}
                      {visCol('tax_savings')   && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{fmt.currency(fin.totalTaxSavings)}</td>}
                      {visCol('commission')    && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b', fontWeight: 600 }}>{fmt.currency(fin.commissionAmount)}</td>}
                      {visCol('verified') && (
                        <td style={{ padding: 12, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button onClick={e => toggleVerified(appeal, e)}
                            style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              background: appeal.verified ? '#dcfce7' : '#f1f5f9', color: appeal.verified ? '#16a34a' : '#94a3b8' }}>
                            {appeal.verified ? '✓ Verified' : 'Verify'}
                          </button>
                        </td>
                      )}
                      {visCol('last_modified_by') && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{appeal.last_modified_by || '—'}</td>}
                      {visCol('updated_at')       && <td style={{ padding: 12, textAlign: 'center', color: '#1e293b' }}>{appeal.updated_at ? new Date(appeal.updated_at).toLocaleDateString() : '—'}</td>}
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button onClick={() => navigate(`/appeals/${appeal.id}`)}
                          style={{ padding: '4px 8px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <Pagination
        total={count}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0) }}
      />
    </div>
  )
}

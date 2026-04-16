import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import { useViewPreferences } from '../../hooks/useViewPreferences'

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
  { key: 'address',      label: 'Address',       visible: true  },
  { key: 'county',       label: 'County',         visible: true  },
  { key: 'tax_year',     label: 'Tax Year',       visible: true  },
  { key: 'stage',        label: 'Stage',          visible: true  },
  { key: 'bor_result',   label: 'BOR Result',     visible: true  },
  { key: 'ptab_result',  label: 'PTAB Result',    visible: true  },
  { key: 'eav_reduction',label: 'EAV Reduction',  visible: true  },
  { key: 'tax_savings',  label: 'Tax Savings',    visible: true  },
  { key: 'commission',   label: 'Commission',     visible: true  },
  { key: 'verified',         label: 'Verified',      visible: false },
  { key: 'last_modified_by', label: 'Modified By',   visible: false },
  { key: 'updated_at',       label: 'Last Modified', visible: false },
]

export default function AppealsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [appeals, setAppeals] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })
  const [searchText, setSearchText] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedYear, setSelectedYear] = useState('')
  const [columns, setColumns] = useState(ALL_COLUMNS)
  const [activeViewId, setActiveViewId] = useState(null)

  const { views, saveView, deleteView } = useViewPreferences('appeals_list')

  useEffect(() => { fetchStages(); fetchAppeals() }, [selectedStage, selectedYear, pagination.page])

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

    const from = (pagination.page - 1) * pagination.pageSize
    const to   = from + pagination.pageSize - 1
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

  const totalPages = Math.ceil(count / pagination.pageSize)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Appeals"
        count={count}
        addLabel="Pipeline View"
        onAdd={() => setView('pipeline')}
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
          <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setPagination({ ...pagination, page: 1 }) }}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }}>
            <option value="all">All Stages</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="text" placeholder="Tax Year" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setPagination({ ...pagination, page: 1 }) }}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }} />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {visCol('address')       && <th style={{ padding: 12, textAlign: 'left',   fontWeight: 600, color: '#1e293b' }}>Address</th>}
                {visCol('county')        && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>County</th>}
                {visCol('tax_year')      && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Tax Year</th>}
                {visCol('stage')         && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Stage</th>}
                {visCol('bor_result')    && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>BOR Result</th>}
                {visCol('ptab_result')   && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>PTAB Result</th>}
                {visCol('eav_reduction') && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>EAV Reduction</th>}
                {visCol('tax_savings')   && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Tax Savings</th>}
                {visCol('commission')    && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Commission</th>}
                {visCol('verified')         && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Verified</th>}
                {visCol('last_modified_by') && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Modified By</th>}
                {visCol('updated_at')       && <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Last Modified</th>}
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>Actions</th>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <button disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              style={{ padding: '6px 12px', background: pagination.page === 1 ? '#e2e8f0' : '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              Previous
            </button>
            <span style={{ color: '#64748b', fontSize: 12 }}>Page {pagination.page} of {totalPages}</span>
            <button disabled={pagination.page === totalPages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              style={{ padding: '6px 12px', background: pagination.page === totalPages ? '#e2e8f0' : '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: pagination.page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import { useViewPreferences } from '../../hooks/useViewPreferences'
import { ExcelImporter } from '../../components/shared/ExcelImporter'

const PAGE_SIZE = 50

const ALL_COLUMNS = [
  { key: 'company_name',     label: 'Company Name',  visible: true  },
  { key: 'company_type',     label: 'Type',           visible: true  },
  { key: 'company_phone',    label: 'Phone',          visible: true  },
  { key: 'city',             label: 'City',           visible: true  },
  { key: 'company_website',  label: 'Website',        visible: true  },
  { key: 'verified',         label: 'Verified',       visible: false },
  { key: 'last_modified_by', label: 'Modified By',    visible: false },
  { key: 'updated_at',       label: 'Last Modified',  visible: false },
]

export default function CompaniesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [columns, setColumns] = useState(ALL_COLUMNS)
  const [activeViewId, setActiveViewId] = useState(null)
  const [form, setForm] = useState({
    company_name: '', company_type: '', company_phone: '', city: '', state: 'IL'
  })

  const { views, saveView, deleteView } = useViewPreferences('companies_list')

  useEffect(() => { fetchCompanies() }, [page, search])

  const fetchCompanies = async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    let query = supabase.from('companies').select('*', { count: 'exact' })
    if (search) query = query.or(`company_name.ilike.%${search}%,city.ilike.%${search}%`)
    query = query.order('company_name', { ascending: true }).range(from, to)
    const { data, count, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setCompanies(data || []); setTotal(count || 0); setLoading(false)
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

  // ── Toggle verified inline ───────────────────────────────────────────────
  const toggleVerified = async (company, e) => {
    e.stopPropagation()
    const newVal = !company.verified
    const { error } = await supabase.from('companies').update({ verified: newVal }).eq('id', company.id)
    if (!error) setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, verified: newVal } : c))
  }

  const handleAddCompany = async () => {
    if (!form.company_name.trim()) { alert('Company name is required'); return }
    const { data, error } = await supabase.from('companies').insert([{ ...form, owner_user_id: user.id }]).select()
    if (error) { console.error(error); alert('Failed to create company'); return }
    const newId = data[0].id
    setForm({ company_name: '', company_type: '', company_phone: '', city: '', state: 'IL' })
    setShowModal(false)
    navigate(`/companies/${newId}`)
  }

  function handleExport() {
    const visibleCols = columns.filter(c => c.visible)
    const header = visibleCols.map(c => c.label).join(',')
    const rows = companies.map(company =>
      visibleCols.map(col => {
        const v = company[col.key]; return v == null ? '' : String(v).replace(/,/g, ';')
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'companies.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const visCol = (key) => columns.find(c => c.key === key)?.visible !== false
  const fromRow = page * PAGE_SIZE + 1
  const toRow   = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Companies"
        count={total}
        onAdd={() => setShowModal(true)}
        addLabel="+ Add Company"
        onImport={() => setShowImport(true)}
        onExport={handleExport}
        selectedIds={selectedIds}
        columns={columns}
        onColumnsChange={handleColumnsChange}
        savedViews={views}
        activeViewId={activeViewId}
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
      />
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px' }}>
        <input type="text" placeholder="Search by company name or city..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ border:'1px solid #d1d5db', borderRadius:8, padding:'6px 12px', width:280, fontSize:13 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
              <tr>
                {visCol('company_name')    && <th style={{ ...fmt.th, textAlign: 'left', padding: '12px 16px' }}>Company Name</th>}
                {visCol('company_type')    && <th style={{ ...fmt.th, padding: '12px 16px' }}>Type</th>}
                {visCol('company_phone')   && <th style={{ ...fmt.th, padding: '12px 16px' }}>Phone</th>}
                {visCol('city')            && <th style={{ ...fmt.th, padding: '12px 16px' }}>City</th>}
                {visCol('company_website') && <th style={{ ...fmt.th, padding: '12px 16px' }}>Website</th>}
                {visCol('verified')         && <th style={{ ...fmt.th, padding: '12px 16px' }}>Verified</th>}
                {visCol('last_modified_by') && <th style={{ ...fmt.th, padding: '12px 16px' }}>Modified By</th>}
                {visCol('updated_at')       && <th style={{ ...fmt.th, padding: '12px 16px' }}>Last Modified</th>}
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, idx) => (
                <tr key={company.id}
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onClick={() => navigate(`/companies/${company.id}`)}>
                  {visCol('company_name')    && <td style={{ ...fmt.td, textAlign: 'left', padding: '12px 16px' }}>{company.company_name}</td>}
                  {visCol('company_type')    && <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.company_type || '—'}</td>}
                  {visCol('company_phone')   && <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.company_phone || '—'}</td>}
                  {visCol('city')            && <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.city || '—'}</td>}
                  {visCol('company_website') && (
                    <td style={{ ...fmt.td, padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      {company.company_website ? (
                        <a href={company.company_website} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#1e40af', textDecoration: 'none', fontSize: 12 }}>Visit</a>
                      ) : '—'}
                    </td>
                  )}
                  {visCol('verified') && (
                    <td style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button onClick={e => toggleVerified(company, e)}
                        style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: company.verified ? '#dcfce7' : '#f1f5f9', color: company.verified ? '#16a34a' : '#94a3b8' }}>
                        {company.verified ? '✓ Verified' : 'Verify'}
                      </button>
                    </td>
                  )}
                  {visCol('last_modified_by') && <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.last_modified_by || '—'}</td>}
                  {visCol('updated_at')       && <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.updated_at ? new Date(company.updated_at).toLocaleDateString() : '—'}</td>}
                  <td style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/companies/${company.id}`)}
                      style={{ padding: '4px 8px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, fontSize:12, color:'#64748b' }}>
          <span>{total > 0 ? `Showing ${fromRow}-${toRow} of ${total} records` : 'No records'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              style={{ padding: '6px 12px', backgroundColor: page === 0 ? '#e2e8f0' : '#1e40af', color: page === 0 ? '#64748b' : '#fff', border: 'none', borderRadius: 4, cursor: page === 0 ? 'default' : 'pointer', fontSize: 12 }}>
              Previous
            </button>
            <button onClick={() => setPage(page + 1)} disabled={toRow >= total}
              style={{ padding: '6px 12px', backgroundColor: toRow >= total ? '#e2e8f0' : '#1e40af', color: toRow >= total ? '#64748b' : '#fff', border: 'none', borderRadius: 4, cursor: toRow >= total ? 'default' : 'pointer', fontSize: 12 }}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, maxWidth: 500, width: '90%' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Add Company</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Company Name *</label>
              <input type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Company Type</label>
              <input type="text" value={form.company_type} onChange={e => setForm({ ...form, company_type: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Company Phone</label>
              <input type="text" value={form.company_phone} onChange={e => setForm({ ...form, company_phone: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>City</label>
                <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>State</label>
                <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleAddCompany}
                style={{ padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ExcelImporter
          importType="companies"
          currentUserId={user?.id}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchCompanies() }}
        />
      )}
    </div>
  )
}

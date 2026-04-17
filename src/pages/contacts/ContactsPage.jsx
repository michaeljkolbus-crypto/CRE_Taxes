import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'
import RecordToolbar from '../../components/shared/RecordToolbar'
import Pagination from '../../components/shared/Pagination'
import { useViewPreferences } from '../../hooks/useViewPreferences'
import { useResizableColumns } from '../../hooks/useResizableColumns'
import { ExcelImporter } from '../../components/shared/ExcelImporter'
import { hexToRgba } from '../../components/shared/TagInput'

const DEFAULT_PAGE_SIZE = 50

const ALL_COLUMNS = [
  { key: 'full_name',        label: 'Name',           visible: true,  defaultWidth: 180 },
  { key: 'company_name',     label: 'Company',        visible: true,  defaultWidth: 160 },
  { key: 'main_phone',       label: 'Phone',          visible: true,  defaultWidth: 140 },
  { key: 'email_address',    label: 'Email',          visible: true,  defaultWidth: 190 },
  { key: 'contact_type',     label: 'Contact Type',   visible: true,  defaultWidth: 130 },
  { key: 'city',             label: 'City',           visible: true,  defaultWidth: 120 },
  { key: 'title',            label: 'Title',          visible: false, defaultWidth: 140 },
  { key: 'source',           label: 'Source',         visible: false, defaultWidth: 120 },
  { key: 'contact_groups',   label: 'Groups',         visible: false, defaultWidth: 160 },
  { key: 'segments',         label: 'Segments',       visible: false, defaultWidth: 140 },
  { key: 'linkedin_url',     label: 'LinkedIn',       visible: false, defaultWidth: 90  },
  { key: 'verified',         label: 'Verified',       visible: false, defaultWidth: 100 },
  { key: 'last_modified_by', label: 'Modified By',    visible: false, defaultWidth: 130 },
  { key: 'updated_at',       label: 'Last Modified',  visible: false, defaultWidth: 130 },
]

export default function ContactsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [columns, setColumns] = useState(ALL_COLUMNS)
  const [activeViewId, setActiveViewId] = useState(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email_address: '',
    main_phone: '', cell_phone: '', contact_type: '', city: '', state: 'IL'
  })

  const { views, saveView, deleteView } = useViewPreferences('contacts_list')
  const { widths, startResize, resizeHandleStyle } = useResizableColumns(ALL_COLUMNS)
  const [groupDefs, setGroupDefs] = useState([])

  useEffect(() => { fetchContacts() }, [page, pageSize, search])

  useEffect(() => {
    supabase
      .from('contact_group_definitions')
      .select('name, color')
      .order('name')
      .then(({ data }) => setGroupDefs(data || []))
  }, [])

  const fetchContacts = async () => {
    setLoading(true)
    const from = page * pageSize
    const to   = from + pageSize - 1
    let query = supabase.from('contacts').select('*, company:companies(id, company_name)', { count: 'exact' })
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email_address.ilike.%${search}%,main_phone.ilike.%${search}%`)
    }
    query = query.order('last_name', { ascending: true }).range(from, to)
    const { data, count, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setContacts(data || []); setTotal(count || 0); setLoading(false)
  }

  // ── Saved views ─────────────────────────────────────────────────────────
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
    setColumns(merged)
    setActiveViewId(viewId)
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

  const handleColumnsChange = (newCols) => {
    setColumns(newCols)
    setActiveViewId(null)
  }

  // ── Toggle verified inline ────────────────────────────────────────────
  const toggleVerified = async (contact, e) => {
    e.stopPropagation()
    const newVal = !contact.verified
    const { error } = await supabase.from('contacts').update({ verified: newVal }).eq('id', contact.id)
    if (!error) setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, verified: newVal } : c))
  }

  const handleAddContact = async () => {
    if (!form.first_name.trim()) { alert('First name is required'); return }
    const { data, error } = await supabase.from('contacts').insert([{ ...form, owner_user_id: user.id }]).select()
    if (error) { console.error(error); alert('Failed to create contact'); return }
    const newId = data[0].id
    setForm({ first_name: '', last_name: '', email_address: '', main_phone: '', cell_phone: '', contact_type: '', city: '', state: 'IL' })
    setShowModal(false)
    navigate(`/contacts/${newId}`)
  }

  function handleExport() {
    const visibleCols = columns.filter(c => c.visible)
    const header = visibleCols.map(c => c.label).join(',')
    const rows = contacts.map(contact =>
      visibleCols.map(col => {
        if (col.key === 'full_name') return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        if (col.key === 'company_name') return contact.company?.company_name || ''
        const v = contact[col.key]
        return v == null ? '' : String(v).replace(/,/g, ';')
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const visCol = (key) => columns.find(c => c.key === key)?.visible !== false

  const thStyle = (key, extra = {}) => ({
    ...fmt.th,
    padding: '12px 16px',
    position: 'relative',
    width: widths[key],
    minWidth: 60,
    userSelect: 'none',
    ...extra,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Contacts"
        count={total}
        onAdd={() => setShowModal(true)}
        addLabel="+ Add Contact"
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
        <input type="text" placeholder="Search by name, email, or phone..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ border:'1px solid #d1d5db', borderRadius:8, padding:'6px 12px', width:280, fontSize:13 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
              <tr>
                {visCol('full_name') && (
                  <th style={{ ...thStyle('full_name'), textAlign: 'left' }}>
                    Name <span style={resizeHandleStyle} onMouseDown={e => startResize('full_name', e)} />
                  </th>
                )}
                {visCol('company_name') && (
                  <th style={thStyle('company_name')}>
                    Company <span style={resizeHandleStyle} onMouseDown={e => startResize('company_name', e)} />
                  </th>
                )}
                {visCol('main_phone') && (
                  <th style={thStyle('main_phone')}>
                    Phone <span style={resizeHandleStyle} onMouseDown={e => startResize('main_phone', e)} />
                  </th>
                )}
                {visCol('email_address') && (
                  <th style={thStyle('email_address')}>
                    Email <span style={resizeHandleStyle} onMouseDown={e => startResize('email_address', e)} />
                  </th>
                )}
                {visCol('contact_type') && (
                  <th style={thStyle('contact_type')}>
                    Contact Type <span style={resizeHandleStyle} onMouseDown={e => startResize('contact_type', e)} />
                  </th>
                )}
                {visCol('city') && (
                  <th style={thStyle('city')}>
                    City <span style={resizeHandleStyle} onMouseDown={e => startResize('city', e)} />
                  </th>
                )}
                {visCol('title') && (
                  <th style={thStyle('title')}>
                    Title <span style={resizeHandleStyle} onMouseDown={e => startResize('title', e)} />
                  </th>
                )}
                {visCol('source') && (
                  <th style={thStyle('source')}>
                    Source <span style={resizeHandleStyle} onMouseDown={e => startResize('source', e)} />
                  </th>
                )}
                {visCol('contact_groups') && (
                  <th style={thStyle('contact_groups')}>
                    Groups <span style={resizeHandleStyle} onMouseDown={e => startResize('contact_groups', e)} />
                  </th>
                )}
                {visCol('segments') && (
                  <th style={thStyle('segments')}>
                    Segments <span style={resizeHandleStyle} onMouseDown={e => startResize('segments', e)} />
                  </th>
                )}
                {visCol('linkedin_url') && (
                  <th style={thStyle('linkedin_url')}>
                    LinkedIn <span style={resizeHandleStyle} onMouseDown={e => startResize('linkedin_url', e)} />
                  </th>
                )}
                {visCol('verified') && (
                  <th style={thStyle('verified')}>
                    Verified <span style={resizeHandleStyle} onMouseDown={e => startResize('verified', e)} />
                  </th>
                )}
                {visCol('last_modified_by') && (
                  <th style={thStyle('last_modified_by')}>
                    Modified By <span style={resizeHandleStyle} onMouseDown={e => startResize('last_modified_by', e)} />
                  </th>
                )}
                {visCol('updated_at') && (
                  <th style={thStyle('updated_at')}>
                    Last Modified <span style={resizeHandleStyle} onMouseDown={e => startResize('updated_at', e)} />
                  </th>
                )}
                <th style={{ ...fmt.th, width: 80, padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, idx) => (
                <tr key={contact.id}
                  style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onClick={() => navigate(`/contacts/${contact.id}`)}>
                  {visCol('full_name')     && <td style={{ ...fmt.td, textAlign: 'left', padding: '12px 16px' }}>{contact.first_name} {contact.last_name}</td>}
                  {visCol('company_name')  && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.company?.company_name || '—'}</td>}
                  {visCol('main_phone')    && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.main_phone || '—'}</td>}
                  {visCol('email_address') && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.email_address || '—'}</td>}
                  {visCol('contact_type')  && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.contact_type || '—'}</td>}
                  {visCol('city')          && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.city || '—'}</td>}
                  {visCol('title')         && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.title || '—'}</td>}
                  {visCol('source')        && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.source || '—'}</td>}
                  {visCol('contact_groups') && (
                    <td style={{ ...fmt.td, padding: '10px 16px' }}>
                      {(contact.contact_groups || []).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(contact.contact_groups || []).map((tag, i) => {
                            const def = groupDefs.find(g => g.name.toLowerCase() === tag.toLowerCase())
                            const color = def?.color || '#64748b'
                            return (
                              <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '1px 8px', borderRadius: 99,
                                background: hexToRgba(color, 0.12), color,
                                border: `1px solid ${hexToRgba(color, 0.3)}`,
                                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                              }}>
                                #{tag}
                              </span>
                            )
                          })}
                        </div>
                      ) : '—'}
                    </td>
                  )}
                  {visCol('segments') && <td style={{ ...fmt.td, padding: '12px 16px' }}>{(contact.segments || []).join(', ') || '—'}</td>}
                  {visCol('linkedin_url')  && <td style={{ ...fmt.td, padding: '12px 16px' }}>
                    {contact.linkedin_url
                      ? <a href={contact.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#1e40af', fontSize: 12 }}>View</a>
                      : '—'}
                  </td>}
                  {visCol('verified') && (
                    <td style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button onClick={e => toggleVerified(contact, e)}
                        style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: contact.verified ? '#dcfce7' : '#f1f5f9', color: contact.verified ? '#16a34a' : '#94a3b8' }}>
                        {contact.verified ? '✓ Verified' : 'Verify'}
                      </button>
                    </td>
                  )}
                  {visCol('last_modified_by') && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.last_modified_by || '—'}</td>}
                  {visCol('updated_at')       && <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : '—'}</td>}
                  <td style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/contacts/${contact.id}`)}
                      style={{ padding: '4px 8px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0) }}
      />

      {/* Add Contact Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, maxWidth: 500, width: '90%' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Add Contact</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>First Name *</label>
                <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Last Name</label>
                <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email_address} onChange={e => setForm({ ...form, email_address: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Main Phone</label>
                <input type="text" value={form.main_phone} onChange={e => setForm({ ...form, main_phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Cell Phone</label>
                <input type="text" value={form.cell_phone} onChange={e => setForm({ ...form, cell_phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>Contact Type</label>
                <input type="text" value={form.contact_type} onChange={e => setForm({ ...form, contact_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>City</label>
                <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleAddContact}
                style={{ padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Create Contact
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ExcelImporter
          importType="contacts"
          currentUserId={user?.id}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchContacts() }}
        />
      )}
    </div>
  )
}

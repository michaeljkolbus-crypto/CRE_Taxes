import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

const PAGE_SIZE = 50

export default function CompaniesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    company_type: '',
    company_phone: '',
    city: '',
    state: 'IL'
  })

  useEffect(() => {
    fetchCompanies()
  }, [page, search])

  const fetchCompanies = async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase.from('companies').select('*', { count: 'exact' })
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,city.ilike.%${search}%`)
    }
    query = query.order('company_name', { ascending: true }).range(from, to)

    const { data, count, error } = await query
    if (error) {
      console.error('Error fetching companies:', error)
      setLoading(false)
      return
    }

    setCompanies(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const handleAddCompany = async () => {
    if (!form.company_name.trim()) {
      alert('Company name is required')
      return
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{ ...form, owner_user_id: user.id }])
      .select()

    if (error) {
      console.error('Error creating company:', error)
      alert('Failed to create company')
      return
    }

    const newId = data[0].id
    setForm({
      company_name: '',
      company_type: '',
      company_phone: '',
      city: '',
      state: 'IL'
    })
    setShowModal(false)
    navigate(`/companies/${newId}`)
  }

  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ ...fmt.h1, margin: 0 }}>
            Companies ({total})
          </h1>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Add Company
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by company name or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ ...fmt.th, textAlign: 'left', padding: '12px 16px' }}>Company Name</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Type</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Phone</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>City</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Website</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, idx) => (
                <tr
                  key={company.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <td style={{ ...fmt.td, textAlign: 'left', padding: '12px 16px' }}>
                    {company.company_name}
                  </td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.company_type || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.company_phone || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{company.city || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>
                    {company.company_website ? (
                      <a
                        href={company.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#1e40af',
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/companies/${company.id}`)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1e40af',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
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

        {/* Pagination */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b'
          }}
        >
          <span>
            {total > 0 ? `Showing ${from}-${to} of ${total} records` : 'No records'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 12px',
                backgroundColor: page === 0 ? '#e2e8f0' : '#1e40af',
                color: page === 0 ? '#64748b' : '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: page === 0 ? 'default' : 'pointer',
                fontSize: '12px'
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={to >= total}
              style={{
                padding: '6px 12px',
                backgroundColor: to >= total ? '#e2e8f0' : '#1e40af',
                color: to >= total ? '#64748b' : '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: to >= total ? 'default' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              Add Company
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                Company Name *
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                Company Type
              </label>
              <input
                type="text"
                value={form.company_type}
                onChange={(e) => setForm({ ...form, company_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                Company Phone
              </label>
              <input
                type="text"
                value={form.company_phone}
                onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompany}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

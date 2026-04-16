import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

export default function CompanyDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [id])

  const fetchCompany = async () => {
    setLoading(true)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (companyError) {
      console.error('Error fetching company:', companyError)
      setLoading(false)
      return
    }

    setCompany(companyData)
    setForm(companyData)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('companies')
      .update(form)
      .eq('id', id)

    if (error) {
      console.error('Error updating company:', error)
      alert('Failed to save company')
      setSaving(false)
      return
    }

    setCompany(form)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this company?')) return

    const { error } = await supabase.from('companies').delete().eq('id', id)

    if (error) {
      console.error('Error deleting company:', error)
      alert('Failed to delete company')
      return
    }

    navigate('/companies')
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
  }

  if (!company) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Company not found</div>
  }

  const isAdmin = true // Placeholder, replace with actual admin check

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <Link
            to="/companies"
            style={{
              marginRight: '16px',
              color: '#1e40af',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Companies
          </Link>
          <h1 style={{ ...fmt.h1, margin: 0, flex: 1 }}>
            {form.company_name}
          </h1>
          {form.company_type && (
            <span
              style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: '500'
              }}
            >
              {form.company_type}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
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
                Edit
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Delete
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: saving ? 0.6 : 1
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setForm(company)
                  setEditing(false)
                }}
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
            </>
          )}
        </div>

        {/* Main content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Left column */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Company Name
              </label>
              {editing ? (
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
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.company_name || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Company Type
              </label>
              {editing ? (
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
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.company_type || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={form.email_address}
                  onChange={(e) => setForm({ ...form, email_address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.email_address || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Phone
              </label>
              {editing ? (
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
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.company_phone || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Website
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.company_website}
                  onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>
                  {form.company_website ? (
                    <a href={form.company_website} target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af' }}>
                      {form.company_website}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Address
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.address || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Unit/Suite
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.unit_suite}
                  onChange={(e) => setForm({ ...form, unit_suite: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.unit_suite || '—'}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  City
                </label>
                {editing ? (
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
                ) : (
                  <p style={{ ...fmt.p, margin: 0 }}>{form.city || '—'}</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                  State
                </label>
                {editing ? (
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
                ) : (
                  <p style={{ ...fmt.p, margin: 0 }}>{form.state || '—'}</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Zip
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.zipcode}
                  onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0 }}>{form.zipcode || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Notes
              </label>
              {editing ? (
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <p style={{ ...fmt.p, margin: 0, whiteSpace: 'pre-wrap' }}>{form.notes || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Linked Contacts Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginTop: 0, marginBottom: '16px' }}>
            Linked Contacts
          </h2>
          <p style={{ ...fmt.p, color: '#64748b', marginTop: 0 }}>Contact linking — coming in next phase</p>
        </div>

        {/* Linked Properties Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginTop: 0, marginBottom: '16px' }}>
            Linked Properties
          </h2>
          <p style={{ ...fmt.p, color: '#64748b', marginTop: 0 }}>Property linking — coming in next phase</p>
        </div>
      </div>
    </div>
  )
}

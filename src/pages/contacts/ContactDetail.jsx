import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

export default function ContactDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [linkedProperties, setLinkedProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchContact()
  }, [id])

  const fetchContact = async () => {
    setLoading(true)
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (contactError) {
      console.error('Error fetching contact:', contactError)
      setLoading(false)
      return
    }

    setContact(contactData)
    setForm(contactData)

    // Fetch linked properties
    const { data: propsData, error: propsError } = await supabase
      .from('property_contacts')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type, annual_tax_bill)')
      .eq('contact_id', id)

    if (!propsError && propsData) {
      setLinkedProperties(propsData)
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('contacts')
      .update(form)
      .eq('id', id)

    if (error) {
      console.error('Error updating contact:', error)
      alert('Failed to save contact')
      setSaving(false)
      return
    }

    setContact(form)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return

    const { error } = await supabase.from('contacts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting contact:', error)
      alert('Failed to delete contact')
      return
    }

    navigate('/contacts')
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
  }

  if (!contact) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Contact not found</div>
  }

  const isAdmin = true // Placeholder, replace with actual admin check

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <Link
            to="/contacts"
            style={{
              marginRight: '16px',
              color: '#1e40af',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Contacts
          </Link>
          <h1 style={{ ...fmt.h1, margin: 0, flex: 1 }}>
            {form.first_name} {form.last_name}
          </h1>
          {form.contact_type && (
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
              {form.contact_type}
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
                  setForm(contact)
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
                First Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
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
                <p style={{ ...fmt.p, margin: 0 }}>{form.first_name || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Last Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
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
                <p style={{ ...fmt.p, margin: 0 }}>{form.last_name || '—'}</p>
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
                Main Phone
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.main_phone}
                  onChange={(e) => setForm({ ...form, main_phone: e.target.value })}
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
                <p style={{ ...fmt.p, margin: 0 }}>{form.main_phone || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Cell Phone
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.cell_phone}
                  onChange={(e) => setForm({ ...form, cell_phone: e.target.value })}
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
                <p style={{ ...fmt.p, margin: 0 }}>{form.cell_phone || '—'}</p>
              )}
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Contact Type
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.contact_type}
                  onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
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
                <p style={{ ...fmt.p, margin: 0 }}>{form.contact_type || '—'}</p>
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

        {/* Linked Properties Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginTop: 0, marginBottom: '16px' }}>
            Linked Properties ({linkedProperties.length})
          </h2>

          {linkedProperties.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ ...fmt.th, textAlign: 'left', padding: '12px' }}>Property Address</th>
                    <th style={{ ...fmt.th, padding: '12px' }}>County</th>
                    <th style={{ ...fmt.th, padding: '12px' }}>Parcel ID</th>
                    <th style={{ ...fmt.th, padding: '12px' }}>Role</th>
                    <th style={{ ...fmt.th, padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedProperties.map((pc, idx) => (
                    <tr
                      key={pc.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <td style={{ ...fmt.td, textAlign: 'left', padding: '12px' }}>
                        {pc.property?.address || '—'}
                      </td>
                      <td style={{ ...fmt.td, padding: '12px' }}>{pc.property?.county || '—'}</td>
                      <td style={{ ...fmt.td, padding: '12px' }}>{pc.property?.parcel_id || '—'}</td>
                      <td style={{ ...fmt.td, padding: '12px' }}>{pc.role || '—'}</td>
                      <td style={{ ...fmt.td, padding: '12px', textAlign: 'center' }}>
                        <Link
                          to={`/properties/${pc.property?.id}`}
                          style={{
                            color: '#1e40af',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ ...fmt.p, color: '#64748b', marginTop: 0 }}>No linked properties</p>
          )}
        </div>

        {/* Company Linking Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginTop: 0, marginBottom: '16px' }}>
            Company Linking
          </h2>
          <p style={{ ...fmt.p, color: '#64748b', marginTop: 0 }}>Company linking coming soon</p>
        </div>
      </div>
    </div>
  )
}

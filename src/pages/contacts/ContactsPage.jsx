import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

const PAGE_SIZE = 50

export default function ContactsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    main_phone: '',
    cell_phone: '',
    contact_type: '',
    city: '',
    state: 'IL'
  })

  useEffect(() => {
    fetchContacts()
  }, [page, search])

  const fetchContacts = async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase.from('contacts').select('*', { count: 'exact' })
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email_address.ilike.%${search}%,main_phone.ilike.%${search}%`
      )
    }
    query = query.order('last_name', { ascending: true }).range(from, to)

    const { data, count, error } = await query
    if (error) {
      console.error('Error fetching contacts:', error)
      setLoading(false)
      return
    }

    setContacts(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const handleAddContact = async () => {
    if (!form.first_name.trim()) {
      alert('First name is required')
      return
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...form, owner_user_id: user.id }])
      .select()

    if (error) {
      console.error('Error creating contact:', error)
      alert('Failed to create contact')
      return
    }

    const newId = data[0].id
    setForm({
      first_name: '',
      last_name: '',
      email_address: '',
      main_phone: '',
      cell_phone: '',
      contact_type: '',
      city: '',
      state: 'IL'
    })
    setShowModal(false)
    navigate(`/contacts/${newId}`)
  }

  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ ...fmt.h1, margin: 0 }}>
            Contacts ({total})
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
            + Add Contact
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
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
                <th style={{ ...fmt.th, textAlign: 'left', padding: '12px 16px' }}>Name</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Phone</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Email</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Contact Type</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>City</th>
                <th style={{ ...fmt.th, padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, idx) => (
                <tr
                  key={contact.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <td style={{ ...fmt.td, textAlign: 'left', padding: '12px 16px' }}>
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.main_phone || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.email_address || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.contact_type || '—'}</td>
                  <td style={{ ...fmt.td, padding: '12px 16px' }}>{contact.city || '—'}</td>
                  <td
                    style={{ ...fmt.td, padding: '12px 16px', textAlign: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/contacts/${contact.id}`)}
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

      {/* Add Contact Modal */}
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
              Add Contact
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  First Name *
                </label>
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
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  Last Name
                </label>
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
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                Email
              </label>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  Main Phone
                </label>
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
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  Cell Phone
                </label>
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                  Contact Type
                </label>
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
              </div>
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
                onClick={handleAddContact}
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
                Create Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

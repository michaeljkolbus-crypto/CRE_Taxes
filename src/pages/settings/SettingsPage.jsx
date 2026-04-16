import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt, COUNTIES } from '../../lib/theme'

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('stages')
  const [userRole, setUserRole] = useState('user')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserRole()
  }, [])

  async function fetchUserRole() {
    const { data, error } = await supabase.from('user_profiles').select('role').eq('user_id', user?.id).single()
    if (!error && data) setUserRole(data.role)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading...</div>

  const isAdmin = userRole === 'admin'

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Settings</h1>

        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          {[
            { id: 'stages', label: 'Appeal Stages' },
            { id: 'deadlines', label: 'County Deadlines' },
            { id: 'users', label: 'Users', adminOnly: true }
          ].map(tab => (
            (!tab.adminOnly || isAdmin) && (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 0',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #1e40af' : 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  color: activeTab === tab.id ? '#1e40af' : '#64748b'
                }}
              >
                {tab.label}
              </button>
            )
          ))}
        </div>

        {activeTab === 'stages' && <AppealStagesTab isAdmin={isAdmin} />}
        {activeTab === 'deadlines' && <CountyDeadlinesTab isAdmin={isAdmin} />}
        {activeTab === 'users' && isAdmin && <UsersTab />}
      </div>
    </div>
  )
}

function AppealStagesTab({ isAdmin }) {
  const [stages, setStages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({})
  const [newStage, setNewStage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStages()
  }, [])

  async function fetchStages() {
    setLoading(true)
    const { data, error } = await supabase.from('appeal_stages').select('*').order('sort_order')
    if (!error) setStages(data || [])
    setLoading(false)
  }

  async function saveStage(stage) {
    if (stage.id) {
      const { error } = await supabase.from('appeal_stages').update(editingData).eq('id', stage.id)
      if (!error) {
        setEditingId(null)
        fetchStages()
      }
    } else {
      const { error } = await supabase.from('appeal_stages').insert([editingData])
      if (!error) {
        setNewStage(null)
        fetchStages()
      }
    }
  }

  async function deleteStage(stageId) {
    const { count } = await supabase.from('appeals').select('id', { count: 'exact' }).eq('stage_id', stageId)
    if (count > 0) {
      alert('Cannot delete a stage that has appeals linked to it')
      return
    }
    const { error } = await supabase.from('appeal_stages').delete().eq('id', stageId)
    if (!error) fetchStages()
  }

  async function moveStage(index, direction) {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === stages.length - 1) return

    const newStages = [...stages]
    const [moved] = newStages.splice(index, 1)
    newStages.splice(direction === 'up' ? index - 1 : index + 1, 0, moved)

    for (let i = 0; i < newStages.length; i++) {
      await supabase.from('appeal_stages').update({ sort_order: i + 1 }).eq('id', newStages[i].id)
    }
    fetchStages()
  }

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>

  return (
    <div>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
        {stages.map((stage, index) => (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: index < stages.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
            {editingId === stage.id ? (
              <>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: editingData.color || stage.color, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="color"
                    value={editingData.color || stage.color}
                    onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
                    style={{ width: '100%', height: '100%', border: 'none', cursor: 'pointer', opacity: 0 }}
                  />
                </div>
                <input
                  type="text"
                  value={editingData.name || stage.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}
                />
                <input
                  type="number"
                  value={editingData.sort_order !== undefined ? editingData.sort_order : stage.sort_order}
                  onChange={(e) => setEditingData({ ...editingData, sort_order: parseInt(e.target.value) })}
                  style={{ width: '60px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}
                />
                <button onClick={() => saveStage(stage)} style={{ padding: '4px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Save</button>
                <button onClick={() => { setEditingId(null); setEditingData({}) }} style={{ padding: '4px 12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              </>
            ) : (
              <>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: stage.color, border: '1px solid #cbd5e1' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: '#1e293b', fontWeight: '500' }}>{stage.name}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Order: {stage.sort_order}</p>
                </div>
                <button onClick={() => moveStage(index, 'up')} disabled={index === 0} style={{ padding: '4px 8px', backgroundColor: index === 0 ? '#f1f5f9' : '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === 0 ? 'default' : 'pointer', fontSize: '12px', opacity: index === 0 ? 0.5 : 1 }}>Up</button>
                <button onClick={() => moveStage(index, 'down')} disabled={index === stages.length - 1} style={{ padding: '4px 8px', backgroundColor: index === stages.length - 1 ? '#f1f5f9' : '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === stages.length - 1 ? 'default' : 'pointer', fontSize: '12px', opacity: index === stages.length - 1 ? 0.5 : 1 }}>Down</button>
                <button onClick={() => { setEditingId(stage.id); setEditingData({ ...stage }) }} style={{ padding: '4px 12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                <button onClick={() => deleteStage(stage.id)} style={{ padding: '4px 12px', backgroundColor: '#fecaca', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>

      {newStage === null ? (
        <button
          onClick={() => setNewStage(true)}
          style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
        >
          + Add Stage
        </button>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: editingData.color || '#3b82f6', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <input
              type="color"
              value={editingData.color || '#3b82f6'}
              onChange={(e) => setEditingData({ ...editingData, color: e.target.value })}
              style={{ width: '100%', height: '100%', border: 'none', cursor: 'pointer', opacity: 0 }}
            />
          </div>
          <input
            type="text"
            placeholder="Stage name"
            value={editingData.name || ''}
            onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
            style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="number"
            placeholder="Order"
            value={editingData.sort_order || stages.length + 1}
            onChange={(e) => setEditingData({ ...editingData, sort_order: parseInt(e.target.value) })}
            style={{ width: '60px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}
          />
          <button onClick={() => saveStage(null)} style={{ padding: '4px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Save</button>
          <button onClick={() => { setNewStage(null); setEditingData({}) }} style={{ padding: '4px 12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

function CountyDeadlinesTab({ isAdmin }) {
  const [deadlines, setDeadlines] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({})
  const [newDeadline, setNewDeadline] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeadlines()
  }, [])

  async function fetchDeadlines() {
    setLoading(true)
    const { data, error } = await supabase.from('county_deadlines').select('*').order('tax_year', { ascending: false }).order('close_date', { ascending: true })
    if (!error) setDeadlines(data || [])
    setLoading(false)
  }

  async function saveDeadline(deadline) {
    if (deadline?.id) {
      const { error } = await supabase.from('county_deadlines').update(editingData).eq('id', deadline.id)
      if (!error) {
        setEditingId(null)
        fetchDeadlines()
      }
    } else {
      const { error } = await supabase.from('county_deadlines').insert([editingData])
      if (!error) {
        setNewDeadline(null)
        fetchDeadlines()
      }
    }
  }

  async function deleteDeadline(id) {
    const { error } = await supabase.from('county_deadlines').delete().eq('id', id)
    if (!error) fetchDeadlines()
  }

  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>

  return (
    <div>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>County</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Appeal Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Tax Year</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Open Date</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Close Date</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Notes</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((deadline, index) => {
              const closeDate = new Date(deadline.close_date)
              let bgColor = '#fff'
              if (closeDate < today) bgColor = '#fee2e2'
              else if (closeDate < thirtyDaysFromNow) bgColor = '#fef3c7'

              return (
                <tr key={deadline.id} style={{ borderBottom: index < deadlines.length - 1 ? '1px solid #e2e8f0' : 'none', backgroundColor: bgColor }}>
                  {editingId === deadline.id ? (
                    <>
                      <td style={{ padding: '12px' }}>
                        <select value={editingData.county || ''} onChange={(e) => setEditingData({ ...editingData, county: e.target.value })} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}>
                          {COUNTIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={editingData.appeal_type || ''} onChange={(e) => setEditingData({ ...editingData, appeal_type: e.target.value })} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}>
                          <option>BOR</option>
                          <option>PTAB</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="number" value={editingData.tax_year || ''} onChange={(e) => setEditingData({ ...editingData, tax_year: parseInt(e.target.value) })} style={{ width: '80px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="date" value={editingData.open_date || ''} onChange={(e) => setEditingData({ ...editingData, open_date: e.target.value })} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="date" value={editingData.close_date || ''} onChange={(e) => setEditingData({ ...editingData, close_date: e.target.value })} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="text" value={editingData.notes || ''} onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button onClick={() => saveDeadline(deadline)} style={{ padding: '4px 8px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>Save</button>
                        <button onClick={() => { setEditingId(null); setEditingData({}) }} style={{ padding: '4px 8px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{deadline.county}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{deadline.appeal_type}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{deadline.tax_year}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{deadline.open_date}</td>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{deadline.close_date}</td>
                      <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>{deadline.notes || '—'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button onClick={() => { setEditingId(deadline.id); setEditingData({ ...deadline }) }} style={{ padding: '4px 8px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>Edit</button>
                        <button onClick={() => deleteDeadline(deadline.id)} style={{ padding: '4px 8px', backgroundColor: '#fecaca', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {newDeadline === null ? (
        <button
          onClick={() => setNewDeadline(true)}
          style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
        >
          + Add Deadline
        </button>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>County</label>
            <select value={editingData.county || ''} onChange={(e) => setEditingData({ ...editingData, county: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">Select</option>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Type</label>
            <select value={editingData.appeal_type || ''} onChange={(e) => setEditingData({ ...editingData, appeal_type: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option>BOR</option>
              <option>PTAB</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Year</label>
            <input type="number" placeholder="2026" value={editingData.tax_year || ''} onChange={(e) => setEditingData({ ...editingData, tax_year: parseInt(e.target.value) })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Open</label>
            <input type="date" value={editingData.open_date || ''} onChange={(e) => setEditingData({ ...editingData, open_date: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Close</label>
            <input type="date" value={editingData.close_date || ''} onChange={(e) => setEditingData({ ...editingData, close_date: e.target.value })} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => saveDeadline(null)} style={{ flex: 1, padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Save</button>
            <button onClick={() => { setNewDeadline(null); setEditingData({}) }} style={{ flex: 1, padding: '6px 12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [changingRoleId, setChangingRoleId] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at')
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  async function updateRole(profileId, newRole) {
    const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', profileId)
    if (!error) {
      setChangingRoleId(null)
      fetchUsers()
    }
  }

  if (loading) return <div style={{ color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Full Name</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Email</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Role</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((profile, index) => (
            <tr key={profile.id} style={{ borderBottom: index < users.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              <td style={{ padding: '12px', color: '#1e293b' }}>{profile.full_name || '—'}</td>
              <td style={{ padding: '12px', color: '#1e293b' }}>{profile.email || '—'}</td>
              <td style={{ padding: '12px' }}>
                {changingRoleId === profile.id ? (
                  <select
                    value={profile.role || 'user'}
                    onChange={(e) => updateRole(profile.id, e.target.value)}
                    style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span
                    onClick={() => setChangingRoleId(profile.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: profile.role === 'admin' ? '#dbeafe' : '#e2e8f0',
                      color: profile.role === 'admin' ? '#1e40af' : '#1e293b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}
                  >
                    {profile.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                )}
              </td>
              <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

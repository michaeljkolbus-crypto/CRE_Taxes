import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [properties, setProperties] = useState([])

  useEffect(() => {
    fetchTasks()
    fetchProperties()
  }, [showAll])

  async function fetchTasks() {
    setLoading(true)
    let query = supabase.from('tasks').select('*, property:properties(id, address, city)')
    
    if (!showAll) {
      query = query.eq('completed', false)
    }
    
    query = query.order('due_date', { ascending: true })
    
    const { data, error } = await query
    if (error) console.error(error)
    else setTasks(data || [])
    setLoading(false)
  }

  async function fetchProperties() {
    const { data, error } = await supabase.from('properties').select('id, address, city').order('address')
    if (!error) setProperties(data || [])
  }

  async function toggleComplete(task) {
    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id)
    if (!error) {
      fetchTasks()
    }
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } else {
      console.error(error)
    }
  }

  async function addTask(formData) {
    const { error } = await supabase.from('tasks').insert([formData])
    if (!error) {
      setShowAddModal(false)
      fetchTasks()
    } else {
      console.error(error)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
            Tasks {!showAll && `(${tasks.length})`}
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Add Task
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setShowAll(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: !showAll ? '#1e40af' : '#e2e8f0',
              color: !showAll ? '#fff' : '#1e293b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Open
          </button>
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: showAll ? '#1e40af' : '#e2e8f0',
              color: showAll ? '#fff' : '#1e293b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            All
          </button>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Due Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Linked To</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No tasks found</td></tr>
              ) : (
                tasks.map(task => {
                  const dueDate = task.due_date ? new Date(task.due_date) : null
                  const isOverdue = dueDate && dueDate < today && !task.completed
                  const isCompleted = task.completed
                  
                  return (
                    <tr
                      key={task.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: isCompleted ? '#f8fafc' : '#fff',
                        opacity: isCompleted ? 0.6 : 1
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        color: isCompleted ? '#94a3b8' : '#1e293b',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </td>
                      <td style={{
                        padding: '12px',
                        color: isOverdue ? '#dc2626' : (isCompleted ? '#94a3b8' : '#1e293b')
                      }}>
                        {dueDate ? dueDate.toLocaleDateString() : '—'}
                      </td>
                      <td style={{
                        padding: '12px',
                        color: isCompleted ? '#94a3b8' : '#1e293b'
                      }}>
                        {task.property ? `${task.property.address}, ${task.property.city}` : '—'}
                      </td>
                      <td style={{
                        padding: '12px',
                        color: isCompleted ? '#94a3b8' : '#64748b',
                        fontSize: '13px'
                      }}>
                        {task.created_at ? new Date(task.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleComplete(task)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: isCompleted ? '#10b981' : '#e2e8f0',
                            color: isCompleted ? '#fff' : '#1e293b',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          {isCompleted ? 'Done' : 'Complete'}
                        </button>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                        >
                          ✕
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

      {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} onAdd={addTask} properties={properties} />}
    </div>
  )
}

function AddTaskModal({ onClose, onAdd, properties }) {
  const [formData, setFormData] = useState({})
  const [titleError, setTitleError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    onAdd(formData)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '32px', maxWidth: '500px', width: '90%' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Add Task</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setTitleError(false) }}
                style={{ width: '100%', padding: '8px', border: `1px solid ${titleError ? '#dc2626' : '#e2e8f0'}`, borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {titleError && <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#dc2626' }}>Title is required</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                Link to Property
              </label>
              <select
                value={formData.property_id || ''}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">None</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.address}, {p.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px',
                  fontFamily: 'inherit', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1',
                borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#1e293b'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px', backgroundColor: '#1e40af', color: '#fff',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

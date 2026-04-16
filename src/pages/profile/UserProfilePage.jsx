import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function UserProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    title: profile?.title || '',
    bio: profile?.bio || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const fileInputRef = useRef(null)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: form.full_name, phone: form.phone, title: form.title, bio: form.bio })
        .eq('user_id', user.id)
      if (error) throw error
      await refreshProfile?.()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Error saving profile: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      const { error: dbErr } = await supabase.from('user_profiles').update({ avatar_url: url }).eq('user_id', user.id)
      if (dbErr) throw dbErr
      setAvatarUrl(url)
      await refreshProfile?.()
    } catch (err) {
      alert('Error uploading avatar: ' + err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
    outline: 'none'
  }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <div style={{ padding: 32, maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>User Profile</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Update your contact info and headshot.</p>
      </div>

      {/* Avatar section */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff', overflow: 'hidden',
            border: '3px solid #e2e8f0'
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          {avatarUploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{form.full_name || 'Your Name'}</div>
          {form.title && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{form.title}</div>}
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            style={{
              padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db',
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1e293b',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            {avatarUploading ? 'Uploading...' : 'Upload Headshot'}
          </button>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0' }}>JPG, PNG, or GIF · Max 5MB</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} style={inp} placeholder="First Last" />
          </div>
          <div>
            <label style={lbl}>Title / Role</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="e.g., Senior Analyst" />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={form.email} disabled style={{ ...inp, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0 0' }}>Email is managed through your login credentials.</p>
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="(555) 555-5555" />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Bio / Notes</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={3}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Short bio or notes about your role..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 22px', background: '#1e40af', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'all 0.15s'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Account info */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Account Info</div>
        <div style={{ fontSize: 13, color: '#1e293b', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 12px' }}>
          <span style={{ color: '#64748b' }}>Email:</span><span>{user?.email}</span>
          <span style={{ color: '#64748b' }}>Role:</span><span style={{ textTransform: 'capitalize' }}>{profile?.role || 'user'}</span>
          <span style={{ color: '#64748b' }}>User ID:</span><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{user?.id}</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

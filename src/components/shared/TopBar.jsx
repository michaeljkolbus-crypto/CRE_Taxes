import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TopBar() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header style={{
      height: 52,
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>
          CRE Tax Relief
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* User name */}
        {profile?.full_name && (
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {profile.full_name}
          </span>
        )}

        {/* Settings dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px 5px 8px',
              background: dropdownOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7, cursor: 'pointer', color: '#cbd5e1', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '6px', minWidth: 200,
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 300
            }}>
              {/* Avatar / profile header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px 12px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{profile?.full_name || 'User'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{profile?.email || ''}</div>
                </div>
              </div>

              <DropdownItem icon={userIcon} label="User Profile" onClick={() => { navigate('/profile'); setDropdownOpen(false) }} />
              <DropdownItem icon={settingsPageIcon} label="System Settings" onClick={() => { navigate('/settings'); setDropdownOpen(false) }} />
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }} />
              <DropdownItem icon={signOutIcon} label="Sign Out" onClick={handleSignOut} danger />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function DropdownItem({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: hovered ? (danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)') : 'transparent',
        color: danger ? '#f87171' : '#cbd5e1', fontSize: 13, fontWeight: 500,
        textAlign: 'left', transition: 'all 0.1s'
      }}
    >
      <span style={{ opacity: 0.7 }}>{icon}</span>
      {label}
    </button>
  )
}

const userIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const settingsPageIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const signOutIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

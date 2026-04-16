import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '/properties', label: 'Properties' },
  { path: '/contacts', label: 'Contacts' },
  { path: '/companies', label: 'Companies' },
  { path: '/appeals', label: 'Appeals' },
  { path: '/comps', label: 'Comps' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/settings', label: 'Settings' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav style={{ background:'#1e293b', color:'#fff', padding:'0 24px', display:'flex', alignItems:'center', height:56, gap:4, position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}>
      <span style={{ fontWeight:700, fontSize:15, color:'#fff', marginRight:24, whiteSpace:'nowrap' }}>CRE Tax Relief</span>
      {NAV_ITEMS.map(item => (
        <NavLink key={item.path} to={item.path}
          style={({ isActive }) => ({
            padding:'6px 12px', borderRadius:6, fontSize:13, fontWeight:500, color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent', transition:'all 0.15s'
          })}>
          {item.label}
        </NavLink>
      ))}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        {profile?.full_name && <span style={{ fontSize:13, color:'#94a3b8' }}>{profile.full_name}</span>}
        <button onClick={handleSignOut}
          style={{ padding:'5px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, color:'#cbd5e1', fontSize:12, cursor:'pointer' }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
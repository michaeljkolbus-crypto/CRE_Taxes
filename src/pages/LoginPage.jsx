import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)

  // If already authenticated, redirect to app immediately
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success: onAuthStateChange fires → user state updates → useEffect above redirects
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f1f5f9' }}>
      <div style={{ background:'#fff', borderRadius:12, padding:40, width:360, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b', marginBottom:4 }}>CRE Tax Relief</h1>
          <p style={{ color:'#64748b', fontSize:13 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width:'100%', padding:'10px 40px 10px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:12, fontWeight:500, padding:'2px 4px' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div style={{ textAlign:'right', marginBottom:20 }}>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError('') }}
                style={{ background:'none', border:'none', color:'#1e40af', fontSize:12, cursor:'pointer', padding:0 }}
              >
                Forgot password?
              </button>
            </div>
            {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:16 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'11px', background:'#1e40af', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div style={{ textAlign:'center' }}>
                <p style={{ color:'#16a34a', fontSize:14, marginBottom:20 }}>
                  ✓ Check your email for a password reset link.
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setResetSent(false) }}
                  style={{ background:'none', border:'none', color:'#1e40af', fontSize:13, cursor:'pointer' }}
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
                {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:16 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:'11px', background:'#1e40af', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:12 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <div style={{ textAlign:'center' }}>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    style={{ background:'none', border:'none', color:'#64748b', fontSize:12, cursor:'pointer' }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

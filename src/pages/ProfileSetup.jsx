import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

const YEARS = ['Freshman','Sophomore','Junior','Senior','Grad Student','PhD','Faculty']

export default function ProfileSetup() {
  const { user, completeProfile, error, setError } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [major, setMajor]             = useState('')
  const [year, setYear]               = useState('')
  const [bio, setBio]                 = useState('')
  const [busy, setBusy]               = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null) // 'checking' | 'taken' | 'available'
  const checkTimeout = useRef(null)

  // Real-time username availability check
  useEffect(() => {
    if (!username || username.length < 2) { setUsernameStatus(null); return }
    setUsernameStatus('checking')
    clearTimeout(checkTimeout.current)
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .single()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(checkTimeout.current)
  }, [username, user?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!username.trim())    { setError('Please choose a username.'); return }
    if (usernameStatus === 'taken') { setError(`@${username} is already taken.`); return }
    if (!major.trim())       { setError('Please enter your major.'); return }
    setBusy(true)
    const { getUniversityFromEmail } = await import('../lib/universities.js')
    const uni = getUniversityFromEmail(user.email) || {}
    await completeProfile(user.id, {
      displayName, username, major, year, bio,
      campusEmoji: uni.emoji || '🎓',
      campusColor: uni.color || '#a78bfa',
    })
    setBusy(false)
  }

  const usernameOk = usernameStatus === 'available'
  const usernameBad = usernameStatus === 'taken'

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420, background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:22, backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)', padding:'36px 30px' }}>
        <div style={{ fontFamily:"'Pacifico', cursive", fontSize:22, marginBottom:24 }}>Campusly</div>
        <h2 style={{ fontSize:22, marginBottom:5 }}>Set up your profile</h2>
        <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:26 }}>Usernames are unique across all campuses</p>
        <form onSubmit={handleSubmit}>
          <Field label="Your name">
            <input placeholder="Alex Rivera" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoFocus />
          </Field>

          <Field label="Username">
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', fontSize:14, userSelect:'none' }}>@</span>
              <input
                placeholder="alexr"
                value={username}
                onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))}
                style={{
                  paddingLeft:30, paddingRight:36,
                  borderColor: usernameOk ? 'var(--green)' : usernameBad ? 'var(--red)' : undefined,
                }}
              />
              <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>
                {usernameStatus === 'checking' && <span style={{ fontSize:11, color:'var(--text-3)' }}>…</span>}
                {usernameOk   && '✓'}
                {usernameBad  && '✗'}
              </span>
            </div>
            {usernameBad  && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>@{username} is already taken</div>}
            {usernameOk   && <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>@{username} is available!</div>}
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <Field label="Major *"><input placeholder="CS, Biology…" value={major} onChange={e=>setMajor(e.target.value)} required /></Field>
            <Field label="Year">
              <select value={year} onChange={e=>setYear(e.target.value)} style={{ padding:'11px 12px' }}>
                <option value="">Select…</option>
                {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Bio (optional)">
            <textarea rows={2} placeholder="Tell your campus about yourself…" value={bio} onChange={e=>setBio(e.target.value)} style={{ resize:'none' }} />
          </Field>
          {error && <div style={{ background:'rgba(255,107,138,0.1)', border:'1px solid rgba(255,107,138,0.22)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--red)', marginBottom:12 }}>{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={busy || usernameBad || usernameStatus === 'checking' || !major.trim()} style={{ padding:13, marginTop:4 }}>
            {busy
              ? <span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}><span className="spinner" style={{ width:15,height:15,borderWidth:2 }}/>Setting up…</span>
              : 'Enter campus →'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>{label}</div>
      {children}
    </div>
  )
}

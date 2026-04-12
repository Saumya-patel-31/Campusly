import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { getUniversityFromEmail, isEduEmail, isValidCampusEmail } from '../lib/universities.js'

const YEARS = ['Freshman','Sophomore','Junior','Senior','Grad Student','PhD','Faculty']

// ─── tiny helpers ────────────────────────────────────────────────────────────
function Err({ children }) {
  const msg = typeof children === 'string' && children ? children : null
  if (!msg) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.25)', borderRadius:10, padding:'9px 13px', marginBottom:14, fontSize:12, color:'#ff6b8a' }}>
      ⚠️ {msg}
    </div>
  )
}

function Label({ children }) {
  return (
    <label style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.28)', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:7 }}>
      {children}
    </label>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
      <span className="spinner" style={{ width:14, height:14, borderWidth:2, borderColor:'rgba(0,0,0,0.3)', borderTopColor:'#080810' }} />
      Please wait…
    </span>
  )
}

function PwField({ label, value, onChange, show, onToggle, placeholder='Password', autoFocus }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="pw-wrap">
        <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} />
        <button type="button" className="pw-eye" onClick={onToggle} tabIndex={-1}><EyeIcon open={show} /></button>
      </div>
    </div>
  )
}

function UniPill({ uni }) {
  if (!uni) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:`${uni.color}18`, border:`1px solid ${uni.color}35`, borderRadius:10, padding:'9px 13px', marginTop:10 }}>
      <span style={{ fontSize:20 }}>{uni.emoji}</span>
      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:uni.color }}>{uni.name}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.28)' }}>{uni.city}</div>
      </div>
      <span style={{ marginLeft:'auto', fontFamily:"'Inter',sans-serif", fontSize:10, color:uni.color, background:`${uni.color}20`, border:`1px solid ${uni.color}30`, borderRadius:99, padding:'2px 8px', fontWeight:600 }}>✓ recognized</span>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────
export default function AuthFlow() {
  const navigate = useNavigate()
  const { isRecovery, session, user, sendOtp, verifyOtp, signInPassword, setUserPassword, forgotPassword, sendResetOtp, completeProfile, error, setError } = useAuth()

  // Determine the right starting step once, at first render only.
  // • isRecovery  → 'reset'   (came from password-reset email)
  // • session     → 'profile' (already logged in, App.jsx sent us here for setup)
  // • otherwise   → 'email'   (fresh join/login)
  const [mode, setMode] = useState(() => (session && !isRecovery) ? 'join' : 'login')
  const [step, setStep] = useState(() => {
    if (isRecovery) return 'reset'
    if (session) {
      if (sessionStorage.getItem('campusly_needs_pw') === '1') return 'set-password'
      if (sessionStorage.getItem('campusly_needs_profile') === '1') return 'profile'
      return 'profile'
    }
    return 'email'
  })
  const [email, setEmail]     = useState('')
  const [password, setPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const [code, setCode]       = useState(['','','','','',''])
  const [busy, setBusy]       = useState(false)
  const codeRefs = useRef([])

  // Profile step state
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [major, setMajor]             = useState('')
  const [year, setYear]               = useState('')
  const [bio, setBio]                 = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)
  const checkTimeout = useRef(null)

  const JOIN_STEPS = ['email','verify','set-password','profile']

  // If isRecovery flips to true after mount (edge case), show reset form
  useEffect(() => { if (isRecovery) setStep('reset') }, [isRecovery])

  useEffect(() => {
    if (!session) return
    if (sessionStorage.getItem('campusly_needs_pw') === '1') {
      setStep('set-password')
      setMode('join')
    } else if (sessionStorage.getItem('campusly_needs_profile') === '1') {
      setStep('profile')
      setMode('join')
    } else if (sessionStorage.getItem('campusly_needs_reset') === '1') {
      setStep('reset')
    }
  }, [session])

  useEffect(() => { setError(null) }, [step, mode])

  // Username availability check (debounced)
  useEffect(() => {
    if (!username || username.length < 2) { setUsernameStatus(null); return }
    setUsernameStatus('checking')
    clearTimeout(checkTimeout.current)
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).neq('id', user?.id || '').maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(checkTimeout.current)
  }, [username, user?.id])

  // ── Join handlers ──────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault(); setBusy(true)
    const result = await sendOtp(email); setBusy(false)
    if (result === 'existing') setStep('already-exists')
    else if (result) setStep('verify')
  }

  function handleCodeChange(i, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...code]; next[i] = val; setCode(next)
    if (val && i < 5) codeRefs.current[i+1]?.focus()
  }
  function handleCodeKey(i, e) { if (e.key==='Backspace' && !code[i] && i>0) codeRefs.current[i-1]?.focus() }
  function handlePaste(e) {
    const t = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (t.length===6) { setCode(t.split('')); codeRefs.current[5]?.focus() }
  }

  async function handleVerify(e) {
    e.preventDefault()
    const token = code.join('')
    if (token.length<6) { setError('Enter the full 6-digit code.'); return }
    setBusy(true)
    // Set the flag BEFORE the await — onAuthStateChange fires during verifyOtp,
    // which remounts AuthFlow before the await resolves. The flag must already
    // be in sessionStorage when the new mount's useState initializer runs.
    sessionStorage.setItem('campusly_needs_pw', '1')
    const ok = await verifyOtp(email, token)
    setBusy(false)
    if (!ok) {
      // OTP was wrong — remove the flag so we don't get stuck
      sessionStorage.removeItem('campusly_needs_pw')
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    if (password.length<8) { setError('Password must be at least 8 characters.'); return }
    if (password!==confirmPw) { setError('Passwords do not match.'); return }
    setBusy(true)
    const ok = await setUserPassword(password); setBusy(false)
    if (ok) {
      sessionStorage.removeItem('campusly_needs_pw')
      sessionStorage.setItem('campusly_needs_profile', '1')
      setPw(''); setConfirmPw(''); setStep('profile')
    }
  }

  async function handleCompleteProfile(e) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!username.trim())    { setError('Please choose a username.'); return }
    if (usernameStatus==='taken') { setError(`@${username} is already taken.`); return }
    setBusy(true)
    const uni = getUniversityFromEmail(user?.email) || {}
    const ok = await completeProfile(user.id, {
      displayName, username, major, year, bio,
      campusEmoji:  uni.emoji  || '🎓',
      campusColor:  uni.color  || '#a78bfa',
      domain:       user?.email ? user.email.split('@')[1] : '',
      campusShort:  uni.short  || '',
      campusName:   uni.name   || '',
    })
    setBusy(false)
    if (ok) {
      sessionStorage.removeItem('campusly_needs_profile')
      navigate('/')
    }
  }

  // ── Login handlers ─────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault(); setBusy(true)
    const ok = await signInPassword(email, password); setBusy(false)
    if (ok) navigate('/')
  }

  function handleForgot(e) {
    e.preventDefault()
    setError(null)
    setStep('forgot-otp')
  }

  async function handleForgotOtpSend(e) {
    e.preventDefault()
    if (!email) { setError('Enter your email address.'); return }
    setBusy(true)
    const ok = await sendResetOtp(email); setBusy(false)
    if (ok) { setCode(['','','','','','']); setStep('forgot-otp-verify') }
  }

  async function handleForgotOtpVerify(e) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) { setError('Enter the full 6-digit code.'); return }
    setBusy(true)
    sessionStorage.setItem('campusly_needs_reset', '1')
    const ok = await verifyOtp(email, token)
    setBusy(false)
    if (!ok) {
      sessionStorage.removeItem('campusly_needs_reset')
    } else {
      setStep('reset')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (password.length<8) { setError('Password must be at least 8 characters.'); return }
    if (password!==confirmPw) { setError('Passwords do not match.'); return }
    setBusy(true)
    const ok = await setUserPassword(password); setBusy(false)
    if (ok) {
      sessionStorage.removeItem('campusly_needs_reset')
      navigate('/')
    }
  }

  function switchMode(m) {
    setMode(m); setStep('email')
    setPw(''); setConfirmPw('')
    setCode(['','','','','','']); setError(null)
  }

  const isEdu      = isEduEmail(email)
  const isValid    = isValidCampusEmail(email)
  const uni        = isValid ? getUniversityFromEmail(email) : null
  const unknownEdu = isEdu && !isValid && email.includes('@')
  const joinStepIdx = JOIN_STEPS.indexOf(step)
  const usernameOk  = usernameStatus === 'available'
  const usernameBad = usernameStatus === 'taken'

  return (
    <>
      <style>{`
        .font-display { font-family: 'Instrument Serif', serif; }
        @keyframes auth-rise { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .auth-card { animation: auth-rise 0.6s cubic-bezier(0.16,1,0.3,1) both; }

        .auth-card input[type="email"],
        .auth-card input[type="text"],
        .auth-card input[type="password"] {
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.16) !important;
          border-radius: 12px !important;
          color: #fff !important;
          font-size: 14px !important;
          padding: 13px 16px !important;
          width: 100% !important;
          outline: none !important;
          transition: border-color 0.2s, background 0.2s !important;
          font-family: 'Inter', sans-serif !important;
          margin-bottom: 0 !important;
        }
        .auth-card input[type="email"]:focus,
        .auth-card input[type="text"]:focus,
        .auth-card input[type="password"]:focus {
          border-color: rgba(167,139,250,0.55) !important;
          background: rgba(167,139,250,0.08) !important;
          box-shadow: 0 0 0 3px rgba(167,139,250,0.10) !important;
        }
        .auth-card input::placeholder { color: rgba(255,255,255,0.28) !important; }

        .auth-card select,
        .auth-card textarea {
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.16) !important;
          border-radius: 12px !important;
          color: #fff !important;
          font-size: 14px !important;
          padding: 13px 16px !important;
          width: 100% !important;
          outline: none !important;
          font-family: 'Inter', sans-serif !important;
          margin-bottom: 0 !important;
          transition: border-color 0.2s, background 0.2s !important;
        }
        .auth-card select:focus,
        .auth-card textarea:focus {
          border-color: rgba(167,139,250,0.55) !important;
          background: rgba(167,139,250,0.08) !important;
          box-shadow: 0 0 0 3px rgba(167,139,250,0.10) !important;
        }
        .auth-card select option { background: #12121e; }
        .auth-card textarea { resize: vertical; min-height: 80px; }
        .auth-card textarea::placeholder { color: rgba(255,255,255,0.28) !important; }

        .pw-wrap { position: relative; }
        .pw-wrap input { padding-right: 44px !important; }
        .pw-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:0; color:rgba(255,255,255,0.3); transition:color 0.15s; display:flex; align-items:center; }
        .pw-eye:hover { color:rgba(255,255,255,0.7); }

        .auth-submit { width:100%; background:#fff; color:#080810; border:none; border-radius:12px; padding:13px; font-size:14px; font-weight:500; font-family:'Inter',sans-serif; cursor:pointer; transition:opacity 0.2s,transform 0.2s; margin-top:14px; }
        .auth-submit:hover:not(:disabled) { opacity:0.9; transform:scale(1.01); }
        .auth-submit:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

        .auth-link { background:none; border:none; cursor:pointer; font-family:'Inter',sans-serif; font-size:12px; color:rgba(255,255,255,0.3); padding:0; transition:color 0.2s; text-decoration:underline; text-underline-offset:3px; }
        .auth-link:hover { color:rgba(255,255,255,0.7); }

        .mode-tab { flex:1; padding:9px; border-radius:10px; border:none; font-family:'Inter',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .mode-tab-active   { background:rgba(255,255,255,0.12); color:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,0.15); }
        .mode-tab-inactive { background:transparent; color:rgba(255,255,255,0.3); }
        .mode-tab-inactive:hover { color:rgba(255,255,255,0.6); }

        .username-input-wrap { position: relative; }
        .username-prefix { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.35); font-size:14px; font-family:'Inter',sans-serif; user-select:none; pointer-events:none; }
        .username-input-wrap input { padding-left: 28px !important; padding-right: 36px !important; }
        .username-status { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:15px; }
      `}</style>

      <section style={{ position:'relative', width:'100%', minHeight:'100vh', overflow:'hidden', background:'#050812' }}>

        {/* Video bg */}
        <video autoPlay loop muted playsInline style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'fixed', inset:0, background:'rgba(5,8,18,0.52)', zIndex:1 }} />

        {/* Nav */}
        <nav style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 40px' }}>
          <span style={{ fontFamily:"'Pacifico', cursive", fontSize:26, color:'#fff', letterSpacing:'0.01em' }}>Campusly</span>
          <button onClick={() => navigate('/')}
            style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:6, transition:'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color='#fff'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}
          >← Back to home</button>
        </nav>

        {/* Card */}
        <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 80px)', padding:'24px 24px 40px' }}>
          <div className="auth-card" style={{
            width:'100%', maxWidth: step==='profile' ? 480 : 420,
            background:'rgba(255,255,255,0.06)',
            backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
            border:'1px solid rgba(255,255,255,0.13)', borderRadius:24,
            padding:'36px 36px 32px',
            boxShadow:'0 8px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.04)',
            transition:'max-width 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>

            {/* ── Reset ── */}
            {step==='reset' && <ResetStep password={password} setPw={setPw} confirmPw={confirmPw} setConfirmPw={setConfirmPw} showPw={showPw} setShowPw={setShowPw} showCPw={showCPw} setShowCPw={setShowCPw} busy={busy} error={error} onSubmit={handleReset} />}

            {/* ── Forgot: enter email for OTP ── */}
            {step==='forgot-otp' && <ForgotOtpEmailStep email={email} setEmail={setEmail} busy={busy} error={error} onSubmit={handleForgotOtpSend} onBack={() => { setStep('email'); setMode('login') }} />}

            {/* ── Forgot: verify OTP ── */}
            {step==='forgot-otp-verify' && (
              <>
                <button className="auth-link" style={{ marginBottom:18, display:'block' }} onClick={() => setStep('forgot-otp')}>← Change email</button>
                <VerifyStep email={email} code={code} codeRefs={codeRefs} busy={busy} error={error} onCodeChange={handleCodeChange} onCodeKey={handleCodeKey} onPaste={handlePaste} onSubmit={handleForgotOtpVerify} onResend={handleForgotOtpSend} />
              </>
            )}

            {/* ── Forgot sent (legacy / fallback) ── */}
            {step==='forgot-sent' && <ForgotSentStep email={email} onBack={() => { setStep('email'); setMode('login') }} />}

            {/* ── Normal flow ── */}
            {step!=='reset' && step!=='forgot-sent' && step!=='forgot-otp' && step!=='forgot-otp-verify' && (
              <>
                {/* Mode tabs — hide during mid-join steps */}
                {(step==='email') && (
                  <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:13, padding:4, marginBottom:28, border:'1px solid rgba(255,255,255,0.08)' }}>
                    <button className={`mode-tab ${mode==='login'?'mode-tab-active':'mode-tab-inactive'}`} onClick={() => switchMode('login')}>Sign in</button>
                    <button className={`mode-tab ${mode==='join'?'mode-tab-active':'mode-tab-inactive'}`} onClick={() => switchMode('join')}>Join campus</button>
                  </div>
                )}

                {/* Progress bar — join mode only */}
                {mode==='join' && joinStepIdx >= 0 && (
                  <div style={{ display:'flex', gap:4, marginBottom:28 }}>
                    {JOIN_STEPS.map((s,i) => (
                      <div key={s} style={{ height:2, flex:1, borderRadius:2, background: i<=joinStepIdx ? 'linear-gradient(90deg,#a78bfa,#f472b6)' : 'rgba(255,255,255,0.08)', transition:'background 0.4s' }} />
                    ))}
                  </div>
                )}

                {/* Back button mid-flow */}
                {(step==='verify'||step==='set-password'||step==='already-exists') && (
                  <button className="auth-link" style={{ marginBottom:18, display:'block' }} onClick={() => setStep(step==='set-password'?'verify':'email')}>
                    ← {step==='set-password' ? 'Back' : 'Change email'}
                  </button>
                )}

                {/* ── Login ── */}
                {mode==='login' && step==='email' && (
                  <LoginStep email={email} setEmail={setEmail} password={password} setPw={setPw} showPw={showPw} setShowPw={setShowPw} busy={busy} error={error} onSubmit={handleLogin} onForgot={handleForgot} uni={uni} unknownEdu={unknownEdu} />
                )}

                {/* ── Join: email ── */}
                {mode==='join' && step==='email' && (
                  <JoinEmailStep email={email} setEmail={setEmail} busy={busy} error={error} isValid={isValid} uni={uni} unknownEdu={unknownEdu} onSubmit={handleSendOtp} />
                )}

                {/* ── Join: already registered ── */}
                {mode==='join' && step==='already-exists' && (
                  <AlreadyExistsStep
                    email={email}
                    onSignIn={() => switchMode('login')}
                    onReset={async () => { setBusy(true); const ok = await sendResetOtp(email); setBusy(false); if (ok) { setCode(['','','','','','']); setStep('forgot-otp-verify') } }}
                    busy={busy}
                    error={error}
                  />
                )}

                {/* ── Join: OTP ── */}
                {mode==='join' && step==='verify' && (
                  <VerifyStep email={email} code={code} codeRefs={codeRefs} busy={busy} error={error} onCodeChange={handleCodeChange} onCodeKey={handleCodeKey} onPaste={handlePaste} onSubmit={handleVerify} onResend={handleSendOtp} />
                )}

                {/* ── Join: set password ── */}
                {mode==='join' && step==='set-password' && (
                  <SetPasswordStep password={password} setPw={setPw} confirmPw={confirmPw} setConfirmPw={setConfirmPw} showPw={showPw} setShowPw={setShowPw} showCPw={showCPw} setShowCPw={setShowCPw} busy={busy} error={error} onSubmit={handleSetPassword} />
                )}

                {/* ── Join: profile ── */}
                {step==='profile' && (
                  <ProfileStep
                    displayName={displayName} setDisplayName={setDisplayName}
                    username={username} setUsername={setUsername}
                    major={major} setMajor={setMajor}
                    year={year} setYear={setYear}
                    bio={bio} setBio={setBio}
                    usernameOk={usernameOk} usernameBad={usernameBad}
                    usernameStatus={usernameStatus}
                    busy={busy} error={error}
                    onSubmit={handleCompleteProfile}
                    uni={uni || (user?.email ? getUniversityFromEmail(user.email) : null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function LoginStep({ email, setEmail, password, setPw, showPw, setShowPw, busy, error, onSubmit, onForgot, uni, unknownEdu }) {
  return (
    <div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Welcome back.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:26 }}>Sign in with your university email and password.</p>
      <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <Label>University email</Label>
          <input type="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} autoFocus />
          {uni && <UniPill uni={uni} />}
          {unknownEdu && <UnknownEduPill />}
        </div>
        <PwField label="Password" value={password} onChange={setPw} show={showPw} onToggle={() => setShowPw(v=>!v)} />
        <div style={{ textAlign:'right', marginTop:-6 }}>
          <button type="button" className="auth-link" onClick={onForgot} style={{ fontSize:11 }}>Forgot password?</button>
        </div>
        {error && <Err>{error}</Err>}
        <button type="submit" className="auth-submit" disabled={busy||!email||!password} style={{ marginTop:2 }}>
          {busy ? <Spinner /> : 'Sign in →'}
        </button>
      </form>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:20 }}>By continuing you agree to <span style={{ fontFamily:"'Pacifico', cursive", fontSize:11 }}>Campusly</span>'s Terms of Service</p>
    </div>
  )
}

function JoinEmailStep({ email, setEmail, busy, error, isValid, uni, unknownEdu, onSubmit }) {
  return (
    <div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Join your campus.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:26 }}>Enter your official university .edu email to get started.</p>
      <form onSubmit={onSubmit}>
        <Label>University email</Label>
        <input type="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} autoFocus />
        {uni && <UniPill uni={uni} />}
        {unknownEdu && <UnknownEduPill />}
        {error && <div style={{ marginTop:12 }}><Err>{error}</Err></div>}
        <button type="submit" className="auth-submit" disabled={busy||!isValid}>{busy ? <Spinner /> : 'Send verification code →'}</button>
      </form>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:20 }}>By continuing you agree to <span style={{ fontFamily:"'Pacifico', cursive", fontSize:11 }}>Campusly</span>'s Terms of Service</p>
    </div>
  )
}

function VerifyStep({ email, code, codeRefs, busy, error, onCodeChange, onCodeKey, onPaste, onSubmit, onResend }) {
  return (
    <div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Check your inbox.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:4 }}>Code sent to <strong style={{ color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{email}</strong></p>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.22)', marginBottom:26 }}>Check spam if it doesn't arrive within a minute.</p>
      <form onSubmit={onSubmit}>
        <div style={{ display:'flex', gap:8, marginBottom:20, justifyContent:'center' }} onPaste={onPaste}>
          {code.map((d,i) => (
            <input key={i} ref={el=>codeRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e=>onCodeChange(i,e.target.value)} onKeyDown={e=>onCodeKey(i,e)}
              style={{ width:52, height:60, textAlign:'center', fontSize:24, fontWeight:700, fontFamily:"'Instrument Serif',serif", borderRadius:14,
                border: d?'1.5px solid rgba(167,139,250,0.6)':'1px solid rgba(255,255,255,0.10)',
                background: d?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.05)',
                color:'#fff', padding:0, boxShadow: d?'0 0 16px rgba(167,139,250,0.2)':'none',
                transition:'all 0.15s', outline:'none', marginBottom:0 }} />
          ))}
        </div>
        {error && <Err>{error}</Err>}
        <button type="submit" className="auth-submit" disabled={busy||code.join('').length<6}>{busy ? <Spinner /> : 'Verify →'}</button>
        <button type="button" onClick={onResend}
          style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.28)', padding:'8px 0' }}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.28)'}
        >Resend code</button>
      </form>
    </div>
  )
}

function SetPasswordStep({ password, setPw, confirmPw, setConfirmPw, showPw, setShowPw, showCPw, setShowCPw, busy, error, onSubmit }) {
  const strength = password.length===0 ? null : password.length<8 ? 'weak' : password.length<12 ? 'fair' : 'strong'
  const sc = { weak:'#ff6b8a', fair:'#f59e0b', strong:'#34d399' }
  const sw = { weak:'33%', fair:'66%', strong:'100%' }
  return (
    <div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Set a password.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:26 }}>You'll use this to sign in next time.</p>
      <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <PwField label="Password" value={password} onChange={setPw} show={showPw} onToggle={()=>setShowPw(v=>!v)} placeholder="At least 8 characters" autoFocus />
        {strength && (
          <div style={{ marginTop:-6 }}>
            <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:sw[strength], background:sc[strength], borderRadius:2, transition:'width 0.3s,background 0.3s' }} />
            </div>
            <div style={{ fontSize:10, color:sc[strength], marginTop:4, fontFamily:"'Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.06em' }}>{strength}</div>
          </div>
        )}
        <PwField label="Confirm password" value={confirmPw} onChange={setConfirmPw} show={showCPw} onToggle={()=>setShowCPw(v=>!v)} placeholder="Repeat password" />
        {error && <Err>{error}</Err>}
        <button type="submit" className="auth-submit" disabled={busy||password.length<8||!confirmPw}>
          {busy ? <Spinner /> : 'Continue →'}
        </button>
      </form>
    </div>
  )
}

function ProfileStep({ displayName, setDisplayName, username, setUsername, major, setMajor, year, setYear, bio, setBio, usernameOk, usernameBad, usernameStatus, busy, error, onSubmit, uni }) {
  return (
    <div>
      {/* Header with campus pill */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div>
          <h2 className="font-display" style={{ fontSize:28, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:4 }}>Set up your profile.</h2>
          <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)' }}>
            {uni ? <>You're joining <span style={{ color: uni.color, fontWeight:600 }}>{uni.short || uni.name}</span></> : 'Almost there — one last step.'}
          </p>
        </div>
        {uni && <span style={{ fontSize:32, marginLeft:'auto', flexShrink:0 }}>{uni.emoji}</span>}
      </div>

      <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* Display name */}
        <div>
          <Label>Your name *</Label>
          <input type="text" placeholder="Alex Rivera" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoFocus />
        </div>

        {/* Username */}
        <div>
          <Label>Username *</Label>
          <div className="username-input-wrap">
            <span className="username-prefix">@</span>
            <input
              type="text"
              placeholder="alexr"
              value={username}
              onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))}
              style={{
                borderColor: usernameOk ? 'rgba(52,211,153,0.6) !important' : usernameBad ? 'rgba(255,107,138,0.6) !important' : undefined,
              }}
            />
            <span className="username-status">
              {usernameStatus==='checking' && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>…</span>}
              {usernameOk  && <span style={{ color:'#34d399' }}>✓</span>}
              {usernameBad && <span style={{ color:'#ff6b8a' }}>✗</span>}
            </span>
          </div>
          {usernameBad && <div style={{ fontSize:11, color:'#ff6b8a', marginTop:5, fontFamily:"'Inter',sans-serif" }}>@{username} is already taken</div>}
          {usernameOk  && <div style={{ fontSize:11, color:'#34d399', marginTop:5, fontFamily:"'Inter',sans-serif" }}>@{username} is available!</div>}
        </div>

        {/* Major + Year */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <Label>Major</Label>
            <input type="text" placeholder="CS, Biology…" value={major} onChange={e=>setMajor(e.target.value)} />
          </div>
          <div>
            <Label>Year</Label>
            <select value={year} onChange={e=>setYear(e.target.value)}>
              <option value="">Select…</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label>Bio <span style={{ color:'rgba(255,255,255,0.2)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></Label>
          <textarea placeholder="Tell your campus about yourself…" value={bio} onChange={e=>setBio(e.target.value)} rows={3} />
        </div>

        {error && <Err>{error}</Err>}

        <button type="submit" className="auth-submit" disabled={busy || !displayName.trim() || !username.trim() || usernameBad || usernameStatus==='checking'}>
          {busy ? <Spinner /> : 'Enter campus →'}
        </button>
      </form>
    </div>
  )
}

function SetPasswordStepReset({ password, setPw, confirmPw, setConfirmPw, showPw, setShowPw, showCPw, setShowCPw, busy, error, onSubmit }) {
  const strength = password.length===0 ? null : password.length<8 ? 'weak' : password.length<12 ? 'fair' : 'strong'
  const sc = { weak:'#ff6b8a', fair:'#f59e0b', strong:'#34d399' }
  const sw = { weak:'33%', fair:'66%', strong:'100%' }
  return (
    <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <PwField label="New password" value={password} onChange={setPw} show={showPw} onToggle={()=>setShowPw(v=>!v)} placeholder="At least 8 characters" autoFocus />
      {strength && (
        <div style={{ marginTop:-6 }}>
          <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:sw[strength], background:sc[strength], borderRadius:2, transition:'width 0.3s,background 0.3s' }} />
          </div>
          <div style={{ fontSize:10, color:sc[strength], marginTop:4, fontFamily:"'Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.06em' }}>{strength}</div>
        </div>
      )}
      <PwField label="Confirm password" value={confirmPw} onChange={setConfirmPw} show={showCPw} onToggle={()=>setShowCPw(v=>!v)} placeholder="Repeat password" />
      {error && <Err>{error}</Err>}
      <button type="submit" className="auth-submit" disabled={busy||password.length<8||!confirmPw}>
        {busy ? <Spinner /> : 'Update password →'}
      </button>
    </form>
  )
}

function ResetStep(props) {
  return (
    <div>
      <div style={{ fontSize:32, marginBottom:12 }}>🔑</div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Reset password.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:26 }}>Choose a new secure password for your account.</p>
      <SetPasswordStepReset {...props} />
    </div>
  )
}

function ForgotOtpEmailStep({ email, setEmail, busy, error, onSubmit, onBack }) {
  return (
    <div>
      <div style={{ fontSize:32, marginBottom:12 }}>🔑</div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Reset password.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:26 }}>Enter your campus email and we'll send a 6-digit verification code.</p>
      <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <Label>Email</Label>
          <input type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        {error && <Err>{error}</Err>}
        <button type="submit" className="auth-submit" disabled={busy || !email}>
          {busy ? <Spinner /> : 'Send code →'}
        </button>
      </form>
      <button className="auth-link" style={{ marginTop:16, display:'block' }} onClick={onBack}>← Back to sign in</button>
    </div>
  )
}

function ForgotSentStep({ email, onBack }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:18 }}>📬</div>
      <h2 className="font-display" style={{ fontSize:28, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:10 }}>Check your inbox.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.7, marginBottom:6 }}>We sent a password reset link to</p>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:'rgba(255,255,255,0.75)', fontWeight:500, marginBottom:28 }}>{email}</p>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.22)', marginBottom:28 }}>Check your spam folder if you don't see it.</p>
      <button onClick={onBack}
        style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:12, padding:'11px 24px', fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.7)', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='#fff'}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.7)'}}
      >← Back to sign in</button>
    </div>
  )
}

function AlreadyExistsStep({ email, onSignIn, onReset, busy, error }) {
  return (
    <div>
      <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
      <h2 className="font-display" style={{ fontSize:30, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:6 }}>Already registered.</h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:6 }}>
        <strong style={{ color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{email}</strong> is already on <span style={{ fontFamily:"'Pacifico', cursive", fontSize:13 }}>Campusly</span>.
      </p>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:28 }}>Sign in with your password, or reset it if you've forgotten it.</p>
      {error && <Err>{error}</Err>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button className="auth-submit" style={{ marginTop:0 }} onClick={onSignIn} disabled={busy}>
          Sign in →
        </button>
        <button
          onClick={onReset}
          disabled={busy}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:12, padding:13, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.6)', cursor:'pointer', transition:'all 0.2s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.10)';e.currentTarget.style.color='#fff'}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(255,255,255,0.6)'}}
        >
          {busy ? <Spinner /> : 'Reset password'}
        </button>
      </div>
    </div>
  )
}

function UnknownEduPill() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,107,138,0.08)', border:'1px solid rgba(255,107,138,0.22)', borderRadius:10, padding:'9px 13px', marginTop:10 }}>
      <span>⚠️</span>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#ff6b8a' }}>This .edu domain isn't in our list yet.</span>
    </div>
  )
}

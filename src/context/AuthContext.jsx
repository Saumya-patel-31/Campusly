import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { wsClient } from '../lib/wsClient.js'
import { getUniversityFromEmail, isValidCampusEmail } from '../lib/universities.js'

export const AuthContext = createContext(null)

function injectCampusColor(color) {
  if (!color) return
  const root = document.documentElement
  root.style.setProperty('--campus', color)
  root.style.setProperty('--campus-dim', `${color}18`)
  root.style.setProperty('--campus-border', `${color}35`)
}

// ─── Evaluated ONCE at module load, before any React renders ─────────────────
// We always include ?mode=reset in our forgotPassword redirectTo URL,
// so this is a reliable synchronous signal that a reset link was clicked.
const RECOVERY_ON_LOAD =
  new URLSearchParams(window.location.search).get('mode') === 'reset'

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      _setError]     = useState(null)

  // Always store errors as strings — never objects or undefined
  const setError = useCallback((val) => {
    if (!val) { _setError(null); return }
    if (typeof val === 'string') { _setError(val); return }
    if (typeof val?.message === 'string' && val.message) { _setError(val.message); return }
    _setError('Something went wrong. Please try again.')
  }, [])

  // isRecovery state drives the UI; recoveryRef is readable inside closures
  // without stale-closure issues.
  const [isRecovery, _setIsRecovery] = useState(RECOVERY_ON_LOAD)
  const recoveryRef = useRef(RECOVERY_ON_LOAD)
  function setRecovery(val) {
    recoveryRef.current = val
    _setIsRecovery(val)
  }

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data)
      injectCampusColor(data.campus_color)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {

      // PASSWORD_RECOVERY always wins — set recovery and stop
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
        setSession(session)
        setLoading(false)
        return
      }

      // While in recovery mode, block INITIAL_SESSION / SIGNED_IN from
      // fetching the profile and routing to the Feed.
      // The ref (not state) is used here because this closure captures
      // RECOVERY_ON_LOAD via the ref, so it's always fresh.
      if (recoveryRef.current) {
        setSession(session)
        setLoading(false)
        return
      }

      // Normal auth flow
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        wsClient.connect(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
        wsClient.disconnect()
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // ── OTP (signup) ──────────────────────────────────────────────────────────
  const sendOtp = useCallback(async (email) => {
    setError(null)
    const trimmed = email.trim().toLowerCase()

    if (!isValidCampusEmail(trimmed)) {
      const domain = trimmed.split('@')[1] || ''
      if (!domain.endsWith('.edu')) {
        setError('You must use a university .edu email address.')
      } else {
        setError(`"${domain}" is not a recognized university. Use your official institution email.`)
      }
      return false
    }

    // Check if this email is already registered via a server-side RPC that
    // queries auth.users. This avoids sending an unwanted OTP as a probe.
    // Falls through to new-user signup if the RPC isn't deployed yet.
    const { data: alreadyExists } = await supabase.rpc('check_email_registered', { p_email: trimmed })
    if (alreadyExists) {
      return 'existing'
    }

    // New user — send OTP and create account
    const uni = getUniversityFromEmail(trimmed)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        data: {
          campus_name:  uni.name,
          campus_short: uni.short,
          campus_emoji: uni.emoji,
          campus_color: uni.color,
        },
      },
    })
    if (error) { setError(typeof error.message === 'string' ? error.message : 'Failed to send code. Please try again.'); return false }
    return true
  }, [])

  const verifyOtp = useCallback(async (email, token) => {
    setError(null)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    })
    if (error) { setError(typeof error.message === 'string' ? error.message : 'Invalid or expired code. Please try again.'); return false }
    return !!data.session
  }, [])

  // ── Password auth ─────────────────────────────────────────────────────────
  const signInPassword = useCallback(async (email, password) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password.')
      } else {
        setError(error.message)
      }
      return false
    }
    return true
  }, [])

  const setUserPassword = useCallback(async (password) => {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return false }
    // Clear recovery mode then fetch profile so the app routes normally
    setRecovery(false)
    const { data: { session: current } } = await supabase.auth.getSession()
    if (current) await fetchProfile(current.user.id)
    return true
  }, [fetchProfile])

  const forgotPassword = useCallback(async (email) => {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/join?mode=reset` }
    )
    if (error) { setError(error.message); return false }
    return true
  }, [])

  const sendResetOtp = useCallback(async (email) => {
    setError(null)
    const trimmed = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    })
    if (error) {
      setError('Could not send code. Make sure this email is registered with Campusly.')
      return false
    }
    return true
  }, [])

  // ── Profile ───────────────────────────────────────────────────────────────
  const completeProfile = useCallback(async (userId, fields) => {
    setError(null)
    const cleanUsername = fields.username.trim().toLowerCase()

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', cleanUsername).neq('id', userId).maybeSingle()
    if (existing) {
      setError(`@${cleanUsername} is already taken. Choose a different username.`)
      return false
    }

    const { data: rows, error } = await supabase
      .from('profiles')
      .upsert({
        id:           userId,
        username:     cleanUsername,
        display_name: fields.displayName.trim(),
        major:        fields.major?.trim() || '',
        year:         fields.year || '',
        bio:          fields.bio?.trim() || '',
        campus_emoji: fields.campusEmoji,
        campus_color: fields.campusColor,
        domain:       fields.domain || '',
        campus_short: fields.campusShort || '',
        campus_name:  fields.campusName  || '',
      })
      .select()

    if (error) { setError(error.message); return false }
    const data = rows?.[0]
    if (!data) { setError('Failed to save profile. Please try again.'); return false }
    setProfile(data)
    injectCampusColor(data.campus_color)
    return true
  }, [])

  const updateProfile = useCallback(async (fields) => {
    if (!session) return false
    const { data, error } = await supabase
      .from('profiles').update(fields).eq('id', session.user.id).select().single()
    if (error) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        setError(`@${fields.username} is already taken. Choose a different username.`)
      } else {
        setError(error.message)
      }
      return false
    }
    setProfile(data)
    if (data.campus_color) injectCampusColor(data.campus_color)
    return true
  }, [session])

  const uploadAvatar = useCallback(async (file) => {
    if (!session) return null
    const ext  = file.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setError(uploadError.message); return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar_url: data.publicUrl + '?t=' + Date.now() })
    return data.publicUrl
  }, [session, updateProfile])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      session, profile, loading, error, isRecovery,
      sendOtp, verifyOtp,
      signInPassword, setUserPassword, forgotPassword, sendResetOtp,
      completeProfile, updateProfile, uploadAvatar, logout,
      setError,
      user: session?.user ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}


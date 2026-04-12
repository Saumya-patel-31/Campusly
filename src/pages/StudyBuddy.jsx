import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

/* ── Normalize old single-value answers to arrays ─────────────────── */
const toArr = v => Array.isArray(v) ? v : (v ? [v] : [])

/* ── Questionnaire definition ─────────────────────────────────────── */
const QUESTIONS = [
  {
    key: 'study_time',
    label: 'When do you study best?',
    icon: '🕐',
    options: [
      { value: 'early_morning', label: 'Early morning', sub: '6 – 9 am',   emoji: '🌅' },
      { value: 'morning',       label: 'Morning',       sub: '9am – 12pm', emoji: '☀️' },
      { value: 'afternoon',     label: 'Afternoon',     sub: '12 – 5pm',   emoji: '🌤️' },
      { value: 'evening',       label: 'Evening',       sub: '5 – 9pm',    emoji: '🌙' },
      { value: 'late_night',    label: 'Late night',    sub: '9pm+',       emoji: '🌃' },
    ],
  },
  {
    key: 'style',
    label: 'How do you prefer to study?',
    icon: '👥',
    options: [
      { value: 'solo',        label: 'Solo',        sub: 'I focus better alone',   emoji: '🧘' },
      { value: 'small_group', label: 'Small group', sub: '2 – 3 people',           emoji: '👥' },
      { value: 'large_group', label: 'Large group', sub: '4+ people',              emoji: '🎓' },
      { value: 'mix',         label: 'Flexible',    sub: 'Depends on the subject', emoji: '🔄' },
    ],
  },
  {
    key: 'environment',
    label: 'What environment do you prefer?',
    icon: '🔊',
    options: [
      { value: 'silent',      label: 'Silent',          sub: 'No noise at all',        emoji: '🤫' },
      { value: 'soft_music',  label: 'Soft music',      sub: 'Lo-fi, ambient',         emoji: '🎵' },
      { value: 'cafe_noise',  label: 'Café noise',      sub: 'Busy background sounds', emoji: '☕' },
      { value: 'headphones',  label: 'Doesn\'t matter', sub: 'I use headphones',       emoji: '🎧' },
    ],
  },
  {
    key: 'goals',
    label: 'What are you usually studying for?',
    icon: '🎯',
    options: [
      { value: 'exam_prep',    label: 'Exam prep',     sub: 'Tests & quizzes',          emoji: '📝' },
      { value: 'deep_learn',   label: 'Deep learning', sub: 'Actually understand it',   emoji: '🔬' },
      { value: 'quick_review', label: 'Quick review',  sub: 'Fast catch-up / cram',     emoji: '⚡' },
      { value: 'projects',     label: 'Projects',      sub: 'Assignments & group work', emoji: '💼' },
    ],
  },
  {
    key: 'breaks',
    label: 'How do you take breaks?',
    icon: '⏱️',
    options: [
      { value: 'pomodoro',     label: 'Pomodoro',         sub: '25 min on, 5 min off',    emoji: '🍅' },
      { value: 'frequent',     label: 'Short & frequent', sub: 'Every 20-30 min',         emoji: '🏃' },
      { value: 'long_session', label: 'Long sessions',    sub: 'Then one big break',      emoji: '🏋️' },
      { value: 'no_pattern',   label: 'No pattern',       sub: 'Whenever I feel like it', emoji: '🤷' },
    ],
  },
  {
    key: 'location',
    label: 'Where do you prefer to study?',
    icon: '📍',
    options: [
      { value: 'library',  label: 'Library',      sub: 'Quiet & structured',    emoji: '📚' },
      { value: 'home',     label: 'Home / dorm',  sub: 'Comfortable & familiar', emoji: '🏠' },
      { value: 'cafe',     label: 'Coffee shop',  sub: 'Ambient energy',         emoji: '☕' },
      { value: 'outdoors', label: 'Outdoors',     sub: 'Fresh air & nature',     emoji: '🌿' },
      { value: 'anywhere', label: 'Anywhere',     sub: 'Flexible',               emoji: '🔄' },
    ],
  },
  {
    key: 'availability',
    label: 'When are you generally available?',
    icon: '📅',
    options: [
      { value: 'weekdays', label: 'Weekdays', sub: 'Mon – Fri',          emoji: '📅' },
      { value: 'weekends', label: 'Weekends', sub: 'Sat – Sun',          emoji: '🎉' },
      { value: 'both',     label: 'Both',     sub: 'Flexible schedule',  emoji: '📆' },
    ],
  },
]

/* ── Compatibility matrices ───────────────────────────────────────── */
const COMPAT = {
  study_time: {
    early_morning: { early_morning:1.0, morning:0.7, afternoon:0.3, evening:0.1, late_night:0.0 },
    morning:       { early_morning:0.7, morning:1.0, afternoon:0.7, evening:0.3, late_night:0.1 },
    afternoon:     { early_morning:0.3, morning:0.7, afternoon:1.0, evening:0.7, late_night:0.3 },
    evening:       { early_morning:0.1, morning:0.3, afternoon:0.7, evening:1.0, late_night:0.7 },
    late_night:    { early_morning:0.0, morning:0.1, afternoon:0.3, evening:0.7, late_night:1.0 },
  },
  style: {
    solo:        { solo:1.0, small_group:0.4, large_group:0.1, mix:0.6 },
    small_group: { solo:0.4, small_group:1.0, large_group:0.5, mix:0.8 },
    large_group: { solo:0.1, small_group:0.5, large_group:1.0, mix:0.7 },
    mix:         { solo:0.6, small_group:0.8, large_group:0.7, mix:1.0 },
  },
  environment: {
    silent:     { silent:1.0, soft_music:0.5, cafe_noise:0.1, headphones:0.7 },
    soft_music: { silent:0.5, soft_music:1.0, cafe_noise:0.5, headphones:0.8 },
    cafe_noise: { silent:0.1, soft_music:0.5, cafe_noise:1.0, headphones:0.8 },
    headphones: { silent:0.7, soft_music:0.8, cafe_noise:0.8, headphones:1.0 },
  },
  goals: {
    exam_prep:    { exam_prep:1.0, deep_learn:0.4, quick_review:0.7, projects:0.3 },
    deep_learn:   { exam_prep:0.4, deep_learn:1.0, quick_review:0.3, projects:0.6 },
    quick_review: { exam_prep:0.7, deep_learn:0.3, quick_review:1.0, projects:0.3 },
    projects:     { exam_prep:0.3, deep_learn:0.6, quick_review:0.3, projects:1.0 },
  },
  breaks: {
    pomodoro:     { pomodoro:1.0, frequent:0.6, long_session:0.3, no_pattern:0.5 },
    frequent:     { pomodoro:0.6, frequent:1.0, long_session:0.3, no_pattern:0.6 },
    long_session: { pomodoro:0.3, frequent:0.3, long_session:1.0, no_pattern:0.5 },
    no_pattern:   { pomodoro:0.5, frequent:0.6, long_session:0.5, no_pattern:1.0 },
  },
  location: {
    library:  { library:1.0, home:0.2, cafe:0.3, outdoors:0.2, anywhere:0.8 },
    home:     { library:0.2, home:1.0, cafe:0.3, outdoors:0.2, anywhere:0.7 },
    cafe:     { library:0.3, home:0.3, cafe:1.0, outdoors:0.4, anywhere:0.8 },
    outdoors: { library:0.2, home:0.2, cafe:0.4, outdoors:1.0, anywhere:0.7 },
    anywhere: { library:0.8, home:0.7, cafe:0.8, outdoors:0.7, anywhere:1.0 },
  },
  availability: {
    weekdays: { weekdays:1.0, weekends:0.1, both:0.8 },
    weekends: { weekdays:0.1, weekends:1.0, both:0.8 },
    both:     { weekdays:0.8, weekends:0.8, both:1.0 },
  },
}

const WEIGHTS = {
  study_time:   0.20,
  style:        0.17,
  environment:  0.11,
  goals:        0.11,
  breaks:       0.07,
  location:     0.07,
  availability: 0.07,
  interests:    0.20,  // interests overlap
}

/* ── Multi-select compat: avg of best pairwise scores ─────────────── */
function multiCompat(aVals, bVals, matrix) {
  const a = toArr(aVals)
  const b = toArr(bVals)
  if (!a.length || !b.length) return 0
  const scores = a.map(av => Math.max(...b.map(bv => matrix?.[av]?.[bv] ?? (av === bv ? 1 : 0.3))))
  return scores.reduce((s, x) => s + x, 0) / scores.length
}

/* ── Interests overlap: Dice coefficient on word tokens ───────────── */
function interestsCompat(aStr, bStr) {
  if (!aStr || !bStr) return 0
  const tokenize = s => s.toLowerCase().split(/[\s,;/+&]+/).map(t => t.trim()).filter(t => t.length > 2)
  const aSet = new Set(tokenize(aStr))
  const bTokens = tokenize(bStr)
  if (!aSet.size || !bTokens.length) return 0
  const common = bTokens.filter(t => aSet.has(t)).length
  return (2 * common) / (aSet.size + bTokens.length)
}

function computeCompatibility(a, b) {
  let score = 0
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    if (key === 'interests') {
      score += interestsCompat(a.interests, b.interests) * weight
    } else {
      score += multiCompat(a[key], b[key], COMPAT[key]) * weight
    }
  }
  return Math.round(score * 100)
}

/* ── Reason string ────────────────────────────────────────────────── */
function generateReason(mine, theirs) {
  // Interests match first (most meaningful)
  if (mine.interests && theirs.interests) {
    const tokenize = s => s.toLowerCase().split(/[\s,;/+&]+/).map(t => t.trim()).filter(t => t.length > 2)
    const aSet = new Set(tokenize(mine.interests))
    const shared = tokenize(theirs.interests).filter(t => aSet.has(t))
    if (shared.length > 0) {
      const display = shared.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ')
      return `You're both into ${display}`
    }
  }

  const matches = []
  for (const q of QUESTIONS) {
    const aArr = toArr(mine[q.key])
    const bArr = toArr(theirs[q.key])
    const overlap = aArr.filter(v => bArr.includes(v))
    if (overlap.length > 0) {
      const opt = q.options.find(o => o.value === overlap[0])
      if (opt) {
        if (q.key === 'study_time')   matches.push(`both ${opt.label.toLowerCase()} studiers`)
        else if (q.key === 'style')   matches.push(`prefer ${opt.label.toLowerCase()} studying`)
        else if (q.key === 'environment') matches.push(`like ${opt.label.toLowerCase()} environments`)
        else if (q.key === 'goals')   matches.push(`focused on ${opt.label.toLowerCase()}`)
        else if (q.key === 'location') matches.push(`prefer ${opt.label.toLowerCase()}`)
      }
    }
  }

  if (matches.length === 0) return 'Complementary study styles'
  if (matches.length === 1) return `You both ${matches[0]}`
  const last = matches.pop()
  return `You both ${matches.join(', ')} and ${last}`
}

function compatColor(pct) {
  if (pct >= 85) return '#34d399'
  if (pct >= 70) return '#60a5fa'
  if (pct >= 55) return '#f59e0b'
  return '#9ca3af'
}

/* ── Questionnaire ────────────────────────────────────────────────── */
function Questionnaire({ existing, onSave, campusColor }) {
  // Normalize existing answers (old string → array)
  const initAnswers = existing
    ? Object.fromEntries(
        Object.entries(existing).map(([k, v]) =>
          k === 'interests' ? [k, v] : [k, toArr(v)]
        )
      )
    : {}

  const [answers, setAnswers]     = useState(initAnswers)
  const [interests, setInterests] = useState(existing?.interests || '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const allAnswered = QUESTIONS.every(q => toArr(answers[q.key]).length > 0)

  function toggleOption(key, value) {
    setAnswers(prev => {
      const cur = toArr(prev[key])
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      return { ...prev, [key]: next }
    })
  }

  async function handleSave() {
    if (!allAnswered) { setError('Please answer all questions to find matches.'); return }
    setSaving(true)
    setError('')
    const payload = { ...answers, interests: interests.trim() }
    onSave(payload, () => setSaving(false), setError)
  }

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em' }}>
          Find Your Study Buddy 🧠
        </h1>
        <p style={{ margin:'6px 0 0', fontSize:13, color:'var(--text-3)' }}>
          Answer all questions — select as many options as apply. We'll match you with the most compatible people on campus.
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
        {QUESTIONS.map((q) => (
          <div key={q.key} style={{ ...panel, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>{q.icon}</span>
              <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-display)' }}>{q.label}</span>
              <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-3)', fontStyle:'italic' }}>
                Select all that apply
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: q.options.length <= 3 ? `repeat(${q.options.length}, 1fr)` : 'repeat(2, 1fr)', gap:8, marginTop:10 }}>
              {q.options.map(opt => {
                const selected = toArr(answers[q.key]).includes(opt.value)
                return (
                  <button key={opt.value} onClick={() => toggleOption(q.key, opt.value)} style={{
                    display:'flex', flexDirection:'column', alignItems:'flex-start',
                    gap:3, padding:'11px 13px', borderRadius:12, cursor:'pointer', textAlign:'left',
                    background: selected ? `${campusColor}18` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${selected ? campusColor + '60' : 'rgba(255,255,255,0.09)'}`,
                    transition:'all 0.14s',
                    boxShadow: selected ? `0 0 0 3px ${campusColor}15` : 'none',
                    position: 'relative',
                  }}>
                    {selected && (
                      <span style={{
                        position:'absolute', top:7, right:9,
                        width:16, height:16, borderRadius:'50%',
                        background: campusColor,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, color:'#fff', fontWeight:800, lineHeight:1,
                      }}>✓</span>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:18 }}>{opt.emoji}</span>
                      <span style={{ fontWeight: selected ? 700 : 500, fontSize:13, color: selected ? campusColor : 'var(--text)' }}>{opt.label}</span>
                    </div>
                    <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:25 }}>{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── Interests field ── */}
        <div style={{ ...panel, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>✨</span>
            <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-display)' }}>What are your interests?</span>
            <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-3)', fontStyle:'italic' }}>Optional — boosts matching</span>
          </div>
          <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--text-3)', lineHeight:1.5 }}>
            Type subjects, hobbies, or anything you're into — e.g. <em>machine learning, music, anime, chess, startups</em>
          </p>
          <textarea
            value={interests}
            onChange={e => setInterests(e.target.value)}
            placeholder="e.g. data science, guitar, hiking, anime, startups…"
            rows={3}
            style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(255,255,255,0.06)',
              border:`1.5px solid ${interests.trim() ? campusColor + '50' : 'rgba(255,255,255,0.12)'}`,
              borderRadius:12, padding:'11px 14px',
              color:'var(--text)', fontSize:13, lineHeight:1.6,
              resize:'vertical', outline:'none',
              fontFamily:'var(--font-body)',
              transition:'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = campusColor + '80'}
            onBlur={e => e.target.style.borderColor = interests.trim() ? campusColor + '50' : 'rgba(255,255,255,0.12)'}
          />
          {interests.trim() && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
              {interests.trim().split(/[\s,;/+&]+/).filter(t => t.length > 0).map((tag, i) => (
                <span key={i} style={{
                  background:`${campusColor}14`, border:`1px solid ${campusColor}35`,
                  borderRadius:999, padding:'2px 10px',
                  fontSize:11, color: campusColor,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginTop:16, fontSize:12, color:'#ff6b8a', background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.25)', borderRadius:10, padding:'9px 13px' }}>
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !allAnswered} style={{
        width:'100%', marginTop:20, padding:'14px',
        background: allAnswered ? campusColor : 'rgba(255,255,255,0.08)',
        border:'none', borderRadius:12, color: allAnswered ? '#fff' : 'var(--text-3)',
        fontWeight:700, fontSize:15, cursor: allAnswered && !saving ? 'pointer' : 'not-allowed',
        transition:'all 0.15s',
        boxShadow: allAnswered ? `0 4px 20px ${campusColor}40` : 'none',
      }}>
        {saving ? 'Finding your matches…' : allAnswered ? '✨ Find My Study Buddies' : `Answer all ${QUESTIONS.length} questions to continue`}
      </button>
    </div>
  )
}

/* ── Match Card ───────────────────────────────────────────────────── */
function MatchCard({ person, myAnswers, campusColor, onMessage }) {
  const pct    = computeCompatibility(myAnswers, person.answers)
  const reason = generateReason(myAnswers, person.answers)
  const color  = compatColor(pct)

  // Shared option chips (overlap between multi-select arrays)
  const sharedTraits = []
  for (const q of QUESTIONS) {
    const aArr = toArr(myAnswers[q.key])
    const bArr = toArr(person.answers[q.key])
    const overlap = aArr.filter(v => bArr.includes(v))
    for (const v of overlap) {
      const opt = q.options.find(o => o.value === v)
      if (opt) sharedTraits.push(`${opt.emoji} ${opt.label}`)
    }
    if (sharedTraits.length >= 4) break
  }
  const displayTraits = sharedTraits.slice(0, 3)
  const extraTraits   = sharedTraits.length - displayTraits.length

  // Shared interests tokens
  const sharedInterests = (() => {
    if (!myAnswers.interests || !person.answers.interests) return []
    const tokenize = s => s.toLowerCase().split(/[\s,;/+&]+/).map(t => t.trim()).filter(t => t.length > 2)
    const aSet = new Set(tokenize(myAnswers.interests))
    return tokenize(person.answers.interests).filter(t => aSet.has(t)).slice(0, 3)
  })()

  return (
    <div style={{ ...panel, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      {/* % gradient glow */}
      <div style={{
        position:'absolute', top:0, right:0, width:120, height:120,
        background:`radial-gradient(circle at top right, ${color}15, transparent 70%)`,
        pointerEvents:'none',
      }} />

      <div style={{ display:'flex', gap:13, alignItems:'flex-start' }}>
        <AvatarImg src={person.avatar_url} name={person.display_name} size={48} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-display)' }}>
              {person.display_name}
            </span>
            <span style={{
              background:`${color}20`, border:`1px solid ${color}50`,
              borderRadius:999, padding:'2px 10px',
              fontSize:12, fontWeight:800, color,
              letterSpacing:'-0.01em',
            }}>
              {pct}% match
            </span>
          </div>

          {person.major && (
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
              {person.major} · @{person.username}
            </div>
          )}

          <div style={{ fontSize:12, color:'var(--text-2)', marginTop:7, lineHeight:1.5, fontStyle:'italic' }}>
            "{reason}"
          </div>

          {/* Shared habit chips */}
          {displayTraits.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:9 }}>
              {displayTraits.map(t => (
                <span key={t} style={{
                  background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.11)',
                  borderRadius:999, padding:'2px 9px', fontSize:11, color:'var(--text-2)',
                }}>
                  {t}
                </span>
              ))}
              {extraTraits > 0 && (
                <span style={{
                  background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.11)',
                  borderRadius:999, padding:'2px 9px', fontSize:11, color:'var(--text-3)',
                }}>
                  +{extraTraits} more in common
                </span>
              )}
            </div>
          )}

          {/* Shared interest tags */}
          {sharedInterests.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:7 }}>
              <span style={{ fontSize:10, color:'var(--text-3)', alignSelf:'center' }}>Also into:</span>
              {sharedInterests.map(t => (
                <span key={t} style={{
                  background:`${campusColor}12`, border:`1px solid ${campusColor}35`,
                  borderRadius:999, padding:'2px 9px', fontSize:11, color: campusColor,
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display:'flex', gap:8, marginTop:14 }}>
        <button onClick={() => onMessage(person.user_id)} style={{
          flex:1, padding:'8px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
          background:`${campusColor}18`, border:`1px solid ${campusColor}40`, color:campusColor,
          transition:'all 0.15s',
        }}>
          💬 Message
        </button>
        <button onClick={() => window.open(`/profile/${person.username}`, '_self')} style={{
          padding:'8px 14px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', color:'var(--text-2)',
        }}>
          View Profile
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function StudyBuddy() {
  const { profile } = useAuth()
  const navigate     = useNavigate()
  const campusColor  = profile?.campus_color || '#a78bfa'
  const domain       = profile?.domain || ''

  const [myAnswers, setMyAnswers] = useState(null)
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showEdit, setShowEdit]   = useState(false)
  const [minPct, setMinPct]       = useState(0)

  async function loadData() {
    setLoading(true)

    const { data: mine } = await supabase
      .from('study_profiles')
      .select('answers')
      .eq('user_id', profile.id)
      .single()

    if (!mine) { setMyAnswers(null); setLoading(false); return }
    setMyAnswers(mine.answers)

    const { data: others } = await supabase
      .from('study_profiles')
      .select('user_id, answers')
      .eq('domain', domain)
      .neq('user_id', profile.id)

    if (!others || others.length === 0) { setMatches([]); setLoading(false); return }

    const ids = others.map(o => o.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, major')
      .in('id', ids)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

    const merged = others
      .map(o => ({ ...profileMap[o.user_id], user_id: o.user_id, answers: o.answers }))
      .filter(m => m.display_name)
      .sort((a, b) => computeCompatibility(mine.answers, b.answers) - computeCompatibility(mine.answers, a.answers))

    setMatches(merged)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [profile?.id, domain])

  async function handleSave(answers, onDone, onError) {
    const { error } = await supabase
      .from('study_profiles')
      .upsert({ user_id: profile.id, domain, answers, updated_at: new Date().toISOString() })
    if (error) { onError(error.message); onDone(); return }
    setMyAnswers(answers)
    setShowEdit(false)
    onDone()
    loadData()
  }

  async function handleDelete() {
    if (!confirm('Remove your study profile? You won\'t appear in others\' matches.')) return
    await supabase.from('study_profiles').delete().eq('user_id', profile.id)
    setMyAnswers(null)
    setMatches([])
  }

  const filteredMatches = matches.filter(m => computeCompatibility(myAnswers, m.answers) >= minPct)

  // ── No profile yet → show questionnaire ──
  if (!loading && (myAnswers === null || showEdit)) {
    return (
      <Layout>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>
          {showEdit && (
            <button onClick={() => setShowEdit(false)} style={{
              background:'transparent', border:'none', color:'var(--text-3)',
              cursor:'pointer', fontSize:13, padding:'0 0 20px', display:'flex', alignItems:'center', gap:6,
            }}>← Back to matches</button>
          )}
          <Questionnaire existing={myAnswers} onSave={handleSave} campusColor={campusColor} />
        </div>
      </Layout>
    )
  }

  // ── Has profile → show matches ──
  return (
    <Layout>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em' }}>
              Study Buddy 🧠
            </h1>
            <p style={{ margin:'5px 0 0', fontSize:13, color:'var(--text-3)' }}>
              {loading ? 'Finding your matches…' : `${filteredMatches.length} compatible stud${filteredMatches.length !== 1 ? 'ies' : 'y'} found on campus`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:12 }}>
            <button onClick={() => setShowEdit(true)} style={{
              padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'var(--text-2)',
            }}>✏️ Edit Profile</button>
          </div>
        </div>

        {/* My study style summary */}
        {myAnswers && !loading && (
          <div style={{ ...panel, padding:'14px 18px', marginBottom:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600, flexShrink:0 }}>Your style:</span>
              {QUESTIONS.slice(0, 3).map(q =>
                toArr(myAnswers[q.key]).map(v => {
                  const opt = q.options.find(o => o.value === v)
                  return opt ? (
                    <span key={`${q.key}-${v}`} style={{
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
                      borderRadius:999, padding:'3px 10px', fontSize:11, color:'var(--text-2)',
                    }}>
                      {opt.emoji} {opt.label}
                    </span>
                  ) : null
                })
              )}
              {myAnswers.interests && (
                <span style={{
                  background:`${campusColor}12`, border:`1px solid ${campusColor}30`,
                  borderRadius:999, padding:'3px 10px', fontSize:11, color: campusColor,
                }}>
                  ✨ {myAnswers.interests.split(/[\s,;]+/)[0]}…
                </span>
              )}
              <button onClick={handleDelete} style={{
                marginLeft:'auto', background:'transparent', border:'none',
                color:'rgba(255,107,138,0.5)', cursor:'pointer', fontSize:11,
              }}>Remove profile</button>
            </div>
          </div>
        )}

        {/* Min % filter */}
        {!loading && matches.length > 0 && (
          <div style={{ display:'flex', gap:7, marginBottom:20, flexWrap:'wrap' }}>
            {[0, 50, 65, 75, 85].map(pct => (
              <button key={pct} onClick={() => setMinPct(pct)} style={{
                padding:'4px 12px', borderRadius:999, fontSize:11, cursor:'pointer',
                background: minPct === pct ? `${campusColor}20` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${minPct === pct ? campusColor + '50' : 'rgba(255,255,255,0.10)'}`,
                color: minPct === pct ? campusColor : 'var(--text-2)',
                fontWeight: minPct === pct ? 600 : 400,
              }}>
                {pct === 0 ? 'All' : `${pct}%+`}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
            <div>Analyzing compatibility across campus…</div>
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div style={{ ...panel, padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
            <div style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:16, marginBottom:8 }}>
              You're the first one here!
            </div>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>
              No one else on {profile?.campus_short || 'your campus'} has filled out their study profile yet. Share Campusly with classmates to find your matches!
            </div>
          </div>
        )}

        {!loading && matches.length > 0 && filteredMatches.length === 0 && (
          <div style={{ ...panel, padding:'32px 24px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>
              No matches above {minPct}%. Try lowering the filter.
            </div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filteredMatches.map(person => (
            <MatchCard
              key={person.user_id}
              person={person}
              myAnswers={myAnswers}
              campusColor={campusColor}
              onMessage={userId => navigate(`/messages/${userId}`)}
            />
          ))}
        </div>

      </div>
    </Layout>
  )
}

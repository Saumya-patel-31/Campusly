import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

/* ── Mood definitions ───────────────────────────────────────────── */
const MOODS = [
  { key: 'chill',       label: 'Chill',       emoji: '😎', color: '#60a5fa', desc: 'All good, no stress' },
  { key: 'hyped',       label: 'Hyped',       emoji: '🤩', color: '#f59e0b', desc: 'Energy is through the roof' },
  { key: 'motivated',   label: 'Motivated',   emoji: '💪', color: '#34d399', desc: 'Let\'s get it' },
  { key: 'stressed',    label: 'Stressed',    emoji: '😰', color: '#ff6b8a', desc: 'Too much on my plate' },
  { key: 'tired',       label: 'Dead tired',  emoji: '😴', color: '#a78bfa', desc: 'Send help & coffee' },
  { key: 'caffeinated', label: 'Caffeinated', emoji: '☕', color: '#d97706', desc: 'Running on caffeine' },
  { key: 'overwhelmed', label: 'Overwhelmed', emoji: '🤯', color: '#ec4899', desc: 'Too many deadlines' },
  { key: 'happy',       label: 'Happy',       emoji: '😊', color: '#4ade80', desc: 'Good day on campus' },
]

function moodFor(key) {
  return MOODS.find(m => m.key === key) || MOODS[0]
}

/* ── Sparkline (hourly trend) ───────────────────────────────────── */
function Sparkline({ hourlyData, color }) {
  const hours = Array.from({ length: 24 }, (_, i) => hourlyData[i] || 0)
  const max   = Math.max(...hours, 1)
  const W = 240, H = 40

  const points = hours.map((v, i) => {
    const x = (i / 23) * W
    const y = H - (v / max) * H
    return `${x},${y}`
  }).join(' ')

  // Current hour marker
  const nowH  = new Date().getHours()
  const nowX  = (nowH / 23) * W

  return (
    <svg width={W} height={H} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`0,${H} ${points} ${W},${H}`}
        fill="url(#sparkGrad)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Now marker */}
      <line x1={nowX} y1={0} x2={nowX} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
      <circle cx={nowX} cy={H - (hours[nowH] / max) * H} r="3.5" fill={color} />
    </svg>
  )
}

/* ── Mood Bar ────────────────────────────────────────────────────── */
function MoodBar({ mood, count, total, isTop, isMyVote, onClick, animDelay }) {
  const pct      = total > 0 ? Math.round((count / total) * 100) : 0
  const barRef   = useRef(null)

  useEffect(() => {
    if (!barRef.current) return
    // Animate width on mount/update
    requestAnimationFrame(() => {
      if (barRef.current) barRef.current.style.width = `${Math.max(pct, 0)}%`
    })
  }, [pct])

  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', textAlign:'left', cursor:'pointer',
        background: isMyVote ? `${mood.color}12` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${isMyVote ? mood.color + '50' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding:'13px 16px',
        transition:'all 0.2s',
        boxShadow: isTop ? `0 0 0 1px ${mood.color}30, 0 4px 20px ${mood.color}15` : 'none',
        position:'relative', overflow:'hidden',
      }}
    >
      {/* Animated fill bar behind content */}
      <div ref={barRef} style={{
        position:'absolute', left:0, top:0, bottom:0,
        width:'0%',
        background:`${mood.color}09`,
        transition:`width 0.8s cubic-bezier(0.4,0,0.2,1) ${animDelay}ms`,
        borderRadius:14,
        pointerEvents:'none',
      }} />

      <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
        {/* Emoji */}
        <span style={{
          fontSize: isTop ? 30 : 24,
          transition:'font-size 0.2s',
          filter: isTop ? 'drop-shadow(0 0 8px ' + mood.color + '80)' : 'none',
        }}>
          {mood.emoji}
        </span>

        {/* Label + desc */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight: isTop || isMyVote ? 700 : 500, fontSize:14, color: isMyVote ? mood.color : 'var(--text)' }}>
              {mood.label}
            </span>
            {isTop && (
              <span style={{
                background:`${mood.color}20`, border:`1px solid ${mood.color}40`,
                borderRadius:999, padding:'1px 8px', fontSize:10, fontWeight:700, color:mood.color,
                letterSpacing:'0.05em',
              }}>LEADING</span>
            )}
            {isMyVote && (
              <span style={{
                background:'rgba(255,255,255,0.08)', borderRadius:999,
                padding:'1px 8px', fontSize:10, color:'var(--text-3)',
              }}>your vote</span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{mood.desc}</div>
        </div>

        {/* Count + % */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontWeight:700, fontSize:15, color: isTop ? mood.color : 'var(--text-2)', fontFamily:'var(--font-display)' }}>
            {pct}%
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{count} vote{count !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </button>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function MoodBoard() {
  const { profile } = useAuth()
  const campusColor = profile?.campus_color || '#a78bfa'
  const domain      = profile?.domain || ''

  const today = new Date().toISOString().slice(0, 10)

  const [votes, setVotes]       = useState([])       // all today's votes for this domain
  const [myVote, setMyVote]     = useState(null)     // current user's mood key
  const [voting, setVoting]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [hourly, setHourly]     = useState({})       // { hour: count } for top mood
  const [showAll, setShowAll]   = useState(false)
  const [pulse, setPulse]       = useState(false)    // trigger animation on new vote

  async function loadVotes() {
    const { data } = await supabase
      .from('mood_votes')
      .select('mood, hour, user_id')
      .eq('domain', domain)
      .eq('voted_on', today)

    const rows = data || []
    setVotes(rows)

    // Find my vote
    const mine = rows.find(r => r.user_id === profile?.id)
    setMyVote(mine?.mood || null)

    // Build hourly breakdown for the top mood
    const topMood = getTopMood(rows)
    if (topMood) {
      const h = {}
      rows.filter(r => r.mood === topMood).forEach(r => {
        h[r.hour] = (h[r.hour] || 0) + 1
      })
      setHourly(h)
    }

    setLoading(false)
  }

  useEffect(() => { loadVotes() }, [domain, profile?.id])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel('mood_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mood_votes',
        filter: `domain=eq.${domain}`,
      }, () => {
        loadVotes()
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [domain])

  async function handleVote(moodKey) {
    if (voting) return
    setVoting(true)

    if (myVote === moodKey) {
      // Unvote
      await supabase.from('mood_votes')
        .delete()
        .eq('user_id', profile.id)
        .eq('domain', domain)
        .eq('voted_on', today)
      setMyVote(null)
      setVotes(prev => prev.filter(v => v.user_id !== profile.id))
    } else if (myVote) {
      // Change vote
      const nowH = new Date().getHours()
      await supabase.from('mood_votes')
        .update({ mood: moodKey, hour: nowH })
        .eq('user_id', profile.id)
        .eq('domain', domain)
        .eq('voted_on', today)
      setMyVote(moodKey)
      setVotes(prev => prev.map(v => v.user_id === profile.id ? { ...v, mood: moodKey, hour: nowH } : v))
    } else {
      // New vote
      const nowH = new Date().getHours()
      const { error } = await supabase.from('mood_votes').insert({
        user_id: profile.id,
        domain,
        mood: moodKey,
        voted_on: today,
        hour: nowH,
      })
      if (!error) {
        setMyVote(moodKey)
        setVotes(prev => [...prev, { mood: moodKey, hour: nowH, user_id: profile.id }])
      }
    }

    setVoting(false)
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
  }

  // Aggregate counts
  const counts = {}
  MOODS.forEach(m => counts[m.key] = 0)
  votes.forEach(v => { if (counts[v.mood] !== undefined) counts[v.mood]++ })

  const total   = votes.length
  const topKey  = getTopMood(votes)
  const topMood = topKey ? moodFor(topKey) : null

  const sorted = [...MOODS].sort((a, b) => counts[b.key] - counts[a.key])
  const shown  = showAll ? sorted : sorted.slice(0, 5)

  const timeLabel = (() => {
    const h = new Date().getHours()
    if (h < 6)  return 'Late night 🌃'
    if (h < 12) return 'This morning ☀️'
    if (h < 17) return 'This afternoon 🌤️'
    if (h < 21) return 'This evening 🌙'
    return 'Tonight 🌃'
  })()

  return (
    <Layout>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em' }}>
            Campus Pulse 🌡️
          </h1>
          <p style={{ margin:'5px 0 0', fontSize:13, color:'var(--text-3)' }}>
            How's {profile?.campus_short || 'campus'} feeling {timeLabel.toLowerCase()}? · Anonymous
          </p>
        </div>

        {/* ── Hero: dominant mood ── */}
        {!loading && topMood && total > 0 && (
          <div style={{
            background:`${topMood.color}10`,
            border:`1.5px solid ${topMood.color}35`,
            borderRadius:20, padding:'24px 26px', marginBottom:24,
            position:'relative', overflow:'hidden',
            transition:'all 0.4s',
          }}>
            {/* Glow blob */}
            <div style={{
              position:'absolute', top:-30, right:-30,
              width:160, height:160,
              background:`radial-gradient(circle, ${topMood.color}25, transparent 70%)`,
              pointerEvents:'none',
            }} />

            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:topMood.color, marginBottom:10 }}>
              Campus is feeling…
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
              <span style={{
                fontSize:56,
                filter:`drop-shadow(0 0 16px ${topMood.color}70)`,
                animation: pulse ? 'none' : undefined,
                transform: pulse ? 'scale(1.15)' : 'scale(1)',
                transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                display:'block',
              }}>
                {topMood.emoji}
              </span>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color:topMood.color, letterSpacing:'-0.02em' }}>
                  {topMood.label}
                </div>
                <div style={{ fontSize:13, color:'var(--text-2)', marginTop:3 }}>
                  {total} {total === 1 ? 'person has' : 'people have'} voted today · resets at midnight
                </div>
              </div>
            </div>

            {/* Sparkline */}
            {Object.keys(hourly).length > 0 && (
              <div>
                <div style={{ fontSize:11, color:`${topMood.color}90`, marginBottom:6, fontWeight:600 }}>
                  {topMood.label} votes throughout the day
                </div>
                <Sparkline hourlyData={hourly} color={topMood.color} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-3)', marginTop:4 }}>
                  <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>now</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── No votes yet ── */}
        {!loading && total === 0 && (
          <div style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:20, padding:'32px 26px', marginBottom:24, textAlign:'center',
          }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🌱</div>
            <div style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:16, marginBottom:6 }}>
              No votes yet today
            </div>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>
              Be the first to share how {profile?.campus_short || 'campus'} is feeling!
            </div>
          </div>
        )}

        {/* ── Vote prompt ── */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:12 }}>
            {myVote ? 'Your vote — tap to change or deselect' : 'How are you feeling right now?'}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {shown.map((mood, i) => (
              <MoodBar
                key={mood.key}
                mood={mood}
                count={counts[mood.key]}
                total={total}
                isTop={mood.key === topKey && total > 0}
                isMyVote={mood.key === myVote}
                onClick={() => handleVote(mood.key)}
                animDelay={i * 60}
              />
            ))}
          </div>

          {!showAll && (
            <button onClick={() => setShowAll(true)} style={{
              width:'100%', marginTop:10, padding:'10px',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, fontSize:12, color:'var(--text-3)', cursor:'pointer',
              transition:'all 0.15s',
            }}>
              Show {MOODS.length - 5} more moods ▾
            </button>
          )}
        </div>

        {/* ── Stats footer ── */}
        {total > 0 && (
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
            gap:10, marginTop:20,
          }}>
            {[
              { label:'Voted today', value: total, emoji:'🗳️' },
              { label:'Dominant vibe', value: topMood?.label || '—', emoji: topMood?.emoji || '❓' },
              { label:'Top %', value: topKey ? `${Math.round((counts[topKey]/total)*100)}%` : '—', emoji:'📊' },
            ].map(s => (
              <div key={s.label} style={{
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:14, padding:'14px 16px', textAlign:'center',
              }}>
                <div style={{ fontSize:22, marginBottom:5 }}>{s.emoji}</div>
                <div style={{ fontWeight:800, fontSize:16, fontFamily:'var(--font-display)', color:'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2, letterSpacing:'0.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Anonymous note ── */}
        <div style={{ marginTop:20, fontSize:11, color:'var(--text-3)', textAlign:'center', lineHeight:1.6 }}>
          🔒 Completely anonymous · Votes reset every day at midnight · Only campus peers can see this
        </div>

      </div>
    </Layout>
  )
}

function getTopMood(votes) {
  if (!votes.length) return null
  const counts = {}
  votes.forEach(v => { counts[v.mood] = (counts[v.mood] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

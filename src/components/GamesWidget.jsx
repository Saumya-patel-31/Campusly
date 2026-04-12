import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { AvatarImg } from './Layout.jsx'
import { supabase } from '../lib/supabase.js'

const panelBase = {
  background: 'transparent',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const GAMES = [
  { id:'wordle',  name:'Campus Wordle', emoji:'🔤', color:'#22c55e' },
  { id:'connect', name:'Word Connect',  emoji:'🔗', color:'#60a5fa' },
  { id:'quiz',    name:'Campus Quiz',   emoji:'🎓', color:'#f59e0b' },
]

const medals = ['🥇','🥈','🥉']

export default function GamesWidget() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const campusColor = profile?.campus_color || '#a78bfa'
  const todayStr = getTodayStr()
  const [scores, setScores] = useState({})
  const [top3, setTop3] = useState([])

  // Load this user's local scores
  useEffect(() => {
    if (!profile?.id) return
    const uid = profile.id
    const s = {}
    try {
      const w = JSON.parse(localStorage.getItem(`campusly_wordle_${uid}_${todayStr}`))
      if (w?.gameOver) s.wordle = w.won ? Math.max(10, 100-(w.currentRow-1)*15) : 0
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(`campusly_connect_${uid}_${todayStr}`))
      if (c?.gameOver) s.connect = c.won ? Math.max(0,4-c.mistakes)*25 : 0
    } catch {}
    try {
      const q = JSON.parse(localStorage.getItem(`campusly_quiz_${uid}_${todayStr}`))
      if (q?.gameOver) s.quiz = q.score*20
    } catch {}
    setScores(s)
  }, [profile?.id, todayStr])

  // Fetch top 3 from Supabase (two-step: scores then profiles)
  async function fetchTop3(domain) {
    if (!domain) return
    const { data: scoreRows } = await supabase
      .from('game_scores')
      .select('user_id, total_score')
      .eq('domain', domain)
      .eq('score_date', todayStr)
      .order('total_score', { ascending: false })
      .limit(3)

    if (!scoreRows?.length) { setTop3([]); return }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', scoreRows.map(r => r.user_id))

    const profileMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]))
    setTop3(scoreRows.map(r => ({ ...r, profile: profileMap[r.user_id] })))
  }

  // Re-fetch on account switch (profile.id changes) or domain change
  useEffect(() => {
    fetchTop3(profile?.domain)
  }, [profile?.id, profile?.domain, todayStr])

  // Real-time updates
  useEffect(() => {
    if (!profile?.domain) return
    const channel = supabase
      .channel(`game_scores_widget_${profile.domain}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_scores',
        filter: `domain=eq.${profile.domain}`,
      }, () => fetchTop3(profile.domain))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile?.domain])

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  return (
    <div style={{ ...panelBase, padding:18, border:`1.5px solid ${campusColor}55`, boxShadow:`0 4px 24px rgba(0,0,0,0.35), 0 0 0 0px ${campusColor}` }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🎮</span>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>Daily Games</span>
        </div>
        {totalScore > 0 && (
          <div style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, color:'var(--campus)', padding:'3px 8px', borderRadius:20, background:'var(--campus-dim)', border:'1px solid var(--campus-border)' }}>
            {totalScore} pts
          </div>
        )}
      </div>

      {/* Games list card */}
      <div style={{
        background: 'transparent',
        border: `1px solid ${campusColor}40`,
        borderRadius: 12,
        padding: '10px',
        marginBottom: 10,
      }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {GAMES.map(g => {
            const done = scores[g.id] !== undefined
            return (
              <div key={g.id} onClick={() => navigate('/games')} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10,
                background: done ? `${g.color}0d` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${done ? g.color+'33' : 'rgba(255,255,255,0.08)'}`,
                cursor:'pointer', transition:'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = done ? g.color+'55' : 'rgba(255,255,255,0.16)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = done ? g.color+'33' : 'rgba(255,255,255,0.08)'}
              >
                <span style={{ fontSize:16 }}>{g.emoji}</span>
                <span style={{ flex:1, fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color: done ? g.color : 'var(--text-2)' }}>{g.name}</span>
                {done
                  ? <span style={{ fontSize:11, color:g.color, fontFamily:'var(--font-display)', fontWeight:700 }}>+{scores[g.id]} ✓</span>
                  : <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-display)' }}>Play →</span>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard card */}
      <div style={{
        background: 'transparent',
        border: `1px solid ${campusColor}40`,
        borderRadius: 12,
        padding: '14px 14px 12px',
      }}>
        {/* Mini leaderboard — top 3 from Supabase */}
        <div style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
          Today's Leaders
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
          {[0, 1, 2].map(i => {
            const entry = top3[i]
            const isYou = entry?.user_id === profile?.id
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14, width:18, textAlign:'center' }}>{medals[i]}</span>
                {entry ? (
                  <>
                    <AvatarImg src={entry.profile?.avatar_url} name={entry.profile?.display_name} size={24} />
                    <span style={{ flex:1, fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', color: isYou ? 'var(--campus)' : 'var(--text-2)' }}>
                      {entry.profile?.display_name}{isYou ? ' (you)' : ''}
                    </span>
                    <span style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:800, color: isYou ? 'var(--campus)' : 'var(--text)' }}>
                      {entry.total_score}
                    </span>
                  </>
                ) : (
                  <>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:11, fontFamily:'var(--font-display)', color:'var(--text-3)' }}>N/A</span>
                    <span style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:800, color:'var(--text-3)' }}>—</span>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/games')} style={{
          width:'100%', padding:'9px', borderRadius:10,
          background:'var(--campus-dim)', border:'1px solid var(--campus-border)',
          color:'var(--campus)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12,
          cursor:'pointer', transition:'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--campus-dim)'}
        >
          View Leaderboard →
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

const cardStyle = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 'var(--radius-lg)',
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

export default function Explore() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const isMobile    = useIsMobile()
  const [people, setPeople]   = useState([])
  const [groups, setGroups]   = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [follows, setFollows] = useState(new Set())
  const [majorFilter, setMajorFilter] = useState('')
  const [tagFilter, setTagFilter]     = useState('')
  const campusColor = profile?.campus_color || '#a78bfa'

  useEffect(() => { if (profile) { loadPeople(); loadFollows(); loadGroups() } }, [profile?.domain])

  async function loadPeople() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('domain', profile.domain).neq('id', profile.id).order('created_at', { ascending: false }).limit(100)
    setPeople(data || [])
    setLoading(false)
  }

  async function loadGroups() {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .eq('domain', profile.domain)
      .limit(20)
    const alive = (data || []).filter(g => (g.group_members?.[0]?.count ?? 0) > 0)
    setGroups(alive.sort((a, b) => (b.group_members?.[0]?.count ?? 0) - (a.group_members?.[0]?.count ?? 0)))
  }

  async function loadFollows() {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
    setFollows(new Set((data || []).map(f => f.following_id)))
  }

  async function toggleFollow(personId) {
    const isF = follows.has(personId)
    if (isF) {
      await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', personId)
      setFollows(s => { const n = new Set(s); n.delete(personId); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: profile.id, following_id: personId })
      setFollows(s => new Set(s).add(personId))
    }
  }

  const majorList = [...new Set(people.map(p => p.major).filter(Boolean))].sort()
  const tagList   = [...new Set(people.flatMap(p => p.tags || []))].sort()

  const filteredGroups = search
    ? groups.filter(g => {
        const q = search.toLowerCase()
        return (
          g.name?.toLowerCase().includes(q) ||
          g.topic?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          (g.tags || []).some(t => t.toLowerCase().includes(q))
        )
      }).slice(0, 5)
    : []

  const filtered = people.filter(p => {
    const matchesSearch = !search || (() => {
      const q = search.toLowerCase()
      return (
        p.display_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.major?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      )
    })()
    const matchesMajor = !majorFilter || p.major?.toLowerCase() === majorFilter.toLowerCase()
    const matchesTag   = !tagFilter   || (p.tags || []).includes(tagFilter)
    return matchesSearch && matchesMajor && matchesTag
  })

  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>

        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Explore <span className="gradient-text">{profile?.campus_short}</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Connect with verified students from your campus</p>
        </div>

        <div className="fade-up d1" style={{ marginBottom: majorList.length > 0 ? 12 : 28 }}>
          <input
            placeholder="Search by name, username, major, or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 14 }}
            autoFocus
          />
        </div>

        {majorList.length > 0 && (
          <div className="fade-up d2" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: tagList.length > 0 ? 8 : 24 }}>
            {majorList.map(m => {
              const active = majorFilter === m
              return (
                <button key={m} onClick={() => setMajorFilter(active ? '' : m)} style={{
                  fontSize: 11, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                  background: active ? 'var(--campus, #a78bfa)' : 'rgba(255,255,255,0.055)',
                  border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
                  color: active ? '#fff' : 'var(--text-2)',
                  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
                }}>{m}</button>
              )
            })}
            {majorFilter && (
              <button onClick={() => setMajorFilter('')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-3)', cursor: 'pointer' }}>✕ Clear</button>
            )}
          </div>
        )}

        {tagList.length > 0 && (
          <div className="fade-up d2" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 24 }}>
            {tagList.map(t => {
              const active = tagFilter === t
              return (
                <button key={t} onClick={() => setTagFilter(active ? '' : t)} style={{
                  fontSize: 11, padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
                  background: active ? `${campusColor}22` : 'transparent',
                  border: `1px solid ${active ? campusColor : `${campusColor}30`}`,
                  color: active ? campusColor : 'var(--text-3)',
                  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
                }}>#{t}</button>
              )
            })}
            {tagFilter && (
              <button onClick={() => setTagFilter('')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-3)', cursor: 'pointer' }}>✕ Clear</button>
            )}
          </div>
        )}

        {/* Groups section — shown when searching */}
        {filteredGroups.length > 0 && (
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Groups</div>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => navigate('/groups')}>
                See all →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredGroups.map((g, i) => (
                <div
                  key={g.id}
                  className="hover-lift fade-up"
                  style={{ ...cardStyle, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', animationDelay: `${i * 0.04}s` }}
                  onClick={() => navigate(`/groups/${g.id}`)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                    background: `${campusColor}18`, border: `1px solid ${campusColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {g.avatar_url
                      ? <img src={g.avatar_url} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (g.avatar_emoji || '👥')
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{g.name}</div>
                    {g.topic && <div style={{ fontSize: 11, color: campusColor, fontWeight: 600 }}>{g.topic}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      👤 {g.members_count ?? 1} members · 📝 {g.posts_count ?? 0} posts
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 11, padding: '5px 14px', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); navigate(`/groups/${g.id}`) }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* People section */}
        {search && filtered.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>People</div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...cardStyle, padding: 18, display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%', marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 10, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="fade-up" style={{ ...cardStyle, textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15 }}>
              {search ? 'No students match your search' : 'Invite your classmates to join!'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {filtered.map((person, i) => (
              <div
                key={person.id}
                className="hover-lift fade-up"
                style={{ ...cardStyle, padding: 18, animationDelay: `${i * 0.04}s` }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${person.username}`)}>
                    <AvatarImg src={person.avatar_url} name={person.display_name} size={48} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                      onClick={() => navigate(`/profile/${person.username}`)}
                    >
                      {person.display_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>@{person.username}</div>
                    {(person.major || person.year) && (
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <span className="gradient-text" style={{ fontWeight: 500 }}>
                          {person.major}{person.year ? ` · ${person.year}` : ''}
                        </span>
                      </div>
                    )}
                    {person.bio && (
                      <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {person.bio}
                      </p>
                    )}
                    {person.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {person.tags.slice(0, 4).map(tag => (
                          <span
                            key={tag}
                            onClick={() => setTagFilter(tag)}
                            style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                              background: `${campusColor}12`, border: `1px solid ${campusColor}28`,
                              color: campusColor, fontWeight: 500,
                            }}
                          >#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button
                        onClick={() => toggleFollow(person.id)}
                        className={follows.has(person.id) ? '' : 'btn-primary'}
                        style={{
                          fontSize: 11, padding: '5px 14px',
                          background: follows.has(person.id) ? 'rgba(255,255,255,0.06)' : undefined,
                          borderColor: follows.has(person.id) ? 'rgba(255,255,255,0.10)' : undefined,
                          color: follows.has(person.id) ? 'var(--text-2)' : undefined,
                        }}
                      >
                        {follows.has(person.id) ? 'Following' : 'Follow'}
                      </button>
                      <button onClick={() => navigate(`/messages/${person.id}`)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

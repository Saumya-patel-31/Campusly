import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import PostCard from '../components/PostCard.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { getLikedPosts } from '../hooks/usePosts.js'
import { supabase } from '../lib/supabase.js'

const YEARS = ['Freshman','Sophomore','Junior','Senior','Grad Student','PhD','Faculty']

const DEFAULT_TAGS = [
  'study-buddy','hackathons','gaming','coffee','research',
  'gym','music','art','startups','foodie',
  'night-owl','early-bird','coding','athletics','greek-life',
  'outdoors','photography','reading','debate','volunteering',
]

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

// ── Follow List Modal ────────────────────────────────────────────

function FollowListModal({ type, targetId, currentUserId, campusColor, onClose }) {
  const navigate = useNavigate()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [myFollows, setMyFollows] = useState(new Set())

  useEffect(() => {
    fetchList()
    if (currentUserId) fetchMyFollows()
  }, [type, targetId])

  async function fetchList() {
    setLoading(true)
    // Step 1: get the relevant user IDs from the follows table
    let ids = []
    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id').eq('following_id', targetId)
      ids = (data || []).map(r => r.follower_id)
    } else {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', targetId)
      ids = (data || []).map(r => r.following_id)
    }
    if (!ids.length) { setUsers([]); setLoading(false); return }
    // Step 2: fetch profiles for those IDs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, major, year')
      .in('id', ids)
    setUsers(profiles || [])
    setLoading(false)
  }

  async function fetchMyFollows() {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
    setMyFollows(new Set((data || []).map(r => r.following_id)))
  }

  async function toggleFollow(userId) {
    if (!currentUserId || userId === currentUserId) return
    const isF = myFollows.has(userId)
    if (isF) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId)
      setMyFollows(prev => { const s = new Set(prev); s.delete(userId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
      setMyFollows(prev => new Set([...prev, userId]))
    }
  }

  const filtered = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...panel, width:'100%', maxWidth:420, maxHeight:'80vh', display:'flex', flexDirection:'column', borderRadius:20 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <div style={{ width:28 }} />
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, letterSpacing:'0.01em' }}>
            {type === 'followers' ? 'Followers' : 'Following'}
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:22, cursor:'pointer', lineHeight:1, width:28, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ fontSize:13, padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.07)' }}
            autoFocus
          />
        </div>

        {/* List */}
        <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
          {loading ? (
            Array.from({length:5}).map((_,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px' }}>
                <div className="skeleton" style={{ width:44, height:44, borderRadius:'50%', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="skeleton" style={{ height:11, width:'45%', marginBottom:7 }} />
                  <div className="skeleton" style={{ height:9, width:'30%' }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-3)' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>👤</div>
              <div style={{ fontSize:13 }}>{search ? 'No results' : type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</div>
            </div>
          ) : (
            filtered.map(u => {
              const isMe = u.id === currentUserId
              const isFollowing = myFollows.has(u.id)
              return (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', transition:'background 0.12s', cursor:'default' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  {/* Avatar — clickable */}
                  <div style={{ cursor:'pointer', flexShrink:0 }} onClick={() => { onClose(); navigate(`/profile/${u.username}`) }}>
                    <AvatarImg src={u.avatar_url} name={u.display_name} size={44} />
                  </div>

                  {/* Name + username */}
                  <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => { onClose(); navigate(`/profile/${u.username}`) }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                      {u.display_name}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>@{u.username}</div>
                    {u.major && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:1 }}>{u.major}</div>}
                  </div>

                  {/* Follow button (hidden for yourself) */}
                  {!isMe && currentUserId && (
                    <button onClick={() => toggleFollow(u.id)} style={{
                      padding:'6px 16px', borderRadius:20, fontSize:11, fontFamily:'var(--font-display)', fontWeight:700,
                      background: isFollowing ? 'rgba(255,255,255,0.08)' : `${campusColor}18`,
                      border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.14)' : campusColor + '44'}`,
                      color: isFollowing ? 'var(--text-2)' : campusColor,
                      cursor:'pointer', transition:'all 0.15s', flexShrink:0, whiteSpace:'nowrap',
                    }}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { username }   = useParams()
  const { profile, updateProfile, uploadAvatar } = useAuth()
  const navigate       = useNavigate()
  const isOwn          = !username || username === profile?.username

  const [viewProfile, setViewProfile]   = useState(null)
  const [posts, setPosts]               = useState([])
  const [likedSet, setLikedSet]         = useState(new Set())
  const [loading, setLoading]           = useState(true)
  const [editing, setEditing]           = useState(false)
  const [following, setFollowing]       = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followModal, setFollowModal]   = useState(null) // null | 'followers' | 'following'
  const [saveError, setSaveError]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef(null)

  // Edit form fields
  const [editUsername, setEditUsername] = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [bio, setBio]                   = useState('')
  const [major, setMajor]               = useState('')
  const [year, setYear]                 = useState('')
  const [tags, setTags]                 = useState([])
  const [tagInput, setTagInput]         = useState('')

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'same'
  const checkTimeout = useRef(null)

  useEffect(() => { loadProfile() }, [username, profile?.id])

  // Real-time follower/following counts
  useEffect(() => {
    if (!viewProfile?.id) return
    const targetId = viewProfile.id

    async function refreshCounts() {
      const [followersR, followingR, followR] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetId),
        profile?.id && !isOwn
          ? supabase.from('follows').select('id').eq('follower_id', profile.id).eq('following_id', targetId).single()
          : Promise.resolve({ data: null }),
      ])
      setFollowerCount(followersR.count ?? 0)
      setFollowingCount(followingR.count ?? 0)
      if (!isOwn && profile?.id) setFollowing(!!followR.data)
    }

    const channel = supabase
      .channel(`follows_profile_${targetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, refreshCounts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [viewProfile?.id, profile?.id])

  // Real-time username availability while editing
  useEffect(() => {
    if (!editing) return
    const trimmed = editUsername.trim().toLowerCase()
    if (!trimmed || trimmed.length < 2) { setUsernameStatus(null); return }
    // Same as current username — always fine
    if (trimmed === profile?.username) { setUsernameStatus('same'); return }
    setUsernameStatus('checking')
    clearTimeout(checkTimeout.current)
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .neq('id', profile.id)
        .single()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(checkTimeout.current)
  }, [editUsername, editing, profile?.username, profile?.id])

  async function loadProfile() {
    setLoading(true)
    let target = profile
    if (!isOwn) {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
      if (!data) { navigate('/explore'); return }
      target = data
    }
    setViewProfile(target)
    if (isOwn && profile) {
      setEditUsername(profile.username || '')
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setMajor(profile.major || '')
      setYear(profile.year || '')
      setTags(profile.tags || [])
    }
    const [postsR, followersR, followingR, likesR, followR] = await Promise.all([
      supabase.from('posts').select('*,profiles(id,username,display_name,avatar_url,major,year)').eq('user_id', target.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('id', { count:'exact', head:true }).eq('following_id', target.id),
      supabase.from('follows').select('id', { count:'exact', head:true }).eq('follower_id', target.id),
      profile?.id ? getLikedPosts(profile.id) : Promise.resolve(new Set()),
      !isOwn && profile?.id ? supabase.from('follows').select('id').eq('follower_id', profile.id).eq('following_id', target.id).single() : Promise.resolve({ data: null }),
    ])
    setPosts(postsR.data || [])
    setFollowerCount(followersR.count || 0)
    setFollowingCount(followingR.count || 0)
    setLikedSet(likesR)
    setFollowing(!!followR.data)
    setLoading(false)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarUploading(true)
    await uploadAvatar(file)
    setAvatarUploading(false)
    loadProfile()
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaveError(null)
    const trimmedUsername = editUsername.trim().toLowerCase()

    if (!displayName.trim()) { setSaveError('Display name is required.'); return }
    if (!trimmedUsername)    { setSaveError('Username is required.'); return }
    if (usernameStatus === 'taken') { setSaveError(`@${trimmedUsername} is already taken. Choose a different username.`); return }
    if (usernameStatus === 'checking') { setSaveError('Still checking username availability…'); return }

    setSaving(true)
    const ok = await updateProfile({
      username:     trimmedUsername,
      display_name: displayName.trim(),
      bio:          bio.trim(),
      major:        major.trim(),
      year,
      tags,
    })
    setSaving(false)
    if (ok) {
      setEditing(false)
      // If username changed, navigate to new profile URL
      if (trimmedUsername !== profile.username) {
        navigate(`/profile/${trimmedUsername}`, { replace: true })
      } else {
        loadProfile()
      }
    }
  }

  async function handleFollow() {
    if (!profile) return
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', viewProfile.id)
      setFollowing(false); setFollowerCount(n => n - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: profile.id, following_id: viewProfile.id })
      setFollowing(true); setFollowerCount(n => n + 1)
    }
  }

  const dp = isOwn ? profile : viewProfile
  const campusColor = dp?.campus_color || '#a78bfa'

  return (
    <Layout>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'28px 20px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
            <div className="spinner" style={{ width:32, height:32 }} />
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div style={{ background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:20, backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', boxShadow:'0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)', padding:28, marginBottom:20, position:'relative', overflow:'hidden' }} className="fade-up">
              {/* Campus color glow top bar */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${campusColor}, transparent)` }} />

              {!editing ? (
                <>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20 }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <AvatarImg src={dp?.avatar_url} name={dp?.display_name} size={80} />
                      {isOwn && (
                        <>
                          <input type="file" accept="image/*" ref={fileRef} onChange={handleAvatarChange} style={{ display:'none' }} />
                          <button onClick={()=>fileRef.current.click()} style={{ position:'absolute', bottom:-2, right:-2, width:26, height:26, borderRadius:'50%', background:'rgba(40,40,58,0.95)', border:'2px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.8)', fontSize:14, padding:0, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', cursor:'pointer' }}>
                            {avatarUploading ? '…' : '+'}
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:3 }}>
                        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em' }}>{dp?.display_name}</h2>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${campusColor}18`, border:`1px solid ${campusColor}35`, color:campusColor, fontSize:10, fontWeight:700, letterSpacing:'0.05em', padding:'2px 8px', borderRadius:99, textTransform:'uppercase' }}>
                          ✓ {dp?.campus_short}
                        </span>
                      </div>
                      <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:6 }}>@{dp?.username}</div>
                      {(dp?.major || dp?.year) && (
                        <div style={{ fontSize:13, marginBottom:8, fontWeight:500, color:campusColor }}>
                          {dp?.major}{dp?.year ? ` · ${dp.year}` : ''}
                        </div>
                      )}
                      {dp?.bio && <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.7, marginBottom: dp?.tags?.length ? 10 : 0 }}>{dp.bio}</p>}
                      {dp?.tags?.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {dp.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize:11, padding:'3px 10px', borderRadius:999,
                              background:`${campusColor}15`, border:`1px solid ${campusColor}30`,
                              color:campusColor, fontWeight:500, letterSpacing:'0.02em',
                            }}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'flex', gap:28, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:16, marginBottom:18 }}>
                    {/* Posts — not clickable */}
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', color:'var(--text)' }}>{posts.length}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>Posts</div>
                    </div>
                    {/* Followers — clickable */}
                    <div onClick={() => setFollowModal('followers')} style={{ cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.querySelector('.stat-label').style.color = campusColor}
                      onMouseLeave={e => e.currentTarget.querySelector('.stat-label').style.color = 'var(--text-3)'}
                    >
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', color:'var(--text)' }}>{followerCount}</div>
                      <div className="stat-label" style={{ fontSize:11, color:'var(--text-3)', marginTop:1, transition:'color 0.15s' }}>Followers</div>
                    </div>
                    {/* Following — clickable */}
                    <div onClick={() => setFollowModal('following')} style={{ cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.querySelector('.stat-label').style.color = campusColor}
                      onMouseLeave={e => e.currentTarget.querySelector('.stat-label').style.color = 'var(--text-3)'}
                    >
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', color:'var(--text)' }}>{followingCount}</div>
                      <div className="stat-label" style={{ fontSize:11, color:'var(--text-3)', marginTop:1, transition:'color 0.15s' }}>Following</div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    {isOwn ? (
                      <button onClick={() => setEditing(true)} style={{ fontSize:13, padding:'8px 22px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontWeight:500, backdropFilter:'blur(8px)', cursor:'pointer', transition:'all 0.18s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.13)';e.currentTarget.style.borderColor='rgba(255,255,255,0.22)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.borderColor='rgba(255,255,255,0.14)'}}>
                        Edit profile
                      </button>
                    ) : (
                      <>
                        <button onClick={handleFollow} style={{ fontSize:13, padding:'8px 22px', background: following ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.12)', border: following ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.22)', color:'#fff', borderRadius:'var(--radius-sm)', cursor:'pointer', fontWeight:500, backdropFilter:'blur(8px)', transition:'all 0.18s' }}>
                          {following ? 'Following' : 'Follow'}
                        </button>
                        <button onClick={() => navigate(`/messages/${viewProfile?.id}`)} style={{ fontSize:13, padding:'8px 20px' }}>Message</button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Edit form */
                <form onSubmit={handleSave}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, marginBottom:22 }}>Edit profile</div>

                  {/* Username field with live check */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>USERNAME</div>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', fontSize:14, userSelect:'none' }}>@</span>
                      <input
                        value={editUsername}
                        onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                        placeholder="your_username"
                        style={{
                          paddingLeft: 30,
                          paddingRight: 36,
                          borderColor:
                            usernameStatus === 'available' ? 'var(--green)' :
                            usernameStatus === 'taken'     ? 'var(--red)'   : undefined,
                        }}
                      />
                      <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:15 }}>
                        {usernameStatus === 'checking'  && <span style={{ fontSize:11, color:'var(--text-3)' }}>…</span>}
                        {usernameStatus === 'available' && <span style={{ color:'var(--green)' }}>✓</span>}
                        {usernameStatus === 'taken'     && <span style={{ color:'var(--red)' }}>✗</span>}
                        {usernameStatus === 'same'      && <span style={{ color:'var(--text-3)' }}>✓</span>}
                      </span>
                    </div>
                    {usernameStatus === 'taken'     && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>@{editUsername} is already taken</div>}
                    {usernameStatus === 'available' && <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>@{editUsername} is available!</div>}
                  </div>

                  {/* Display name */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>DISPLAY NAME</div>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your Name" />
                  </div>

                  {/* Bio */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>BIO</div>
                    <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your campus about yourself…" style={{ resize:'none' }} />
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>MAJOR</div>
                      <input value={major} onChange={e => setMajor(e.target.value)} placeholder="Computer Science" />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>YEAR</div>
                      <select value={year} onChange={e => setYear(e.target.value)} style={{ padding:'11px 12px' }}>
                        <option value="">Select…</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em' }}>TAGS <span style={{ textTransform:'none', letterSpacing:0, color:'var(--text-3)', fontWeight:400 }}>— up to 10</span></div>
                    {/* Current tags */}
                    {tags.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                        {tags.map(tag => (
                          <span key={tag} style={{
                            display:'inline-flex', alignItems:'center', gap:5,
                            fontSize:11, padding:'4px 10px', borderRadius:999,
                            background:`${campusColor}18`, border:`1px solid ${campusColor}30`,
                            color:campusColor, fontWeight:500,
                          }}>
                            #{tag}
                            <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}
                              style={{ background:'none', border:'none', cursor:'pointer', color:campusColor, padding:0, fontSize:12, lineHeight:1, opacity:0.7 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Input */}
                    {tags.length < 10 && (
                      <input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        onKeyDown={e => {
                          if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                            e.preventDefault()
                            const t = tagInput.trim()
                            if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t])
                            setTagInput('')
                          }
                        }}
                        placeholder="Type a tag and press Enter…"
                        style={{ marginBottom: 8 }}
                      />
                    )}
                    {/* Default suggestions */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {DEFAULT_TAGS.filter(t => !tags.includes(t)).slice(0, 12).map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => { if (tags.length < 10) setTags([...tags, t]) }}
                          style={{
                            fontSize:10, padding:'3px 9px', borderRadius:999, cursor:'pointer',
                            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
                            color:'var(--text-3)', transition:'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${campusColor}15`; e.currentTarget.style.color = campusColor; e.currentTarget.style.borderColor = `${campusColor}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                        >+ #{t}</button>
                      ))}
                    </div>
                  </div>

                  {saveError && (
                    <div style={{ background:'rgba(255,107,138,0.1)', border:'1px solid rgba(255,107,138,0.22)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--red)', marginBottom:14 }}>
                      {saveError}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10 }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
                      style={{ fontSize:13, padding:'8px 20px' }}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button type="button" onClick={() => { setEditing(false); setSaveError(null) }} style={{ fontSize:13, padding:'8px 20px' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Posts */}
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, marginBottom:14, letterSpacing:'-0.02em' }}>
              Posts <span style={{ fontWeight:400, fontSize:13, color:'var(--text-3)' }}>{posts.length}</span>
            </div>
            {posts.length === 0 ? (
              <div style={{ background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16, backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', boxShadow:'0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)', textAlign:'center', padding:'48px 24px', color:'var(--text-3)' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>✍️</div>
                <div style={{ fontWeight:600, marginBottom:6, color:'var(--text)' }}>No posts yet</div>
                {isOwn && <div style={{ fontSize:13 }}>Share a moment with your campus!</div>}
              </div>
            ) : posts.map((post, i) => (
              <div key={post.id} className="fade-up" style={{ animationDelay:`${i * 0.04}s` }}>
                <PostCard post={post} likedSet={likedSet} onLikeChange={() => getLikedPosts(profile.id).then(setLikedSet)} />
              </div>
            ))}
          </>
        )}
      </div>

      {followModal && (
        <FollowListModal
          type={followModal}
          targetId={dp?.id}
          currentUserId={profile?.id}
          campusColor={campusColor}
          onClose={() => setFollowModal(null)}
        />
      )}
    </Layout>
  )
}

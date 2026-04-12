import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function PostCard({ post, myLikes, onLike, onDelete, currentUserId, campusColor }) {
  const liked = myLikes.has(post.id)
  return (
    <div style={{ ...panel, padding:'16px 18px', marginBottom:10 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <AvatarImg src={post.profiles?.avatar_url} name={post.profiles?.display_name} size={36} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:13, fontFamily:'var(--font-display)' }}>
            {post.profiles?.display_name}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>@{post.profiles?.username} · {timeAgo(post.created_at)}</div>
        </div>
        {post.user_id === currentUserId && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:14, padding:'0 4px', alignSelf:'flex-start' }}
            title="Delete post"
          >
            ×
          </button>
        )}
      </div>

      <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.6, marginBottom:12, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
        {post.content}
      </p>

      <button
        onClick={() => onLike(post.id)}
        style={{
          background:'transparent', border:`1px solid ${liked ? campusColor+'44' : 'rgba(255,255,255,0.08)'}`,
          borderRadius:999, padding:'4px 12px', fontSize:12, cursor:'pointer',
          color: liked ? campusColor : 'var(--text-3)',
          display:'flex', alignItems:'center', gap:5,
        }}
      >
        <span style={{ fontSize:14 }}>{liked ? '❤️' : '🤍'}</span>
        {post.likes_count ?? 0}
      </button>
    </div>
  )
}

export default function GroupDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { profile }  = useAuth()
  const campusColor  = profile?.campus_color || '#a78bfa'

  const [group, setGroup]       = useState(null)
  const [posts, setPosts]       = useState([])
  const [members, setMembers]   = useState([])
  const [isMember, setIsMember] = useState(false)
  const [myLikes, setMyLikes]   = useState(new Set())
  const [tab, setTab]           = useState('posts') // 'posts' | 'members'
  const [content, setContent]   = useState('')
  const [posting, setPosting]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const textRef = useRef(null)

  useEffect(() => {
    if (profile?.id) loadAll()
  }, [id, profile?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadGroup(), loadPosts(), loadMembers(), loadMyLikes()])
    setLoading(false)
  }

  async function loadGroup() {
    const { data } = await supabase.from('groups').select('*').eq('id', id).single()
    setGroup(data)
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, username, avatar_url)')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at, profiles(display_name, username, avatar_url, major, year)')
      .eq('group_id', id)
      .order('joined_at', { ascending: true })
    const list = data || []
    setMembers(list)
    setIsMember(list.some(m => m.user_id === profile?.id))
  }

  async function loadMyLikes() {
    const { data } = await supabase
      .from('group_post_likes')
      .select('post_id')
      .eq('user_id', profile.id)
    setMyLikes(new Set((data || []).map(l => l.post_id)))
  }

  async function handleJoinToggle() {
    if (isMember) {
      await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', profile.id)
      setIsMember(false)
      setMembers(prev => prev.filter(m => m.user_id !== profile.id))
    } else {
      await supabase.from('group_members').insert({ group_id: id, user_id: profile.id })
      setIsMember(true)
      setMembers(prev => [...prev, { user_id: profile.id, role: 'member', profiles: { display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url, major: profile.major, year: profile.year } }])
    }
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim() || !isMember) return
    setPosting(true)
    const { data: newPost } = await supabase
      .from('group_posts')
      .insert({ group_id: id, user_id: profile.id, content: content.trim() })
      .select('*, profiles(display_name, username, avatar_url)')
      .single()
    if (newPost) setPosts(prev => [newPost, ...prev])
    setContent('')
    setPosting(false)
    textRef.current?.focus()
  }

  async function handleLike(postId) {
    const liked = myLikes.has(postId)
    if (liked) {
      await supabase.from('group_post_likes').delete().eq('post_id', postId).eq('user_id', profile.id)
      setMyLikes(prev => { const n = new Set(prev); n.delete(postId); return n })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p))
    } else {
      await supabase.from('group_post_likes').insert({ post_id: postId, user_id: profile.id })
      setMyLikes(prev => new Set(prev).add(postId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    }
  }

  async function handleDelete(postId) {
    await supabase.from('group_posts').delete().eq('id', postId).eq('user_id', profile.id)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) return (
    <Layout>
      <div style={{ maxWidth:700, margin:'0 auto', padding:'28px 20px' }}>
        <div className="skeleton" style={{ height:120, borderRadius:16, marginBottom:16 }} />
        <div className="skeleton" style={{ height:14, width:'40%', marginBottom:10 }} />
        <div className="skeleton" style={{ height:14, width:'60%' }} />
      </div>
    </Layout>
  )

  if (!group) return (
    <Layout>
      <div style={{ maxWidth:700, margin:'0 auto', padding:'28px 20px', textAlign:'center', color:'var(--text-3)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
        <div>Group not found</div>
        <button className="btn-ghost" style={{ marginTop:14 }} onClick={() => navigate('/groups')}>← Back to Groups</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ maxWidth:700, margin:'0 auto', padding:'28px 20px' }}>

        {/* Back */}
        <button className="btn-ghost" style={{ fontSize:12, marginBottom:16, padding:'5px 10px' }} onClick={() => navigate('/groups')}>
          ← Groups
        </button>

        {/* Group header */}
        <div className="fade-up" style={{ ...panel, padding:'20px 22px', marginBottom:20 }}>
          <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
            <div style={{
              width:56, height:56, borderRadius:14, flexShrink:0, overflow:'hidden',
              background:`${campusColor}18`, border:`1px solid ${campusColor}30`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
            }}>
              {group.avatar_url
                ? <img src={group.avatar_url} alt={group.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (group.avatar_emoji || '👥')
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, letterSpacing:'-0.02em', marginBottom:3 }}>
                {group.name}
              </h1>
              {group.topic && (
                <div style={{ fontSize:12, color:campusColor, fontWeight:600, marginBottom:6 }}>{group.topic}</div>
              )}
              {group.description && (
                <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, marginBottom:10 }}>{group.description}</p>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>👤 {group.members_count ?? members.length} members</span>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>📝 {group.posts_count ?? posts.length} posts</span>
                {(group.tags || []).map(t => (
                  <span key={t} style={{ fontSize:10, color:campusColor, background:`${campusColor}14`, border:`1px solid ${campusColor}30`, borderRadius:999, padding:'2px 8px', fontWeight:600 }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleJoinToggle}
              className={isMember ? '' : 'btn-primary'}
              style={{
                fontSize:12, padding:'7px 18px', flexShrink:0,
                background: isMember ? 'rgba(255,255,255,0.06)' : undefined,
                border: isMember ? '1px solid rgba(255,255,255,0.10)' : undefined,
                color: isMember ? 'var(--text-2)' : undefined,
              }}
            >
              {isMember ? 'Leave' : 'Join Group'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[['posts', '📝 Posts'], ['members', '👥 Members']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              style={{
                fontSize:12, padding:'6px 16px', borderRadius:999,
                background: tab === val ? `${campusColor}18` : 'transparent',
                border: `1px solid ${tab === val ? campusColor + '40' : 'rgba(255,255,255,0.09)'}`,
                color: tab === val ? campusColor : 'var(--text-2)',
                fontWeight: tab === val ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <>
            {/* Post composer */}
            {isMember ? (
              <form onSubmit={handlePost} style={{ ...panel, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ display:'flex', gap:10 }}>
                  <AvatarImg src={profile?.avatar_url} name={profile?.display_name} size={36} />
                  <div style={{ flex:1 }}>
                    <textarea
                      ref={textRef}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={`Share something with ${group.name}…`}
                      rows={3}
                      style={{ resize:'none', fontSize:13, minHeight:72, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}
                    />
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                      <button type="submit" className="btn-primary" disabled={posting || !content.trim()} style={{ fontSize:12, padding:'6px 18px' }}>
                        {posting ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ ...panel, padding:'14px 16px', marginBottom:16, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
                Join this group to post and participate
              </div>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📝</div>
                <div>No posts yet. {isMember ? 'Be the first to share something!' : 'Join to start the conversation.'}</div>
              </div>
            ) : (
              posts.map((post, i) => (
                <div key={post.id} className="fade-up" style={{ animationDelay:`${i * 0.03}s` }}>
                  <PostCard
                    post={post}
                    myLikes={myLikes}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    currentUserId={profile?.id}
                    campusColor={campusColor}
                  />
                </div>
              ))
            )}
          </>
        )}

        {tab === 'members' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {members.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>No members yet</div>
            ) : (
              members.map((m, i) => (
                <div key={m.user_id} className="fade-up" style={{ ...panel, padding:'12px 16px', display:'flex', gap:12, alignItems:'center', animationDelay:`${i * 0.03}s` }}>
                  <AvatarImg src={m.profiles?.avatar_url} name={m.profiles?.display_name} size={40} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, fontFamily:'var(--font-display)' }}>
                      {m.profiles?.display_name}
                      {m.role === 'admin' && (
                        <span style={{ marginLeft:7, fontSize:9, background:`${campusColor}22`, color:campusColor, border:`1px solid ${campusColor}44`, borderRadius:999, padding:'1px 7px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>
                      @{m.profiles?.username}{m.profiles?.major ? ` · ${m.profiles.major}` : ''}{m.profiles?.year ? ` · ${m.profiles.year}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

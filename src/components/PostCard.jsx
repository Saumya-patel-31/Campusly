import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { toggleLike, addComment, deletePost } from '../hooks/usePosts.js'
import { AvatarImg } from './Layout.jsx'
import { supabase } from '../lib/supabase.js'
import ShareModal from './ShareModal.jsx'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000)
  if(m<1)return'just now';if(m<60)return`${m}m`;if(h<24)return`${h}h`
  if(d<7)return`${d}d`
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}

// ── Tag-aware comment input ──
function CommentInput({ profile, campusColor, onSubmit }) {
  const [text, setText]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug]       = useState(false)
  const [tagStart, setTagStart]     = useState(-1)
  const inputRef = useRef(null)

  async function handleChange(e) {
    const val = e.target.value
    setText(val)
    const cursorPos  = e.target.selectionStart
    const textUpTo   = val.slice(0, cursorPos)
    const atMatch    = textUpTo.match(/@(\w*)$/)
    if (atMatch) {
      const query = atMatch[1]
      setTagStart(cursorPos - atMatch[0].length)
      if (query.length >= 1) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, campus_short')
          .eq('domain', profile.domain)
          .ilike('username', `${query}%`)
          .limit(6)
        setSuggestions(data || [])
        setShowSug(true)
      } else {
        setSuggestions([]); setShowSug(false)
      }
    } else {
      setShowSug(false); setSuggestions([])
    }
  }

  function insertTag(username) {
    const before  = text.slice(0, tagStart)
    const after   = text.slice(inputRef.current.selectionStart)
    setText(`${before}@${username} ${after}`)
    setShowSug(false); setSuggestions([])
    inputRef.current.focus()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(text); setText('')
  }

  return (
    <div style={{ position:'relative' }}>
      <form onSubmit={handleSubmit} style={{ display:'flex', gap:7 }}>
        <AvatarImg src={profile?.avatar_url} name={profile?.display_name} size={26} />
        <input
          ref={inputRef}
          placeholder="Add a comment… use @ to tag"
          value={text}
          onChange={handleChange}
          onKeyDown={e => e.key==='Escape' && setShowSug(false)}
          style={{ flex:1, fontSize:12, padding:'6px 12px', borderRadius:20 }}
        />
        <button type="submit" className="btn-primary" disabled={!text.trim()} style={{ padding:'6px 14px', fontSize:12, flexShrink:0 }}>Post</button>
      </form>

      {showSug && suggestions.length > 0 && (
        <div style={{ position:'absolute', bottom:'110%', left:33, background:'rgba(12,12,22,0.98)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, overflow:'hidden', minWidth:210, zIndex:50, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
          {suggestions.map(u => (
            <div key={u.id} onClick={() => insertTag(u.username)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 13px', cursor:'pointer', transition:'background 0.12s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <AvatarImg src={u.avatar_url} name={u.display_name} size={28} />
              <div>
                <div style={{ fontSize:12, fontWeight:600 }}>{u.display_name}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>@{u.username} · {u.campus_short}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostCard({ post, likedSet=new Set(), onLikeChange }) {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [liked, setLiked]               = useState(likedSet.has(post.id))
  const [likes, setLikes]               = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [submitting, setSubmitting]     = useState(false)
  const [showMenu, setShowMenu]         = useState(false)
  const [likeAnim, setLikeAnim]         = useState(false)
  const [showShare, setShowShare]       = useState(false)

  const author      = post.profiles
  const isOwn       = post.user_id === profile?.id
  const campusColor = profile?.campus_color || '#a78bfa'

  useEffect(() => { setLiked(likedSet.has(post.id)) }, [likedSet, post.id])

  async function handleLike() {
    const nl = !liked; setLiked(nl); setLikes(n => nl ? n+1 : n-1)
    if (nl) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 500) }
    await toggleLike(post.id, profile.id); onLikeChange?.()
  }

  async function handleLoadComments() {
    if (showComments) { setShowComments(false); return }
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id,username,display_name,avatar_url,campus_short)')
      .eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data || []); setShowComments(true)
  }

  async function handleComment(text) {
    setSubmitting(true)
    const c = await addComment(post.id, profile.id, text)
    setComments(prev => [...prev, { ...c, profiles: { username:profile.username, display_name:profile.display_name, avatar_url:profile.avatar_url, campus_short:profile.campus_short } }])
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return
    setShowMenu(false); await deletePost(post.id, post.media_url)
  }

  function renderText(text) {
    if (!text) return null
    return text.split(/(@\w+)/g).map((part, i) =>
      /^@\w+$/.test(part)
        ? <span key={i} style={{ color:campusColor, fontWeight:600, cursor:'pointer' }} onClick={() => navigate(`/profile/${part.slice(1)}`)}>{part}</span>
        : part
    )
  }

  return (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1.5px solid rgba(255,255,255,0.18)',
        borderRadius: 18,
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
        marginBottom: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${campusColor}55`; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.13)` }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)' }}
      >
        {/* Campus color top stripe */}
        <div style={{ height:2, background:`linear-gradient(90deg, ${campusColor}90, transparent)` }} />

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 10px' }}>
          <div style={{ cursor:'pointer' }} onClick={() => navigate(`/profile/${author?.username}`)}>
            <AvatarImg src={author?.avatar_url} name={author?.display_name} size={38} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
              <span onClick={() => navigate(`/profile/${author?.username}`)} style={{ fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                {author?.display_name}
              </span>
              {(author?.major || author?.year) && (
                <span style={{ fontSize:10, color:'var(--text-3)', background:'rgba(255,255,255,0.06)', padding:'1px 7px', borderRadius:20, border:'1px solid rgba(255,255,255,0.09)' }}>
                  {author?.major}{author?.year ? ` · ${author.year}` : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize:10, color:'var(--text-3)' }}>@{author?.username} · {timeAgo(post.created_at)}</div>
          </div>
          {isOwn && (
            <div style={{ position:'relative' }}>
              <button className="btn-ghost" style={{ padding:'3px 7px', color:'var(--text-3)', fontSize:17 }} onClick={() => setShowMenu(v => !v)}>⋯</button>
              {showMenu && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:9 }} onClick={() => setShowMenu(false)} />
                  <div style={{ position:'absolute', right:0, top:'110%', zIndex:10, background:'rgba(12,12,22,0.97)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, minWidth:120, overflow:'hidden', backdropFilter:'blur(20px)', boxShadow:'0 12px 40px rgba(0,0,0,0.6)' }}>
                    <button onClick={handleDelete} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', fontSize:12, border:'none', borderRadius:0, color:'var(--red)', background:'transparent', cursor:'pointer' }}>
                      Delete post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Media */}
        {post.media_url && post.media_type === 'image' && (
          <img src={post.media_url} alt="post" loading="lazy" style={{ width:'100%', maxHeight:480, objectFit:'cover', display:'block' }} />
        )}
        {post.media_url && post.media_type === 'video' && (
          <video src={post.media_url} controls preload="metadata" style={{ width:'100%', maxHeight:480, display:'block', background:'#000' }} playsInline />
        )}

        {/* Caption */}
        {post.caption && (
          <div style={{ padding:'10px 16px 4px', fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap', overflowWrap:'break-word', wordBreak:'break-word' }}>
            {renderText(post.caption)}
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ padding:'4px 16px', display:'flex', gap:6, flexWrap:'wrap' }}>
            {post.tags.map(t => <span key={t} style={{ fontSize:12, color:campusColor, fontWeight:500 }}>#{t}</span>)}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', padding:'8px 8px 10px', gap:0, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:8 }}>
          {/* Like */}
          <button onClick={handleLike} className="btn-ghost" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:liked ? '#FF6B9D' : 'var(--text-2)', padding:'6px 10px' }}>
            <span style={{ fontSize:20 }} className={likeAnim ? 'liked' : ''}>{liked ? '♥' : '♡'}</span>
            <span>{likes}</span>
          </button>

          {/* Comment */}
          <button onClick={handleLoadComments} className="btn-ghost" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-2)', padding:'6px 10px' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{post.comments_count}</span>
          </button>

          {/* Share — paper plane like Instagram */}
          <button onClick={() => setShowShare(true)} className="btn-ghost" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-2)', padding:'6px 10px' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* Likes label */}
        {likes > 0 && (
          <div style={{ padding:'0 16px 6px', fontSize:12, fontWeight:600, color:'var(--text-2)' }}>
            {likes} {likes === 1 ? 'like' : 'likes'}
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div className="fade-in" style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 14px' }}>
            {comments.length === 0 && (
              <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>No comments yet. Be first!</div>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ display:'flex', gap:7, marginBottom:8 }}>
                <AvatarImg src={c.profiles?.avatar_url} name={c.profiles?.display_name} size={26} />
                <div style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'6px 11px', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontWeight:600, fontSize:11 }}>@{c.profiles?.username}</span>
                  {c.profiles?.campus_short && (
                    <span style={{ fontSize:9, color:'var(--text-3)', marginLeft:5, background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:6 }}>{c.profiles.campus_short}</span>
                  )}
                  <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:5 }}>{timeAgo(c.created_at)}</span>
                  <p style={{ fontSize:12, marginTop:2, overflowWrap:'break-word', wordBreak:'break-word' }}>{renderText(c.text)}</p>
                </div>
              </div>
            ))}
            <div style={{ marginTop:8 }}>
              <CommentInput profile={profile} campusColor={campusColor} onSubmit={handleComment} />
            </div>
          </div>
        )}
      </div>

      {/* Share sheet */}
      {showShare && (
        <ShareModal
          post={post}
          author={author}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  )
}

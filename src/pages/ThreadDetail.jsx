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
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function VoteButtons({ count, myVote, onVote, size = 'md' }) {
  const campusColor = getComputedStyle(document.documentElement).getPropertyValue('--campus').trim() || '#a78bfa'
  const isSmall = size === 'sm'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 4 : 6 }}>
      <button
        onClick={() => onVote(1)}
        style={{
          background: 'transparent', border: 'none',
          padding: isSmall ? '1px 3px' : '2px 5px',
          fontSize: isSmall ? 13 : 16,
          color: myVote === 1 ? campusColor : 'var(--text-3)',
          filter: myVote === 1 ? `drop-shadow(0 0 4px ${campusColor})` : 'none',
        }}
        title="Upvote"
      >▲</button>
      <span style={{
        fontSize: isSmall ? 12 : 14, fontWeight: 700, fontFamily: 'var(--font-display)', minWidth: 20, textAlign: 'center',
        color: myVote === 1 ? campusColor : myVote === -1 ? 'var(--red)' : 'var(--text-2)',
      }}>{count ?? 0}</span>
      <button
        onClick={() => onVote(-1)}
        style={{
          background: 'transparent', border: 'none',
          padding: isSmall ? '1px 3px' : '2px 5px',
          fontSize: isSmall ? 13 : 16,
          color: myVote === -1 ? 'var(--red)' : 'var(--text-3)',
        }}
        title="Downvote"
      >▼</button>
    </div>
  )
}

function ReplyComposer({ threadId, parentReplyId, parentAuthor, onPosted, onCancel, autoFocus }) {
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus()
  }, [autoFocus])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    await supabase.from('thread_replies').insert({
      thread_id: threadId,
      user_id: profile.id,
      body: body.trim(),
      parent_reply_id: parentReplyId || null,
    })
    setPosting(false)
    setBody('')
    onPosted()
    if (onCancel) onCancel()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AvatarImg src={profile?.avatar_url} name={profile?.display_name} size={30} />
      <div style={{ flex: 1 }}>
        {parentAuthor && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
            Replying to <span style={{ color: 'var(--campus)' }}>@{parentAuthor}</span>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={parentReplyId ? 'Write a reply...' : 'Add a comment...'}
          rows={3}
          style={{ resize: 'vertical', minHeight: 72, marginBottom: 8 }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={posting || !body.trim()} style={{ fontSize: 12, padding: '5px 14px' }}>
            {posting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ReplyCard({ reply, threadId, depth, onVote, myVote, onReplyPosted, allReplies }) {
  const { profile } = useAuth()
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const campusColor = getComputedStyle(document.documentElement).getPropertyValue('--campus').trim() || '#a78bfa'
  const isOwn = profile?.id === reply.user_id
  const childReplies = allReplies.filter(r => r.parent_reply_id === reply.id)

  async function handleDelete() {
    if (!confirm('Delete this reply?')) return
    await supabase.from('thread_replies').delete().eq('id', reply.id)
    setDeleted(true)
    onReplyPosted()
  }

  if (deleted) return null

  return (
    <div style={{ marginLeft: depth > 0 ? 28 : 0, borderLeft: depth > 0 ? `2px solid rgba(255,255,255,0.07)` : 'none', paddingLeft: depth > 0 ? 14 : 0 }}>
      <div style={{ ...panel, padding: '14px 16px', marginBottom: 8, borderRadius: 12 }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AvatarImg src={reply.profiles?.avatar_url} name={reply.profiles?.display_name} size={26} />
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            {reply.profiles?.display_name || reply.profiles?.username}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(reply.created_at)}</span>
          {isOwn && (
            <button
              onClick={handleDelete}
              className="btn-danger"
              style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 6 }}
            >Delete</button>
          )}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
          {reply.body}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <VoteButtons
            count={reply.upvotes_count}
            myVote={myVote}
            onVote={v => onVote(reply.id, v)}
            size="sm"
          />
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: '3px 8px', color: showReplyBox ? campusColor : 'var(--text-3)' }}
            onClick={() => setShowReplyBox(v => !v)}
          >
            ↩ Reply
          </button>
        </div>

        {showReplyBox && (
          <div style={{ marginTop: 12 }}>
            <ReplyComposer
              threadId={threadId}
              parentReplyId={reply.id}
              parentAuthor={reply.profiles?.username}
              onPosted={onReplyPosted}
              onCancel={() => setShowReplyBox(false)}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Child replies */}
      {childReplies.map(child => (
        <ReplyCard
          key={child.id}
          reply={child}
          threadId={threadId}
          depth={depth + 1}
          onVote={onVote}
          myVote={myVote}
          onReplyPosted={onReplyPosted}
          allReplies={allReplies}
        />
      ))}
    </div>
  )
}

export default function ThreadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [myThreadVote, setMyThreadVote] = useState(null)
  const [myReplyVotes, setMyReplyVotes] = useState({})
  const [deleting, setDeleting] = useState(false)
  const campusColor = profile?.campus_color || '#a78bfa'

  async function fetchThread() {
    const { data } = await supabase
      .from('threads')
      .select('*, profiles(display_name, username, avatar_url)')
      .eq('id', id)
      .single()
    setThread(data)
  }

  async function fetchReplies() {
    const { data } = await supabase
      .from('thread_replies')
      .select('*, profiles(display_name, username, avatar_url)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
    setReplies(data || [])
  }

  async function fetchMyVotes() {
    if (!profile?.id) return
    const [{ data: tv }, { data: rv }] = await Promise.all([
      supabase.from('thread_votes').select('value').eq('user_id', profile.id).eq('thread_id', id).maybeSingle(),
      supabase.from('thread_votes').select('reply_id, value').eq('user_id', profile.id).not('reply_id', 'is', null),
    ])
    setMyThreadVote(tv?.value ?? null)
    const map = {}
    ;(rv || []).forEach(v => { map[v.reply_id] = v.value })
    setMyReplyVotes(map)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchThread(), fetchReplies(), fetchMyVotes()]).then(() => setLoading(false))
  }, [id])

  async function handleThreadVote(value) {
    if (!profile?.id) return
    if (myThreadVote === value) {
      await supabase.from('thread_votes').delete().eq('user_id', profile.id).eq('thread_id', id)
      setMyThreadVote(null)
      setThread(prev => ({ ...prev, upvotes_count: (prev.upvotes_count || 0) - value }))
    } else if (myThreadVote) {
      await supabase.from('thread_votes').update({ value }).eq('user_id', profile.id).eq('thread_id', id)
      setThread(prev => ({ ...prev, upvotes_count: (prev.upvotes_count || 0) - myThreadVote + value }))
      setMyThreadVote(value)
    } else {
      await supabase.from('thread_votes').insert({ user_id: profile.id, thread_id: id, value })
      setMyThreadVote(value)
      setThread(prev => ({ ...prev, upvotes_count: (prev.upvotes_count || 0) + value }))
    }
  }

  async function handleReplyVote(replyId, value) {
    if (!profile?.id) return
    const existing = myReplyVotes[replyId]
    if (existing === value) {
      await supabase.from('thread_votes').delete().eq('user_id', profile.id).eq('reply_id', replyId)
      setMyReplyVotes(prev => { const n = { ...prev }; delete n[replyId]; return n })
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, upvotes_count: (r.upvotes_count || 0) - value } : r))
    } else if (existing) {
      await supabase.from('thread_votes').update({ value }).eq('user_id', profile.id).eq('reply_id', replyId)
      setMyReplyVotes(prev => ({ ...prev, [replyId]: value }))
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, upvotes_count: (r.upvotes_count || 0) - existing + value } : r))
    } else {
      await supabase.from('thread_votes').insert({ user_id: profile.id, reply_id: replyId, value })
      setMyReplyVotes(prev => ({ ...prev, [replyId]: value }))
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, upvotes_count: (r.upvotes_count || 0) + value } : r))
    }
  }

  async function handleDeleteThread() {
    if (!confirm('Delete this thread and all its replies?')) return
    setDeleting(true)
    await supabase.from('threads').delete().eq('id', id)
    navigate('/threads')
  }

  function refresh() {
    fetchReplies()
    fetchThread()
  }

  if (loading) return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 18px' }}>
        <div className="skeleton" style={{ height: 22, width: '60%', marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: '75%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: '50%' }} />
      </div>
    </Layout>
  )

  if (!thread) return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '52px 18px', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 7, color: 'var(--text)' }}>Thread not found</div>
        <button className="btn-ghost" onClick={() => navigate('/threads')}>← Back to Threads</button>
      </div>
    </Layout>
  )

  const isOwn = profile?.id === thread.user_id
  const topLevelReplies = replies.filter(r => !r.parent_reply_id)

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 18px' }}>

        {/* Back button */}
        <button
          className="btn-ghost"
          style={{ fontSize: 12, padding: '5px 10px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => navigate('/threads')}
        >
          <span>←</span> Threads
        </button>

        {/* Thread */}
        <div className="fade-up" style={{ ...panel, padding: '22px 24px', marginBottom: 20 }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <AvatarImg src={thread.profiles?.avatar_url} name={thread.profiles?.display_name} size={34} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                {thread.profiles?.display_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                @{thread.profiles?.username} · {timeAgo(thread.created_at)}
              </div>
            </div>
            {isOwn && (
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="btn-danger"
                style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
            {thread.title}
          </h1>

          {/* Body */}
          {thread.body && (
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
              {thread.body}
            </p>
          )}

          {/* Tags */}
          {(thread.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {thread.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, color: campusColor, background: `${campusColor}14`,
                  border: `1px solid ${campusColor}30`, borderRadius: 999, padding: '2px 10px', fontWeight: 600,
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

          {/* Vote + reply count row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <VoteButtons count={thread.upvotes_count} myVote={myThreadVote} onVote={handleThreadVote} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
              {thread.replies_count ?? 0} {thread.replies_count === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </div>

        {/* Reply composer */}
        <div className="fade-up d2" style={{ ...panel, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
            Add a comment
          </div>
          <ReplyComposer threadId={id} onPosted={refresh} />
        </div>

        {/* Replies */}
        {replies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13 }}>No comments yet. Be the first!</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {replies.length} {replies.length === 1 ? 'Comment' : 'Comments'}
            </div>
            {topLevelReplies.map((reply, i) => (
              <div key={reply.id} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <ReplyCard
                  reply={reply}
                  threadId={id}
                  depth={0}
                  onVote={handleReplyVote}
                  myVote={myReplyVotes[reply.id]}
                  onReplyPosted={refresh}
                  allReplies={replies}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

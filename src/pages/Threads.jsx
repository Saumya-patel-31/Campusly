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

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ThreadCard({ thread, onVote, myVote }) {
  const navigate = useNavigate()
  const campusColor = getComputedStyle(document.documentElement).getPropertyValue('--campus').trim() || '#a78bfa'

  return (
    <div
      className="hover-lift"
      style={{ ...panel, padding: '16px 18px', marginBottom: 10, cursor: 'pointer', display: 'flex', gap: 14 }}
      onClick={() => navigate(`/threads/${thread.id}`)}
    >
      {/* Vote column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 36 }}
        onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onVote(thread.id, 1)}
          style={{
            background: 'transparent', border: 'none', padding: '2px 4px', fontSize: 16,
            color: myVote === 1 ? campusColor : 'var(--text-3)',
            filter: myVote === 1 ? `drop-shadow(0 0 6px ${campusColor})` : 'none',
          }}
          title="Upvote"
        >▲</button>
        <span style={{
          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)',
          color: myVote === 1 ? campusColor : myVote === -1 ? 'var(--red)' : 'var(--text-2)',
        }}>
          {thread.upvotes_count ?? 0}
        </span>
        <button
          onClick={() => onVote(thread.id, -1)}
          style={{
            background: 'transparent', border: 'none', padding: '2px 4px', fontSize: 16,
            color: myVote === -1 ? 'var(--red)' : 'var(--text-3)',
          }}
          title="Downvote"
        >▼</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <AvatarImg src={thread.profiles?.avatar_url} name={thread.profiles?.display_name} size={22} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {thread.profiles?.display_name || thread.profiles?.username}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(thread.created_at)}</span>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 6, lineHeight: 1.35 }}>
          {thread.title}
        </div>

        {thread.body && (
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {thread.body}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {(thread.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: 10, color: campusColor, background: `${campusColor}14`, border: `1px solid ${campusColor}30`, borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
            {thread.replies_count ?? 0} {thread.replies_count === 1 ? 'reply' : 'replies'}
          </span>
        </div>
      </div>
    </div>
  )
}

function CreateThreadModal({ onClose, onCreated, domain }) {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setPosting(true)
    setError('')
    const tags = tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    const { error: err } = await supabase.from('threads').insert({
      user_id: profile.id,
      domain,
      title: title.trim(),
      body: body.trim(),
      tags,
    })
    setPosting(false)
    if (err) { setError(err.message); return }
    onCreated()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,7,16,0.7)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div className="scale-in" style={{ ...panel, background: 'rgba(255,255,255,0.06)', width: '100%', maxWidth: 540, padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Create Thread</h2>
          <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 18 }} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              maxLength={200}
              required
            />
            <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', marginTop: 3 }}>{title.length}/200</div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add more context (optional)..."
              rows={5}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tags</label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="classes, housing, food (comma separated)"
            />
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={posting || !title.trim()}>
              {posting ? 'Posting...' : 'Post Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Threads() {
  const { profile } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('hot') // 'hot' | 'new'
  const [showCreate, setShowCreate] = useState(false)
  const [myVotes, setMyVotes] = useState({}) // thread_id -> value
  const [tagFilter, setTagFilter] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const campusColor = profile?.campus_color || '#a78bfa'

  async function fetchThreads() {
    setLoading(true)
    const { data } = await supabase
      .from('threads')
      .select('*, profiles(display_name, username, avatar_url)')
      .eq('domain', profile?.domain)
      .order(sort === 'hot' ? 'upvotes_count' : 'created_at', { ascending: false })
    setThreads(data || [])
    setLoading(false)
  }

  async function fetchMyVotes() {
    if (!profile?.id) return
    const { data } = await supabase
      .from('thread_votes')
      .select('thread_id, value')
      .eq('user_id', profile.id)
      .not('thread_id', 'is', null)
    const map = {}
    ;(data || []).forEach(v => { map[v.thread_id] = v.value })
    setMyVotes(map)
  }

  useEffect(() => {
    if (profile?.domain) {
      fetchThreads()
      fetchMyVotes()
    }
  }, [profile?.domain, sort])

  async function handleVote(threadId, value) {
    if (!profile?.id) return
    const existing = myVotes[threadId]

    if (existing === value) {
      // Remove vote
      await supabase.from('thread_votes').delete()
        .eq('user_id', profile.id).eq('thread_id', threadId)
      setMyVotes(prev => { const n = { ...prev }; delete n[threadId]; return n })
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, upvotes_count: (t.upvotes_count || 0) - value } : t))
    } else if (existing) {
      // Change vote
      await supabase.from('thread_votes').update({ value })
        .eq('user_id', profile.id).eq('thread_id', threadId)
      setMyVotes(prev => ({ ...prev, [threadId]: value }))
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, upvotes_count: (t.upvotes_count || 0) - existing + value } : t))
    } else {
      // New vote
      await supabase.from('thread_votes').insert({ user_id: profile.id, thread_id: threadId, value })
      setMyVotes(prev => ({ ...prev, [threadId]: value }))
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, upvotes_count: (t.upvotes_count || 0) + value } : t))
    }
  }

  const tagCounts = {}
  threads.forEach(t => (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1 }))
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)

  const filteredThreads = threads.filter(t => {
    const matchesTag = !tagFilter || (t.tags || []).includes(tagFilter)
    const matchesSearch = !tagSearch.trim() || (t.tags || []).some(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
    return matchesTag && matchesSearch
  })

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>💬</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>
              <span className="gradient-text">{profile?.campus_short}</span> Threads
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Campus discussions</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ fontSize: 13, padding: '8px 16px' }}>
            + New Thread
          </button>
        </div>

        {/* Tag search */}
        <div style={{ marginBottom: 14 }}>
          <input
            placeholder="Search threads by tag…"
            value={tagSearch}
            onChange={e => { setTagSearch(e.target.value); setTagFilter('') }}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Top tag chips */}
        {topTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {topTags.map(([tag, count]) => {
              const active = tagFilter === tag
              return (
                <button
                  key={tag}
                  onClick={() => { setTagFilter(active ? '' : tag); setTagSearch('') }}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    background: active ? `${campusColor}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? campusColor + '55' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? campusColor : 'var(--text-3)',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  #{tag} <span style={{ opacity: 0.6 }}>{count}</span>
                </button>
              )
            })}
            {(tagFilter || tagSearch) && (
              <button
                onClick={() => { setTagFilter(''); setTagSearch('') }}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', cursor: 'pointer' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {/* Sort tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['hot', '🔥 Hot'], ['new', '✨ New']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSort(val)}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 999,
                background: sort === val ? `${campusColor}18` : 'transparent',
                border: `1px solid ${sort === val ? campusColor + '40' : 'rgba(255,255,255,0.09)'}`,
                color: sort === val ? campusColor : 'var(--text-2)',
                fontWeight: sort === val ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Thread list */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...panel, padding: 18, marginBottom: 10, display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', flexShrink: 0, width: 36 }}>
                <div className="skeleton" style={{ height: 16, width: 16 }} />
                <div className="skeleton" style={{ height: 14, width: 20 }} />
                <div className="skeleton" style={{ height: 16, width: 16 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 10, width: '30%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 10, width: '60%' }} />
              </div>
            </div>
          ))
        ) : filteredThreads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 7, color: 'var(--text)' }}>
              {tagFilter || tagSearch ? 'No threads match this tag' : 'No threads yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {tagFilter || tagSearch ? 'Try a different tag or clear the filter' : `Start the first discussion at ${profile?.campus_short}!`}
            </div>
          </div>
        ) : (
          filteredThreads.map((thread, i) => (
            <div key={thread.id} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <ThreadCard thread={thread} onVote={handleVote} myVote={myVotes[thread.id]} />
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateThreadModal
          domain={profile?.domain}
          onClose={() => setShowCreate(false)}
          onCreated={fetchThreads}
        />
      )}
    </Layout>
  )
}

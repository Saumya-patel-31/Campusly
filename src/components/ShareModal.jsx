import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth.js'
import { AvatarImg } from './Layout.jsx'
import { supabase } from '../lib/supabase.js'

export default function ShareModal({ post, author, onClose }) {
  const { profile } = useAuth()
  const [search, setSearch]       = useState('')
  const [people, setPeople]       = useState([])
  const [selected, setSelected]   = useState(new Set()) // set of user ids
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(new Set())
  const [copied, setCopied]       = useState(false)
  const [loadingPeople, setLoadingPeople] = useState(true)
  const searchRef = useRef(null)

  const shareUrl = `${window.location.origin}/profile/${author?.username}`

  // Load all campus people on open
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, major, year')
        .eq('domain', profile.domain)
        .neq('id', profile.id)
        .order('display_name', { ascending: true })
        .limit(100)
      setPeople(data || [])
      setLoadingPeople(false)
    }
    load()
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [profile.domain, profile.id])

  const filtered = people.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.display_name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
  })

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handleSend() {
    if (selected.size === 0) return
    setSending(true)
    await Promise.all([...selected].map(receiverId =>
      supabase.from('messages').insert({
        sender_id:      profile.id,
        receiver_id:    receiverId,
        text:           '',
        shared_post_id: post.id,
      })
    ))
    setSent(new Set([...sent, ...selected]))
    setSelected(new Set())
    setSending(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const campusColor = profile?.campus_color || '#a78bfa'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:200, backdropFilter:'blur(6px)' }}
      />

      {/* Sheet — slides up from bottom like Instagram */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 201,
        background: 'rgba(12,12,22,0.97)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '24px 24px 0 0',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Handle bar */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 12px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Share</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding:'4px 10px', fontSize:13, color:'var(--text-3)' }}>Done</button>
        </div>

        {/* Post preview strip */}
        <div style={{ margin:'0 20px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
          {post.media_url && post.media_type === 'image' && (
            <img src={post.media_url} alt="" style={{ width:44, height:44, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:2 }}>@{author?.username}</div>
            {post.caption && <div style={{ fontSize:12, color:'var(--text-3)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{post.caption}</div>}
          </div>
        </div>

        {/* Copy link button */}
        <div style={{ margin:'0 20px 14px' }}>
          <button
            onClick={copyLink}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 16px',
              background: copied ? `${campusColor}18` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${copied ? campusColor + '40' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: 12,
              color: copied ? campusColor : 'var(--text)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize:20 }}>{copied ? '✓' : '🔗'}</span>
            <span style={{ fontSize:14, fontWeight:500 }}>{copied ? 'Link copied!' : 'Copy link'}</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ margin:'0 20px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.06em' }}>SEND TO</span>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Search */}
        <div style={{ padding:'0 20px 12px' }}>
          <input
            ref={searchRef}
            placeholder="Search people…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize:14, borderRadius:12 }}
          />
        </div>

        {/* People grid */}
        <div style={{ overflowY:'auto', flex:1, padding:'0 20px' }}>
          {loadingPeople ? (
            <div style={{ display:'flex', justifyContent:'center', padding:24 }}>
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-3)', fontSize:13 }}>No people found</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6, paddingBottom:16 }}>
              {filtered.map(person => {
                const isSelected = selected.has(person.id)
                const isSent     = sent.has(person.id)
                return (
                  <button
                    key={person.id}
                    onClick={() => !isSent && toggleSelect(person.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 14,
                      background: isSelected ? `${campusColor}18` : isSent ? 'rgba(52,211,153,0.10)' : 'transparent',
                      border: `1px solid ${isSelected ? campusColor + '40' : isSent ? 'rgba(52,211,153,0.3)' : 'transparent'}`,
                      cursor: isSent ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Avatar with selection ring */}
                    <div style={{ position:'relative' }}>
                      <AvatarImg src={person.avatar_url} name={person.display_name} size={48} />
                      {isSelected && (
                        <div style={{ position:'absolute', bottom:-2, right:-2, width:18, height:18, borderRadius:'50%', background:campusColor, border:'2px solid rgba(12,12,22,0.97)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700 }}>✓</div>
                      )}
                      {isSent && (
                        <div style={{ position:'absolute', bottom:-2, right:-2, width:18, height:18, borderRadius:'50%', background:'var(--green)', border:'2px solid rgba(12,12,22,0.97)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700 }}>✓</div>
                      )}
                    </div>
                    <div style={{ fontSize:11, color: isSent ? 'var(--green)' : isSelected ? campusColor : 'var(--text-2)', fontWeight: isSelected || isSent ? 600 : 400, textAlign:'center', overflow:'hidden', width:'100%', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                      {isSent ? 'Sent' : person.username}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Send button — fixed at bottom */}
        {selected.size > 0 && (
          <div style={{ padding:'12px 20px 28px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={handleSend}
              className="btn-primary w-full"
              disabled={sending}
              style={{ padding:13, fontSize:15, borderRadius:14 }}
            >
              {sending
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="spinner" style={{ width:16,height:16,borderWidth:2 }}/>Sending…</span>
                : `Send to ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
              }
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

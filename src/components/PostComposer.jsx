import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/useAuth.js'
import { createPost } from '../hooks/usePosts.js'
import { AvatarImg } from './Layout.jsx'
import { supabase } from '../lib/supabase.js'

export default function PostComposer({ onPosted }) {
  const { profile } = useAuth()
  const [caption, setCaption]       = useState('')
  const [mediaFile, setMediaFile]   = useState(null)
  const [preview, setPreview]       = useState(null)
  const [mediaType, setMediaType]   = useState(null)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState(null)
  const [expanded, setExpanded]     = useState(false)
  const [progress, setProgress]     = useState(0)
  // @mention state
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionResults, setMentionResults] = useState([])
  const [mentionPos, setMentionPos] = useState(0)
  const textareaRef = useRef(null)
  const fileRef     = useRef(null)

  // Detect @mention as user types
  function handleCaptionChange(e) {
    const val = e.target.value
    setCaption(val)
    setExpanded(true)

    // Find if cursor is inside an @mention
    const pos = e.target.selectionStart
    const before = val.slice(0, pos)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionPos(pos - match[0].length)
    } else {
      setMentionQuery(null)
      setMentionResults([])
    }
  }

  // Search campus members for @mention
  useEffect(() => {
    if (mentionQuery === null) return
    if (mentionQuery.length === 0) { setMentionResults([]); return }
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('domain', profile.domain)
      .ilike('username', `${mentionQuery}%`)
      .limit(5)
      .then(({ data }) => setMentionResults(data || []))
  }, [mentionQuery, profile.domain])

  function insertMention(username) {
    const before = caption.slice(0, mentionPos)
    const after  = caption.slice(mentionPos + mentionQuery.length + 1) // +1 for @
    const newCaption = `${before}@${username} ${after}`
    setCaption(newCaption)
    setMentionQuery(null)
    setMentionResults([])
    textareaRef.current?.focus()
  }

  function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return; setError(null)
    const isVideo = file.type.startsWith('video')
    if (file.size > (isVideo?100:10)*1024*1024) { setError('File too large.'); return }
    setMediaFile(file); setMediaType(isVideo?'video':'image')
    setPreview(URL.createObjectURL(file)); setExpanded(true)
  }

  function removeMedia() {
    setMediaFile(null); setPreview(null); setMediaType(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!caption.trim() && !mediaFile) return
    setBusy(true); setError(null); setProgress(0)
    const prog = setInterval(() => setProgress(p => Math.min(p+7, 88)), 200)
    try {
      const post = await createPost({ userId: profile.id, domain: profile.domain, caption: caption.trim(), mediaFile })
      clearInterval(prog); setProgress(100)

      // Fire mention notifications
      const handles = [...new Set((caption.match(/@(\w+)/g) || []).map(h => h.slice(1)))]
      if (handles.length > 0 && post?.id) {
        const { data: mentioned } = await supabase
          .from('profiles')
          .select('id, username')
          .or(handles.map(h => `username.ilike.${h}`).join(','))
          .eq('domain', profile.domain)
        if (mentioned?.length) {
          const notifs = mentioned
            .filter(u => u.id !== profile.id)   // don't self-notify
            .map(u => ({
              recipient_id: u.id,
              actor_id:     profile.id,
              type:         'mention',
              post_id:      post.id,
              read:         false,
            }))
          if (notifs.length) await supabase.from('notifications').insert(notifs)
        }
      }

      setTimeout(() => { setCaption(''); removeMedia(); setExpanded(false); setBusy(false); setProgress(0); onPosted?.() }, 300)
    } catch(err) {
      clearInterval(prog); setError(err.message); setBusy(false); setProgress(0)
    }
  }

  const uni = profile
  const campusColor = uni?.campus_color || '#a78bfa'

  return (
    <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', padding:'16px 18px', marginBottom:14, position:'relative' }}>
      <div style={{ display:'flex', gap:11 }}>
        <AvatarImg src={profile?.avatar_url} name={profile?.display_name} size={38} />
        <div style={{ flex:1, minWidth:0, position:'relative' }}>
          <textarea
            ref={textareaRef}
            placeholder={`What's happening at ${profile?.campus_short||'campus'}? Use @ to tag classmates`}
            value={caption}
            onChange={handleCaptionChange}
            onFocus={() => setExpanded(true)}
            rows={expanded ? 3 : 1}
            style={{ resize:'none', fontSize:14, lineHeight:1.65, background:'transparent', border:'none', borderBottom:expanded?'1px solid rgba(255,255,255,0.09)':'none', borderRadius:0, padding:'3px 0', marginBottom:expanded?12:0, boxShadow:'none', transition:'all 0.2s', width:'100%' }}
          />

          {/* @mention dropdown */}
          {mentionResults.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'rgba(15,15,30,0.97)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, overflow:'hidden', zIndex:50, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', backdropFilter:'blur(20px)' }}>
              {mentionResults.map(u => (
                <div key={u.id} onClick={() => insertMention(u.username)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <AvatarImg src={u.avatar_url} name={u.display_name} size={28} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{u.display_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="fade-in" style={{ position:'relative', marginBottom:12, borderRadius:12, overflow:'hidden' }}>
              {mediaType==='video'
                ? <video src={preview} controls style={{ width:'100%', maxHeight:320, borderRadius:12, background:'#000', display:'block' }}/>
                : <img src={preview} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', borderRadius:12 }}/>
              }
              <button onClick={removeMedia} style={{ position:'absolute', top:8, right:8, width:26, height:26, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'#fff', fontSize:15, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
          )}

          {busy && progress > 0 && progress < 100 && (
            <div style={{ height:2, background:'rgba(255,255,255,0.08)', borderRadius:2, marginBottom:10, overflow:'hidden' }}>
              <div style={{ height:'100%', background:`linear-gradient(90deg,${campusColor},#f472b6)`, borderRadius:2, width:`${progress}%`, transition:'width 0.2s' }}/>
            </div>
          )}

          {error && <div style={{ fontSize:11, color:'var(--red)', marginBottom:8, padding:'5px 9px', background:'var(--red-bg)', borderRadius:8 }}>{error}</div>}

          {expanded && (
            <div className="fade-in" style={{ display:'flex', alignItems:'center', gap:5 }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }}/>
              <button type="button" onClick={()=>{fileRef.current.accept='image/*';fileRef.current.click()}} className="btn-ghost" style={{ padding:'5px 8px', fontSize:17, color:'var(--text-3)' }}>🖼</button>
              <button type="button" onClick={()=>{fileRef.current.accept='video/*';fileRef.current.click()}} className="btn-ghost" style={{ padding:'5px 8px', fontSize:17, color:'var(--text-3)' }}>🎬</button>
              <button type="button" onClick={()=>{ setCaption(c=>c+'@'); textareaRef.current?.focus() }} className="btn-ghost" style={{ padding:'5px 8px', fontSize:14, color:'var(--text-3)', fontWeight:700 }}>@</button>
              <div style={{ flex:1 }}/>
              <span style={{ fontSize:11, color:caption.length>450?'var(--red)':'var(--text-3)' }}>{caption.length}/500</span>
              <button type="button" onClick={()=>{setExpanded(false);setCaption('');removeMedia()}} className="btn-ghost" style={{ fontSize:12 }}>Cancel</button>
              <button type="button" onClick={handleSubmit} className="btn-primary" disabled={busy||(!caption.trim()&&!mediaFile)||caption.length>500}
                style={{ fontSize:12, padding:'6px 16px', background:campusColor, borderColor:'transparent', boxShadow:`0 4px 16px ${campusColor}45` }}>
                {busy ? <span style={{ display:'flex',alignItems:'center',gap:5 }}><span className="spinner" style={{ width:13,height:13,borderWidth:2 }}/>Posting…</span> : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

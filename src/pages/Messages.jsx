import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { useConversations, useMessages } from '../hooks/useMessages.js'
import { supabase } from '../lib/supabase.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

function timeStr(ts) { return new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) }
function dateStr(ts) {
  const d=new Date(ts), now=new Date()
  if (d.toDateString()===now.toDateString()) return 'Today'
  const y=new Date(now); y.setDate(now.getDate()-1)
  if (d.toDateString()===y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
}

function SharedPostCard({ post, fromMe }) {
  const navigate = useNavigate()
  if (!post) return null
  const author = post.profiles
  return (
    <div
      onClick={() => navigate(`/profile/${author?.username}`)}
      style={{
        width: 240,
        background: fromMe ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.06)',
        border: fromMe ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity='1'}
    >
      {post.media_url && post.media_type==='image' && (
        <img src={post.media_url} alt="" style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
      )}
      {post.media_url && post.media_type==='video' && (
        <video src={post.media_url} style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} muted />
      )}
      {!post.media_url && post.caption && (
        <div style={{ padding:'14px 14px 0', fontSize:13, lineHeight:1.5, color:'rgba(255,255,255,0.85)', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {post.caption}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px' }}>
        <AvatarImg src={author?.avatar_url} name={author?.display_name} size={20} />
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
          {author?.display_name}
        </span>
        {post.media_url && post.caption && (
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', flex:1 }}>
            · {post.caption}
          </span>
        )}
      </div>
    </div>
  )
}

// Floating action buttons — only shown on your own messages
function MsgActions({ onEdit, onDelete, visible }) {
  if (!visible) return null
  return (
    <div style={{
      display: 'flex', gap: 2, alignItems: 'center',
      order: -1, // always appears to the left of the bubble (own msgs are right-aligned)
    }}>
      <button
        onClick={onEdit}
        title="Edit"
        style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, width: 28, height: 28, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-2)',
        }}
      >
        <EditIco />
      </button>
      <button
        onClick={onDelete}
        title="Unsend"
        style={{
          background: 'rgba(255,107,138,0.10)', border: '1px solid rgba(255,107,138,0.20)',
          borderRadius: 8, width: 28, height: 28, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--red)',
        }}
      >
        <TrashIco />
      </button>
    </div>
  )
}

function EditIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

export default function Messages() {
  const { userId: paramUserId } = useParams()
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { conversations, loading: loadingConvos, clearUnread } = useConversations(profile?.id)
  const [activeUser, setActiveUser] = useState(null)
  const [draft, setDraft]           = useState('')
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [tappedMsgId,  setTappedMsgId]  = useState(null)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editDraft, setEditDraft]       = useState('')
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false)
  const endRef      = useRef(null)
  const editRef     = useRef(null)
  const headerMenuRef = useRef(null)

  const { messages, loading: loadingMsgs, sendMessage, editMessage, deleteMessage, deleteConversation } =
    useMessages(profile?.id, activeUser?.id)

  useEffect(() => {
    if (!paramUserId||!profile) return
    supabase.from('profiles').select('*').eq('id',paramUserId).single().then(({data})=>{if(data)setActiveUser(data)})
  }, [paramUserId, profile])

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  // Focus edit textarea when entering edit mode
  useEffect(() => {
    if (editingMsgId && editRef.current) editRef.current.focus()
  }, [editingMsgId])

  // Close header menu on outside click
  useEffect(() => {
    if (!headerMenuOpen) return
    function handler(e) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [headerMenuOpen])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()||!activeUser) return
    const text=draft; setDraft('')
    await sendMessage(text)
  }

  function startEdit(msg) {
    setEditingMsgId(msg.id)
    setEditDraft(msg.text)
  }

  async function submitEdit() {
    if (!editDraft.trim() || !editingMsgId) return
    await editMessage(editingMsgId, editDraft)
    setEditingMsgId(null)
    setEditDraft('')
  }

  function cancelEdit() {
    setEditingMsgId(null)
    setEditDraft('')
  }

  async function handleDeleteConversation() {
    setConfirmDeleteChat(false)
    setHeaderMenuOpen(false)
    await deleteConversation()
  }

  const campusColor = profile?.campus_color || '#a78bfa'
  const isMobile = useIsMobile()
  // On mobile: show inbox list unless a conversation is active
  const showList = !isMobile || !activeUser
  const showChat = !isMobile || !!activeUser

  return (
    <Layout>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

        {/* ── Inbox sidebar ── */}
        <div style={{ width: isMobile ? '100%' : 290, display: showList ? 'flex' : 'none', flexDirection:'column', overflowY:'auto', background:'rgba(255,255,255,0.055)', backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.10)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div style={{ padding:'22px 20px 14px', fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, letterSpacing:'-0.03em', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            Messages
          </div>

          {loadingConvos
            ? Array.from({length:4}).map((_,i)=>(
              <div key={i} style={{ display:'flex', gap:10, padding:'14px 20px' }}>
                <div className="skeleton" style={{ width:40,height:40,borderRadius:'50%',flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="skeleton" style={{ height:11,width:'55%',marginBottom:7 }} />
                  <div className="skeleton" style={{ height:10,width:'75%' }} />
                </div>
              </div>
            ))
            : conversations.length===0
            ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
                No messages yet.<br />
                <span style={{ color:'var(--campus)', cursor:'pointer' }} onClick={()=>navigate('/explore')}>Find people →</span>
              </div>
            )
            : conversations.map(({user,lastMessage,unread})=>{
              const isActive = activeUser?.id===user.id
              return (
                <div key={user.id} onClick={()=>{setActiveUser(user);clearUnread(user.id);navigate(`/messages/${user.id}`)}}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', cursor:'pointer', transition:'background 0.15s',
                    background: isActive?`${campusColor}18`:'transparent',
                    borderLeft: isActive?`2px solid ${campusColor}`:'2px solid transparent' }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <AvatarImg src={user.avatar_url} name={user.display_name} size={40} />
                    {unread>0 && <div style={{ position:'absolute', top:-2, right:-2, width:16, height:16, background:`linear-gradient(135deg,${campusColor},#9B6EFA)`, borderRadius:'50%', fontSize:9, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{unread}</div>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ fontWeight:unread>0?700:500, fontSize:13, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', fontFamily:'var(--font-display)' }}>{user.display_name}</span>
                      {lastMessage && <span style={{ fontSize:10, color:'var(--text-3)', flexShrink:0, marginLeft:6 }}>{timeStr(lastMessage.created_at)}</span>}
                    </div>
                    <div style={{ fontSize:12, color:unread>0?'var(--text)':'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {lastMessage
                        ? (lastMessage.sender_id===profile?.id?'You: ':'')+
                          (lastMessage.shared_post_id ? '📷 Shared a post' : lastMessage.text)
                        : 'No messages yet'}
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* ── Chat area ── */}
        {activeUser ? (
          <div style={{ flex:1, display: showChat ? 'flex' : 'none', flexDirection:'column', overflow:'hidden', width: isMobile ? '100%' : undefined }}>

            {/* Header */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.10)', display:'flex', alignItems:'center', gap:12, flexShrink:0, backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', background:'rgba(255,255,255,0.055)', boxShadow:'0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              {/* Back button on mobile */}
              {isMobile && (
                <button onClick={() => { setActiveUser(null); navigate('/messages') }} style={{ background:'transparent', border:'none', padding:'4px 8px 4px 0', fontSize:22, color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center' }}>‹</button>
              )}
              <AvatarImg src={activeUser.avatar_url} name={activeUser.display_name} size={38} />
              <div>
                <div style={{ fontWeight:700, fontSize:15, fontFamily:'var(--font-display)' }}>{activeUser.display_name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>@{activeUser.username}{activeUser.major?` · ${activeUser.major}`:''}</div>
              </div>

              {/* Header actions */}
              <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', position:'relative' }} ref={headerMenuRef}>
                <button onClick={()=>navigate(`/profile/${activeUser.username}`)} className="btn-ghost" style={{ fontSize:13 }}>View profile</button>

                {/* ⋯ menu */}
                <button
                  onClick={() => setHeaderMenuOpen(v => !v)}
                  style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, width:34, height:34, padding:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-2)', cursor:'pointer' }}
                  title="More options"
                >⋯</button>

                {headerMenuOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:50,
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:12, backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', overflow:'hidden', minWidth:170,
                    boxShadow:'0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
                    animation:'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <button
                      onClick={() => { setConfirmDeleteChat(true); setHeaderMenuOpen(false) }}
                      style={{ width:'100%', textAlign:'left', padding:'11px 16px', fontSize:13, color:'var(--red)', background:'transparent', border:'none', borderRadius:0, display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,107,138,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <TrashIco /> Delete chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:4 }}
              onClick={() => isMobile && setTappedMsgId(null)}
            >
              {loadingMsgs ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}><div className="spinner" /></div>
              ) : messages.length===0 ? (
                <div style={{ textAlign:'center', color:'var(--text-3)', fontSize:14, margin:'auto' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
                  Say hi to {activeUser.display_name.split(' ')[0]}!
                </div>
              ) : messages.map((msg,i) => {
                const fromMe    = msg.sender_id===profile?.id
                const showDate  = i===0 || dateStr(msg.created_at)!==dateStr(messages[i-1].created_at)
                const isPostShare = !!msg.shared_post_id
                const isEditing = editingMsgId===msg.id
                const hovered   = hoveredMsgId===msg.id
                const tapped    = isMobile && tappedMsgId===msg.id

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign:'center', fontSize:11, color:'var(--text-3)', margin:'12px 0 8px' }}>
                        {dateStr(msg.created_at)}
                      </div>
                    )}

                    <div
                      className="fade-up"
                      style={{ display:'flex', flexDirection:'column', alignItems:fromMe?'flex-end':'flex-start', marginBottom:2, gap:2 }}
                      onMouseEnter={() => !isMobile && setHoveredMsgId(msg.id)}
                      onMouseLeave={() => !isMobile && setHoveredMsgId(null)}
                    >
                      {/* Post share card */}
                      {isPostShare && (
                        <>
                          <div style={{ display:'flex', justifyContent:fromMe?'flex-end':'flex-start', alignItems:'center', gap:6 }}>
                            {fromMe && <MsgActions visible={(hovered || tapped) && !isEditing} onEdit={() => { startEdit(msg); setTappedMsgId(null) }} onDelete={() => { deleteMessage(msg.id); setTappedMsgId(null) }} />}
                            <div onClick={isMobile && fromMe ? (e) => { e.stopPropagation(); setTappedMsgId(v => v===msg.id ? null : msg.id) } : undefined} style={{ cursor: isMobile && fromMe ? 'pointer' : 'default' }}>
                              <SharedPostCard post={msg.shared_post} fromMe={fromMe} />
                            </div>
                          </div>
                          <div style={{ fontSize:10, color:'var(--text-3)', paddingLeft:fromMe?0:4, paddingRight:fromMe?4:0 }}>
                            {fromMe?'You':activeUser?.display_name?.split(' ')[0]} shared a post · {timeStr(msg.created_at)}
                          </div>
                        </>
                      )}

                      {/* Text bubble */}
                      {!isPostShare && (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:6, maxWidth: isMobile ? '85%' : '72%', position: 'relative' }}>
                            {/* Desktop: buttons float to the left of the bubble on hover */}
                            {fromMe && !isMobile && <MsgActions visible={hovered && !isEditing} onEdit={() => startEdit(msg)} onDelete={() => deleteMessage(msg.id)} />}

                            {/* Mobile: tap bubble to reveal actions */}
                            {/* Edit mode */}
                            {isEditing ? (
                              <div style={{ flex:1 }}>
                                <textarea
                                  ref={editRef}
                                  value={editDraft}
                                  onChange={e => setEditDraft(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() }
                                    if (e.key==='Escape') cancelEdit()
                                  }}
                                  rows={2}
                                  style={{ fontSize:14, borderRadius:12, padding:'9px 14px', resize:'none', width:'100%', border:`1px solid ${campusColor}60`, background:fromMe?`${campusColor}22`:'rgba(255,255,255,0.08)', boxShadow:`0 0 0 3px ${campusColor}18` }}
                                />
                                <div style={{ display:'flex', gap:6, marginTop:5, justifyContent:'flex-end' }}>
                                  <button onClick={cancelEdit} className="btn-ghost" style={{ fontSize:11, padding:'3px 10px' }}>Cancel</button>
                                  <button onClick={submitEdit} className="btn-primary" disabled={!editDraft.trim()} style={{ fontSize:11, padding:'3px 10px' }}>Save</button>
                                </div>
                              </div>
                            ) : (
                              /* Normal bubble */
                              <div
                                onClick={isMobile && fromMe ? (e) => { e.stopPropagation(); setTappedMsgId(v => v===msg.id ? null : msg.id) } : undefined}
                                style={{
                                  padding:'9px 14px',
                                  borderRadius: fromMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                                  background: fromMe?`linear-gradient(135deg,${campusColor},#7c3aed)`:'rgba(255,255,255,0.07)',
                                  color:'#fff', fontSize:14, lineHeight:1.5, wordBreak:'break-word',
                                  border: fromMe?'none':'1px solid rgba(255,255,255,0.10)',
                                  backdropFilter: fromMe?'none':'blur(28px) saturate(150%)',
                                  WebkitBackdropFilter: fromMe?'none':'blur(28px) saturate(150%)',
                                  cursor: isMobile && fromMe ? 'pointer' : 'default',
                                  outline: isMobile && tapped ? `2px solid ${campusColor}44` : 'none',
                              }}>
                                {msg.text}
                                <div style={{ fontSize:10, marginTop:3, opacity:0.6, textAlign:'right', display:'flex', justifyContent:'flex-end', gap:5, alignItems:'center' }}>
                                  {msg.edited && <span style={{ fontStyle:'italic' }}>edited</span>}
                                  {timeStr(msg.created_at)}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Mobile: action buttons below bubble on tap */}
                          {isMobile && fromMe && tapped && !isEditing && (
                            <div style={{ display:'flex', gap:4, justifyContent:'flex-end', marginTop:4, alignSelf:'flex-end' }}>
                              <MsgActions visible={true} onEdit={() => { startEdit(msg); setTappedMsgId(null) }} onDelete={() => { deleteMessage(msg.id); setTappedMsgId(null) }} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.10)', display:'flex', gap:10, flexShrink:0, backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', background:'rgba(255,255,255,0.055)', boxShadow:'0 -2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <textarea
                placeholder={`Message ${activeUser.display_name.split(' ')[0]}…`}
                value={draft}
                onChange={e=>setDraft(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(e)}}}
                rows={1}
                style={{ flex:1, resize:'none', fontSize:14, borderRadius:'var(--radius-full)', padding:'10px 16px', lineHeight:1.5, maxHeight:120, overflowY:'auto' }}
              />
              <button type="submit" className="btn-primary" disabled={!draft.trim()} style={{ flexShrink:0, padding:'10px 20px', alignSelf:'flex-end' }}>Send</button>
            </form>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color:'var(--text-3)' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.3 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <div style={{ fontSize:14 }}>Select a conversation to start chatting</div>
            <button onClick={()=>navigate('/explore')} className="btn-primary" style={{ fontSize:13, marginTop:4 }}>Find people →</button>
          </div>
        )}
      </div>

      {/* ── Delete chat confirmation modal ── */}
      {confirmDeleteChat && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(7,7,16,0.7)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setConfirmDeleteChat(false)}
        >
          <div
            className="scale-in"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'28px 28px 24px', maxWidth:340, width:'100%', backdropFilter:'blur(28px) saturate(150%)', WebkitBackdropFilter:'blur(28px) saturate(150%)', boxShadow:'0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize:36, marginBottom:14, textAlign:'center' }}>🗑️</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, marginBottom:8, textAlign:'center' }}>Delete Chat?</div>
            <div style={{ fontSize:13, color:'var(--text-2)', textAlign:'center', lineHeight:1.6, marginBottom:22 }}>
              This chat will be deleted <strong>only for you</strong>. <strong>{activeUser?.display_name}</strong> will still be able to see all messages.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDeleteChat(false)} className="btn-ghost" style={{ flex:1 }}>Cancel</button>
              <button onClick={handleDeleteConversation} className="btn-danger" style={{ flex:1, fontWeight:700 }}>Delete chat</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

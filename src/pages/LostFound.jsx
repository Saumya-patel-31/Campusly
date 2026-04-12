import { useState, useEffect, useRef } from 'react'
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

const CATEGORIES = [
  { key: 'electronics', label: 'Electronics',  emoji: '💻' },
  { key: 'clothing',    label: 'Clothing',      emoji: '👕' },
  { key: 'bag',         label: 'Bag / Backpack',emoji: '🎒' },
  { key: 'id_card',     label: 'ID / Card',     emoji: '🪪' },
  { key: 'keys',        label: 'Keys',          emoji: '🔑' },
  { key: 'glasses',     label: 'Glasses',       emoji: '👓' },
  { key: 'jewelry',     label: 'Jewelry',       emoji: '💍' },
  { key: 'book',        label: 'Book / Notes',  emoji: '📚' },
  { key: 'water_bottle',label: 'Water Bottle',  emoji: '💧' },
  { key: 'other',       label: 'Other',         emoji: '📦' },
]

function catFor(key) {
  return CATEGORIES.find(c => c.key === key) || { emoji: '📦', label: key }
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── Post Item Modal ─────────────────────────────────────────────── */
function PostItemModal({ onClose, onPosted, domain, campusColor }) {
  const { profile } = useAuth()
  const fileRef = useRef(null)
  const [type, setType]           = useState('lost')
  const [category, setCategory]   = useState('')
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [location, setLocation]   = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [posting, setPosting]     = useState(false)
  const [error, setError]         = useState('')

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Add a title.'); return }
    setPosting(true); setError('')

    // Insert item first
    const { data: item, error: err } = await supabase
      .from('lost_found_items')
      .insert({
        user_id: profile.id,
        domain,
        type,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        category: category || null,
      })
      .select().single()

    if (err) { setError(err.message); setPosting(false); return }

    // Upload image
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${profile.id}/${item.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('lost-found-images')
        .upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('lost-found-images').getPublicUrl(path)
        await supabase.from('lost_found_items').update({ image_url: urlData.publicUrl }).eq('id', item.id)
      }
    }

    setPosting(false)
    onPosted()
    onClose()
  }

  const accentLost  = '#ff6b8a'
  const accentFound = '#34d399'
  const accent = type === 'lost' ? accentLost : accentFound

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.70)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, width:'100%', maxWidth:500, padding:'26px 24px', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>Post an Item</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:15 }}>

          {/* Lost / Found toggle */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {['lost','found'].map(t => (
              <button key={t} type="button" onClick={() => setType(t)} style={{
                padding:'11px', borderRadius:12, fontWeight:700, fontSize:14, cursor:'pointer',
                background: type === t ? (t === 'lost' ? 'rgba(255,107,138,0.15)' : 'rgba(52,211,153,0.15)') : 'rgba(255,255,255,0.05)',
                border: `2px solid ${type === t ? (t === 'lost' ? accentLost + '60' : accentFound + '60') : 'rgba(255,255,255,0.09)'}`,
                color: type === t ? (t === 'lost' ? accentLost : accentFound) : 'var(--text-3)',
                transition:'all 0.14s',
              }}>
                {t === 'lost' ? '😟 I Lost Something' : '🙌 I Found Something'}
              </button>
            ))}
          </div>

          {/* Photo upload */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:8 }}>
              Photo <span style={{ color:'var(--text-3)', fontWeight:400 }}>(recommended)</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${preview ? accent + '50' : 'rgba(255,255,255,0.12)'}`,
                borderRadius:12, cursor:'pointer', overflow:'hidden',
                background:'rgba(255,255,255,0.03)',
                minHeight:140, display:'flex', alignItems:'center', justifyContent:'center',
                position:'relative', transition:'border-color 0.15s',
              }}
            >
              {preview ? (
                <>
                  <img src={preview} alt="preview" style={{ width:'100%', maxHeight:220, objectFit:'cover', display:'block' }} />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setImageFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{
                      position:'absolute', top:8, right:8,
                      background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%',
                      width:28, height:28, color:'#fff', fontSize:14, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}
                  >×</button>
                </>
              ) : (
                <div style={{ textAlign:'center', color:'var(--text-3)', padding:20 }}>
                  <div style={{ fontSize:32, marginBottom:6 }}>📷</div>
                  <div style={{ fontSize:13 }}>Click to add a photo</div>
                  <div style={{ fontSize:11, marginTop:3 }}>Helps people identify the item faster</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:8 }}>Category</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(category === c.key ? '' : c.key)} style={{
                  padding:'5px 11px', borderRadius:999, fontSize:11, cursor:'pointer',
                  background: category === c.key ? `${accent}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${category === c.key ? accent + '55' : 'rgba(255,255,255,0.09)'}`,
                  color: category === c.key ? accent : 'var(--text-2)',
                  fontWeight: category === c.key ? 600 : 400,
                  transition:'all 0.12s',
                }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder={type === 'lost' ? 'e.g. Black AirPods Pro case' : 'e.g. Found blue backpack near library'}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Location */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>
              Location <span style={{ color:'var(--text-3)', fontWeight:400 }}>(where it was lost/found)</span>
            </label>
            <input
              value={location} onChange={e => setLocation(e.target.value)} maxLength={100}
              placeholder='e.g. Library 2nd floor, near the printers'
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>
              Description <span style={{ color:'var(--text-3)', fontWeight:400 }}>(optional)</span>
            </label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)} maxLength={300} rows={2}
              placeholder='Any identifying details — color, brand, stickers, etc.'
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {error && <div style={{ fontSize:12, color:'#ff6b8a', background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.25)', borderRadius:8, padding:'8px 12px' }}>{error}</div>}

          <button type="submit" disabled={posting || !title.trim()} style={{
            background: accent, border:'none', borderRadius:11, color:'#fff',
            fontWeight:700, fontSize:14, padding:'12px',
            cursor: posting || !title.trim() ? 'not-allowed' : 'pointer',
            opacity: posting || !title.trim() ? 0.5 : 1,
            boxShadow:`0 4px 16px ${accent}40`,
          }}>
            {posting ? 'Posting…' : type === 'lost' ? '😟 Post Lost Item' : '🙌 Post Found Item'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Contact Modal ───────────────────────────────────────────────── */
function ContactModal({ item, poster, onClose, campusColor }) {
  const { profile } = useAuth()
  const navigate     = useNavigate()

  function handleMessage() {
    navigate(`/messages/${item.user_id}`)
    onClose()
  }

  const accent = item.type === 'lost' ? '#ff6b8a' : '#34d399'

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, width:'100%', maxWidth:400, padding:'26px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>
            {item.type === 'lost' ? '🙌 I found this!' : '😟 This is mine!'}
          </h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer' }}>×</button>
        </div>

        {/* Item summary */}
        <div style={{ display:'flex', gap:12, marginBottom:20, padding:'13px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12 }}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} style={{ width:56, height:56, borderRadius:9, objectFit:'cover', flexShrink:0 }} />
          ) : (
            <div style={{ width:56, height:56, borderRadius:9, background:`${accent}15`, border:`1px solid ${accent}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
              {catFor(item.category)?.emoji || '📦'}
            </div>
          )}
          <div>
            <div style={{ fontWeight:700, fontSize:13 }}>{item.title}</div>
            {item.location && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>📍 {item.location}</div>}
          </div>
        </div>

        {/* Poster info */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <AvatarImg src={poster?.avatar_url} name={poster?.display_name} size={36} />
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>{poster?.display_name}</div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>Posted {timeAgo(item.created_at)}</div>
          </div>
        </div>

        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:18, lineHeight:1.5 }}>
          Send them a direct message to arrange the handover. Be ready to describe the item or show proof of ownership.
        </p>

        <button onClick={handleMessage} style={{
          width:'100%', padding:'12px', borderRadius:11,
          background: accent, border:'none', color:'#fff',
          fontWeight:700, fontSize:14, cursor:'pointer',
          boxShadow:`0 4px 16px ${accent}40`,
        }}>
          💬 Message {poster?.display_name?.split(' ')[0] || 'them'}
        </button>
      </div>
    </div>
  )
}

/* ── Item Card ───────────────────────────────────────────────────── */
function ItemCard({ item, poster, currentUserId, campusColor, onClaim, onResolve, onDelete }) {
  const isOwner  = item.user_id === currentUserId
  const accent   = item.type === 'lost' ? '#ff6b8a' : '#34d399'
  const cat      = catFor(item.category)

  return (
    <div style={{
      ...panel,
      overflow:'hidden',
      opacity: item.status === 'resolved' ? 0.55 : 1,
      transition:'opacity 0.2s',
      display:'flex', flexDirection:'column',
    }}>
      {/* Photo */}
      <div style={{ position:'relative', background:'rgba(255,255,255,0.03)', minHeight: item.image_url ? 0 : undefined }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
        ) : (
          <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, background:`${accent}08` }}>
            {cat.emoji}
          </div>
        )}

        {/* Type badge */}
        <span style={{
          position:'absolute', top:10, left:10,
          background: item.type === 'lost' ? 'rgba(255,107,138,0.90)' : 'rgba(52,211,153,0.90)',
          color:'#fff', fontWeight:700, fontSize:11, letterSpacing:'0.06em',
          borderRadius:999, padding:'3px 10px',
          backdropFilter:'blur(8px)',
        }}>
          {item.type === 'lost' ? '😟 LOST' : '🙌 FOUND'}
        </span>

        {/* Resolved badge */}
        {item.status === 'resolved' && (
          <span style={{
            position:'absolute', top:10, right:10,
            background:'rgba(0,0,0,0.75)', color:'#34d399',
            fontWeight:700, fontSize:11, borderRadius:999, padding:'3px 10px',
            backdropFilter:'blur(8px)',
          }}>
            ✓ Resolved
          </span>
        )}

        {/* Category chip (when no image) */}
        {!item.image_url && item.category && (
          <span style={{
            position:'absolute', top:10, right:10,
            background:'rgba(0,0,0,0.5)', borderRadius:999, padding:'3px 10px',
            fontSize:11, color:'var(--text-2)',
          }}>{cat.emoji} {cat.label}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:'14px 16px', flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-display)', marginBottom:4, lineHeight:1.3 }}>
          {item.title}
        </div>

        {item.location && (
          <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
            <span>📍</span> {item.location}
          </div>
        )}

        {item.description && (
          <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5, marginBottom:8, flex:1 }}>
            {item.description}
          </div>
        )}

        {/* Poster row */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:'auto', paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <AvatarImg src={poster?.avatar_url} name={poster?.display_name} size={22} />
          <span style={{ fontSize:11, color:'var(--text-3)', flex:1 }}>
            {poster?.display_name} · {timeAgo(item.created_at)}
          </span>
          {isOwner && (
            <button onClick={() => onDelete(item.id)} style={{
              background:'transparent', border:'none', color:'rgba(255,107,138,0.4)',
              cursor:'pointer', fontSize:13, padding:0,
              transition:'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff6b8a'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,107,138,0.4)'}
            >×</button>
          )}
        </div>

        {/* Action buttons */}
        {item.status === 'active' && (
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            {!isOwner && (
              <button onClick={() => onClaim(item)} style={{
                flex:1, padding:'8px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer',
                background:`${accent}18`, border:`1px solid ${accent}40`, color:accent,
                transition:'all 0.15s',
              }}>
                {item.type === 'lost' ? '🙌 I found this!' : '😟 This is mine!'}
              </button>
            )}
            {isOwner && (
              <button onClick={() => onResolve(item.id)} style={{
                flex:1, padding:'8px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer',
                background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.30)', color:'#34d399',
              }}>
                ✓ Mark Resolved
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function LostFound() {
  const { profile }  = useAuth()
  const campusColor  = profile?.campus_color || '#a78bfa'
  const domain       = profile?.domain || ''

  const [items, setItems]         = useState([])
  const [profiles, setProfiles]   = useState({})
  const [tab, setTab]             = useState('all')        // 'all' | 'lost' | 'found' | 'mine'
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [claimItem, setClaimItem] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  async function loadItems() {
    const { data } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('domain', domain)
      .order('created_at', { ascending: false })

    const rows = data || []
    setItems(rows)

    // Fetch posters' profiles
    const ids = [...new Set(rows.map(r => r.user_id))]
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', ids)
      const map = Object.fromEntries((profs || []).map(p => [p.id, p]))
      setProfiles(map)
    }
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [domain])

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('lf_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_found_items', filter: `domain=eq.${domain}` }, loadItems)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [domain])

  async function handleDelete(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('lost_found_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleResolve(id) {
    await supabase.from('lost_found_items').update({ status: 'resolved' }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved' } : i))
  }

  // Filter
  const visible = items.filter(item => {
    if (tab === 'lost'  && item.type !== 'lost')  return false
    if (tab === 'found' && item.type !== 'found') return false
    if (tab === 'mine'  && item.user_id !== profile?.id) return false
    if (catFilter && item.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const lostCount  = items.filter(i => i.type === 'lost'  && i.status === 'active').length
  const foundCount = items.filter(i => i.type === 'found' && i.status === 'active').length

  return (
    <Layout>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em' }}>
              Lost & Found 🔍
            </h1>
            <p style={{ margin:'5px 0 0', fontSize:13, color:'var(--text-3)' }}>
              {lostCount} looking · {foundCount} waiting to be claimed
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            background: campusColor, border:'none', borderRadius:12,
            color:'#fff', fontWeight:700, fontSize:13, padding:'10px 18px',
            cursor:'pointer', flexShrink:0, marginLeft:12,
            boxShadow:`0 4px 14px ${campusColor}40`,
          }}>
            + Post Item
          </button>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'var(--text-3)', pointerEvents:'none' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, description, or location…"
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:11, padding:'10px 12px 10px 36px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[
            { key:'all',   label:'All',   count: items.filter(i => i.status === 'active').length },
            { key:'lost',  label:'😟 Lost',  count: lostCount },
            { key:'found', label:'🙌 Found', count: foundCount },
            { key:'mine',  label:'My Posts', count: items.filter(i => i.user_id === profile?.id).length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'6px 14px', borderRadius:999, fontSize:12, cursor:'pointer',
              background: tab === t.key ? `${campusColor}20` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${tab === t.key ? campusColor + '50' : 'rgba(255,255,255,0.10)'}`,
              color: tab === t.key ? campusColor : 'var(--text-2)',
              fontWeight: tab === t.key ? 700 : 400,
            }}>
              {t.label} {t.count > 0 && <span style={{ opacity:0.7 }}>({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
          <button onClick={() => setCatFilter('')} style={{
            padding:'4px 11px', borderRadius:999, fontSize:11, cursor:'pointer',
            background: !catFilter ? `${campusColor}18` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${!catFilter ? campusColor + '45' : 'rgba(255,255,255,0.09)'}`,
            color: !catFilter ? campusColor : 'var(--text-3)',
            fontWeight: !catFilter ? 600 : 400,
          }}>All categories</button>
          {CATEGORIES.map(c => {
            const count = items.filter(i => i.category === c.key).length
            if (!count && catFilter !== c.key) return null
            return (
              <button key={c.key} onClick={() => setCatFilter(catFilter === c.key ? '' : c.key)} style={{
                padding:'4px 11px', borderRadius:999, fontSize:11, cursor:'pointer',
                background: catFilter === c.key ? `${campusColor}18` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${catFilter === c.key ? campusColor + '45' : 'rgba(255,255,255,0.09)'}`,
                color: catFilter === c.key ? campusColor : 'var(--text-3)',
                fontWeight: catFilter === c.key ? 600 : 400,
              }}>{c.emoji} {c.label} ({count})</button>
            )
          })}
        </div>

        {/* Grid */}
        {loading && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>Loading…</div>
        )}

        {!loading && visible.length === 0 && (
          <div style={{ ...panel, padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
            <div style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:16, marginBottom:6 }}>
              {tab === 'all' ? 'Nothing posted yet' : `No ${tab} items`}
            </div>
            <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:18 }}>
              {tab === 'mine' ? 'You haven\'t posted anything.' : 'Be the first to post a lost or found item!'}
            </div>
            <button onClick={() => setShowModal(true)} style={{
              background:`${campusColor}20`, border:`1px solid ${campusColor}40`,
              borderRadius:10, color:campusColor, fontWeight:600, fontSize:13,
              padding:'10px 20px', cursor:'pointer',
            }}>
              + Post an Item
            </button>
          </div>
        )}

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
          gap:16,
        }}>
          {visible.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              poster={profiles[item.user_id]}
              currentUserId={profile?.id}
              campusColor={campusColor}
              onClaim={setClaimItem}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>

      </div>

      {showModal && (
        <PostItemModal
          onClose={() => setShowModal(false)}
          onPosted={loadItems}
          domain={domain}
          campusColor={campusColor}
        />
      )}

      {claimItem && (
        <ContactModal
          item={claimItem}
          poster={profiles[claimItem.user_id]}
          onClose={() => setClaimItem(null)}
          campusColor={campusColor}
        />
      )}
    </Layout>
  )
}

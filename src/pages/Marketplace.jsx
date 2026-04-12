import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

// ── Constants ───────────────────────────────────────────────────

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

const CATEGORIES = [
  { key: 'all',         label: 'All',             emoji: '🛍️' },
  { key: 'electronics', label: 'Electronics',      emoji: '💻' },
  { key: 'books',       label: 'Books & Notes',    emoji: '📚' },
  { key: 'clothing',    label: 'Clothing',          emoji: '👕' },
  { key: 'furniture',   label: 'Furniture',         emoji: '🪑' },
  { key: 'sports',      label: 'Sports & Fitness',  emoji: '🏀' },
  { key: 'gaming',      label: 'Gaming',            emoji: '🎮' },
  { key: 'kitchen',     label: 'Kitchen',           emoji: '🍳' },
  { key: 'supplies',    label: 'School Supplies',   emoji: '📐' },
  { key: 'tickets',     label: 'Tickets & Events',  emoji: '🎫' },
  { key: 'other',       label: 'Other',             emoji: '📦' },
]

const CONDITIONS = [
  { key: 'new',       label: 'New',       color: '#22c55e', desc: 'Brand new, never used' },
  { key: 'like_new',  label: 'Like New',  color: '#84cc16', desc: 'Used once or twice, no signs of wear' },
  { key: 'good',      label: 'Good',      color: '#eab308', desc: 'Minor wear, works perfectly' },
  { key: 'fair',      label: 'Fair',      color: '#f97316', desc: 'Visible wear, fully functional' },
  { key: 'poor',      label: 'Poor',      color: '#ef4444', desc: 'Heavy wear or minor damage' },
]

function conditionFor(key) { return CONDITIONS.find(c => c.key === key) || CONDITIONS[2] }
function categoryFor(key)  { return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1] }

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Post Listing Modal ───────────────────────────────────────────

function PostListingModal({ onClose, onPosted, campusColor }) {
  const { profile } = useAuth()
  const fileRef = useRef(null)
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [price, setPrice]         = useState('')
  const [condition, setCondition] = useState('')
  const [category, setCategory]   = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [posting, setPosting]     = useState(false)
  const [error, setError]         = useState('')

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim())    { setError('Add a title.'); return }
    if (!price || isNaN(+price) || +price < 0) { setError('Enter a valid price.'); return }
    if (!condition)       { setError('Select a condition.'); return }
    if (!imageFile)       { setError('Add a photo of the item.'); return }
    setPosting(true); setError('')

    const { data: listing, error: err } = await supabase
      .from('marketplace_listings')
      .insert({
        user_id:     profile.id,
        domain:      profile.domain,
        title:       title.trim(),
        description: description.trim() || null,
        price:       parseFloat(price),
        condition,
        category:    category || 'other',
      })
      .select().single()

    if (err) { setError(err.message); setPosting(false); return }

    // Upload image — reuse the existing lost-found-images bucket under a marketplace/ prefix
    const ext = imageFile.name.split('.').pop()
    const path = `marketplace/${profile.id}/${listing.id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('lost-found-images')
      .upload(path, imageFile, { upsert: true })

    if (upErr) {
      // Roll back the listing row so there's no phantom listing without a photo
      await supabase.from('marketplace_listings').delete().eq('id', listing.id)
      setError(`Image upload failed: ${upErr.message}`)
      setPosting(false)
      return
    }

    const { data: urlData } = supabase.storage.from('lost-found-images').getPublicUrl(path)
    await supabase.from('marketplace_listings').update({ image_url: urlData.publicUrl }).eq('id', listing.id)

    setPosting(false)
    onPosted()
    onClose()
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, width:'100%', maxWidth:520, padding:'26px 24px', maxHeight:'92vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>List an Item</h2>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text-3)' }}>Campus-only · No payment, connect via DM</p>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Photo upload */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:8, letterSpacing:'0.04em' }}>
              PHOTO <span style={{ color:'var(--red)', fontWeight:400 }}>*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${preview ? campusColor + '60' : 'rgba(255,255,255,0.12)'}`,
                borderRadius:14, cursor:'pointer', overflow:'hidden',
                background:'rgba(255,255,255,0.03)',
                minHeight:180, display:'flex', alignItems:'center', justifyContent:'center',
                position:'relative', transition:'border-color 0.15s',
              }}
            >
              {preview ? (
                <>
                  <img src={preview} alt="preview" style={{ width:'100%', maxHeight:260, objectFit:'cover', display:'block' }} />
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setImageFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:30, height:30, color:'#fff', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                  >×</button>
                </>
              ) : (
                <div style={{ textAlign:'center', color:'var(--text-3)', padding:24 }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📸</div>
                  <div style={{ fontSize:13, fontFamily:'var(--font-display)', fontWeight:700 }}>Add a photo</div>
                  <div style={{ fontSize:11, marginTop:4 }}>Clear photos get more inquiries</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:6, letterSpacing:'0.04em' }}>
              TITLE <span style={{ color:'var(--red)', fontWeight:400 }}>*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MacBook Pro 2021, Calculus textbook..." maxLength={80} />
          </div>

          {/* Price */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:6, letterSpacing:'0.04em' }}>
              PRICE ($) <span style={{ color:'var(--red)', fontWeight:400 }}>*</span>
            </label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-2)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>$</span>
              <input
                type="number" min="0" step="0.01"
                value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                style={{ paddingLeft:28 }}
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:8, letterSpacing:'0.04em' }}>
              CONDITION <span style={{ color:'var(--red)', fontWeight:400 }}>*</span>
            </label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CONDITIONS.map(c => (
                <button key={c.key} type="button" onClick={() => setCondition(c.key)} style={{
                  padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:700,
                  background: condition === c.key ? `${c.color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${condition === c.key ? c.color + '60' : 'rgba(255,255,255,0.09)'}`,
                  color: condition === c.key ? c.color : 'var(--text-3)',
                  transition:'all 0.12s',
                }}>
                  {c.label}
                </button>
              ))}
            </div>
            {condition && (
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>{conditionFor(condition).desc}</div>
            )}
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:8, letterSpacing:'0.04em' }}>CATEGORY</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(category === c.key ? '' : c.key)} style={{
                  padding:'5px 11px', borderRadius:20, fontSize:11, cursor:'pointer',
                  background: category === c.key ? 'var(--campus-dim)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${category === c.key ? 'var(--campus-border)' : 'rgba(255,255,255,0.09)'}`,
                  color: category === c.key ? 'var(--campus)' : 'var(--text-3)',
                  transition:'all 0.12s',
                }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:700, display:'block', marginBottom:6, letterSpacing:'0.04em' }}>DESCRIPTION</label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Describe the item — size, specs, reason for selling, any defects..."
              rows={3} maxLength={500}
              style={{ resize:'vertical' }}
            />
            <div style={{ textAlign:'right', fontSize:10, color:'var(--text-3)', marginTop:3 }}>{description.length}/500</div>
          </div>

          {error && <div style={{ fontSize:12, color:'var(--red)', padding:'8px 12px', borderRadius:8, background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.20)' }}>{error}</div>}

          <button type="submit" className="btn-primary" disabled={posting} style={{ width:'100%', marginTop:4 }}>
            {posting ? 'Listing…' : '🛍️ Post Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Listing Detail Modal ─────────────────────────────────────────

function ListingDetailModal({ listing, isOwn, onClose, onMarkSold, onDelete, campusColor }) {
  const navigate = useNavigate()
  const cond = conditionFor(listing.condition)
  const cat  = categoryFor(listing.category)
  const seller = listing.seller

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.80)', backdropFilter:'blur(10px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto' }}>

        {/* Image */}
        {listing.image_url ? (
          <div style={{ position:'relative' }}>
            <img src={listing.image_url} alt={listing.title} style={{ width:'100%', maxHeight:340, objectFit:'cover', display:'block', borderRadius:'16px 16px 0 0' }} />
            {listing.status === 'sold' && (
              <div style={{ position:'absolute', inset:0, borderRadius:'16px 16px 0 0', background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'#fff', background:'rgba(239,68,68,0.85)', padding:'8px 24px', borderRadius:12, letterSpacing:'0.06em' }}>SOLD</div>
              </div>
            )}
            <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%', width:32, height:32, color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        ) : (
          <div style={{ height:200, background:'rgba(255,255,255,0.04)', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, position:'relative' }}>
            {cat.emoji}
            <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.10)', border:'none', borderRadius:'50%', width:32, height:32, color:'var(--text)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        )}

        <div style={{ padding:'22px 24px 26px' }}>
          {/* Title + price */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 }}>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, lineHeight:1.3, flex:1 }}>{listing.title}</h2>
            <div style={{ flexShrink:0, textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#22c55e', lineHeight:1 }}>
                ${parseFloat(listing.price).toFixed(2)}
              </div>
              {listing.status === 'sold' && <div style={{ fontSize:11, color:'#ef4444', fontFamily:'var(--font-display)', fontWeight:700, marginTop:2 }}>SOLD</div>}
            </div>
          </div>

          {/* Badges */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, background:`${cond.color}18`, border:`1px solid ${cond.color}44`, color:cond.color }}>
              {cond.label} condition
            </span>
            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', color:'var(--text-3)' }}>
              {cat.emoji} {cat.label}
            </span>
            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, color:'var(--text-3)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              {timeAgo(listing.created_at)}
            </span>
          </div>

          {/* Description */}
          {listing.description && (
            <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7, marginBottom:20 }}>{listing.description}</p>
          )}

          {/* Seller */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', marginBottom:16 }}>
            <AvatarImg src={seller?.avatar_url} name={seller?.display_name} size={40} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>{seller?.display_name}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>@{seller?.username} · {seller?.major || 'Student'}</div>
            </div>
          </div>

          {/* Actions */}
          {isOwn ? (
            <div style={{ display:'flex', gap:8 }}>
              {listing.status === 'active' && (
                <button onClick={onMarkSold} style={{
                  flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(239,68,68,0.35)',
                  background:'rgba(239,68,68,0.10)', color:'#ef4444',
                  fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, cursor:'pointer',
                }}>
                  Mark as Sold
                </button>
              )}
              <button onClick={onDelete} style={{
                flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,107,138,0.25)',
                background:'rgba(255,107,138,0.08)', color:'var(--red)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, cursor:'pointer',
              }}>
                Delete Listing
              </button>
            </div>
          ) : listing.status === 'active' ? (
            <button
              onClick={() => { onClose(); navigate(`/messages/${listing.user_id}`) }}
              style={{
                width:'100%', padding:'14px', borderRadius:14,
                background: `linear-gradient(135deg, ${campusColor}, ${campusColor}cc)`,
                border:'none', color:'#fff',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
                cursor:'pointer', letterSpacing:'0.03em',
                boxShadow:`0 4px 20px ${campusColor}40`,
              }}
            >
              💬 Message Seller
            </button>
          ) : (
            <div style={{ textAlign:'center', padding:'12px', color:'var(--text-3)', fontSize:13 }}>This item has been sold.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Listing Card ─────────────────────────────────────────────────

function ListingCard({ listing, onClick }) {
  const cond = conditionFor(listing.condition)
  const cat  = categoryFor(listing.category)
  return (
    <div
      onClick={onClick}
      className="glass-card"
      style={{ cursor:'pointer', overflow:'hidden', transition:'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.40)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='' }}
    >
      {/* Image */}
      <div style={{ position:'relative', height:180, overflow:'hidden', borderRadius:'16px 16px 0 0', background:'rgba(255,255,255,0.04)' }}>
        {listing.image_url ? (
          <img src={listing.image_url} alt={listing.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        ) : (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:44 }}>{cat.emoji}</div>
        )}
        {/* Price badge */}
        <div style={{
          position:'absolute', bottom:10, left:10,
          background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)',
          borderRadius:20, padding:'5px 12px',
          fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'#22c55e',
        }}>
          ${parseFloat(listing.price).toFixed(2)}
        </div>
        {/* Sold overlay */}
        {listing.status === 'sold' && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#fff', background:'rgba(239,68,68,0.85)', padding:'5px 16px', borderRadius:8, letterSpacing:'0.06em' }}>SOLD</span>
          </div>
        )}
        {/* Condition badge */}
        <div style={{
          position:'absolute', top:10, right:10,
          background:`${cond.color}22`, backdropFilter:'blur(8px)',
          border:`1px solid ${cond.color}55`, borderRadius:20, padding:'3px 9px',
          fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:cond.color,
        }}>
          {cond.label}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'14px 14px 16px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {listing.title}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <AvatarImg src={listing.seller?.avatar_url} name={listing.seller?.display_name} size={20} />
            <span style={{ fontSize:11, color:'var(--text-3)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:100 }}>
              {listing.seller?.display_name}
            </span>
          </div>
          <span style={{ fontSize:10, color:'var(--text-3)' }}>{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ overflow:'hidden' }}>
      <div className="skeleton" style={{ height:180 }} />
      <div style={{ padding:'14px 14px 16px' }}>
        <div className="skeleton" style={{ height:12, width:'80%', marginBottom:8 }} />
        <div className="skeleton" style={{ height:12, width:'50%' }} />
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────

export default function Marketplace() {
  const { profile } = useAuth()
  const campusColor = profile?.campus_color || '#a78bfa'
  const [listings, setListings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showPost, setShowPost]       = useState(false)
  const [selected, setSelected]       = useState(null)
  const [activeCategory, setCategory] = useState('all')
  const [search, setSearch]           = useState('')
  const [showSold, setShowSold]       = useState(false)
  const filterRef = useRef(null)

  useEffect(() => { if (profile?.domain) fetchListings() }, [profile?.domain])

  async function fetchListings() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('domain', profile.domain)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!rows?.length) { setListings([]); setLoading(false); return }

    const userIds = [...new Set(rows.map(r => r.user_id))]
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, major')
      .in('id', userIds)

    const profileMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]))
    setListings(rows.map(r => ({ ...r, seller: profileMap[r.user_id] })))
    setLoading(false)
  }

  async function handleMarkSold(id) {
    await supabase.from('marketplace_listings').update({ status: 'sold' }).eq('id', id)
    setSelected(null)
    fetchListings()
  }

  async function handleDelete(id) {
    await supabase.from('marketplace_listings').delete().eq('id', id)
    setSelected(null)
    fetchListings()
  }

  const filtered = listings.filter(l => {
    if (!showSold && l.status === 'sold') return false
    if (activeCategory !== 'all' && l.category !== activeCategory) return false
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCounts = {}
  listings.filter(l => l.status === 'active').forEach(l => {
    activeCounts[l.category] = (activeCounts[l.category] || 0) + 1
  })

  return (
    <Layout>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px' }}>

        {/* Header */}
        <div className="fade-up" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:30 }}>🛍️</span>
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, lineHeight:1.2 }}>
                <span className="gradient-text">{profile?.campus_short}</span> Marketplace
              </h1>
              <p style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>
                Buy &amp; sell with your campus community · DM to arrange
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPost(true)}
            style={{
              padding:'10px 18px', borderRadius:12, border:'none',
              background:`linear-gradient(135deg, ${campusColor}, ${campusColor}bb)`,
              color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13,
              cursor:'pointer', whiteSpace:'nowrap',
              boxShadow:`0 4px 16px ${campusColor}40`,
            }}
          >
            + List Item
          </button>
        </div>

        {/* Search */}
        <div className="fade-up" style={{ marginBottom:16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search listings..."
            style={{ fontSize:13, padding:'11px 16px' }}
          />
        </div>

        {/* Category filter */}
        <div
          ref={filterRef}
          className="fade-up no-scrollbar"
          style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:20, paddingBottom:4 }}
        >
          {CATEGORIES.map(c => {
            const count = c.key === 'all'
              ? listings.filter(l => l.status === 'active').length
              : activeCounts[c.key] || 0
            const active = activeCategory === c.key
            return (
              <button key={c.key} onClick={() => setCategory(c.key)} style={{
                padding:'7px 14px', borderRadius:20, border:`1px solid ${active ? campusColor + '55' : 'rgba(255,255,255,0.09)'}`,
                background: active ? `${campusColor}15` : 'rgba(255,255,255,0.04)',
                color: active ? campusColor : 'var(--text-3)',
                fontFamily:'var(--font-display)', fontWeight: active ? 700 : 400, fontSize:12,
                cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', flexShrink:0,
              }}>
                {c.emoji} {c.label} {count > 0 && <span style={{ opacity:0.7 }}>({count})</span>}
              </button>
            )
          })}
          <button onClick={() => setShowSold(s => !s)} style={{
            padding:'7px 14px', borderRadius:20,
            border:`1px solid ${showSold ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.09)'}`,
            background: showSold ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
            color: showSold ? '#ef4444' : 'var(--text-3)',
            fontFamily:'var(--font-display)', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
            transition:'all 0.15s', flexShrink:0,
          }}>
            {showSold ? '✓ ' : ''}Show Sold
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
            {Array.from({length:6}).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="fade-up" style={{ textAlign:'center', padding:'64px 0', color:'var(--text-3)' }}>
            <div style={{ fontSize:44, marginBottom:16 }}>🛍️</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'var(--text)', marginBottom:8 }}>
              {search || activeCategory !== 'all' ? 'No listings match your filter' : 'No listings yet'}
            </div>
            <div style={{ fontSize:13 }}>
              {search || activeCategory !== 'all' ? 'Try a different category or search term' : `Be the first to list something at ${profile?.campus_short}!`}
            </div>
            {!search && activeCategory === 'all' && (
              <button onClick={() => setShowPost(true)} style={{
                marginTop:20, padding:'10px 24px', borderRadius:12, border:`1px solid ${campusColor}44`,
                background:`${campusColor}15`, color:campusColor,
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, cursor:'pointer',
              }}>
                + List an Item
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
            {filtered.map((listing, i) => (
              <div key={listing.id} className="fade-up" style={{ animationDelay:`${i*0.03}s` }}>
                <ListingCard listing={listing} onClick={() => setSelected(listing)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPost && (
        <PostListingModal
          campusColor={campusColor}
          onClose={() => setShowPost(false)}
          onPosted={fetchListings}
        />
      )}
      {selected && (
        <ListingDetailModal
          listing={selected}
          isOwn={selected.user_id === profile?.id}
          campusColor={campusColor}
          onClose={() => setSelected(null)}
          onMarkSold={() => handleMarkSold(selected.id)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
    </Layout>
  )
}

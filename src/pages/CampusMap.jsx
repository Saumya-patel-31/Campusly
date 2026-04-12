import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CATEGORIES = [
  { key: 'event',    label: 'Campus Event',      emoji: '🎉', color: '#f59e0b', ttlHours: null },  // highest priority
  { key: 'study',    label: 'Study Room',        emoji: '📚', color: '#60a5fa', ttlHours: 4    },
  { key: 'food',     label: 'Free Food',         emoji: '🍕', color: '#34d399', ttlHours: 2    },
  { key: 'printer',  label: 'Broken Printer',    emoji: '🖨️',  color: '#ff6b8a', ttlHours: 24   },
  { key: 'vending',  label: 'Vending Machine',   emoji: '🥤', color: '#a78bfa', ttlHours: null },
  { key: 'charging', label: 'Charging Station',  emoji: '⚡', color: '#f59e0b', ttlHours: null },
  { key: 'water',    label: 'Water Fountain',    emoji: '💧', color: '#38bdf8', ttlHours: null },
  { key: 'coffee',   label: 'Coffee Spot',       emoji: '☕', color: '#d97706', ttlHours: 4    },
  { key: 'parking',  label: 'Open Parking',      emoji: '🅿️', color: '#6366f1', ttlHours: 2    },
]

function catFor(key) {
  return CATEGORIES.find(c => c.key === key) || { emoji: '📍', color: '#a78bfa', label: key }
}


/* ── "You are here" avatar pin ── */

function makeEventIcon(cat) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative; width:44px; height:44px;">
      <!-- pulsing ring -->
      <div style="
        position:absolute; inset:-6px;
        border-radius:50%;
        background:${cat.color}30;
        animation:campusly-pulse 1.8s ease-out infinite;
      "></div>
      <!-- pin body -->
      <div style="
        position:absolute; inset:0;
        background:${cat.color};
        border:2.5px solid #fff;
        border-radius:50% 50% 50% 4px;
        transform:rotate(-45deg);
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 3px 14px ${cat.color}88;
      ">
        <span style="transform:rotate(45deg); font-size:18px; line-height:1;">${cat.emoji}</span>
      </div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 40],
    popupAnchor: [0, -44],
  })
}

function makeIcon(cat) {
  if (cat.key === 'event') return makeEventIcon(cat)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px; height:36px;
      background:${cat.color}22;
      border:2.5px solid ${cat.color};
      border-radius:50% 50% 50% 4px;
      transform:rotate(-45deg);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 10px ${cat.color}55;
    ">
      <span style="transform:rotate(45deg); font-size:15px; line-height:1;">${cat.emoji}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
    popupAnchor: [0, -36],
  })
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function expiresIn(ts) {
  if (!ts) return 'Permanent'
  const diff = new Date(ts) - Date.now()
  if (diff <= 0) return 'Expired'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Expires in ${mins}m`
  return `Expires in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

/* ── Map click handler (must live inside MapContainer) ── */
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}

/* ── Flies to campus center when it resolves ── */
function CenterUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 17, { animate: true, duration: 1.2 })
  }, [center?.[0], center?.[1]])
  return null
}

/* ── Add Pin Modal ── */
function AddPinModal({ latlng, onClose, onAdded, campusColor }) {
  const { profile } = useAuth()
  const [category, setCategory] = useState('')
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [posting, setPosting]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!category) { setError('Pick a category.'); return }
    if (!title.trim()) { setError('Add a title.'); return }
    setPosting(true)

    const cat = catFor(category)
    const expires_at = cat.ttlHours
      ? new Date(Date.now() + cat.ttlHours * 3600000).toISOString()
      : null

    const { error: err } = await supabase.from('map_pins').insert({
      user_id: profile.id,
      domain: profile.domain,
      category,
      title: title.trim(),
      description: desc.trim() || null,
      lat: latlng.lat,
      lng: latlng.lng,
      expires_at,
    })
    if (err) { setError(err.message); setPosting(false); return }
    setPosting(false)
    onAdded()
    onClose()
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2000,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'rgba(12,12,26,0.97)',
        border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:18, width:'100%', maxWidth:440, padding:'26px 24px',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>Drop a Pin</h2>
            <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--text-3)' }}>
              {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
          {/* Category grid */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:8 }}>Category *</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'8px 11px', borderRadius:10, cursor:'pointer', textAlign:'left',
                  background: category === c.key ? `${c.color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${category === c.key ? c.color + '60' : 'rgba(255,255,255,0.09)'}`,
                  color: category === c.key ? c.color : 'var(--text-2)',
                  fontWeight: category === c.key ? 600 : 400, fontSize:12,
                  transition:'all 0.12s',
                }}>
                  <span style={{ fontSize:16 }}>{c.emoji}</span>
                  <span>{c.label}</span>
                  {c.ttlHours && <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:'auto' }}>{c.ttlHours}h</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={
                category === 'study'    ? 'e.g. Room 204 — quiet, 3 seats open' :
                category === 'food'     ? 'e.g. Free pizza in Student Union lobby' :
                category === 'printer'  ? 'e.g. 3rd floor printer out of paper' :
                category === 'charging' ? 'e.g. Power strip by window seats' :
                'Describe this spot...'
              }
              maxLength={80}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:9, padding:'9px 12px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>
              Note <span style={{ color:'var(--text-3)', fontWeight:400 }}>(optional)</span>
            </label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Any extra details…"
              maxLength={200} rows={2}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', borderRadius:9, padding:'9px 12px', color:'var(--text)', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {category && (
            <div style={{ fontSize:11, color:'var(--text-3)', background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'6px 10px' }}>
              {catFor(category).ttlHours
                ? `⏱ Auto-removes after ${catFor(category).ttlHours} hour${catFor(category).ttlHours > 1 ? 's' : ''}`
                : '📌 Permanent pin — remove manually when no longer valid'}
            </div>
          )}

          {error && <div style={{ fontSize:12, color:'#ff6b8a', background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.25)', borderRadius:8, padding:'7px 11px' }}>{error}</div>}

          <button type="submit" disabled={posting || !category || !title.trim()} style={{
            background: category ? catFor(category).color : campusColor,
            border:'none', borderRadius:10, color:'#fff',
            fontWeight:700, fontSize:14, padding:'11px',
            cursor: posting || !category || !title.trim() ? 'not-allowed' : 'pointer',
            opacity: posting || !category || !title.trim() ? 0.5 : 1,
          }}>
            {posting ? 'Pinning…' : 'Drop Pin'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Popup content for a pin ── */
function PinPopup({ pin, myId, myConfirms, campusColor, onConfirmToggle, onDelete }) {
  const cat = catFor(pin.category)
  const hasConfirmed = myConfirms.has(pin.id)
  const isOwner = pin.user_id === myId
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    await onConfirmToggle(pin.id, hasConfirmed)
    setConfirming(false)
  }

  return (
    <div style={{ minWidth:210, fontFamily:'var(--font-body, sans-serif)' }}>
      {/* Category badge */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{
          background:`${cat.color}20`, border:`1px solid ${cat.color}40`,
          borderRadius:999, padding:'2px 9px', fontSize:11, fontWeight:600, color:cat.color,
          display:'inline-flex', alignItems:'center', gap:4,
        }}>
          {cat.emoji} {cat.label}
        </span>
        {isOwner && (
          <button onClick={() => onDelete(pin.id)} title="Remove pin" style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:'#aaa', fontSize:15, lineHeight:1, padding:0,
          }}>×</button>
        )}
      </div>

      <div style={{ fontWeight:700, fontSize:13, marginBottom:3, color:'#111' }}>{pin.title}</div>
      {pin.description && <div style={{ fontSize:12, color:'#555', marginBottom:6, lineHeight:1.45 }}>{pin.description}</div>}

      <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>
        {timeAgo(pin.created_at)} · {expiresIn(pin.expires_at)}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={handleConfirm} disabled={confirming} style={{
          flex:1, padding:'6px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
          background: hasConfirmed ? '#dcfce7' : '#f3f4f6',
          border: `1px solid ${hasConfirmed ? '#86efac' : '#e5e7eb'}`,
          color: hasConfirmed ? '#16a34a' : '#374151',
          transition:'all 0.15s',
        }}>
          {confirming ? '…' : hasConfirmed ? '✓ Confirmed' : '👍 Still here!'}
        </button>
        <span style={{ fontSize:12, color:'#888', whiteSpace:'nowrap' }}>
          {pin.confirms_count} confirmed
        </span>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function CampusMap() {
  const { profile } = useAuth()
  const campusColor = profile?.campus_color || '#a78bfa'
  const domain      = profile?.domain || ''

  const [pins, setPins]             = useState([])
  const [myConfirms, setMyConf]     = useState(new Set())
  const [catFilter, setCatFilter]   = useState('')
  const [pendingLatLng, setPending] = useState(null)
  const [campusCenter, setCampusCenter] = useState(null)
  const [locating, setLocating]     = useState(true)
  const mapRef    = useRef(null)

  // Geocode university → campus center
  useEffect(() => {
    async function locateCampus() {
      const query = profile?.campus_short || profile?.domain?.replace('.edu', '') || ''
      if (!query) { setLocating(false); return }
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' university')}&format=json&limit=1`,
          { headers: { 'User-Agent': 'Campusly/1.0' } }
        )
        const data = await res.json()
        if (data?.[0]) setCampusCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)])
      } catch {}
      setLocating(false)
    }
    locateCampus()
  }, [profile?.campus_short, profile?.domain])


  async function loadPins() {
    await supabase.rpc('cleanup_expired_pins')
    const { data } = await supabase
      .from('map_pins')
      .select('*')
      .eq('domain', domain)
    setPins(data || [])
  }

  async function loadMyConfirms() {
    if (!profile?.id) return
    const { data } = await supabase
      .from('map_pin_confirms')
      .select('pin_id')
      .eq('user_id', profile.id)
    setMyConf(new Set((data || []).map(r => r.pin_id)))
  }

  useEffect(() => {
    loadPins()
    loadMyConfirms()
  }, [domain, profile?.id])

  // Realtime — live pin updates
  useEffect(() => {
    const channel = supabase
      .channel('map_pins_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_pins', filter: `domain=eq.${domain}` }, () => loadPins())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [domain])

  async function handleConfirmToggle(pinId, hasConfirmed) {
    if (hasConfirmed) {
      await supabase.from('map_pin_confirms').delete().eq('pin_id', pinId).eq('user_id', profile.id)
      setMyConf(prev => { const n = new Set(prev); n.delete(pinId); return n })
      setPins(prev => prev.map(p => p.id === pinId ? { ...p, confirms_count: Math.max(p.confirms_count - 1, 0) } : p))
    } else {
      await supabase.from('map_pin_confirms').insert({ pin_id: pinId, user_id: profile.id })
      setMyConf(prev => new Set([...prev, pinId]))
      setPins(prev => prev.map(p => p.id === pinId ? { ...p, confirms_count: p.confirms_count + 1 } : p))
    }
  }

  async function handleDeletePin(pinId) {
    await supabase.from('map_pins').delete().eq('id', pinId)
    setPins(prev => prev.filter(p => p.id !== pinId))
  }

  const visiblePins = catFilter ? pins.filter(p => p.category === catFilter) : pins

  return (
    <Layout>
      <style>{`
        @keyframes campusly-pulse {
          0%   { transform: scale(1);   opacity: 0.4; }
          70%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Let the user marker overflow its Leaflet container so badge/arrow show */
        .campusly-user-marker { overflow: visible !important; background: transparent !important; border: none !important; }
        .leaflet-marker-icon.campusly-user-marker { overflow: visible !important; }
      `}</style>
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 0px)', position:'relative' }}>

        {/* ── Top bar ── */}
        <div style={{
          padding:'14px 20px 12px',
          background:'rgba(7,7,16,0.85)',
          backdropFilter:'blur(20px)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          zIndex:500, position:'relative',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, letterSpacing:'-0.02em' }}>
                Campus Map 🗺️
              </h1>
              <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--text-3)' }}>
                Click anywhere on the map to drop a pin · {pins.length} active resource{pins.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {locating && <div style={{ fontSize:11, color:'var(--text-3)' }}>🔍 Locating campus…</div>}
            </div>
          </div>

          {/* Category filter chips */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
            <button onClick={() => setCatFilter('')} style={{
              padding:'4px 12px', borderRadius:999, fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
              background: !catFilter ? `${campusColor}20` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${!catFilter ? campusColor + '50' : 'rgba(255,255,255,0.10)'}`,
              color: !catFilter ? campusColor : 'var(--text-2)',
              fontWeight: !catFilter ? 600 : 400,
            }}>All ({pins.length})</button>
            {CATEGORIES.map(c => {
              const count = pins.filter(p => p.category === c.key).length
              if (count === 0 && catFilter !== c.key) return null
              return (
                <button key={c.key} onClick={() => setCatFilter(catFilter === c.key ? '' : c.key)} style={{
                  padding:'4px 12px', borderRadius:999, fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                  background: catFilter === c.key ? `${c.color}20` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${catFilter === c.key ? c.color + '50' : 'rgba(255,255,255,0.10)'}`,
                  color: catFilter === c.key ? c.color : 'var(--text-2)',
                  fontWeight: catFilter === c.key ? 600 : 400,
                }}>
                  {c.emoji} {c.label} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ flex:1, position:'relative', zIndex:10 }}>
          <MapContainer
            center={campusCenter || [39.0, -76.9]}
            zoom={17}
            style={{ width:'100%', height:'100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ClickHandler onMapClick={latlng => {
              setPending(latlng)
            }} />
            <CenterUpdater center={campusCenter} />

            {visiblePins.map(pin => {
              const cat = catFor(pin.category)
              return (
                <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={makeIcon(cat)}>
                  <Popup minWidth={220}>
                    <PinPopup
                      pin={pin}
                      myId={profile?.id}
                      myConfirms={myConfirms}
                      campusColor={campusColor}
                      onConfirmToggle={handleConfirmToggle}
                      onDelete={handleDeletePin}
                    />
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Instruction overlay when no pins */}
          {pins.length === 0 && !locating && (
            <div style={{
              position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
              background:'rgba(7,7,16,0.88)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:12, padding:'12px 20px', zIndex:1000,
              fontSize:13, color:'var(--text-2)', textAlign:'center',
              backdropFilter:'blur(12px)', whiteSpace:'nowrap',
              boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
            }}>
              👆 Click anywhere on the map to drop the first pin for {profile?.campus_short || 'your campus'}!
            </div>
          )}
        </div>
      </div>

      {/* ── Add pin modal ── */}
      {pendingLatLng && (
        <AddPinModal
          latlng={pendingLatLng}
          onClose={() => setPending(null)}
          onAdded={loadPins}
          campusColor={campusColor}
        />
      )}
    </Layout>
  )
}

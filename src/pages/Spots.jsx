import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

// Fix Leaflet's broken default icon paths when bundled
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

const VIBES = [
  { key: 'event',  label: 'Event',  emoji: '🎉' },   // ← highest priority
  { key: 'study',  label: 'Study',  emoji: '📚' },
  { key: 'chill',  label: 'Chill',  emoji: '😎' },
  { key: 'coffee', label: 'Coffee', emoji: '☕' },
  { key: 'food',   label: 'Food',   emoji: '🍕' },
  { key: 'walk',   label: 'Walk',   emoji: '🚶' },
  { key: 'gym',    label: 'Gym',    emoji: '💪' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
  { key: 'other',  label: 'Other',  emoji: '✨' },
]

function toLocalDateTimeInput(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function vibeFor(key) {
  return VIBES.find(v => v.key === key) || { emoji: '📍', label: key }
}

function formatMeetTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const todayStr = now.toDateString()
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString()
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === todayStr)     return `Today at ${timeStr}`
  if (d.toDateString() === tomorrowStr)  return `Tomorrow at ${timeStr}`
  return d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }) + ` at ${timeStr}`
}

function isExpired(meet_at) {
  // expire 1 hour after meet_at
  return new Date(meet_at).getTime() + 3600000 < Date.now()
}

function timeUntil(meet_at) {
  const diff = new Date(meet_at).getTime() - Date.now()
  if (diff <= 0) return 'Now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`
  return `in ${Math.floor(hrs / 24)}d`
}

/* ── Date Time Picker ──────────────────────────────────────────────── */
const DAY_LABELS   = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseDTLocal(str) {
  if (!str) return null
  const [datePart, timePart] = str.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi]    = timePart.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

const spinBtn = {
  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.10)',
  borderRadius:8, color:'var(--text-2)', width:34, height:26,
  cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center',
  transition:'background 0.1s',
}

function TimeBox({ label, campusColor }) {
  return {
    minWidth:52, height:48,
    display:'flex', alignItems:'center', justifyContent:'center',
    background:`${campusColor}12`, border:`1.5px solid ${campusColor}35`,
    borderRadius:10, fontWeight:800, fontSize:22,
    fontFamily:'var(--font-display)', color:'var(--text)',
    letterSpacing:'-0.02em', userSelect:'none',
  }
}

function DateTimePicker({ value, onChange, min, campusColor }) {
  const [open, setOpen] = useState(false)
  const now             = new Date()
  const selected        = parseDTLocal(value)
  const minDate         = parseDTLocal(min) || now

  const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? now.getMonth())
  const [hour24,    setHour24]    = useState(selected?.getHours()     ?? Math.min(now.getHours() + 1, 23))
  const [minute,    setMinute]    = useState(selected ? Math.floor((selected.getMinutes()) / 15) * 15 : 0)

  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const ampm   = hour24 >= 12 ? 'PM' : 'AM'
  const p2     = n => String(n).padStart(2, '0')

  // Calendar grid
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevDays    = new Date(viewYear, viewMonth, 0).getDate()
  const cells = []
  for (let i = firstDow - 1; i >= 0; i--)   cells.push({ n: prevDays - i, cur: false })
  for (let i = 1; i <= daysInMonth; i++)     cells.push({ n: i, cur: true })
  while (cells.length < 42)                  cells.push({ n: cells.length - firstDow - daysInMonth + 1, cur: false })

  function emit(yr, mo, d, h, mi) {
    const pad = n => String(n).padStart(2,'0')
    onChange(`${yr}-${pad(mo+1)}-${pad(d)}T${pad(h)}:${pad(mi)}`)
  }

  function handleDayClick(cell) {
    if (!cell.cur) return
    const date = new Date(viewYear, viewMonth, cell.n, hour24, minute)
    if (date < minDate) return
    emit(viewYear, viewMonth, cell.n, hour24, minute)
  }

  function shiftHour(delta) {
    const newH = (hour24 + delta + 24) % 24
    setHour24(newH)
    if (selected) emit(selected.getFullYear(), selected.getMonth(), selected.getDate(), newH, minute)
  }

  function shiftMinute(delta) {
    const steps = [0, 15, 30, 45]
    const idx   = steps.indexOf(minute)
    const newM  = steps[(idx + delta + steps.length) % steps.length]
    setMinute(newM)
    if (selected) emit(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour24, newM)
  }

  function toggleAmPm() {
    const newH = hour24 >= 12 ? hour24 - 12 : hour24 + 12
    setHour24(newH)
    if (selected) emit(selected.getFullYear(), selected.getMonth(), selected.getDate(), newH, minute)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const displayStr = selected
    ? selected.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }) +
      '  ·  ' + selected.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })
    : 'Select date & time'

  function isCellDisabled(cell) {
    if (!cell.cur) return true
    return new Date(viewYear, viewMonth, cell.n, 23, 59) < minDate
  }
  function isCellSelected(cell) {
    return cell.cur && selected &&
      cell.n === selected.getDate() &&
      viewMonth === selected.getMonth() &&
      viewYear  === selected.getFullYear()
  }
  function isCellToday(cell) {
    return cell.cur && cell.n === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
  }

  return (
    <div>
      {/* ── Trigger ── */}
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width:'100%', textAlign:'left', cursor:'pointer',
        background:'rgba(255,255,255,0.06)',
        border:`1.5px solid ${open ? campusColor + '70' : 'rgba(255,255,255,0.12)'}`,
        borderRadius:10, padding:'10px 14px',
        color: selected ? 'var(--text)' : 'var(--text-3)',
        fontSize:13, display:'flex', alignItems:'center', gap:9,
        boxShadow: open ? `0 0 0 3px ${campusColor}18` : 'none',
        transition:'all 0.15s',
      }}>
        <span style={{ fontSize:16 }}>📅</span>
        <span style={{ flex:1, fontWeight: selected ? 500 : 400 }}>{displayStr}</span>
        <span style={{ fontSize:9, color:'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
      </button>

      {/* ── Inline panel — no floating, lives in the form flow ── */}
      {open && (
        <div style={{
          marginTop:8,
          background:'rgba(8,8,20,0.96)',
          border:`1.5px solid ${campusColor}40`,
          borderRadius:16, padding:'16px 14px',
          boxShadow:`0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${campusColor}15`,
        }}>

          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <button type="button" onClick={prevMonth} style={{ ...spinBtn, width:30, height:30, fontSize:15, borderRadius:9 }}>‹</button>
            <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:14, color:'var(--text)', letterSpacing:'-0.01em' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={{ ...spinBtn, width:30, height:30, fontSize:15, borderRadius:9 }}>›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:5 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.04em', padding:'2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {cells.map((cell, i) => {
              const disabled = isCellDisabled(cell)
              const sel      = isCellSelected(cell)
              const today    = isCellToday(cell)
              return (
                <button key={i} type="button"
                  onClick={() => !disabled && handleDayClick(cell)}
                  style={{
                    aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:8, border:'none', fontSize:12, cursor: disabled ? 'default' : 'pointer',
                    background: sel ? campusColor : today ? `${campusColor}20` : 'transparent',
                    color: sel ? '#fff' : disabled ? 'rgba(255,255,255,0.15)' : !cell.cur ? 'rgba(255,255,255,0.22)' : 'var(--text)',
                    fontWeight: sel || today ? 700 : 400,
                    boxShadow: sel ? `0 2px 10px ${campusColor}55` : today ? `inset 0 0 0 1px ${campusColor}55` : 'none',
                    transition:'all 0.1s',
                  }}
                >{cell.n}</button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ height:1, background:`${campusColor}20`, margin:'14px 0' }} />

          {/* Time picker */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>

            {/* Hour */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <button type="button" onClick={() => shiftHour(1)}  style={spinBtn}>▲</button>
              <div style={TimeBox({ campusColor })}>{p2(hour12)}</div>
              <button type="button" onClick={() => shiftHour(-1)} style={spinBtn}>▼</button>
            </div>

            <span style={{ fontWeight:800, fontSize:22, color:`${campusColor}80`, marginBottom:2, userSelect:'none' }}>:</span>

            {/* Minute */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <button type="button" onClick={() => shiftMinute(1)}  style={spinBtn}>▲</button>
              <div style={TimeBox({ campusColor })}>{p2(minute)}</div>
              <button type="button" onClick={() => shiftMinute(-1)} style={spinBtn}>▼</button>
            </div>

            {/* AM / PM */}
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginLeft:6 }}>
              {['AM','PM'].map(ap => (
                <button key={ap} type="button" onClick={() => ampm !== ap && toggleAmPm()} style={{
                  padding:'8px 14px', borderRadius:9, border:'none', cursor:'pointer',
                  fontSize:12, fontWeight:700, letterSpacing:'0.04em',
                  background: ampm === ap ? `${campusColor}25` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${ampm === ap ? campusColor + '55' : 'rgba(255,255,255,0.09)'}`,
                  color: ampm === ap ? campusColor : 'var(--text-3)',
                  boxShadow: ampm === ap ? `0 2px 8px ${campusColor}30` : 'none',
                  transition:'all 0.12s',
                }}>{ap}</button>
              ))}
            </div>
          </div>

          {/* Done */}
          <button type="button" onClick={() => setOpen(false)} style={{
            width:'100%', marginTop:14, padding:'10px',
            background: campusColor, border:'none', borderRadius:10,
            color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
            boxShadow:`0 4px 14px ${campusColor}45`,
            letterSpacing:'0.02em',
          }}>
            Done ✓
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Fetch campus center coords (used to center the map picker) ─────── */
async function fetchCampusCenter(campusShort, domain) {
  const q = campusShort
    ? `${campusShort} university`
    : (domain || '').replace(/\.edu$/, '') + ' university'
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Campusly/1.0' } }
    )
    const data = await res.json()
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {}
  return null
}

/* ── Gold event pin icon for the map picker ─────────────────────────── */
function makePickerIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px; height:32px;
      background:#f59e0b;
      border:3px solid #fff;
      border-radius:50% 50% 50% 4px;
      transform:rotate(-45deg);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 3px 12px rgba(245,158,11,0.7);
    ">
      <span style="transform:rotate(45deg); font-size:14px; line-height:1;">🎉</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -32],
  })
}

/* ── Listens for clicks inside the map and fires onPick ─────────────── */
function PinPickerClickHandler({ onPick }) {
  useMapEvents({ click: e => onPick(e.latlng) })
  return null
}

/* ── Mini-map shown inside CreateSpotModal when vibe === 'event' ─────── */
function EventPinMap({ center, pin, onPick }) {
  const icon = makePickerIcon()
  return (
    <div style={{ height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(245,158,11,0.35)', position: 'relative' }}>
      <MapContainer
        center={center || [39.0, -76.9]}
        zoom={center ? 17 : 4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PinPickerClickHandler onPick={onPick} />
        {pin && <Marker position={[pin.lat, pin.lng]} icon={icon} />}
      </MapContainer>
      {/* Overlay hint */}
      {!pin && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '5px 12px', zIndex: 1000,
          fontSize: 11, color: '#fff', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          👆 Tap the exact building to drop the pin
        </div>
      )}
      {pin && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,158,11,0.85)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '5px 12px', zIndex: 1000,
          fontSize: 11, color: '#1c1005', fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          📍 {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} — tap to move
        </div>
      )}
    </div>
  )
}

/* ── Create Spot Modal ─────────────────────────────────────────────── */
function CreateSpotModal({ onClose, onCreated, domain, campusColor }) {
  const { profile } = useAuth()
  const [location, setLocation]   = useState('')
  const [description, setDesc]    = useState('')
  const [vibe, setVibe]           = useState('')
  const [meetAt, setMeetAt]       = useState(() => toLocalDateTimeInput(new Date(Date.now() + 30 * 60000)))
  const [posting, setPosting]     = useState(false)
  const [error, setError]         = useState('')
  // Event-specific: pin picked on mini-map, campus center for map init
  const [eventPin, setEventPin]   = useState(null)
  const [campusCenter, setCampusCenter] = useState(null)

  // Fetch campus center once when user switches to Event vibe
  useEffect(() => {
    if (vibe !== 'event' || campusCenter) return
    fetchCampusCenter(profile?.campus_short, profile?.domain)
      .then(c => c && setCampusCenter(c))
  }, [vibe])

  // Reset the event pin when vibe changes away from event
  useEffect(() => {
    if (vibe !== 'event') setEventPin(null)
  }, [vibe])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!location.trim()) { setError('Please enter a location.'); return }
    const meetDate = new Date(meetAt)
    if (isNaN(meetDate) || meetDate.getTime() < Date.now() - 60000) { setError('Pick a time in the future.'); return }
    // Events must have a pin placed on the map
    if (vibe === 'event' && !eventPin) {
      setError('Please tap the map above to drop a pin on the event location.')
      return
    }
    setPosting(true)
    setError('')

    const { data: spot, error: err } = await supabase.from('spots').insert({
      domain,
      user_id: profile.id,
      location: location.trim(),
      description: description.trim() || null,
      vibe: vibe || null,
      meet_at: meetDate.toISOString(),
      attendees_count: 0,
    }).select().single()

    if (err) { setError(err.message); setPosting(false); return }

    // Creator auto-joins
    await supabase.from('spot_attendees').insert({ spot_id: spot.id, user_id: profile.id })

    // Insert the map pin using the exact coordinates the user tapped
    if (vibe === 'event' && eventPin) {
      const pinExpiresAt = new Date(meetDate.getTime() + 2 * 3600000).toISOString()
      await supabase.from('map_pins').insert({
        user_id: profile.id,
        domain,
        category: 'event',
        title: location.trim(),
        description: description.trim() || null,
        lat: eventPin.lat,
        lng: eventPin.lng,
        expires_at: pinExpiresAt,
      })
    }

    setPosting(false)
    onCreated()
    onClose()
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...panel, width:'100%', maxWidth:480, padding:'28px 26px', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>Drop a Spot 📍</h2>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text-3)' }}>Let people know where you'll be</p>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Location */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>Location *</label>
            <input
              value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Library, 2nd floor — quiet section"
              maxLength={100}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Time */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>When *</label>
            <DateTimePicker
              value={meetAt}
              onChange={setMeetAt}
              min={toLocalDateTimeInput(new Date(Date.now() + 60000))}
              campusColor={campusColor}
            />
          </div>

          {/* Vibe */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:8 }}>Vibe</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {VIBES.map(v => (
                <button key={v.key} type="button" onClick={() => setVibe(vibe === v.key ? '' : v.key)}
                  style={{
                    padding:'5px 12px', borderRadius:999, fontSize:12, cursor:'pointer',
                    background: vibe === v.key ? `${campusColor}22` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${vibe === v.key ? campusColor + '55' : 'rgba(255,255,255,0.10)'}`,
                    color: vibe === v.key ? campusColor : 'var(--text-2)',
                    fontWeight: vibe === v.key ? 600 : 400,
                  }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event map pin picker — shown when Event vibe is selected */}
          {vibe === 'event' && (
            <div>
              <label style={{ fontSize:12, color:'#f59e0b', fontWeight:700, display:'block', marginBottom:6 }}>
                📍 Pin the event on Campus Map *
              </label>
              {campusCenter ? (
                <EventPinMap
                  center={campusCenter}
                  pin={eventPin}
                  onPick={latlng => setEventPin({ lat: latlng.lat, lng: latlng.lng })}
                />
              ) : (
                <div style={{
                  height: 220, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)',
                  color: 'var(--text-3)', fontSize: 13,
                }}>
                  🔍 Loading campus map…
                </div>
              )}
              {eventPin && (
                <div style={{ fontSize:11, color:'#f59e0b', marginTop:5 }}>
                  ✓ Pin placed — tap anywhere to move it
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, display:'block', marginBottom:5 }}>Note <span style={{ color:'var(--text-3)', fontWeight:400 }}>(optional)</span></label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              placeholder={vibe === 'event' ? 'e.g. Free admission, bring your student ID!' : 'e.g. Working on calc homework, happy to chat!'}
              maxLength={200} rows={2}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontSize:14, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {error && <div style={{ fontSize:12, color:'#ff6b8a', background:'rgba(255,107,138,0.10)', border:'1px solid rgba(255,107,138,0.25)', borderRadius:8, padding:'8px 12px' }}>{error}</div>}

          <button
            type="submit"
            disabled={posting || !location.trim() || (vibe === 'event' && !eventPin)}
            style={{
              background: vibe === 'event' ? '#f59e0b' : campusColor,
              border:'none', borderRadius:10, color:'#fff',
              fontWeight:700, fontSize:14, padding:'12px', cursor:'pointer',
              opacity: posting || !location.trim() || (vibe === 'event' && !eventPin) ? 0.5 : 1,
              marginTop:4,
              boxShadow: vibe === 'event' ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
            }}
          >
            {posting ? 'Posting…' : (vibe === 'event' ? '🎉 Post Event' : 'Drop Spot')}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Attendees Popover ─────────────────────────────────────────────── */
function AttendeesRow({ spotId, count, campusColor, myId, isAttending, onToggle, isOwner, expired }) {
  const [attendees, setAttendees]   = useState([])
  const [expanded, setExpanded]     = useState(false)
  const [joining, setJoining]       = useState(false)

  useEffect(() => {
    if (!expanded) return
    supabase
      .from('spot_attendees')
      .select('user_id')
      .eq('spot_id', spotId)
      .then(async ({ data: rows }) => {
        if (!rows || rows.length === 0) { setAttendees([]); return }
        const ids = rows.map(r => r.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, major')
          .in('id', ids)
        const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
        setAttendees(rows.map(r => ({ user_id: r.user_id, profiles: profileMap[r.user_id] || null })))
      })
  }, [expanded, spotId, count])

  async function handleToggle() {
    setJoining(true)
    await onToggle()
    setJoining(false)
    if (expanded) {
      const { data: rows } = await supabase.from('spot_attendees').select('user_id').eq('spot_id', spotId)
      if (rows && rows.length > 0) {
        const ids = rows.map(r => r.user_id)
        const { data: profilesData } = await supabase.from('profiles').select('id, display_name, username, avatar_url, major').in('id', ids)
        const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
        setAttendees(rows.map(r => ({ user_id: r.user_id, profiles: profileMap[r.user_id] || null })))
      } else {
        setAttendees([])
      }
    }
  }

  return (
    <div style={{ marginTop:12, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Going count — clickable */}
        <button onClick={() => setExpanded(x => !x)} style={{
          background:'transparent', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
          color:'var(--text-2)', fontSize:13, padding:0,
        }}>
          <span style={{ fontSize:15 }}>👥</span>
          <span style={{ fontWeight:600 }}>{count}</span>
          <span style={{ color:'var(--text-3)' }}>going</span>
          <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:2 }}>{expanded ? '▲' : '▼'}</span>
        </button>

        <div style={{ flex:1 }} />

        {/* Join / Leave */}
        {!expired && !isOwner && (
          <button onClick={handleToggle} disabled={joining} style={{
            padding:'6px 16px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer',
            background: isAttending ? 'rgba(255,107,138,0.12)' : `${campusColor}20`,
            border: `1px solid ${isAttending ? 'rgba(255,107,138,0.35)' : campusColor + '50'}`,
            color: isAttending ? '#ff6b8a' : campusColor,
            opacity: joining ? 0.6 : 1,
            transition: 'all 0.15s',
          }}>
            {joining ? '…' : isAttending ? 'Leave' : '+ Join'}
          </button>
        )}
        {isOwner && !expired && (
          <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>your spot</span>
        )}
        {expired && (
          <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>ended</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
          {attendees.length === 0 && <div style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>Nobody yet…</div>}
          {attendees.map(a => (
            <div key={a.user_id} style={{ display:'flex', alignItems:'center', gap:9 }}>
              <AvatarImg src={a.profiles?.avatar_url} name={a.profiles?.display_name} size={28} />
              <div>
                <span style={{ fontSize:13, fontWeight:600 }}>{a.profiles?.display_name}</span>
                {a.profiles?.major && <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:6 }}>{a.profiles.major}</span>}
              </div>
              {a.user_id === myId && <span style={{ fontSize:10, color:campusColor, marginLeft:'auto' }}>you</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Spot Card ─────────────────────────────────────────────────────── */
function SpotCard({ spot, myId, mySpots, campusColor, onToggleJoin, onDelete }) {
  const vibe    = vibeFor(spot.vibe)
  const expired = isExpired(spot.meet_at)
  const isOwner = spot.user_id === myId
  const isAttending = mySpots.has(spot.id)
  const until   = timeUntil(spot.meet_at)
  const isEvent = spot.vibe === 'event'
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Remove this spot?')) return
    setDeleting(true)
    await onDelete(spot.id)
  }

  return (
    <div style={{
      ...panel,
      padding: 0,
      opacity: deleting ? 0.4 : expired ? 0.5 : 1,
      transition:'opacity 0.2s',
      border: isEvent ? '1px solid rgba(245,158,11,0.40)' : panel.border,
      overflow: 'hidden',
    }}>
      {/* Gold top bar for events */}
      {isEvent && (
        <div style={{
          background:'linear-gradient(90deg, #f59e0b, #fbbf24)',
          padding:'5px 18px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#1c1005', letterSpacing:'0.06em' }}>
            🎉 CAMPUS EVENT · PINNED ON MAP
          </span>
          <span style={{ fontSize:10, color:'rgba(28,16,5,0.65)' }}>🗺️</span>
        </div>
      )}
      <div style={{ padding:'16px 18px' }}>
      {/* Header */}
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <AvatarImg src={spot.profiles?.avatar_url} name={spot.profiles?.display_name} size={38} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, fontFamily:'var(--font-display)' }}>
            {spot.profiles?.display_name}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>
            {spot.profiles?.major && <span>{spot.profiles.major} · </span>}
            @{spot.profiles?.username}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
          {/* Time until badge */}
          <div style={{
            background: expired ? 'rgba(255,255,255,0.06)' : `${campusColor}15`,
            border: `1px solid ${expired ? 'rgba(255,255,255,0.08)' : campusColor + '30'}`,
            borderRadius:999, padding:'3px 10px',
            fontSize:11, fontWeight:600,
            color: expired ? 'var(--text-3)' : campusColor,
            whiteSpace:'nowrap',
          }}>
            {expired ? 'Ended' : until}
          </div>
          {/* Delete button — owner only */}
          {isOwner && (
            <button onClick={handleDelete} disabled={deleting} title="Delete spot" style={{
              background:'transparent', border:'none', cursor:'pointer',
              color:'var(--text-3)', fontSize:16, lineHeight:1, padding:'2px 4px',
              transition:'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff6b8a'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >×</button>
          )}
        </div>
      </div>

      {/* Location */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
        <span style={{ fontSize:16 }}>📍</span>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{spot.location}</span>
      </div>

      {/* Time */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom: spot.description || spot.vibe ? 8 : 0 }}>
        <span style={{ fontSize:14 }}>🕐</span>
        <span style={{ fontSize:13, color:'var(--text-2)' }}>{formatMeetTime(spot.meet_at)}</span>
      </div>

      {/* Vibe chip */}
      {spot.vibe && (
        <div style={{ marginBottom: spot.description ? 8 : 0 }}>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:4,
            background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:999, padding:'2px 10px', fontSize:11, color:'var(--text-2)',
          }}>
            {vibe.emoji} {vibe.label}
          </span>
        </div>
      )}

      {/* Description */}
      {spot.description && (
        <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.55, margin:'0 0 4px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {spot.description}
        </p>
      )}

      {/* Attendees + join row */}
      <AttendeesRow
        spotId={spot.id}
        count={spot.attendees_count}
        campusColor={isEvent ? '#f59e0b' : campusColor}
        myId={myId}
        isAttending={isAttending}
        isOwner={isOwner}
        expired={expired}
        onToggle={() => onToggleJoin(spot.id, isAttending)}
      />
      </div>{/* end inner padding div */}
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function Spots() {
  const { profile } = useAuth()
  const campusColor = profile?.campus_color || '#a78bfa'
  const domain      = profile?.domain || ''

  const [spots, setSpots]         = useState([])
  const [mySpots, setMySpots]     = useState(new Set())   // set of spot IDs I joined
  const [vibeFilter, setVibe]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(true)

  async function loadSpots() {
    // delete expired spots server-side (SECURITY DEFINER bypasses RLS)
    await supabase.rpc('cleanup_expired_spots')

    const { data: spotsData } = await supabase
      .from('spots')
      .select('*')
      .eq('domain', domain)
      .order('meet_at', { ascending: true })

    const active = (spotsData || []).filter(s => !isExpired(s.meet_at))

    if (active.length === 0) { setSpots([]); setLoading(false); return }

    const userIds = [...new Set(active.map(s => s.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, major')
      .in('id', userIds)

    const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
    const withProfiles = active.map(s => ({ ...s, profiles: profileMap[s.user_id] || null }))
    // Events have highest priority — sort them first, then by meet_at ascending
    withProfiles.sort((a, b) => {
      if (a.vibe === 'event' && b.vibe !== 'event') return -1
      if (a.vibe !== 'event' && b.vibe === 'event') return 1
      return new Date(a.meet_at) - new Date(b.meet_at)
    })
    setSpots(withProfiles)
    setLoading(false)
  }

  async function loadMySpots() {
    if (!profile?.id) return
    const { data } = await supabase
      .from('spot_attendees')
      .select('spot_id')
      .eq('user_id', profile.id)
    setMySpots(new Set((data || []).map(r => r.spot_id)))
  }

  useEffect(() => {
    loadSpots()
    loadMySpots()
    // refresh every 60s so "time until" badges stay fresh
    const t = setInterval(loadSpots, 60000)
    return () => clearInterval(t)
  }, [domain, profile?.id])

  async function handleDeleteSpot(spotId) {
    await supabase.from('spots').delete().eq('id', spotId)
    setSpots(prev => prev.filter(s => s.id !== spotId))
    setMySpots(prev => { const n = new Set(prev); n.delete(spotId); return n })
  }

  async function handleToggleJoin(spotId, isAttending) {
    if (isAttending) {
      await supabase.from('spot_attendees').delete().eq('spot_id', spotId).eq('user_id', profile.id)
      setMySpots(prev => { const n = new Set(prev); n.delete(spotId); return n })
      setSpots(prev => prev.map(s => s.id === spotId ? { ...s, attendees_count: Math.max(s.attendees_count - 1, 0) } : s))
    } else {
      await supabase.from('spot_attendees').insert({ spot_id: spotId, user_id: profile.id })
      setMySpots(prev => new Set([...prev, spotId]))
      setSpots(prev => prev.map(s => s.id === spotId ? { ...s, attendees_count: s.attendees_count + 1 } : s))
    }
  }

  const myOwnSpots    = spots.filter(s => s.user_id === profile?.id)
  const othersSpots   = spots.filter(s => s.user_id !== profile?.id)
  const filteredOthers = vibeFilter
    ? othersSpots.filter(s => s.vibe === vibeFilter)
    : othersSpots

  return (
    <Layout>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em' }}>
              Spots 📍
            </h1>
            <p style={{ margin:'5px 0 0', fontSize:13, color:'var(--text-3)' }}>
              See where your campus is hanging out — and join them.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            background: campusColor, border:'none', borderRadius:12,
            color:'#fff', fontWeight:700, fontSize:13, padding:'10px 18px',
            cursor:'pointer', flexShrink:0, marginLeft:12,
          }}>
            + Drop a Spot
          </button>
        </div>

        {/* ── Vibe filter chips ── */}
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:24 }}>
          <button onClick={() => setVibe('')} style={{
            padding:'5px 13px', borderRadius:999, fontSize:12, cursor:'pointer',
            background: !vibeFilter ? `${campusColor}20` : 'rgba(255,255,255,0.06)',
            border: `1px solid ${!vibeFilter ? campusColor + '50' : 'rgba(255,255,255,0.10)'}`,
            color: !vibeFilter ? campusColor : 'var(--text-2)',
            fontWeight: !vibeFilter ? 600 : 400,
          }}>All</button>
          {VIBES.map(v => {
            const activeColor = v.key === 'event' ? '#f59e0b' : campusColor
            return (
              <button key={v.key} onClick={() => setVibe(vibeFilter === v.key ? '' : v.key)} style={{
                padding:'5px 13px', borderRadius:999, fontSize:12, cursor:'pointer',
                background: vibeFilter === v.key ? `${activeColor}20` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${vibeFilter === v.key ? activeColor + '50' : 'rgba(255,255,255,0.10)'}`,
                color: vibeFilter === v.key ? activeColor : 'var(--text-2)',
                fontWeight: vibeFilter === v.key ? 600 : 400,
                ...(v.key === 'event' && { fontWeight: 600 }),
              }}>{v.emoji} {v.label}</button>
            )
          })}
        </div>

        {/* ── Your active spots ── */}
        {myOwnSpots.length > 0 && (
          <section style={{ marginBottom:30 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:12 }}>Your Spots</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {myOwnSpots.map(s => (
                <SpotCard key={s.id} spot={s} myId={profile?.id} mySpots={mySpots} campusColor={campusColor} onToggleJoin={handleToggleJoin} onDelete={handleDeleteSpot} />
              ))}
            </div>
          </section>
        )}

        {/* ── Others' spots ── */}
        <section>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:12 }}>
            {vibeFilter ? `${vibeFor(vibeFilter).emoji} ${vibeFor(vibeFilter).label} spots` : 'Active Spots'}
          </div>

          {loading && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>Loading spots…</div>
          )}

          {!loading && filteredOthers.length === 0 && (
            <div style={{ ...panel, padding:'40px 24px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🌟</div>
              <div style={{ fontWeight:600, fontFamily:'var(--font-display)', marginBottom:6 }}>
                {vibeFilter ? `No ${vibeFor(vibeFilter).label.toLowerCase()} spots right now` : 'No spots yet'}
              </div>
              <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:18 }}>
                Be the first to drop a spot and see who joins you!
              </div>
              <button onClick={() => setShowModal(true)} style={{
                background:`${campusColor}20`, border:`1px solid ${campusColor}40`,
                borderRadius:10, color:campusColor, fontWeight:600, fontSize:13,
                padding:'10px 20px', cursor:'pointer',
              }}>
                Drop a Spot
              </button>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filteredOthers.map(s => (
              <SpotCard key={s.id} spot={s} myId={profile?.id} mySpots={mySpots} campusColor={campusColor} onToggleJoin={handleToggleJoin} onDelete={handleDeleteSpot} />
            ))}
          </div>
        </section>

      </div>

      {showModal && (
        <CreateSpotModal
          onClose={() => setShowModal(false)}
          onCreated={() => { loadSpots(); loadMySpots() }}
          domain={domain}
          campusColor={campusColor}
        />
      )}
    </Layout>
  )
}

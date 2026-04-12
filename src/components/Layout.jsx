import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

let _sidebarScrollTop = 0
import { useAuth } from '../context/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useIsMobile } from '../hooks/useIsMobile.js'
import BubbleMenu from './BubbleMenu/BubbleMenu.jsx'
import { BackgroundPaths } from './ui/background-paths.jsx'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuth()
  const { unreadCount } = useNotifications(profile?.id)
  const { isDark, toggle: toggleTheme } = useTheme()
  const isMobile = useIsMobile()
  const sidebarRef = useRef(null)

  // Restore sidebar scroll position on mount, preserve it on scroll
  useEffect(() => {
    const el = sidebarRef.current
    if (el) el.scrollTop = _sidebarScrollTop
  }, [])

  /* ── Campus color injection ── */
  useEffect(() => {
    if (profile?.campus_color) {
      document.documentElement.style.setProperty('--campus', profile.campus_color)
      document.documentElement.style.setProperty('--campus-dim', `${profile.campus_color}18`)
      document.documentElement.style.setProperty('--campus-border', `${profile.campus_color}35`)
    }
    return () => {
      document.documentElement.style.setProperty('--campus', '#a78bfa')
      document.documentElement.style.setProperty('--campus-dim', 'rgba(167,139,250,0.12)')
      document.documentElement.style.setProperty('--campus-border', 'rgba(167,139,250,0.25)')
    }
  }, [profile?.campus_color])


  const nav = [
    { path:'/',         label:'Feed',     icon: <HomeIco /> },
    { path:'/explore',  label:'Explore',  icon: <SearchIco /> },
    { path:'/threads',  label:'Threads',  icon: <ThreadsIco /> },
    { path:'/groups',   label:'Groups',   icon: <GroupsIco /> },
    { path:'/spots',    label:'Spots',    icon: <SpotsIco /> },
    { path:'/map',          label:'Map',         icon: <MapIco /> },
    { path:'/study-buddy',  label:'Study Buddy', icon: <StudyIco /> },
    { path:'/lost-found',   label:'Lost & Found',icon: <LostIco /> },
    { path:'/marketplace',  label:'Marketplace',  icon: <MarketIco /> },
    { path:'/games',        label:'Daily Games',  icon: <GamesIco /> },
    { path:'/info',         label:'Campus Info',  icon: <InfoIco /> },
    { path:'/mood',         label:'Campus Pulse',icon: <MoodIco /> },
    { path:'/messages',       label:'Messages',      icon: <MsgIco /> },
    { path:'/notifications',  label:'Notifications', icon: <BellIco />, badge: unreadCount },
    { path:'/profile',        label:'Profile',       icon: <ProfileIco /> },
  ]

  const bubbleItems = [
    { path:'/',         label:'Feed',     icon:'⊞', color: profile?.campus_color || '#a78bfa' },
    { path:'/explore',  label:'Explore',  icon:'⊙', color:'#60a5fa' },
    { path:'/threads',  label:'Threads',  icon:'💬', color:'#f59e0b' },
    { path:'/groups',   label:'Groups',   icon:'👥', color:'#34d399' },
    { path:'/spots',    label:'Spots',    icon:'📍', color:'#fb923c' },
    { path:'/map',         label:'Map',         icon:'🗺️', color:'#34d399' },
    { path:'/study-buddy', label:'Study Buddy', icon:'🧠', color:'#818cf8' },
    { path:'/lost-found',  label:'Lost & Found', icon:'🔍', color:'#fb923c' },
    { path:'/marketplace', label:'Marketplace',  icon:'🛍️', color:'#f472b6' },
    { path:'/games',       label:'Daily Games',  icon:'🎮', color:'#a78bfa' },
    { path:'/info',        label:'Campus Info',  icon:'🎓', color:'#38bdf8' },
    { path:'/mood',        label:'Campus Pulse', icon:'🌡️', color:'#f43f5e' },
    { path:'/messages',      label:'Messages',      icon:'✉',  color:'#f472b6' },
    { path:'/notifications', label:'Notifications', icon:'🔔', color:'#f59e0b', badge: unreadCount },
    { path:'/profile',       label:'Profile',       icon:'◯',  color:'#a78bfa' },
    { path:'logout',    label:'Sign out', icon:'↩', color:'#ff6b8a' },
  ]

  function handleBubbleNav(path) {
    if (path === 'logout') logout()
    else navigate(path)
  }

  const campusColor = profile?.campus_color || '#a78bfa'

  return (
    <div style={{ display:'flex', minHeight:'100vh', width:'100%', position:'relative' }}>

      {/* ── Animated background ── */}
      <BackgroundPaths />

      {/* ── Sidebar — hidden on mobile (BubbleMenu handles nav) ── */}
      <aside
        ref={sidebarRef}
        onScroll={e => { _sidebarScrollTop = e.currentTarget.scrollTop }}
        style={{
        display: isMobile ? 'none' : 'flex',
        width:'var(--sidebar-w)', flexShrink:0,
        borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(14,10,36,0.09)',
        display:'flex', flexDirection:'column',
        padding:'22px 12px',
        position:'sticky', top:0, height:'100vh',
        overflowY:'auto',
        background: isDark ? 'rgba(7,7,16,0.45)' : 'rgba(240,238,255,0.80)',
        backdropFilter:'blur(40px) saturate(180%)',
        WebkitBackdropFilter:'blur(40px) saturate(180%)',
        zIndex:100,
        boxShadow: isDark ? 'inset -1px 0 0 rgba(255,255,255,0.06)' : 'inset -1px 0 0 rgba(14,10,36,0.06)',
        transition: 'background 0.35s ease, border-color 0.35s ease',
      }}>
        {/* Logo */}
        <div style={{ padding:'0 10px 28px', cursor:'pointer', textAlign:'center' }} onClick={()=>navigate('/')}>
          <span style={{ fontFamily: "'Pacifico', cursive", fontSize: 32, color: 'var(--text)', letterSpacing: '0.01em' }}>
            Campusly
          </span>
        </div>

        {/* Campus badge */}
        {profile && (
          <div style={{
            background:`${campusColor}12`,
            border:`1px solid ${campusColor}28`,
            borderRadius:'var(--radius-md)', padding:'10px 12px', marginBottom:22,
            display:'flex', alignItems:'center', gap:9,
            backdropFilter:'blur(12px)',
          }}>
            <span style={{ fontSize:22 }}>{profile.campus_emoji||'🎓'}</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, fontFamily:'var(--font-display)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', color:campusColor }}>{profile.campus_short}</div>
              <div style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.04em' }}>{profile.domain}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
          {nav.map(({ path, label, icon, badge }) => {
            const active = path==='/' ? location.pathname==='/' : location.pathname.startsWith(path)
            return (
              <button key={path} onClick={()=>navigate(path)} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:'var(--radius-md)',
                border: active ? `1px solid ${campusColor}28` : '1px solid transparent',
                textAlign:'left',
                background: active ? `${campusColor}10` : 'transparent',
                color: active ? campusColor : 'var(--text-2)',
                fontFamily: 'var(--font-ui)',
                fontWeight: active ? 700 : 400, fontSize:14,
                letterSpacing: '0.03em',
                position:'relative', transition:'all 0.18s',
                backdropFilter: active ? 'blur(12px)' : 'none',
              }}>
                {active && <span style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:2.5, background:campusColor, borderRadius:'0 3px 3px 0', boxShadow:`0 0 8px ${campusColor}` }} />}
                {icon}
                <span style={{ flex:1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    minWidth:18, height:18, borderRadius:999, padding:'0 5px',
                    background:'#f59e0b', color:'#000',
                    fontSize:10, fontWeight:800, lineHeight:'18px',
                    textAlign:'center', display:'inline-block',
                  }}>{badge > 99 ? '99+' : badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,10,36,0.07)', paddingTop:12, marginTop:8 }}>
          <div onClick={()=>navigate('/profile')} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', cursor:'pointer', borderRadius:'var(--radius-md)', transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background= isDark ? 'rgba(255,255,255,0.06)' : 'rgba(14,10,36,0.05)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <AvatarImg src={profile?.avatar_url} name={profile?.display_name} size={32} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', fontFamily:'var(--font-display)' }}>{profile?.display_name}</div>
              <div style={{ fontSize:10, color:'var(--text-3)' }}>@{profile?.username}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <button onClick={logout} className="btn-ghost" style={{ flex:1, fontSize:11, color:'var(--text-3)', textAlign:'left', padding:'5px 10px' }}>Sign out</button>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width:34, height:34, borderRadius:999, padding:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(109,40,217,0.08)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(109,40,217,0.25)',
                fontSize:16, lineHeight:1,
                transition:'background 0.2s, border-color 0.2s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.12) rotate(15deg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1) rotate(0deg)' }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, minWidth:0, overflowY:'auto', overflowX:'hidden', position:'relative', zIndex:10, background:'transparent', paddingBottom: isMobile ? 90 : 0 }}>
        {children}
      </main>


      <BubbleMenu items={bubbleItems} onNavigate={handleBubbleNav} />
    </div>
  )
}

export function AvatarImg({ src, name, size = 40 }) {
  const { isDark } = useTheme()
  if (src) return <img src={src} alt={name} className="avatar" style={{ width:size, height:size }} />
  /* Default: neutral circle + person silhouette, adapts to theme */
  const silhouette = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(14,10,36,0.28)'
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: isDark
        ? 'linear-gradient(160deg, #2a2a3e 0%, #1e1e2e 100%)'
        : 'linear-gradient(160deg, #e6e1f8 0%, #cec6f2 100%)',
      border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(14,10,36,0.10)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <svg
        width={size * 0.55} height={size * 0.55}
        viewBox="0 0 24 24" fill="none"
        style={{ marginTop: size * 0.08 }}
      >
        <circle cx="12" cy="8" r="4" fill={silhouette} />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={silhouette} />
      </svg>
    </div>
  )
}

function HomeIco()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> }
function SearchIco()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ThreadsIco() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg> }
function GroupsIco()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> }
function SpotsIco()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> }
function MapIco()     { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg> }
function StudyIco()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> }
function LostIco()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> }
function MoodIco()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> }
function MsgIco()     { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> }
function BellIco()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> }
function ProfileIco() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg> }
function GamesIco()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/></svg> }
function MarketIco()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z"/></svg> }
function InfoIco()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> }

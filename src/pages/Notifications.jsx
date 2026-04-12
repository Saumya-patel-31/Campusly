import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { AvatarImg } from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotifIcon({ type }) {
  if (type === 'thread_reply') return <span style={{ fontSize: 16 }}>💬</span>
  if (type === 'spot_join')    return <span style={{ fontSize: 16 }}>📍</span>
  if (type === 'message')      return <span style={{ fontSize: 16 }}>✉️</span>
  if (type === 'mention')      return <span style={{ fontSize: 16 }}>@</span>
  return <span style={{ fontSize: 16 }}>🔔</span>
}

function notifText(n) {
  const name = n.actor?.display_name || n.actor?.username || 'Someone'
  if (n.type === 'thread_reply') {
    const title = n.thread?.title ? `"${n.thread.title}"` : 'your thread'
    return <><strong>{name}</strong> replied to {title}</>
  }
  if (n.type === 'spot_join') {
    const loc = n.spot?.location || 'your spot'
    return <><strong>{name}</strong> joined your spot at <em>{loc}</em></>
  }
  if (n.type === 'message') {
    return <><strong>{name}</strong> sent you a message</>
  }
  if (n.type === 'mention') {
    const snippet = n.post?.caption ? ` — "${n.post.caption.slice(0, 60)}${n.post.caption.length > 60 ? '…' : ''}"` : ''
    return <><strong>{name}</strong> mentioned you in a post<em style={{ color: 'var(--text-3)', fontSize: 12 }}>{snippet}</em></>
  }
  return <><strong>{name}</strong> interacted with you</>
}

function notifLink(n) {
  if (n.type === 'thread_reply' && n.thread_id) return `/threads/${n.thread_id}`
  if (n.type === 'spot_join')                   return `/spots`
  if (n.type === 'message' && n.actor?.id)      return `/messages/${n.actor.id}`
  if (n.type === 'mention' && n.post_id)        return `/post/${n.post_id}`
  return null
}

export default function Notifications() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead, loading } =
    useNotifications(profile?.id)

  const campusColor = profile?.campus_color || '#a78bfa'

  async function handleClick(n) {
    if (!n.read) await markRead(n.id)
    const link = notifLink(n)
    if (link) navigate(link)
  }

  return (
    <Layout>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
              Notifications
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 99,
                background: `${campusColor}18`, border: `1px solid ${campusColor}40`,
                color: campusColor, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 0',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔔</div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 6 }}>No notifications yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              You'll see alerts here when someone replies, joins your spot, or messages you.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                className="fade-up hover-lift"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: n.read
                    ? 'rgba(255,255,255,0.04)'
                    : `${campusColor}0e`,
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.08)' : campusColor + '30'}`,
                  borderRadius: 14,
                  cursor: notifLink(n) ? 'pointer' : 'default',
                  transition: 'all 0.18s',
                  position: 'relative',
                }}
                onClick={() => handleClick(n)}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    width: 7, height: 7, borderRadius: '50%',
                    background: campusColor,
                    boxShadow: `0 0 6px ${campusColor}`,
                  }} />
                )}

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <AvatarImg src={n.actor?.avatar_url} name={n.actor?.display_name} size={40} />
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#12121e',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10,
                  }}>
                    <NotifIcon type={n.type} />
                  </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45 }}>
                    {notifText(n)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

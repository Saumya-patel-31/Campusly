import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import PostCard from '../components/PostCard.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/useAuth.js'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id ( id, username, display_name, avatar_url, campus_color, campus_short, campus_emoji ),
          likes ( user_id ),
          comments:comments ( count )
        `)
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }
      setPost(data)
      setLoading(false)
    }
    load()
  }, [id])

  const campusColor = profile?.campus_color || '#a78bfa'

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none',
            color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
            marginBottom: 20, padding: '6px 0',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>‹</span> Back
        </button>

        {/* Mention context banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          background: `${campusColor}12`,
          border: `1px solid ${campusColor}30`,
          fontSize: 13, color: campusColor, fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>@</span>
          You were mentioned in this post
        </div>

        {loading && (
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        )}

        {notFound && !loading && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, color: 'var(--text-2)' }}>Post not found</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
              It may have been deleted.
            </div>
          </div>
        )}

        {post && !loading && (
          <PostCard post={post} currentUserId={profile?.id} />
        )}
      </div>
    </Layout>
  )
}

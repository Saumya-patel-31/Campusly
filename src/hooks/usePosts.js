import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useFeed(domain) {
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchPosts = useCallback(async () => {
    if (!domain) return
    setLoading(true)

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles ( id, username, display_name, avatar_url, major, year, campus_short )
      `)
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) setError(error.message)
    else setPosts(data || [])
    setLoading(false)
  }, [domain])

  useEffect(() => {
    fetchPosts()

    // Realtime subscription — new posts appear instantly
    const channel = supabase
      .channel(`feed:${domain}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'posts',
        filter: `domain=eq.${domain}`,
      }, (payload) => {
        // Fetch the full post with profile join
        supabase
          .from('posts')
          .select('*, profiles ( id, username, display_name, avatar_url, major, year, campus_short )')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }) => {
            if (data) setPosts((prev) => [data, ...prev])
          })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'posts',
        filter: `domain=eq.${domain}`,
      }, (payload) => {
        setPosts((prev) => prev.map((p) =>
          p.id === payload.new.id ? { ...p, ...payload.new } : p
        ))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'posts',
      }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [domain, fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}

export function usePost(postId) {
  const [post,     setPost]     = useState(null)
  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!postId) return

    async function load() {
      const [{ data: post }, { data: comments }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, profiles ( id, username, display_name, avatar_url, major, year )')
          .eq('id', postId)
          .single(),
        supabase
          .from('comments')
          .select('*, profiles ( id, username, display_name, avatar_url )')
          .eq('post_id', postId)
          .order('created_at', { ascending: true }),
      ])
      setPost(post)
      setComments(comments || [])
      setLoading(false)
    }
    load()

    // Realtime comments
    const channel = supabase
      .channel(`post:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('comments')
          .select('*, profiles ( id, username, display_name, avatar_url )')
          .eq('id', payload.new.id)
          .single()
        if (data) setComments((prev) => [...prev, data])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [postId])

  return { post, comments, loading }
}

// ── Post actions ──────────────────────────────────────────────────

export async function createPost({ userId, domain, caption, mediaFile }) {
  let mediaUrl  = null
  let mediaType = null

  if (mediaFile) {
    const ext      = mediaFile.name.split('.').pop()
    const path     = `${userId}/${Date.now()}.${ext}`
    mediaType      = mediaFile.type.startsWith('video') ? 'video' : 'image'

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(path, mediaFile)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('posts').getPublicUrl(path)
    mediaUrl = data.publicUrl
  }

  const tags = (caption.match(/#(\w+)/g) || []).map((t) => t.slice(1))

  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, domain, caption, media_url: mediaUrl, media_type: mediaType, tags })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePost(postId, mediaUrl) {
  if (mediaUrl) {
    const path = mediaUrl.split('/posts/')[1]
    if (path) await supabase.storage.from('posts').remove([path])
  }
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    return false // unliked
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: userId })
    return true  // liked
  }
}

export async function getLikedPosts(userId) {
  const { data } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
  return new Set((data || []).map((l) => l.post_id))
}

export async function addComment(postId, userId, text) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, text })
    .select('*, profiles ( id, username, display_name, avatar_url )')
    .single()
  if (error) throw error
  return data
}

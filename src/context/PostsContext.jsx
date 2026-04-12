/**
 * PostsContext.jsx
 * Manages the posts feed, likes, comments per campus.
 * Persists to localStorage so posts survive a page refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getPostsForDomain } from '../data/seedData.js'

const PostsContext = createContext(null)

export function PostsProvider({ children, domain }) {
  const STORAGE_KEY = `campusly_posts_${domain}`

  const [posts, setPosts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return getPostsForDomain(domain)
  })

  // Persist posts whenever they change
  useEffect(() => {
    if (domain) localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
  }, [posts, domain])

  const addPost = useCallback((userId, content, tags = []) => {
    const newPost = {
      id:        `post_${Date.now()}`,
      userId,
      domain,
      content:   content.trim(),
      image:     null,
      likes:     0,
      likedBy:   [],
      comments:  [],
      timestamp: Date.now(),
      tags,
    }
    setPosts((prev) => [newPost, ...prev])
    return newPost
  }, [domain])

  const toggleLike = useCallback((postId, userId) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p
      const liked = (p.likedBy || []).includes(userId)
      return {
        ...p,
        likes:   liked ? p.likes - 1 : p.likes + 1,
        likedBy: liked
          ? (p.likedBy || []).filter((id) => id !== userId)
          : [...(p.likedBy || []), userId],
      }
    }))
  }, [])

  const addComment = useCallback((postId, userId, username, text) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p
      const comment = {
        id:        `c_${Date.now()}`,
        userId, username, text,
        timestamp: Date.now(),
      }
      return {
        ...p,
        comments: [...(Array.isArray(p.comments) ? p.comments : []), comment],
      }
    }))
  }, [])

  const deletePost = useCallback((postId, userId) => {
    setPosts((prev) => prev.filter((p) => !(p.id === postId && p.userId === userId)))
  }, [])

  return (
    <PostsContext.Provider value={{ posts, addPost, toggleLike, addComment, deletePost }}>
      {children}
    </PostsContext.Provider>
  )
}

export function usePosts() {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePosts must be used within PostsProvider')
  return ctx
}

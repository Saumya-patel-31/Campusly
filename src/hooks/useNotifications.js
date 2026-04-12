import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Fetches and subscribes to notifications for the current user.
 * Returns:
 *   notifications  – array, newest first
 *   unreadCount    – number of unread notifications
 *   markRead(id)   – mark one notification as read
 *   markAllRead()  – mark all as read
 *   loading        – initial load flag
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id ( id, username, display_name, avatar_url ),
        thread:thread_id ( id, title ),
        spot:spot_id ( id, location, description )
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) console.error('useNotifications load error:', error)
    setNotifications((data || []).filter(n => n.type !== 'message'))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    load()

    // Supabase Realtime — listen for new notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => load()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, read: payload.new.read } : n)
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId, load])

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false)
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read).length

  const deleteAll = useCallback(async () => {
    setNotifications([])
    await supabase.from('notifications').delete().eq('recipient_id', userId)
  }, [userId])

  return { notifications, unreadCount, markRead, markAllRead, deleteAll, loading }
}

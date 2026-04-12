import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { wsClient } from '../lib/wsClient.js'

// ─── useConversations ─────────────────────────────────────────────────────────
// Lists all DM partners for the sidebar, with unread counts + last message.
// Real-time updates come via the shared WS connection instead of Supabase channels.

export function useConversations(userId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, text, created_at, read, shared_post_id,
          sender_id, receiver_id,
          deleted_for_sender, deleted_for_receiver,
          sender:sender_id ( id, username, display_name, avatar_url ),
          receiver:receiver_id ( id, username, display_name, avatar_url )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const map = {}
      data.forEach((msg) => {
        const other = msg.sender_id === userId ? msg.receiver : msg.sender
        const hiddenForMe =
          (msg.sender_id   === userId && msg.deleted_for_sender) ||
          (msg.receiver_id === userId && msg.deleted_for_receiver)

        if (!map[other.id]) {
          map[other.id] = { user: other, lastMessage: null, unread: 0 }
        }
        if (!hiddenForMe && !map[other.id].lastMessage) {
          map[other.id].lastMessage = msg
        }
        if (!hiddenForMe && !msg.read && msg.receiver_id === userId) {
          map[other.id].unread++
        }
      })

      setConversations(Object.values(map))
      setLoading(false)
    }

    load()

    // Re-fetch the sidebar on any DM event for this user.
    // For 'read' events: also zero the unread count immediately (optimistic)
    // so the badge clears without waiting for the DB round-trip.
    const off = wsClient.on('dm_event', (msg) => {
      if (msg.senderId !== userId && msg.receiverId !== userId) return

      if (msg.action === 'read' && msg.receiverId === userId) {
        // The person who received the messages just opened the chat — clear badge now
        setConversations(prev =>
          prev.map(c =>
            c.user.id === msg.senderId ? { ...c, unread: 0 } : c
          )
        )
      }

      load()
    })

    return off
  }, [userId])

  // Zero the unread badge for a conversation immediately (optimistic, on click)
  const clearUnread = useCallback((otherUserId) => {
    setConversations(prev =>
      prev.map(c => c.user.id === otherUserId ? { ...c, unread: 0 } : c)
    )
  }, [])

  return { conversations, loading, clearUnread }
}

// ─── useMessages ──────────────────────────────────────────────────────────────
// Manages the message list for a single conversation.

export function useMessages(userId, otherId) {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!userId || !otherId) return

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          shared_post:shared_post_id (
            id, caption, media_url, media_type, tags,
            profiles ( id, username, display_name, avatar_url )
          )
        `)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),` +
          `and(sender_id.eq.${otherId},receiver_id.eq.${userId})`
        )
        .or(`sender_id.neq.${userId},deleted_for_sender.eq.false`)
        .or(`receiver_id.neq.${userId},deleted_for_receiver.eq.false`)
        .order('created_at', { ascending: true })

      setMessages(data || [])
      setLoading(false)

      // Mark received messages as read and tell the sidebar to refresh its counts
      const { count } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', otherId)
        .eq('receiver_id', userId)
        .eq('read', false)
        .select('id', { count: 'exact', head: true })

      // Only broadcast if there were actually unread messages to clear
      if (count && count > 0) {
        wsClient.send({
          type:       'dm_event',
          senderId:   otherId,
          receiverId: userId,
          action:     'read',
          payload:    {},
        })
      }
    }

    load()

    // Listen for WS events on this specific conversation.
    const off = wsClient.on('dm_event', (msg) => {
      const isThisConvo =
        (msg.senderId === userId && msg.receiverId === otherId) ||
        (msg.senderId === otherId && msg.receiverId === userId)

      if (!isThisConvo) return

      if (msg.action === 'insert') {
        // Reload to get the full row with joined post data
        load()
      } else if (msg.action === 'update') {
        const { id, text, edited, deleted_for_sender, deleted_for_receiver } = msg.payload
        const hiddenForMe =
          (msg.senderId === userId && deleted_for_sender) ||
          (msg.receiverId === userId && deleted_for_receiver)

        if (hiddenForMe) {
          setMessages(prev => prev.filter(m => m.id !== id))
        } else {
          setMessages(prev =>
            prev.map(m => m.id === id ? { ...m, text, edited } : m)
          )
        }
      } else if (msg.action === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== msg.payload.id))
      }
    })

    return off
  }, [userId, otherId])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text, sharedPostId = null) => {
    const row = {
      sender_id:   userId,
      receiver_id: otherId,
      text:        text.trim() || '',
    }
    if (sharedPostId) row.shared_post_id = sharedPostId

    const { data, error } = await supabase.from('messages').insert(row).select().single()
    if (error || !data) return

    // Create a notification for the receiver
    await supabase.from('notifications').insert({
      recipient_id: otherId,
      actor_id:     userId,
      type:         'message',
    })

    // Notify both parties via WebSocket
    wsClient.send({
      type:       'dm_event',
      senderId:   userId,
      receiverId: otherId,
      action:     'insert',
      payload:    { id: data.id },
    })
  }, [userId, otherId])

  const editMessage = useCallback(async (msgId, newText) => {
    const { error } = await supabase
      .from('messages')
      .update({ text: newText.trim(), edited: true })
      .eq('id', msgId)
      .eq('sender_id', userId)

    if (error) return

    wsClient.send({
      type:       'dm_event',
      senderId:   userId,
      receiverId: otherId,
      action:     'update',
      payload:    { id: msgId, text: newText.trim(), edited: true },
    })
  }, [userId, otherId])

  // Hard-delete (unsend) — removes for everyone
  const deleteMessage = useCallback(async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId)) // optimistic

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', msgId)
      .eq('sender_id', userId)

    if (error) return

    wsClient.send({
      type:       'dm_event',
      senderId:   userId,
      receiverId: otherId,
      action:     'delete',
      payload:    { id: msgId },
    })
  }, [userId, otherId])

  // Soft-delete — hides the chat only for the current user
  const deleteConversation = useCallback(async () => {
    setMessages([])

    await supabase
      .from('messages')
      .update({ deleted_for_sender: true })
      .eq('sender_id', userId)
      .eq('receiver_id', otherId)

    await supabase
      .from('messages')
      .update({ deleted_for_receiver: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', userId)

    // Notify the other side so their sidebar refreshes
    wsClient.send({
      type:       'dm_event',
      senderId:   userId,
      receiverId: otherId,
      action:     'update',
      payload:    { deleted_for_sender: true, deleted_for_receiver: true },
    })
  }, [userId, otherId])

  return { messages, loading, sendMessage, editMessage, deleteMessage, deleteConversation }
}

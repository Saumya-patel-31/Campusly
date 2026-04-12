/**
 * Campusly — WebSocket relay server
 *
 * Purely a notification relay — stores nothing, touches no database.
 * Supabase handles all reads/writes; this server only broadcasts events
 * between connected users so the frontend doesn't need Supabase Realtime.
 *
 * Deploy on Railway / Render / Fly.io and set VITE_WS_URL in the frontend.
 *
 * Protocol (all messages are JSON strings):
 *
 *  Client → Server:
 *    { type: 'register', userId: '<uuid>' }
 *    { type: 'dm_event', senderId, receiverId, action: 'insert'|'update'|'delete', payload: {...} }
 *
 *  Server → Client:
 *    { type: 'dm_event', senderId, receiverId, action, payload }
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 4000

const server = createServer((req, res) => {
  // Health-check endpoint — useful for uptime monitoring
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, connections: connections.size }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

// userId (string) → Set<WebSocket>
// One user may have multiple tabs open, each with its own socket.
const connections = new Map()

function getConns(userId) {
  return connections.get(userId) ?? new Set()
}

function broadcast(userId, data) {
  const msg = JSON.stringify(data)
  for (const ws of getConns(userId)) {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg)
  }
}

wss.on('connection', (ws) => {
  let registeredId = null

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    // ── Register ──────────────────────────────────────────────────
    if (msg.type === 'register') {
      const { userId } = msg
      if (!userId || typeof userId !== 'string') return

      registeredId = userId
      if (!connections.has(userId)) connections.set(userId, new Set())
      connections.get(userId).add(ws)
      return
    }

    // ── DM event (insert / update / delete) ───────────────────────
    if (msg.type === 'dm_event') {
      const { senderId, receiverId, action, payload } = msg
      if (!senderId || !receiverId || !action) return

      const event = { type: 'dm_event', senderId, receiverId, action, payload: payload ?? {} }

      // Notify the receiver and any other tabs the sender has open
      broadcast(receiverId, event)
      broadcast(senderId, event)
    }
  })

  ws.on('close', () => {
    if (!registeredId) return
    const set = connections.get(registeredId)
    if (set) {
      set.delete(ws)
      if (set.size === 0) connections.delete(registeredId)
    }
  })

  ws.onerror = () => ws.close()
})

server.listen(PORT, () => {
  console.log(`Campusly WS server running on port ${PORT}`)
})

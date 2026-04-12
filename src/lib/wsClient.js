/**
 * Singleton WebSocket client.
 *
 * Usage:
 *   import { wsClient } from '../lib/wsClient.js'
 *
 *   // Connect once when the user logs in:
 *   wsClient.connect(userId)
 *
 *   // Subscribe to events (returns an unsubscribe fn):
 *   const off = wsClient.on('dm_event', (msg) => { ... })
 *   // later: off()
 *
 *   // Send an event:
 *   wsClient.send({ type: 'dm_event', senderId, receiverId, action, payload })
 *
 *   // Disconnect on logout:
 *   wsClient.disconnect()
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000'

class WSClient {
  constructor() {
    this._ws = null
    this._userId = null
    this._handlers = {}   // type → fn[]
    this._reconnectTimer = null
    this._connecting = false
    this._dead = false    // set to true after explicit disconnect()
  }

  connect(userId) {
    if (!userId) return
    this._dead = false
    // If already connected for this user, nothing to do
    if (this._userId === userId && this._ws?.readyState === WebSocket.OPEN) return
    this._userId = userId
    this._open()
  }

  _open() {
    if (this._connecting || this._dead) return
    this._connecting = true
    clearTimeout(this._reconnectTimer)

    const ws = new WebSocket(WS_URL)
    this._ws = ws

    ws.onopen = () => {
      this._connecting = false
      ws.send(JSON.stringify({ type: 'register', userId: this._userId }))
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }
      const fns = this._handlers[msg.type]
      if (fns) fns.forEach(fn => fn(msg))
    }

    ws.onclose = () => {
      this._connecting = false
      if (!this._dead) {
        this._reconnectTimer = setTimeout(() => this._open(), 3000)
      }
    }

    ws.onerror = () => ws.close()
  }

  /** Emit an event to the server. */
  send(data) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data))
    }
  }

  /**
   * Subscribe to a message type.
   * @returns {() => void} unsubscribe function
   */
  on(type, fn) {
    if (!this._handlers[type]) this._handlers[type] = []
    this._handlers[type].push(fn)
    return () => {
      this._handlers[type] = this._handlers[type].filter(h => h !== fn)
    }
  }

  /** Call on user logout. */
  disconnect() {
    this._dead = true
    clearTimeout(this._reconnectTimer)
    this._ws?.close()
    this._ws = null
    this._userId = null
  }
}

export const wsClient = new WSClient()

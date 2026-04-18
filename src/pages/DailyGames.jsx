import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { AvatarImg } from '../components/Layout.jsx'
import { supabase } from '../lib/supabase.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

// ── Utilities ───────────────────────────────────────────────────

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getDailySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate()
}

function seededPick(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return h >>> 0
}

function shuffleSeeded(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Game data ───────────────────────────────────────────────────

// ── Runner game obstacles ────────────────────────────────────────
const CAMPUS_BUILDINGS = [
  { type:'clockTower',  w:36,  h:88 },
  { type:'dormTall',    w:50,  h:70 },
  { type:'library',     w:82,  h:52 },
  { type:'scienceLab',  w:60,  h:66 },
  { type:'cafeteria',   w:88,  h:40 },
  { type:'adminBlock',  w:64,  h:58 },
  { type:'chapel',      w:42,  h:78 },
  { type:'gymBuilding', w:92,  h:42 },
  { type:'lectureHall', w:74,  h:52 },
]

const CONNECT_SETS = [
  {
    categories: [
      { name: 'Campus Buildings', color: '#fbbf24', emoji: '🏛️', words: ['QUAD', 'DORMS', 'GYM', 'CHAPEL'] },
      { name: 'Exam Types',       color: '#34d399', emoji: '📝', words: ['MIDTERM', 'FINAL', 'ORAL', 'QUIZ'] },
      { name: 'Study Habits',     color: '#60a5fa', emoji: '📖', words: ['CRAM', 'REVIEW', 'OUTLINE', 'REREAD'] },
      { name: 'Graduation Terms', color: '#c084fc', emoji: '🎓', words: ['CAP', 'GOWN', 'DIPLOMA', 'TASSEL'] },
    ]
  },
  {
    categories: [
      { name: 'Campus Drinks',  color: '#fbbf24', emoji: '☕', words: ['ESPRESSO', 'MATCHA', 'LATTE', 'CHAI'] },
      { name: 'Major Fields',   color: '#34d399', emoji: '🔬', words: ['STEM', 'ARTS', 'LAW', 'MED'] },
      { name: 'Study Apps',     color: '#60a5fa', emoji: '📱', words: ['NOTION', 'SLACK', 'ZOOM', 'CANVAS'] },
      { name: '___ Paper',      color: '#c084fc', emoji: '📄', words: ['TERM', 'RESEARCH', 'TOILET', 'WALL'] },
    ]
  },
  {
    categories: [
      { name: 'Dorm Essentials',      color: '#fbbf24', emoji: '🛏️', words: ['LAMP', 'FAN', 'KETTLE', 'PILLOW'] },
      { name: 'Finals Week Feelings', color: '#34d399', emoji: '😰', words: ['PANIC', 'TIRED', 'NUMB', 'WIRED'] },
      { name: 'Club Types',           color: '#60a5fa', emoji: '🎭', words: ['DEBATE', 'CHESS', 'PREMED', 'DANCE'] },
      { name: 'Famous Colleges',      color: '#c084fc', emoji: '🏫', words: ['MIT', 'YALE', 'DUKE', 'RICE'] },
    ]
  },
  {
    categories: [
      { name: 'Late-Night Snacks', color: '#fbbf24', emoji: '🍕', words: ['RAMEN', 'PIZZA', 'CHIPS', 'COOKIE'] },
      { name: 'GPA Boosters',     color: '#34d399', emoji: '📈', words: ['CURVE', 'BONUS', 'EXTRA', 'RETAKE'] },
      { name: 'Campus Roles',     color: '#60a5fa', emoji: '👩‍🏫', words: ['DEAN', 'PROF', 'TA', 'AIDE'] },
      { name: 'Scholarship ___',  color: '#c084fc', emoji: '💰', words: ['FUND', 'MERIT', 'GRANT', 'AWARD'] },
    ]
  },
]

const QUIZ_SETS = [
  [
    { q: 'What does GPA stand for?', opts: ['Grade Point Average','General Performance Analysis','Graduate Program Assessment','Grade Proficiency Award'], ans: 0 },
    { q: 'Which language is most popular for AI/ML?', opts: ['Java','C++','Python','JavaScript'], ans: 2 },
    { q: 'What is the Pomodoro Technique?', opts: ['Note-taking method','Time management system','Speed reading tool','Group study method'], ans: 1 },
    { q: 'What does "peer review" mean?', opts: ['Students review professors','Professor grades on curve','Experts evaluate research','Class votes on grades'], ans: 2 },
    { q: 'What does "cum laude" mean?', opts: ['With honors','With difficulty','With distinction','With great praise'], ans: 0 },
  ],
  [
    { q: 'What year was Harvard founded?', opts: ['1636','1720','1492','1800'], ans: 0 },
    { q: 'Typical credits for a full-time semester?', opts: ['6-9','12-18','20-24','8-10'], ans: 1 },
    { q: 'Which note-taking uses a two-column format?', opts: ['Mind Map','Cornell Method','Outline Method','Flow Method'], ans: 1 },
    { q: 'What does STEM stand for?', opts: ['Science, Tech, Engineering, Math','Study, Test, Evaluate, Measure','Systems, Theory, Experiment, Method','Standard Tech Education Module'], ans: 0 },
    { q: 'Active recall is a technique for...?', opts: ['Passive reading','Self-testing to remember','Color-coding notes','Group discussions'], ans: 1 },
  ],
  [
    { q: 'What is a thesis statement?', opts: ['A bibliography entry','Main argument of an essay','Research methodology','A conclusion paragraph'], ans: 1 },
    { q: 'A "syllabus" is...?', opts: ['A type of exam','Course outline document','Study group schedule','Lecture notes format'], ans: 1 },
    { q: 'What is a typical PhD program length?', opts: ['1-2 years','2-3 years','4-6 years','8-10 years'], ans: 2 },
    { q: 'Which is NOT a liberal arts subject?', opts: ['History','Philosophy','Calculus','Literature'], ans: 2 },
    { q: 'What does "interdisciplinary" mean?', opts: ['Very difficult courses','Combining multiple fields','Online-only learning','A foreign exchange program'], ans: 1 },
  ],
]

// ── Wordle ──────────────────────────────────────────────────────

// ── Campus Runner ────────────────────────────────────────────────

const RUNNER_FILL = '#c4b5fd'   // light lavender silhouette
const RUNNER_BG   = '#0e0e1a'   // near-black background

// Polyfill for roundRect (Safari <15.4)
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Campus building silhouette renderer ─────────────────────────
function drawBldg(ctx, type, bx, groundY, w, h, fill) {
  const by = groundY - h
  ctx.save()
  ctx.fillStyle = fill

  switch (type) {
    case 'clockTower': {
      const tw = Math.round(w * 0.52), tx = bx + Math.round((w - tw) / 2)
      // Spire
      ctx.fillRect(tx + Math.round(tw * 0.3), by, Math.round(tw * 0.4), Math.round(h * 0.22))
      // Main tower body
      ctx.fillRect(tx, by + Math.round(h * 0.18), tw, Math.round(h * 0.82))
      // Clock face hole
      ctx.fillStyle = RUNNER_BG
      ctx.beginPath()
      ctx.arc(bx + Math.round(w / 2), by + Math.round(h * 0.36), Math.round(tw * 0.22), 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'dormTall': {
      ctx.fillRect(bx, by, w, h)
      // Window grid (dark holes)
      ctx.fillStyle = RUNNER_BG
      const ww = Math.round(w * 0.17), wh = Math.round(h * 0.10)
      const cols = 3, rows = 4
      const xPad = Math.round((w - cols * (ww + 3) + 3) / 2)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillRect(bx + xPad + c * (ww + 3), by + Math.round(h * 0.10) + r * Math.round(h * 0.22), ww, wh)
        }
      }
      break
    }
    case 'library': {
      // Main block
      ctx.fillRect(bx, by + Math.round(h * 0.22), w, Math.round(h * 0.78))
      // Pediment triangle
      ctx.beginPath()
      ctx.moveTo(bx - 4, by + Math.round(h * 0.22))
      ctx.lineTo(bx + Math.round(w / 2), by)
      ctx.lineTo(bx + w + 4, by + Math.round(h * 0.22))
      ctx.closePath(); ctx.fill()
      // Columns (dark)
      ctx.fillStyle = RUNNER_BG
      const nC = 4, cw = Math.round(w * 0.07)
      for (let i = 0; i < nC; i++) {
        ctx.fillRect(bx + Math.round(w * (i + 0.5) / nC) - Math.round(cw / 2), by + Math.round(h * 0.22), cw, Math.round(h * 0.78))
      }
      break
    }
    case 'scienceLab': {
      ctx.fillRect(bx, by + Math.round(h * 0.34), w, Math.round(h * 0.66))
      // Dome
      const dr = Math.round(w * 0.28), dx = bx + Math.round(w / 2)
      ctx.beginPath()
      ctx.ellipse(dx, by + Math.round(h * 0.34), dr, Math.round(h * 0.38), 0, Math.PI, 0)
      ctx.fill()
      // Windows (dark)
      ctx.fillStyle = RUNNER_BG
      const sw = Math.round(w * 0.14), sh = Math.round(h * 0.13)
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(bx + Math.round(w * (i + 0.5) / 3) - Math.round(sw / 2), by + Math.round(h * 0.52), sw, sh)
      }
      break
    }
    case 'cafeteria': {
      ctx.fillRect(bx, by + Math.round(h * 0.28), w, Math.round(h * 0.72))
      // Roof overhang
      ctx.fillRect(bx - 4, by + Math.round(h * 0.24), w + 8, Math.round(h * 0.07))
      // Chimneys
      ctx.fillRect(bx + Math.round(w * 0.18), by, Math.round(w * 0.07), Math.round(h * 0.30))
      ctx.fillRect(bx + Math.round(w * 0.32), by + Math.round(h * 0.08), Math.round(w * 0.06), Math.round(h * 0.22))
      // Windows (dark)
      ctx.fillStyle = RUNNER_BG
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(bx + Math.round(w * (i + 0.5) / 4) - Math.round(w * 0.07), by + Math.round(h * 0.44), Math.round(w * 0.14), Math.round(h * 0.18))
      }
      break
    }
    case 'adminBlock': {
      ctx.fillRect(bx, by + Math.round(h * 0.16), w, Math.round(h * 0.84))
      // Flagpole
      ctx.fillRect(bx + Math.round(w * 0.45), by, Math.round(w * 0.04), Math.round(h * 0.19))
      ctx.fillRect(bx + Math.round(w * 0.49), by, Math.round(w * 0.22), Math.round(h * 0.10))
      // Entry arch (dark hole)
      ctx.fillStyle = RUNNER_BG
      const aw = Math.round(w * 0.28), ax = bx + Math.round((w - aw) / 2)
      ctx.fillRect(ax, by + Math.round(h * 0.62), aw, Math.round(h * 0.38))
      ctx.beginPath()
      ctx.arc(ax + Math.round(aw / 2), by + Math.round(h * 0.62), Math.round(aw / 2), Math.PI, 0)
      ctx.fill()
      // Side windows
      ctx.fillRect(bx + Math.round(w * 0.07), by + Math.round(h * 0.30), Math.round(w * 0.18), Math.round(h * 0.15))
      ctx.fillRect(bx + Math.round(w * 0.75), by + Math.round(h * 0.30), Math.round(w * 0.18), Math.round(h * 0.15))
      break
    }
    case 'chapel': {
      ctx.fillRect(bx, by + Math.round(h * 0.36), w, Math.round(h * 0.64))
      // Steeple base
      const sb = Math.round(w * 0.28), sbx = bx + Math.round((w - sb) / 2)
      ctx.fillRect(sbx, by + Math.round(h * 0.20), sb, Math.round(h * 0.19))
      // Steeple spire
      ctx.beginPath()
      ctx.moveTo(sbx, by + Math.round(h * 0.21))
      ctx.lineTo(bx + Math.round(w / 2), by)
      ctx.lineTo(sbx + sb, by + Math.round(h * 0.21))
      ctx.closePath(); ctx.fill()
      // Cross (dark)
      ctx.fillStyle = RUNNER_BG
      const cw2 = Math.max(2, Math.round(w * 0.05))
      ctx.fillRect(bx + Math.round(w / 2) - Math.round(cw2 / 2), by + Math.round(h * 0.05), cw2, Math.round(h * 0.14))
      ctx.fillRect(bx + Math.round(w / 2) - cw2, by + Math.round(h * 0.09), cw2 * 2, cw2)
      // Rose window
      ctx.beginPath()
      ctx.arc(bx + Math.round(w / 2), by + Math.round(h * 0.56), Math.round(w * 0.12), 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'gymBuilding': {
      ctx.fillRect(bx, by + Math.round(h * 0.30), w, Math.round(h * 0.70))
      // Curved arched roof
      ctx.beginPath()
      ctx.moveTo(bx, by + Math.round(h * 0.30))
      ctx.quadraticCurveTo(bx + Math.round(w / 2), by, bx + w, by + Math.round(h * 0.30))
      ctx.closePath(); ctx.fill()
      // Arched windows (dark)
      ctx.fillStyle = RUNNER_BG
      for (let i = 0; i < 3; i++) {
        const wx = bx + Math.round(w * (i + 0.5) / 3) - Math.round(w * 0.09)
        const wy = by + Math.round(h * 0.44)
        const ww2 = Math.round(w * 0.18), wh2 = Math.round(h * 0.32)
        ctx.fillRect(wx, wy + Math.round(wh2 * 0.35), ww2, Math.round(wh2 * 0.65))
        ctx.beginPath()
        ctx.arc(wx + Math.round(ww2 / 2), wy + Math.round(wh2 * 0.35), Math.round(ww2 / 2), Math.PI, 0)
        ctx.fill()
      }
      break
    }
    case 'lectureHall': {
      // Terraced/stepped shape (3 tiers, widest at bottom)
      for (let i = 0; i < 3; i++) {
        const sw3 = w - Math.round(i * w * 0.17)
        const sh3 = Math.round(h / 3)
        ctx.fillRect(bx + Math.round((w - sw3) / 2), by + i * sh3, sw3, sh3 + 2)
      }
      // Entry columns (dark)
      ctx.fillStyle = RUNNER_BG
      ctx.fillRect(bx + Math.round(w * 0.35), by + Math.round(h * 0.67), Math.round(w * 0.04), Math.round(h * 0.33))
      ctx.fillRect(bx + Math.round(w * 0.61), by + Math.round(h * 0.67), Math.round(w * 0.04), Math.round(h * 0.33))
      break
    }
    default: {
      ctx.fillRect(bx, by, w, h)
      break
    }
  }

  ctx.restore()
}

// ── Student character — pixel art ────────────────────────────────
// Grid: 8 cols × 16 rows, each "pixel" = P×P real pixels
// Anchor: (x, y) = bottom-center (feet at ground)
function drawStudent(ctx, x, y, frame, onGround, dead) {
  const P  = 4
  const L  = Math.round(x) - 4 * P   // left edge  (col 0)
  const T  = Math.round(y) - 16 * P  // top edge   (row 0)

  // blk(col, row, widthInUnits, heightInUnits, color)
  const blk = (c, r, w, h, col) => {
    ctx.fillStyle = col
    ctx.fillRect(L + c * P, T + r * P, w * P, h * P)
  }

  ctx.save()

  // ── Graduation cap ─────────────────────────────────
  blk(2, 0, 3, 1, '#3b0764')   // cap top
  blk(1, 1, 5, 1, '#4c1d95')   // cap body
  blk(0, 2, 7, 1, '#3b0764')   // cap brim (full width)
  // Gold tassel hanging off right side
  blk(7, 1, 1, 1, '#f59e0b')
  blk(7, 2, 1, 1, '#f59e0b')
  blk(7, 3, 1, 1, '#d97706')   // tassel end (slightly darker)

  // ── Head (skin) ────────────────────────────────────
  // 4 wide × 3 tall, cols 2–5, rows 3–5
  blk(2, 3, 4, 3, '#fde68a')

  // ── Eyes ───────────────────────────────────────────
  if (dead) {
    // X eyes — two 2×2-area X marks
    blk(2, 4, 1, 1, '#3b0764'); blk(4, 5, 1, 1, '#3b0764')   // left eye  \
    blk(4, 4, 1, 1, '#3b0764'); blk(2, 5, 1, 1, '#3b0764')   // left eye  /
    blk(5, 4, 1, 1, '#3b0764'); blk(6, 5, 1, 1, '#3b0764')   // right eye \  (note: overflows head bg but that's fine for effect)
    blk(6, 4, 1, 1, '#3b0764'); blk(5, 5, 1, 1, '#3b0764')   // right eye /
  } else {
    blk(3, 5, 1, 1, '#3b0764')   // left eye
    blk(5, 5, 1, 1, '#3b0764')   // right eye
  }

  // ── Body ───────────────────────────────────────────
  blk(1, 6, 6, 4, '#8b5cf6')   // main body block
  blk(1, 6, 1, 4, '#c4b5fd')   // bright left stripe (shirt detail)
  blk(7, 6, 1, 3, '#5b21b6')   // backpack (right side)

  // ── Legs — 4-frame running cycle + jump + dead ─────
  // lp: 0–3 = run cycle, 4 = jump, 5 = dead
  const lp = dead ? 5 : (onGround ? Math.floor(frame * 0.35) % 4 : 4)

  switch (lp) {
    case 0: // right leg forward, left leg back
      blk(1, 10, 2, 5, '#6d28d9')   // left leg (back — taller, stays behind)
      blk(4, 10, 2, 4, '#6d28d9')   // right leg (forward — shorter, extends ahead)
      blk(0, 15, 3, 1, '#1e1b4b')   // left shoe  (back  — spread left)
      blk(4, 14, 3, 1, '#1e1b4b')   // right shoe (forward — one row higher)
      break
    case 1: // legs together (mid-stride)
    case 3:
      blk(1, 10, 2, 5, '#6d28d9')
      blk(4, 10, 2, 5, '#6d28d9')
      blk(1, 15, 2, 1, '#1e1b4b')
      blk(4, 15, 2, 1, '#1e1b4b')
      break
    case 2: // left leg forward, right leg back
      blk(4, 10, 2, 5, '#6d28d9')   // right leg (back)
      blk(1, 10, 2, 4, '#6d28d9')   // left leg (forward)
      blk(4, 15, 3, 1, '#1e1b4b')   // right shoe (back  — spread right)
      blk(0, 14, 3, 1, '#1e1b4b')   // left shoe  (forward — one row higher)
      break
    case 4: // jump — legs tucked under body
      blk(1, 10, 2, 4, '#6d28d9')
      blk(4, 10, 2, 4, '#6d28d9')
      blk(0, 14, 3, 1, '#1e1b4b')   // both feet level (tucked, not reaching ground)
      blk(4, 14, 3, 1, '#1e1b4b')
      break
    case 5: // dead — legs splayed outward
      blk(0, 10, 3, 2, '#6d28d9')   // left leg sticking out left
      blk(5, 10, 3, 2, '#6d28d9')   // right leg sticking out right
      blk(0, 12, 3, 1, '#1e1b4b')   // left shoe
      blk(5, 12, 3, 1, '#1e1b4b')   // right shoe
      break
  }

  ctx.restore()
}

function RunnerGame({ onComplete, userId }) {
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const gsRef      = useRef(null)
  const todayStr   = getTodayStr()
  const storageKey = `campusly_runner_${userId}_${todayStr}`

  const [phase, setPhase] = useState('idle')   // 'idle' | 'playing' | 'dead'
  const [score, setScore] = useState(0)
  const [best,  setBest]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.best || 0 } catch { return 0 }
  })
  const [isNewBest, setIsNewBest] = useState(false)

  // ── Canvas sizing ────────────────────────────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W   = canvas.parentElement?.clientWidth || 340
    const H   = Math.min(230, Math.max(170, window.innerHeight * 0.30))
    canvas.width        = Math.round(W * dpr)
    canvas.height       = Math.round(H * dpr)
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  // ── Idle frame ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || phase !== 'idle') return
    const dpr = window.devicePixelRatio || 1
    const ctx  = canvas.getContext('2d')
    const W    = canvas.width / dpr
    const H    = canvas.height / dpr
    const GY   = H - 46
    ctx.save(); ctx.scale(dpr, dpr)
    ctx.fillStyle = RUNNER_BG; ctx.fillRect(0, 0, W, H)
    // Ground line
    ctx.strokeStyle = 'rgba(196,181,253,0.20)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke()
    // Faint second line
    ctx.strokeStyle = 'rgba(196,181,253,0.07)'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, GY + 3); ctx.lineTo(W, GY + 3); ctx.stroke()
    // HI score
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = 'rgba(196,181,253,0.25)'
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'
    const hiStr = String(best).padStart(5, '0')
    ctx.fillText(`HI ${hiStr}  00000`, W - 12, 10)
    drawStudent(ctx, 68, GY, 0, true, false)
    ctx.restore()
  }, [phase, best])

  // ── Game loop ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr     = window.devicePixelRatio || 1
    const ctx     = canvas.getContext('2d')
    const W       = canvas.width / dpr
    const H       = canvas.height / dpr
    const GY      = H - 46
    const GRAVITY = 0.58
    const JUMP_V  = -13.5

    // Ground pebbles (fixed offsets, scroll left)
    const pebbles = Array.from({ length: 22 }, () => ({
      ox: Math.random() * W,
      y:  GY + 2 + Math.random() * 7,
      r:  Math.random() * 1.4 + 0.4,
    }))

    // Clouds
    const clouds = [
      { x: W * 0.35, y: GY * 0.22, w: 48, h: 10 },
      { x: W * 0.72, y: GY * 0.38, w: 36, h: 8  },
      { x: W * 1.1,  y: GY * 0.18, w: 52, h: 11 },
    ]

    const gs = {
      px: 68, py: GY, pvy: 0, onGround: true, frame: 0,
      obstacles: [], speed: 4.8, score: 0, tick: 0, nextObs: 80, dead: false,
    }
    gsRef.current = gs

    setPhase('playing')
    setScore(0)
    setIsNewBest(false)

    function loop() {
      gs.tick++
      gs.score += gs.speed * 0.076
      gs.speed  = Math.min(12, 4.8 + gs.tick * 0.0016)

      // Physics
      gs.pvy += GRAVITY
      gs.py  += gs.pvy
      if (gs.py >= GY) { gs.py = GY; gs.pvy = 0; gs.onGround = true }
      if (gs.onGround) gs.frame++

      // Spawn obstacles
      gs.nextObs--
      if (gs.nextObs <= 0) {
        const bType = CAMPUS_BUILDINGS[Math.floor(Math.random() * CAMPUS_BUILDINGS.length)]
        gs.obstacles.push({ ...bType, x: W + 10 })
        gs.nextObs = Math.max(44, 100 - gs.tick * 0.038) + Math.random() * 40
      }

      // Move & cull
      gs.obstacles.forEach(o => { o.x -= gs.speed })
      gs.obstacles = gs.obstacles.filter(o => o.x + o.w > -10)

      // Scroll pebbles
      pebbles.forEach(p => { p.ox -= gs.speed * 0.45; if (p.ox < 0) p.ox += W })

      // Scroll clouds (slow parallax)
      clouds.forEach(c => { c.x -= gs.speed * 0.18; if (c.x + c.w < 0) c.x = W + c.w })

      // ── Collision: player bottom must be above obstacle top ──────
      // Player hitbox: bottom = gs.py, top = gs.py - 32 (body)
      // Obstacle: top = GY - o.h, bottom = GY
      // Vertical overlap: gs.py >= GY - o.h (player feet below obstacle top)
      // +5 forgiveness so grazing the top corner doesn't kill you
      const HW = 7
      for (const o of gs.obstacles) {
        if (
          gs.px + HW > o.x + 3 &&
          gs.px - HW < o.x + o.w - 3 &&
          gs.py >= GY - o.h + 5
        ) {
          gs.dead = true; break
        }
      }

      // ── Draw ─────────────────────────────────────────────────────
      ctx.save(); ctx.scale(dpr, dpr)
      ctx.fillStyle = RUNNER_BG; ctx.fillRect(0, 0, W, H)

      // Clouds
      ctx.fillStyle = 'rgba(196,181,253,0.08)'
      clouds.forEach(c => {
        rrect(ctx, c.x, c.y, c.w, c.h, 5); ctx.fill()
        rrect(ctx, c.x + c.w * 0.2, c.y - c.h * 0.5, c.w * 0.55, c.h * 0.8, 5); ctx.fill()
      })

      // Speed streaks (appear at higher speed)
      if (gs.speed > 7.5) {
        const alpha = Math.min(0.22, (gs.speed - 7.5) / 18)
        ctx.strokeStyle = `rgba(196,181,253,${alpha})`
        ctx.lineWidth = 1
        const streaks = [-28, -40, -52]
        streaks.forEach(dx => {
          ctx.beginPath(); ctx.moveTo(gs.px + dx, gs.py - 18); ctx.lineTo(gs.px + dx + 12, gs.py - 18); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(gs.px + dx + 2, gs.py - 28); ctx.lineTo(gs.px + dx + 10, gs.py - 28); ctx.stroke()
        })
      }

      // Buildings
      gs.obstacles.forEach(o => drawBldg(ctx, o.type, o.x, GY, o.w, o.h, RUNNER_FILL))

      // Student
      drawStudent(ctx, gs.px, gs.py, gs.frame, gs.onGround, false)

      // Ground
      ctx.strokeStyle = 'rgba(196,181,253,0.22)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke()
      ctx.strokeStyle = 'rgba(196,181,253,0.07)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, GY + 3); ctx.lineTo(W, GY + 3); ctx.stroke()

      // Ground pebbles
      ctx.fillStyle = 'rgba(196,181,253,0.20)'
      pebbles.forEach(p => { ctx.beginPath(); ctx.arc(p.ox, p.y, p.r, 0, Math.PI * 2); ctx.fill() })

      // HI + score (top-right, Chrome-Dino style)
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'right'; ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(196,181,253,0.25)'
      const hiStr  = String(best).padStart(5, '0')
      const scStr  = String(Math.floor(gs.score)).padStart(5, '0')
      ctx.fillText(`HI ${hiStr}  ${scStr}`, W - 12, 10)

      ctx.restore()
      // ── End draw ──────────────────────────────────────────────────

      if (!gs.dead) {
        setScore(Math.floor(gs.score))
        rafRef.current = requestAnimationFrame(loop)
      } else {
        // Draw final frame: dead student + GAME OVER overlay
        ctx.save(); ctx.scale(dpr, dpr)

        // Redraw scene with dead student
        ctx.fillStyle = RUNNER_BG; ctx.fillRect(0, 0, W, H)
        clouds.forEach(c => {
          ctx.fillStyle = 'rgba(196,181,253,0.08)'
          rrect(ctx, c.x, c.y, c.w, c.h, 5); ctx.fill()
          rrect(ctx, c.x + c.w * 0.2, c.y - c.h * 0.5, c.w * 0.55, c.h * 0.8, 5); ctx.fill()
        })
        gs.obstacles.forEach(o => drawBldg(ctx, o.type, o.x, GY, o.w, o.h, RUNNER_FILL))
        drawStudent(ctx, gs.px, gs.py, gs.frame, gs.onGround, true)
        ctx.strokeStyle = 'rgba(196,181,253,0.22)'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke()
        pebbles.forEach(p => { ctx.beginPath(); ctx.arc(p.ox, p.y, p.r, 0, Math.PI * 2); ctx.fill() })

        // Semi-transparent dim
        ctx.fillStyle = 'rgba(14,14,26,0.62)'; ctx.fillRect(0, 0, W, H)

        // GAME OVER text
        const fontSize = Math.max(16, Math.round(W * 0.058))
        ctx.font = `bold ${fontSize}px monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = RUNNER_FILL
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10)
        ctx.font = `${Math.max(11, Math.round(W * 0.036))}px monospace`
        ctx.fillStyle = 'rgba(196,181,253,0.55)'
        ctx.fillText(`${Math.floor(gs.score)}m`, W / 2, H / 2 + 14)

        ctx.restore()

        const finalScore = Math.floor(gs.score)
        setScore(finalScore)

        let storedBest = 0
        try { storedBest = JSON.parse(localStorage.getItem(storageKey))?.best || 0 } catch {}
        const newBest = Math.max(storedBest, finalScore)
        localStorage.setItem(storageKey, JSON.stringify({ best: newBest, played: true }))
        setBest(newBest)
        setIsNewBest(finalScore > storedBest && finalScore > 0)

        onComplete(true, Math.floor(finalScore / 10), finalScore)
        setPhase('dead')
      }
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [best, onComplete, storageKey])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // ── Input ────────────────────────────────────────────────────────
  const handleAction = useCallback(() => {
    if (phase === 'idle' || phase === 'dead') { startGame() }
    else if (gsRef.current?.onGround) {
      gsRef.current.pvy = -13.5
      gsRef.current.onGround = false
    }
  }, [phase, startGame])

  useEffect(() => {
    const onKey = e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleAction() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleAction])

  return (
    <div style={{ width:'100%', userSelect:'none' }}>
      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid rgba(196,181,253,0.12)', background: RUNNER_BG }}>
        <canvas
          ref={canvasRef}
          onClick={handleAction}
          onTouchStart={e => { e.preventDefault(); handleAction() }}
          style={{ display:'block', cursor:'pointer', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, pointerEvents:'none' }}>
            <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'rgba(196,181,253,0.75)', letterSpacing:'0.12em' }}>CAMPUS RUN</div>
            <div style={{ fontSize:11, color:'rgba(196,181,253,0.35)', fontFamily:'monospace' }}>TAP OR PRESS SPACE</div>
          </div>
        )}

        {/* Dead overlay — just the retry button; score/GAME OVER drawn on canvas */}
        {phase === 'dead' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', paddingBottom:22 }}>
            {isNewBest && (
              <div style={{ fontFamily:'monospace', fontSize:11, color:'#86efac', letterSpacing:'0.10em', marginBottom:10 }}>
                NEW BEST!
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); startGame() }}
              style={{
                padding:'7px 30px', borderRadius:20,
                border:'1px solid rgba(196,181,253,0.30)',
                background:'rgba(196,181,253,0.10)',
                color:'rgba(196,181,253,0.90)',
                fontFamily:'monospace', fontWeight:700, fontSize:12, letterSpacing:'0.08em',
                cursor:'pointer',
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {/* Hint during play */}
        {phase === 'playing' && (
          <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', fontSize:10, color:'rgba(196,181,253,0.22)', fontFamily:'monospace', pointerEvents:'none', whiteSpace:'nowrap' }}>
            tap · space · ↑ to jump
          </div>
        )}
      </div>

      {/* Below-canvas best score */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 4px 0' }}>
        <div style={{ fontSize:11, color:'var(--text-3)' }}>Dodge campus buildings as far as you can</div>
        {best > 0 && (
          <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'monospace' }}>
            best <span style={{ color:'#c4b5fd', fontWeight:700 }}>{best}m</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Connect ─────────────────────────────────────────────────────

function ConnectGame({ onComplete, userId }) {
  const todayStr = getTodayStr()
  const storageKey = `campusly_connect_${userId}_${todayStr}`
  const set = seededPick(CONNECT_SETS, getDailySeed())

  const loadState = () => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey))
      if (s) return s
    } catch {}
    const allWords = set.categories.flatMap((cat, catIdx) => cat.words.map(word => ({ word, catIdx })))
    const shuffled = shuffleSeeded(allWords, getDailySeed())
    return { words: shuffled, selected: [], found: [], mistakes: 0, gameOver: false, won: false }
  }

  const [state, setState] = useState(loadState)
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState(null)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
    if (state.gameOver) {
      const score = state.won ? Math.max(0, 4 - state.mistakes) * 25 : 0
      onComplete(state.won, score, state.mistakes)
    }
  }, [state.gameOver])

  function toggleWord(word) {
    if (state.gameOver) return
    setState(prev => {
      const already = prev.selected.includes(word)
      const newSelected = already ? prev.selected.filter(w => w !== word) : prev.selected.length < 4 ? [...prev.selected, word] : prev.selected
      return { ...prev, selected: newSelected }
    })
  }

  function submit() {
    if (state.selected.length !== 4) return
    const catIdx = state.words.find(w => w.word === state.selected[0])?.catIdx
    const allSame = state.selected.every(word => state.words.find(w => w.word === word)?.catIdx === catIdx)

    if (allSame) {
      const newFound = [...state.found, catIdx]
      const won = newFound.length === 4
      setReveal(catIdx)
      setTimeout(() => {
        setReveal(null)
        setState(prev => ({ ...prev, selected: [], found: newFound, won, gameOver: won }))
      }, 800)
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setState(prev => {
        const mistakes = prev.mistakes + 1
        return { ...prev, selected: [], mistakes, gameOver: mistakes >= 4 && prev.found.length < 4 ? true : prev.gameOver }
      })
    }
  }

  const foundCats = state.found.map(idx => set.categories[idx])
  const remainingWords = state.words.filter(w => !state.found.includes(w.catIdx))

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
      {state.gameOver && (
        <div style={{ textAlign:'center', padding:'14px 24px', borderRadius:12, background: state.won ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border:`1px solid ${state.won ? '#22c55e44' : '#ef444444'}` }}>
          <div style={{ fontSize:26, marginBottom:4 }}>{state.won ? '🎉' : '😔'}</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color: state.won ? '#22c55e' : '#ef4444' }}>
            {state.won ? `Solved with ${state.mistakes} mistake${state.mistakes !== 1 ? 's' : ''}!` : 'Better luck tomorrow!'}
          </div>
          {state.won && <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>+{Math.max(0,4-state.mistakes)*25} pts</div>}
        </div>
      )}

      {/* Found categories */}
      {foundCats.map((cat, i) => (
        <div key={i} style={{ width:'100%', padding:'12px 16px', borderRadius:12, background:`${cat.color}22`, border:`1px solid ${cat.color}44`, textAlign:'center' }}>
          <div style={{ fontSize:11, color: cat.color, fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
            {cat.emoji} {cat.name}
          </div>
          <div style={{ fontSize:13, color:'var(--text-2)', fontFamily:'var(--font-display)' }}>{cat.words.join(' · ')}</div>
        </div>
      ))}

      {/* Word grid */}
      {remainingWords.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, width:'100%', animation: shake ? 'shake 0.4s' : 'none' }}>
          {remainingWords.map(({ word }) => {
            const isSelected = state.selected.includes(word)
            return (
              <button key={word} onClick={() => toggleWord(word)} style={{
                padding:'12px 6px', borderRadius:10, border:`2px solid ${isSelected ? 'var(--campus)' : 'rgba(255,255,255,0.12)'}`,
                background: isSelected ? 'var(--campus-dim)' : 'rgba(255,255,255,0.05)',
                color: isSelected ? 'var(--campus)' : 'var(--text)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:12,
                cursor:'pointer', transition:'all 0.15s', textAlign:'center',
              }}>
                {word}
              </button>
            )
          })}
        </div>
      )}

      {/* Controls */}
      {!state.gameOver && (
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', gap:4 }}>
            {Array.from({ length:4 }).map((_, i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:'50%', background: i < state.mistakes ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
          <button onClick={submit} disabled={state.selected.length !== 4} style={{
            padding:'10px 24px', borderRadius:20, border:'1px solid var(--campus-border)',
            background: state.selected.length === 4 ? 'var(--campus-dim)' : 'transparent',
            color: state.selected.length === 4 ? 'var(--campus)' : 'var(--text-3)',
            fontFamily:'var(--font-display)', fontWeight:700, fontSize:13,
            cursor: state.selected.length === 4 ? 'pointer' : 'not-allowed', transition:'all 0.15s',
          }}>
            Submit ({state.selected.length}/4)
          </button>
        </div>
      )}
    </div>
  )
}

// ── Quiz ────────────────────────────────────────────────────────

function QuizGame({ onComplete, userId }) {
  const todayStr = getTodayStr()
  const storageKey = `campusly_quiz_${userId}_${todayStr}`
  const questions = seededPick(QUIZ_SETS, getDailySeed())

  const loadState = () => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey))
      if (s) return s
    } catch {}
    return { current: 0, answers: [], score: 0, gameOver: false }
  }

  const [state, setState] = useState(loadState)
  const [showResult, setShowResult] = useState(state.gameOver)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
    if (state.gameOver) {
      onComplete(state.score > 0, state.score * 20, state.score)
      setShowResult(true)
    }
  }, [state.gameOver])

  function answer(optIdx) {
    if (state.gameOver) return
    const q = questions[state.current]
    const correct = optIdx === q.ans
    const newAnswers = [...state.answers, { chosen: optIdx, correct }]
    const newScore = state.score + (correct ? 1 : 0)
    const next = state.current + 1
    const gameOver = next >= questions.length
    setState({ current: next, answers: newAnswers, score: newScore, gameOver })
  }

  if (state.gameOver) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        {showResult && (
          <div onClick={() => setShowResult(false)} style={{
            position:'fixed', inset:0, zIndex:200,
            background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', padding:24,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background:'rgba(18,16,36,0.97)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420,
              maxHeight:'80vh', overflowY:'auto',
              boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
            }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:44, marginBottom:8 }}>{state.score >= 4 ? '🏆' : state.score >= 2 ? '👍' : '📚'}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:22 }}>
                  {state.score}/{questions.length} Correct
                </div>
                <div style={{ fontSize:13, color:'#22c55e', marginTop:4 }}>+{state.score*20} pts</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {questions.map((q, i) => {
                  const a = state.answers[i]
                  return (
                    <div key={i} style={{ padding:'12px 16px', borderRadius:12, background: a.correct ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border:`1px solid ${a.correct ? '#22c55e33' : '#ef444433'}` }}>
                      <div style={{ fontSize:12, fontFamily:'var(--font-display)', marginBottom:6, color:'var(--text)' }}>{q.q}</div>
                      <div style={{ fontSize:11, color: a.correct ? '#22c55e' : '#ef4444' }}>
                        {a.correct ? '✓' : '✗'} {q.opts[a.chosen]}
                      </div>
                      {!a.correct && (
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>
                          Correct answer: <span style={{ color:'#22c55e', fontWeight:700 }}>{q.opts[q.ans]}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'var(--text-3)' }}>tap anywhere to close</div>
            </div>
          </div>
        )}
        <div style={{ fontSize:14, color:'var(--text-2)', textAlign:'center' }}>Quiz complete — tap the score to review answers</div>
        <button onClick={() => setShowResult(true)} style={{
          padding:'10px 28px', borderRadius:20,
          background:'var(--campus-dim)', border:'1px solid var(--campus-border)',
          color:'var(--campus)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>
          {state.score}/{questions.length} — View Results
        </button>
      </div>
    )
  }

  const q = questions[state.current]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Progress */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:4, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(state.current/questions.length)*100}%`, background:'var(--campus)', borderRadius:4, transition:'width 0.3s' }} />
        </div>
        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-display)' }}>{state.current+1}/{questions.length}</div>
      </div>

      {/* Question */}
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, lineHeight:1.5 }}>{q.q}</div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {q.opts.map((opt, i) => (
          <button key={i} onClick={() => answer(i)} style={{
            padding:'13px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.04)', color:'var(--text)',
            fontFamily:'var(--font-body)', fontSize:13, cursor:'pointer', textAlign:'left',
            transition:'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--campus-border)'; e.currentTarget.style.background='var(--campus-dim)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
          >
            <span style={{ color:'var(--campus)', fontFamily:'var(--font-display)', fontWeight:700, marginRight:10 }}>{String.fromCharCode(65+i)}.</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Leaderboard ─────────────────────────────────────────────────

function Leaderboard({ profile, scores, refreshKey }) {
  const [top3, setTop3] = useState([])
  const todayStr = getTodayStr()

  async function fetchLeaderboard(domain) {
    if (!domain) return
    const { data: scoreRows } = await supabase
      .from('game_scores')
      .select('user_id, total_score')
      .eq('domain', domain)
      .eq('score_date', todayStr)
      .order('total_score', { ascending: false })
      .limit(3)

    if (!scoreRows?.length) { setTop3([]); return }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', scoreRows.map(r => r.user_id))

    const profileMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]))
    setTop3(scoreRows.map(r => ({ ...r, profile: profileMap[r.user_id] })))
  }

  // Re-fetch when account switches (profile.id) or a game completes (refreshKey)
  useEffect(() => {
    fetchLeaderboard(profile?.domain)
  }, [profile?.id, profile?.domain, todayStr, refreshKey])

  // Real-time: update leaderboard live whenever any campus score changes
  useEffect(() => {
    if (!profile?.domain) return
    const channel = supabase
      .channel(`game_scores_${profile.domain}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_scores',
        filter: `domain=eq.${profile.domain}`,
      }, () => fetchLeaderboard(profile.domain))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile?.domain])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ ...panel, padding:20 }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:4 }}>Campus Leaderboard</div>
      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:16 }}>Today · {profile?.campus_short}</div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[0, 1, 2].map(i => {
          const entry = top3[i]
          const isYou = entry?.user_id === profile?.id
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
              background: isYou ? 'var(--campus-dim)' : 'rgba(255,255,255,0.03)',
              border: isYou ? '1px solid var(--campus-border)' : '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize:18, width:22, textAlign:'center' }}>{medals[i]}</div>
              {entry ? (
                <>
                  <AvatarImg src={entry.profile?.avatar_url} name={entry.profile?.display_name} size={30} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontFamily:'var(--font-display)', fontWeight:700, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', color: isYou ? 'var(--campus)' : 'var(--text)' }}>
                      {entry.profile?.display_name}{isYou ? ' (you)' : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color: isYou ? 'var(--campus)' : 'var(--text-2)' }}>
                    {entry.total_score}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-3)' }}>N/A</div>
                    <div style={{ fontSize:10, color:'var(--text-3)' }}>No one yet</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--text-3)' }}>—</div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.07)', textAlign:'center', fontSize:11, color:'var(--text-3)' }}>
        Resets at midnight · {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────

const GAME_META = [
  { id:'runner',  name:'Campus Run',    emoji:'🏃', desc:'Dodge your way through the campus buildings', color:'#22c55e' },
  { id:'connect', name:'Word Connect',  emoji:'🔗', desc:'Group 16 campus words into 4 categories',               color:'#60a5fa' },
  { id:'quiz',    name:'Campus Quiz',   emoji:'🎓', desc:'5 daily questions about campus life',                    color:'#f59e0b' },
]

async function upsertGameScore(profile, scores) {
  if (!profile?.id || !profile?.domain) return
  await supabase.from('game_scores').upsert({
    user_id:       profile.id,
    domain:        profile.domain,
    score_date:    getTodayStr(),
    wordle_score:  scores.runner  ?? 0,   // reuse column for runner score
    connect_score: scores.connect ?? 0,
    quiz_score:    scores.quiz    ?? 0,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'user_id,score_date' })
}

export default function DailyGames() {
  const { profile } = useAuth()
  const isMobile = useIsMobile()
  const todayStr = getTodayStr()
  const [activeGame, setActiveGame] = useState(null)
  const [scores, setScores] = useState({})
  const [leaderRefresh, setLeaderRefresh] = useState(0)

  // Load today's completions — keyed per user so accounts don't bleed into each other
  useEffect(() => {
    if (!profile?.id) return
    const uid = profile.id
    const s = {}
    try {
      const r = JSON.parse(localStorage.getItem(`campusly_runner_${uid}_${todayStr}`))
      if (r?.played) s.runner = Math.floor((r.best || 0) / 10)
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(`campusly_connect_${uid}_${todayStr}`))
      if (c?.gameOver) s.connect = c.won ? Math.max(0,4-c.mistakes)*25 : 0
    } catch {}
    try {
      const q = JSON.parse(localStorage.getItem(`campusly_quiz_${uid}_${todayStr}`))
      if (q?.gameOver) s.quiz = q.score*20
    } catch {}
    setScores(s)
  }, [profile?.id, todayStr])

  async function handleComplete(gameId, won, score) {
    // For runner: always keep the best score of the day, never overwrite with a worse run
    const prevBest = gameId === 'runner' ? (scores.runner || 0) : undefined
    const kept     = prevBest !== undefined ? Math.max(prevBest, score) : score
    const newScores = { ...scores, [gameId]: kept }
    setScores(newScores)
    await upsertGameScore(profile, newScores)
    setLeaderRefresh(n => n + 1)
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const gamesPlayed = Object.keys(scores).length

  // Mobile full-screen game overlay — portalled to document.body so it escapes
  // the <main overflowY:auto> container that breaks position:fixed on iOS Safari.
  const activeGameMeta = GAME_META.find(g => g.id === activeGame)
  // Runner stays open for unlimited replays; other games close once completed
  const showOverlay = isMobile && activeGameMeta && (activeGame === 'runner' || !scores[activeGameMeta.id])
  const mobileOverlay = showOverlay
    ? createPortal(
        <div style={{ position:'fixed', top:54, left:0, right:0, bottom:0, zIndex:250, background:'#070710', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.10)', flexShrink:0, background:'rgba(255,255,255,0.04)', width:'100%' }}>
            <button onClick={() => setActiveGame(null)} style={{ background:'transparent', border:'none', color:'var(--text-2)', fontSize:26, cursor:'pointer', padding:'2px 10px 2px 0', lineHeight:1 }}>‹</button>
            <span style={{ fontSize:18 }}>{activeGameMeta.emoji}</span>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>{activeGameMeta.name}</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{activeGameMeta.desc}</div>
            </div>
          </div>
          {/* Game content */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflowX:'hidden', overflowY:'auto', padding:'16px 14px' }}>
            {activeGame === 'runner'  && <RunnerGame  userId={profile?.id} onComplete={(won, score) => handleComplete('runner',  won, score)} />}
            {activeGame === 'connect' && <ConnectGame userId={profile?.id} onComplete={(won, score) => { handleComplete('connect', won, score); setActiveGame(null) }} />}
            {activeGame === 'quiz'    && <QuizGame    userId={profile?.id} onComplete={(won, score) => { handleComplete('quiz',    won, score); setActiveGame(null) }} />}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <Layout>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
        .game-panel { animation: pop 0.25s ease-out; }
      `}</style>
      {mobileOverlay}
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24, maxWidth:1060, margin:'0 auto', padding: isMobile ? '12px 0' : '28px 20px', alignItems:'flex-start' }}>

        {/* ── Left: Games ── */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Header */}
          <div className="fade-up" style={{ marginBottom: isMobile ? 12 : 24, padding: isMobile ? '0 14px' : 0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:30 }}>🎮</span>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, lineHeight:1.2 }}>
                    <span className="gradient-text">Daily</span> Games
                  </h1>
                  <p style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                    {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · New games at midnight
                  </p>
                </div>
              </div>
              {gamesPlayed > 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'10px 16px', borderRadius:14, background:'var(--campus-dim)', border:'1px solid var(--campus-border)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--campus)', lineHeight:1 }}>{totalScore}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)', letterSpacing:'0.06em' }}>pts today</div>
                </div>
              )}
            </div>

            {/* Progress dots */}
            <div style={{ display:'flex', gap:6, marginTop:12 }}>
              {GAME_META.map(g => (
                <div key={g.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:20, background: scores[g.id] !== undefined ? `${g.color}18` : 'rgba(255,255,255,0.04)', border:`1px solid ${scores[g.id] !== undefined ? g.color+'44' : 'rgba(255,255,255,0.08)'}` }}>
                  <span style={{ fontSize:12 }}>{scores[g.id] !== undefined ? '✓' : g.emoji}</span>
                  <span style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, color: scores[g.id] !== undefined ? g.color : 'var(--text-3)' }}>{g.name}</span>
                  {scores[g.id] !== undefined && <span style={{ fontSize:10, color:g.color }}>+{scores[g.id]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Game cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {GAME_META.map((game, i) => {
              const isRunner = game.id === 'runner'
              const done     = !isRunner && scores[game.id] !== undefined
              const open     = activeGame === game.id
              const canPlay  = isRunner || !done
              return (
                <div key={game.id} className="fade-up" style={{ animationDelay:`${i*0.06}s` }}>
                  {/* Card header */}
                  <div
                    onClick={() => canPlay && setActiveGame(open ? null : game.id)}
                    style={{ ...panel, padding: isMobile ? '12px 14px' : '18px 20px', cursor: canPlay ? 'pointer' : 'default', transition:'all 0.15s' }}
                    onMouseEnter={e => { if(canPlay) e.currentTarget.style.borderColor='rgba(255,255,255,0.18)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.10)' }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:46, height:46, borderRadius:13, background:`${game.color}15`, border:`1px solid ${game.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                        {game.emoji}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>{game.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{game.desc}</div>
                      </div>
                      {/* Runner: always show score + play button if has score */}
                      {isRunner && scores[game.id] !== undefined ? (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                          <button onClick={e => { e.stopPropagation(); setActiveGame(open ? null : game.id) }} style={{
                            padding:'5px 14px', borderRadius:20, border:`1px solid ${game.color}44`,
                            background:`${game.color}10`, color: game.color, fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, cursor:'pointer',
                          }}>Play Again</button>
                        </div>
                      ) : done ? (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✓</div>
                          <div style={{ fontSize:10, color:'#22c55e', fontFamily:'var(--font-display)', fontWeight:700 }}>+{scores[game.id]}</div>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setActiveGame(open ? null : game.id) }} style={{
                          padding:'8px 20px', borderRadius:20, border:`1px solid ${game.color}44`,
                          background: open ? `${game.color}20` : `${game.color}10`,
                          color: game.color, fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, cursor:'pointer',
                        }}>
                          {open ? 'Close' : 'Play'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop inline game panel */}
                  {open && canPlay && !isMobile && (
                    <div className="game-panel" style={{ ...panel, marginTop:6, padding:'20px 20px', borderRadius:16 }}>
                      {game.id === 'runner'  && <RunnerGame  userId={profile?.id} onComplete={(won, score) => handleComplete('runner',  won, score)} />}
                      {game.id === 'connect' && <ConnectGame userId={profile?.id} onComplete={(won, score) => { handleComplete('connect', won, score); setActiveGame(null) }} />}
                      {game.id === 'quiz'    && <QuizGame    userId={profile?.id} onComplete={(won, score) => { handleComplete('quiz',    won, score); setActiveGame(null) }} />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* All done banner */}
          {gamesPlayed === 3 && (
            <div className="fade-up" style={{ marginTop:20, padding:'20px 24px', borderRadius:16, background:'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(96,165,250,0.08))', border:'1px solid rgba(167,139,250,0.25)', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, marginBottom:4 }}>All games complete!</div>
              <div style={{ fontSize:13, color:'var(--text-3)' }}>Come back tomorrow for new challenges · You scored <span style={{ color:'var(--campus)', fontWeight:700 }}>{totalScore} pts</span></div>
            </div>
          )}
        </div>

        {/* ── Right: Leaderboard ── */}
        <div style={{ width: isMobile ? '100%' : 268, flexShrink:0, position: isMobile ? 'static' : 'sticky', top:28 }}>
          <Leaderboard profile={profile} scores={scores} refreshKey={leaderRefresh} />
        </div>
      </div>
    </Layout>
  )
}

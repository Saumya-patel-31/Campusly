import { useState, useEffect, useCallback } from 'react'
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

const WORDLE_WORDS = [
  'STUDY','GRADE','CLASS','MAJOR','FINAL','ESSAY','NOTES','BOOKS','CLUBS',
  'LEARN','TUTOR','SCORE','PAPER','FIELD','SMART','BRAIN','FOCUS','BENCH',
  'CHAIR','LUNCH','BADGE','CHALK','BOARD','QUOTE','DREAM','AWARD','SPACE',
  'LIGHT','NIGHT','CROWD','FLOOR','STAGE','PANEL','TRUST','SPARK','PRIDE',
  'FLAME','GRACE','LASER','SOUND','POWER','DANCE','MUSIC','CHESS','TRACK',
  'READS','WORKS','PLANS','RESTS','TEAMS','THINK','WRITE','SOLVE','BUILD',
  'DORMS','GRANT','LOANS','CLUBS','CORPS','HONOR','MERIT','SIGMA','DELTA',
]

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
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

function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent')
  const tArr = target.split('')
  const gArr = guess.split('')
  const used = Array(5).fill(false)
  for (let i = 0; i < 5; i++) {
    if (gArr[i] === tArr[i]) { result[i] = 'correct'; used[i] = true }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && gArr[i] === tArr[j]) { result[i] = 'present'; used[j] = true; break }
    }
  }
  return result
}

const TILE_STATUS_BG = { correct: '#22c55e', present: '#eab308', absent: '#2d3748', '': 'rgba(255,255,255,0.06)' }

function WordleGame({ onComplete, userId }) {
  const todayStr = getTodayStr()
  const storageKey = `campusly_wordle_${userId}_${todayStr}`
  const dailyTarget = seededPick(WORDLE_WORDS, getDailySeed())

  const loadState = () => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey))
      if (s && s.target === dailyTarget) return s
    } catch {}
    return { board: Array(6).fill(null).map(() => Array(5).fill({ letter:'', status:'' })), currentRow:0, currentInput:'', gameOver:false, won:false, target:dailyTarget }
  }

  const [state, setState] = useState(loadState)
  const [showResult, setShowResult] = useState(() => loadState().gameOver)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
    if (state.gameOver) {
      const score = state.won ? Math.max(10, 100 - (state.currentRow - 1) * 15) : 0
      onComplete(state.won, score, state.currentRow)
      setTimeout(() => setShowResult(true), 400)
    }
  }, [state.gameOver])

  const keyColors = {}
  state.board.slice(0, state.currentRow).forEach(row =>
    row.forEach(({ letter, status }) => {
      if (letter && (!keyColors[letter] || status === 'correct')) keyColors[letter] = status
    })
  )

  const handleKey = useCallback((key) => {
    setState(prev => {
      if (prev.gameOver) return prev
      if (key === '⌫' || key === 'Backspace') {
        return prev.currentInput.length ? { ...prev, currentInput: prev.currentInput.slice(0,-1) } : prev
      }
      if (key === 'Enter' || key === 'ENTER') {
        if (prev.currentInput.length !== 5) return prev
        const guess = prev.currentInput.toUpperCase()
        const statuses = evaluateGuess(guess, prev.target)
        const newBoard = prev.board.map((row, i) =>
          i === prev.currentRow ? guess.split('').map((letter, j) => ({ letter, status: statuses[j] })) : row
        )
        const won = statuses.every(s => s === 'correct')
        const nextRow = prev.currentRow + 1
        return { ...prev, board: newBoard, currentRow: nextRow, currentInput: '', won, gameOver: won || nextRow >= 6 }
      }
      if (/^[A-Za-z]$/.test(key) && prev.currentInput.length < 5) {
        return { ...prev, currentInput: prev.currentInput + key.toUpperCase() }
      }
      return prev
    })
  }, [])

  useEffect(() => {
    const h = e => handleKey(e.key)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleKey])

  const displayBoard = state.board.map((row, rIdx) => {
    if (rIdx === state.currentRow && !state.gameOver) {
      return state.currentInput.padEnd(5,' ').split('').map(ch => ({ letter: ch.trim(), status:'', current:true }))
    }
    return row.map(c => ({ ...c, current:false }))
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
      {/* Game-over overlay — click anywhere to dismiss */}
      {showResult && (
        <div onClick={() => setShowResult(false)} style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'rgba(18,16,36,0.97)', border:`1px solid ${state.won ? '#22c55e55' : '#ef444455'}`,
            borderRadius:20, padding:'32px 36px', textAlign:'center', maxWidth:320,
            boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{state.won ? '🎉' : '😔'}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color: state.won ? '#22c55e' : '#ef4444', marginBottom:8 }}>
              {state.won ? `Solved in ${state.currentRow} ${state.currentRow === 1 ? 'try' : 'tries'}!` : 'Better luck tomorrow!'}
            </div>
            <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:16, letterSpacing:'0.06em' }}>
              The word was{' '}
              <span style={{ fontWeight:800, color:'var(--text)', fontSize:20, letterSpacing:'0.18em', display:'block', marginTop:6 }}>
                {state.target}
              </span>
            </div>
            {state.won && <div style={{ fontSize:12, color:'#22c55e', marginBottom:16 }}>+{Math.max(10, 100-(state.currentRow-1)*15)} pts</div>}
            <div style={{ fontSize:11, color:'var(--text-3)' }}>tap anywhere to close</div>
          </div>
        </div>
      )}

      {/* Board */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {displayBoard.map((row, rIdx) => (
          <div key={rIdx} style={{ display:'flex', gap:6 }}>
            {row.map((cell, cIdx) => (
              <div key={cIdx} style={{
                width:54, height:54, borderRadius:8,
                border: `2px solid ${cell.status ? 'transparent' : cell.letter ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)'}`,
                background: TILE_STATUS_BG[cell.status],
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'white',
                transition:'background 0.3s, border-color 0.15s',
              }}>
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* On-screen keyboard */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} style={{ display:'flex', gap:5, justifyContent:'center' }}>
            {row.map(key => {
              const s = keyColors[key] || ''
              return (
                <button key={key} onClick={() => handleKey(key)} style={{
                  width: (key === 'ENTER' || key === '⌫') ? 58 : 36, height:44,
                  borderRadius:6, border:'none', cursor:'pointer',
                  background: s === 'correct' ? '#22c55e' : s === 'present' ? '#eab308' : s === 'absent' ? '#374151' : 'rgba(255,255,255,0.12)',
                  color:'white', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12,
                  transition:'background 0.2s',
                }}>
                  {key}
                </button>
              )
            })}
          </div>
        ))}
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
  { id:'wordle',  name:'Campus Wordle',  emoji:'🔤', desc:'Guess the 5-letter campus word in 6 tries', color:'#22c55e' },
  { id:'connect', name:'Word Connect',   emoji:'🔗', desc:'Group 16 campus words into 4 categories',   color:'#60a5fa' },
  { id:'quiz',    name:'Campus Quiz',    emoji:'🎓', desc:'5 daily questions about campus life',        color:'#f59e0b' },
]

async function upsertGameScore(profile, scores) {
  if (!profile?.id || !profile?.domain) return
  await supabase.from('game_scores').upsert({
    user_id:       profile.id,
    domain:        profile.domain,
    score_date:    getTodayStr(),
    wordle_score:  scores.wordle  ?? 0,
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
      const w = JSON.parse(localStorage.getItem(`campusly_wordle_${uid}_${todayStr}`))
      if (w?.gameOver) s.wordle = w.won ? Math.max(10, 100-(w.currentRow-1)*15) : 0
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
    const newScores = { ...scores, [gameId]: score }
    setScores(newScores)
    await upsertGameScore(profile, newScores)
    setLeaderRefresh(n => n + 1)
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const gamesPlayed = Object.keys(scores).length

  return (
    <Layout>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
        .game-panel { animation: pop 0.25s ease-out; }
      `}</style>
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:24, maxWidth:1060, margin:'0 auto', padding:'28px 20px', alignItems:'flex-start' }}>

        {/* ── Left: Games ── */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Header */}
          <div className="fade-up" style={{ marginBottom:24 }}>
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
              const done = scores[game.id] !== undefined
              const open = activeGame === game.id
              return (
                <div key={game.id} className="fade-up" style={{ animationDelay:`${i*0.06}s` }}>
                  {/* Card header */}
                  <div
                    onClick={() => !done && setActiveGame(open ? null : game.id)}
                    style={{ ...panel, padding:'18px 20px', cursor: done ? 'default' : 'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => { if(!done) e.currentTarget.style.borderColor='rgba(255,255,255,0.18)' }}
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
                      {done ? (
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

                  {/* Inline game panel */}
                  {open && !done && (
                    <div className="game-panel" style={{ ...panel, marginTop:6, padding:'28px 24px' }}>
                      {game.id === 'wordle'  && <WordleGame  userId={profile?.id} onComplete={(won, score) => { handleComplete('wordle', won, score); setActiveGame(null) }} />}
                      {game.id === 'connect' && <ConnectGame userId={profile?.id} onComplete={(won, score) => { handleComplete('connect', won, score); setActiveGame(null) }} />}
                      {game.id === 'quiz'    && <QuizGame    userId={profile?.id} onComplete={(won, score) => { handleComplete('quiz', won, score); setActiveGame(null) }} />}
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

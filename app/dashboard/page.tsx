'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Session = {
  id: string
  duration_minutes: number
  tasks: string[]
  transcript: string | null
  created_at: string
}

type Todo = {
  id: string
  text: string
  completed: boolean
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

export default function DashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [selected, setSelected] = useState(15)
  const [customMins, setCustomMins] = useState('')
  const [customUnit, setCustomUnit] = useState<'s' | 'min' | 'hr'>('min')
  const [showCustom, setShowCustom] = useState(false)
  const [activeNav, setActiveNav] = useState<'dashboard' | 'streak' | 'history'>('dashboard')
  const [isLeaving, setIsLeaving] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: sessions }, { data: todos }] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('todos').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      setSessions(sessions || [])
      setTodos(todos || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    await supabase.from('todos').update({ completed }).eq('id', id)
  }

  async function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }

  async function addTodo(text: string) {
    if (!text.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('todos').insert({
      user_id: user.id,
      text: text.trim(),
      completed: false,
    }).select().single()
    if (data) setTodos(prev => [data, ...prev])
    setNewTodo('')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3a9e52', animation: 'ping 1s infinite' }} />
      </div>
    )
  }

  const lastSession = sessions[0]
  const continuationTasks = lastSession?.tasks || []
  const todayCount = sessions.filter(s =>
    new Date(s.created_at).toDateString() === new Date().toDateString()
  ).length
  const todayMins = sessions
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  const customToSeconds = () => {
    const val = parseFloat(customMins) || 0
    if (customUnit === 's') return Math.max(1, Math.round(val))
    if (customUnit === 'hr') return Math.round(val * 3600)
    return Math.round(val * 60) || 1200
  }
  const customToMinutes = () => {
    const val = parseFloat(customMins) || 0
    if (customUnit === 's') return Math.max(1, Math.ceil(val / 60))
    if (customUnit === 'hr') return Math.round(val * 60)
    return Math.round(val) || 20
  }

  const activeDuration = showCustom && customMins ? customToMinutes() : selected
  const timerSeconds = showCustom && customMins ? customToSeconds() : selected * 60
  const rawName = user?.email?.split('@')[0] ?? 'there'
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  function startSession() {
    setIsLeaving(true)
    setTimeout(() => {
      if (showCustom && customMins) {
        router.push(`/timer?seconds=${timerSeconds}`)
      } else {
        router.push(`/timer?duration=${activeDuration}`)
      }
    }, 380)
  }

  const timerDisplay = showCustom && customMins && customUnit === 's'
    ? String(parseInt(customMins) || 0).padStart(2, '0')
    : showCustom && customMins && customUnit === 'hr'
    ? String(parseFloat(customMins) || 0)
    : String(activeDuration).padStart(2, '0')

  const timerSuffix = showCustom && customMins && customUnit === 's' ? 's' : ':00'

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#faf9f7',
      opacity: isLeaving ? 0 : 1,
      transform: isLeaving ? 'scale(1.05)' : 'scale(1)',
      transition: 'opacity 0.38s cubic-bezier(0.4,0,0.2,1), transform 0.38s cubic-bezier(0.4,0,0.2,1)',
      willChange: 'opacity, transform',
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#f3f1ee',
        borderRight: '1px solid #e8e4de',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 14px',
      }}>

        {/* Logo */}
        <div style={{ padding: '0 8px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 160 160">
            <rect x="18" y="58" width="18" height="52" rx="9" fill="#d4ead8"/>
            <rect x="42" y="36" width="18" height="96" rx="9" fill="#8dcc9e"/>
            <rect x="66" y="18" width="18" height="132" rx="9" fill="#1e5c30"/>
            <rect x="90" y="36" width="18" height="96" rx="9" fill="#3a9e52"/>
            <rect x="114" y="58" width="18" height="52" rx="9" fill="#8dcc9e"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5 }}>Foc<span style={{ color: '#3a9e52' }}>ul</span></span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'streak', label: 'Streak' },
            { key: 'history', label: 'History' },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => setActiveNav(key as 'dashboard' | 'streak' | 'history')}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '9px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: 'none', textAlign: 'left', width: '100%',
                background: activeNav === key ? 'rgba(255,255,255,0.9)' : 'transparent',
                color: activeNav === key ? '#1a1410' : '#a09888',
                boxShadow: activeNav === key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          border: '1px solid #ede9e2',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c0b8a8', marginBottom: 12 }}>Today</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[
              { val: todayCount, lbl: 'sessions' },
              { val: `${todayMins}m`, lbl: 'focused' },
              { val: sessions.length, lbl: 'total' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5 }}>{val}</div>
                <div style={{ fontSize: 10, color: '#b0a898', marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button onClick={signOut} style={{
          fontSize: 12, color: '#c0b8a8', padding: '8px 10px',
          cursor: 'pointer', border: 'none', background: 'transparent',
          textAlign: 'left', borderRadius: 8,
        }}>
          ↗ Sign out
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>

        {activeNav === 'dashboard' && (
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* Greeting */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 13, color: '#b0a898', fontWeight: 400, marginBottom: 4 }}>{greeting}</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: '#1a1410', letterSpacing: -1.5 }}>{firstName}.</p>
            </div>

            {/* Card */}
            <div style={{
              background: '#fff',
              borderRadius: 24,
              border: '1px solid #ede9e2',
              boxShadow: '0 4px 32px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>

              {/* Timer section */}
              <div style={{ padding: '36px 36px 28px', borderBottom: '1px solid #f3f1ee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: -6, lineHeight: 1, color: '#1a1410' }}>
                  {timerDisplay}<span style={{ color: '#e8e2d8' }}>{timerSuffix}</span>
                </div>

                {/* Pills */}
                {!showCustom ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[15, 30].map(d => (
                      <button key={d} onClick={() => setSelected(d)} style={{
                        padding: '8px 20px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: `1.5px solid ${selected === d ? '#1a1410' : '#e8e2d8'}`,
                        color: selected === d ? '#1a1410' : '#b0a898', background: 'transparent',
                        transition: 'all 0.15s',
                      }}>
                        {d} min
                      </button>
                    ))}
                    <button onClick={() => { setShowCustom(true); setTimeout(() => inputRef.current?.focus(), 50) }} style={{
                      padding: '8px 20px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: '1.5px solid #e8e2d8', color: '#b0a898', background: 'transparent',
                    }}>
                      custom
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f7f5f2', borderRadius: 100, padding: '6px 14px' }}>
                    <input ref={inputRef} type="number" min={1} placeholder="20" value={customMins}
                      onChange={e => setCustomMins(e.target.value)}
                      style={{ width: 36, background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, color: '#1a1410', textAlign: 'center', border: 'none', appearance: 'textfield' }} />
                    <div style={{ display: 'flex', gap: 2, background: '#ede9e2', borderRadius: 100, padding: 2 }}>
                      {(['s', 'min', 'hr'] as const).map(unit => (
                        <button key={unit} onClick={() => setCustomUnit(unit)} style={{
                          padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', border: 'none',
                          background: customUnit === unit ? '#1a1410' : 'transparent',
                          color: customUnit === unit ? '#fff' : '#b0a898',
                        }}>{unit}</button>
                      ))}
                    </div>
                    <button onClick={() => { setShowCustom(false); setCustomMins(''); setCustomUnit('min') }}
                      style={{ fontSize: 12, color: '#c0b8a8', cursor: 'pointer', border: 'none', background: 'transparent', marginLeft: 2 }}>✕</button>
                  </div>
                )}
              </div>

              {/* Button section */}
              <div style={{ padding: '20px 28px', borderBottom: continuationTasks.length > 0 ? '1px solid #f3f1ee' : 'none' }}>
                <button onClick={startSession} style={{
                  width: '100%', padding: 16, borderRadius: 14,
                  fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, #2d8a44, #4aaa60)',
                  boxShadow: '0 4px 20px rgba(45,138,68,0.22)',
                  transition: 'opacity 0.15s',
                }}>
                  Start {showCustom && customMins ? `${customMins}${customUnit}` : `${activeDuration} min`} session →
                </button>
              </div>

              {/* Tasks section */}
              {continuationTasks.length > 0 && (
                <div style={{ padding: '20px 28px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c0b8a8', marginBottom: 12 }}>
                    Continuing from {timeAgo(lastSession.created_at)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {continuationTasks.slice(0, 3).map((task, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#706860', lineHeight: 1.4 }}>
                        <span style={{ color: '#3a9e52', fontWeight: 600, flexShrink: 0 }}>→</span>
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── To-do list ── */}
            <div style={{
              background: '#fff',
              borderRadius: 24,
              border: '1px solid #ede9e2',
              boxShadow: '0 4px 32px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              marginTop: 16,
            }}>
              <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f1ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c0b8a8' }}>
                  To-do
                </p>
                {todos.filter(t => t.completed).length > 0 && (
                  <span style={{ fontSize: 11, color: '#c0b8a8' }}>
                    {todos.filter(t => t.completed).length}/{todos.length} done
                  </span>
                )}
              </div>

              {/* Add todo input */}
              <div style={{ padding: '12px 28px', borderBottom: '1px solid #f3f1ee', display: 'flex', gap: 8 }}>
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo(newTodo)}
                  placeholder="Add a task..."
                  style={{
                    flex: 1, fontSize: 13, border: 'none', outline: 'none',
                    background: 'transparent', color: '#1a1410',
                    fontFamily: 'inherit',
                  }}
                />
                {newTodo.trim() && (
                  <button onClick={() => addTodo(newTodo)} style={{
                    fontSize: 18, color: '#3a9e52', border: 'none', background: 'transparent',
                    cursor: 'pointer', lineHeight: 1, padding: '0 4px',
                  }}>+</button>
                )}
              </div>

              {/* Todo items */}
              <div style={{ padding: '8px 0', maxHeight: 280, overflowY: 'auto' }}>
                {todos.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#c0b8a8', padding: '12px 28px', textAlign: 'center' }}>
                    Tasks from your sessions will appear here
                  </p>
                ) : (
                  <>
                    {/* Incomplete */}
                    {todos.filter(t => !t.completed).map(todo => (
                      <div key={todo.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '9px 28px', cursor: 'default',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#faf9f7')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <button onClick={() => toggleTodo(todo.id, true)} style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                          border: '1.5px solid #d4cfc8', background: 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} />
                        <span style={{ fontSize: 13, color: '#4a3f35', lineHeight: 1.45, flex: 1 }}>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} style={{
                          fontSize: 14, color: '#d4cfc8', border: 'none', background: 'transparent',
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', lineHeight: 1,
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >×</button>
                      </div>
                    ))}

                    {/* Completed (collapsed, muted) */}
                    {todos.filter(t => t.completed).map(todo => (
                      <div key={todo.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '7px 28px', opacity: 0.45,
                      }}>
                        <button onClick={() => toggleTodo(todo.id, false)} style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                          border: '1.5px solid #3a9e52', background: '#3a9e52',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                        }}>✓</button>
                        <span style={{ fontSize: 13, color: '#a09888', lineHeight: 1.45, textDecoration: 'line-through', flex: 1 }}>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} style={{
                          fontSize: 14, color: '#d4cfc8', border: 'none', background: 'transparent',
                          cursor: 'pointer', lineHeight: 1,
                        }}>×</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'streak' && (() => {
          // Build last 84 days (12 weeks) of activity
          const days: { date: string; count: number; mins: number }[] = []
          for (let i = 83; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toDateString()
            const daySessions = sessions.filter(s => new Date(s.created_at).toDateString() === dateStr)
            days.push({
              date: dateStr,
              count: daySessions.length,
              mins: daySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
            })
          }

          // Calculate streak
          let streak = 0
          const today = new Date().toDateString()
          const yesterday = new Date(Date.now() - 86400000).toDateString()
          const reversedDays = [...days].reverse()
          // start from today or yesterday
          const startIdx = reversedDays.findIndex(d => d.date === today || d.date === yesterday)
          if (startIdx !== -1 && reversedDays[startIdx].count > 0) {
            for (let i = startIdx; i < reversedDays.length; i++) {
              if (reversedDays[i].count > 0) streak++
              else break
            }
          }

          const totalMins = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
          const weeks = []
          for (let w = 0; w < 12; w++) weeks.push(days.slice(w * 7, w * 7 + 7))
          const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

          // Best streak calc (longest ever run)
          let bestStreak = 0, run = 0
          for (const d of days) { if (d.count > 0) { run++; if (run > bestStreak) bestStreak = run } else run = 0 }
          const circumference = 2 * Math.PI * 62
          const streakGoal = 30
          const pct = Math.min(streak / streakGoal, 1)
          const offset = circumference * (1 - pct)

          return (
            <div style={{ width: '100%', maxWidth: 420, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

              {/* Ring hero */}
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="90" cy="90" r="62" fill="none" stroke="#f0ede8" strokeWidth="12" />
                  <circle cx="90" cy="90" r="62" fill="none" stroke="#3a9e52" strokeWidth="12"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#c0b8a8', letterSpacing: 2, textTransform: 'uppercase' }}>streak</span>
                  <span style={{ fontSize: 56, fontWeight: 900, color: '#1a1410', letterSpacing: -4, lineHeight: 1 }}>{streak}</span>
                  <span style={{ fontSize: 12, color: '#b0a898' }}>days 🔥</span>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ width: '100%', background: '#fff', borderRadius: 20, border: '1px solid #ede9e2', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', display: 'flex', overflow: 'hidden' }}>
                {[
                  { val: sessions.length, label: 'sessions' },
                  { val: `${Math.round(totalMins / 60)}h`, label: 'focused' },
                  { val: bestStreak, label: 'best streak' },
                ].map(({ val, label }, i) => (
                  <div key={label} style={{
                    flex: 1, padding: '18px 14px', textAlign: 'center',
                    borderRight: i < 2 ? '1px solid #f3f1ee' : 'none',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1410', letterSpacing: -1 }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#b0a898', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div style={{ width: '100%', background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #ede9e2', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c0b8a8', marginBottom: 12 }}>Last 12 weeks</p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {dayLabels.map((d, i) => (
                    <div key={i} style={{ width: 26, textAlign: 'center', fontSize: 9, color: '#d4cfc8', fontWeight: 600 }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', gap: 4 }}>
                      {week.map((day, di) => {
                        const isToday = day.date === today
                        const bg = day.count === 0 ? '#f0ede8' : day.count === 1 ? '#b8e4c0' : day.count === 2 ? '#6abe7e' : '#3a9e52'
                        return (
                          <div key={di} title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}, ${day.mins}m`} style={{
                            width: 26, height: 26, borderRadius: 6, background: bg, flexShrink: 0,
                            border: isToday ? '2px solid #1a1410' : '2px solid transparent',
                          }} />
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 9, color: '#c0b8a8' }}>Less</span>
                  {['#f0ede8', '#b8e4c0', '#6abe7e', '#3a9e52'].map(c => (
                    <div key={c} style={{ width: 11, height: 11, borderRadius: 3, background: c }} />
                  ))}
                  <span style={{ fontSize: 9, color: '#c0b8a8' }}>More</span>
                </div>
              </div>
            </div>
          )
        })()}

        {activeNav === 'history' && (
          <div style={{ width: '100%', maxWidth: 480, alignSelf: 'flex-start' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1410', marginBottom: 20 }}>Session history</h2>
            {sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#b0a898' }}>No sessions yet. Start your first one!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(session => (
                  <div key={session.id} style={{
                    background: '#fff', borderRadius: 16, padding: '14px 18px',
                    border: '1px solid #ede9e2', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3a9e52', flexShrink: 0, marginTop: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1410' }}>{session.duration_minutes} min session</span>
                        <span style={{ fontSize: 11, color: '#c0b8a8' }}>{timeAgo(session.created_at)}</span>
                      </div>
                      {session.tasks?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {session.tasks.map((t, i) => (
                            <p key={i} style={{ fontSize: 12, color: '#a09888', lineHeight: 1.4 }}>→ {t}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import OnboardingModal from './OnboardingModal'
import { FocusCoach } from './FocusCoach'

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
  const [user, setUser] = useState<{ email?: string; user_metadata?: { display_name?: string } } | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(15)
  const [customMins, setCustomMins] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [activeNav, setActiveNav] = useState<'dashboard' | 'history'>('dashboard')
  const [isLeaving, setIsLeaving] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const [mode, setMode] = useState<'focus' | 'accountability'>('focus')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close user menu on outside-click or Esc
  useEffect(() => {
    if (!userMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

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

      // Show onboarding only for users with no sessions who haven't seen it yet
      const hasOnboarded = localStorage.getItem('focul_onboarded')
      if (!hasOnboarded && (!sessions || sessions.length === 0)) {
        setShowOnboarding(true)
      }
    }
    load()
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { setEditingName(false); return }
    await supabase.auth.updateUser({ data: { display_name: trimmed } })
    setUser(prev => prev ? { ...prev, user_metadata: { ...prev.user_metadata, display_name: trimmed } } : prev)
    setEditingName(false)
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F5EF' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3D6B47', animation: 'ping 1s infinite' }} />
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

  const customToSeconds = () => (parseInt(customMins) || 20) * 60
  const customToMinutes = () => parseInt(customMins) || 20

  const activeDuration = showCustom && customMins ? customToMinutes() : selected
  const timerSeconds = showCustom && customMins ? customToSeconds() : selected * 60
  // Prefer the display_name they set on signup, fall back to email prefix
  const rawName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there'
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const hasCustomName = !!user?.user_metadata?.display_name

  function startSession() {
    setIsLeaving(true)
    setTimeout(() => {
      const modeParam = `&mode=${mode}`
      if (showCustom && customMins) {
        router.push(`/timer?seconds=${timerSeconds}${modeParam}`)
      } else {
        router.push(`/timer?duration=${activeDuration}${modeParam}`)
      }
    }, 380)
  }

  function startCoachSession(minutes: number) {
    setIsLeaving(true)
    setTimeout(() => {
      router.push(`/timer?duration=${minutes}&mode=${mode}`)
    }, 380)
  }

  const timerDisplay = String(activeDuration).padStart(2, '0')
  const timerSuffix = ':00'

  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F7F5EF',
        fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        opacity: isLeaving ? 0 : 1,
        transition: 'opacity 0.38s ease',
        paddingBottom: 80, // space for bottom nav
      }}>
        {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}

        {/* Mobile top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: '#f3f1ee',
          borderBottom: '1px solid #e8e4de',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="20" height="20" viewBox="0 0 160 160">
              <rect x="18" y="58" width="18" height="52" rx="9" fill="#d4ead8"/>
              <rect x="42" y="36" width="18" height="96" rx="9" fill="#8dcc9e"/>
              <rect x="66" y="18" width="18" height="132" rx="9" fill="#1e5c30"/>
              <rect x="90" y="36" width="18" height="96" rx="9" fill="#3D6B47"/>
              <rect x="114" y="58" width="18" height="52" rx="9" fill="#8dcc9e"/>
            </svg>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1F3A24', letterSpacing: -0.5 }}>
              Foc<span style={{ color: '#3D6B47' }}>ul</span>
            </span>
          </div>
          <button onClick={signOut} style={{
            fontSize: 12, color: '#c0b8a8', border: 'none',
            background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          }}>Sign out</button>
        </div>

        {/* Mobile main content */}
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Greeting */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: '#b0a898', marginBottom: 2 }}>{greeting}</p>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input ref={nameInputRef} value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  onBlur={saveName} placeholder="Your first name" autoFocus
                  style={{ fontSize: 26, fontWeight: 800, color: '#1F3A24', letterSpacing: -1,
                    border: 'none', borderBottom: '2px solid #3D6B47', outline: 'none',
                    background: 'transparent', fontFamily: 'inherit', width: 180, padding: '0 0 2px 0' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#1F3A24', letterSpacing: -1 }}>{firstName}.</p>
                {!hasCustomName && (
                  <button onClick={() => { setNameInput(''); setEditingName(true) }}
                    style={{ fontSize: 11, color: '#c0b8a8', background: 'transparent',
                      border: '1px solid #e8e2d8', borderRadius: 6, padding: '2px 7px', cursor: 'pointer' }}>
                    set name
                  </button>
                )}
              </div>
            )}
            {todayCount > 0 && (
              <p style={{ fontSize: 12, color: '#b0a898', marginTop: 4 }}>
                {todayCount} session{todayCount > 1 ? 's' : ''} · {todayMins} min today
              </p>
            )}
          </div>

          {/* Focus Coach (mobile) */}
          {activeNav === 'dashboard' && (
            <FocusCoach onStart={startCoachSession} isMobile />
          )}

          {/* Timer card */}
          {activeNav === 'dashboard' && (
            <>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E8E4DA', boxShadow: 'none', overflow: 'hidden' }}>
                {/* Timer display */}
                <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid #f3f1ee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -4, lineHeight: 1, color: '#1F3A24' }}>
                    {timerDisplay}<span style={{ color: '#e8e2d8' }}>{timerSuffix}</span>
                  </div>
                  {!showCustom ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[15, 30].map(d => (
                        <button key={d} onClick={() => setSelected(d)} style={{
                          padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', border: `1.5px solid ${selected === d ? '#1F3A24' : '#e8e2d8'}`,
                          color: selected === d ? '#1F3A24' : '#b0a898', background: 'transparent',
                        }}>{d} min</button>
                      ))}
                      <button onClick={() => { setShowCustom(true); setTimeout(() => inputRef.current?.focus(), 50) }} style={{
                        padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: '1.5px solid #e8e2d8', color: '#b0a898', background: 'transparent',
                      }}>custom</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f7f5f2', borderRadius: 100, padding: '6px 16px' }}>
                      <input ref={inputRef} type="number" min={1} placeholder="20" value={customMins}
                        onChange={e => setCustomMins(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && startSession()}
                        style={{ width: 40, background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 700, color: '#1F3A24', textAlign: 'center', border: 'none' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#b0a898' }}>min</span>
                      <button onClick={() => { setShowCustom(false); setCustomMins('') }}
                        style={{ fontSize: 12, color: '#c0b8a8', cursor: 'pointer', border: 'none', background: 'transparent', marginLeft: 4 }}>✕</button>
                    </div>
                  )}
                </div>

                {/* Mode + Start */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', background: '#f3f1ee', borderRadius: 100, padding: 3 }}>
                      {(['focus', 'accountability'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)} style={{
                          padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: mode === m ? '#1F3A24' : 'transparent',
                          color: mode === m ? '#fff' : '#b0a898', transition: 'all 0.18s',
                        }}>{m === 'focus' ? 'Focus' : 'Accountability'}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={startSession} style={{
                    width: '100%', padding: '15px 0', borderRadius: 8, fontSize: 15, fontWeight: 700,
                    color: '#fff', cursor: 'pointer', border: 'none',
                    background: '#1F3A24',
                    boxShadow: 'none',
                  }}>
                    Start {activeDuration} min →
                  </button>
                </div>

                {/* Continuation tasks */}
                {continuationTasks.length > 0 && (
                  <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #f3f1ee' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c0b8a8', marginBottom: 8 }}>
                      From {timeAgo(lastSession.created_at)}
                    </p>
                    {continuationTasks.slice(0, 3).map((task, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#8a7e72', lineHeight: 1.45, marginBottom: 4 }}>
                        <span style={{ color: '#c8dcc0', flexShrink: 0 }}>·</span>{task}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* To-do */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E8E4DA', boxShadow: 'none', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f1ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c0b8a8' }}>To-do</p>
                  {todos.filter(t => t.completed).length > 0 && (
                    <span style={{ fontSize: 11, color: '#c0b8a8' }}>{todos.filter(t => t.completed).length}/{todos.length} done</span>
                  )}
                </div>
                <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f1ee', display: 'flex', gap: 8 }}>
                  <input value={newTodo} onChange={e => setNewTodo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTodo(newTodo)}
                    placeholder="Add a task..."
                    style={{ flex: 1, fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: '#1F3A24', fontFamily: 'inherit' }} />
                  {newTodo.trim() && (
                    <button onClick={() => addTodo(newTodo)} style={{ fontSize: 20, color: '#3D6B47', border: 'none', background: 'transparent', cursor: 'pointer' }}>+</button>
                  )}
                </div>
                <div style={{ padding: '6px 0', maxHeight: 240, overflowY: 'auto' }}>
                  {todos.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#c0b8a8', padding: '12px 20px', textAlign: 'center' }}>Add tasks or finish a session to get started</p>
                  ) : (
                    <>
                      {todos.filter(t => !t.completed).map(todo => (
                        <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 20px' }}>
                          <button onClick={() => toggleTodo(todo.id, true)} style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                            border: '1.5px solid #d4cfc8', background: 'transparent', cursor: 'pointer',
                          }} />
                          <span style={{ fontSize: 13, color: '#4a3f35', lineHeight: 1.45, flex: 1 }}>{todo.text}</span>
                          <button onClick={() => deleteTodo(todo.id)} style={{ fontSize: 16, color: '#d4cfc8', border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
                        </div>
                      ))}
                      {todos.filter(t => t.completed).map(todo => (
                        <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 20px', opacity: 0.45 }}>
                          <button onClick={() => toggleTodo(todo.id, false)} style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                            border: '1.5px solid #3D6B47', background: '#3D6B47', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10,
                          }}>✓</button>
                          <span style={{ fontSize: 13, color: '#a09888', lineHeight: 1.45, textDecoration: 'line-through', flex: 1 }}>{todo.text}</span>
                          <button onClick={() => deleteTodo(todo.id)} style={{ fontSize: 16, color: '#d4cfc8', border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* History tab */}
          {activeNav === 'history' && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F3A24', marginBottom: 14 }}>Session history</h2>
              {sessions.length === 0 ? (
                <p style={{ fontSize: 13, color: '#b0a898' }}>No sessions yet. Start your first one!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map(session => (
                    <div key={session.id} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', border: '1px solid #E8E4DA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F3A24' }}>{session.duration_minutes} min</span>
                        <span style={{ fontSize: 11, color: '#c0b8a8' }}>{timeAgo(session.created_at)}</span>
                      </div>
                      {session.tasks?.length > 0 && session.tasks.map((t, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#a09888', lineHeight: 1.4 }}>→ {t}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e8e4de',
          display: 'flex', padding: '8px 0 20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}>
          {[
            { key: 'dashboard', label: 'Home', icon: '⌂' },
            { key: 'history', label: 'History', icon: '◷' },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveNav(key as 'dashboard' | 'history')} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: activeNav === key ? '#1F3A24' : '#c0b8a8' }}>{label}</span>
              {activeNav === key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#3D6B47' }} />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Streak calculation (used in top nav pill + today strip)
  const todayDateStr = new Date().toDateString()
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString()
  const days84: { date: string; count: number }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toDateString()
    days84.push({ date: ds, count: sessions.filter(s => new Date(s.created_at).toDateString() === ds).length })
  }
  let computedStreak = 0
  const revDays = [...days84].reverse()
  const sIdx = revDays.findIndex(d => d.date === todayDateStr || d.date === yesterdayStr)
  if (sIdx !== -1 && revDays[sIdx].count > 0) {
    for (let i = sIdx; i < revDays.length; i++) { if (revDays[i].count > 0) computedStreak++; else break }
  }
  const todayTaskCount = sessions
    .filter(s => new Date(s.created_at).toDateString() === todayDateStr)
    .reduce((sum, s) => sum + (s.tasks?.length || 0), 0)
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ' ·')

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#F7F5EF',
      color: '#1F3A24',
      opacity: isLeaving ? 0 : 1,
      transform: isLeaving ? 'scale(1.02)' : 'scale(1)',
      transition: 'opacity 0.38s cubic-bezier(0.4,0,0.2,1), transform 0.38s cubic-bezier(0.4,0,0.2,1)',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}

      {/* ── Top nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid #E8E4DA',
        background: 'rgba(247,245,239,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
          <span style={{ width: 22, height: 22, display: 'inline-block' }}>
            <svg viewBox="0 0 160 160" style={{ display: 'block', width: '100%', height: '100%' }}>
              <rect x="38" y="61" width="12" height="38" rx="6" fill="#d4ead8"/>
              <rect x="56" y="46" width="12" height="69" rx="6" fill="#8dcc9e"/>
              <rect x="74" y="33" width="12" height="94" rx="6" fill="#1e5c30"/>
              <rect x="92" y="46" width="12" height="69" rx="6" fill="#8dcc9e"/>
              <rect x="110" y="61" width="12" height="38" rx="6" fill="#d4ead8"/>
            </svg>
          </span>
          <span>Focul</span>
        </div>

        <div style={{ display: 'flex', gap: 2, background: '#EFEBE1', padding: 3, borderRadius: 7 }}>
          {([
            { key: 'dashboard', label: 'Today' },
            { key: 'history', label: 'History' },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => setActiveNav(key)}
              style={{
                padding: '7px 18px', borderRadius: 5,
                fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer', outline: 'none',
                background: activeNav === key ? '#fff' : 'transparent',
                color: activeNav === key ? '#1F3A24' : '#8A8678',
                boxShadow: activeNav === key ? '0 1px 3px rgba(31,58,36,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
          <button onClick={() => router.push('/settings')}
            style={{
              padding: '7px 18px', borderRadius: 5,
              fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer', outline: 'none',
              background: 'transparent', color: '#8A8678',
              transition: 'all 0.15s',
            }}>
            Settings
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {computedStreak > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 500,
              color: '#3D6B47', background: '#EFF4E8',
              padding: '6px 12px', borderRadius: 6,
            }}>
              🔥 {computedStreak}-day streak
            </span>
          )}
          {/* User menu: clickable initials avatar opens a popover with email + sign out */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: userMenuOpen ? '#e3ecdb' : '#eef3e7',
                border: userMenuOpen ? '1px solid rgba(30,55,32,0.22)' : '1px solid rgba(30,55,32,0.10)',
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 600, color: '#1e5c30',
                letterSpacing: '-0.01em', fontFamily: 'inherit',
                boxShadow: userMenuOpen ? '0 2px 6px rgba(13,31,21,0.10)' : '0 1px 2px rgba(13,31,21,0.04)',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              }}>
              {firstName.charAt(0).toUpperCase()}
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  minWidth: 240, zIndex: 50,
                  background: '#fffdf8',
                  border: '1px solid rgba(30,55,32,0.10)',
                  borderRadius: 8,
                  boxShadow:
                    '0 1px 2px rgba(13,31,21,0.04), 0 12px 32px rgba(13,31,21,0.10)',
                  overflow: 'hidden',
                  animation: 'menuIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                  transformOrigin: 'top right',
                }}>
                {/* Identity block */}
                <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#eef3e7',
                    border: '1px solid rgba(30,55,32,0.10)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 14, fontWeight: 600, color: '#1e5c30',
                    flexShrink: 0,
                  }}>
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0d1f15', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      {firstName}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'rgba(13,31,21,0.55)', marginTop: 3,
                      lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {user?.email || 'signed in'}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(30,55,32,0.08)' }} />

                {/* Settings link */}
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); router.push('/settings') }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '11px 16px',
                    fontSize: 13, color: '#0d1f15',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,55,32,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 14, height: 14, display: 'inline-grid', placeItems: 'center', color: 'rgba(13,31,21,0.55)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </span>
                  Settings
                </button>

                {/* Sign out */}
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); signOut() }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '11px 16px',
                    fontSize: 13, color: '#0d1f15',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,55,32,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 14, height: 14, display: 'inline-grid', placeItems: 'center', color: 'rgba(13,31,21,0.55)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </span>
                  Sign out
                </button>
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes menuIn {
              from { opacity: 0; transform: scale(0.94) translateY(-4px); }
              to   { opacity: 1; transform: scale(1)    translateY(0); }
            }
          `}</style>
        </div>
      </nav>


      {/* ── Main ── */}
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: activeNav === 'dashboard' ? '36px 40px 64px' : '48px 32px' }}>

        {activeNav === 'dashboard' && (
          <div style={{ width: '100%' }}>

            {/* Greeting */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'rgba(13,31,21,0.62)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dateLabel}</p>

              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: '#0d1f15', letterSpacing: '-0.025em' }}>{greeting},</span>
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    onBlur={saveName}
                    placeholder="your name"
                    autoFocus
                    style={{
                      fontSize: 32, fontWeight: 600, color: '#0d1f15', letterSpacing: '-0.025em',
                      border: 'none', borderBottom: '2px solid #1e5c30', outline: 'none',
                      background: 'transparent', fontFamily: 'inherit', width: 200,
                      padding: '0 0 2px 0',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(13,31,21,0.42)' }}>↵</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 32, fontWeight: 600, color: '#0d1f15', letterSpacing: '-0.025em', lineHeight: 1.15, margin: 0 }}>
                    {greeting}, {firstName}.
                  </h1>
                  {!hasCustomName && (
                    <button
                      onClick={() => { setNameInput(''); setEditingName(true) }}
                      style={{
                        fontSize: 11, color: 'rgba(13,31,21,0.42)', background: 'transparent',
                        border: '1px solid rgba(30,55,32,0.18)', borderRadius: 6, padding: '3px 8px',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      set name
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Bento grid: dark timer hero left, coach/stats/tasks right ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, alignItems: 'start' }}>

            {/* ── Hero timer card (dark deep-forest) ── */}
            {/* Sticky + natural height: stretching to match a long right column
                leaves a huge empty dark void above the timer */}
            <div style={{
              background: '#13291B',
              borderRadius: 6,
              border: '1px solid #13291B',
              padding: '72px 48px 64px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              position: 'sticky', top: 92,
            }}>
              <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#7BA177', marginBottom: 22,
              }}>
                Ready when you are
              </p>

              <div style={{
                fontSize: 128, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1,
                color: '#F7F5EF', fontVariantNumeric: 'tabular-nums', marginBottom: 18,
              }}>
                {timerDisplay}<span style={{ color: '#7BA177' }}>{timerSuffix}</span>
              </div>

              {/* Soundwave divider */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 22, marginBottom: 18 }}>
                {[7, 13, 22, 13, 7].map((h, i) => (
                  <span key={i} style={{
                    width: 4, height: h, borderRadius: 99,
                    background: i === 2 ? '#7BA177' : i === 1 || i === 3 ? '#3D6B47' : '#27402e',
                  }} />
                ))}
              </div>

              <p style={{ fontSize: 14, color: '#5F7D66', marginBottom: 32 }}>
                Bell rings, then 60s voice debrief
              </p>

              {/* Duration pills */}
              {!showCustom ? (
                <div style={{
                  display: 'inline-flex', background: '#0E1F14', padding: 3, borderRadius: 7,
                  marginBottom: 32, alignSelf: 'center',
                }}>
                  {[15, 30].map(d => (
                    <button key={d} onClick={() => setSelected(d)} style={{
                      padding: '9px 22px', borderRadius: 5, fontSize: 14, fontWeight: 500,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                      background: selected === d && !showCustom ? '#3D6B47' : 'transparent',
                      color: selected === d && !showCustom ? '#F7F5EF' : '#7BA177',
                      transition: 'all 0.15s',
                    }}>
                      {d} min
                    </button>
                  ))}
                  <button onClick={() => { setShowCustom(true); setTimeout(() => inputRef.current?.focus(), 50) }} style={{
                    padding: '9px 22px', borderRadius: 5, fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                    background: 'transparent', color: '#7BA177',
                  }}>
                    Custom
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#0E1F14', borderRadius: 7, padding: '8px 18px',
                  marginBottom: 32, alignSelf: 'center',
                }}>
                  <input ref={inputRef} type="number" min={1} placeholder="20" value={customMins}
                    onChange={e => setCustomMins(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startSession()}
                    style={{
                      width: 48, background: 'transparent', outline: 'none', fontSize: 14,
                      fontWeight: 600, color: '#F7F5EF', textAlign: 'center', border: 'none', fontFamily: 'inherit',
                    }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#7BA177' }}>min</span>
                  <button onClick={() => { setShowCustom(false); setCustomMins('') }}
                    style={{ fontSize: 13, color: '#5F7D66', cursor: 'pointer', border: 'none', background: 'transparent', marginLeft: 4 }}>✕</button>
                </div>
              )}

              {/* Mode toggle (compact, sits above start button) */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', background: '#0E1F14', borderRadius: 7, padding: 3 }}>
                  {(['focus', 'accountability'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      padding: '6px 18px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                      outline: 'none',
                      background: mode === m ? '#3D6B47' : 'transparent',
                      color: mode === m ? '#F7F5EF' : '#7BA177',
                      transition: 'all 0.18s',
                    }}
                      onFocus={e => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1.5px #7BA177' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}>
                      {m === 'focus' ? 'Focus' : 'Accountability'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <button onClick={startSession} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 36px', borderRadius: 6, alignSelf: 'center',
                fontSize: 16, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                color: '#13291B',
                background: '#F7F5EF',
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}>
                Start {activeDuration}-min session
                <span style={{ fontSize: 14 }}>→</span>
              </button>
            </div>

            {/* ── Right column: coach + stats + tasks ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* Focus Coach (desktop) */}
            <FocusCoach onStart={startCoachSession} />

            {/* ── Today (card) ── */}
            <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 18, paddingBottom: 14,
                borderBottom: '1px solid rgba(30,55,32,0.06)',
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#0d1f15', margin: 0 }}>
                  Today
                </h2>
                <span style={{ fontSize: 12, color: 'rgba(13,31,21,0.42)' }}>{dateLabel}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{
                    fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em',
                    color: '#1F3A24', fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1, marginBottom: 8,
                  }}>{todayCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,21,0.62)', lineHeight: 1.4 }}>
                    <strong style={{ color: '#0d1f15', fontWeight: 600 }}>sessions</strong> · {todayMins} min focused
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em',
                    color: '#1F3A24', fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1, marginBottom: 8,
                  }}>{todayTaskCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,21,0.62)', lineHeight: 1.4 }}>
                    <strong style={{ color: '#0d1f15', fontWeight: 600 }}>tasks</strong> captured from debriefs
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em',
                    color: '#1F3A24',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1, marginBottom: 8,
                  }}>{computedStreak}</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,31,21,0.62)', lineHeight: 1.4 }}>
                    <strong style={{ color: '#0d1f15', fontWeight: 600 }}>day streak</strong> · {computedStreak === 0 ? 'start one today' : 'keep it going'}
                  </div>
                </div>
              </div>

              {/* This week — slim 7-day strip, lives inside Today */}
              {(() => {
                const week7 = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - i))
                  const dateStr = d.toDateString()
                  const daySessions = sessions.filter(s => new Date(s.created_at).toDateString() === dateStr)
                  const mins = daySessions.reduce((s, x) => s + (x.duration_minutes || 0), 0)
                  const isToday = i === 6
                  const dayLabel = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()]
                  return { mins, isToday, dayLabel }
                })
                const maxMins = 90
                const r = 16, circ = 2 * Math.PI * r
                return (
                  <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(30,55,32,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(13,31,21,0.42)', margin: 0 }}>This week</p>
                      <span style={{ fontSize: 11, color: 'rgba(13,31,21,0.42)' }}>
                        {week7.filter(d => d.mins > 0).length} of 7 days
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                      {week7.map((d, i) => {
                        const pct = d.mins > 0 ? Math.min(d.mins / maxMins, 1) : 0
                        const strokeLen = circ * pct
                        const offset = circ * 0.25
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
                              <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(30,55,32,0.08)" strokeWidth="3" />
                              {d.mins > 0 && (
                                <circle cx="22" cy="22" r={r} fill="none"
                                  stroke={d.isToday ? '#0d1f15' : '#3D6B47'}
                                  strokeWidth="3"
                                  strokeDasharray={`${strokeLen} ${circ}`}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                              )}
                              <text x="22" y="26" textAnchor="middle"
                                style={{ fontFamily: 'inherit', fontSize: 9, fontWeight: 600, fill: d.mins > 0 ? (d.isToday ? '#0d1f15' : '#3D6B47') : 'rgba(13,31,21,0.32)' }}>
                                {d.mins > 0 ? `${d.mins}m` : '—'}
                              </text>
                            </svg>
                            <span style={{
                              fontSize: 11,
                              fontWeight: d.isToday ? 600 : 500,
                              color: d.isToday ? '#0d1f15' : 'rgba(13,31,21,0.42)',
                              letterSpacing: '0.04em',
                            }}>{d.dayLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </section>

            {/* ── Coming up (card) ── */}
            {continuationTasks.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 18, paddingBottom: 14,
                  borderBottom: '1px solid rgba(30,55,32,0.06)',
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#0d1f15', margin: 0 }}>
                    Coming up
                  </h2>
                  <span style={{ fontSize: 12, color: 'rgba(13,31,21,0.42)' }}>
                    From your last debrief · {timeAgo(lastSession.created_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {continuationTasks.slice(0, 5).map((task, i, arr) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '13px 0', fontSize: 15, color: '#0d1f15',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(30,55,32,0.06)' : 'none',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5,
                        border: '1.5px solid rgba(30,55,32,0.18)', flexShrink: 0, marginTop: 2,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }} />
                      <span style={{ flex: 1, lineHeight: 1.5 }}>{task}</span>
                      <span style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 4,
                        background: '#EFF4E8', color: '#3D6B47', fontWeight: 600,
                      }}>action</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Your tasks (card) ── */}
            <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 18, paddingBottom: 14,
                borderBottom: '1px solid rgba(30,55,32,0.06)',
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#0d1f15', margin: 0 }}>
                  Your tasks
                </h2>
                <span style={{ fontSize: 12, color: 'rgba(13,31,21,0.42)' }}>
                  {todos.filter(t => t.completed).length > 0
                    ? `${todos.filter(t => t.completed).length}/${todos.length} done`
                    : 'Add manually'}
                </span>
              </div>

              {/* Add todo input — underline style, no box */}
              <div style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '14px 0',
                borderBottom: '1px solid rgba(30,55,32,0.06)',
              }}>
                <span style={{ color: 'rgba(13,31,21,0.42)', fontSize: 18, lineHeight: 1, width: 18, textAlign: 'center', flexShrink: 0 }}>+</span>
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo(newTodo)}
                  placeholder="Add a task..."
                  style={{
                    flex: 1, fontSize: 15, border: 'none', outline: 'none',
                    background: 'transparent', color: '#0d1f15', fontFamily: 'inherit',
                  }}
                />
                {newTodo.trim() && (
                  <button onClick={() => addTodo(newTodo)} style={{
                    fontSize: 13, fontWeight: 600, color: '#1e5c30',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    padding: '0 6px',
                  }}>Add</button>
                )}
              </div>

              {/* Todo items — flow on cream, no card */}
              <div style={{ paddingTop: 0 }}>
                {todos.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'rgba(13,31,21,0.42)', padding: '20px 0', textAlign: 'center' }}>
                    Add tasks or finish a session to get started
                  </p>
                ) : (
                  <>
                    {todos.filter(t => !t.completed).map((todo, i, arr) => (
                      <div key={todo.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '13px 0',
                        borderBottom: i < arr.length - 1 || todos.filter(t => t.completed).length > 0 ? '1px solid rgba(30,55,32,0.06)' : 'none',
                      }}>
                        <button onClick={() => toggleTodo(todo.id, true)} style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                          border: '1.5px solid rgba(30,55,32,0.18)', background: 'transparent',
                          cursor: 'pointer',
                        }} />
                        <span style={{ fontSize: 15, color: '#0d1f15', lineHeight: 1.5, flex: 1 }}>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} style={{
                          fontSize: 16, color: 'rgba(13,31,21,0.42)', border: 'none', background: 'transparent',
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', lineHeight: 1,
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >×</button>
                      </div>
                    ))}

                    {todos.filter(t => t.completed).map((todo, i, arr) => (
                      <div key={todo.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '11px 0', opacity: 0.45,
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(30,55,32,0.06)' : 'none',
                      }}>
                        <button onClick={() => toggleTodo(todo.id, false)} style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                          border: '1.5px solid #1e5c30', background: '#1e5c30',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                        }}>✓</button>
                        <span style={{ fontSize: 15, color: 'rgba(13,31,21,0.42)', lineHeight: 1.5, textDecoration: 'line-through', flex: 1 }}>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} style={{
                          fontSize: 16, color: 'rgba(13,31,21,0.42)', border: 'none', background: 'transparent',
                          cursor: 'pointer', lineHeight: 1,
                        }}>×</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
            </div>{/* end right column */}
            </div>{/* end bento grid */}
          </div>
        )}

        {activeNav === 'history' && (() => {
          const totalMins = sessions.reduce((s, x) => s + x.duration_minutes, 0)
          const avgMins = sessions.length ? Math.round(totalMins / sessions.length) : 0
          const totalHrs = Math.floor(totalMins / 60)
          const remMins = totalMins % 60
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const dayCounts = [0, 0, 0, 0, 0, 0, 0]
          const hourCounts = Array(24).fill(0)
          sessions.forEach(s => {
            const d = new Date(s.created_at)
            dayCounts[d.getDay()]++
            hourCounts[d.getHours()]++
          })
          const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
          const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
          const fmtHour = (h: number) => {
            const ampm = h < 12 ? 'AM' : 'PM'
            const h12 = h % 12 || 12
            return `${h12}–${(h12 % 12) + 1} ${ampm}`
          }
          const allTasks = sessions.flatMap(s => s.tasks || [])
          const recentTopics = allTasks.filter((t, i, a) => a.indexOf(t) === i).slice(0, 6)

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, alignItems: 'start' }}>

              {/* Session list — one calm card, hairline rows, tasks as a muted single line */}
              <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6, paddingBottom: 14, borderBottom: '1px solid rgba(30,55,32,0.06)',
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#1F3A24', margin: 0 }}>Sessions</h2>
                  <span style={{ fontSize: 12, color: '#9A957F' }}>{sessions.length} total</span>
                </div>
                {sessions.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9A957F', padding: '20px 0', textAlign: 'center' }}>No sessions yet. Start your first one!</p>
                ) : (
                  sessions.map((session, idx) => (
                    <div key={session.id} style={{
                      display: 'flex', gap: 14, alignItems: 'baseline',
                      padding: '13px 0',
                      borderBottom: idx < sessions.length - 1 ? '1px solid rgba(30,55,32,0.06)' : 'none',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F3A24', fontVariantNumeric: 'tabular-nums', flexShrink: 0, width: 52 }}>
                        {session.duration_minutes} min
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: '#8A8678', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.tasks?.length > 0 ? session.tasks.join(' · ') : 'No debrief captured'}
                      </span>
                      <span style={{ fontSize: 11, color: '#B5B09C', flexShrink: 0 }}>{timeAgo(session.created_at)}</span>
                    </div>
                  ))
                )}
              </section>

              {/* Patterns — right column, same card language as Today */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                {sessions.length === 0 ? (
                  <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                    <p style={{ fontSize: 12, color: '#9A957F', lineHeight: 1.6 }}>Patterns appear after your first session — time of day, best days, recurring themes.</p>
                  </section>
                ) : (
                  <>
                    <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A957F', marginBottom: 12 }}>Focus time</p>
                      <div style={{ fontSize: 36, fontWeight: 700, color: '#1F3A24', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
                        {totalHrs > 0 ? `${totalHrs}h ${remMins}m` : `${totalMins}m`}
                      </div>
                      <p style={{ fontSize: 12, color: '#8A8678' }}>avg {avgMins}m per session</p>
                    </section>

                    <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A957F', marginBottom: 14 }}>When you focus</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        {dayNames.map((d, i) => (
                          <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 4,
                              background: dayCounts[i] > 0 ? `rgba(61,107,71,${Math.min(0.25 + (dayCounts[i] / Math.max(...dayCounts)) * 0.75, 1)})` : '#F2EFE7',
                            }} />
                            <span style={{ fontSize: 10, color: i === peakDayIdx && dayCounts[i] > 0 ? '#1F3A24' : '#B5B09C', fontWeight: i === peakDayIdx ? 600 : 500 }}>{d[0]}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: '#3D6B47' }}>Peak: {dayNames[peakDayIdx]}s · {fmtHour(peakHour)}</p>
                    </section>

                    {recentTopics.length > 0 && (
                      <section style={{ background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6, padding: '20px 22px' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A957F', marginBottom: 12 }}>Recent topics</p>
                        {recentTopics.slice(0, 4).map((t, i, arr) => (
                          <p key={i} style={{
                            fontSize: 13, color: '#5e6f5e', lineHeight: 1.5, padding: '8px 0',
                            borderBottom: i < arr.length - 1 ? '1px solid rgba(30,55,32,0.06)' : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{t}</p>
                        ))}
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CoachState = 'pattern' | 'flow' | 'empty'
type CoachData = {
  state: CoachState
  tag: string
  message: string
  suggestion: string
  suggested_minutes: number
}

const CACHE_KEY = 'focul.coach.v1'

type CachedCoach = { date: string; data: CoachData }

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function readCache(): CoachData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedCoach
    if (parsed.date !== todayKey()) return null
    return parsed.data
  } catch { return null }
}

function writeCache(data: CoachData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), data }))
  } catch { /* storage unavailable */ }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}

export function FocusCoach({
  onStart,
  isMobile = false,
}: {
  onStart: (minutes: number) => void
  isMobile?: boolean
}) {
  const [data, setData] = useState<CoachData | null>(() => readCache())
  const [loading, setLoading] = useState(!data)
  const [dismissed, setDismissed] = useState(false)
  const [doneClicked, setDoneClicked] = useState(false)

  useEffect(() => {
    if (data) return
    let cancelled = false

    async function fetchCoach() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const [{ data: sessions }, { data: todos }] = await Promise.all([
          supabase
            .from('sessions')
            .select('transcript, tasks, duration_minutes, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('todos')
            .select('text, completed')
            .eq('completed', false)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: sessions || [], todos: todos || [] }),
        })
        const body = (await res.json()) as CoachData
        if (cancelled) return
        writeCache(body)
        setData(body)
      } catch (err) {
        console.error('coach fetch failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCoach()
    return () => { cancelled = true }
  }, [data])

  async function handleAlreadyDone() {
    if (!data) return
    setDoneClicked(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: matches } = await supabase
          .from('todos')
          .select('id, text')
          .eq('user_id', user.id)
          .eq('completed', false)
          .ilike('text', `%${data.suggestion.slice(0, 24)}%`)
          .limit(1)
        if (matches && matches.length > 0) {
          await supabase.from('todos').update({ completed: true }).eq('id', matches[0].id)
        }
      }
    } catch (err) {
      console.error('mark done failed', err)
    }
    clearCache()
    setDismissed(true)
  }

  if (dismissed) return null
  if (loading) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: isMobile ? 8 : 6,
        border: '1px solid #ede9e2',
        padding: isMobile ? '18px 18px' : '22px 24px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#3a9e52', opacity: 0.5,
          animation: 'coachPulse 1.4s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 13, color: '#b0a898' }}>Focus Coach is reading your recent sessions…</span>
        <style>{`@keyframes coachPulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.9 } }`}</style>
      </div>
    )
  }

  if (!data) return null

  const accentColor = data.state === 'flow' ? '#b87838' : '#3a9e52'
  const bgGlow = data.state === 'flow'
    ? 'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(184,120,56,0.10), transparent 60%), #fff'
    : 'radial-gradient(ellipse 80% 100% at 0% 0%, rgba(58,158,82,0.10), transparent 60%), #fff'

  return (
    <div style={{
      background: bgGlow,
      borderRadius: isMobile ? 8 : 6,
      border: '1px solid #ede9e2',
      padding: isMobile ? '18px 18px 16px' : '22px 24px 20px',
      marginBottom: 16,
      boxShadow: '0 2px 14px rgba(0,0,0,0.04)',
    }}>
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: accentColor,
          boxShadow: `0 0 0 4px ${accentColor}22`,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1410', letterSpacing: 0.2 }}>
          Focus Coach
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
          color: '#b0a898', letterSpacing: 1, textTransform: 'uppercase',
        }}>{data.tag}</span>
      </div>

      {/* Message */}
      <p style={{
        fontSize: isMobile ? 14 : 15,
        lineHeight: 1.45, color: '#1a1410',
        margin: '0 0 14px',
      }}>{data.message}</p>

      {/* Suggestion card */}
      {data.state !== 'empty' && (
        <div style={{
          border: '1px solid #E8E4DA', borderRadius: 6,
          padding: '12px 14px', background: '#faf9f7',
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 14,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: accentColor, color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: 13, flexShrink: 0,
          }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#1a1410', lineHeight: 1.3 }}>
              {data.suggestion}
            </p>
            <div style={{ fontSize: 11, color: '#b0a898', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
              {data.suggested_minutes} min · suggested
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onStart(data.suggested_minutes)} style={{
          background: '#1a1410', color: '#fff',
          border: 'none', borderRadius: 5,
          padding: '9px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {data.state === 'flow' ? 'Keep going' : data.state === 'empty' ? 'Set up a sprint' : 'Start this sprint'}
        </button>
        {data.state !== 'empty' && (
          <>
            <button onClick={() => setDismissed(true)} style={{
              background: '#fff', color: '#1a1410',
              border: '1px solid #E8E4DA', borderRadius: 5,
              padding: '9px 14px', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Pick something else</button>
            <button onClick={handleAlreadyDone} disabled={doneClicked} style={{
              background: 'transparent', color: '#8a7e72',
              border: 'none', padding: '9px 8px', fontSize: 12,
              cursor: doneClicked ? 'default' : 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline',
              textUnderlineOffset: 3, opacity: doneClicked ? 0.5 : 1,
            }}>{doneClicked ? 'Marked done ✓' : 'Already done'}</button>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  onDismiss: () => void
}

type WorkType = 'code' | 'write' | 'design' | 'build' | 'study' | 'other'
type TaskHome = 'notion' | 'linear' | 'paper' | 'head' | 'other'
type Mode = 'focus' | 'accountability'

// Mock practice: mid-onboarding we fake the voice debrief so every user gets
// the "oh, tasks just appeared" moment without depending on mic permissions,
// network latency, or whatever they happen to say. The real flow lives in /timer.
const MOCK_TRANSCRIPT = 'Shipped the new dashboard, fixed the login bug, started the investor deck.'
const MOCK_TASKS = [
  'Ship the new dashboard',
  'Fix the login session bug',
  'Continue the investor deck',
]

export default function OnboardingModal({ onDismiss }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)

  // Personalization answers (saved to localStorage so future Focul features can use them)
  const [workType, setWorkType] = useState<WorkType | null>(null)
  const [taskHome, setTaskHome] = useState<TaskHome | null>(null)
  const [mode, setMode] = useState<Mode>('focus')

  // Practice debrief state
  type Practice = 'idle' | 'recording' | 'extracting' | 'done'
  const [practice, setPractice] = useState<Practice>('idle')
  const [practiceSeconds, setPracticeSeconds] = useState(0)

  const totalSteps = 5

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Mock practice timer: 4s "recording" → 2s "extracting" → done
  useEffect(() => {
    if (practice !== 'recording') return
    const tick = setInterval(() => setPracticeSeconds(s => s + 1), 1000)
    const advance = setTimeout(() => setPractice('extracting'), 4000)
    return () => { clearInterval(tick); clearTimeout(advance) }
  }, [practice])
  useEffect(() => {
    if (practice !== 'extracting') return
    const t = setTimeout(() => setPractice('done'), 2000)
    return () => clearTimeout(t)
  }, [practice])

  function goTo(nextStep: number, dir: 'forward' | 'back') {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => { setStep(nextStep); setAnimating(false) }, 220)
  }
  const next = () => { if (step < totalSteps - 1) goTo(step + 1, 'forward') }
  const back = () => { if (step > 0) goTo(step - 1, 'back') }

  function persistAnswers() {
    localStorage.setItem('focul_onboarded', 'true')
    if (workType) localStorage.setItem('focul_work_type', workType)
    if (taskHome) localStorage.setItem('focul_task_home', taskHome)
    localStorage.setItem('focul_default_mode', mode)
  }
  function dismiss() { persistAnswers(); onDismiss() }
  function startSession() {
    persistAnswers()
    router.push(`/timer?duration=15&mode=${mode}`)
  }

  // Is the primary action enabled on the current step?
  const canAdvance =
    step === 1 ? !!workType :
    step === 2 ? !!taskHome :
    step === 3 ? true : // practice is optional
    true

  const slideStyle: React.CSSProperties = {
    transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1)',
    opacity: animating ? 0 : 1,
    transform: animating ? `translateX(${direction === 'forward' ? '16px' : '-16px'})` : 'translateX(0)',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(13,31,21,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        background: '#F7F5EF',
        borderRadius: 8,
        border: '1px solid #E8E4DA',
        width: '100%', maxWidth: 440,
        position: 'relative',
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.98) translateY(8px)',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 20px 60px rgba(13,31,21,0.18)',
      }}>

        {/* Skip + back row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 0',
        }}>
          {step > 0 ? (
            <button onClick={back} aria-label="Back" style={{
              width: 28, height: 28, borderRadius: 5,
              border: '1px solid #E8E4DA', background: '#fff',
              color: '#8A8678', cursor: 'pointer', fontFamily: 'inherit',
              display: 'grid', placeItems: 'center', outline: 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : <span style={{ width: 28 }} />}

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 6, height: 5, borderRadius: 99,
                background: i === step ? '#1F3A24' : i < step ? '#7BA177' : '#E8E4DA',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }} />
            ))}
          </div>

          <button onClick={dismiss} style={{
            fontSize: 12, color: '#8A8678', background: 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '4px 6px', outline: 'none',
          }}>
            Skip
          </button>
        </div>

        {/* Step content */}
        <div style={{ padding: '28px 32px 8px', minHeight: 340 }}>
          <div style={slideStyle}>

            {/* ── STEP 0: Welcome ── */}
            {step === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                  <svg width="72" height="72" viewBox="0 0 160 160" aria-hidden="true">
                    <rect x="18" y="58" width="18" height="52" rx="9" fill="#C5D9B8"/>
                    <rect x="42" y="36" width="18" height="96" rx="9" fill="#7BA177"/>
                    <rect x="66" y="18" width="18" height="132" rx="9" fill="#1F3A24"/>
                    <rect x="90" y="36" width="18" height="96" rx="9" fill="#7BA177"/>
                    <rect x="114" y="58" width="18" height="52" rx="9" fill="#C5D9B8"/>
                  </svg>
                </div>
                <p style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: '#7BA177', marginBottom: 12,
                }}>
                  Welcome
                </p>
                <h2 style={{
                  fontSize: 28, fontWeight: 600, color: '#1F3A24',
                  letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 14,
                }}>
                  The focus timer<br />that closes the loop.
                </h2>
                <p style={{ fontSize: 14, color: '#5e6f5e', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                  Most timers just count down. Focul captures what you actually did, so every session builds on the last.
                </p>
              </div>
            )}

            {/* ── STEP 1: What kind of work? ── */}
            {step === 1 && (
              <div>
                <h2 style={{
                  fontSize: 22, fontWeight: 600, color: '#1F3A24',
                  letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center',
                }}>
                  What kind of work do you do?
                </h2>
                <p style={{ fontSize: 13, color: '#8A8678', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                  Pick what's closest. We'll tune Focul to it.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    ['code', 'Code'],
                    ['write', 'Write'],
                    ['design', 'Design'],
                    ['build', 'Build a company'],
                    ['study', 'Study'],
                    ['other', 'Something else'],
                  ] as [WorkType, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setWorkType(key)} style={{
                      padding: '12px 14px', borderRadius: 6, textAlign: 'left',
                      border: workType === key ? '1.5px solid #1F3A24' : '1px solid #E8E4DA',
                      background: workType === key ? '#fff' : '#fff',
                      color: '#1F3A24', fontSize: 13.5, fontWeight: workType === key ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                      transition: 'all 0.15s',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 2: Where do tasks live? ── */}
            {step === 2 && (
              <div>
                <h2 style={{
                  fontSize: 22, fontWeight: 600, color: '#1F3A24',
                  letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center',
                }}>
                  Where do your tasks usually live?
                </h2>
                <p style={{ fontSize: 13, color: '#8A8678', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                  Wherever they are now, we'll start capturing them here.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    ['notion', 'Notion / Docs'],
                    ['linear', 'Linear / Jira / a real tool'],
                    ['paper', 'A notebook'],
                    ['head', 'My head, honestly'],
                    ['other', 'Somewhere else'],
                  ] as [TaskHome, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setTaskHome(key)} style={{
                      padding: '12px 16px', borderRadius: 6, textAlign: 'left',
                      border: taskHome === key ? '1.5px solid #1F3A24' : '1px solid #E8E4DA',
                      background: '#fff',
                      color: '#1F3A24', fontSize: 14, fontWeight: taskHome === key ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                      transition: 'all 0.15s',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: Practice the voice debrief (mock) ── */}
            {step === 3 && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{
                  fontSize: 22, fontWeight: 600, color: '#1F3A24',
                  letterSpacing: '-0.02em', marginBottom: 8,
                }}>
                  Try the magic.
                </h2>
                <p style={{ fontSize: 13, color: '#8A8678', lineHeight: 1.55, marginBottom: 24 }}>
                  Tap the mic. We'll show you what would happen after a real session.
                </p>

                {practice === 'idle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '12px 0' }}>
                    <button
                      onClick={() => { setPracticeSeconds(0); setPractice('recording') }}
                      aria-label="Try the mic"
                      style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: '#3D6B47', border: 'none', cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="8" y1="23" x2="16" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <p style={{ fontSize: 12, color: '#8A8678' }}>
                      It's just a demo. No mic permission needed yet.
                    </p>
                  </div>
                )}

                {practice === 'recording' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#b85a3c',
                        animation: 'pulseDot 1.4s ease-in-out infinite',
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5e6f5e', fontVariantNumeric: 'tabular-nums' }}>
                        Recording · 00:{String(practiceSeconds).padStart(2, '0')}
                      </span>
                    </div>
                    {/* Animated equalizer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 38 }}>
                      {[0.35, 0.8, 1, 0.6, 0.95, 0.45, 0.85, 1, 0.55, 0.75, 0.4, 0.9].map((h, i) => (
                        <span key={i} style={{
                          width: 4, borderRadius: 3, background: '#3D6B47',
                          height: `${h * 100}%`,
                          opacity: 0.55 + h * 0.45,
                          animation: `wavebar ${0.6 + i * 0.05}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.06}s`,
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#5e6f5e', fontStyle: 'italic', maxWidth: 280, lineHeight: 1.5 }}>
                      "{MOCK_TRANSCRIPT}"
                    </p>
                  </div>
                )}

                {practice === 'extracting' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 7, height: 7, borderRadius: '50%', background: '#3D6B47',
                          animation: `wavebar 0.8s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.16}s`,
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 13, color: '#1F3A24', fontWeight: 600 }}>Extracting your tasks…</p>
                  </div>
                )}

                {practice === 'done' && (
                  <div style={{ textAlign: 'left', padding: '8px 0' }}>
                    <p style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: '#7BA177', marginBottom: 10, textAlign: 'center',
                    }}>
                      Three tasks captured
                    </p>
                    {MOCK_TASKS.map((t, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '10px 14px', marginBottom: 6,
                        background: '#fff', border: '1px solid #E8E4DA', borderRadius: 6,
                      }}>
                        <span style={{ width: 17, height: 17, borderRadius: 4, border: '1.5px solid #C9C4B4', flexShrink: 0 }} />
                        <span style={{ fontSize: 13.5, color: '#1F3A24', lineHeight: 1.4 }}>{t}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 12, color: '#8A8678', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
                      That's the whole point of Focul.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Default mode + start ── */}
            {step === 4 && (
              <div>
                <h2 style={{
                  fontSize: 22, fontWeight: 600, color: '#1F3A24',
                  letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center',
                }}>
                  Last thing. How do you want to start each session?
                </h2>
                <p style={{ fontSize: 13, color: '#8A8678', lineHeight: 1.55, marginBottom: 24, textAlign: 'center' }}>
                  You can switch anytime.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => setMode('focus')} style={{
                    padding: '14px 16px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                    border: mode === 'focus' ? '1.5px solid #1F3A24' : '1px solid #E8E4DA',
                    background: '#fff', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1F3A24', marginBottom: 4 }}>
                      Just hit go
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5e6f5e', lineHeight: 1.5 }}>
                      Focus mode. Start the timer, work, debrief at the end.
                    </div>
                  </button>
                  <button onClick={() => setMode('accountability')} style={{
                    padding: '14px 16px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                    border: mode === 'accountability' ? '1.5px solid #1F3A24' : '1px solid #E8E4DA',
                    background: '#fff', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1F3A24', marginBottom: 4 }}>
                      Plan first, then go
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5e6f5e', lineHeight: 1.5 }}>
                      Accountability mode. List your tasks, then start. Review what you actually finished.
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Primary action */}
        <div style={{ padding: '12px 32px 28px' }}>
          {step < totalSteps - 1 ? (
            <button
              onClick={next}
              disabled={!canAdvance}
              style={{
                width: '100%', padding: '13px', borderRadius: 6, border: 'none',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                color: '#F7F5EF',
                background: canAdvance ? '#1F3A24' : '#C9C4B4',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s', letterSpacing: '0.01em',
              }}>
              {step === 0 ? 'Get started' : 'Continue'} →
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={startSession} style={{
                width: '100%', padding: '14px', borderRadius: 6, border: 'none',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                color: '#F7F5EF', background: '#1F3A24',
                cursor: 'pointer', letterSpacing: '0.01em',
              }}>
                Start my first 15-min session →
              </button>
              <button onClick={dismiss} style={{
                width: '100%', padding: '10px', borderRadius: 6, border: 'none',
                fontSize: 13, color: '#8A8678', background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Go to dashboard
              </button>
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1;    transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.85); }
        }
        @keyframes wavebar {
          from { transform: scaleY(0.35); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  onDismiss: () => void
}

export default function OnboardingModal({ onDismiss }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'focus' | 'accountability' | null>(null)

  useEffect(() => {
    // Entrance animation
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const totalSteps = 4

  function goTo(next: number, dir: 'forward' | 'back') {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 220)
  }

  function next() { if (step < totalSteps - 1) goTo(step + 1, 'forward') }
  function back() { if (step > 0) goTo(step - 1, 'back') }

  function dismiss() {
    localStorage.setItem('focul_onboarded', 'true')
    onDismiss()
  }

  function startSession() {
    localStorage.setItem('focul_onboarded', 'true')
    router.push(`/timer?duration=15&mode=${selectedMode || 'focus'}`)
  }

  const slideStyle: React.CSSProperties = {
    transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1)',
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === 'forward' ? '24px' : '-24px'})`
      : 'translateX(0)',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(26,20,16,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 28,
        border: '1px solid #e8f5e8',
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        position: 'relative',
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0ede8' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #2d8a44, #4db864)',
            width: `${((step + 1) / totalSteps) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
            borderRadius: 99,
          }} />
        </div>

        <div style={{ padding: '32px 36px 28px' }}>

          {/* Skip */}
          <button onClick={dismiss} style={{
            position: 'absolute', top: 20, right: 22,
            fontSize: 12, color: '#c0b8a8', background: 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            skip
          </button>

          {/* Step content */}
          <div style={slideStyle}>

            {/* ── STEP 0: Welcome ── */}
            {step === 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', inset: -12, borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(58,158,82,0.12) 0%, transparent 70%)',
                      animation: 'ping 2s ease-in-out infinite',
                    }} />
                    <svg width="64" height="64" viewBox="0 0 160 160">
                      <rect x="18" y="58" width="18" height="52" rx="9" fill="#d4ead8"/>
                      <rect x="42" y="36" width="18" height="96" rx="9" fill="#8dcc9e"/>
                      <rect x="66" y="18" width="18" height="132" rx="9" fill="#1e5c30"/>
                      <rect x="90" y="36" width="18" height="96" rx="9" fill="#3a9e52"/>
                      <rect x="114" y="58" width="18" height="52" rx="9" fill="#8dcc9e"/>
                    </svg>
                  </div>
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5, marginBottom: 8 }}>
                  Welcome to Focul.
                </h2>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#3a9e52', marginBottom: 14 }}>
                  The focus timer that closes the loop.
                </p>
                <p style={{ fontSize: 14, color: '#8a7e72', lineHeight: 1.65 }}>
                  Most timers just count down. Focul captures what you actually got done — so every session builds on the last.
                </p>
              </div>
            )}

            {/* ── STEP 1: The timer ── */}
            {step === 1 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <div style={{
                    background: '#f7f5f2', borderRadius: 20, padding: '18px 28px',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: -3, color: '#1a1410', lineHeight: 1 }}>15</span>
                    <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: -3, color: '#e0dbd4', lineHeight: 1 }}>:00</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                  {[15, 30, 45].map(d => (
                    <div key={d} style={{
                      padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                      border: d === 15 ? '1.5px solid #1a1410' : '1.5px solid #e8e2d8',
                      color: d === 15 ? '#1a1410' : '#c0b8a8',
                    }}>{d} min</div>
                  ))}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5, marginBottom: 8 }}>
                  Pick a duration. Start.
                </h2>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#3a9e52', marginBottom: 14 }}>No setup. No friction.</p>
                <p style={{ fontSize: 14, color: '#8a7e72', lineHeight: 1.65 }}>
                  Choose 15, 30, or 45 minutes. Hit start. Close your other tabs. The timer runs — you focus.
                </p>
              </div>
            )}

            {/* ── STEP 2: Two modes ── */}
            {step === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5, marginBottom: 8 }}>
                    Two ways to work.
                  </h2>
                  <p style={{ fontSize: 14, color: '#8a7e72', lineHeight: 1.6 }}>
                    Pick the mode that fits how you work today.
                  </p>
                </div>

                {/* Mode cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                  <button onClick={() => setSelectedMode('focus')} style={{
                    textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                    border: selectedMode === 'focus' ? '2px solid #1a1410' : '1.5px solid #e8e2d8',
                    background: selectedMode === 'focus' ? '#f7f5f2' : '#fff',
                    transition: 'all 0.18s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, background: '#1a1410',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }}>⚡</div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1410' }}>Focus mode</span>
                      {selectedMode === 'focus' && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#3a9e52', fontWeight: 600 }}>✓ selected</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#a09888', lineHeight: 1.5, margin: 0 }}>
                      Just start. When the timer ends, speak your debrief and AI extracts your next tasks.
                    </p>
                  </button>

                  <button onClick={() => setSelectedMode('accountability')} style={{
                    textAlign: 'left', padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                    border: selectedMode === 'accountability' ? '2px solid #2d6aaa' : '1.5px solid #e8e2d8',
                    background: selectedMode === 'accountability' ? '#f0f5fb' : '#fff',
                    transition: 'all 0.18s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, background: '#2d6aaa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }}>✓</div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1410' }}>Accountability mode</span>
                      {selectedMode === 'accountability' && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#2d6aaa', fontWeight: 600 }}>✓ selected</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#a09888', lineHeight: 1.5, margin: 0 }}>
                      Set your tasks before you start. Review what you actually completed when the timer ends.
                    </p>
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#c0b8a8', textAlign: 'center' }}>You can switch modes anytime from the dashboard.</p>
              </div>
            )}

            {/* ── STEP 3: Voice debrief ── */}
            {step === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ position: 'relative', width: 72, height: 72 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(58,158,82,0.15)',
                      transform: 'scale(1.35)',
                      animation: 'ping 1.8s ease-in-out infinite',
                    }} />
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #2d8a44, #4db864)',
                      boxShadow: '0 8px 28px rgba(58,158,82,0.38)',
                      position: 'relative',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  {/* Animated waveform bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
                    {[0.3, 0.7, 1, 0.6, 0.9, 0.4, 0.8, 1, 0.5, 0.7, 0.3, 0.9].map((h, i) => (
                      <div key={i} style={{
                        width: 3, borderRadius: 99,
                        height: `${h * 100}%`,
                        background: 'linear-gradient(to top, #2d8a44, #4db864)',
                        opacity: 0.5 + h * 0.5,
                        animation: `wavebar ${0.6 + i * 0.07}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.06}s`,
                      }} />
                    ))}
                  </div>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1410', letterSpacing: -0.5, marginBottom: 8 }}>
                  Debrief in 30 seconds.
                </h2>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#3a9e52', marginBottom: 14 }}>
                  Press <kbd style={{ background: '#e8f5e8', border: '1px solid #c8dcc8', borderRadius: 5, padding: '1px 7px', fontSize: 12, fontFamily: 'inherit', color: '#2d8a44' }}>Space</kbd> · Just speak.
                </p>
                <p style={{ fontSize: 14, color: '#8a7e72', lineHeight: 1.65 }}>
                  When the timer ends, press Space and say what you got done. AI transcribes it, cleans it up, and pulls out your next tasks — automatically.
                </p>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '24px 0 20px' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} onClick={() => goTo(i, i > step ? 'forward' : 'back')} style={{
                width: i === step ? 22 : 6, height: 6, borderRadius: 99,
                background: i === step ? '#3a9e52' : i < step ? '#b8dfc0' : '#e8e2d8',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {step === totalSteps - 1 ? (
              <>
                <button onClick={startSession} style={{
                  width: '100%', padding: '14px', borderRadius: 50, border: 'none',
                  fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #2d8a44, #4db864)',
                  boxShadow: '0 6px 20px rgba(58,158,82,0.32)',
                  letterSpacing: '0.01em',
                  transition: 'opacity 0.15s',
                }}>
                  Start my first session →
                </button>
                <button onClick={dismiss} style={{
                  width: '100%', padding: '10px', borderRadius: 50, border: 'none',
                  fontSize: 13, color: '#b0a898', background: 'transparent', cursor: 'pointer',
                }}>
                  Go to dashboard
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {step > 0 && (
                  <button onClick={back} style={{
                    padding: '14px 20px', borderRadius: 50, border: '1.5px solid #e8e2d8',
                    fontSize: 14, fontWeight: 600, color: '#b0a898',
                    background: 'transparent', cursor: 'pointer',
                  }}>
                    ←
                  </button>
                )}
                <button onClick={next} style={{
                  flex: 1, padding: '14px', borderRadius: 50, border: 'none',
                  fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #2d8a44, #4db864)',
                  boxShadow: '0 6px 20px rgba(58,158,82,0.28)',
                  letterSpacing: '0.01em',
                }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

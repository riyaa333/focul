'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import s from './waitlist.module.css'

function WaveLogo({ size = 28 }: { size?: number }) {
  const bars = [
    { h: 0.45, c: '#7cd49b' },
    { h: 0.75, c: '#5ec07e' },
    { h: 1.0,  c: '#3a9e52' },
    { h: 0.7,  c: '#5ec07e' },
    { h: 0.4,  c: '#7cd49b' },
  ]
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 56 40" aria-hidden>
      {bars.map((b, i) => {
        const w = 6
        const gap = 4
        const x = i * (w + gap) + 2
        const h = b.h * 36
        const y = (40 - h) / 2
        return <rect key={i} x={x} y={y} width={w} height={h} rx={2} fill={b.c} />
      })}
    </svg>
  )
}

const ROLES = [
  'Student',
  'Founder / entrepreneur',
  'Working professional',
  'Other',
]

function WaitlistInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = params.get('ref') ?? ''

  const [phase, setPhase] = useState<'intro' | 'hero' | 'form'>('intro')
  const [step, setStep] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => setPhase('hero'), 1300)
    return () => clearTimeout(t)
  }, [phase])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  function next() {
    setError(null)
    if (step === 0) {
      if (!emailValid) {
        setError('That email looks off - try again.')
        return
      }
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    }
  }

  function back() {
    setError(null)
    if (step > 0) setStep((step - 1) as 0 | 1)
  }

  async function submit() {
    if (!emailValid) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          problem: problem.trim(),
          ref,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.')
        setSubmitting(false)
        return
      }
      router.push(`/waiting?ref=${encodeURIComponent(data.ref_code)}`)
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  function handleEnter(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step < 2) next()
      else submit()
    }
  }

  if (phase === 'intro') {
    return (
      <main className={s.dark}>
        <div className={s.intro}>
          <div className={s.introLogo}>
            <WaveLogo size={36} />
            <span className={s.introWord}>FOCUL</span>
          </div>
          <div className={s.loader}><div className={s.loaderBar} /></div>
        </div>
      </main>
    )
  }

  if (phase === 'hero') {
    return (
      <main className={s.dark}>
        <Link href="/" className={s.brandTop}>
          <WaveLogo size={22} /> FOCUL
        </Link>
        <div className={s.hero}>
          <div className={s.iconStage} aria-hidden>
            <div className={`${s.appIcon} ${s.i1}`}>📷</div>
            <div className={`${s.appIcon} ${s.i2}`}>💬</div>
            <div className={`${s.appIcon} ${s.i3}`}>📺</div>
            <div className={`${s.appIcon} ${s.i4}`}>🎵</div>
            <div className={`${s.appIcon} ${s.i5}`}>🎮</div>
            <div className={`${s.appIcon} ${s.i6}`}>📱</div>
          </div>
          <h1 className={s.heroTitle}>Apply for Focul Invite-Only Access</h1>
          <p className={s.heroSub}>
            We're rolling out Focul gradually starting July 2026.<br />
            Join the queue for exclusive, invite-only access.
          </p>
          <button className={s.startBtn} onClick={() => setPhase('form')}>
            Start
          </button>
          <p className={s.timeNote}>⏱ Takes 30 sec</p>
        </div>
      </main>
    )
  }

  return (
    <main className={s.wrap}>
      <Link href="/" className={s.back}>← Focul</Link>

      <div className={s.card}>
        <div className={s.progress}>
          <div className={s.bar} style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
        <div className={s.progressLabel}>Step {step + 1} of 3</div>

        {step === 0 && (
          <div className={s.step}>
            <label className={s.qlabel}>What's your email?</label>
            <p className={s.hint}>We'll send your access there. No spam - promise.</p>
            <input
              className={s.input}
              type="email"
              autoFocus
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="email"
            />
          </div>
        )}

        {step === 1 && (
          <div className={s.step}>
            <label className={s.qlabel}>What brings you to Focul?</label>
            <p className={s.hint}>Pick whichever fits best - we use this to build for the people actually using it. No wrong answer.</p>
            <div className={s.chips}>
              {ROLES.map(r => (
                <button
                  key={r}
                  className={role === r ? `${s.chip} ${s.chipOn}` : s.chip}
                  onClick={() => {
                    setRole(r)
                    setTimeout(() => setStep(2), 200)
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={s.step}>
            <label className={s.qlabel}>Where do you lose focus most?</label>
            <p className={s.hint}>One sentence. Optional, but it helps us build for you.</p>
            <textarea
              className={s.textarea}
              placeholder="My phone, social media, getting distracted easily…"
              value={problem}
              onChange={e => setProblem(e.target.value)}
              onKeyDown={handleEnter}
              rows={4}
              maxLength={500}
            />
          </div>
        )}

        {error && <p className={s.err}>{error}</p>}

        <div className={s.actions}>
          {step > 0 && (
            <button className={`${s.btn} ${s.btnGhost}`} onClick={back} disabled={submitting}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={next}
              disabled={step === 0 && !emailValid}
            >
              Continue →
            </button>
          ) : (
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? 'Joining…' : 'Join the waitlist'}
            </button>
          )}
        </div>

        {ref && step === 0 && (
          <p className={s.refNote}>Referred by a founder - you'll start a few spots ahead.</p>
        )}
      </div>
    </main>
  )
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistInner />
    </Suspense>
  )
}

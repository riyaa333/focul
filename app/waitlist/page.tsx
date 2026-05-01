'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import s from './waitlist.module.css'

const ROLES = [
  'Founder, solo',
  'Founder + small team',
  'Operator / Chief of Staff',
  'Other',
]

function WaitlistInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = params.get('ref') ?? ''

  const [step, setStep] = useState<0 | 1 | 2>(0)
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
        setError('That email looks off — try again.')
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
            <p className={s.hint}>We'll send your access there. No spam — promise.</p>
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
            <label className={s.qlabel}>Which best describes you?</label>
            <p className={s.hint}>So we can prioritise the right people first.</p>
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
              placeholder="Switching context between Slack, calls, and writing code…"
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
          <p className={s.refNote}>Referred by a founder — you'll start a few spots ahead.</p>
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

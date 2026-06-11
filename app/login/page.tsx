'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  // Already signed in? Skip the form. The Supabase session persists in
  // localStorage across app/browser restarts — without this check, returning
  // users see the sign-in form every launch despite having a valid session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetMode, setResetMode] = useState(false)

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a password reset link.')
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() || email.split('@')[0] },
        },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push('/dashboard')
      } else {
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    }

    setLoading(false)
  }

  // ── Shared field styles ──
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'rgba(13,31,21,0.62)', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(30,55,32,0.10)', background: '#fff',
    fontSize: 14, color: '#0d1f15', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const onInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#1e5c30'
    e.target.style.boxShadow = '0 0 0 3px rgba(30,92,48,0.06)'
  }
  const onInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(30,55,32,0.10)'
    e.target.style.boxShadow = 'none'
  }

  const headline = resetMode
    ? 'Reset password.'
    : mode === 'login' ? 'Sign in.' : 'Create your account.'
  const subheadText = resetMode
    ? "Enter your email and we'll send you a reset link."
    : mode === 'login'
      ? 'Pick up where your last session left off.'
      : 'Start closing the loop on your work day.'

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      color: '#0d1f15',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        .login-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }
        @media (max-width: 900px) {
          .login-layout { grid-template-columns: 1fr; }
          .login-brand-side { display: none; }
        }

        /* Animated voice-wave bars */
        .voice-wave {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 110px;
        }
        .voice-wave span {
          display: block;
          width: 12px;
          border-radius: 6px;
          transform-origin: center;
          will-change: transform;
        }
        .voice-wave span:nth-child(1) {
          height: 38px;
          background: rgba(212,234,216,0.32);
          animation: vw-out 1.4s ease-in-out infinite;
          animation-delay: 0s;
        }
        .voice-wave span:nth-child(2) {
          height: 69px;
          background: rgba(141,204,158,0.55);
          animation: vw-mid 1.6s ease-in-out infinite;
          animation-delay: 0.12s;
        }
        .voice-wave span:nth-child(3) {
          height: 94px;
          background: rgba(168,224,185,0.95);
          animation: vw-center 1.5s ease-in-out infinite;
          animation-delay: 0.22s;
        }
        .voice-wave span:nth-child(4) {
          height: 69px;
          background: rgba(141,204,158,0.55);
          animation: vw-mid 1.6s ease-in-out infinite;
          animation-delay: 0.33s;
        }
        .voice-wave span:nth-child(5) {
          height: 38px;
          background: rgba(212,234,216,0.32);
          animation: vw-out 1.4s ease-in-out infinite;
          animation-delay: 0.45s;
        }

        @keyframes vw-out {
          0%, 100% { transform: scaleY(0.6); }
          50%      { transform: scaleY(1.25); }
        }
        @keyframes vw-mid {
          0%, 100% { transform: scaleY(0.55); }
          50%      { transform: scaleY(1.35); }
        }
        @keyframes vw-center {
          0%, 100% { transform: scaleY(0.5); }
          50%      { transform: scaleY(1.45); }
        }

        @media (prefers-reduced-motion: reduce) {
          .voice-wave span { animation: none; }
        }
      `}</style>

      <div className="login-layout">
        {/* ── Left: brand side (dark) ── */}
        <div className="login-brand-side" style={{
          background: '#0a120d',
          color: '#f0ebe2',
          padding: '40px 48px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(800px circle at 50% 50%, rgba(141,204,158,0.05), transparent 60%)',
            pointerEvents: 'none',
          }} />

          <a href="/" style={{
            position: 'relative', zIndex: 1,
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
            color: '#f0ebe2', textDecoration: 'none',
          }}>
            <span style={{ width: 22, height: 22, display: 'inline-block' }}>
              <svg viewBox="0 0 160 160" style={{ display: 'block', width: '100%', height: '100%' }}>
                <rect x="38" y="61" width="12" height="38" rx="6" fill="#d4ead8"/>
                <rect x="56" y="46" width="12" height="69" rx="6" fill="#8dcc9e"/>
                <rect x="74" y="33" width="12" height="94" rx="6" fill="#a8e0b9"/>
                <rect x="92" y="46" width="12" height="69" rx="6" fill="#8dcc9e"/>
                <rect x="110" y="61" width="12" height="38" rx="6" fill="#d4ead8"/>
              </svg>
            </span>
            <span>Focul</span>
          </a>

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="voice-wave" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <p style={{
            position: 'relative', zIndex: 1,
            fontSize: 13, color: '#6c7770', lineHeight: 1.5, maxWidth: 280,
          }}>
            One timer. <span style={{ color: '#b6c0b9' }}>Every focused minute.</span>
          </p>
        </div>

        {/* ── Right: form side (cream) ── */}
        <div style={{
          padding: '48px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          background: '#faf9f7',
        }}>
          <div style={{ width: '100%', maxWidth: 320 }}>
            <h1 style={{
              fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em',
              marginBottom: 8, lineHeight: 1.2,
            }}>
              {headline}
            </h1>
            <p style={{
              fontSize: 14, color: 'rgba(13,31,21,0.62)', marginBottom: 32,
            }}>
              {subheadText}
            </p>

            {/* ── Reset password form ── */}
            {resetMode ? (
              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    autoFocus
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                {error && (
                  <p style={{
                    fontSize: 12, color: '#b85a3c', background: '#fdeae0',
                    padding: '8px 12px', borderRadius: 8, margin: 0,
                  }}>
                    {error}
                  </p>
                )}
                {message && (
                  <p style={{
                    fontSize: 12, color: '#1e5c30', background: '#d4ead8',
                    padding: '8px 12px', borderRadius: 8, margin: 0,
                  }}>
                    {message}
                  </p>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px 24px', marginTop: 6,
                  borderRadius: 10, background: '#0a120d', color: '#faf9f7',
                  fontSize: 14, fontWeight: 600, border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s, transform 0.15s',
                }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>

                <button type="button" onClick={() => { setResetMode(false); setError(''); setMessage('') }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(13,31,21,0.62)', fontSize: 13,
                    cursor: 'pointer', marginTop: -4,
                  }}>
                  ← Back to sign in
                </button>
              </form>
            ) : (
              /* ── Login / signup form ── */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mode === 'signup' && (
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Riya"
                      autoFocus
                      style={inputStyle}
                      onFocus={onInputFocus}
                      onBlur={onInputBlur}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                <div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    {mode === 'login' && (
                      <button type="button"
                        onClick={() => { setResetMode(true); setError(''); setMessage('') }}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontSize: 12, color: 'rgba(13,31,21,0.62)',
                          fontWeight: 500, cursor: 'pointer',
                        }}>
                        Forgot?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>

                {error && (
                  <p style={{
                    fontSize: 12, color: '#b85a3c', background: '#fdeae0',
                    padding: '8px 12px', borderRadius: 8, margin: 0,
                  }}>
                    {error}
                  </p>
                )}
                {message && (
                  <p style={{
                    fontSize: 12, color: '#1e5c30', background: '#d4ead8',
                    padding: '8px 12px', borderRadius: 8, margin: 0,
                  }}>
                    {message}
                  </p>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px 24px', marginTop: 6,
                  borderRadius: 10, background: '#0a120d', color: '#faf9f7',
                  fontSize: 14, fontWeight: 600, border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s, transform 0.15s',
                }}>
                  {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            )}

            {!resetMode && (
              <p style={{
                marginTop: 24, fontSize: 13,
                color: 'rgba(13,31,21,0.62)', textAlign: 'center',
              }}>
                {mode === 'login' ? 'No account? ' : 'Already have an account? '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); setName('') }}
                  style={{
                    color: '#0d1f15', fontWeight: 600,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: 13,
                    borderBottom: '1px solid rgba(30,55,32,0.18)',
                    paddingBottom: 1,
                  }}
                >
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

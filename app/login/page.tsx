'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fdf6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 340, padding: '0 20px' }}>

        {/* Logo mark above card */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <svg width="28" height="28" viewBox="0 0 160 160">
              <rect x="18" y="58" width="18" height="52" rx="9" fill="#d4ead8"/>
              <rect x="42" y="36" width="18" height="96" rx="9" fill="#8dcc9e"/>
              <rect x="66" y="18" width="18" height="132" rx="9" fill="#1e5c30"/>
              <rect x="90" y="36" width="18" height="96" rx="9" fill="#3a9e52"/>
              <rect x="114" y="58" width="18" height="52" rx="9" fill="#8dcc9e"/>
            </svg>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#1a3020', letterSpacing: -0.5 }}>
              Foc<span style={{ color: '#3a9e52' }}>ul</span>
            </span>
          </div>
        </div>

        {/* Card — matches the green voice recording card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #e8f5e8',
          padding: '24px 24px 20px',
          boxShadow: '0 2px 16px rgba(58,158,82,0.08)',
        }}>

          {/* Header row — like the recording timer indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{
              width: 7, height: 7,
              background: '#3a9e52',
              borderRadius: '50%',
              display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(58,158,82,0.15)',
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#3a9e52',
            }}>
              {resetMode ? 'Reset password' : mode === 'login' ? 'Welcome back' : 'Create account'}
            </span>
          </div>

          {/* Password reset form */}
          {resetMode ? (
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  color: '#7aaa7a', marginBottom: 5, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoFocus
                  style={{
                    width: '100%', border: '1.5px solid #e4f0e4', borderRadius: 12,
                    padding: '10px 14px', fontSize: 14, outline: 'none',
                    background: '#fafdf8', color: '#1a3020', fontFamily: 'inherit',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3a9e52'}
                  onBlur={e => e.target.style.borderColor = '#e4f0e4'}
                />
              </div>
              {error && (
                <p style={{ fontSize: 12, color: '#e07070', background: '#fff5f5', padding: '8px 12px', borderRadius: 10, margin: 0, border: '1px solid #fde8e8' }}>{error}</p>
              )}
              {message && (
                <p style={{ fontSize: 12, color: '#3a9e52', background: '#f0f9f2', padding: '8px 12px', borderRadius: 10, margin: 0, border: '1px solid #d4ead8' }}>{message}</p>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: 50, border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: loading ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, #2d8a44, #4db864)',
                boxShadow: '0 6px 20px rgba(58,158,82,0.32)', opacity: loading ? 0.7 : 1,
                marginTop: 6, letterSpacing: '0.01em',
              }}>
                {loading ? 'Sending…' : 'Send reset link →'}
              </button>
              <button type="button" onClick={() => { setResetMode(false); setError(''); setMessage('') }}
                style={{ background: 'none', border: 'none', color: '#a8c4a8', fontSize: 12, cursor: 'pointer', marginTop: -4 }}>
                ← Back to sign in
              </button>
            </form>
          ) : (

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Name field — signup only */}
            {mode === 'signup' && (
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  color: '#7aaa7a', marginBottom: 5, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Riya"
                  autoFocus
                  style={{
                    width: '100%', border: '1.5px solid #e4f0e4', borderRadius: 12,
                    padding: '10px 14px', fontSize: 14, outline: 'none',
                    background: '#fafdf8', color: '#1a3020', fontFamily: 'inherit',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3a9e52'}
                  onBlur={e => e.target.style.borderColor = '#e4f0e4'}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 600,
                color: '#7aaa7a', marginBottom: 5, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', border: '1.5px solid #e4f0e4', borderRadius: 12,
                  padding: '10px 14px', fontSize: 14, outline: 'none',
                  background: '#fafdf8', color: '#1a3020', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3a9e52'}
                onBlur={e => e.target.style.borderColor = '#e4f0e4'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{
                  fontSize: 11, fontWeight: 600,
                  color: '#7aaa7a', letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Password
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => { setResetMode(true); setError(''); setMessage('') }}
                    style={{ background: 'none', border: 'none', color: '#a8c4a8', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                    Forgot password?
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
                style={{
                  width: '100%', border: '1.5px solid #e4f0e4', borderRadius: 12,
                  padding: '10px 14px', fontSize: 14, outline: 'none',
                  background: '#fafdf8', color: '#1a3020', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3a9e52'}
                onBlur={e => e.target.style.borderColor = '#e4f0e4'}
              />
            </div>

            {error && (
              <p style={{
                fontSize: 12, color: '#e07070', background: '#fff5f5',
                padding: '8px 12px', borderRadius: 10, margin: 0,
                border: '1px solid #fde8e8',
              }}>
                {error}
              </p>
            )}
            {message && (
              <p style={{
                fontSize: 12, color: '#3a9e52', background: '#f0f9f2',
                padding: '8px 12px', borderRadius: 10, margin: 0,
                border: '1px solid #d4ead8',
              }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 50, border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: loading ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, #2d8a44, #4db864)',
                boxShadow: '0 6px 20px rgba(58,158,82,0.32)',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s, box-shadow 0.15s',
                marginTop: 6,
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = '0.88' }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = '1' }}
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#a8c4a8', marginTop: 18 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); setName('') }}
            style={{
              color: '#3a9e52', fontWeight: 700, background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 12,
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

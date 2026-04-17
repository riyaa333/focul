'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
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
      background: '#f8fdf8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 160 160">
              <rect x="18" y="58" width="18" height="52" rx="9" fill="#d4ead8"/>
              <rect x="42" y="36" width="18" height="96" rx="9" fill="#8dcc9e"/>
              <rect x="66" y="18" width="18" height="132" rx="9" fill="#1e5c30"/>
              <rect x="90" y="36" width="18" height="96" rx="9" fill="#3a9e52"/>
              <rect x="114" y="58" width="18" height="52" rx="9" fill="#8dcc9e"/>
            </svg>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#1a1410', letterSpacing: -1 }}>
              Foc<span style={{ color: '#3a9e52' }}>ul</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#a0b8a0', fontWeight: 400 }}>
            {mode === 'login' ? 'Welcome back.' : 'Start closing the loop.'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #e8f0e8',
          padding: '28px 28px 24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5a7a5a', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', border: '1.5px solid #e4ede4', borderRadius: 10,
                  padding: '10px 14px', fontSize: 14, outline: 'none',
                  background: '#fafdf8', color: '#1a1410', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3a9e52'}
                onBlur={e => e.target.style.borderColor = '#e4ede4'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5a7a5a', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                style={{
                  width: '100%', border: '1.5px solid #e4ede4', borderRadius: 10,
                  padding: '10px 14px', fontSize: 14, outline: 'none',
                  background: '#fafdf8', color: '#1a1410', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3a9e52'}
                onBlur={e => e.target.style.borderColor = '#e4ede4'}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#e07070', background: '#fff5f5', padding: '8px 12px', borderRadius: 8, margin: 0 }}>
                {error}
              </p>
            )}
            {message && (
              <p style={{ fontSize: 12, color: '#3a9e52', background: '#f0f9f2', padding: '8px 12px', borderRadius: 8, margin: 0 }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: loading ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, #2d8a44, #4aaa60)',
                boxShadow: '0 4px 16px rgba(45,138,68,0.25)',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s',
                marginTop: 4,
              }}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#a0b8a0', marginTop: 16 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            style={{ color: '#3a9e52', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12 }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

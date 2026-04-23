'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — it auto-handles the session
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords don\'t match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
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

        {/* Logo */}
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

        <div style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #e8f5e8',
          padding: '24px 24px 20px',
          boxShadow: '0 2px 16px rgba(58,158,82,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{
              width: 7, height: 7, background: '#3a9e52', borderRadius: '50%',
              display: 'inline-block', boxShadow: '0 0 0 3px rgba(58,158,82,0.15)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a9e52' }}>
              Create new password
            </span>
          </div>

          {!ready ? (
            <p style={{ fontSize: 13, color: '#a8c4a8', textAlign: 'center', padding: '12px 0' }}>
              Verifying your reset link…
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, color: '#7aaa7a',
                  marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
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

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600, color: '#7aaa7a',
                  marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
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
                  padding: '8px 12px', borderRadius: 10, margin: 0, border: '1px solid #fde8e8',
                }}>
                  {error}
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
                  opacity: loading ? 0.7 : 1, marginTop: 6, letterSpacing: '0.01em',
                }}
              >
                {loading ? 'Saving…' : 'Set new password →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

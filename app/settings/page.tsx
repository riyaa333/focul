'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type FoculWindow = {
  focul?: {
    platform?: string
    getShortcut?: () => Promise<string>
    setShortcut?: (s: string) => Promise<{ success: boolean; error?: string }>
  }
}

function formatShortcut(shortcut: string) {
  return shortcut
    .split('+')
    .map(k => {
      if (k === 'CommandOrControl' || k === 'Command') return '⌘'
      if (k === 'Shift') return '⇧'
      if (k === 'Alt') return '⌥'
      if (k === 'Control') return '⌃'
      if (k === 'Space') return 'Space'
      return k
    })
}

function capturedKeysToElectron(keys: Set<string>): string | null {
  const parts: string[] = []
  if (keys.has('Meta')) parts.push('CommandOrControl')
  else if (keys.has('Control')) parts.push('Control')
  if (keys.has('Shift')) parts.push('Shift')
  if (keys.has('Alt')) parts.push('Alt')
  const modifiers = new Set(['Meta', 'Control', 'Shift', 'Alt'])
  const mainKeys = [...keys].filter(k => !modifiers.has(k))
  if (mainKeys.length === 0 || parts.length === 0) return null
  let key = mainKeys[0]
  if (key === ' ') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()
  parts.push(key)
  return parts.join('+')
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: { display_name?: string } } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [shortcut, setShortcut] = useState('CommandOrControl+Shift+Space')
  const [capturingShortcut, setCapturingShortcut] = useState(false)
  const [capturedKeys, setCapturedKeys] = useState<string[]>([])
  const [shortcutError, setShortcutError] = useState('')
  const [shortcutSaved, setShortcutSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const heldKeys = useRef(new Set<string>())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
      setLoading(false)
    }
    load()

    const w = window as unknown as FoculWindow
    if (w.focul) {
      setIsElectron(true)
      w.focul.getShortcut?.().then(s => { if (s) setShortcut(s) })
    }
  }, [router])

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { setEditingName(false); return }
    await supabase.auth.updateUser({ data: { display_name: trimmed } })
    setDisplayName(trimmed)
    setEditingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleForgotPassword() {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    alert('Password reset email sent.')
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Shortcut capture
  useEffect(() => {
    if (!capturingShortcut) return
    heldKeys.current.clear()

    const onDown = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') { setCapturingShortcut(false); setCapturedKeys([]); return }
      heldKeys.current.add(e.key === 'Meta' ? 'Meta' : e.key === 'Control' ? 'Control' : e.key === 'Shift' ? 'Shift' : e.key === 'Alt' ? 'Alt' : e.key)
      const display = [...heldKeys.current].map(k => {
        if (k === 'Meta') return '⌘'
        if (k === 'Shift') return '⇧'
        if (k === 'Alt') return '⌥'
        if (k === 'Control') return '⌃'
        if (k === ' ') return 'Space'
        return k.length === 1 ? k.toUpperCase() : k
      })
      setCapturedKeys(display)
    }

    const onUp = async (e: KeyboardEvent) => {
      e.preventDefault()
      const electron = capturedKeysToElectron(heldKeys.current)
      if (!electron) { heldKeys.current.clear(); setCapturedKeys([]); return }
      setCapturingShortcut(false)
      setShortcutError('')
      const w = window as unknown as FoculWindow
      const result = await w.focul?.setShortcut?.(electron)
      if (result?.success === false) {
        setShortcutError(result.error || 'Shortcut already in use — try another.')
        setCapturedKeys([])
      } else {
        setShortcut(electron)
        setCapturedKeys([])
        setShortcutSaved(true)
        setTimeout(() => setShortcutSaved(false), 2000)
      }
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [capturingShortcut])

  if (loading) return null

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
    color: '#c0b8a8', marginBottom: 14,
  }
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 20, border: '1px solid #ede9e2',
    boxShadow: '0 2px 16px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 24,
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderBottom: '1px solid #f3f1ee',
  }
  const rowLast: React.CSSProperties = { ...row, borderBottom: 'none' }
  const label: React.CSSProperties = { fontSize: 13, color: '#1a1410', fontWeight: 500 }
  const value: React.CSSProperties = { fontSize: 13, color: '#a09888' }

  return (
    <div style={{
      minHeight: '100vh', background: '#faf9f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #f0ede8' }}>
        <button onClick={() => router.push('/dashboard')} style={{
          fontSize: 12, fontWeight: 500, color: '#b0a898', cursor: 'pointer',
          border: 'none', background: 'transparent', fontFamily: 'inherit',
        }}>← Dashboard</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1410', marginLeft: 24 }}>Settings</span>
      </nav>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Account */}
          <p style={sectionLabel}>Account</p>
          <div style={card}>
            {/* Display name */}
            <div style={row}>
              <span style={label}>Name</span>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    onBlur={saveName}
                    autoFocus
                    style={{
                      fontSize: 13, border: 'none', borderBottom: '1.5px solid #3a9e52',
                      outline: 'none', background: 'transparent', fontFamily: 'inherit',
                      color: '#1a1410', width: 160, padding: '0 0 2px 0', textAlign: 'right',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {nameSaved && <span style={{ fontSize: 11, color: '#3a9e52' }}>Saved</span>}
                  <span style={value}>{displayName}</span>
                  <button onClick={() => { setNameInput(displayName); setEditingName(true) }} style={{
                    fontSize: 11, color: '#b0a898', cursor: 'pointer', border: '1px solid #e8e2d8',
                    borderRadius: 6, padding: '3px 8px', background: 'transparent', fontFamily: 'inherit',
                  }}>Edit</button>
                </div>
              )}
            </div>

            {/* Email */}
            <div style={row}>
              <span style={label}>Email</span>
              <span style={value}>{user?.email}</span>
            </div>

            {/* Change password */}
            <div style={row}>
              <span style={label}>Password</span>
              <button onClick={handleForgotPassword} style={{
                fontSize: 12, color: '#3a9e52', cursor: 'pointer', border: 'none',
                background: 'transparent', fontFamily: 'inherit', fontWeight: 600,
              }}>Send reset email →</button>
            </div>

            {/* Sign out */}
            <div style={rowLast}>
              <span style={label}>Session</span>
              <button onClick={signOut} style={{
                fontSize: 12, color: '#e07070', cursor: 'pointer', border: 'none',
                background: 'transparent', fontFamily: 'inherit', fontWeight: 600,
              }}>Sign out</button>
            </div>
          </div>

          {/* Shortcuts — Electron only */}
          {isElectron && (
            <>
              <p style={sectionLabel}>Shortcuts</p>
              <div style={card}>
                <div style={rowLast}>
                  <div>
                    <span style={label}>Start recording</span>
                    <p style={{ fontSize: 11, color: '#b0a898', marginTop: 3 }}>
                      Opens Focul and starts voice capture from anywhere
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {capturingShortcut ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#f3f1ee', borderRadius: 10, padding: '6px 12px',
                        border: '1.5px dashed #3a9e52',
                      }}>
                        <span style={{ fontSize: 11, color: '#3a9e52', fontWeight: 600 }}>
                          {capturedKeys.length > 0 ? capturedKeys.join(' ') : 'Press keys…'}
                        </span>
                        <button onClick={() => { setCapturingShortcut(false); setCapturedKeys([]) }} style={{
                          fontSize: 11, color: '#c0b8a8', border: 'none', background: 'transparent',
                          cursor: 'pointer', marginLeft: 4,
                        }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {shortcutSaved && <span style={{ fontSize: 11, color: '#3a9e52' }}>Saved</span>}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {formatShortcut(shortcut).map((k, i) => (
                            <span key={i} style={{
                              fontSize: 12, fontWeight: 700, color: '#1a1410',
                              background: '#f0ede8', border: '1px solid #ddd8d0',
                              borderRadius: 6, padding: '3px 8px', fontFamily: 'monospace',
                            }}>{k}</span>
                          ))}
                        </div>
                        <button onClick={() => { setCapturingShortcut(true); setShortcutError('') }} style={{
                          fontSize: 11, color: '#b0a898', cursor: 'pointer', border: '1px solid #e8e2d8',
                          borderRadius: 6, padding: '3px 8px', background: 'transparent', fontFamily: 'inherit',
                        }}>Change</button>
                      </div>
                    )}
                    {shortcutError && (
                      <p style={{ fontSize: 11, color: '#e07070', margin: 0 }}>{shortcutError}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type FoculWindow = {
  focul?: {
    platform?: string
    getShortcut?: () => Promise<string>
    setShortcut?: (s: string) => Promise<{ success: boolean; error?: string }>
    getFnMode?: () => Promise<boolean>
    setFnMode?: (enabled: boolean) => Promise<void>
    setCaptureMode?: (on: boolean) => void
    onFnDown?: (cb: () => void) => void
    offFnDown?: () => void
  }
}

function formatShortcut(shortcut: string) {
  return shortcut
    .split('+')
    .map(k => {
      if (k === 'CommandOrControl' || k === 'Command') return 'Cmd'
      if (k === 'Shift') return 'Shift'
      if (k === 'Alt') return 'Option'
      if (k === 'Control') return 'Ctrl'
      if (k === 'Space') return 'Space'
      return k
    })
}

// Function keys (F1–F19) are safe to use as global shortcuts WITHOUT a modifier
// because they don't normally type characters — taking them globally won't steal
// "the letter R" from every text field on the user's Mac.
function isFunctionKey(k: string): boolean {
  return /^F([1-9]|1[0-9])$/.test(k)
}

function capturedKeysToElectron(keys: Set<string>): string | null {
  const parts: string[] = []
  if (keys.has('Meta')) parts.push('CommandOrControl')
  else if (keys.has('Control')) parts.push('Control')
  if (keys.has('Shift')) parts.push('Shift')
  if (keys.has('Alt')) parts.push('Alt')
  const modifiers = new Set(['Meta', 'Control', 'Shift', 'Alt'])
  const mainKeys = [...keys].filter(k => !modifiers.has(k))
  if (mainKeys.length === 0) return null
  let key = mainKeys[0]
  if (key === ' ') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()
  // Allow a function key on its own (F1–F19). For anything else, require a modifier.
  if (parts.length === 0 && !isFunctionKey(key)) return null
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
  const [fnMode, setFnMode] = useState(true)
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
      w.focul.getFnMode?.().then(v => setFnMode(v !== false))
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
      if (!electron) {
        const modifiers = new Set(['Meta', 'Control', 'Shift', 'Alt'])
        const pressedNonModifier = [...heldKeys.current].some(k => !modifiers.has(k))
        if (pressedNonModifier) {
          setShortcutError(
            "Plain letters can't be a global shortcut — they'd steal that key from every app on your Mac. " +
            "Hold Cmd, Ctrl, Option, or Shift with another key, or use a function key (F1–F19) on its own."
          )
        }
        heldKeys.current.clear()
        setCapturedKeys([])
        return
      }
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

    // Fn can't arrive as a keyboard event — macOS handles it below the browser.
    // The desktop app's native helper forwards Fn presses while capture mode is
    // on, so a tap of Fn here picks it as the trigger (by enabling Fn mode).
    const w = window as unknown as FoculWindow
    w.focul?.setCaptureMode?.(true)
    w.focul?.onFnDown?.(() => {
      w.focul?.setFnMode?.(true)
      setFnMode(true)
      setCapturingShortcut(false)
      setCapturedKeys([])
      setShortcutError('')
      setShortcutSaved(true)
      setTimeout(() => setShortcutSaved(false), 2000)
    })

    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      w.focul?.setCaptureMode?.(false)
      w.focul?.offFnDown?.()
    }
  }, [capturingShortcut])

  if (loading) return null

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
    color: '#9A957F', marginBottom: 14,
  }
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 6, border: '1px solid #E8E4DA',
    overflow: 'hidden', marginBottom: 24,
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderBottom: '1px solid #F2EFE7',
  }
  const rowLast: React.CSSProperties = { ...row, borderBottom: 'none' }
  const label: React.CSSProperties = { fontSize: 13, color: '#1F3A24', fontWeight: 500 }
  const value: React.CSSProperties = { fontSize: 13, color: '#8A8678' }

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F5EF',
      fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #E8E4DA' }}>
        <button onClick={() => router.push('/dashboard')} style={{
          fontSize: 12, fontWeight: 500, color: '#8A8678', cursor: 'pointer',
          border: 'none', background: 'transparent', fontFamily: 'inherit',
        }}>← Dashboard</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1F3A24', marginLeft: 24 }}>Settings</span>
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
                      fontSize: 13, border: 'none', borderBottom: '1.5px solid #3D6B47',
                      outline: 'none', background: 'transparent', fontFamily: 'inherit',
                      color: '#1F3A24', width: 160, padding: '0 0 2px 0', textAlign: 'right',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {nameSaved && <span style={{ fontSize: 11, color: '#3D6B47' }}>Saved</span>}
                  <span style={value}>{displayName}</span>
                  <button onClick={() => { setNameInput(displayName); setEditingName(true) }} style={{
                    fontSize: 11, color: '#8A8678', cursor: 'pointer', border: '1px solid #E8E4DA',
                    borderRadius: 4, padding: '3px 8px', background: 'transparent', fontFamily: 'inherit',
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
                fontSize: 12, color: '#3D6B47', cursor: 'pointer', border: 'none',
                background: 'transparent', fontFamily: 'inherit', fontWeight: 600,
              }}>Send reset email →</button>
            </div>

            {/* Sign out */}
            <div style={rowLast}>
              <span style={label}>Session</span>
              <button onClick={signOut} style={{
                fontSize: 12, color: '#b85a3c', cursor: 'pointer', border: 'none',
                background: 'transparent', fontFamily: 'inherit', fontWeight: 600,
              }}>Sign out</button>
            </div>
          </div>

          {/* Shortcuts — Electron only */}
          {isElectron && (
            <>
              <p style={sectionLabel}>Shortcuts</p>
              <div style={card}>
                <div style={{ ...rowLast, flexDirection: 'column', alignItems: 'stretch', gap: 14, padding: '18px 24px' }}>
                  {/* Title + description */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={label}>Quick voice debrief</span>
                      {shortcutSaved && (
                        <span style={{ fontSize: 11, color: '#3D6B47', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#8A8678', marginTop: 4, lineHeight: 1.45 }}>
                      Press these keys anywhere on your Mac to open Focul and start a 60-second voice debrief.
                    </p>
                  </div>

                  {/* Keys row */}
                  {capturingShortcut ? (
                    <div style={{
                      background: '#FAF9F4', borderRadius: 6,
                      border: '1.5px dashed #3D6B47', padding: '14px 16px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 26 }}>
                          {capturedKeys.length > 0 ? (
                            capturedKeys.map((k, i) => (
                              <span key={i} style={{
                                fontSize: 12, fontWeight: 700, color: '#1F3A24',
                                background: '#fff', border: '1px solid #E8E4DA',
                                borderRadius: 4, padding: '3px 9px', fontFamily: 'monospace',
                              }}>{k}</span>
                            ))
                          ) : (
                            <span style={{ fontSize: 12, color: '#3D6B47', fontWeight: 600 }}>
                              Listening — press your shortcut…
                            </span>
                          )}
                        </div>
                        <button onClick={() => { setCapturingShortcut(false); setCapturedKeys([]); setShortcutError('') }} style={{
                          fontSize: 11, color: '#8A8678', border: '1px solid #E8E4DA',
                          borderRadius: 4, padding: '4px 10px', background: '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>Cancel</button>
                      </div>
                      <p style={{ fontSize: 11, color: '#8A8678', margin: 0, lineHeight: 1.5 }}>
                        Hold <b style={{ color: '#1F3A24' }}>Cmd</b>, <b style={{ color: '#1F3A24' }}>Ctrl</b>, <b style={{ color: '#1F3A24' }}>Option</b>, or <b style={{ color: '#1F3A24' }}>Shift</b> with another key &mdash; or tap <b style={{ color: '#1F3A24' }}>Fn</b> or a function key (<b style={{ color: '#1F3A24' }}>F1&ndash;F19</b>) on its own. Press <b style={{ color: '#1F3A24' }}>Esc</b> to cancel.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 16, background: '#F7F5EF', borderRadius: 6,
                      border: '1px solid #E8E4DA', padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {formatShortcut(shortcut).map((k, i, arr) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <kbd style={{
                              fontFamily: 'inherit',
                              fontSize: 13, fontWeight: 600, color: '#1F3A24',
                              background: '#fff',
                              border: '1px solid #E8E4DA',
                              borderRadius: 5,
                              padding: '6px 12px',
                              minWidth: 28, textAlign: 'center',
                              boxShadow: 'none',
                              letterSpacing: '-0.01em',
                            }}>{k}</kbd>
                            {i < arr.length - 1 && (
                              <span style={{ fontSize: 12, color: '#B5B09C', fontWeight: 600 }}>+</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <button onClick={() => { setCapturingShortcut(true); setShortcutError('') }} style={{
                        fontSize: 12, fontWeight: 600, color: '#1F3A24', cursor: 'pointer',
                        border: '1px solid #1F3A24', borderRadius: 5, padding: '7px 14px',
                        background: 'transparent', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1F3A24'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1F3A24' }}>
                        Change
                      </button>
                    </div>
                  )}

                  {shortcutError && (
                    <p style={{ fontSize: 12, color: '#b85a3c', margin: 0, lineHeight: 1.4 }}>
                      {shortcutError}
                    </p>
                  )}

                  {/* Fn key — native listener, separate from the recorder above
                      because macOS never exposes Fn to apps as a shortcut key */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 16, background: '#F7F5EF', borderRadius: 6,
                    border: '1px solid #E8E4DA', padding: '14px 16px',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <kbd style={{
                          fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1F3A24',
                          background: '#fff', border: '1px solid #E8E4DA', borderRadius: 5,
                          padding: '6px 12px', minWidth: 28, textAlign: 'center',
                          letterSpacing: '-0.01em',
                        }}>Fn</kbd>
                        <span style={{ fontSize: 12, color: '#8A8678' }}>double-tap also works</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#8A8678', margin: '8px 0 0', lineHeight: 1.5 }}>
                        Double-tap Fn anywhere to start a debrief &mdash; a single
                        tap won&rsquo;t trigger it by accident. Works alongside the
                        shortcut above; turn it off here if you&rsquo;d rather keep
                        Fn for macOS.
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={fnMode}
                      onClick={() => {
                        const next = !fnMode
                        setFnMode(next)
                        ;(window as unknown as FoculWindow).focul?.setFnMode?.(next)
                      }}
                      style={{
                        width: 40, height: 24, borderRadius: 12, border: 'none',
                        cursor: 'pointer', padding: 2, flexShrink: 0,
                        background: fnMode ? '#3D6B47' : '#D8D4C8',
                        transition: 'background 0.15s',
                      }}>
                      <span style={{
                        display: 'block', width: 20, height: 20, borderRadius: '50%',
                        background: '#fff',
                        transform: fnMode ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 0.15s',
                      }} />
                    </button>
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

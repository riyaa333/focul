'use client'

// Live animated prototype — Apple-Intelligence aurora edge + Wispr-style
// floating recorder bar, in Focul greens. Open /preview/debrief and watch.

import { useEffect, useState } from 'react'

const MONO = 'ui-monospace, "SF Mono", monospace'
const SANS = "'General Sans', -apple-system, sans-serif"
const CREAM = '#F7F5EF'
const SAGE = '#8FA695'

export default function DebriefPrototype() {
  const [wave, setWave] = useState<number[]>(Array(14).fill(0.2))
  const [secs, setSecs] = useState(7)

  useEffect(() => {
    const w = setInterval(() => {
      setWave(prev => prev.map((v, i) => {
        const target = 0.15 + Math.random() * 0.85
        return v + (target - v) * (0.35 + (i % 3) * 0.12)
      }))
    }, 90)
    const t = setInterval(() => setSecs(s => (s + 1) % 61), 1000)
    return () => { clearInterval(w); clearInterval(t) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0B1810', overflow: 'hidden',
      fontFamily: SANS, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>

      {/* ── Aurora edge — Apple Intelligence style, Focul greens only ── */}
      {/* luminous ribbon hugging the viewport edge */}
      <div aria-hidden style={{
        position: 'absolute', inset: 10, pointerEvents: 'none',
        borderRadius: 24, padding: 26,
        background: 'conic-gradient(from 0deg, #3D8A52, #A9E0B4, #EAF6EC, #57B36E, #DCE9DF, #2F5E3C, #8FD69E, #3D8A52)',
        WebkitMask: 'linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)',
        maskComposite: 'exclude', WebkitMaskComposite: 'xor',
        filter: 'blur(22px)',
        animation: 'auroraHue 7s linear infinite, auroraBreathe 3.2s ease-in-out infinite',
      }} />
      {/* soft bloom beyond the ribbon */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55,
        background: 'radial-gradient(120% 60% at 50% -8%, rgba(143,214,158,0.28), transparent 55%), radial-gradient(120% 60% at 50% 108%, rgba(87,179,110,0.24), transparent 55%), radial-gradient(60% 120% at -8% 50%, rgba(169,224,180,0.2), transparent 55%), radial-gradient(60% 120% at 108% 50%, rgba(169,224,180,0.2), transparent 55%)',
        animation: 'auroraBreathe 3.2s ease-in-out infinite',
      }} />

      {/* ── Content ── */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 72 }}>
        <p style={{
          fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 600, color: CREAM,
          letterSpacing: '-0.025em', margin: 0, animation: 'fadeUp 0.7s ease both',
        }}>
          What did you get done?
        </p>
        <p style={{ fontSize: 14, color: SAGE, marginTop: 12, animation: 'fadeUp 0.7s 0.12s ease both' }}>
          Speak freely — Focul is listening.
        </p>
      </div>

      {/* ── Floating recorder bar — Wispr/Raycast compact tool ── */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 22,
        background: 'rgba(14,31,20,0.82)', backdropFilter: 'blur(18px)',
        border: '1px solid rgba(220,233,223,0.14)', borderRadius: 8,
        padding: '14px 16px 14px 22px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        animation: 'fadeUp 0.7s 0.2s ease both',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#C96442',
            animation: 'recPulse 1.4s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', color: '#DCE9DF',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
          </span>
        </span>

        {/* live waveform */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34, width: 150, justifyContent: 'center' }}>
          {wave.map((v, i) => (
            <span key={i} style={{
              display: 'block', width: 4, borderRadius: 2,
              background: v > 0.55 ? '#DCE9DF' : v > 0.3 ? '#A9C4AF' : '#5F7D66',
              height: `${Math.max(v * 100, 12)}%`,
              transition: 'height 0.09s ease-out',
            }} />
          ))}
        </span>

        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 22px', borderRadius: 6, border: 'none',
          background: CREAM, color: '#1F3A24', fontSize: 13, fontWeight: 600,
          fontFamily: SANS, cursor: 'pointer',
        }}>
          Done talking →
        </button>
      </div>

      <p style={{ position: 'relative', fontSize: 12, color: SAGE, marginTop: 22, animation: 'fadeUp 0.7s 0.3s ease both' }}>
        or press{' '}
        <kbd style={{
          fontFamily: SANS, fontWeight: 600, fontSize: 11,
          background: 'rgba(247,245,239,0.08)', border: '1px solid rgba(247,245,239,0.16)',
          borderRadius: 4, padding: '2px 8px', color: '#DCE9DF',
        }}>Space</kbd>{' '}
        to stop
      </p>

      <style>{`
        @keyframes auroraHue {
          from { filter: blur(22px) hue-rotate(0deg) }
          to   { filter: blur(22px) hue-rotate(40deg) }
        }
        @keyframes auroraBreathe {
          0%, 100% { opacity: 0.75 }
          50%      { opacity: 1 }
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1;    transform: scale(1) }
          50%      { opacity: 0.45; transform: scale(0.85) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}

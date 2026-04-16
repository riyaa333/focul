'use client'

export default function PreviewPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f0f0f0', padding: 40, minHeight: '100vh' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 }}>Timer options — pick one</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Option A — Tasks shown */}
        <div style={{ background: '#f9fdf6', borderRadius: 24, padding: 48, height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 10, color: '#999', marginBottom: 8, letterSpacing: 2 }}>OPTION A</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>13</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#a8c4a8', marginBottom: 4 }}>:</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>52</span>
          </div>
          <div style={{ width: 180, height: 2, background: '#eaf5e4', borderRadius: 4, marginBottom: 4, overflow: 'hidden' }}>
            <div style={{ width: '8%', height: '100%', background: '#3a9e52', borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 10, color: '#c0d4c0', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 32 }}>focusing</p>

          {/* Tasks */}
          <div style={{ width: '100%', maxWidth: 260, borderTop: '1px solid #eaf5e4', paddingTop: 20 }}>
            <p style={{ fontSize: 10, color: '#c0d4c0', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Working on</p>
            {['Finish onboarding flow', 'Fix pricing page copy', 'Email 5 beta users'].map((t, i) => (
              <p key={i} style={{ fontSize: 13, color: '#5a8060', display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#3a9e52', flexShrink: 0 }}>→</span>{t}
              </p>
            ))}
          </div>
        </div>

        {/* Option B — Session context */}
        <div style={{ background: '#f9fdf6', borderRadius: 24, padding: 48, height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 10, color: '#999', marginBottom: 8, letterSpacing: 2 }}>OPTION B</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ background: '#eaf5e4', color: '#3a9e52', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.5 }}>Session 3 today</span>
            <span style={{ color: '#c0d4c0', fontSize: 11 }}>·</span>
            <span style={{ color: '#c0d4c0', fontSize: 11 }}>15 min</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 12px' }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>13</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#a8c4a8', marginBottom: 4 }}>:</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>52</span>
          </div>

          <div style={{ width: 180, height: 2, background: '#eaf5e4', borderRadius: 4, marginBottom: 4, overflow: 'hidden' }}>
            <div style={{ width: '8%', height: '100%', background: '#3a9e52', borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 10, color: '#c0d4c0', letterSpacing: 3, textTransform: 'uppercase' }}>focusing</p>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#a8c4a8' }}>45 min focused today</p>
            <p style={{ fontSize: 12, color: '#a8c4a8' }}>12 tasks captured this week</p>
          </div>
        </div>

        {/* Option C — Ambient glow */}
        <div style={{ background: '#f9fdf6', borderRadius: 24, padding: 48, height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 10, color: '#999', marginBottom: 8, letterSpacing: 2, position: 'relative', zIndex: 1 }}>OPTION C</p>

          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(58,158,82,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(58,158,82,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>13</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#a8c4a8', marginBottom: 4 }}>:</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>52</span>
          </div>
          <div style={{ width: 180, height: 2, background: '#eaf5e4', borderRadius: 4, marginBottom: 4, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '8%', height: '100%', background: '#3a9e52', borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 10, color: '#c0d4c0', letterSpacing: 3, textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>focusing</p>
        </div>

        {/* Option D — All three */}
        <div style={{ background: '#f9fdf6', borderRadius: 24, padding: 48, height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 10, color: '#999', marginBottom: 8, letterSpacing: 2, position: 'relative', zIndex: 1 }}>OPTION D — ALL THREE</p>

          {/* Glow */}
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(58,158,82,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, position: 'relative', zIndex: 1 }}>
            <span style={{ background: '#eaf5e4', color: '#3a9e52', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Session 3</span>
            <span style={{ color: '#c0d4c0', fontSize: 10 }}>· 15 min</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>13</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#a8c4a8', marginBottom: 4 }}>:</span>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#1a3020', letterSpacing: -2, lineHeight: 1 }}>52</span>
          </div>
          <div style={{ width: 160, height: 2, background: '#eaf5e4', borderRadius: 4, marginBottom: 4, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '8%', height: '100%', background: '#3a9e52', borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 9, color: '#c0d4c0', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, position: 'relative', zIndex: 1 }}>focusing</p>

          <div style={{ width: '100%', maxWidth: 240, borderTop: '1px solid #eaf5e4', paddingTop: 16, position: 'relative', zIndex: 1 }}>
            {['Finish onboarding flow', 'Fix pricing page copy'].map((t, i) => (
              <p key={i} style={{ fontSize: 12, color: '#5a8060', display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ color: '#3a9e52' }}>→</span>{t}
              </p>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

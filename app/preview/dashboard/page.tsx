'use client'

// Dashboard layout comparison board — 5 arrangements, static mockups.
// Pick one and we rebuild app/dashboard for real.

const SANS = "'General Sans', -apple-system, sans-serif"
const MONO = 'ui-monospace, "SF Mono", monospace'
const CREAM = '#F7F5EF'
const INKDARK = '#1F3A24'
const SAGE = '#8A8678'
const FOREST = '#0E1F14'
const HAIR = '#E8E4DA'

const frame: React.CSSProperties = {
  height: 560, borderRadius: 8, overflow: 'hidden', background: CREAM,
  fontFamily: SANS, display: 'flex', flexDirection: 'column',
  border: `1px solid ${HAIR}`,
}
const tag: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#999',
  textTransform: 'uppercase', marginBottom: 10, fontFamily: SANS,
}
const card: React.CSSProperties = {
  background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6,
}

function Nav() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', borderBottom: `1px solid ${HAIR}` }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: INKDARK }}>⸙ Focul</span>
      <span style={{ display: 'flex', gap: 14, fontSize: 11, color: SAGE }}>
        <b style={{ color: INKDARK }}>Today</b><span>History</span><span>Settings</span>
      </span>
      <span style={{ fontSize: 10, color: SAGE }}>🔥 1-day · R</span>
    </div>
  )
}

function Timer({ big = 56, light = true }: { big?: number; light?: boolean }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: big, fontWeight: 300, lineHeight: 1,
      color: light ? CREAM : INKDARK, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
    }}>15:00</span>
  )
}

function Chips({ dark = true }: { dark?: boolean }) {
  const base: React.CSSProperties = {
    fontSize: 9, padding: '4px 10px', borderRadius: 4, fontWeight: 600,
  }
  return (
    <span style={{ display: 'inline-flex', gap: 5 }}>
      <span style={{ ...base, background: dark ? 'rgba(247,245,239,0.14)' : '#EFECE3', color: dark ? CREAM : INKDARK }}>15 min</span>
      <span style={{ ...base, color: dark ? 'rgba(247,245,239,0.5)' : SAGE }}>30 min</span>
      <span style={{ ...base, color: dark ? 'rgba(247,245,239,0.5)' : SAGE }}>Custom</span>
    </span>
  )
}

function CTA({ dark = false, wide = false }: { dark?: boolean; wide?: boolean }) {
  return (
    <span style={{
      display: wide ? 'flex' : 'inline-flex', justifyContent: 'center',
      padding: '9px 20px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: dark ? INKDARK : CREAM, color: dark ? CREAM : INKDARK,
    }}>Start 15-min session →</span>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: INKDARK }}>{n}</div>
      <div style={{ fontSize: 9, color: SAGE }}>{l}</div>
    </div>
  )
}

function Coach({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ ...card, padding: compact ? '10px 14px' : 14, display: compact ? 'flex' : 'block', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: INKDARK }}>● Focus Coach</span>
      <span style={{ fontSize: 10, color: SAGE, display: compact ? 'inline' : 'block', marginTop: compact ? 0 : 6, flex: 1 }}>
        The mobile app view keeps showing up unfinished — make it this sprint?
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: CREAM, background: INKDARK, borderRadius: 4, padding: '5px 10px', marginTop: compact ? 0 : 8, display: 'inline-block' }}>
        Start this sprint
      </span>
    </div>
  )
}

function Week() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Mo'].map((d, i) => (
        <div key={d} style={{ textAlign: 'center' }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', fontSize: 7,
            border: `1px solid ${i === 6 ? INKDARK : HAIR}`,
            background: i === 6 ? INKDARK : 'transparent', color: i === 6 ? CREAM : SAGE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{i === 6 ? '15' : '–'}</div>
          <div style={{ fontSize: 7, color: SAGE, marginTop: 2 }}>{d}</div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPreview() {
  return (
    <div style={{ fontFamily: SANS, background: '#EAE7DE', padding: 36, minHeight: '100vh' }}>
      <p style={{ ...tag, marginBottom: 28 }}>Dashboard layouts — 5 options, pick one</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28, maxWidth: 860, margin: '0 auto' }}>

        {/* 1 — Hero strip */}
        <div>
          <p style={tag}>1 · Hero strip — timer as a wide band, bento below</p>
          <div style={frame}>
            <Nav />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <div>
                <div style={{ fontSize: 9, color: SAGE, letterSpacing: 1.5 }}>MONDAY · JULY 13</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: INKDARK }}>Good afternoon, Riya.</div>
              </div>
              <div style={{
                background: FOREST, borderRadius: 6, padding: '22px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                  <Timer />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 9, color: '#8FA695', letterSpacing: 1.2 }}>READY WHEN YOU ARE</span>
                    <Chips />
                  </div>
                </div>
                <CTA />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, flex: 1 }}>
                <Coach />
                <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Today</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Stat n="1" l="sessions" /><Stat n="0" l="tasks" /><Stat n="1" l="streak" />
                  </div>
                  <Week />
                </div>
                <div style={{ ...card, padding: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Your tasks</span>
                  <p style={{ fontSize: 9, color: SAGE, marginTop: 8 }}>Tasks from your debriefs land here.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2 — Balanced bento */}
        <div>
          <p style={tag}>2 · Balanced bento — equal-height grid, no dead space</p>
          <div style={frame}>
            <Nav />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: INKDARK }}>Good afternoon, Riya.</div>
                <div style={{ fontSize: 9, color: SAGE }}>MONDAY · JULY 13</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, flex: 1 }}>
                <div style={{
                  background: FOREST, borderRadius: 6, padding: 24,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 9, color: '#8FA695', letterSpacing: 1.2 }}>READY WHEN YOU ARE</span>
                  <div style={{ textAlign: 'center' }}>
                    <Timer big={64} />
                    <div style={{ marginTop: 14 }}><Chips /></div>
                  </div>
                  <CTA wide />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Coach />
                  <div style={{ ...card, padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Today</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <Stat n="1" l="sessions" /><Stat n="0" l="tasks" /><Stat n="1" l="streak" />
                    </div>
                    <Week />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 — Command centre */}
        <div>
          <p style={tag}>3 · Command centre — compact timer bar, grid below</p>
          <div style={frame}>
            <Nav />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <div style={{
                background: FOREST, borderRadius: 6, padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: CREAM }}>Good afternoon, Riya.</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Timer big={26} /><Chips /><CTA />
                </div>
              </div>
              <Coach compact />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
                <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Today</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Stat n="1" l="sessions" /><Stat n="0" l="tasks" /><Stat n="1" l="streak" />
                  </div>
                  <Week />
                </div>
                <div style={{ ...card, padding: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Your tasks</span>
                  <p style={{ fontSize: 9, color: SAGE, marginTop: 8 }}>Tasks from your debriefs land here.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 — Split instrument */}
        <div>
          <p style={tag}>4 · Split instrument — dark left rail, content right</p>
          <div style={{ ...frame, flexDirection: 'row' }}>
            <div style={{
              width: '38%', background: FOREST, display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', padding: 22,
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: CREAM }}>⸙ Focul</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: '#8FA695', letterSpacing: 1.2 }}>READY WHEN YOU ARE</span>
                <div style={{ marginTop: 12 }}><Timer big={58} /></div>
                <div style={{ marginTop: 14 }}><Chips /></div>
              </div>
              <CTA wide />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${HAIR}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: INKDARK }}>Good afternoon, Riya.</span>
                <span style={{ fontSize: 9, color: SAGE }}>JULY 13</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <Coach />
                <div style={{ ...card, padding: 14, display: 'flex', gap: 20, alignItems: 'center' }}>
                  <Stat n="1" l="sessions" /><Stat n="0" l="tasks" /><Stat n="1" l="streak" />
                  <div style={{ marginLeft: 'auto' }}><Week /></div>
                </div>
                <div style={{ ...card, padding: 14, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: INKDARK }}>Your tasks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5 — Focus-first */}
        <div>
          <p style={tag}>5 · Focus-first — timer owns the page, rest is a footer strip</p>
          <div style={frame}>
            <Nav />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontSize: 9, color: SAGE, letterSpacing: 1.5 }}>MONDAY · JULY 13 — READY WHEN YOU ARE</span>
              <Timer big={92} light={false} />
              <Chips dark={false} />
              <CTA dark />
              <span style={{ fontSize: 9, color: SAGE }}>Bell rings, then 60s voice debrief</span>
            </div>
            <div style={{
              borderTop: `1px solid ${HAIR}`, padding: '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <Stat n="1" l="sessions" /><Stat n="0" l="tasks" /><Stat n="1" l="streak" />
              </div>
              <span style={{ fontSize: 9, color: SAGE, flex: 1 }}>● Coach: mobile app view keeps slipping — make it this sprint?</span>
              <Week />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

import sharp from 'sharp'

const svg = `<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dotgrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#1F5C36" fill-opacity="0.22"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#0A1410"/>
  <rect width="1200" height="630" fill="url(#dotgrid)"/>
  <g transform="translate(135 195)">
    <rect x="0"   y="55" width="26" height="100" rx="13" fill="#3D6B47"/>
    <rect x="38"  y="30" width="26" height="150" rx="13" fill="#5C8E5A"/>
    <rect x="76"  y="0"  width="26" height="210" rx="13" fill="#A8C4A0"/>
    <rect x="114" y="25" width="26" height="160" rx="13" fill="#7BA177"/>
    <rect x="152" y="50" width="26" height="110" rx="13" fill="#456C42"/>
  </g>
  <line x1="395" y1="190" x2="395" y2="430" stroke="#7BA177" stroke-width="2" stroke-opacity="0.7"/>
  <text x="445" y="345" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif" font-size="112" font-weight="500" fill="#F4F0E4" letter-spacing="-3.6">Focul</text>
  <text x="448" y="400" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif" font-size="22" font-weight="400" fill="#7BA177" letter-spacing="0.4">Close the loop on your work day.</text>
  <line x1="52" y1="555" x2="1148" y2="555" stroke="#1F5C36" stroke-opacity="0.5" stroke-width="1"/>
  <text x="52" y="592" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="13" fill="#5C8E5A" letter-spacing="0.3">focul.co</text>
  <text x="600" y="592" text-anchor="middle" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="13" fill="#456C42" letter-spacing="0.3">focus timer · voice debrief</text>
  <text x="1148" y="592" text-anchor="end" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="13" fill="#5C8E5A" letter-spacing="0.3">●  v 0.1 · macOS</text>
</svg>`

await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile('public/focul-og.png')

console.log('wrote public/focul-og.png')

import sharp from 'sharp'

const icon = (size, padding) => {
  const innerSize = size - padding * 2
  const barUnit = innerSize / 11
  const barW = barUnit * 1.4
  const gap = barUnit * 0.55
  const totalW = barW * 5 + gap * 4
  const startX = (size - totalW) / 2
  const cy = size / 2
  const heights = [0.4, 0.6, 0.85, 0.66, 0.45]
  const colors = ['#3D6B47', '#5C8E5A', '#1F5C36', '#7BA177', '#456C42']
  const bars = heights.map((h, i) => {
    const bh = innerSize * h
    const x = startX + i * (barW + gap)
    const y = cy - bh / 2
    const r = barW / 2
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="${r}" fill="${colors[i]}"/>`
  }).join('')
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#F4F0E4"/>
    ${bars}
  </svg>`
}

await sharp(Buffer.from(icon(180, 26))).resize(180, 180).png().toFile('public/apple-touch-icon.png')
await sharp(Buffer.from(icon(192, 28))).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(Buffer.from(icon(512, 70))).resize(512, 512).png().toFile('public/icon-512.png')

console.log('wrote apple-touch-icon.png, icon-192.png, icon-512.png')

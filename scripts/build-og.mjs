import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const svg = `<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#F4F0E4"/>
  <rect x="496" y="180" width="34" height="115" rx="17" fill="#D0E2C8"/>
  <rect x="554" y="150" width="34" height="175" rx="17" fill="#95BD8D"/>
  <rect x="612" y="115" width="34" height="245" rx="17" fill="#1F5C36"/>
  <rect x="670" y="143" width="34" height="190" rx="17" fill="#4DA257"/>
  <rect x="728" y="175" width="34" height="128" rx="17" fill="#9FC196"/>
  <text x="630" y="460" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif" font-size="86" font-weight="500" fill="#1F3A24" letter-spacing="-2.6">Focul</text>
  <text x="630" y="515" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif" font-size="22" font-weight="400" fill="#5F7D66" letter-spacing="0.4">Close the loop on your work day</text>
</svg>`

await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile('public/focul-og.png')

console.log('wrote public/focul-og.png')

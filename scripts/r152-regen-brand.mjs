// r152 (Phase 5) — regenerate the Smart-Menu raster brand assets in the
// «Warm Culinary Editorial» identity: terracotta metal plate (#C2452D →
// #8A2B1D @145°, mirroring globals.css .qr-corner / --btn-primary pair)
// with the CONSTANT cream glyph #FBF7F0 (5.0:1 on the metal), replacing the
// retired night+gold Madarek marks.
//
// Outputs (same sizes/formats as the old set, zero markup change anywhere):
//   public/favicon.png (48) · public/icon-192.png · public/icon-512.png
//   public/apple-touch-icon.png (180) · public/brand-icon.png (160)
//   src/app/favicon.ico (16/32/48 PNG-in-ICO)
//
// The glyph is the brand menu-mark (three courses + the order dot) — the
// same path the OG template and .qr-corner SVG consumers draw.
//
// Usage: node scripts/r152-regen-brand.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* The brand mark — logical SVG (drawn in a 512 viewBox so every export is a
   downscale; radius = 22% of the box, exactly the .qr-corner law). */
const TERRACOTTA = '#C2452D';
const TERRACOTTA_DEEP = '#8A2B1D';
const CREAM = '#FBF7F0';

function brandSvg(size) {
  const r = Math.round(size * 0.22);
  const s = size;
  const stroke = (size / 512) * 40; // glyph stroke scales with the box
  const x1 = (x) => (x * s) / 100;
  const y1 = (y) => (y * s) / 100;
  const line = (a, b, c, d) =>
    `<line x1="${x1(a)}" y1="${y1(b)}" x2="${x1(c)}" y2="${y1(d)}" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${TERRACOTTA}"/>
      <stop offset="1" stop-color="${TERRACOTTA_DEEP}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${s}" height="${s}" rx="${r}" fill="url(#m)"/>
  <g stroke="${CREAM}" stroke-width="${stroke}" fill="none">
    ${line(24, 34, 76, 34)}
    ${line(24, 50, 76, 50)}
    ${line(24, 66, 58, 66)}
  </g>
  <circle cx="${x1(72)}" cy="${y1(66)}" r="${(size / 512) * 26}" fill="${CREAM}"/>
</svg>`;
}

async function png(size, out) {
  await sharp(Buffer.from(brandSvg(512)))
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toFile(join(ROOT, out));
  console.log('✓', out, `${size}x${size}`);
}

/* ICO container with PNG payloads (Vista+ — every modern browser). */
async function ico(sizes, out) {
  const images = [];
  for (const size of sizes) {
    images.push(await sharp(Buffer.from(brandSvg(512))).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer());
  }
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  images.forEach((buf, i) => {
    const size = sizes[i];
    entries.writeUInt8(size === 256 ? 0 : size, i * 16 + 0); // width
    entries.writeUInt8(size === 256 ? 0 : size, i * 16 + 1); // height
    entries.writeUInt8(0, i * 16 + 2); // palette
    entries.writeUInt8(0, i * 16 + 3); // reserved
    entries.writeUInt16LE(1, i * 16 + 4); // color planes
    entries.writeUInt16LE(32, i * 16 + 6); // bits per pixel
    entries.writeUInt32LE(buf.length, i * 16 + 8); // payload size
    entries.writeUInt32LE(offset, i * 16 + 12); // payload offset
    offset += buf.length;
  });
  writeFileSync(join(ROOT, out), Buffer.concat([header, entries, ...images]));
  console.log('✓', out, sizes.join('/'));
}

await png(48, 'public/favicon.png');
await png(192, 'public/icon-192.png');
await png(512, 'public/icon-512.png');
await png(180, 'public/apple-touch-icon.png');
await png(160, 'public/brand-icon.png');
await ico([16, 32, 48], 'src/app/favicon.ico');
console.log('done — 6 raster brand assets re-rendered in the terracotta identity');

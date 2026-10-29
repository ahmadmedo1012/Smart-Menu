// P31-C (landing layout repair) — the §02 showcase's ONE food-imagery
// ratio contract: 4/3, centre crop, normalised at the asset level.
//
// The r141 culinary set shipped the four category plates at MIXED intrinsic
// ratios — cat-hot 1024×745 (≈1.37:1) while cat-cold/cat-dessert/cat-snacks
// are 1024×1024 (1:1). The showcase plate (landing.css §8) renders every
// panel in one 4/3 box with object-fit: cover, so the cover crop jumped per
// panel: the squares lost 25% of their height while cat-hot lost ~3% width —
// the "inconsistent crop/ratio between panels" the VLM audit flagged.
//
// This one-shot normalises the four plates to the same 4:3 master (sharp,
// centre crop from the PNG provenance sources, WebP q82 — the exact
// r142-convert-culinary-webp.mjs pipeline). Same art, same dishes, no new
// claims (r82); only the crop unifies. Saliency-checked before cropping:
// the centre 4:3 band carries 87–92% of each square's row-wise edge energy
// (the trimmed bands are low-energy background), and cat-hot trims 15px per
// side. The PNG sources stay untouched on disk.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'public/images/culinary';
const PLATES = ['cat-hot', 'cat-cold', 'cat-dessert', 'cat-snacks'];
const TARGET = 4 / 3;

const kb = async (p) => Math.round((await stat(p)).size / 1024);

let ok = 0;
for (const name of PLATES) {
  const src = join(DIR, `${name}.png`);
  const out = join(DIR, `${name}.webp`);
  const meta = await sharp(src).metadata();
  let { width: w, height: h } = meta;
  let left = 0;
  let top = 0;
  if (w / h > TARGET) {
    // wider than 4:3 — trim the sides
    w = Math.round(h * TARGET);
    left = Math.round((meta.width - w) / 2);
  } else {
    // taller (or equal) — trim top/bottom
    h = Math.round(w / TARGET);
    top = Math.round((meta.height - h) / 2);
  }
  await sharp(src)
    .extract({ left, top, width: w, height: h })
    .webp({ quality: 82 })
    .toFile(`${out}.tmp`);
  const { rename } = await import('node:fs/promises');
  await rename(`${out}.tmp`, out);
  console.log(
    `${name}.webp: ${meta.width}×${meta.height} → ${w}×${h} (4:3 centre, ` +
      `crop ${left}×${top}) · ${await kb(src)}KB PNG → ${await kb(out)}KB WebP`
  );
  ok += 1;
}
console.log(`done: ${ok}/${PLATES.length} plates normalised to 4:3`);

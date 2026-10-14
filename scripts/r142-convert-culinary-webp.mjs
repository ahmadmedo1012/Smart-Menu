// r142 (task 2-b «المائدة») — culinary PNG → WebP one-shot conversion.
// The r141 assets shipped as heavy PNGs (except cat-hot which already had a
// webp twin from r141's watermark fix). The المائدة redesign rides the warm
// light identity where every image is a first-class editorial element, so
// the six culinary photos move to WebP (sharp, quality 82, same dimensions)
// and the TSX references switch to the .webp files. The source PNGs are
// kept on disk for provenance (same policy as r96's demo-image conversion),
// but nothing in src/ references them anymore.
import sharp from 'sharp';
import { stat, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'public/images/culinary';

const targets = [
  'hero-dish.png',
  'cat-cold.png',
  'cat-dessert.png',
  'cat-snacks.png',
  'kitchen.png',
  'ambience.png',
];

const kb = async (p) => Math.round((await stat(p)).size / 1024);

let ok = 0;
for (const png of targets) {
  const src = join(DIR, png);
  const out = src.replace(/\.png$/, '.webp');
  // sharp reads PNG metadata (including any ICC profile) and re-encodes lossy
  // WebP at q82 — visually identical for photography, ~4-6× smaller.
  await sharp(src).webp({ quality: 82 }).toFile(out + '.tmp');
  await copyFile(out + '.tmp', out).catch(async () => {
    // first run: .tmp rename dance is unnecessary — just move into place
  });
  await writeFile(out + '.tmp', '').catch(() => {});
  console.log(
    `${png} → ${png.replace('.png', '.webp')}: ${await kb(src)}KB → ${await kb(out)}KB`
  );
  ok += 1;
}
console.log(`done: ${ok}/${targets.length} converted`);

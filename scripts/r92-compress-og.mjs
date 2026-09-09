// r92-D12: compress public/og-default.png losslessly-for-purpose (palette + q80)
//
// The committed OG card (1200x630) was 176KB of full-RGB PNG — it is served
// with a 1-day SWR cache (next.config.ts) but every cache miss pays the full
// payload. A palette (indexed-color) PNG at quality 80 keeps the exact same
// pixel dimensions and is visually indistinguishable for a flat brand card
// (large solid areas, few gradients).
//
// SAFETY CONTRACT (this script refuses to damage the file):
//   1. Dimensions of the compressed buffer MUST equal the original's
//      (1200x630) — otherwise abort without writing.
//   2. The compressed buffer MUST be strictly smaller than the original —
//      otherwise abort without writing (no-op is a success, not an error).
//   3. A byte-exact backup is staged in tmp/ (gitignored) before the
//      overwrite, re-verified against the ORIGINAL bytes, and deleted only
//      after the new file is confirmed on disk. Any failure restores the
//      backup. (git checkout is the ultimate fallback — the file is tracked.)
//
// Usage: node scripts/r92-compress-og.mjs [--in public/og-default.png]
//
// NOTE (deferred, documented in worklog r92): scripts/render-og.mjs (the
// generator) writes a plain Playwright screenshot PNG with no compression
// options — regenerating the card will reintroduce a ~176KB file. The
// follow-up is to chain this same sharp palette step into render-og.mjs;
// left out of this round's file scope on purpose.
import sharp from 'sharp';
import { statSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const input = arg('in', 'public/og-default.png');
const tmpDir = 'tmp';
const backup = join(tmpDir, `r92-og-backup-${basename(input)}`);

const bytes = (n) => `${(n / 1024).toFixed(1)}K`;

const stat = statSync(input);
const originalBuf = readFileSync(input);
const meta = await sharp(originalBuf).metadata();
const before = { size: stat.size, width: meta.width, height: meta.height };

// 1) compress: palette (indexed) PNG, quality 80 — libvips' pngquant-style path
const compressedBuf = await sharp(input)
  .png({ palette: true, quality: 80 })
  .toBuffer();

const compressedMeta = await sharp(compressedBuf).metadata();
const after = { size: compressedBuf.length, width: compressedMeta.width, height: compressedMeta.height };

console.log(`OG_COMPRESS in=${input}`);
console.log(`  before: ${bytes(before.size)} (${before.width}x${before.height}, ${meta.channels}-channel)`);
console.log(`  after : ${bytes(after.size)} (${after.width}x${after.height}, ${compressedMeta.channels === 1 ? 'palette' : compressedMeta.channels}-channel)`);

// 2) hard gate: identical dimensions, strictly smaller
if (after.width !== before.width || after.height !== before.height) {
  console.error(`  ABORT: dimensions changed (${before.width}x${before.height} -> ${after.width}x${after.height}) — nothing written.`);
  process.exit(1);
}
if (after.size >= before.size) {
  console.log('  NO-OP: compression did not shrink the file — original kept untouched.');
  process.exit(0);
}

// 3) stage backup, write, verify, cleanup — restore on any failure
mkdirSync(tmpDir, { recursive: true });
writeFileSync(backup, originalBuf);
if (!readFileSync(backup).equals(originalBuf)) {
  console.error('  ABORT: backup verification failed — nothing written.');
  process.exit(1);
}

try {
  writeFileSync(input, compressedBuf);
  const onDisk = statSync(input);
  if (onDisk.size !== compressedBuf.length) {
    throw new Error(`written size mismatch (${onDisk.size} != ${compressedBuf.length})`);
  }
  console.log(`  OK: ${bytes(before.size)} -> ${bytes(after.size)} (-${(100 - (100 * after.size) / before.size).toFixed(1)}%), dimensions unchanged.`);
} catch (e) {
  console.error(`  FAILED: ${e.message} — restoring backup.`);
  renameSync(backup, input);
  process.exit(1);
} finally {
  if (existsSync(backup)) unlinkSync(backup); // temp backup never enters the repo
}

// Render OG image via page.setContent with embedded brand fonts (serverless)
//
// round88-E9: this script was committed with a syntax-broken line 6
// (readFileSync('new URL(...)') as a literal string) — it could not run at
// all. Fixed + parameterized: you can now render the brand card as-is
// (default: regenerate public/og-default.png) or override the copy fields
// without editing the template.
//
// r152 (Phase 5): the template is now Warm Culinary Editorial identity
// (cream #FBF7F0 / espresso #241811 / terracotta metal #C2452D→#8A2B1D
// @145°) and self-hosts Baloo Bhaijaan 2 (display) + IBM Plex Sans Arabic from
// ../public/fonts/ (relative to scripts/og-template.html). ROOT is derived
// from this file's location (the old hard-coded /home/z/my-project/Smart-Menu
// path died with the repo move), and EVERY woff2 the template references is
// inlined as a data URI — setContent() has no base URL, so the relative
// font paths only resolve via the inline pass (the file:// + playwright
// path in DESIGN.md renders the template directly instead).
//
// Usage:
//   node scripts/render-og.mjs
//   node scripts/render-og.mjs --out public/og-restaurant.png \
//        --title "منيو الواحة" --tagline "قهوة · مشاوي" --url "menu.smart-link.ly/menu/al-waha-cafe"
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const out = arg('out', join(ROOT, 'public/og-default.png'));
const title = arg('title', null);
const tagline = arg('tagline', null);
const url = arg('url', null);

const templatePath = new URL('./og-template.html', import.meta.url);
const template = readFileSync(templatePath, 'utf8');

// Optional copy overrides — plain marker replacement, template stays untouched
let html = template;
if (title) html = html.replace(/<h1>[\s\S]*?<\/h1>/, () => `<h1>${title}</h1>`);
if (tagline) html = html.replace(/<div class="tagline">[\s\S]*?<\/div>/, () => `<div class="tagline">${tagline}</div>`);
if (url) html = html.replace(/<div class="url">[\s\S]*?<\/div>/, () => `<div class="url">${url}</div>`);

// Inline every woff2 the template references (url('../public/fonts/X.woff2'))
// as data URIs so setContent() needs no server or file access.
html = html.replace(/url\('\.\.\/public\/fonts\/([^']+)'\)/g, (_, file) => {
  const buf = readFileSync(join(ROOT, 'public/fonts', file));
  return `url(data:font/woff2;base64,${buf.toString('base64')})`;
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // font parse + layout settle
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log(`OG_IMAGE_RENDERED warm-culinary-editorial 1200x630 -> ${out}`);

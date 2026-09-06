// Render OG image via page.setContent with embedded brand fonts (serverless)
//
// round88-E9: this script was committed with a syntax-broken line 6
// (readFileSync('new URL(...)') as a literal string) — it could not run at
// all. Fixed + parameterized: you can now render the brand card as-is
// (default: regenerate public/og-default.png) or override the copy fields
// without editing the template.
//
// Usage:
//   node scripts/render-og.mjs
//   node scripts/render-og.mjs --out public/og-restaurant.png \
//        --title "منيو الواحة" --tagline "قهوة · مشاوي" --url "menu.smart-link.ly/menu/al-waha-cafe"
//
// NOTE: the rendered PNG is a build-time artifact — the committed
// public/og-default.png stays the source of truth until a maintainer
// regenerates and reviews it (public/** is outside the round88-E file scope
// apart from manifest/offline).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = '/home/z/my-project/Smart-Menu';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const out = arg('out', `${ROOT}/public/og-default.png`);
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

// Inline the woff2 fonts as data URIs so no server is needed
const readex = readFileSync(`${ROOT}/public/fonts/readex-pro.woff2`);
const readexLatin = readFileSync(`${ROOT}/public/fonts/readex-pro-latin.woff2`);
const b64 = (f) => f.toString('base64');
html = html
  .replace("src: url('/fonts/readex-pro.woff2')", `src: url(data:font/woff2;base64,${b64(readex)})`)
  .replace("src: url('/fonts/readex-pro-latin.woff2')", `src: url(data:font/woff2;base64,${b64(readexLatin)})`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); // font parse + layout settle
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log(`OG_IMAGE_RENDERED serverless 1200x630 -> ${out}`);

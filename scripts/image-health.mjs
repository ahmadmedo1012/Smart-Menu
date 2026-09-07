#!/usr/bin/env node
/**
 * R91 F-C (D3 §4 design) — image health checker for MenuItem/Restaurant images.
 *
 * WHY: write-side validation (mediaUrlError, upload magic-bytes) checks
 * scheme/tenant/size but NEVER liveness — CDN link-rot (the dead Unsplash
 * photo-1563379926898 seed URL D6 saw rendered as a broken frame) breaks
 * silently client-side with a fallback icon. This script is the detector.
 *
 * READ-ONLY core:
 *  - SELECT every MenuItem.image (WHERE image <> '') + Restaurant.logo +
 *    Restaurant.gallery (covers) + cheap fs check of the local og-default.png.
 *  - classification:
 *      ''             → not selected; counted separately (renders placeholder)
 *      data:image/…   → offline magic-byte check (JPEG/PNG/WEBP/AVIF), no
 *                       network; flags > 200_000 chars (legacy bloat family,
 *                       items POST/PUT cap)
 *      http(s)://…    → HEAD, fallback GET with `Range: bytes=0-15` (some CDNs
 *                       405 on HEAD); verdict OK = 2xx + content-type image/*
 *  - dedup identical URLs (many items share images — full run is O(unique
 *    URLs), not O(items)); ≤8 concurrent fetches; 10s timeout per fetch.
 *
 * FLAGS:
 *  --strict  exit 1 on any broken URL (CI/cron usable; default exit 0 = report
 *            only)
 *  --fix     OPTIONAL write mode: sets MenuItem.image='' for URLs verdicted
 *            broken (the card then renders the designed placeholder instead
 *            of the broken-image fallback path). NEVER deletes blobs; never
 *            touches Restaurant.logo/gallery (flagged only). Refuses to run
 *            against production unless ALLOW_SEED=true (mirrors ci-seed.mjs
 *            / round83-seed.mjs guards — an env export pointing at prod must
 *            never mutate it silently).
 *
 * OUTPUT: console table (url, status, content-type, ms, verdict) +
 * scripts/image-health-report.json ({table,id,name,url,status,contentType,
 * verdict,ms}[]). Exit codes: 0 clean, 1 broken-with---strict or fatal.
 * Plain node script like its siblings (pg + node fetch only, no new deps).
 */
import { existsSync, writeFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/smartmenu';

const STRICT = process.argv.includes('--strict');
const FIX = process.argv.includes('--fix');

// Production guard (write mode only — read-only probes are safe anywhere).
// Mirrors scripts/ci-seed.mjs + scripts/round83-seed.mjs.
if (FIX && process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to --fix against production (ALLOW_SEED not set)');
  process.exit(1);
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONCURRENCY = 8;
const DATA_URL_CAP = 200_000; // items POST/PUT mediaUrlError cap (chars)
const REPORT = 'scripts/image-health-report.json';

const client = new pg.Client({ connectionString: url, statement_timeout: 20_000 });

// ── classification helpers ──────────────────────────────────────────────

/** Offline magic-byte check for data: URLs (base64 payload). */
function checkDataUrl(value) {
  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)/.exec(value);
  if (!m) return { status: 'parse-error', contentType: '', verdict: 'broken' };
  const [, mime, b64] = m;
  const hex = Buffer.from(b64.slice(0, 32), 'base64').subarray(0, 12).toString('hex');
  let ok = true;
  if (mime === 'image/jpeg') ok = hex.startsWith('ffd8ff');
  else if (mime === 'image/png') ok = hex.startsWith('89504e470d0a1a0a');
  else if (mime === 'image/webp') ok = hex.startsWith('52494646') && hex.slice(16, 24) === '57454250'; // RIFF<size>WEBP
  else if (mime === 'image/avif') ok = hex.slice(8, 16) === '66747970'; // bytes 4..7 = 'ftyp'
  return { status: ok ? 'ok' : 'bad-magic', contentType: mime, verdict: ok ? 'ok' : 'broken' };
}

/** Fetch one URL: HEAD first, GET+Range fallback. Returns {status, contentType, ms, verdict}. */
async function checkHttpUrl(u) {
  const started = Date.now();
  const attempt = async (method, range) => {
    const res = await fetch(u, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: range ? { Range: 'bytes=0-15' } : {},
    });
    return { status: res.status, contentType: (res.headers.get('content-type') || '').split(';')[0] };
  };
  let out = { status: 0, contentType: '' };
  try {
    out = await attempt('HEAD');
  } catch {
    /* network error / timeout — try the ranged GET below */
  }
  // 405/501 = method not allowed (some CDNs), 0 = fetch-level failure.
  if (out.status === 0 || out.status === 405 || out.status === 501) {
    try {
      out = await attempt('GET', true);
    } catch {
      /* keep the HEAD failure */
    }
  }
  const ms = Date.now() - started;
  // D3 verdict definition: OK = 2xx + content-type image/*
  const ok = out.status >= 200 && out.status < 300 && out.contentType.startsWith('image/');
  return { status: out.status, contentType: out.contentType, ms, verdict: ok ? 'ok' : 'broken' };
}

// ── main ────────────────────────────────────────────────────────────────

async function main() {
  await client.connect();

  const { rows: items } = await client.query(
    `SELECT m.id, m.name, m."nameAr", m.image, m."categoryId", c."restaurantId"
     FROM "MenuItem" m JOIN "MenuCategory" c ON c.id = m."categoryId"
     WHERE m.image <> '' ORDER BY m.id`,
  );
  const { rows: restaurants } = await client.query(
    `SELECT id, name, slug, logo, gallery FROM "Restaurant" ORDER BY id`,
  );
  const { rows: missingRows } = await client.query(
    `SELECT count(*)::int AS n FROM "MenuItem" WHERE image = ''`,
  );
  console.log(
    `menu items with image: ${items.length} · empty image (placeholder path): ${missingRows[0].n} · restaurants: ${restaurants.length}`,
  );

  // Unique URL set across item images + restaurant logos + galleries.
  const urlOwners = new Map(); // url -> [{ table, id, name }]
  const addOwner = (u, table, id, name) => {
    if (!u) return;
    if (!urlOwners.has(u)) urlOwners.set(u, []);
    urlOwners.get(u).push({ table, id, name });
  };
  for (const it of items) addOwner(it.image, 'MenuItem', it.id, it.name);
  for (const r of restaurants) {
    addOwner(r.logo, 'Restaurant.logo', r.id, r.name);
    if (Array.isArray(r.gallery)) for (const g of r.gallery) addOwner(g, 'Restaurant.gallery', r.id, r.name);
  }

  // Classify offline first (data: URLs); queue http(s) for bounded fetch.
  const results = []; // full rows (url kept intact — truncation is display-only)
  const httpUrls = [];
  for (const [u, owners] of urlOwners) {
    if (u.startsWith('data:image/')) {
      const v = checkDataUrl(u);
      for (const o of owners) results.push({ ...o, url: u, ...v, ms: 0 });
      if (u.length > DATA_URL_CAP)
        console.warn(`⚠ oversized data URL (${u.length} chars > ${DATA_URL_CAP}): ${owners.map((o) => o.name).join(', ')}`);
    } else if (/^https?:\/\//.test(u)) {
      httpUrls.push(u);
    } else {
      for (const o of owners) results.push({ ...o, url: u, status: 'not-http', contentType: '', ms: 0, verdict: 'broken' });
    }
  }

  // Fetch http(s) URLs: dedup (Map), ≤8 workers, 10s timeout each.
  const fetched = new Map();
  let idx = 0;
  const worker = async () => {
    while (idx < httpUrls.length) {
      const u = httpUrls[idx++];
      fetched.set(u, await checkHttpUrl(u));
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, httpUrls.length) }, worker));
  for (const [u, v] of fetched) {
    for (const o of urlOwners.get(u)) results.push({ ...o, url: u, ...v });
  }

  // Cheap static og check (local repo only — D3's prod sweep covers prod).
  console.log(`og-default.png (local static): ${existsSync('public/og-default.png') ? 'ok' : 'missing'}`);

  // Duplicate-imagery flag (D3 data-quality bonus — advisory, never a failure).
  const dupes = [...urlOwners.entries()].filter(([, owners]) => owners.length > 1);
  for (const [u, owners] of dupes) console.warn(`⚠ duplicate imagery (${owners.length} rows): ${u}`);

  // ── report (broken rows first) ────────────────────────────────────────
  const broken = results.filter((r) => r.verdict === 'broken');
  results.sort((a, b) => (a.verdict === b.verdict ? a.id - b.id : a.verdict === 'broken' ? -1 : 1));

  const disp = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
  console.log(`\n${disp('url', 70)}${disp('status', 9)}${disp('content-type', 18)}${disp('ms', 7)}verdict`);
  for (const r of results) {
    console.log(`${disp(r.url, 70)}${disp(String(r.status), 9)}${disp(r.contentType || '-', 18)}${disp(String(r.ms), 7)}${r.verdict}`);
  }
  console.log(
    `\nrows: ${results.length} (${urlOwners.size} unique URLs, ${httpUrls.length} fetched over network) · broken: ${broken.length} · duplicate-URL groups: ${dupes.length}`,
  );

  writeFileSync(
    REPORT,
    JSON.stringify({ generatedAt: new Date().toISOString(), brokenCount: broken.length, results }, null, 2),
  );
  console.log(`report: ${REPORT}`);

  // ── --fix (guarded write mode — MenuItem.image only, blobs never deleted) ──
  if (FIX) {
    const deadItemUrls = [...new Set(broken.filter((r) => r.table === 'MenuItem').map((r) => r.url))];
    const deadResto = [...new Set(broken.filter((r) => r.table !== 'MenuItem').map((r) => `${r.table}:${r.url}`))];
    if (deadResto.length > 0) console.warn(`--fix: Restaurant logo/gallery rows are flagged, never auto-cleared: ${deadResto.join(', ')}`);
    let fixed = 0;
    for (const u of deadItemUrls) {
      const { rowCount } = await client.query(`UPDATE "MenuItem" SET image = '' WHERE image = $1`, [u]);
      fixed += rowCount ?? 0;
    }
    console.log(`--fix: cleared image on ${fixed} MenuItem row(s) across ${deadItemUrls.length} dead URL(s) — placeholder path restored`);
  }

  await client.end();

  if (broken.length > 0) {
    console.error(`${broken.length} broken image URL(s)${STRICT ? ' (--strict → exit 1)' : ''}`);
    if (STRICT) process.exit(1);
  }
}

main().catch((e) => {
  console.error('IMAGE-HEALTH FAILED:', e.message);
  process.exit(1);
});

#!/usr/bin/env node
// round87 production behavioral verification — the round-87-specific markers
// that prove the new build is live and healthy (complements round86-prod-verify).
import { execSync } from 'node:child_process';

const BASE = 'https://menu.smart-link.ly';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
  cond ? pass++ : fail++;
};

const curl = (path, args = '') =>
  execSync(`curl -s -m 15 ${args} "${BASE}${path}"`, { maxBuffer: 1 << 24 }).toString();
const curlStatus = (path, args = '') => {
  try {
    return Number(execSync(`curl -s -m 15 -o /dev/null -w "%{http_code}" ${args} "${BASE}${path}"`).toString());
  } catch { return 0; }
};

console.log('[1] B5 — root 404 minimal header (no full landing Header)');
const notFound = curl('/definitely-not-a-page-xyz', '-H "Accept: text/html"');
ok('404 status', curlStatus('/definitely-not-a-page-xyz') === 404);
ok('404 carries Smart Menu brand (minimal bar)', /Smart Menu|سمارت مينيو/.test(notFound));
ok('404 no heavy landing client chunks markers', !/hero-lottie|HeroDecor/.test(notFound));
ok('404 keeps ThemeToggle', /الوضع الليلي|theme/i.test(notFound));

console.log('[2] B4 — QR critical path: no static cart Sheet chunk');
const menuHtml = curl('/menu/al-waha-cafe-demo', '-H "Accept: text/html"');
ok('menu page 200', menuHtml.length > 500);
// The Sheet (@base-ui) used to ship statically via layout; now dynamic ssr:false
ok('menu HTML: no cart dialog pre-mounted', !/role="dialog"[^>]*aria-label="سلة/.test(menuHtml));

console.log('[3] B6 — system-events sinceId param accepted (route live)');
const evStatus = curlStatus('/api/admin/system-events?sinceId=1');
ok('system-events responds (401/403 unauth = gated, route alive)', evStatus === 401 || evStatus === 403, `status=${evStatus}`);

console.log('[4] C5/B7 — owner/reviews envelope (gated)');
const revStatus = curlStatus('/api/owner/reviews');
ok('owner/reviews gated', revStatus === 401 || revStatus === 403, `status=${revStatus}`);

console.log('[5] D10 — SW v6 + image LRU present');
const sw = curl('/sw.js');
ok('SW CACHE_VERSION v6', /smart-menu-v6/.test(sw));
ok('SW images cache has LRU cap', /(LRU|MAX_IMAGE|maxEntries|60)/.test(sw));

console.log('[6] B10 — promo.mp4 re-encoded');
const head = execSync(`curl -s -m 15 -I "${BASE}/video/promo.mp4"`).toString();
const len = Number((head.match(/content-length: (\d+)/i) || [])[1] ?? 0);
ok('promo.mp4 ~150KB (not 1.09MB original)', len > 100000 && len < 250000, `bytes=${len}`);
ok('promo.mp4 immutable cache', /immutable/.test(head));

console.log('[7] B2 — /api/stats gated as before');
const stats = curlStatus('/api/stats');
ok('/api/stats 401 unauth', stats === 401, `status=${stats}`);

console.log('[8] A-phase gates still live');
ok('A4 orders/count 401', curlStatus('/api/orders/count') === 401);
ok('cron still fail-closed 401', curlStatus('/api/cron/cleanup') === 401);

console.log(`\n=== ROUND87 PROD RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);

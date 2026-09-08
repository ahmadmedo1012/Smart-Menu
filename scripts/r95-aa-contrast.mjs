/**
 * r95-D — بوابة تباين AA الحسابية (المواصفة §7)
 * (1) حساب WCAG رياضي خالص للقيم الجوهرية من SmartBot.
 * (2) تحقق بالمتصفح الحقيقي: حلّ الرموز من :root وقِس التباين على عناصر نصية
 *     فعلية (accent-foreground على بطاقة · muted-foreground على بطاقة · أبيض على primary).
 * يعمل ضد الخادم المحلي standalone — شغّله داخل جلسة تحتفظ بالخادم.
 */
import { chromium } from 'playwright';

/* ---------- WCAG 2.x contrast math (node side) ---------- */
const srgb = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (hex) => srgb(hex).map(lin).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (fg, bg) => {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};
const fmt = (r) => r.toFixed(2) + ':1';

/* ---------- (1) القيم الجوهرية (المواصفة §7) ---------- */
const pairs = [
  ['accent-foreground #df5a00', '#df5a00', 'card #070503', '#070503', 5.42],
  ['muted-foreground #8c857d', '#8c857d', 'card #070503', '#070503', 5.59],
  ['primary-foreground #f8f8f8', '#f8f8f8', 'primary #bc4700', '#bc4700', 4.98],
  ['foreground #ebe7e2', '#ebe7e2', 'card #070503', '#070503', 12.7],
  ['foreground #ebe7e2', '#ebe7e2', 'background #010000', '#010000', 15.6],
  ['accent-foreground #df5a00', '#df5a00', 'background #010000', '#010000', 5.92],
  ['secondary-foreground #a9a49e', '#a9a49e', 'secondary #0c0806', '#0c0806', 6.7],
  ['muted-foreground #8c857d', '#8c857d', 'background #010000', '#010000', 5.86],
];
console.log('== (1) حساب WCAG — القيم الجوهرية (عتبة AA نص 4.5:1) ==');
let mathFails = 0;
for (const [fgName, fg, bgName, bg, ref] of pairs) {
  const r = contrast(fg, bg);
  const ok = r >= 4.5;
  if (!ok) mathFails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${fgName} on ${bgName} = ${fmt(r)} (مرجع المواصفة ~${ref})`);
}

/* ---------- (2) تحقق بالمتصفح ---------- */
// browser-side helpers: parse colors, alpha-blend, walk ancestors for the
// first opaque background.
const helpers = () => {
  // r95-D: wide-gamut colors (oklch/lab — primary-foreground) serialize as
  // `lab(...)` in computed styles and escape the rgba regex; canvas fillStyle
  // is sRGB-only, so round-tripping through it normalizes any color to #hex.
  const canvas = document.createElement('canvas').getContext('2d');
  const normalize = (c) => {
    if (!c) return null;
    if (/^rgba?\(/.test(c)) return c;
    canvas.fillStyle = '#000';
    canvas.fillStyle = c;
    const v = canvas.fillStyle;
    return typeof v === 'string' && v !== '#000000' ? v : c;
  };
  const parse = (c) => {
    const m = (normalize(c) || '').match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/);
    if (!m) return null;
    return [1, 2, 3, 4].map((i) => (m[i] === undefined ? 1 : parseFloat(m[i])));
  };
  const blend = (fg, bg) => fg.map((v, i) => (i < 3 ? Math.round(bg[i] + (v - bg[i]) * fg[3]) : 1));
  const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement.parentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg[3] > 0.85) return bg.slice(0, 3);
      node = node.parentElement;
    }
    return [1, 0, 0];
  };
  return { parse, blend, hex, effectiveBg };
};

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

const checkPages = [
  { name: 'home', url: 'http://localhost:3000', sels: ['.text-accent-foreground', '.text-muted-foreground', '.bg-primary'] },
  { name: 'pricing', url: 'http://localhost:3000/pricing', sels: ['.text-accent-foreground', '.text-muted-foreground', '.bg-primary'] },
  { name: 'menu', url: 'http://localhost:3000/menu/al-waha-cafe', sels: ['.text-accent-foreground', '.text-muted-foreground', '.bg-primary'] },
];

console.log('\n== (2) تحقق بالمتصفح — الرموز المحلولة + عناصر فعلية ==');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const rootTokens = {};
for (const t of ['--accent-foreground', '--muted-foreground', '--primary', '--primary-foreground', '--card', '--background', '--foreground']) {
  rootTokens[t] = await page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), t);
}
console.log('  :root tokens:', JSON.stringify(rootTokens));

const results = [];
for (const p of checkPages) {
  await page.goto(p.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const sel of p.sels) {
    const rows = await page
      .evaluate(
        ({ sel, helpersSrc }) => {
          const { parse, blend, hex, effectiveBg } = eval(`(${helpersSrc})`)();
          const out = [];
          for (const el of [...document.querySelectorAll(sel)].slice(0, 60)) {
            if (!el.textContent || !el.textContent.trim()) continue; // text-bearing only
            const st = getComputedStyle(el);
            const fg = parse(st.color);
            if (!fg) continue;
            const bg = effectiveBg(el);
            const fgb = fg[3] < 1 ? blend(fg, bg) : fg.slice(0, 3);
            out.push({ fg: hex(fgb), bg: hex(bg), fs: parseFloat(st.fontSize), fw: st.fontWeight });
          }
          return out.slice(0, 8);
        },
        { sel, helpersSrc: helpers.toString() },
      )
      .catch((e) => { console.log(`  [warn] ${p.name} ${sel}: ${String(e).slice(0, 80)}`); return []; });
    for (const r of rows) {
      const ratio = contrast(r.fg, r.bg);
      const large = r.fs >= 24 || (r.fs >= 18.66 && +r.fw >= 700);
      const threshold = large ? 3 : 4.5;
      results.push({ page: p.name, sel, ...r, ratio, threshold, pass: ratio >= threshold });
    }
  }
}

let browserFails = 0;
for (const r of results) {
  if (!r.pass) browserFails++;
  console.log(
    `  ${r.pass ? 'PASS' : 'FAIL'}  [${r.page}] ${r.sel}: ${r.fg} on ${r.bg} @${r.fs}px/${r.fw} = ${fmt(r.ratio)} (عتبة ${r.threshold})`,
  );
}

console.log(`\n== الحصيلة: رياضي ${pairs.length - mathFails}/${pairs.length} · متصفح ${results.length - browserFails}/${results.length} ==`);
await browser.close();
process.exit(mathFails + browserFails > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * test(r127-F8): mobile Madarek parity snapshot — the FIRST design-parity
 * gate for the RN/Expo app. Until now parity pins existed only on the web
 * (tests/design/parity.test.ts, ~370 pins across 64 cases) — the mobile twin
 * shipped zero, so a colors.ts / tailwind.config.js / typography.ts / motion
 * drift would only surface as a visual regression report from a human.
 *
 * Source-of-truth chain (same doctrine as the web harness):
 *   madarek/frontend/src/styles/tokens.css  (canonical)
 *     → smart-menu web bridge src/app/globals.css (§night + §light + §motion)
 *       → mobile/src/theme/colors.ts (inline-style SSOT)
 *       → mobile/tailwind.config.js  (NativeWind mirror — a JS config cannot
 *         require the TS module, so the two are pinned to each other here)
 *   motion: src/theme/motion.ts (r127-F8 central module) ↔ globals.css §motion
 *   typography: IBM Plex Sans Arabic 400/500/600/700 via
 *     @expo-google-fonts/ibm-plex-sans-arabic (r123 — the fake Cairo bold
 *     TTFs were purged; this file keeps them banned).
 *
 * Run: `pnpm test:parity` (plain node — mobile ships no unit-test runner;
 * dependency-free by design so CI can run it right after install, before
 * typecheck). Exit 1 with readable diffs on any drift.
 *
 * HOW IT READS THE SOURCES
 * ────────────────────────
 * - All theme files are read as TEXT and parsed with a tiny brace-matching
 *   object-literal parser (no ts-node / no babel / no require of TS): what
 *   ships in the repo is what gets pinned.
 * - Comments are stripped before ban-list sweeps (the historical
 *   "replaces the retired Cairo + Readex Pro pair" note in App.tsx:21-23 is
 *   documentation, not a code reference) — but the hex/icon-size bans sweep
 *   raw text: a `color="#fff"` even in a comment is a copy-paste hazard.
 *
 * WHAT IS PINNED (category → count)
 *   colors night 21 · colors light 9 · pastel families 27
 *   tailwind color mirror 18 + SSOT-equality gate · radius 7
 *   tailwind motion 6 · easings 3 · fontFamily 3
 *   theme/motion.ts 8 · motion↔tailwind consistency 6
 *   typography families 4 + list gate · weight resolver 7 (800/900→700)
 *   font wiring chain 12 (typography ↔ App.tsx loadAsync ↔ app.json expo-font)
 *   app chrome 2 + splash gate · font source 1 · ban-list + wiring gates 8+
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

// ── sources ──────────────────────────────────────────────────────────────────

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// Parsed as comment-stripped TEXT (what ships is what gets pinned — but the
// object-literal parser needs comments out of its way; ban sweeps below
// re-read the RAW text separately).
const colorsSrc = stripComments(read('src/theme/colors.ts'));
const tailwindSrc = stripComments(read('tailwind.config.js'));
const typographySrc = stripComments(read('src/theme/typography.ts'));
const motionSrc = stripComments(read('src/theme/motion.ts'));
const appSrc = stripComments(read('src/app/App.tsx'));
const fabSrc = read('src/components/shared/FloatingWhatsApp.tsx');
const appJson = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));

// ── tiny parsers (brace-matched; sufficient for the theme object literals) ──

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1'); // keeps https:// inside strings
}

/** Text between the first `{` (or `[` when array=true) after `marker` and
 *  its matched closing bracket. */
function objectBlockAfter(source, marker, array = false) {
  const openCh = array ? '[' : '{';
  const closeCh = array ? ']' : '}';
  const idx = source.indexOf(marker);
  if (idx === -1) throw new Error(`marker not found: ${marker}`);
  const open = source.indexOf(openCh, idx + marker.length);
  if (open === -1) throw new Error(`literal not found after: ${marker}`);
  let depth = 1;
  let j = open + 1;
  while (j < source.length && depth > 0) {
    if (source[j] === openCh) depth += 1;
    else if (source[j] === closeCh) depth -= 1;
    j += 1;
  }
  if (depth !== 0) throw new Error(`unbalanced brackets after: ${marker}`);
  return source.slice(open + 1, j - 1);
}

/** Parse a JS/TS object-literal block into a nested object of raw string
 *  values. Handles quoted/bare keys, nested objects, arrays (kept as raw
 *  text) and quoted/bare scalars. Numbers stay strings — pin() normalizes. */
function parseJsObject(block) {
  const out = {};
  let i = 0;
  const n = block.length;
  const skipWs = () => { while (i < n && /\s/.test(block[i])) i += 1; };
  while (true) {
    skipWs();
    if (i >= n || block[i] === '}') break;
    let key = '';
    if (block[i] === '"' || block[i] === "'") {
      const q = block[i];
      i += 1;
      while (i < n && block[i] !== q) { key += block[i]; i += 1; }
      i += 1;
    } else {
      while (i < n && /[^:\s,{}]/.test(block[i])) { key += block[i]; i += 1; }
    }
    skipWs();
    if (block[i] !== ':') { if (i < n) i += 1; continue; }
    i += 1; // colon
    skipWs();
    if (block[i] === '{') {
      let d = 1;
      let j = i + 1;
      while (j < n && d > 0) {
        if (block[j] === '{') d += 1;
        else if (block[j] === '}') d -= 1;
        j += 1;
      }
      out[key] = parseJsObject(block.slice(i + 1, j - 1));
      i = j;
    } else if (block[i] === '[') {
      let d = 1;
      let j = i + 1;
      while (j < n && d > 0) {
        if (block[j] === '[') d += 1;
        else if (block[j] === ']') d -= 1;
        j += 1;
      }
      out[key] = block.slice(i, j);
      i = j;
    } else if (block[i] === '"' || block[i] === "'") {
      const q = block[i];
      i += 1;
      let val = '';
      while (i < n && block[i] !== q) { val += block[i]; i += 1; }
      i += 1;
      out[key] = val;
    } else {
      let val = '';
      while (i < n && block[i] !== ',' && block[i] !== '}') { val += block[i]; i += 1; }
      out[key] = val.trim();
    }
    skipWs();
    if (block[i] === ',') i += 1;
  }
  return out;
}

const objectAfter = (source, marker) => parseJsObject(objectBlockAfter(source, marker));

// ── assertion harness ────────────────────────────────────────────────────────

let passed = 0;
const failures = [];

function pin(scope, category, name, expected) {
  const actual = typeof scope === 'object' && scope !== null ? scope[name] : undefined;
  if (actual === undefined) {
    failures.push(`${category} · ${name} is missing (expected ${JSON.stringify(expected)})`);
    return;
  }
  const norm = (v) => String(v).trim().replace(/^['"]|['"]$/g, '');
  if (norm(actual) !== norm(expected)) {
    failures.push(`${category} · ${name} drifted from the Madarek canonical: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  } else {
    passed += 1;
  }
}

function pinAll(scope, category, table) {
  for (const [name, expected] of Object.entries(table)) pin(scope, category, name, expected);
}

function check(ok, message) {
  if (ok) passed += 1;
  else failures.push(message);
}

// ── parsed scopes ────────────────────────────────────────────────────────────

const nightColors = objectAfter(colorsSrc, 'export const colors =');
const lightColors = objectAfter(colorsSrc, 'export const lightColors =');
const pastelFamilies = objectAfter(colorsSrc, 'export const pastelFamilies =');

const tailwind = objectAfter(tailwindSrc, 'module.exports =');
const extend = tailwind.theme.extend;
const twColors = extend.colors;
const twRadius = extend.borderRadius;
const twDurations = extend.transitionDuration;
const twEasings = extend.transitionTimingFunction;
const twFonts = extend.fontFamily;

const motion = objectAfter(motionSrc, 'export const motion =');

const plexFamily = typographySrc.match(/export const PLEX_FAMILY = "([^"]+)"/)?.[1];
const plexMedium = typographySrc.match(/const PLEX_MEDIUM = "([^"]+)"/)?.[1];
const plexSemibold = typographySrc.match(/export const PLEX_SEMIBOLD = "([^"]+)"/)?.[1];
const plexBold = typographySrc.match(/export const PLEX_BOLD = "([^"]+)"/)?.[1];
const typoScope = { family: plexFamily, medium: plexMedium, semibold: plexSemibold, bold: plexBold };
// WEIGHT_TO_FAMILY values are IDENTIFIERS (PLEX_*), not string literals —
// resolve them through the family constants the module itself exports.
const IDENT = { PLEX_FAMILY: plexFamily, PLEX_MEDIUM: plexMedium, PLEX_SEMIBOLD: plexSemibold, PLEX_BOLD: plexBold };
const weightToFamilies = Object.fromEntries(
  Object.entries(objectAfter(typographySrc, 'WEIGHT_TO_FAMILY'))
    .map(([k, v]) => [k, IDENT[v] ?? v]),
);
const plexFamiliesList = objectBlockAfter(typographySrc, 'export const PLEX_FAMILIES', true)
  .split(',')
  .map((s) => s.match(/([A-Za-z_][A-Za-z0-9_]*)/)?.[1])
  .filter(Boolean)
  .map((id) => IDENT[id] ?? id);

const loadAsync = objectAfter(appSrc, 'Font.loadAsync');

// ── canonical snapshot ───────────────────────────────────────────────────────
// Values cross-verified against madarek tokens.css via the repo's own web
// bridge (src/app/globals.css §night/§light/§motion) and the sibling
// smart-link harness tables — one canonical palette, four carriers.

// §1 night theme — the values every screen consumes (web: --neutral-* dark,
// --accent* dark, --success/--warning/--info/--destructive, --whatsapp).
const NIGHT = {
  night: '#070B16',          // --neutral-50 / --background / --c-night
  surface: '#0D1428',        // --neutral-0 / --card / --surface-overlay
  surface2: '#121A36',       // --neutral-100 / --muted / --surface-raised
  hairline: '#1B2444',       // --neutral-200 / --border
  sand: '#F2EFE6',           // --neutral-900 / --foreground
  muted: '#8E97B8',          // --neutral-500 / --muted-foreground
  gold: '#E9B44C',           // --accent-solid / --primary / --orange
  goldHover: '#F5D48A',      // --accent-hover / --c-saffron
  goldStrong: '#C9962F',     // --accent-strong / --c-ember / --ring
  void: '#05070F',           // --accent-fg / --primary-foreground / --c-espresso
  mint: '#7FD39A',           // --success / --c-basil / --c-mint-ink
  mintBg: '#0F241C',         // --c-mint-bg
  yellow: '#ECC97D',         // --warning / --c-yellow-ink / --c-saffron-ink
  sky: '#8FBBF2',            // --info / --c-sky-ink
  rose: '#F0938F',           // --destructive / --c-bloom / --c-rose-ink
  whatsapp: '#25D366',       // --whatsapp (sanctioned non-Madarek brand)
  shadow: '#02040C',         // --elev-* shadow rgb(2,4,12,*) base
  scrim: 'rgba(2,4,12,0.7)',
  surface2Scrim: 'rgba(18,26,54,0.92)',
  roseSoft: '#F0938F24',     // rose @ 14% (8-digit hex spelling)
  roseBorder: '#F0938F55',   // rose @ 33%
};

// §2 light theme — unconsumed follow-up data, still pinned (drift there is
// still drift; web: --neutral-* light + §light accent copper).
const LIGHT = {
  page: '#FBFAF9',           // --neutral-50 light / --background
  surface: '#FFFFFF',        // --card light
  surface2: '#F7F6F3',       // --neutral-100 light / --surface-sunken
  hairline: '#E9E7E2',       // --neutral-200 light / --border
  ink: '#191918',            // --neutral-900 light / --foreground
  inkMuted: '#6F6C66',       // --neutral-500 light
  accent: '#B57438',         // --accent-solid light (copper)
  accentStrong: '#5C3416',   // --accent-strong light / --c-copper-deep
  onAccent: '#FFFFFF',       // §1.5 light: primary = ink slab → white ink
};

// §3 the 9 Madarek pastel families (dark bg/ink/deep triplets, rubric §1.6).
const PASTEL = {
  peach: ['#2C1A16', '#F2A07F', '#FCD9C4'],
  mint: ['#0F241C', '#7FD39A', '#C9EAD3'],
  lavender: ['#221B3A', '#B7A0F4', '#DCD2F9'],
  sky: ['#14213A', '#8FBBF2', '#C9DCEE'],
  yellow: ['#2C2410', '#ECC97D', '#F8E5B5'],
  rose: ['#2C1620', '#F0938F', '#FACDD2'],
  sand: ['#241F14', '#D9C18C', '#EFE2C5'],
  grey: ['#161D33', '#A9B0C8', '#D5DAE8'],
  copper: ['#2C2312', '#E9B44C', '#F5D48A'],
};

// §4 NativeWind color mirror (tailwind.config.js) — semantic shadcn-style
// names the className path consumes; values must equal the colors.ts SSOT.
const TW_COLORS = {
  background: '#070B16',
  foreground: '#F2EFE6',
  card: '#0D1428',
  muted: '#121A36',
  'muted-foreground': '#8E97B8',
  border: '#1B2444',
  input: '#121A36',          // mobile composition: field FILL (not web's border tint)
  ring: '#E9B44C',
  'on-accent': '#05070F',
  whatsapp: '#25D366',
  success: '#7FD39A',
  warning: '#ECC97D',
  info: '#8FBBF2',
  destructive: '#F0938F',
};

// gold ramp anchors the className path may consume (brand.DEFAULT == gold).
const TW_BRAND = {
  DEFAULT: '#E9B44C',
  200: '#F5D48A',
  500: '#E9B44C',
  600: '#C9962F',
};

// §5 radius ladder (web --r-xs…--r-3xl).
const RADIUS = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, '2xl': 20, '3xl': 28 };

// §6 motion ladder (web --t-micro…--t-cinema) + easings (canonical béziers).
const MOTION_RUNGS = { MICRO: 80, FAST: 160, BASE: 240, SLOW: 380, SLOWER: 520, CINEMA: 720 };
const EASINGS = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',  // --ease
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',     // --ease-out
  soft: 'cubic-bezier(0.22, 1, 0.36, 1)',   // --ease-soft
};

// ── assertions ───────────────────────────────────────────────────────────────

pinAll(nightColors, 'colors-night', NIGHT);
pinAll(lightColors, 'colors-light', LIGHT);
for (const [family, [bg, ink, deep]] of Object.entries(PASTEL)) {
  const fam = pastelFamilies[family];
  pin(fam, 'pastel-dark', 'bg', bg);
  pin(fam, 'pastel-dark', 'ink', ink);
  pin(fam, 'pastel-dark', 'deep', deep);
}

// NativeWind mirror == colors.ts SSOT (the config cannot require the TS
// module — this gate is what keeps the two in sync).
pinAll(twColors, 'tailwind-colors', TW_COLORS);
pinAll(twColors.brand, 'tailwind-brand', TW_BRAND);
check(
  twColors.background === nightColors.night
    && twColors.foreground === nightColors.sand
    && twColors.card === nightColors.surface
    && twColors['on-accent'] === nightColors.void
    && twColors.whatsapp === nightColors.whatsapp,
  'tailwind color mirror must equal colors.ts SSOT for the shared night tokens (background/foreground/card/on-accent/whatsapp)',
);

pinAll(twRadius, 'radius', RADIUS);
pinAll(twDurations, 'tailwind-motion', {
  80: '80ms', 160: '160ms', 240: '240ms', 380: '380ms', 520: '520ms', 720: '720ms',
});
pinAll(twEasings, 'easings', EASINGS);

// fontFamily: every NativeWind family resolves to the brand face.
for (const key of ['sans', 'heading', 'mono']) {
  check(
    /^\[\s*"IBM Plex Sans Arabic"/.test(String(twFonts[key] ?? '')),
    `tailwind fontFamily.${key} must be the IBM Plex Sans Arabic face (got ${JSON.stringify(twFonts[key])})`,
  );
}

// theme/motion.ts — the central ladder (r127-F8) + stagger grammar.
pinAll(motion, 'motion', { ...MOTION_RUNGS, STAGGER_STEP: 60, STAGGER_CAP: 6 });
for (const ms of Object.values(MOTION_RUNGS)) {
  pin(twDurations, 'motion-consistency', String(ms), `${ms}ms`);
}

// typography — the 4 registered families …
pinAll(typoScope, 'typography', {
  family: 'IBM Plex Sans Arabic',
  medium: 'IBM Plex Sans Arabic-Medium',
  semibold: 'IBM Plex Sans Arabic-SemiBold',
  bold: 'IBM Plex Sans Arabic-Bold',
});
check(
  JSON.stringify(plexFamiliesList) === JSON.stringify([
    'IBM Plex Sans Arabic',
    'IBM Plex Sans Arabic-Medium',
    'IBM Plex Sans Arabic-SemiBold',
    'IBM Plex Sans Arabic-Bold',
  ]),
  `typography PLEX_FAMILIES must list exactly the 4 registered families (got ${JSON.stringify(plexFamiliesList)})`,
);

// … and the weight resolver: numeric weights map to real per-weight faces.
// 800/900 → Bold: Plex Sans Arabic has no true 800/900 and iOS cannot
// synthesize bold from an aliased family — the r126-M1 no-fake-bold rule.
pinAll(weightToFamilies, 'weight-resolver', {
  400: 'IBM Plex Sans Arabic',
  500: 'IBM Plex Sans Arabic-Medium',
  600: 'IBM Plex Sans Arabic-SemiBold',
  700: 'IBM Plex Sans Arabic-Bold',
  800: 'IBM Plex Sans Arabic-Bold',
  900: 'IBM Plex Sans Arabic-Bold',
  bold: 'IBM Plex Sans Arabic-Bold',
});

// Font wiring chain: typography.ts ↔ App.tsx loadAsync ↔ app.json expo-font.
const GOOGLE_FONTS_IDS = {
  'IBM Plex Sans Arabic': 'IBMPlexSansArabic_400Regular',
  'IBM Plex Sans Arabic-Medium': 'IBMPlexSansArabic_500Medium',
  'IBM Plex Sans Arabic-SemiBold': 'IBMPlexSansArabic_600SemiBold',
  'IBM Plex Sans Arabic-Bold': 'IBMPlexSansArabic_700Bold',
};
for (const [family, identifier] of Object.entries(GOOGLE_FONTS_IDS)) {
  pin(loadAsync, 'app-loadAsync', family, identifier);
}
const expoFontPlugin = (appJson.expo?.plugins ?? []).find(
  (p) => Array.isArray(p) && p[0] === 'expo-font',
);
check(Array.isArray(expoFontPlugin), 'app.json must embed fonts via the expo-font plugin (native pre-load)');
for (const ttf of [
  '400Regular/IBMPlexSansArabic_400Regular.ttf',
  '500Medium/IBMPlexSansArabic_500Medium.ttf',
  '600SemiBold/IBMPlexSansArabic_600SemiBold.ttf',
  '700Bold/IBMPlexSansArabic_700Bold.ttf',
].map((f) => `./node_modules/@expo-google-fonts/ibm-plex-sans-arabic/${f}`)) {
  check(
    (expoFontPlugin?.[1]?.fonts ?? []).includes(ttf),
    `app.json expo-font must natively embed ${ttf.split('/').pop()}`,
  );
}

// Chrome/appearance: night-only by design — OS surfaces ride the night ground.
pin(appJson.expo, 'app-chrome', 'userInterfaceStyle', 'dark');
pin(appJson.expo.android?.adaptiveIcon ?? {}, 'app-chrome', 'backgroundColor', '#070B16');
{
  const splash = JSON.stringify(
    (appJson.expo?.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') ?? [],
  );
  check(splash.includes('"backgroundColor":"#070B16"'), 'expo-splash-screen backgroundColor must be night #070B16');
}

// The font SOURCE stays the audited authentic package (r123: @expo-google-fonts
// TTFs verified byte-distinct real weights; exact pin, no caret drift).
pin({ version: pkg.dependencies?.['@expo-google-fonts/ibm-plex-sans-arabic'] }, 'font-source', 'version', '0.4.2');

// ── ban-list + consumption gates (raw sweep of src/ and assets/) ────────────

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(new URL(`../../${dir}`, import.meta.url))) {
    const rel = `${dir}/${entry}`;
    const st = statSync(new URL(`../../${rel}`, import.meta.url));
    if (st.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const allFiles = [...walk('src'), ...walk('assets')];
const textFiles = allFiles.filter((f) => /\.(ts|tsx|js|jsx|json)$/.test(f));
const rawAll = textFiles.map((f) => ({ f, s: read(f) }));
const codeOnly = rawAll.map(({ f, s }) => ({ f, s: stripComments(s) }));

// 1. No hardcoded hex on any color-bearing prop — every icon/chrome color
//    rides colors.* tokens (FloatingWhatsApp's `color="#fff"` was the last).
//    Identifier-guarded (lookbehind) so `backgroundColor`/`shadowColor` props
//    stay out of scope: the QR quiet-zone plate (OwnerScreens) is a scanning
//    requirement, not decorative color.
for (const { f, s } of rawAll) {
  for (const m of s.matchAll(/(?<![A-Za-z])(?:color|stroke|fill)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/g)) {
    check(false, `${f}: hardcoded prop hex ${m[0]} — use the colors.ts token instead`);
  }
}
check(
  !rawAll.some(({ s }) => /(?<![A-Za-z])color\s*=\s*["']#(?:fff|ffffff)["']/i.test(s)),
  'no white hardcoded icon hex (color="#fff") may appear in src/ — on-accent ink rides colors.void',
);

// 2. Cairo / Readex Pro stay retired (code references only — the App.tsx
//    historical note in comments is exempt by design).
for (const { f, s } of codeOnly) {
  for (const m of s.matchAll(/Cairo|ReadexPro|Readex\s+Pro/g)) {
    check(false, `${f}: retired font reference "${m[0]}" in code — the brand face is IBM Plex Sans Arabic`);
  }
}

// 3. No font binaries in the tree — fonts ship via @expo-google-fonts only
//    (the r123 fake-Cairo guard: byte-identical "bold" TTFs must never return).
check(
  !allFiles.some((f) => /\.(ttf|otf|woff2?)$/i.test(f)),
  'no .ttf/.otf/.woff binaries under src/ or assets/ — fonts come from @expo-google-fonts (r123 purge stays purged)',
);

// 4. The 4px icon grid: the off-grid size={30} fleet (r127-F8) stays dead.
check(
  !rawAll.some(({ s }) => /size=\{30\}/.test(s)),
  'no size={30} icons — the icon fleet rides the 4px grid (28/32 neighbors)',
);

// 5. On-accent ink law on the WhatsApp FAB (web twin: text-orange-foreground).
check(/<MessageCircle[^>]*color=\{colors\.void\}/.test(fabSrc), 'FloatingWhatsApp glyph must ride colors.void on the green (on-accent ink law)');
check(/FadeIn\.duration\(motion\.BASE\)/.test(fabSrc), 'FloatingWhatsApp entrance must ride motion.BASE (the central ladder rung)');

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Mobile Madarek parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Mobile Madarek parity snapshot: ${passed} assertions passed (colors + radius + motion + typography + bans == canonical Madarek values)`);

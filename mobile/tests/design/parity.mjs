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
 * r128 section (r129-F5): the Orbit-Ink landing layer (web src/app/landing.css
 * §1 ↔ mobile/src/theme/landing.ts), the pastel LIGHT families, the JS
 * theme modules (radius/spacing/easings), the IBM Plex Mono wiring
 * (app.json + tailwind + App.tsx loadAsync) and the landing scope-rule
 * negatives (Orbit-Ink never leaks into product screens).
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
 *   colors night 21 · night additions 1 (aggregate) · colors light 9
 *   pastel dark 27 · pastel light 27
 *   tailwind color mirror 18 + SSOT-equality gate · radius 7
 *   tailwind motion 6 · easings 3 · fontFamily sans/heading 2 + mono 1
 *   theme/motion.ts 8 · motion↔tailwind consistency 6
 *   typography families 4 + list gate · weight resolver 7 (800/900→700)
 *   font wiring chain 14 (typography+mono ↔ App.tsx loadAsync ↔ app.json)
 *   app chrome 2 + splash gate · font sources 2 · ban-list + wiring gates 8+
 *   landing tokens 15 · theme modules 3 (radius/spacing/easings aggregates)
 *   landing grammar 6 · scope-rule negatives 3
 *   r131-F10 11 · raw-Pressable/pressed-register bans · 24px price metric ×2
 *   · 56px grey state tile · field-focus grammar ×3 · copy rulings ×2
 *   r132-F2b 22 · whatsapp trunk-0 · skeleton canon · toast recipe · 44px
 *   input · FAB inset · wizard CTA padding ×3 · payment gate · plans-empty
 *   · EmptyState family ×2 · 0.93 tab press · elevation ladder · A10 twins
 *   (formatPrice smart-trim · receipt decimals/labels · network-error map)
 *   r133-F3 22 · auth boot-vs-action gate · modifier smart-trim · tab-bar
 *   insets · money-list memo · logical sticky sides · dead-sm ban ·
 *   OwnerQr React Query · shape skeletons ×6 · price ladder + chip tnum ·
 *   microcopy (عميل · تليجرام · «…» · 09XXXXXXXX · رمز QR)
 *   r134-W2 4 · whatsapp Eastern-digit fold · normalizeArabic fold ·
 *   formatPrice ar-LY groupDots · LoginScreen shared support builder
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
// r128 section sources (r129-F5) — read RAW where grammar pins sweep text.
const landingSrc = stripComments(read('src/theme/landing.ts'));
const radiusSrc = stripComments(read('src/theme/radius.ts'));
const spacingSrc = stripComments(read('src/theme/spacing.ts'));
const easingsSrc = stripComments(read('src/theme/easings.ts'));
const landingScreenSrc = read('src/screens/public/LandingScreen.tsx');
const trustBandSrc = read('src/components/landing/TrustBand.tsx');
const landingPillSrc = read('src/components/landing/LandingPill.tsx');
// r131 section sources (F10) — read RAW where grammar pins sweep text.
const uiIndexSrc = read('src/components/ui/index.tsx');
const inputSrc = read('src/components/ui/Input.tsx');
const menuScreenSrc = read('src/screens/public/MenuScreen.tsx');
const pricingScreenSrc = read('src/screens/public/PricingScreen.tsx');
const subscribeScreensSrc = read('src/screens/subscribe/SubscribeScreens.tsx');
// r132-F2b section sources — same RAW doctrine (what ships is what gets
// pinned). navTheme is .tsx since r132 (it renders the tab button now).
const providersSrc = read('src/app/providers.tsx');
const ownerScreensSrc = read('src/screens/owner/OwnerScreens.tsx');
const navThemeSrc = read('src/navigation/navTheme.tsx');
const whatsappSrc = read('src/lib/whatsapp.ts');
const receiptSrc = read('src/lib/receipt.ts');
const formatSrc = read('src/lib/format.ts');
const getErrorMessageSrc = read('src/lib/get-error-message.ts');
const skeletonSrc = read('src/components/ui/Skeleton.tsx');
const elevationSrc = read('src/theme/elevation.ts');
// r133-F3 section sources — same RAW doctrine (what ships is what gets
// pinned); comment-stripped where a ban sweep would trip on documentation.
const authStoreSrc = read('src/store/auth.ts');
const menuTypesSrc = read('src/lib/menu-types.ts');
const buttonSrc = read('src/components/ui/Button.tsx');
const publicStackSrc = read('src/navigation/PublicStack.tsx');
const rootNavigatorSrc = read('src/navigation/RootNavigator.tsx');
const adminStackSrc = read('src/navigation/AdminStack.tsx');
const ownerStackSrc = read('src/navigation/OwnerStack.tsx');
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
const pastelLightFamilies = objectAfter(colorsSrc, 'export const pastelFamiliesLight =');

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

// fontFamily: the Arabic families resolve to the brand face…
for (const key of ['sans', 'heading']) {
  check(
    /^\[\s*"IBM Plex Sans Arabic"/.test(String(twFonts[key] ?? '')),
    `tailwind fontFamily.${key} must be the IBM Plex Sans Arabic face (got ${JSON.stringify(twFonts[key])})`,
  );
}
// …and mono is the REAL mono face now (r129-F5): IBM Plex Mono with the
// brand sans as the Arabic-run fallback — NOT the Sans face it aliased to
// before any mono shipped (the negative side of the same rule).
check(
  String(twFonts.mono ?? '').replace(/\s+/g, '') === '["IBMPlexMono","IBMPlexSansArabic","System"]',
  `tailwind fontFamily.mono must be IBM Plex Mono + Sans Arabic fallback (got ${JSON.stringify(twFonts.mono)})`,
);

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
// …and the mono voice rides the same audited package family (r129-F5; the
// registry tops out at 0.4.1 for this face — exact pin, same doctrine).
pin({ version: pkg.dependencies?.['@expo-google-fonts/ibm-plex-mono'] }, 'font-source', 'version', '0.4.1');

// ── r128 section (r129-F5): the Orbit-Ink landing layer ──────────────────────
// Web source of truth: src/app/landing.css §1 (itself the Madarek landing
// port) + src/components/landing/* — mobile carrier src/theme/landing.ts,
// consumed by the Landing route ONLY (the .landing scoping rule, R4).

// §r128-1 · the 14 Orbit-Ink tokens + the mobile h1 line-height (GAP-5).
// grain-op 0.075 = the r129 fleet ruling (canonical landing.css:58 P3-22
// local lift; the web twin still carries the pre-ruling 0.05 — documented
// web-side follow-up, mobile ships the corrected canonical).
const LANDING = {
  ink: '#252A3E',
  ink2: '#1C2032',
  cream: '#F5F3E7',
  creamDim: '#C9C6B4',
  lime: '#DFEDB2',
  limeDeep: '#B9D778',
  violet: '#7A6BF2',
  violetDeep: '#4E2FB8',
  line: 'rgba(245,243,231,0.14)',
  lineSoft: 'rgba(245,243,231,0.07)',
  card: 'rgba(245,243,231,0.03)',
  grainOpacity: '0.075',
  marqueeDurationMs: '42000',
  pressScale: '0.97',
  h1LineHeight: '1.18',
};
const landingTokens = objectAfter(landingSrc, 'export const landing =');
pinAll(landingTokens, 'landing-tokens', LANDING);

// §r128-2 · the 9 pastel families — LIGHT bg/ink/deep triplets (tokens.css
// :459-467 via the web bridge globals.css:601-609, byte-equal).
const PASTEL_LIGHT = {
  peach: ['#FFE9DC', '#E07856', '#6B2D1A'],
  mint: ['#DCF1E2', '#4FA66D', '#1F4F30'],
  lavender: ['#ECE6FA', '#8A6FE0', '#3F2D7A'],
  sky: ['#DDEBF7', '#5C8FCE', '#1F3D63'],
  yellow: ['#FCF1CD', '#D6A330', '#6B4C0B'],
  rose: ['#FCE0E2', '#DD6E78', '#6B2128'],
  sand: ['#F1ECDF', '#B59868', '#5A4623'],
  grey: ['#EFECE7', '#6B665E', '#2D2A24'],
  copper: ['#F4E4D2', '#B57438', '#5C3416'],
};
for (const [family, [bg, ink, deep]] of Object.entries(PASTEL_LIGHT)) {
  const fam = pastelLightFamilies[family];
  pin(fam, 'pastel-light', 'bg', bg);
  pin(fam, 'pastel-light', 'ink', ink);
  pin(fam, 'pastel-light', 'deep', deep);
}

// §r128-3 · colors.ts night additions — the deep neutral ramp + status
// soft-backgrounds (one aggregate: globals.css:308-314/334-350 values).
{
  const NIGHT_ADDITIONS = {
    surface3: '#182142',
    hairlineStrong: '#263052',
    textSecondary: '#C3C8DC',
    textStrong2: '#DDE1EE',
    goldSoft: '#2C2312',
    yellowBg: '#2C2410',
    skyBg: '#14213A',
    roseBg: '#2C1620',
  };
  check(
    Object.entries(NIGHT_ADDITIONS).every(([k, v]) => nightColors[k] === v),
    `colors.ts night additions must match the canonical deep ramp/status backgrounds (got ${JSON.stringify(Object.fromEntries(Object.keys(NIGHT_ADDITIONS).map((k) => [k, nightColors[k]])))})`,
  );
}

// §r128-4 · the JS theme modules (inline-style SSOT twins of the tailwind
// mirror) — full-ladder aggregate equality, the SSOT-gate idiom.
{
  const radiusModule = objectAfter(radiusSrc, 'export const radius =');
  const EXPECTED_RADIUS = { xs: '6', sm: '8', md: '10', lg: '12', xl: '16', '2xl': '20', '3xl': '28', pill: '9999' };
  check(
    JSON.stringify(radiusModule) === JSON.stringify(EXPECTED_RADIUS),
    `theme/radius.ts must mirror the canonical --r-* ladder + pill verbatim (got ${JSON.stringify(radiusModule)})`,
  );

  const spacingModule = objectAfter(spacingSrc, 'export const spacing =');
  const EXPECTED_SPACING = {
    sp1: '4', sp2: '8', sp3: '12', sp4: '16', sp5: '20', sp6: '24', sp7: '32', sp8: '40',
    sp9: '48', sp10: '56', sp11: '72', sp12: '96', sp13: '128', sp14: '160', sp15: '192', sp16: '240',
  };
  check(
    JSON.stringify(spacingModule) === JSON.stringify(EXPECTED_SPACING),
    `theme/spacing.ts must mirror the canonical --sp-1…16 ladder verbatim (got ${JSON.stringify(spacingModule)})`,
  );

  const easingsModule = objectAfter(easingsSrc, 'export const easings =');
  const EXPECTED_EASINGS = {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
    soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
    springSoft: 'cubic-bezier(0.34, 1.18, 0.64, 1)',
    spring: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springSnappy: 'cubic-bezier(0.5, 1.6, 0.4, 1)',
  };
  check(
    JSON.stringify(easingsModule) === JSON.stringify(EXPECTED_EASINGS),
    `theme/easings.ts must mirror the canonical --ease-* + spring tiers verbatim (got ${JSON.stringify(easingsModule)})`,
  );
}

// §r128-5 · mono wiring — the runtime chain a static config can't prove:
// App.tsx loadAsync registers both faces, app.json embeds both TTFs (the
// per-TTF loop above covers the Sans faces; the tailwind alias is pinned
// in the fontFamily block).
check(
  loadAsync['IBM Plex Mono'] === 'IBMPlexMono_400Regular'
    && loadAsync['IBM Plex Mono-Medium'] === 'IBMPlexMono_500Medium',
  `App.tsx loadAsync must register both IBM Plex Mono faces (got ${JSON.stringify({ mono: loadAsync['IBM Plex Mono'], monoMedium: loadAsync['IBM Plex Mono-Medium'] })})`,
);
check(
  ['400Regular/IBMPlexMono_400Regular.ttf', '500Medium/IBMPlexMono_500Medium.ttf']
    .every((f) => (expoFontPlugin?.[1]?.fonts ?? []).includes(`./node_modules/@expo-google-fonts/ibm-plex-mono/${f}`)),
  'app.json expo-font must natively embed both IBM Plex Mono TTFs',
);

// §r128-6 · LandingScreen grammar — the visible P0, pinned as text scans
// (the web suite pins served HTML; the mobile twin pins the shipped JSX).
check(/backgroundColor: landing\.ink/.test(landingScreenSrc), 'LandingScreen ground must be landing.ink (the Orbit-Ink world, not product night)');
check(landingScreenSrc.includes('00 — البداية'), 'LandingScreen must open with the «00 — البداية» mono chapter eyebrow');
check(landingScreenSrc.includes('<Text style={{ color: landing.lime }}>على واتساب</Text>'), 'LandingScreen h1 must carry exactly ONE lime word (على واتساب — the web hero pattern)');
check(
  ['01', '02', '03', '04', '05'].every((n) => landingScreenSrc.includes(`n: "${n}"`)),
  'LandingScreen must ship the web 5-station journey (01…05)',
);
check(trustBandSrc.includes('TRUST_FALLBACK_VALUE = "—"'), 'TrustBand must keep the never-fake honest fallback («—»)');
// The pill pair deliverable — 46/48px heights + the 0.97 press register
// (product Button keeps 0.98; the landing family rides landing.pressScale).
check(
  landingPillSrc.includes('LANDING_PILL_HEIGHT = 46')
    && landingPillSrc.includes('LANDING_PILL_HEIGHT_XL = 48')
    && landingPillSrc.includes('scaleTo={landing.pressScale}'),
  'LandingPill must ship the 46/48px gold+ghost pair on the 0.97 landing press register',
);

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

// 6. r128 scope-rule negatives (r129-F5) — the .landing R4 discipline:
//    Orbit-Ink lives ONLY in the landing family; the product world keeps
//    its own tokens in both directions.
// 6a. theme/landing must not be imported outside the landing family.
const isLandingFamily = (f) =>
  f === 'src/screens/public/LandingScreen.tsx' || f.startsWith('src/components/landing/');
check(
  !codeOnly.some(({ f, s }) => f !== 'src/theme/landing.ts' && !isLandingFamily(f) && s.includes('@/theme/landing')),
  'theme/landing must not leak outside the landing family (Orbit-Ink scope rule — product screens keep colors.ts night/sand/gold)',
);
// 6b. The Landing route itself must not consume product tokens (the reverse
//     leak): the ink world renders landing.* only.
check(
  !/@\/theme\/colors|colors\.(night|surface|surface2|surface3|hairline|sand|muted|gold|void)\b/.test(stripComments(landingScreenSrc)),
  'LandingScreen must ride the Orbit-Ink tokens — no product night/sand/gold leaks on the landing route',
);
// 6c. No raw Orbit-Ink hex outside theme/landing.ts — the token block is
//     the ONLY carrier of those values (comments stripped; the sweep is
//     case-insensitive so #252a3e cannot sneak past either).
{
  const ORBIT_INK_HEX = ['#252A3E', '#1C2032', '#F5F3E7', '#C9C6B4', '#DFEDB2', '#B9D778', '#7A6BF2', '#4E2FB8'];
  check(
    !codeOnly.some(({ f, s }) => f !== 'src/theme/landing.ts'
      && ORBIT_INK_HEX.some((h) => s.toLowerCase().includes(h.toLowerCase()))),
    'no raw Orbit-Ink hex outside theme/landing.ts — ride the landing tokens (the mono face lands via fontFamily, colors via landing.*)',
  );
}

// ── §r131-F10 · round-131 mobile pins (press migration · price unification ·
// state tiles · field-focus grammar · copy rulings) ─────────────────────────
// The r131 fixes pinned as text scans, same doctrine as the sections above:
// what ships in the repo is what gets pinned, so the next drift surfaces in
// CI the same way a token drift does. Sources read RAW at the top of the
// file (uiIndexSrc/inputSrc/menuScreenSrc/pricingScreenSrc/subscribeScreensSrc)
// and the ban sweeps ride codeOnly (comments stripped) like §ban-list.

// 1. Press migration completed: ZERO raw <Pressable> JSX anywhere in src/.
//    r130 W2-4 shipped PressableScale but converted only Button + cards; the
//    19 customer touchables (A2 P1-4), the shared primitives (eye toggle,
//    ErrorState retry, ErrorBoundary) and the owner/admin chrome all ride
//    the wrapper now — 0.97 controls / 0.99 cards, 80ms in / 160ms out.
check(
  !codeOnly.some(({ s }) => /<Pressable[\s/>]/.test(s)),
  'no raw <Pressable> JSX in src/ — every touchable rides PressableScale (0.97 controls / 0.99 cards; A2 P1-4 migration complete)',
);
// 1b. …and the hand-rolled pressed-opacity registers may never return (the
//     exact 0.7/0.8/0.9 registers the W2-4 header banned; killed in
//     SubscribeScreens, ErrorBoundary and OwnerScreens this round).
check(
  !codeOnly.some(({ s }) => /opacity:\s*pressed\s*\?/.test(s)),
  'no hand-rolled `opacity: pressed ? …` registers — press feedback rides the PressableScale scale+opacity ladder (one press register)',
);

// 2. Price unification (r131 fleet ruling): the plan-price metric is 24px
//    gold tnum on BOTH mobile pricing surfaces (was 28px PricingScreen /
//    20px subscribe — the same datum rendered two ways; A2 P1-5 mobile leg).
check(
  pricingScreenSrc.includes('fontSize: 24, fontWeight: "700", color: colors.gold')
    && !pricingScreenSrc.includes('fontSize: 28'),
  'PricingScreen plan price must ride the unified 24px gold tnum metric (fleet price ruling — 28px retired)',
);
check(
  subscribeScreensSrc.includes('fontSize: 24, fontWeight: "700", color: colors.gold')
    && !/fontSize: 20, fontWeight: "700", color: colors\.gold/.test(subscribeScreensSrc),
  'SubscribeScreens plan price must ride the unified 24px gold tnum metric (was 20px — same ruling as PricingScreen)',
);

// 3. State tiles (r131 ruling "empty = 56px grey / 18/600"): the EmptyState
//    well is the 56px r-xl grey-family tile — the web EmptyState fix and the
//    SO states.tsx twin (A2 P2-21 / A11 SM-1 mobile leg).
check(
  uiIndexSrc.includes('pastelFamilies.grey.bg')
    && uiIndexSrc.includes('width: 56, height: 56, borderRadius: radius.xl'),
  'EmptyState well must be the canonical 56px r-xl grey-family tile (fleet ruling — matches web EmptyState / SO states.tsx)',
);
// 3b. …and the shared state family carries no oversized circle wells — 56px
//     is the single tile rung (the 72/80px circles live on in screens only
//     where this sweep retired them; ComingSoon/ErrorState ride 56 too).
check(
  !/width: (64|72|80), height: (64|72|80), borderRadius: 9999/.test(uiIndexSrc),
  'no oversized state wells in the shared state family — 56px r-xl is the single tile rung',
);

// 4. Field-focus grammar (fix 7): ONE halo helper drives the <Input>
//    primitive AND the raw sheet fields — focused = 2px accent (gold)
//    border, resting = 1px hairline (rose when error). The primitive and
//    the hand-rolled fields can no longer drift apart.
check(
  inputSrc.includes('export function fieldFocusBorderStyle')
    && inputSrc.includes('borderWidth: 2, borderColor: colors.gold'),
  'Input.tsx must export fieldFocusBorderStyle — the app-wide field-focus halo (2px accent border on focus, A2 P1-3 mobile twin)',
);
check(
  menuScreenSrc.includes('fieldFocusBorderStyle(searchFocused)')
    && menuScreenSrc.includes('fieldFocusBorderStyle(focusedField === "name")'),
  'MenuScreen raw fields (search + cart sheet) must ride fieldFocusBorderStyle like the Input primitive',
);
check(
  subscribeScreensSrc.includes('fieldFocusBorderStyle(focused, error)'),
  'SubscribeScreens LabelAndInput must ride fieldFocusBorderStyle (the wizard fields had no focus treatment; r132-F2b adds the error half for the payment gate)',
);

// 5. Copy rulings: error verb تعذّر everywhere (the فشل/تعذر fleet split is
//    retired — codeOnly strips comments, so historical notes stay legal) and
//    جارٍ keeps its tanween (no bare جاري in code strings).
check(
  !codeOnly.some(({ s }) => s.includes('فشل')),
  'error verb is تعذّر everywhere (r131 fleet ruling) — no فشل left in code strings',
);
check(
  !codeOnly.some(({ s }) => /جاري(?!ٍ)/.test(s)),
  'جارٍ keeps its tanween — no bare جاري in code strings (r131 typo sweep must stay clean)',
);

// ── §r132-F2b · round-132 mobile polish pins (whatsapp twin · skeleton ·
// toast recipe · 44px input · FAB inset · wizard CTA padding · payment
// gate · plans-empty · EmptyState family · 0.93 tab press · elevation
// ladder · A10 stale-twin trio) ──────────────────────────────────────────
// Same doctrine as §r131-F10: text scans over the RAW sources read at the
// top — what ships in the repo is what gets pinned, so the next drift
// surfaces in CI the same way a token drift does.

// 1. WhatsApp trunk-0 (A10 finding 3 — the MUST): the mobile lib carries
//    the web r109-F2 fix — a leading local trunk 0 (0912345678) becomes
//    218912345678, because wa.me rejects wa.me/0… verbatim (orders to
//    local-format restaurants were never delivered). And the FAB rides the
//    ONE lib implementation — the r103-F9 inline third copy predates the
//    fix and is gone.
check(
  whatsappSrc.includes('digits = `218${digits.slice(1)}`'),
  'whatsapp lib must carry the r109-F2 trunk-0 fix (09… → 218…) — the web money-path fix the mobile twin lacked (dead wa.me/0… links for local Libyan numbers)',
);
check(
  fabSrc.includes('normalizeWaNumber(number)') && !fabSrc.includes('digits.startsWith("00")'),
  'FloatingWhatsApp must ride the ONE lib normalizer — no third inline copy (A10 #3: the inline copy shipped the pre-fix body)',
);

// 2. Skeleton canon (A4 S1, r131 fleet ruling "skeleton 1200 linear + RM
//    kill"): the money path's first paint is a SHAPE skeleton matching the
//    loaded layout, not a centered spinner.
check(
  skeletonSrc.includes('duration: 1200') && skeletonSrc.includes('Easing.linear'),
  'the Skeleton primitive rides the fleet canon: 1200ms LINEAR loop (ease-in-out pulsing the sweep velocity is retired)',
);
check(
  skeletonSrc.includes('useReducedMotion()') && skeletonSrc.includes('progress.value = reducedMotion'),
  'Skeleton must kill the sweep under reduced motion (the web twin zeroes --motion-duration-skeleton; the driver resolves to 0 under RM)',
);
check(
  menuScreenSrc.includes('<Skeleton width={64} height={64} borderRadius={8} />') && !menuScreenSrc.includes('<Spinner'),
  'MenuScreen loading = SHAPE skeletons matching the item-card layout (64px thumb + text lines + price row on surface r-12 hairline cards) — the centered spinner is retired',
);

// 3. Toast recipe (A4 S3, the web r131-F4 fleet toast canon port):
//    bottom-end placement, 28px pastel icon well, 1px status hairline on
//    the inline-start edge, manual-dismiss errors, SR announcements.
check(
  providersSrc.includes('position="bottom"') && providersSrc.includes('alignSelf: "flex-end"'),
  'toasts are bottom-END placed (the fleet ruling; was react-native-toast-message\u2019s top default + centered)',
);
check(
  providersSrc.includes('autoHide: kind !== "error"'),
  'error toasts are MANUAL-DISMISS (autoHide: false) — the failure reason never auto-vanishes after 4s (r131 doctrine)',
);
check(
  providersSrc.includes('width: 28, height: 28, borderRadius: radius.md')
    && providersSrc.includes('borderWidth: 1, borderColor: colors.hairline')
    && providersSrc.includes('borderStartWidth: 1'),
  'toast card = the web premiumToast recipe: 28px r-md pastel icon well + 1px hairline card with the status color on the inline-START edge (was a 4px accent slab, no icon)',
);
check(
  providersSrc.includes('announceForAccessibility'),
  'toasts announce via AccessibilityInfo.announceForAccessibility — TalkBack/VoiceOver were served silence before',
);

// 4. 44px input (A4 S2, the r131 fleet input ruling — the web 48→44 root
//    fix reaches the mobile leg): ONE height for all fields.
check(
  inputSrc.includes('min-h-11') && !stripComments(inputSrc).includes('min-h-12'),
  'the <Input>/<PasswordInput> primitives ride the fleet 44px input height (min-h-11; the 48px min-h-12 split-brain is retired)',
);

// 5. FAB safe-area inset (A4 S4, the r131 deferred straggler): every
//    floating element in the app is inset-aware — now including the FAB.
check(
  fabSrc.includes('useSafeAreaInsets()') && fabSrc.includes('62 + insets.bottom'),
  'FloatingWhatsApp bottom offset must be inset-aware (62 + insets.bottom — was a hardcoded 96 that ignored insets)',
);

// 6. Wizard sticky-CTA padding (A4 S5): all three wizard screens ride the
//    140 + insets.bottom formula — the CTA zone is ~106px on a 34px-inset
//    iPhone, so paddingBottom 96 left the last field under the CTA.
check(
  (subscribeScreensSrc.match(/paddingBottom: 140 \+ insets\.bottom/g) ?? []).length === 3
    && !subscribeScreensSrc.includes('paddingBottom: 96'),
  'all three subscribe wizard screens ride paddingBottom: 140 + insets.bottom (the sibling formula — the sticky CTA must never cover the last field)',
);

// 7. Payment money-form gate (A4 S6a): no POST with an empty sender phone
//    or a zero amount — the owner saw a generic 400 toast instead of a
//    field-level error.
check(
  subscribeScreensSrc.includes('fieldErrors') && subscribeScreensSrc.includes('amountNum <= 0'),
  'the payment form gates the POST on required sender phone (≥8 digits) + amount > 0, with rose halos via fieldFocusBorderStyle(_, error)',
);

// 8. Plans-empty branch (A4 S6b): the trapped-owner screen ships the same
//    empty state as its pricing twin (was a bare screen + dead «التالي»).
check(
  subscribeScreensSrc.includes('لا توجد باقات متاحة'),
  'SubscribePlan ships the plans-empty branch (the pricing twin\u2019s copy) — no dead «التالي» against an empty plans API',
);

// 9. EmptyState family (A4 S8): the two inline raw-text empties ride the
//    canonical 56px well (fleet ruling "empty = 56 grey / 18/600").
check(
  menuScreenSrc.includes('title="السلة فارغة"') && ownerScreensSrc.includes('title="لا توجد طلبات بعد"'),
  'the cart-sheet + dashboard empties ride the EmptyState family (no raw 13px muted text bypassing the 56px well)',
);

// 10. 0.93 bottom-nav press (A4 S9, r131 fleet ruling "0.97 controls /
//     0.93 nav"): the shared tab chrome wires the stronger thumb register
//     (covers BOTH tab bars — admin + owner — via TAB_SCREEN_OPTIONS).
check(
  navThemeSrc.includes('scaleTo={0.93}') && navThemeSrc.includes('tabBarButton: TabBarButton'),
  'bottom-nav thumbs ride the 0.93 press register via the shared tab chrome (was react-navigation native feedback with no custom register)',
);

// 11. Elevation ladder (A4 N1): the dead elevationCss carrier is gone, the
//     three real shadow sites consume theme/elevation rungs, and no
//     hand-rolled Android elevation survives outside the ladder module.
check(
  !stripComments(elevationSrc).includes('elevationCss'),
  'the dead elevationCss CSS-string carrier is gone (zero imports + a stale "pinned by parity" claim — A4 N1 deletion half)',
);
check(
  fabSrc.includes('...elevation[6]') && menuScreenSrc.includes('...elevation[6]') && providersSrc.includes('...elevation[3]'),
  'the FAB + sticky cart CTA ride elevation rung 6 and the toast rides rung 3 (the web --elev-3 twin) — no hand-rolled off-ladder shadow twins',
);
check(
  !codeOnly.some(({ f, s }) => f !== 'src/theme/elevation.ts' && /elevation:\s*\d/.test(s)),
  'no hand-rolled elevation: <number> styles outside theme/elevation.ts (the ladder is the only carrier)',
);

// 12. A10 finding 5 — the stale-twin trio (web round-12x fixes reach the
//     mobile leg): price smart-trim, receipt decimals/labels, network
//     error copy.
check(
  formatSrc.includes("fixed.replace(/\\.?0+$/, '')"),
  'formatPrice rides the web r120 smart trim (12.75 → «12.75», never a bare «.0», max 2dp) — the platforms must agree on money strings',
);
check(
  !receiptSrc.includes('decimals: 1') && receiptSrc.includes('getPickupTypeMeta, PICKUP_TYPE_META'),
  'receipts ride decimals: 2 + the canonical pickup labels (web r121: the owner share said 7.3 for a 7.25 item; unknown pickup enums printed raw)',
);
check(
  getErrorMessageSrc.includes('/^network request failed$/i') && getErrorMessageSrc.includes('NETWORK_ERROR_ARABIC'),
  'getErrorMessage maps RN fetch engine strings to friendly Arabic — raw English «Network request failed» never surfaces in the Arabic UI',
);

// ── §r133-F3 · round-133 mobile pins (auth boot-vs-action gate · modifier
// smart-trim · tab-bar insets · money-list memo · logical sticky sides ·
// dead-sm ban · OwnerQr React Query · shape skeletons ×6 · price ladder +
// chip tnum · microcopy R1/R6/R7/R10 + رمز QR) ───────────────────────────
// Same doctrine as §r132-F2b: text scans over the RAW sources read at the
// top (comment-stripped where a ban would trip on documentation), and the
// fleet sweeps ride codeOnly. What ships in the repo is what gets pinned.

const authStripped = stripComments(authStoreSrc);
const bootstrapBody = authStripped.slice(authStripped.indexOf('bootstrap: async'), authStripped.indexOf('login: async'));
const loginBody = authStripped.slice(authStripped.indexOf('login: async'), authStripped.indexOf('logout: async'));

// 1. A4 M1 (the round's MUST): login/bootstrap must never blank the app.
//    App.tsx returns null while status === "loading" — the login POST reused
//    that BOOT value, unmounting the whole tree (typed credentials wiped on
//    remount, the button's loading state unreachable, the failure toast
//    fired into an unmounted Toast ref = a silent no-op).
check(
  !loginBody.includes('status: "loading"'),
  'login() must NOT set the global boot status "loading" — App.tsx null-gates on it (the M1 fix: the whole app unmounted for the login POST duration, wiping credentials and dropping the failure toast)',
);
check(
  bootstrapBody.includes('useAuth.getState().status === "idle"')
    && bootstrapBody.includes('coldBoot ? { status: "loading", error: null } : { error: null }'),
  'bootstrap() flips to "loading" on COLD BOOT only — warm refreshes (SubscribePlan «تحديث حالة الاشتراك») keep the booted status so the app never blanks mid-session',
);
check(
  !stripComments(rootNavigatorSrc).includes('ActivityIndicator'),
  'RootNavigator carries no boot-spinner branch (dead code deleted with M1 — App.tsx is the one and only boot gate; "loading" is cold-boot-only now)',
);

// 2. A4 S1 (the fourth stale money twin): modifier summaries ride the web
//    r121-H-1 smart trim — 12.75 stayed «12.8» in the cart + WhatsApp
//    receipt while the detail chip said «12.75».
check(
  !stripComments(menuTypesSrc).includes('decimals: 1')
    && (menuTypesSrc.match(/formatPrice\(opt\.priceDelta\)/g) ?? []).length === 2,
  'buildModifierSummary rides formatPrice smart-trim on both branches (the web r121-H-1 twin) — no decimals: 1 money twin left in menu-types',
);

// 3. A4 S2: tab-bar safe-area. react-navigation merges [...defaults,
//    { paddingBottom: insets.bottom }, tabBarStyle] — later entries win, so
//    a static paddingBottom: 8 REPLACED the library inset and the 11px
//    labels rendered inside the home-indicator zone on notched devices.
check(
  navThemeSrc.includes('useTabScreenOptions') && navThemeSrc.includes('useSafeAreaInsets()')
    && navThemeSrc.includes('height: 64 + insets.bottom') && navThemeSrc.includes('paddingBottom: 8 + insets.bottom')
    && !/paddingBottom:\s*8\s*[,}]/.test(stripComments(navThemeSrc)),
  'the bottom-tab chrome is an insets-aware factory (height 64 + insets.bottom, paddingBottom 8 + insets.bottom) — a static paddingBottom: 8 may never override the library inset again',
);
check(
  adminStackSrc.includes('useTabScreenOptions()') && ownerStackSrc.includes('useTabScreenOptions()'),
  'both tab bars (admin + owner) consume the insets-aware tab chrome factory',
);

// 4. A4 S3: the money list stops re-rendering every visible card per
//    keystroke / cart tick — memoized filter + memoized card + stable
//    callbacks (FlashList re-renders all rows when renderItem's identity
//    changes).
check(
  menuScreenSrc.includes('const filteredItems = useMemo(')
    && menuScreenSrc.includes('const MenuItemCard = memo(function MenuItemCard')
    && menuScreenSrc.includes('const renderMenuItem = useCallback('),
  'MenuScreen memoizes the money list: filteredItems rides useMemo, MenuItemCard rides React.memo with a stable (item) => void onPress, renderItem rides useCallback — no full-list re-render per keystroke/cart tick',
);

// 5. A4 S4: ONE PublicStackParamList — the canonical list in types.ts (the
//    stale local twin had Login redirect? no screen reads + required-vs-
//    optional orderId drift).
check(
  publicStackSrc.includes('from "./types"') && !publicStackSrc.includes('export type PublicStackParamList'),
  'PublicStack consumes the canonical PublicStackParamList from ./types — the stale local twin is gone (one SSOT for navigator + linking + root union)',
);

// 6. A4 N2: the four sticky-CTA wrappers ride logical start/end — no inert
//    physical left/right pairs (symmetric = functionally inert in forced
//    RTL, but logical is the r131 sweep's standard spelling).
check(
  !codeOnly.some(({ s }) => /left:\s*16,\s*right:\s*16/.test(s))
    && (menuScreenSrc.match(/start: 16, end: 16/g) ?? []).length === 1
    && (subscribeScreensSrc.match(/start: 16, end: 16/g) ?? []).length === 3,
  'all four sticky-CTA wrappers ride start: 16, end: 16 (logical sides) — no inert left/right physical pairs',
);

// 7. A4 N4: the dead 36px Button sm variant is deleted and may not return
//    (8px under the 44px touch floor; zero consumers at deletion time).
check(
  !stripComments(buttonSrc).includes('min-h-9') && !buttonSrc.includes('sm: "text-sm"')
    && !codeOnly.some(({ s }) => /size="sm"/.test(s)),
  'Button has no 36px sm variant and no consumer passes size="sm" (the 44px touch floor holds on every button)',
);

// 8. A4 N5: OwnerQr rides the family data convention (React Query) — the
//    app's last hand-rolled useState/useEffect fetch.
check(
  ownerScreensSrc.includes('queryKey: ["owner-restaurants"]')
    && !ownerScreensSrc.includes('setRestaurants'),
  'OwnerQr fetches via useQuery(["owner-restaurants"]) like every other data screen — focus-refetch + cache + retry for free, no hand-rolled fetch twins',
);

// 9. A4 §3 (the F2b handoff): loading = shape skeletons on every data
//    screen — the six remaining full-screen spinners are retired. The ONE
//    surviving <Spinner> is the orders list's load-more pagination feedback
//    (inline pagination feedback is correct by design).
check(
  pricingScreenSrc.includes('<Skeleton') && !pricingScreenSrc.includes('<Spinner'),
  'PricingScreen loading = the plan-card shape skeleton (r-16 surface card + 24px price line + period line + 56px CTA well)',
);
check(
  subscribeScreensSrc.includes('<Skeleton') && !subscribeScreensSrc.includes('<Spinner'),
  'SubscribePlan loading = the plan-card shape skeleton (heading + name/24px-price/period rows) — the wizard spinner is gone',
);
check(
  (ownerScreensSrc.match(/<Spinner/g) ?? []).length === 1
    && (ownerScreensSrc.match(/<Skeleton/g) ?? []).length >= 4,
  'owner dashboard/orders/detail/QR loading = shape skeletons (KPI grid · order-card rows · detail card + item rows · QR block) — the single surviving Spinner is the load-more pagination footer',
);

// 10. A4 N3: the price-size ladder is frozen — 14px menu card / 12px cart
//     line / 16px totals / 24px plans ×2 (pinned since r131-F10) — and the
//     modifier chip's price suffix rides tnum/lnum like every other price
//     surface (the two tnum gaps; the add-CTA Button title cannot carry
//     fontVariant through Button's Text — documented exception).
check(
  menuScreenSrc.includes('fontSize: 14, fontWeight: "700", color: colors.gold, fontVariant: METRIC_FONT_VARIANT')
    && menuScreenSrc.includes('fontSize: 12, color: colors.gold, marginTop: 4, fontVariant: METRIC_FONT_VARIANT')
    && menuScreenSrc.includes('fontSize: 16, fontWeight: "700", color: colors.sand, fontVariant: METRIC_FONT_VARIANT'),
  'the menu price ladder is pinned: 14px card / 12px cart line / 16px totals (24px plans pinned since r131) — role-appropriate sizes, one register',
);
check(
  menuScreenSrc.includes('fontSize: 12, fontWeight: "600", color: selected ? colors.void : colors.sand, fontVariant: METRIC_FONT_VARIANT'),
  'the modifier chip price suffix rides tabular lining numerals (tnum/lnum) — the last proportional-digit money string is gone',
);

// 11. A9/R1 عميل — no زبون left in user-facing mobile strings (landing
//     journey, order rows, customer card).
check(
  !codeOnly.some(({ s }) => s.includes('زبون')),
  'customer noun is عميل everywhere (R1) — no زبون in code strings',
);
// 12. A9/R7 تليجرام — the SMm تيليجرام spelling split is closed.
check(
  !codeOnly.some(({ s }) => s.includes('تيليجرام'))
    && codeOnly.some(({ s }) => s.includes('تليجرام')),
  'Telegram is تليجرام everywhere (R7) — matches the SM-web/SB family spelling',
);
// 13. A9/R6 «…» — no ASCII "..." inside string literals (proper
//     string-literal extraction: quote … matching quote on one line with
//     escapes honored — never trips on array/object spreads between strings).
check(
  !codeOnly.some(({ s }) => [...s.matchAll(/(['"`])((?:\\.|(?!\\)[^\\\n])*?)\1/g)].some((m) => m[2].includes('...'))),
  'ellipsis is the single char «…» in string literals (R6) — no ASCII "..." left (search/notes placeholders + the three جارٍ button titles)',
);
check(
  codeOnly.some(({ s }) => s.includes('…')),
  'the «…» ellipsis character is actually present (the R6 pin is not vacuous)',
);
// 14. A9/R10 phone mask — 09XXXXXXXX, never the lowercase split.
check(
  !codeOnly.some(({ s }) => s.includes('09xxxxxxxx'))
    && (subscribeScreensSrc.match(/09XXXXXXXX/g) ?? []).length === 3,
  'phone-mask placeholder is 09XXXXXXXX everywhere (R10) — the lowercase 09xxxxxxxx split is closed',
);
// 15. A9 rec #9 رمز QR — the landing's «QR كود» marketing spelling joins
//     the 12 canonical mobile sites.
check(
  !codeOnly.some(({ s }) => s.includes('QR كود')) && codeOnly.some(({ s }) => s.includes('رمز QR')),
  'QR is «رمز QR» everywhere on mobile (A9 rec #9) — no «QR كود» split left',
);

// ── §r134-W2 · round-134 mobile money-path pins (the web r133 A12 trio
// finally reaches the app twin: Eastern-digit wa.me fold · search fold ·
// ar-LY price grouping · shared support builder). Same doctrine: text
// scans over the RAW sources read at the top. ─────────────────────────

const loginScreenSrc = read('src/screens/auth/LoginScreen.tsx');

// 1. r134 #1 (the P1): normalizeWaNumber folds Eastern digits BEFORE the
//    \d strip — Arabic-digit owner numbers (٠٩١٢…) opened the WhatsApp
//    share picker instead of the restaurant chat at checkout.
check(
  whatsappSrc.includes('const western = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));')
    && whatsappSrc.indexOf('const western') < whatsappSrc.indexOf('let digits'),
  'whatsapp lib folds Eastern digits (٠٩١٢…) to Western BEFORE the \\d strip — Arabic-digit owner numbers reach the restaurant chat, not the share picker (r133 A12-M1 mobile twin)',
);

// 2. r134 #8: search parity — normalizeArabic folds Eastern digits so an
//    Arabic-keyboard query «٠٩١٢» matches ASCII-digit names.
check(
  formatSrc.includes('.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))'),
  'normalizeArabic folds Eastern digits — Arabic-keyboard search «٠٩١٢» finds digit-bearing names (r133 A12-S12 mobile twin)',
);

// 3. r134 #4: formatPrice groups ar-LY dots ≥ 1000 — the KPI «إيرادات
//    اليوم» renders «12.500 د.ل» exactly like web (hand-rolled, not Intl).
check(
  formatSrc.includes('function groupDots(intStr: string): string {')
    && formatSrc.includes('intStr.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".")'),
  'formatPrice groups the whole part ar-LY (12500 → «12.500 د.ل») — the platforms agree on money strings (r133 R14/S2 mobile twin)',
);

// 4. r134 #15: the support link rides the shared builder — no hand-rolled
//    [^\d] strip (the pre-fold body) left in LoginScreen.
check(
  loginScreenSrc.includes('normalizeWaNumber(SUPPORT_WHATSAPP)')
    && loginScreenSrc.includes('buildWhatsAppShareUrl('),
  'LoginScreen support link rides normalizeWaNumber + buildWhatsAppShareUrl — no third inline wa.me builder (same Eastern-digit class as the fold)',
);

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Mobile Madarek parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Mobile Madarek parity snapshot: ${passed} assertions passed (colors + radius + motion + typography + landing Orbit-Ink + bans == canonical Madarek values)`);

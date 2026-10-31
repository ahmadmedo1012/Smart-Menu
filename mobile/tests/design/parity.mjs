#!/usr/bin/env node
/**
 * test(PHASE 6 / P6-2-c2) — Smart-Menu MOBILE design-parity snapshot,
 * re-anchored from the retired Madarek night mirror to the culinary contract.
 *
 * PHASE 6 PER-PRODUCT IDENTITY DECISION (the mobile leg of the r152 web
 * flip): the Smart Link Ecosystem broke the Madarek visual monoculture —
 * Smart-Menu's contract is «Warm Culinary Editorial»:
 *   LIGHT-FIRST  cream page #FBF7F0 · plate #FFFFFF · soft well #F4EDE1 ·
 *               warm hairline #E8DECE · espresso ink #241811 · secondary
 *               #6B5D4F · primary TERRACOTTA #C2452D (hover #A93A26 ·
 *               pressed/ink #8A2B1D · white on-accent 5.02:1) · amber #B7791F
 *               · sage/amber/steel/rose status · WhatsApp green reserved.
 *   DARK TWIN   «warm night kitchen» #1D1410 ground + luminous terracotta
 *               #E07856 (opt-in, mirrors the web .dark block — unconsumed
 *               follow-up data until the theme-toggle wave, pinned anyway).
 *   TYPE        Baloo Bhaijaan 2 display (400-800, real per-weight faces)
 *               + IBM Plex Sans Arabic body + IBM Plex Mono machine voice.
 *   GEOMETRY    plate-round ladder 10/12/14/16/20/24/28 — 16 = the plate
 *               (card) rung. DotLeader printed-menu rows · warm-scrim food
 *               imagery · warm pastel section families (light + night).
 * The retired Madarek tokens (night/sand/gold/void, #070B16/#E9B44C…) and
 * the doubly-retired Orbit-Ink landing world are BANNED below — the same
 * "don't resurrect" discipline the web harness carries.
 *
 * RE-ANCHOR NOTE (this file, P6-2-c2): the 2ee0141/2a4427a commits renamed
 * the colors.ts vocabulary (night→page · sand→ink · gold→terracotta ·
 * void→onAccent · lightColors→nightColors · pastelFamiliesLight→
 * pastelFamiliesNight · the sand family→ink) and this harness crashed at the
 * dead `export const lightColors =` marker. This re-anchor keeps the
 * ARCHITECTURE pins (names, split layers, consumption gates, money-path
 * sweeps) and re-pins every VALUE to the culinary canonical. The Phase-6
 * additions get their own sections: the typed owner API layer
 * (src/services/api/client.ts), the four real owner screens, and the admin
 * web-only states.
 *
 * Source-of-truth chain (same doctrine as the web harness):
 *   web src/app/globals.css §light/§dark (canonical, r152 culinary)
 *     → mobile/src/theme/colors.ts (inline-style SSOT, light = `colors`,
 *       night = `nightColors` — the opt-in twin)
 *       → mobile/tailwind.config.js (NativeWind mirror — a JS config cannot
 *         require the TS module, so the two are pinned to each other here)
 *   motion: src/theme/motion.ts ↔ globals.css §motion (fleet contract)
 *   typography: Baloo Bhaijaan 2 + IBM Plex Sans Arabic + IBM Plex Mono via
 *     @expo-google-fonts (the fake Cairo bold TTFs stay banned).
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
 * - Comments are stripped before ban-list sweeps (the historical notes are
 *   documentation, not code references) — but the hex/icon-size bans sweep
 *   raw text: a `color="#fff"` even in a comment is a copy-paste hazard.
 *
 * WHAT IS PINNED (category → count)
 *   colors light 33 · colors night 33 · pastel light 27 · pastel night 27
 *   tailwind color mirror 16 + brand trio 4 + SSOT-equality gate · plate
 *   radius 7 · tailwind motion 6 · easings 3 · fontFamily 4 (sans/display/
 *   heading/mono)
 *   theme/motion.ts 8 · motion↔tailwind consistency 6
 *   typography plex 4 + list · baloo 5 + list · weight resolvers 14
 *   font wiring chain 11 loadAsync + 11 expo-font TTFs + plugin gate
 *   app chrome 4 (light style · adaptive/splash cream · dark status bar)
 *   font sources 3 (plex-sans 0.4.2 · plex-mono 0.4.1 · baloo 0.4.2)
 *   landing «المائدة» tokens 17 + mono voice 3 · landing grammar 6
 *   scope-rule negatives + retired-world hex bans 6
 *   ban-list + wiring gates 8+ (prop-hex · white hex · Cairo/Readex · font
 *   binaries · 30px icons · FAB ink law + motion rung)
 *   r131-F10 12 · r132-F2b 22 · r133-F3 22 · r134-W2 4 (money-path pins,
 *   re-anchored to the terracotta/ink token names — logic untouched)
 *   §P6 typed owner API layer 14 · 4 real owner screens 10 · admin
 *   web-only states 4 · Baloo adoption + DotLeader + warm scrim + WhatsApp
 *   ink law + ComingSoon retirement 10
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
// r128 section sources — read RAW where grammar pins sweep text. The landing
// world itself is Phase-6 «المائدة» (paper/ember), pinned below.
const landingSrc = stripComments(read('src/theme/landing.ts'));
const radiusSrc = stripComments(read('src/theme/radius.ts'));
const spacingSrc = stripComments(read('src/theme/spacing.ts'));
const easingsSrc = stripComments(read('src/theme/easings.ts'));
const landingScreenSrc = read('src/screens/public/LandingScreen.tsx');
const trustBandSrc = read('src/components/landing/TrustBand.tsx');
const landingPillSrc = read('src/components/landing/LandingPill.tsx');
// r131 section sources — read RAW where grammar pins sweep text.
const uiIndexSrc = read('src/components/ui/index.tsx');
const inputSrc = read('src/components/ui/Input.tsx');
const menuScreenSrc = read('src/screens/public/MenuScreen.tsx');
const pricingScreenSrc = read('src/screens/public/PricingScreen.tsx');
const subscribeScreensSrc = read('src/screens/subscribe/SubscribeScreens.tsx');
// r132-F2b section sources — same RAW doctrine. navTheme is .tsx since r132
// (it renders the tab button now).
const providersSrc = read('src/app/providers.tsx');
const ownerScreensSrc = read('src/screens/owner/OwnerScreens.tsx');
const navThemeSrc = read('src/navigation/navTheme.tsx');
const whatsappSrc = read('src/lib/whatsapp.ts');
const receiptSrc = read('src/lib/receipt.ts');
const formatSrc = read('src/lib/format.ts');
const getErrorMessageSrc = read('src/lib/get-error-message.ts');
const skeletonSrc = read('src/components/ui/Skeleton.tsx');
const elevationSrc = read('src/theme/elevation.ts');
// r133-F3 section sources — same RAW doctrine (comment-stripped where a ban
// sweep would trip on documentation).
const authStoreSrc = read('src/store/auth.ts');
const menuTypesSrc = read('src/lib/menu-types.ts');
const buttonSrc = read('src/components/ui/Button.tsx');
const publicStackSrc = read('src/navigation/PublicStack.tsx');
const rootNavigatorSrc = read('src/navigation/RootNavigator.tsx');
const adminStackSrc = read('src/navigation/AdminStack.tsx');
const ownerStackSrc = read('src/navigation/OwnerStack.tsx');
// §Phase-6 (P6-2-c/cR) sources — the typed owner API layer, the four real
// owner screens, the admin web-only states, the DotLeader + warm-scrim
// signature motifs.
const apiClientSrc = read('src/services/api/client.ts');
const ownerRestaurantsSrc = read('src/screens/owner/OwnerRestaurantsScreen.tsx');
const ownerReviewsSrc = read('src/screens/owner/OwnerReviewsScreen.tsx');
const ownerMenuSrc = read('src/screens/owner/OwnerMenuScreen.tsx');
const ownerLoyaltySrc = read('src/screens/owner/OwnerLoyaltyScreen.tsx');
const adminScreensSrc = read('src/screens/admin/AdminScreens.tsx');
const dotLeaderSrc = read('src/components/DotLeader.tsx');
const optimizedImageSrc = read('src/components/shared/OptimizedImage.tsx');
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
    failures.push(`${category} · ${name} drifted from the culinary canonical: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
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
// Phase-6 re-anchor: LIGHT is the app default and owns the `colors` export
// name; the warm night kitchen is the `nightColors` opt-in twin (the old
// harness read `colors` as Madarek night + `lightColors` as the unconsumed
// light — the 2ee0141 flip inverted both the values and the precedence).

const lightColors = objectAfter(colorsSrc, 'export const colors =');
const nightColors = objectAfter(colorsSrc, 'export const nightColors =');
const pastelFamilies = objectAfter(colorsSrc, 'export const pastelFamilies =');
const pastelNightFamilies = objectAfter(colorsSrc, 'export const pastelFamiliesNight =');

const tailwind = objectAfter(tailwindSrc, 'module.exports =');
const extend = tailwind.theme.extend;
const twColors = extend.colors;
const twRadius = extend.borderRadius;
const twSpacing = extend.spacing;
const twDurations = extend.transitionDuration;
const twEasings = extend.transitionTimingFunction;
const twFonts = extend.fontFamily;

const motion = objectAfter(motionSrc, 'export const motion =');

const plexFamily = typographySrc.match(/export const PLEX_FAMILY = "([^"]+)"/)?.[1];
const plexMedium = typographySrc.match(/const PLEX_MEDIUM = "([^"]+)"/)?.[1];
const plexSemibold = typographySrc.match(/export const PLEX_SEMIBOLD = "([^"]+)"/)?.[1];
const plexBold = typographySrc.match(/export const PLEX_BOLD = "([^"]+)"/)?.[1];
const balooFamily = typographySrc.match(/export const BALOO_FAMILY = "([^"]+)"/)?.[1];
const balooMedium = typographySrc.match(/const BALOO_MEDIUM = "([^"]+)"/)?.[1];
const balooSemibold = typographySrc.match(/const BALOO_SEMIBOLD = "([^"]+)"/)?.[1];
const balooBold = typographySrc.match(/const BALOO_BOLD = "([^"]+)"/)?.[1];
const balooExtraBold = typographySrc.match(/const BALOO_EXTRA_BOLD = "([^"]+)"/)?.[1];
const typoScope = {
  family: plexFamily, medium: plexMedium, semibold: plexSemibold, bold: plexBold,
};
const balooScope = {
  family: balooFamily, medium: balooMedium, semibold: balooSemibold,
  bold: balooBold, extraBold: balooExtraBold,
};
// WEIGHT_TO_FAMILY values are IDENTIFIERS (PLEX_*/BALOO_*), not string
// literals — resolve them through the family constants the module exports.
const IDENT = {
  PLEX_FAMILY: plexFamily, PLEX_MEDIUM: plexMedium, PLEX_SEMIBOLD: plexSemibold, PLEX_BOLD: plexBold,
  BALOO_FAMILY: balooFamily, BALOO_MEDIUM: balooMedium, BALOO_SEMIBOLD: balooSemibold,
  BALOO_BOLD: balooBold, BALOO_EXTRA_BOLD: balooExtraBold,
};
const weightToFamilies = Object.fromEntries(
  Object.entries(objectAfter(typographySrc, 'WEIGHT_TO_FAMILY'))
    .map(([k, v]) => [k, IDENT[v] ?? v]),
);
const balooWeightToFamilies = Object.fromEntries(
  Object.entries(objectAfter(typographySrc, 'BALOO_WEIGHT_TO_FAMILY'))
    .map(([k, v]) => [k, IDENT[v] ?? v]),
);
const plexFamiliesList = objectBlockAfter(typographySrc, 'export const PLEX_FAMILIES', true)
  .split(',')
  .map((s) => s.match(/([A-Za-z_][A-Za-z0-9_]*)/)?.[1])
  .filter(Boolean)
  .map((id) => IDENT[id] ?? id);
const balooFamiliesList = objectBlockAfter(typographySrc, 'export const BALOO_FAMILIES', true)
  .split(',')
  .map((s) => s.match(/([A-Za-z_][A-Za-z0-9_]*)/)?.[1])
  .filter(Boolean)
  .map((id) => IDENT[id] ?? id);

const loadAsync = objectAfter(appSrc, 'Font.loadAsync');

// ── canonical snapshot ───────────────────────────────────────────────────────
// Values cross-verified against the web Phase-5 contract (src/app/
// globals.css §light/§dark, the r152 «Warm Culinary Editorial» flip) — one
// canonical palette, four carriers (web light, web dark, mobile light,
// mobile night).

// §1 LIGHT theme (the app DEFAULT) — the values every screen consumes
// (web: --background/--card/--muted/--border/--foreground/--primary…).
const LIGHT = {
  page: '#FBF7F0',            // --background light — warm cream ground
  surface: '#FFFFFF',          // --card light — raised plate
  surface2: '#F4EDE1',         // --muted light — soft-surface well
  surface3: '#EFE6D6',         // --neutral-150 light — deeper paper
  hairline: '#E8DECE',         // --border light — warm hairline
  hairlineStrong: '#D8CBB2',   // --neutral-300 light — strong divider
  ink: '#241811',              // --foreground light — espresso ink
  muted: '#6B5D4F',            // --muted-foreground light (5.95:1 on cream)
  textSecondary: '#6B5D4F',    // --text-secondary light
  textStrong2: '#3E332A',      // --neutral-800 light — near-espresso
  terracotta: '#C2452D',       // --primary light (4.70:1 non-text on cream)
  terracottaHover: '#A93A26',  // --accent-hover light
  terracottaPressed: '#8A2B1D',// --accent-strong light (text grade 8.05:1)
  terracottaSoft: '#F7E2D9',   // --accent-soft light — warm tint fill
  onAccent: '#FFFFFF',         // --primary-foreground light (5.02:1 on fill)
  mint: '#6FA06A',             // --c-mint-ink light — sage success
  mintBg: '#E1EDD9',           // --c-mint-bg light
  yellow: '#B7791F',           // --c-yellow-ink light — amber (sparing)
  yellowBg: '#F9EEDA',         // --c-yellow-bg light
  sky: '#6B8CA3',              // --c-sky-ink light — steel info
  skyBg: '#E3EBEF',            // --c-sky-bg light
  rose: '#C96873',             // --destructive light — deep rose
  roseBg: '#F9E5E6',           // --c-rose-bg light
  whatsapp: '#25D366',         // reserved brand green (theme-independent)
  whatsappInk: '#1F4F30',      // --whatsapp-ink light — deep forest
  shadow: '#402E1C',           // light --elev-* rgb(64,46,28,*) espresso dust
  menuLeader: '#CBB08C',       // --menu-leader light — warm tan (decorative)
  scrim: 'rgba(42,27,16,0.4)', // --overlay light espresso veil @40%
  surface2Scrim: 'rgba(244,237,225,0.92)',
  roseSoft: '#C9687324',       // rose @ ~14% (8-digit hex spelling)
  roseBorder: '#C9687355',     // rose @ ~33%
};

// §2 NIGHT theme — the «warm night kitchen» opt-in twin (web .dark block,
// byte-equal). Unconsumed follow-up data until the theme-toggle wave, still
// pinned (drift there is still drift).
const NIGHT = {
  page: '#1D1410',             // --background dark — espresso night ground
  surface: '#2A1E15',          // --card dark
  surface2: '#241A13',         // --muted dark
  surface3: '#2E2118',         // --neutral-150 dark
  hairline: '#38291D',         // --border dark — warm night hairline
  hairlineStrong: '#4A3626',   // --neutral-300 dark
  ink: '#F7EFE2',              // --foreground dark — cream ink
  muted: '#CDBFA9',            // --muted-foreground dark
  textSecondary: '#CDBFA9',    // --text-secondary dark
  textStrong2: '#E5D9C4',      // --neutral-800 dark
  terracotta: '#E07856',       // --primary dark — LUMINOUS terracotta (6.03:1)
  terracottaHover: '#C2452D',  // --c-ember dark
  terracottaPressed: '#A93A26',// deep pressed grade
  terracottaSoft: '#3A211A',   // --accent dark wash (night copper bg)
  onAccent: '#2A130D',         // --primary-foreground dark — void ink on glow
  mint: '#8FBB8A',             // --c-mint-ink dark — luminous sage
  mintBg: '#1E2B1A',           // --c-mint-bg dark
  yellow: '#E3B15E',           // --c-yellow-ink dark — luminous amber
  yellowBg: '#33270F',         // --c-yellow-bg dark
  sky: '#9FB6C9',              // --c-sky-ink dark — luminous steel
  skyBg: '#1F2A33',            // --c-sky-bg dark
  rose: '#E8918E',             // --c-rose-ink dark — luminous rose
  roseBg: '#36191D',           // --c-rose-bg dark
  whatsapp: '#25D366',         // reserved brand green
  whatsappInk: '#0F241C',      // --whatsapp-ink dark
  shadow: '#080503',           // dark --elev-* rgb(8,5,3,*)
  menuLeader: '#57402D',       // --menu-leader dark
  scrim: 'rgba(12,8,5,0.62)',  // --overlay dark
  surface2Scrim: 'rgba(36,26,19,0.92)',
  roseSoft: '#E8918E24',
  roseBorder: '#E8918E55',
};

// §3 the 9 warm section families — LIGHT bg/ink/deep triplets (web globals
// §1.6 light block). The old Madarek `sand` family rides the `ink` name now.
const PASTEL_LIGHT = {
  peach: ['#FBE3D9', '#C25A43', '#7A2E1D'],
  mint: ['#E1EDD9', '#6FA06A', '#2E5230'],
  lavender: ['#EFE9F6', '#8A76C9', '#453578'],
  sky: ['#E3EBEF', '#6B8CA3', '#2E4A5C'],
  yellow: ['#F9EEDA', '#B7791F', '#7A5210'],
  rose: ['#F9E5E6', '#C96873', '#8E2F3D'],
  ink: ['#F1E9D8', '#A98D5F', '#5C4620'],
  grey: ['#EFEAE2', '#6E6154', '#33302A'],
  copper: ['#F7E2D9', '#C2452D', '#8A2B1D'],
};

// §4 the 9 warm section families — NIGHT variants (web globals §1.6 dark
// block). Unconsumed opt-in twin of the light set above.
const PASTEL_NIGHT = {
  peach: ['#3A2016', '#E99070', '#F7CBB5'],
  mint: ['#1E2B1A', '#8FBB8A', '#CBE8C4'],
  lavender: ['#2A2136', '#B7A0DB', '#D9CDF0'],
  sky: ['#1F2A33', '#9FB6C9', '#CFE0EA'],
  yellow: ['#33270F', '#E3B15E', '#F4E2B8'],
  rose: ['#36191D', '#E8918E', '#F8CFD0'],
  ink: ['#2C2416', '#D6BC8A', '#EFE3C6'],
  grey: ['#262019', '#A79A87', '#D8CFC0'],
  copper: ['#3A211A', '#E07856', '#F2C4B0'],
};

// §5 NativeWind color mirror (tailwind.config.js) — semantic shadcn-style
// names the className path consumes; values must equal the colors.ts SSOT.
const TW_COLORS = {
  background: '#FBF7F0',
  foreground: '#241811',
  card: '#FFFFFF',
  muted: '#F4EDE1',
  'muted-foreground': '#6B5D4F',
  border: '#E8DECE',
  input: '#F4EDE1',          // mobile composition: field FILL (not web's border tint)
  ring: '#C2452D',
  'on-accent': '#FFFFFF',
  whatsapp: '#25D366',
  'whatsapp-ink': '#1F4F30',
  success: '#6FA06A',
  warning: '#B7791F',
  info: '#6B8CA3',
  destructive: '#C96873',
};

// terracotta trio anchors the className path (brand.DEFAULT == terracotta).
const TW_BRAND = {
  DEFAULT: '#C2452D',
  200: '#A93A26',       // --accent-hover (terracotta hover)
  500: '#C2452D',       // --primary
  600: '#8A2B1D',       // --accent-strong (pressed/ink)
};

// §6 the plate-round ladder (web --radius-xs…--radius-3xl, Phase-5 culinary
// contract): 10/12/14/16/20/24/28 with 16 = the plate (card) rung.
const RADIUS = { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 28 };

// §7 motion ladder (web --t-micro…--t-cinema) + easings (canonical béziers).
// The culinary identity inherits the fleet motion contract unchanged.
const MOTION_RUNGS = { MICRO: 80, FAST: 160, BASE: 240, SLOW: 380, SLOWER: 520, CINEMA: 720 };
const EASINGS = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',  // --ease
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',     // --ease-out
  soft: 'cubic-bezier(0.22, 1, 0.36, 1)',   // --ease-soft
};

// ── assertions ───────────────────────────────────────────────────────────────

pinAll(lightColors, 'colors-light', LIGHT);
pinAll(nightColors, 'colors-night', NIGHT);
for (const [family, [bg, ink, deep]] of Object.entries(PASTEL_LIGHT)) {
  const fam = pastelFamilies[family];
  pin(fam, 'pastel-light', 'bg', bg);
  pin(fam, 'pastel-light', 'ink', ink);
  pin(fam, 'pastel-light', 'deep', deep);
}
for (const [family, [bg, ink, deep]] of Object.entries(PASTEL_NIGHT)) {
  const fam = pastelNightFamilies[family];
  pin(fam, 'pastel-night', 'bg', bg);
  pin(fam, 'pastel-night', 'ink', ink);
  pin(fam, 'pastel-night', 'deep', deep);
}

// NativeWind mirror == colors.ts SSOT (the config cannot require the TS
// module — this gate is what keeps the two in sync).
pinAll(twColors, 'tailwind-colors', TW_COLORS);
pinAll(twColors.brand, 'tailwind-brand', TW_BRAND);
check(
  twColors.background === lightColors.page
    && twColors.foreground === lightColors.ink
    && twColors.card === lightColors.surface
    && twColors['on-accent'] === lightColors.onAccent
    && twColors.whatsapp === lightColors.whatsapp
    && twColors.ring === lightColors.terracotta,
  'tailwind color mirror must equal colors.ts SSOT for the shared light tokens (background/foreground/card/on-accent/whatsapp/ring)',
);

pinAll(twRadius, 'plate-radius', RADIUS);
pinAll(twSpacing, 'tailwind-spacing', {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 72, '4xl': 96,
});
pinAll(twDurations, 'tailwind-motion', {
  80: '80ms', 160: '160ms', 240: '240ms', 380: '380ms', 520: '520ms', 720: '720ms',
});
pinAll(twEasings, 'easings', EASINGS);

// fontFamily: the body stays the Plex Arabic face…
check(
  /^\[\s*"IBM Plex Sans Arabic"/.test(String(twFonts.sans ?? '')),
  `tailwind fontFamily.sans must be the IBM Plex Sans Arabic face (got ${JSON.stringify(twFonts.sans)})`,
);
// …the display/heading chain flips to Baloo Bhaijaan 2 (the web --font-display
// twin) with the Plex body behind it…
for (const key of ['display', 'heading']) {
  check(
    /^\[\s*"Baloo Bhaijaan 2",\s*"IBM Plex Sans Arabic"/.test(String(twFonts[key] ?? '')),
    `tailwind fontFamily.${key} must be the Baloo Bhaijaan 2 display chain (got ${JSON.stringify(twFonts[key])})`,
  );
}
// …and mono is the REAL mono face: IBM Plex Mono with the brand sans as the
// Arabic-run fallback — NOT the Sans face it aliased to before any mono
// shipped (the negative side of the same rule).
check(
  String(twFonts.mono ?? '').replace(/\s+/g, '') === '["IBMPlexMono","IBMPlexSansArabic","System"]',
  `tailwind fontFamily.mono must be IBM Plex Mono + Sans Arabic fallback (got ${JSON.stringify(twFonts.mono)})`,
);

// theme/motion.ts — the central ladder (r127-F8) + stagger grammar.
pinAll(motion, 'motion', { ...MOTION_RUNGS, STAGGER_STEP: 60, STAGGER_CAP: 6 });
for (const ms of Object.values(MOTION_RUNGS)) {
  pin(twDurations, 'motion-consistency', String(ms), `${ms}ms`);
}

// typography — the 4 registered BODY families …
pinAll(typoScope, 'typography-plex', {
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
  `typography PLEX_FAMILIES must list exactly the 4 registered body families (got ${JSON.stringify(plexFamiliesList)})`,
);

// … and the 5 registered DISPLAY families (Phase 6): Baloo Bhaijaan 2 ships a
// TRUE 800 — the per-weight registration the <Text> resolver maps onto.
pinAll(balooScope, 'typography-baloo', {
  family: 'Baloo Bhaijaan 2',
  medium: 'Baloo Bhaijaan 2-Medium',
  semibold: 'Baloo Bhaijaan 2-SemiBold',
  bold: 'Baloo Bhaijaan 2-Bold',
  extraBold: 'Baloo Bhaijaan 2-ExtraBold',
});
check(
  JSON.stringify(balooFamiliesList) === JSON.stringify([
    'Baloo Bhaijaan 2',
    'Baloo Bhaijaan 2-Medium',
    'Baloo Bhaijaan 2-SemiBold',
    'Baloo Bhaijaan 2-Bold',
    'Baloo Bhaijaan 2-ExtraBold',
  ]),
  `typography BALOO_FAMILIES must list exactly the 5 registered display families (got ${JSON.stringify(balooFamiliesList)})`,
);

// … and the weight resolvers: numeric weights map to real per-weight faces.
// Plex 800/900 → Bold (no true 800 ships — the r126-M1 no-fake-bold rule);
// Baloo 800 → ExtraBold (the face HAS a true 800 — no clamping).
pinAll(weightToFamilies, 'weight-resolver-plex', {
  400: 'IBM Plex Sans Arabic',
  500: 'IBM Plex Sans Arabic-Medium',
  600: 'IBM Plex Sans Arabic-SemiBold',
  700: 'IBM Plex Sans Arabic-Bold',
  800: 'IBM Plex Sans Arabic-Bold',
  900: 'IBM Plex Sans Arabic-Bold',
  bold: 'IBM Plex Sans Arabic-Bold',
});
pinAll(balooWeightToFamilies, 'weight-resolver-baloo', {
  400: 'Baloo Bhaijaan 2',
  500: 'Baloo Bhaijaan 2-Medium',
  600: 'Baloo Bhaijaan 2-SemiBold',
  700: 'Baloo Bhaijaan 2-Bold',
  800: 'Baloo Bhaijaan 2-ExtraBold',
  900: 'Baloo Bhaijaan 2-ExtraBold',
  bold: 'Baloo Bhaijaan 2-Bold',
});

// Font wiring chain: typography.ts ↔ App.tsx loadAsync ↔ app.json expo-font.
const GOOGLE_FONTS_IDS = {
  'IBM Plex Sans Arabic': 'IBMPlexSansArabic_400Regular',
  'IBM Plex Sans Arabic-Medium': 'IBMPlexSansArabic_500Medium',
  'IBM Plex Sans Arabic-SemiBold': 'IBMPlexSansArabic_600SemiBold',
  'IBM Plex Sans Arabic-Bold': 'IBMPlexSansArabic_700Bold',
  'IBM Plex Mono': 'IBMPlexMono_400Regular',
  'IBM Plex Mono-Medium': 'IBMPlexMono_500Medium',
  'Baloo Bhaijaan 2': 'BalooBhaijaan2_400Regular',
  'Baloo Bhaijaan 2-Medium': 'BalooBhaijaan2_500Medium',
  'Baloo Bhaijaan 2-SemiBold': 'BalooBhaijaan2_600SemiBold',
  'Baloo Bhaijaan 2-Bold': 'BalooBhaijaan2_700Bold',
  'Baloo Bhaijaan 2-ExtraBold': 'BalooBhaijaan2_800ExtraBold',
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
  '400Regular/IBMPlexMono_400Regular.ttf',
  '500Medium/IBMPlexMono_500Medium.ttf',
  '400Regular/BalooBhaijaan2_400Regular.ttf',
  '500Medium/BalooBhaijaan2_500Medium.ttf',
  '600SemiBold/BalooBhaijaan2_600SemiBold.ttf',
  '700Bold/BalooBhaijaan2_700Bold.ttf',
  '800ExtraBold/BalooBhaijaan2_800ExtraBold.ttf',
].map((f) => `./node_modules/@expo-google-fonts/${f.includes('IBMPlexSansArabic') ? 'ibm-plex-sans-arabic' : f.includes('IBMPlexMono') ? 'ibm-plex-mono' : 'baloo-bhaijaan-2'}/${f}`)) {
  check(
    (expoFontPlugin?.[1]?.fonts ?? []).includes(ttf),
    `app.json expo-font must natively embed ${ttf.split('/').pop()}`,
  );
}

// Chrome/appearance: LIGHT-first by design (Phase 6 revokes the Phase-5
// mobile night-only exclusion) — OS surfaces ride the cream ground with
// dark (espresso) status-bar icons.
pin(appJson.expo, 'app-chrome', 'userInterfaceStyle', 'light');
pin(appJson.expo.android?.adaptiveIcon ?? {}, 'app-chrome', 'backgroundColor', '#FBF7F0');
{
  const splash = JSON.stringify(
    (appJson.expo?.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') ?? [],
  );
  check(splash.includes('"backgroundColor":"#FBF7F0"'), 'expo-splash-screen backgroundColor must be cream #FBF7F0 (the culinary ground)');
}
check(
  appSrc.includes('<StatusBar style="dark" />'),
  'App.tsx status bar must carry dark (espresso) icons on the cream ground (was light/white for the retired night)',
);

// The font SOURCE stays the audited authentic package (r123: @expo-google-fonts
// TTFs verified byte-distinct real weights; exact pin, no caret drift).
pin({ version: pkg.dependencies?.['@expo-google-fonts/ibm-plex-sans-arabic'] }, 'font-source', 'version', '0.4.2');
// …the mono voice rides the same audited package family (r129-F5)…
pin({ version: pkg.dependencies?.['@expo-google-fonts/ibm-plex-mono'] }, 'font-source', 'version', '0.4.1');
// …and the display chain too (Phase 6 — Baloo Bhaijaan 2 per-weight TTFs).
pin({ version: pkg.dependencies?.['@expo-google-fonts/baloo-bhaijaan-2'] }, 'font-source', 'version', '0.4.2');

// ── §landing · the «المائدة» landing layer (Phase 6, P6-2-c) ─────────────────
// Web source of truth: src/app/landing.css §0 (--sm-* token block, the web
// Phase-5 r142 landing identity) — warm cream paper, deep espresso ink, the
// ember (terracotta) roster, dotted price leaders. The doubly-retired
// Orbit-Ink world (ink #252A3E / lime / violet) is gone; the landing paints
// the SAME culinary identity as the product world, scoped to the landing
// family only (the .landing R4 discipline).

// §landing-1 · the المائدة token block (landing.css --sm-* verbatim).
const LANDING = {
  paper: '#F7F1E3',
  paper2: '#EFE5D0',
  card: '#FFFDF7',
  ink: '#2B2014',
  inkDim: '#67523B',
  ember: '#C2452D',
  emberInk: '#A93A26',
  emberDeep: '#8A2B1D',
  emberBright: '#E89070',
  emberSoft: 'rgba(194,69,45,0.12)',
  line: 'rgba(43,32,20,0.16)',
  lineSoft: 'rgba(43,32,20,0.08)',
  lineStrong: 'rgba(43,32,20,0.30)',
  grainOpacity: '0.05',
  marqueeDurationMs: '42000',
  pressScale: '0.97',
  h1LineHeight: '1.18',
};
const landingTokens = objectAfter(landingSrc, 'export const landing =');
pinAll(landingTokens, 'landing-tokens', LANDING);

// §landing-2 · the mono machine voice (the --ln-mono stack, landing.css).
pinAll({
  family: landingSrc.match(/export const LANDING_MONO_FAMILY = "([^"]+)"/)?.[1],
  size: landingSrc.match(/export const LANDING_MONO_SIZE = (\d+)/)?.[1],
  tracking: landingSrc.match(/export const LANDING_MONO_TRACKING = ([\d.]+)/)?.[1],
}, 'landing-mono', {
  family: 'IBM Plex Mono',
  size: '12',
  tracking: '0.08',
});

// §landing-3 · LandingScreen grammar — the visible P0, pinned as text scans
// (the web suite pins served HTML; the mobile twin pins the shipped JSX).
check(/backgroundColor: landing\.paper/.test(landingScreenSrc), 'LandingScreen ground must be landing.paper (the المائدة cream-paper world)');
check(landingScreenSrc.includes('00 — البداية'), 'LandingScreen must open with the «00 — البداية» mono chapter eyebrow');
check(landingScreenSrc.includes('<Text style={{ color: landing.ember }}>على واتساب</Text>'), 'LandingScreen h1 must carry exactly ONE ember word (على واتساب — the web hero pattern, terracotta on cream)');
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
  'LandingPill must ship the 46/48px pair on the 0.97 landing press register',
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
  'no white hardcoded icon hex (color="#fff") may appear in src/ — on-accent ink rides colors.onAccent',
);

// 2. Cairo / Readex Pro stay retired (code references only — the App.tsx
//    historical note in comments is exempt by design).
for (const { f, s } of codeOnly) {
  for (const m of s.matchAll(/Cairo|ReadexPro|Readex\s+Pro/g)) {
    check(false, `${f}: retired font reference "${m[0]}" in code — the body face is IBM Plex Sans Arabic`);
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

// 5. On-brand-ink law on the WhatsApp FAB (web twin: --whatsapp-ink). The
//    glyph rides the deep-forest WhatsApp TEXT ink, NOT white and NOT the
//    retired Madarek void twin — WhatsApp green is never regraded.
check(/<MessageCircle[^>]*color=\{colors\.whatsappInk\}/.test(fabSrc), 'FloatingWhatsApp glyph must ride colors.whatsappInk on the green (on-brand-ink law)');
check(/FadeIn\.duration\(motion\.BASE\)/.test(fabSrc), 'FloatingWhatsApp entrance must ride motion.BASE (the central ladder rung)');

// 6. Retired-world hex bans (the "don't resurrect" discipline, web twin of
//    the DESIGN.md anti-pattern list): NO Madarek night/gold hex and NO
//    Orbit-Ink landing hex may appear in code — the culinary contract is the
//    only identity. (Comments are stripped; the historical notes stay legal.)
{
  const RETIRED_HEX = [
    // Madarek night world (2ee0141 retired)
    '#070B16', '#0D1428', '#121A36', '#1B2444', '#F2EFE6', '#8E97B8',
    '#E9B44C', '#F5D48A', '#C9962F', '#05070F',
    // Orbit-Ink landing world (doubly retired)
    '#252A3E', '#1C2032', '#F5F3E7', '#C9C6B4', '#DFEDB2', '#B9D778', '#7A6BF2', '#4E2FB8',
  ];
  check(
    !codeOnly.some(({ f, s }) => RETIRED_HEX.some((h) => s.toLowerCase().includes(h.toLowerCase()))),
    'no retired Madarek night/gold or Orbit-Ink hex in code — the culinary contract (cream/espresso/terracotta) is the only identity',
  );
  check(
    !codeOnly.some(({ s }) => s.toLowerCase().includes('#e9b44c') || s.toLowerCase().includes('#c9962f')),
    'the Madarek gold pair stays dead (terracotta #C2452D is the accent now)',
  );
}

// 7. Scope-rule negatives (the .landing R4 discipline): the المائدة tokens
//    live ONLY in the landing family; the product world keeps its own tokens
//    in both directions.
// 7a. theme/landing must not be imported outside the landing family.
const isLandingFamily = (f) =>
  f === 'src/screens/public/LandingScreen.tsx' || f.startsWith('src/components/landing/');
check(
  !codeOnly.some(({ f, s }) => f !== 'src/theme/landing.ts' && !isLandingFamily(f) && s.includes('@/theme/landing')),
  'theme/landing must not leak outside the landing family (المائدة scope rule — product screens keep colors.ts page/ink/terracotta)',
);
// 7b. The Landing route itself must not consume product tokens (the reverse
//     leak): the paper world renders landing.* only.
check(
  !/@\/theme\/colors|colors\.(page|surface|surface2|surface3|hairline|hairlineStrong|ink|muted|terracotta|terracottaPressed|onAccent|void|gold|night|sand)\b/.test(stripComments(landingScreenSrc)),
  'LandingScreen must ride the المائدة tokens — no product page/ink/terracotta leaks on the landing route',
);
// 7c. No raw المائدة-exclusive hex outside theme/landing.ts — the token block
//     is the ONLY carrier of those values (the ember trio is shared with the
//     product contract and stays legal; comments are stripped).
{
  const MAIDA_EXCLUSIVE_HEX = ['#F7F1E3', '#EFE5D0', '#FFFDF7', '#2B2014', '#67523B', '#E89070'];
  check(
    !codeOnly.some(({ f, s }) => f !== 'src/theme/landing.ts'
      && MAIDA_EXCLUSIVE_HEX.some((h) => s.toLowerCase().includes(h.toLowerCase()))),
    'no raw المائدة-exclusive hex outside theme/landing.ts — ride the landing tokens (ember colors via landing.*, the mono face via fontFamily)',
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

// 2. Price unification (r131 fleet ruling, Phase-6 re-anchor): the plan-price
//    metric is 24px on BOTH mobile pricing surfaces, Baloo display grade +
//    deep terracottaPressed ink (the same datum rendered two ways is retired).
check(
  pricingScreenSrc.includes('fontFamily: "Baloo Bhaijaan 2", fontSize: 24, fontWeight: "700", color: colors.terracottaPressed')
    && !pricingScreenSrc.includes('fontSize: 28'),
  'PricingScreen plan price must ride the unified 24px Baloo terracottaPressed tnum metric (fleet price ruling — 28px retired)',
);
check(
  subscribeScreensSrc.includes('fontFamily: "Baloo Bhaijaan 2", fontSize: 24, fontWeight: "700", color: colors.terracottaPressed')
    && !/fontSize: 20, fontWeight: "700", color: colors\.(gold|terracotta)/.test(subscribeScreensSrc),
  'SubscribeScreens plan price must ride the unified 24px Baloo terracottaPressed tnum metric (was 20px — same ruling as PricingScreen)',
);

// 3. State tiles (r131 ruling "empty = 56px well / 18/600"): the EmptyState
//    well is the 56px rounded warm grey-family plate (values warmed by the
//    culinary flip — the structure is the fleet contract).
check(
  uiIndexSrc.includes('pastelFamilies.grey.bg')
    && uiIndexSrc.includes('width: 56, height: 56, borderRadius: radius.xl'),
  'EmptyState well must be the canonical 56px rounded grey-family plate (fleet ruling — matches web EmptyState / SO states.tsx)',
);
// 3b. …and the shared state family carries no oversized circle wells — 56px
//     is the single tile rung.
check(
  !/width: (64|72|80), height: (64|72|80), borderRadius: 9999/.test(uiIndexSrc),
  'no oversized state wells in the shared state family — 56px is the single tile rung',
);

// 4. Field-focus grammar (fix 7): ONE halo helper drives the <Input>
//    primitive AND the raw sheet fields — focused = 2px terracotta border,
//    resting = 1px hairline (rose when error). The primitive and the
//    hand-rolled fields can no longer drift apart.
check(
  inputSrc.includes('export function fieldFocusBorderStyle')
    && inputSrc.includes('borderWidth: 2, borderColor: colors.terracotta'),
  'Input.tsx must export fieldFocusBorderStyle — the app-wide field-focus halo (2px terracotta border on focus, A2 P1-3 mobile twin)',
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
  'MenuScreen loading = SHAPE skeletons matching the item-card layout (64px thumb + text lines + price row) — the centered spinner is retired',
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
  'toast card = the web premiumToast recipe: 28px rounded pastel icon well + 1px hairline card with the status color on the inline-START edge',
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
//    canonical 56px well (fleet ruling "empty = 56 well / 18/600").
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

// ── §P38-C2 · the C2-audit P0 money-path pins (receipt twin parity) ────
check(
  receiptSrc.includes('deliveryFee?: number') &&
    receiptSrc.includes('رسوم التوصيل') &&
    receiptSrc.includes('opts.deliveryFee && opts.deliveryFee > 0') &&
    receiptSrc.includes('feeLine'),
  'P38 receipt twin: the delivery-fee line (web r137/r138) exists on BOTH builders — without it the WhatsApp lines sum BELOW the server total whenever a fee exists (صدق الفاتورة)',
);
check(
  !/[🏪📋🆔🕐📍👤📞📦📝💵🌐🌟🛵💰✨]/.test(receiptSrc) && receiptSrc.includes('\\u{1F3EA}'),
  'P38 receipt twin: every emoji is a \\u{...} escape (web r143) — raw multibyte literals are one non-UTF-8 toolchain pass away from U+FFFD corruption in the encoded wa.me text',
);
check(
  menuScreenSrc.includes('removeItem("smartmenu_referral")') &&
    menuScreenSrc.includes('deliveryFee: res.deliveryFee != null ? Number(res.deliveryFee) : undefined'),
  'P38 checkout: the referral key dies with the order that consumed it (web cart twin), and the receipt carries the server-echo deliveryFee',
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
  'PricingScreen loading = the plan-card shape skeleton (plate card + 24px price line + period line + CTA well)',
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
//     line / 16px totals / 24px plans ×2 (pinned since r131, Phase-6
//     re-anchor: deep terracottaPressed money ink + espresso totals) — and
//     the modifier chip's price suffix rides tnum/lnum like every other
//     price surface.
check(
  menuScreenSrc.includes('fontSize: 14, fontWeight: "700", color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT')
    && menuScreenSrc.includes('fontSize: 12, color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT')
    && menuScreenSrc.includes('fontSize: 16, fontWeight: "700", color: colors.ink, fontVariant: METRIC_FONT_VARIANT'),
  'the menu price ladder is pinned: 14px card / 12px cart line / 16px totals (24px plans pinned since r131) — role-appropriate sizes, one register',
);
check(
  menuScreenSrc.includes('fontSize: 12, fontWeight: "600", color: selected ? colors.onAccent : colors.ink, fontVariant: METRIC_FONT_VARIANT'),
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

// ── §P6 · Phase-6 mobile parity additions (P6-2-c/cR → re-anchored by
// P6-2-c2): the typed owner API layer, the four REAL owner screens, the
// admin web-only states, and the culinary signature motifs (Baloo display
// adoption · DotLeader · warm scrim · WhatsApp ink law). Same doctrine:
// text scans over the RAW sources — what ships is what gets pinned. ────

// 1. The typed OWNER API surface (b2d4788): one typed contract for every
//    owner screen, mirroring the web routes verbatim — no hand-rolled path
//    strings in screens.
check(
  apiClientSrc.includes('export async function getOwnerRestaurants(): Promise<OwnerRestaurant[]>')
    && apiClientSrc.includes('"/api/owner/restaurants", { method: "GET" }'),
  'the typed owner API carries GET /api/owner/restaurants (list + _count + isPrimary)',
);
check(
  apiClientSrc.includes('export async function createOwnerRestaurant')
    && apiClientSrc.includes('"/api/owner/restaurants", { method: "POST", body: draft }'),
  'the typed owner API carries POST /api/owner/restaurants (the web createSchema core: name + legal slug)',
);
check(
  apiClientSrc.includes('export async function setPrimaryOwnerRestaurant(restaurantId: number)')
    && apiClientSrc.includes('method: "PATCH", body: { isPrimary: true }'),
  'the typed owner API carries the primary-menu PATCH (the route clears the owner\u2019s other links first)',
);
check(
  apiClientSrc.includes('export async function deleteOwnerRestaurant(restaurantId: number)')
    && apiClientSrc.includes('`/api/owner/restaurants/${restaurantId}`, { method: "DELETE" }'),
  'the typed owner API carries restaurant DELETE (refuses the primary menu + menus with orders — web 400/409)',
);
check(
  apiClientSrc.includes('export async function getOwnerReviews(')
    && apiClientSrc.includes('qs.set("minRating", String(params.minRating))')
    && apiClientSrc.includes('res.extras?.stats as OwnerReviewsStats'),
  'the typed owner API carries GET /api/owner/reviews with the `stats` envelope extra + server-side minRating filter',
);
check(
  apiClientSrc.includes('`/api/items/${menuItemId}/reviews?reviewId=${reviewId}`'),
  'review moderation rides the web r103-F5b contract — DELETE /api/items/[id]/reviews?reviewId=',
);
check(
  apiClientSrc.includes('export async function getLoyaltyStats(): Promise<LoyaltyStats>')
    && apiClientSrc.includes('"/api/loyalty/stats"'),
  'the typed owner API carries GET /api/loyalty/stats (KPIs + tier/referral aggregates)',
);
check(
  apiClientSrc.includes('export async function getOwnerCategories(restaurantId: number)')
    && apiClientSrc.includes('`/api/categories?restaurantId=${restaurantId}&pageSize=100`'),
  'the typed owner API carries GET /api/categories?restaurantId= with the _count items + pageSize=100 full-menu page',
);
check(
  apiClientSrc.includes('export async function getOwnerItems(categoryId: number)')
    && apiClientSrc.includes('`/api/items?categoryId=${categoryId}&pageSize=100`'),
  'the typed owner API carries GET /api/items?categoryId= (owner sees all statuses)',
);
check(
  apiClientSrc.includes('export async function setOwnerItemAvailability(itemId: number, status: OwnerItemStatus)')
    && apiClientSrc.includes('method: "PUT", body: { status }'),
  'the availability toggle rides the PARTIAL PUT (omitted fields are never overwritten — a status-only body is safe)',
);
check(
  apiClientSrc.includes('export async function createOwnerItem(draft: OwnerItemDraft)')
    && apiClientSrc.includes('export async function updateOwnerItem(itemId: number, draft: Partial<OwnerItemDraft>)')
    && apiClientSrc.includes('export async function deleteOwnerItem(itemId: number)'),
  'the typed owner API carries the item CRUD triple (POST / PUT partial / DELETE)',
);
check(
  apiClientSrc.includes('_count: { categories: number; orders: number };')
    && apiClientSrc.includes('distribution: { star: number; count: number }[];'),
  'the owner types mirror the web shapes verbatim (OwnerRestaurant._count + OwnerReviewsStats.distribution)',
);
check(
  apiClientSrc.includes('const { success: _success, data, meta, error: _error, details: _details, ...extras } = env;')
    && apiClientSrc.includes('extras: Object.keys(extras).length > 0'),
  'the envelope wrapper captures EXTRAS (top-level keys the web paginated(data,…,extras) helper merges) alongside data/meta',
);
check(
  apiClientSrc.includes('registerUnauthorizedHandler'),
  'the client keeps the single dead-token 401 handler registration (auth state resets once, not per-screen)',
);

// 2. The four REAL owner screens (b5dcf3b) — typed calls + React Query +
//    the warm grammar (Baloo headers · DotLeader money rows · 44px
//    fieldFocusBorderStyle fields · tnum metrics).
check(
  ownerRestaurantsSrc.includes('createOwnerRestaurant') && ownerRestaurantsSrc.includes('setPrimaryOwnerRestaurant')
    && ownerRestaurantsSrc.includes('deleteOwnerRestaurant') && ownerRestaurantsSrc.includes('from "@/services/api/client"')
    && ownerRestaurantsSrc.includes('queryKey: ["owner-restaurants"]'),
  'OwnerRestaurantsScreen («فروعي») rides the typed API: list + create + primary PATCH + destructive delete, all through React Query',
);
check(
  ownerRestaurantsSrc.includes('Alert.alert(') && ownerRestaurantsSrc.includes('minHeight: 44, borderRadius: 14')
    && ownerRestaurantsSrc.includes('fieldFocusBorderStyle'),
  'OwnerRestaurantsScreen destructive delete carries an explicit confirm stop + the 44px r-14 fieldFocusBorderStyle form fields',
);
check(
  ownerReviewsSrc.includes('getOwnerReviews') && ownerReviewsSrc.includes('deleteOwnerReview')
    && ownerReviewsSrc.includes('minRating: filterStar ?? undefined')
    && ownerReviewsSrc.includes('stats.total') && ownerReviewsSrc.includes('stats.avg'),
  'OwnerReviewsScreen («التقييمات») rides the typed API: stats header (total/avg) + server-side minRating star chips + moderation delete',
);
check(
  ownerMenuSrc.includes('getOwnerCategories') && ownerMenuSrc.includes('getOwnerItems')
    && ownerMenuSrc.includes('setOwnerItemAvailability') && ownerMenuSrc.includes('createOwnerItem')
    && ownerMenuSrc.includes('updateOwnerItem') && ownerMenuSrc.includes('deleteOwnerItem')
    && ownerMenuSrc.includes('DotLeader'),
  'OwnerMenuScreen («إدارة المنيو») rides the typed API: category drill → items → availability PUT + create/update/delete sheet + DotLeader price rows',
);
check(
  ownerLoyaltySrc.includes('getLoyaltyStats') && ownerLoyaltySrc.includes('DotLeader')
    && ownerLoyaltySrc.includes('queryKey: ["loyalty-stats"]'),
  'OwnerLoyaltyScreen («برنامج الولاء») rides the typed loyalty stats via React Query with DotLeader read-only rows',
);
check(
  ownerRestaurantsSrc.includes('fieldFocusBorderStyle') && ownerMenuSrc.includes('fieldFocusBorderStyle')
    && ownerMenuSrc.includes('METRIC_FONT_VARIANT') && ownerReviewsSrc.includes('METRIC_FONT_VARIANT'),
  'the new owner screens consume the shared field-focus halo + tnum metric grammar (no hand-rolled focus/money twins)',
);
check(
  ['OwnerRestaurantsScreen', 'OwnerReviewsScreen', 'OwnerMenuScreen', 'OwnerLoyaltyScreen'].every((n) => {
    const src = { OwnerRestaurantsScreen: ownerRestaurantsSrc, OwnerReviewsScreen: ownerReviewsSrc, OwnerMenuScreen: ownerMenuSrc, OwnerLoyaltyScreen: ownerLoyaltySrc }[n];
    return src.includes('useQuery(') || src.includes('useMutation(');
  }),
  'all four real owner screens ride React Query (focus-refetch + cache + retry — no hand-rolled fetch twins)',
);
check(
  ownerRestaurantsSrc.includes('EmptyState') && ownerReviewsSrc.includes('EmptyState')
    && ownerMenuSrc.includes('EmptyState') && ownerLoyaltySrc.includes('EmptyState'),
  'all four real owner screens ship the canonical EmptyState family (no bare raw-text empties)',
);
check(
  !codeOnly.some(({ s }) => s.includes('ComingSoon')),
  'ComingSoon is retired with zero consumers — the four owner screens are real and the admin stubs render the intentional web-only state',
);

// 3. The admin web-only states (b5dcf3b): the ten admin surfaces that stay
//    web-only render the honest identity state — warm plate well + the
//    link-out affordance, never a fake "coming soon".
check(
  adminScreensSrc.includes('function AdminWebOnly')
    && adminScreensSrc.includes('width: 56, height: 56, borderRadius: 16, backgroundColor: colors.terracottaSoft'),
  'the admin web-only state carries the 56px r-16 terracottaSoft warm plate well',
);
check(
  adminScreensSrc.includes('ExternalLink size={16} color={colors.onAccent}')
    && adminScreensSrc.includes('فتح لوحة الويب'),
  'the admin web-only state links OUT to the web console (ExternalLink glyph on terracotta, «فتح لوحة الويب» label)',
);
check(
  (adminScreensSrc.match(/<AdminWebOnly/g) ?? []).length === 9
    && adminScreensSrc.includes('webPath="/admin/restaurants"'),
  'the nine web-only admin surfaces (restaurants/users/admins/orders/order-detail/subscriptions/system-events/audit-logs/telegram) ride the one AdminWebOnly identity',
);
check(
  adminScreensSrc.includes('colors.page') && adminScreensSrc.includes('colors.ink')
    && adminScreensSrc.includes('colors.muted'),
  'the admin surfaces ride the culinary tokens (cream page + espresso ink — no Madarek night remnants)',
);

// 4. The culinary signature motifs (2ee0141 + 2a4427a):
// 4a. Baloo display adoption — every ≥18px heading flips to the display face.
{
  const balooSites = codeOnly.reduce(
    (n, { s }) => n + (s.match(/fontFamily: "Baloo Bhaijaan 2"/g) ?? []).length, 0,
  );
  check(
    balooSites >= 30,
    `Baloo Bhaijaan 2 display adoption ≥ 30 call sites (got ${balooSites}) — the heading fleet flipped to the culinary display face`,
  );
}
// 4b. DotLeader — the printed-menu signature (web .menu-leader twin).
check(
  dotLeaderSrc.includes('export function DotLeader(') && dotLeaderSrc.includes('export function DotLeaderRule(')
    && dotLeaderSrc.includes('ink = colors.menuLeader')
    && dotLeaderSrc.includes('borderStyle: "dotted"'),
  'DotLeader ships the printed-menu signature: dotted rule on colors.menuLeader ink, both the row and the bare rule',
);
{
  const dotLeaderConsumers = codeOnly.filter(({ f, s }) =>
    f !== 'src/components/DotLeader.tsx' && s.includes('DotLeader')).length;
  check(
    dotLeaderConsumers >= 4,
    `DotLeader is consumed on ≥ 4 surfaces (got ${dotLeaderConsumers}: menu card/cart/totals + owner rows) — the signature motif is not orphaned`,
  );
}
// 4c. The warm scrim (web .warm-scrim* twin) — food imagery under an
//     espresso veil, grades strong/faint.
check(
  optimizedImageSrc.includes('scrim?: ScrimGrade') && optimizedImageSrc.includes('0.78')
    && optimizedImageSrc.includes('0.34'),
  'OptimizedImage ships the warm scrim grades (strong 0.78/0.34 — the web .warm-scrim-strong espresso veil twin)',
);
check(
  menuScreenSrc.includes('scrim="strong"'),
  'the MenuScreen item detail hero rides the STRONG warm scrim (full-width photo under the espresso veil)',
);
// 4d. WhatsApp ink law on the order CTA — the send-order button carries the
//     reserved green with its deep-forest text ink (never white).
check(
  buttonSrc.includes('variant === "whatsapp" ? colors.whatsappInk'),
  'the whatsapp Button variant carries colors.whatsappInk for its glyph/loading ink (the reserved green keeps its own text ink)',
);
// 4e. The checkout CTA pair stays on the culinary primary, not the brand green.
check(
  menuScreenSrc.includes('variant="whatsapp"') && menuScreenSrc.includes('إرسال الطلب عبر واتساب'),
  'the checkout money CTA is the ONE sanctioned WhatsApp-green surface («إرسال الطلب عبر واتساب») — reserved-brand discipline holds',
);

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Mobile culinary parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Mobile culinary parity snapshot: ${passed} assertions passed (colors light/night + pastels + tailwind mirror + plate radius + motion + Baloo/Plex typography + المائدة landing + money-path pins + typed owner API + 4 owner screens + admin web-only states + bans == the Phase-6 Warm Culinary Editorial canonical)`);

/**
 * test(r125 → r126 → PHASE 5 r152) — Smart-Menu design-token parity snapshot.
 *
 * PHASE 5 PER-PRODUCT IDENTITY DECISION (the coordinator mission, r152):
 * the Smart Link Ecosystem breaks the Madarek visual monoculture — each of
 * the four products gets its own design contract. Smart-Menu's contract is
 * «Warm Culinary Editorial»: LIGHT-FIRST warm cream ground #FBF7F0 ·
 * raised #FFFFFF · soft #F4EDE1 · espresso ink #241811 · secondary #6B5D4F ·
 * hairline #E8DECE · primary TERRACOTTA #C2452D (white fg 5.02:1, hover
 * #A93A26, strong #8A2B1D) · warm amber #B7791F · sage success · amber
 * warning · warm-steel info · deep-rose destructive. Baloo Bhaijaan 2
 * display + IBM Plex Sans Arabic body. Plate-round radius 10..28 (16 card).
 * The dark mode becomes the explicit opt-in `.dark` = «مطبخ ليلي دافئ»
 * (warm night kitchen, espresso #1D1410 + luminous terracotta #E07856).
 *
 * WHAT THIS FILE IS
 * ─────────────────
 * A CI-able snapshot of the SMART-MENU canonical values (formerly the
 * Madarek mirror), asserted against src/app/globals.css (the repo's single
 * token file). Any future token edit that drifts from the contract fails
 * `pnpm test` immediately, with a message naming the exact token and both
 * values. The ARCHITECTURE pins (names, split layers, consumption gates)
 * carry over from the Madarek era — only the VALUES were re-anchored.
 *
 * r126 EXTENSION (P4-W3b, parity with smart-link's 271-pin / smart-order's
 * 161-pin harnesses): the r125 pins covered token DEFINITIONS only — the
 * P4-F1b wave's @theme bridges, z-ladder, focus contract, ambient bands,
 * font manifest and @media surfaces were unpinned (its follow-up list, item
 * a). Added below, after the r125 sections:
 *   - the @theme inline bridges: duration-micro..cinema → --t-*,
 *     shadow-xs..2xl → --elev-1..5, glass shadows, radius ladder, fonts;
 *   - the focus-ring contract: --ring + --state-focus-ring-* (color/width/
 *     offset/shorthand) + --state-input-focus-halo, both themes;
 *   - the z-order ladder 0..600 (Madarek §1.11), both cascades;
 *   - the ambient loop bands (1.6/2.4/3.6/6/9/22s) + stagger step/cap +
 *     RTL motion direction;
 *   - the 10-face IBM Plex @font-face manifest (family/weight/style/display/
 *     unicode-range per face) + on-disk existence of every woff2
 *     (public/fonts/fonts.css);
 *   - the full prefers-contrast: more port (15 tokens × 2 themes) and the
 *     prefers-reduced-motion token zeroing;
 *   - CONSUMPTION gates (smart-order's r126 pattern): pinned tokens must
 *     have ≥1 real consumer — definitions without adoption were the exact
 *     debt class the P4-A1 audit found.
 *
 * HOW IT READS THE CSS (Phase 5 flip)
 * ─────────────────────
 * - Only the theme blocks matter: :root (the LIGHT default — Warm Culinary
 *   Editorial) and .dark (the opt-in warm night kitchen) — extracted
 *   brace-matched from the TOP LEVEL so @media (prefers-contrast /
 *   reduced-motion) overrides can never mask the resting values.
 * - The dark scope is the real cascade: {.dark} overlays {:root}; tokens
 *   .dark does not redefine (radius, motion, fonts, …) inherit :root.
 * - var() chains are resolved inside the final scope (e.g. --accent-soft is
 *   var(--c-copper-bg) and must resolve to the per-theme family ground).
 * - Comparisons are normalization-tolerant (whitespace, `a,b` vs `a, b`,
 *   hex case) so the test pins VALUES, not formatting.
 * - Block matching takes the LAST at-rule/selector before each `{` — the
 *   first @font-face in fonts.css follows the :root shim, and @theme inline
 * follows the @import/@custom-variant header (the r126 smart-link parser
 * fix, ported).
 *
 * Every pinned literal below was cross-checked against the live SSOT by
 * scripts/parity_matrix.py (download/madarek-parity-matrix.md) — 144/144
 * tokens green at the time of authoring.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── token file → theme scopes ────────────────────────────────────────────────

const css = readFileSync('src/app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
// r126: the @font-face manifest lives in its own stylesheet next to the woff2s
const fontsCss = readFileSync('public/fonts/fonts.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

function topLevelBlock(source: string, prelude: string): string {
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') depth -= 1;
      j += 1;
    }
    // the segment before `{` may carry earlier statements (e.g. @theme inline
    // follows the @import/@custom-variant header; the first @font-face
    // follows the :root --font-cairo shim) — only the LAST at-rule/selector
    // in it is what this brace opens (r126 smart-link parser fix, ported).
    const last = source.slice(i, open).split(/[;}]/).pop()?.trim() ?? '';
    if (last === prelude) return source.slice(open + 1, j - 1);
    i = j;
  }
  throw new Error(`top-level block not found: ${prelude}`);
}

function allTopLevelBlocks(source: string, prelude: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') depth -= 1;
      j += 1;
    }
    const last = source.slice(i, open).split(/[;}]/).pop()?.trim() ?? '';
    if (last === prelude) out.push(source.slice(open + 1, j - 1));
    i = j;
  }
  return out;
}

function parseDecls(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) {
    out[`--${m[1]}`] = m[2].trim();
  }
  return out;
}

// Phase 5 flip: :root IS the light default; .dark is the opt-in overlay.
const light = parseDecls(topLevelBlock(css, ':root'));
// real cascade: .dark overlays :root; everything else inherits
const dark: Record<string, string> = { ...light, ...parseDecls(topLevelBlock(css, '.dark')) };
// r126: the Tailwind bridge layer — what every duration-*/shadow-*/rounded-*
// utility actually resolves to. NOTE: var() refs inside @theme (var(--t-*),
// var(--elev-*)) are pinned AS REFERENCES; they resolve at runtime against
// the live theme cascade pinned above.
const theme = parseDecls(topLevelBlock(css, '@theme inline'));
const fontFaces = allTopLevelBlocks(fontsCss, '@font-face');

function resolve(scope: Record<string, string>, value: string, depth = 0): string {
  if (depth > 10) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*)\s*)?\)/g, (_m, name: string, fb?: string) => {
    if (scope[name] !== undefined) return resolve(scope, scope[name], depth + 1);
    return fb ?? `var(${name})`;
  });
}

function norm(v: string): string {
  return v
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/#[0-9a-f]{3,8}/gi, (h) => h.toUpperCase())
    .trim();
}

function pin(scope: Record<string, string>, mode: string, token: string, expected: string) {
  const raw = scope[token];
  expect(raw, `${mode} ${token} is missing from globals.css`).toBeDefined();
  const actual = norm(resolve(scope, raw as string));
  expect(actual, `${mode} ${token} drifted from the Madarek canonical value`).toBe(norm(expected));
}

// ── canonical snapshot (Smart-Menu Warm Culinary Editorial, r152) ───────────

const GROUNDS_LIGHT: Record<string, string> = {
  '--bg': '#FBF7F0', // neutral-50 cream
  '--bg-soft': '#F4EDE1', // soft surface
  '--surface': '#FFFFFF', // raised plate
  '--surface-2': '#F4EDE1',
  '--surface-3': '#EFE6D6',
  '--text': '#241811', // neutral-900 espresso
  '--text-secondary': '#6B5D4F', // 5.95:1
  '--text-muted': '#7A6A58', // faint tier — 4.88:1 on cream
  '--text-faint': '#7A6A58',
  '--border': '#E8DECE', // warm hairline (family token)
  '--border-strong': '#D8CBB2',
};
const GROUNDS_DARK: Record<string, string> = {
  '--bg': '#1D1410', // neutral-50 espresso night
  '--bg-soft': '#241A13',
  '--surface': '#2A1E15', // neutral-0
  '--surface-2': '#241A13',
  '--surface-3': '#2E2118',
  '--text': '#F7EFE2', // neutral-900 cream
  '--text-secondary': '#CDBFA9',
  '--text-muted': '#9A8977',
  '--text-faint': '#9A8977',
  '--border': '#38291D', // neutral-200 hairline (family token)
  '--border-strong': '#4A3626',
};
const ACCENT_LIGHT: Record<string, string> = {
  '--accent-solid': '#C2452D', // terracotta (product primary)
  '--accent-hover': '#A93A26',
  '--accent-soft': '#F7E2D9', // resolves var(--c-copper-bg)
  '--accent-strong': '#8A2B1D',
  '--accent-fg': '#FFFFFF', // 5.02:1 on terracotta
  '--accent-ink': '#8A2B1D', // 8.05:1 on cream
};
const ACCENT_DARK: Record<string, string> = {
  '--accent-solid': '#E07856', // luminous terracotta (night primary)
  '--accent-hover': '#E98F72',
  '--accent-soft': '#3A211A', // resolves var(--c-copper-bg)
  '--accent-strong': '#C2452D',
  '--accent-fg': '#2A130D', // 5.84:1 on the luminous fill
  '--accent-ink': '#E07856', // 6.03:1 on night
};
const STATUS_LIGHT: Record<string, string> = {
  '--success': '#6FA06A', '--success-soft': '#E1EDD9', '--success-ink': '#2E5230',
  '--warning': '#B7791F', '--warning-soft': '#F9EEDA', '--warning-ink': '#7A5210',
  '--danger': '#C96873', '--danger-soft': '#F9E5E6', '--danger-ink': '#8E2F3D',
  '--danger-fg': '#241811',
  '--info': '#6B8CA3', '--info-soft': '#E3EBEF', '--info-ink': '#2E4A5C',
};
const STATUS_DARK: Record<string, string> = {
  '--success': '#8FBB8A', '--success-soft': '#1E2B1A', '--success-ink': '#8FBB8A',
  '--warning': '#E3B15E', '--warning-soft': '#33270F', '--warning-ink': '#E3B15E',
  '--danger': '#E8918E', '--danger-soft': '#36191D', '--danger-ink': '#E8918E',
  '--danger-fg': '#2A130D',
  '--info': '#9FB6C9', '--info-soft': '#1F2A33', '--info-ink': '#9FB6C9',
};
const FAMILIES_LIGHT: Record<string, [string, string, string]> = {
  peach: ['#FBE3D9', '#C25A43', '#7A2E1D'],
  mint: ['#E1EDD9', '#6FA06A', '#2E5230'],
  lavender: ['#EFE9F6', '#8A76C9', '#453578'],
  sky: ['#E3EBEF', '#6B8CA3', '#2E4A5C'],
  yellow: ['#F9EEDA', '#B7791F', '#7A5210'],
  rose: ['#F9E5E6', '#C96873', '#8E2F3D'],
  sand: ['#F1E9D8', '#A98D5F', '#5C4620'],
  grey: ['#EFEAE2', '#6E6154', '#33302A'],
  copper: ['#F7E2D9', '#C2452D', '#8A2B1D'],
};
const FAMILIES_DARK: Record<string, [string, string, string]> = {
  peach: ['#3A2016', '#E99070', '#F7CBB5'],
  mint: ['#1E2B1A', '#8FBB8A', '#CBE8C4'],
  lavender: ['#2A2136', '#B7A0DB', '#D9CDF0'],
  sky: ['#1F2A33', '#9FB6C9', '#CFE0EA'],
  yellow: ['#33270F', '#E3B15E', '#F4E2B8'],
  rose: ['#36191D', '#E8918E', '#F8CFD0'],
  sand: ['#2C2416', '#D6BC8A', '#EFE3C6'],
  grey: ['#262019', '#A79A87', '#D8CFC0'],
  copper: ['#3A211A', '#E07856', '#F2C4B0'],
};
// Phase 5 «plate-round» ladder — warmer/rounder than the old Notion-soft
// 6..28; 16 = the default card plate (Card consumes --r-lg).
const RADIUS: Record<string, string> = {
  '--r-xs': '10px', '--r-sm': '12px', '--r-md': '14px', '--r-lg': '16px',
  '--r-xl': '20px', '--r-2xl': '24px', '--r-3xl': '28px', '--r-full': '9999px',
};
const MOTION: Record<string, string> = {
  '--t-micro': '80ms', '--t-fast': '160ms', '--t-base': '240ms',
  '--t-slow': '380ms', '--t-slower': '520ms', '--t-cinema': '720ms',
  '--motion-duration-page': '320ms', '--motion-duration-reveal': '360ms',
  '--motion-duration-stat': '700ms', '--motion-duration-skeleton': '1200ms',
};
// Phase 5: light elevations are WARM-tinted (espresso rgba(64,46,28,*) —
// no cold grays); dark = fill-led + warm top-light inset.
const ELEV_LIGHT: Record<string, string> = {
  '--elev-1': '0 1px 2px rgba(64,46,28,0.05), 0 1px 1px rgba(64,46,28,0.04)',
  '--elev-2': '0 4px 8px rgba(64,46,28,0.07), 0 2px 4px rgba(64,46,28,0.05)',
  '--elev-3': '0 8px 16px rgba(64,46,28,0.09), 0 4px 8px rgba(64,46,28,0.06)',
  '--elev-4': '0 16px 32px rgba(64,46,28,0.11), 0 8px 16px rgba(64,46,28,0.07)',
  '--elev-5': '0 32px 64px rgba(64,46,28,0.13), 0 16px 32px rgba(64,46,28,0.09)',
};
const ELEV_DARK: Record<string, string> = {
  '--elev-1': '0 1px 2px rgba(8,5,3,0.30), inset 0 1px 0 rgba(255,244,230,0.04)',
  '--elev-2': '0 4px 8px rgba(8,5,3,0.35), inset 0 1px 0 rgba(255,244,230,0.05)',
  '--elev-3': '0 8px 16px rgba(8,5,3,0.40), inset 0 1px 0 rgba(255,244,230,0.06)',
  '--elev-4': '0 16px 32px rgba(8,5,3,0.45), inset 0 1px 0 rgba(255,244,230,0.07)',
  '--elev-5': '0 32px 64px rgba(8,5,3,0.50), inset 0 1px 0 rgba(255,244,230,0.08)',
};

// ── assertions ───────────────────────────────────────────────────────────────

describe('r125 Madarek parity — grounds, inks & neutrals', () => {
  it('dark (:root night) matches the canonical dark block', () => {
    for (const [token, value] of Object.entries(GROUNDS_DARK)) pin(dark, 'dark', token, value);
  });
  it('light (.light paper) matches the canonical light block', () => {
    for (const [token, value] of Object.entries(GROUNDS_LIGHT)) pin(light, 'light', token, value);
  });
});

describe('r125 Madarek parity — accent family', () => {
  it('dark: gold #E9B44C set (Madarek --accent)', () => {
    for (const [token, value] of Object.entries(ACCENT_DARK)) pin(dark, 'dark', token, value);
  });
  it('light: copper #B57438 set (Madarek --accent)', () => {
    for (const [token, value] of Object.entries(ACCENT_LIGHT)) pin(light, 'light', token, value);
  });
});

describe('r125 Madarek parity — status tokens', () => {
  it('dark: luminous bases, deep-space softs, ink==base', () => {
    for (const [token, value] of Object.entries(STATUS_DARK)) pin(dark, 'dark', token, value);
  });
  it('light: canonical 3-way split (base=family-ink · soft=pastel bg · ink=family-deep)', () => {
    for (const [token, value] of Object.entries(STATUS_LIGHT)) pin(light, 'light', token, value);
  });
});

describe('r125 Madarek parity — the nine pastel section families', () => {
  it.each(Object.keys(FAMILIES_DARK))('dark family %s bg/ink/deep', (family) => {
    const [bg, ink, deep] = FAMILIES_DARK[family];
    pin(dark, 'dark', `--c-${family}-bg`, bg);
    pin(dark, 'dark', `--c-${family}-ink`, ink);
    pin(dark, 'dark', `--c-${family}-deep`, deep);
  });
  it.each(Object.keys(FAMILIES_LIGHT))('light family %s bg/ink/deep', (family) => {
    const [bg, ink, deep] = FAMILIES_LIGHT[family];
    pin(light, 'light', `--c-${family}-bg`, bg);
    pin(light, 'light', `--c-${family}-ink`, ink);
    pin(light, 'light', `--c-${family}-deep`, deep);
  });
});

describe('r125 Madarek parity — radius ladder (theme-independent :root)', () => {
  it('6/8/10/12/16/20/28/9999 match tokens.css §3', () => {
    for (const [token, value] of Object.entries(RADIUS)) pin(dark, 'radius', token, value);
    for (const [token, value] of Object.entries(RADIUS)) pin(light, 'radius', token, value);
  });
});

describe('r125 Madarek parity — motion ladder (theme-independent :root)', () => {
  it('raw 80–720ms + semantic 320/360/700/1200 match tokens.css §4', () => {
    for (const [token, value] of Object.entries(MOTION)) pin(dark, 'motion', token, value);
    for (const [token, value] of Object.entries(MOTION)) pin(light, 'motion', token, value);
  });
});

describe('r125 Madarek parity — elevation ladder (§5)', () => {
  it('dark: fill-led + inset top-light', () => {
    for (const [token, value] of Object.entries(ELEV_DARK)) pin(dark, 'elev-dark', token, value);
  });
  it('light: soft two-layer', () => {
    for (const [token, value] of Object.entries(ELEV_LIGHT)) pin(light, 'elev-light', token, value);
  });
});

describe('r125 parity — glass ground (§1.8)', () => {
  it('light cream rgba(251,247,240,0.78) · dark warm night rgba(26,17,12,0.78)', () => {
    pin(light, 'glass', '--glass-bg', 'rgba(251, 247, 240, 0.78)');
    pin(dark, 'glass', '--glass-bg', 'rgba(26, 17, 12, 0.78)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// r126 EXTENSION (P4-W3b) — the P4-F1b adoption wave, now CI-pinned.
// The r125 sections above pin definitions; these pin the BRIDGES (what
// Tailwind utilities resolve to), the interaction contracts, the font
// manifest, the @media surfaces, and — via the consumption gates at the
// bottom — that pinned tokens actually have consumers.
// ═════════════════════════════════════════════════════════════════════════════

// ── r126: @theme inline bridges (the utility → token wiring) ────────────────

const THEME_MOTION_BRIDGE: Record<string, string> = {
  '--transition-duration-micro': 'var(--t-micro)',
  '--transition-duration-fast': 'var(--t-fast)',
  '--transition-duration-base': 'var(--t-base)',
  '--transition-duration-slow': 'var(--t-slow)',
  '--transition-duration-slower': 'var(--t-slower)',
  '--transition-duration-cinema': 'var(--t-cinema)',
};
const THEME_SHADOW_BRIDGE: Record<string, string> = {
  '--shadow-xs': 'var(--elev-1)',
  '--shadow-sm': 'var(--elev-1)',
  '--shadow-md': 'var(--elev-2)',
  '--shadow-lg': 'var(--elev-3)',
  '--shadow-xl': 'var(--elev-4)',
  '--shadow-2xl': 'var(--elev-5)',
  '--shadow-glass': 'var(--glass-shadow)',
  '--shadow-glass-lg': 'var(--glass-shadow-lg)',
};
// Phase 5 «plate-round»: 10/12/14/16/20/24/28 (16 = default card plate).
const THEME_RADIUS_BRIDGE: Record<string, string> = {
  '--radius-xs': '10px', '--radius-sm': '12px', '--radius-md': '14px',
  '--radius-lg': '16px', '--radius-xl': '20px', '--radius-2xl': '24px',
  '--radius-3xl': '28px',
};
// Phase 5: display/heading = Baloo Bhaijaan 2 (warm rounded culinary
// display, Arabic+Latin); body/-arabic stay Plex-led; mono unchanged.
const THEME_FONTS: Record<string, string> = {
  // r129 token-matrix fix: the canonical Madarek stacks verbatim
  // (tokens.css:47-50). --font-sans/-arabic are the full canonical chain
  // (system-ui + -apple-system + Segoe UI + Roboto tail; the never-registered
  // "Tajawal" ghost fallback was deleted r133 — it could never load);
  // --font-display is the canonical display stack, with --font-heading
  // as its bridge twin; --font-mono is the canonical mono stack (the
  // mixed-script Sans-Arabic mono fallback lives only in the landing
  // layer's --ln-mono, byte-equal to Madarek landing.css:54).
  //
  // r140 (A140-SM #2 — CLS الحي 0.077): طبقة «Plex Fallback» المدخلة بعد
  // العائلة في السلاسل الأربعة — وجه محلي بمقاييس Plex (fonts.css:
  // ascent-override 108.5% / descent-override 41.5% / line-gap 0) يمنع
  // انزياح الطية عند تبديل الأوزان 500/600 غير المسبقة (h1 الهيرو =
  // 600). انحراف مقصود وموثق عن الكنون الحرفي — مرشح لتبنّي أسطولي
  // (SL/SO/SB يحملون نفس الصنف)؛ المسمار يثبت الطبقة فلا تسقط بصمت.
  '--font-sans': '"IBM Plex Sans Arabic", "Plex Fallback", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--font-mono': '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
  '--font-arabic': '"IBM Plex Sans Arabic", "Plex Fallback", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--font-display': '"Baloo Bhaijaan 2", "IBM Plex Sans Arabic", "Plex Fallback", system-ui, sans-serif',
  '--font-heading': '"Baloo Bhaijaan 2", "IBM Plex Sans Arabic", "Plex Fallback", system-ui, sans-serif',
};

describe('r126 parity — @theme bridges (what Tailwind utilities resolve to)', () => {
  it('motion: duration-micro..cinema ride the --t-* ladder (audit B1 bridge)', () => {
    for (const [token, value] of Object.entries(THEME_MOTION_BRIDGE)) {
      pin(theme, 'theme', token, value);
    }
  });
  it('elevation: shadow-xs..2xl ride --elev-1..5, glass shadows ride the glass stack (audit H1 bridge)', () => {
    for (const [token, value] of Object.entries(THEME_SHADOW_BRIDGE)) {
      pin(theme, 'theme', token, value);
    }
  });
  it('radius: rounded-xs..3xl carry the Phase 5 plate-round 10..28 ladder', () => {
    for (const [token, value] of Object.entries(THEME_RADIUS_BRIDGE)) {
      pin(theme, 'theme', token, value);
    }
  });
  it('font stacks: Baloo Bhaijaan 2 display + IBM Plex Sans Arabic body (sans/arabic), Plex Mono for digits', () => {
    for (const [token, value] of Object.entries(THEME_FONTS)) {
      pin(theme, 'theme', token, value);
    }
  });
});

// ── r127: micro-typography tokens (r127-F4 — a11y root cause r121-I-5) ───────

const THEME_TYPE_SCALE: Record<string, string> = {
  // r127-F4: text-3xs/text-2xs replace the 101 hardcoded text-[9|10|11px] +
  // text-[0.625rem] micro-typography sites — rem-based, so they scale with
  // the user's font-size preferences where px utilities could not. The
  // --line-height companions follow the Tailwind v4 --text-*--line-height
  // convention (a 1.4 companion for 10/11px body-adjacent micro text).
  '--text-3xs': '0.625rem',
  '--text-3xs--line-height': '1.4',
  '--text-2xs': '0.6875rem',
  '--text-2xs--line-height': '1.4',
  '--text-xs': '0.75rem',
};

describe('r127 parity — @theme micro-typography tokens (text-2xs/text-3xs)', () => {
  it('type scale: 3xs 10px / 2xs 11px / xs 12px — rem-based + 1.4 line-height companions', () => {
    for (const [token, value] of Object.entries(THEME_TYPE_SCALE)) {
      pin(theme, 'theme', token, value);
    }
  });
});

// ── r126: focus-ring contract (audit D1/D5 — the ONE focus language) ────────

describe('r126 parity — focus-ring contract (§1.9, both themes)', () => {
  it('dark: --ring #E07856 (luminous terracotta) + --state-focus-ring-* 2px/2px + shorthand + input halo', () => {
    // Phase 5: the night ring rides the luminous terracotta — 6.03:1
    // non-text on the espresso ground.
    pin(dark, 'focus-dark', '--ring', '#E07856'); // --accent-solid night
    pin(dark, 'focus-dark', '--state-focus-ring-color', '#E07856'); // resolves var(--accent-solid)
    pin(dark, 'focus-dark', '--state-focus-ring-width', '2px');
    pin(dark, 'focus-dark', '--state-focus-ring-offset', '2px');
    pin(
      dark,
      'focus-dark',
      '--state-focus-ring',
      // pinned RESOLVED — proves the shorthand chain (width × color) resolves
      // to the live 2px × --accent-solid ring in the dark cascade
      '0 0 0 2px #E07856'
    );
    pin(
      dark,
      'focus-dark',
      '--state-input-focus-halo',
      // pinned RESOLVED — the halo chain lands on the live dark accent
      '0 0 0 3px color-mix(in srgb, #E07856 22%, transparent)'
    );
  });
  it('light: --ring #C2452D (terracotta, 4.70:1 non-text) + inherited width/offset (no dark-only drift)', () => {
    pin(light, 'focus-light', '--ring', '#C2452D');
    pin(light, 'focus-light', '--state-focus-ring-color', '#C2452D'); // light --accent-solid
    pin(light, 'focus-light', '--state-focus-ring-width', '2px'); // inherited from :root
    pin(light, 'focus-light', '--state-focus-ring-offset', '2px'); // inherited from :root
  });
});

// ── r126: z-order ladder (audit B4/J-1 — the float/modal layering) ──────────

const Z_LADDER: Record<string, string> = {
  '--z-base': '0',
  // r143 (Phase-4 W1 D7): درجة العناصر العائمة الثابتة — الجلسة الجديدة في
  // السلّم (كانت InstallPrompt تطفو بـ 9999 فوق كل شيء). تحت نطاق الحوارات
  // الخام z-40/50 عمدًا (قانون J-1: العناصر العائمة لا تغطي النوافذ أبدًا) —
  // لذلك ليست --z-toast (500) فوقها. FloatingWhatsApp/InstallPrompt تركبها
  // الآن؛ ScrollToTop يبقى z-31 الخام في نفس النطاق (عقد r121 المثبّت).
  '--z-float': '30',
  '--z-dropdown': '100',
  '--z-popover': '200',
  '--z-tooltip': '250',
  '--z-sheet': '300',
  '--z-modal': '400',
  '--z-toast': '500',
  '--z-lightbox': '600',
};

describe('r126 parity — z-order ladder (§1.11, theme-independent :root)', () => {
  it('9 rungs 0/30/100/200/250/300/400/500/600 in both cascades (floats never cover modals)', () => {
    for (const [token, value] of Object.entries(Z_LADDER)) pin(dark, 'z-ladder', token, value);
    for (const [token, value] of Object.entries(Z_LADDER)) pin(light, 'z-ladder', token, value);
  });
});

// ── r126: ambient bands + stagger + RTL motion direction (audit B4) ─────────

describe('r126 parity — ambient loops, stagger & RTL motion (§4.3)', () => {
  it('ambient ladder 1.6/2.4/3.6/6/9/22s — decorative loops ONLY', () => {
    pin(dark, 'ambient', '--motion-duration-ambient-pulse', '1.6s');
    pin(dark, 'ambient', '--motion-duration-ambient', '2.4s');
    pin(dark, 'ambient', '--motion-duration-ambient-slow', '3.6s');
    pin(dark, 'ambient', '--motion-duration-ambient-drift', '6s');
    pin(dark, 'ambient', '--motion-duration-ambient-cinema', '9s');
    pin(dark, 'ambient', '--motion-duration-ambient-scene', '22s');
  });
  it('stagger step 60ms + cap 6 + RTL-first motion direction −1', () => {
    pin(dark, 'stagger', '--motion-stagger-step', '60ms');
    pin(dark, 'stagger', '--motion-stagger-cap', '6');
    pin(dark, 'stagger', '--motion-direction', '-1'); // app is RTL-first
  });
  it('semantic motion twins micro/short/medium/long ride the same ladder', () => {
    pin(dark, 'motion', '--motion-duration-micro', '80ms');
    pin(dark, 'motion', '--motion-duration-short', '160ms');
    pin(dark, 'motion', '--motion-duration-medium', '240ms');
    pin(dark, 'motion', '--motion-duration-long', '380ms');
  });
});

// ── r126: the 10-face IBM Plex manifest (fonts.css + on-disk woff2) ─────────
// r132 (A3 §1.3): 12 → 10 — the never-consumed fallback families were purged
// (Plex Serif italic ×2 here; Cairo/Readex/Naskh never rode this manifest).

const FONT_MANIFEST: ReadonlyArray<readonly [file: string, family: string, weight: string, style: string]> = [
  ['plex-sans-arabic-400-normal-arabic.woff2', 'IBM Plex Sans Arabic', '400', 'normal'],
  ['plex-sans-arabic-500-normal-arabic.woff2', 'IBM Plex Sans Arabic', '500', 'normal'],
  ['plex-sans-arabic-600-normal-arabic.woff2', 'IBM Plex Sans Arabic', '600', 'normal'],
  ['plex-sans-arabic-700-normal-arabic.woff2', 'IBM Plex Sans Arabic', '700', 'normal'],
  ['plex-sans-arabic-400-normal-latin.woff2', 'IBM Plex Sans Arabic', '400', 'normal'],
  ['plex-sans-arabic-500-normal-latin.woff2', 'IBM Plex Sans Arabic', '500', 'normal'],
  ['plex-sans-arabic-600-normal-latin.woff2', 'IBM Plex Sans Arabic', '600', 'normal'],
  ['plex-sans-arabic-700-normal-latin.woff2', 'IBM Plex Sans Arabic', '700', 'normal'],
  ['plex-mono-400-normal-latin.woff2', 'IBM Plex Mono', '400', 'normal'],
  ['plex-mono-500-normal-latin.woff2', 'IBM Plex Mono', '500', 'normal'],
];

describe('r126 parity — the 10-face IBM Plex manifest (public/fonts/fonts.css)', () => {
  it('declares exactly 10 Plex faces (r132: serif/naskh/cairo/readex fallbacks purged)', () => {
    const plexFaces = fontFaces.filter((b) => /url\(['"]\/fonts\/plex-/.test(b));
    expect(
      plexFaces.length,
      'the IBM Plex manifest must declare exactly 10 faces'
    ).toBe(10);
  });
  it('Phase 5 (r152): the 4-face Baloo Bhaijaan 2 display manifest (600/700 × arabic+latin, 2 variable files)', () => {
    const balooFaces = fontFaces.filter((b) => /url\(['"]\/fonts\/baloo-/.test(b));
    expect(
      balooFaces.length,
      'the Baloo Bhaijaan 2 manifest must declare exactly 4 faces'
    ).toBe(4);
    for (const file of ['baloo-bhaijaan-2-arabic.woff2', 'baloo-bhaijaan-2-latin.woff2']) {
      expect(
        existsSync(`public/fonts/${file}`),
        `public/fonts/${file} must exist on disk`
      ).toBe(true);
    }
    for (const weight of ['600', '700']) {
      for (const subset of ['arabic', 'latin']) {
        const block = fontFaces.find(
          (b) => b.includes(`url('/fonts/baloo-bhaijaan-2-${subset}.woff2')`) && b.includes(`font-weight: ${weight}`)
        );
        expect(block, `Baloo ${weight} ${subset} @font-face is missing`).toBeDefined();
        expect(block).toContain(`font-family: 'Baloo Bhaijaan 2'`);
        expect(block).toContain('font-display: swap');
        expect(block).toMatch(/unicode-range:\s*U\+/);
      }
    }
    // the @theme display/heading bridges ride Baloo FIRST (consumption gate)
    expect(theme['--font-display']).toContain('"Baloo Bhaijaan 2"');
    expect(theme['--font-heading']).toContain('"Baloo Bhaijaan 2"');
    // the body stays Plex-led (the culinary voice is display-only)
    expect(theme['--font-sans']).toContain('"IBM Plex Sans Arabic"');
    expect(theme['--font-sans']).not.toContain('Baloo');
  });
  it.each(FONT_MANIFEST)(
    '%s: family/weight/style + swap + unicode-range + woff2 on disk',
    (file, family, weight, style) => {
      const block = fontFaces.find((b) => b.includes(`url('/fonts/${file}')`));
      expect(block, `@font-face for /fonts/${file} is missing from fonts.css`).toBeDefined();
      expect(block, `${file} must declare family '${family}'`).toContain(
        `font-family: '${family}'`
      );
      expect(block, `${file} must declare weight ${weight}`).toContain(
        `font-weight: ${weight}`
      );
      expect(block, `${file} must declare style ${style}`).toContain(
        `font-style: ${style}`
      );
      expect(
        block,
        `${file} must keep font-display: swap (no FOUT blocking)`
      ).toContain('font-display: swap');
      expect(
        block,
        `${file} must carry a unicode-range (subset faces, not full-font downloads)`
      ).toMatch(/unicode-range:\s*U\+/);
      expect(
        existsSync(`public/fonts/${file}`),
        `public/fonts/${file} must exist on disk (the manifest points at it)`
      ).toBe(true);
    }
  );
});

// ── r126: prefers-contrast port (15 tokens × 2 themes) ──────────────────────

// Phase 5: :root carries the LIGHT port (warm espresso solid rings);
// html.dark carries the night port (luminous cream solid rings).
const CONTRAST_LIGHT: Record<string, string> = {
  '--elev-1': '0 0 0 1px rgba(36,24,17,0.42)',
  '--elev-2': '0 0 0 1.5px rgba(36,24,17,0.50)',
  '--elev-3': '0 0 0 2px rgba(36,24,17,0.58)',
  '--elev-4': '0 0 0 2.5px rgba(36,24,17,0.66)',
  '--elev-5': '0 0 0 3px rgba(36,24,17,0.74)',
  '--glass-bg': 'var(--surface)',
  '--glass-bg-strong': 'var(--surface)',
  '--glass-border': 'rgba(36,24,17,0.42)',
  '--glass-border-strong': 'rgba(36,24,17,0.70)',
  '--surface-border': 'rgba(36,24,17,0.42)',
  '--surface-divider': 'rgba(36,24,17,0.28)',
  '--border': 'rgba(36,24,17,0.52)',
  '--border-strong': 'rgba(36,24,17,0.70)',
  '--input': 'rgba(36,24,17,0.52)',
  '--rule': 'rgba(36,24,17,0.52)',
};
const CONTRAST_DARK: Record<string, string> = {
  '--elev-1': '0 0 0 1px rgba(247,239,226,0.36)',
  '--elev-2': '0 0 0 1.5px rgba(247,239,226,0.44)',
  '--elev-3': '0 0 0 2px rgba(247,239,226,0.52)',
  '--elev-4': '0 0 0 2.5px rgba(247,239,226,0.60)',
  '--elev-5': '0 0 0 3px rgba(247,239,226,0.68)',
  '--glass-bg': 'var(--surface)', // glass goes SOLID under increased contrast
  '--glass-bg-strong': 'var(--surface)',
  '--glass-border': 'rgba(247,239,226,0.36)',
  '--glass-border-strong': 'rgba(247,239,226,0.64)',
  '--surface-border': 'rgba(247,239,226,0.36)',
  '--surface-divider': 'rgba(247,239,226,0.24)',
  '--border': 'rgba(247,239,226,0.48)',
  '--border-strong': 'rgba(247,239,226,0.64)',
  '--input': 'rgba(247,239,226,0.48)',
  '--rule': 'rgba(247,239,226,0.48)',
};

describe('r126 parity — prefers-contrast: more port (WCAG 1.4.11)', () => {
  it('light (:root): elevations collapse to warm espresso solid rings, glass goes solid, hairlines strengthen', () => {
    const contrastMedia = topLevelBlock(css, '@media (prefers-contrast: more)');
    const scope = parseDecls(topLevelBlock(contrastMedia, ':root'));
    for (const [token, value] of Object.entries(CONTRAST_LIGHT)) {
      pin(scope, 'contrast-light', token, value);
    }
  });
  it('dark (html.dark): the same port with luminous cream solid rings', () => {
    const contrastMedia = topLevelBlock(css, '@media (prefers-contrast: more)');
    const scope = parseDecls(topLevelBlock(contrastMedia, 'html.dark'));
    for (const [token, value] of Object.entries(CONTRAST_DARK)) {
      pin(scope, 'contrast-dark', token, value);
    }
  });
});

// ── r126: prefers-reduced-motion token zeroing (§4.6 layer 1) ───────────────

describe('r126 parity — prefers-reduced-motion: reduce zeroing (§4.6)', () => {
  it('the motion ladder + ambient bands die; page/reveal keep the 80ms cross-fade affordance', () => {
    const rmMedia = topLevelBlock(css, '@media (prefers-reduced-motion: reduce)');
    const rm = parseDecls(topLevelBlock(rmMedia, ':root'));
    pin(rm, 'rm', '--t-micro', '0ms');
    pin(rm, 'rm', '--t-fast', '0ms');
    pin(rm, 'rm', '--t-base', '0ms');
    pin(rm, 'rm', '--t-slow', '0ms');
    pin(rm, 'rm', '--t-slower', '0ms');
    pin(rm, 'rm', '--t-cinema', '0ms');
    pin(rm, 'rm', '--motion-duration-micro', '0ms');
    pin(rm, 'rm', '--motion-duration-short', '0ms');
    pin(rm, 'rm', '--motion-duration-medium', '0ms');
    pin(rm, 'rm', '--motion-duration-long', '0ms');
    pin(rm, 'rm', '--motion-duration-stat', '0ms');
    pin(rm, 'rm', '--motion-duration-skeleton', '0ms');
    pin(rm, 'rm', '--motion-duration-page', '80ms'); // affordance survives
    pin(rm, 'rm', '--motion-duration-reveal', '80ms'); // affordance survives
    pin(rm, 'rm', '--motion-duration-ambient-pulse', '0ms');
    pin(rm, 'rm', '--motion-duration-ambient', '0ms');
    pin(rm, 'rm', '--motion-duration-ambient-slow', '0ms');
    pin(rm, 'rm', '--motion-duration-ambient-drift', '0ms');
    pin(rm, 'rm', '--motion-duration-ambient-cinema', '0ms');
    pin(rm, 'rm', '--motion-duration-ambient-scene', '0ms');
  });
});

// ── r126: CONSUMPTION gates — definitions without adoption were the P4-A1 debt ──
// (smart-order's r126 pattern: a pinned token with zero consumers is a dead
// definition. The r125 harness passed 29/29 while the audit found the motion
// ladder consumed by nothing — these gates make that class of drift loud.)

const raw = (path: string) => readFileSync(path, 'utf8');
const globalsRaw = raw('src/app/globals.css'); // NOT comment-stripped — real rules
const inputRaw = raw('src/components/ui/input.tsx');
const buttonRaw = raw('src/components/ui/button.tsx');
const selectRaw = raw('src/components/ui/select.tsx');
const galleryRaw = raw('src/components/menu/GalleryCarousel.tsx');
const publicLayoutRaw = raw('src/app/(public)/layout.tsx');
const protectedLayoutRaw = raw('src/app/(protected)/layout.tsx');

const CONSUMPTION_GATES: ReadonlyArray<readonly [name: string, ok: () => boolean]> = [
  [
    'globals.css :focus-visible consumes the --state-focus-ring-* contract (the ONE focus language, audit D1/D5)',
    () =>
      /outline: var\(--state-focus-ring-width, 2px\) solid var\(--state-focus-ring-color, var\(--ring\)\)/.test(
        globalsRaw
      ) && globalsRaw.includes('outline-offset: var(--state-focus-ring-offset, 2px)'),
  ],
  [
    'the Input primitive consumes --state-input-focus-halo (focus-visible:shadow-[var(--state-input-focus-halo)])',
    () => inputRaw.includes('focus-visible:shadow-[var(--state-input-focus-halo)]'),
  ],
  [
    /* r131-F4 ruling: the Toaster config moved from both group layouts into
       the ONE themed shell ui/app-toaster.tsx (bottom-end, no richColors) —
       the z-pin now lives there; the layouts render <AppToaster />. */
    'the sonner Toaster rides the --z-toast rung (ui/app-toaster.tsx, rendered by BOTH layouts)',
    () =>
      raw('src/components/ui/app-toaster.tsx').includes('zIndex: "var(--z-toast, 500)"') &&
      publicLayoutRaw.includes('<AppToaster />') &&
      protectedLayoutRaw.includes('<AppToaster />'),
  ],
  [
    'both keyboard skip-links ride focus:z-(--z-toast) — the P0 white-on-gold sites now also layer-correct',
    () =>
      publicLayoutRaw.includes('focus:z-(--z-toast)') &&
      protectedLayoutRaw.includes('focus:z-(--z-toast)'),
  ],
  [
    'the gallery lightbox rides z-(--z-lightbox) (600 — above toasts, the top rung)',
    () => galleryRaw.includes('z-(--z-lightbox)'),
  ],
  [
    'the Button primitive consumes the motion ladder + premium elevation (r130: duration-[var(--t-fast)] + before:duration-[var(--motion-duration-stat)] + the --shadow-card-premium pair)',
    () =>
      buttonRaw.includes('duration-[var(--t-fast,160ms)]') &&
      buttonRaw.includes('before:duration-[var(--motion-duration-stat,700ms)]') &&
      buttonRaw.includes('shadow-[var(--shadow-card-premium)]') &&
      buttonRaw.includes('hover:shadow-[var(--shadow-card-premium-h)]'),
  ],
  [
    'the .stagger-1..4 utilities consume --motion-stagger-step (60ms × n)',
    () =>
      globalsRaw.includes('calc(var(--motion-stagger-step, 60ms) * 1)') &&
      globalsRaw.includes('calc(var(--motion-stagger-step, 60ms) * 4)'),
  ],
  [
    'the ambient animate-* classes consume the --motion-duration-ambient-* bands (2.4s base loop)',
    () => globalsRaw.includes('float var(--motion-duration-ambient, 2.4s)'),
  ],
  [
    'the Select dropdown consumes the elevation bridge (shadow-md → var(--elev-2) via @theme)',
    () => selectRaw.includes('shadow-md'),
  ],
];

describe('r152 parity — the Phase 5 signature: the menu dot-leader motif', () => {
  it('definition: --menu-leader ink + .menu-leader/.menu-leader-rule utilities live in globals.css', () => {
    pin(light, 'r152', '--menu-leader', '#CBB08C');
    pin(dark, 'r152', '--menu-leader', '#57402D');
    expect(globalsRaw).toMatch(/\.menu-leader\s*\{[\s\S]*?display:\s*flex/);
    expect(globalsRaw).toMatch(/\.menu-leader-rule\s*\{[\s\S]*?border-block-end:\s*2px dotted var\(--menu-leader\)/);
  });
  it('consumption: the dotted price leader rides ≥4 real menu surfaces (item card · order dialog · cart · slide-over)', () => {
    const surfaces = [
      'src/components/menu/MenuItemCard.tsx',
      'src/components/menu/order-dialog/quantity-card.tsx',
      'src/app/(protected)/cart/CartLineItem.tsx',
      'src/components/menu/CartSlideOver.tsx',
      'src/app/(public)/menu/[slug]/print/page.tsx',
    ].filter((f) => /menu-leader-rule|\.ldr/.test(raw(f)));
    expect(surfaces.length, 'the dot-leader motif must stay on the menu surfaces').toBeGreaterThanOrEqual(4);
    // the print sheet draws its own .ldr twin (no globals import on that path)
    const printRaw = raw('src/app/(public)/menu/[slug]/print/page.tsx');
    expect(printRaw).toMatch(/\.item \.ldr\s*\{[\s\S]*?2px dotted var\(--print-muted\)/);
    expect(printRaw).toContain('<i className="ldr" aria-hidden="true" />');
  });
  it('warm food-imagery grade: .warm-scrim* espresso utilities + the cold from-black scrims are retired', () => {
    // definition: three tiers of the espresso scrim live in globals.css
    for (const cls of ['warm-scrim', 'warm-scrim-strong', 'warm-scrim-faint']) {
      expect(
        globalsRaw,
        `.${cls} must be defined in globals.css`
      ).toMatch(new RegExp(`\\.${cls}\\s*\\{[\\s\\S]*?rgb\\(26 17 12`));
    }
    // consumption: the food-imagery surfaces ride the warm grade
    expect(raw('src/components/menu/MenuItemCard.tsx')).toContain('warm-scrim');
    expect(raw('src/components/menu/OrderDialog.tsx')).toContain('warm-scrim-strong');
    expect(raw('src/components/menu/GalleryCarousel.tsx')).toContain('warm-scrim-faint');
    // and the cold black scrims are gone from those three files
    expect(raw('src/components/menu/MenuItemCard.tsx')).not.toMatch(/from-black\/(40|50|60|70)/);
    expect(raw('src/components/menu/OrderDialog.tsx')).not.toMatch(/from-black\/(40|50|60|70)/);
    expect(raw('src/components/menu/GalleryCarousel.tsx')).not.toMatch(/from-black\/(40|50|60|70)/);
  });
  it('plate-round: the Card plate consumes --r-lg (16px default) — Card + .card-premium', () => {
    expect(globalsRaw).toMatch(/\.card-premium\s*\{[\s\S]*?border-radius:\s*var\(--r-lg, 16px\)/);
    const cardRaw = raw('src/components/ui/card.tsx');
    expect(cardRaw).toMatch(/overflow-hidden rounded-lg/);
    expect(cardRaw).not.toMatch(/overflow-hidden rounded-xl/);
    // consumption twin: the plate image crops follow the same rung
    // (rounded-t-lg/b-lg on the first/last img children).
    const noCc = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    const cardCc = noCc(cardRaw);
    expect(cardCc).toMatch(/rounded-t-lg/);
    expect(cardCc).toMatch(/rounded-b-lg/);
    expect(cardCc).not.toMatch(/rounded-[tx]-xl/);
  });
  it('theme default is LIGHT: :root declares color-scheme: light; .dark overrides with dark', () => {
    // parseDecls only reads --custom-props, so color-scheme is asserted on
    // the brace-matched blocks directly.
    const rootBlock = topLevelBlock(css, ':root');
    expect(rootBlock).toMatch(/color-scheme:\s*light/);
    const darkBlock = topLevelBlock(css, '.dark');
    expect(darkBlock).toMatch(/color-scheme:\s*dark/);
    // and the resolved grounds prove the flip: :root = cream, .dark = night.
    expect(resolve(light, light['--background'])).toBe('#FBF7F0');
    expect(resolve(dark, dark['--background'])).toBe('#1D1410');
  });
});

describe('r126 consumption gates — pinned tokens must have ≥1 real consumer', () => {
  it.each(CONSUMPTION_GATES)('%s', (_name, ok) => {
    expect(ok(), 'consumption gate FAILED — the pinned token(s) have zero consumers').toBe(
      true
    );
  });
});

// ── r127-F4 consumption floor: the px→token sweep must stay landed ──────────
// A mass revert to text-[10px]/[11px] would silently reopen the px-doesn't-
// scale a11y hole (r121-I-5). 4 sites remain deferred in the a11y-agent's
// files (owner/page.tsx ×3, OwnerCharts.tsx ×1 — merge-swept later), so the
// floor sits just below the 48/48 consumers this sweep landed.

function walkSrc(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = `${dir}/${entry}`;
    if (statSync(p).isDirectory()) out.push(...walkSrc(p));
    else if (/\.(tsx|ts)$/.test(entry)) out.push(p);
  }
  return out;
}
const srcTextR127 = walkSrc('src').map(raw).join('\n');

describe('r127 consumption gates — micro-typography tokens are actually consumed', () => {
  it('text-2xs ≥40 TSX consumers across src/ (48 at r127-F4, 93 at r135)', () => {
    expect((srcTextR127.match(/\btext-2xs\b/g) ?? []).length).toBeGreaterThanOrEqual(40);
  });
  /* r135 (مدارك §طباعة): الحد الأدنى للنص المقروء هو 11px (text-2xs) —
     text-3xs (10px) أصبح تحت الأرضية، فهاجرت الجولة 135 ستة مواقع
     «شارات/رقائق» في مكونات المنيو الزبونية (MenuItemCard/OrderDialog/
     CartSlideOver/CategoryTabs) من text-3xs إلى text-2xs (48→34 مستهلكًا).
     البوابة تتحول من أرضية (≥40) إلى سقف (≤34): النقصان مسموح ومستمر،
     والزيادة انتكاس للقرار — أي استحداث نص 10px في المستقبل يجب أن يفشل
     هنا ويُراجَع. */
  it('text-3xs ≤34 TSX consumers across src/ (r135 11px-floor migration: 48→34; ceiling, not floor)', () => {
    expect((srcTextR127.match(/\btext-3xs\b/g) ?? []).length).toBeLessThanOrEqual(34);
  });
});

// ── r142 «المائدة» landing layer pins (task 2-b — the radical redesign) ──────
// The owner rejected the r141 attempt (cinematic plate over the SAME
// Orbit-Ink dark template) as incremental; r142 replaces the landing
// world entirely: «المائدة» — a warm light culinary identity (cream
// paper + ember + deep espresso) where the page READS as a printed menu
// being flipped. These pins lock the NEW design contract so a future
// edit can't silently drift it: the --sm-* token block verbatim, the
// marquee seam math (kept from the r128 kit — the math was right), the
// --sp scrub consumers, the scroll-spy selectors (r142 FIX: the r128
// port pinned the MANGLED `.landing-nav-linkref=` form that browsers
// drop — the redesign ships and pins the working `[href=]` form), the
// paper grain, the RM off-switches, and the SCOPE ISOLATION: no --sm-*
// token may ever leak into a product surface, and landing.css may be
// imported by the landing page alone.

const landingCssRaw = readFileSync('src/app/landing.css', 'utf8');
const landingCss = landingCssRaw.replace(/\/\*[\s\S]*?\*\//g, ' ');

// merge ALL top-level `.landing` blocks in cascade order
const landingBlocks = allTopLevelBlocks(landingCss, '.landing');
const landingDecls: Record<string, string> = {};
for (const block of landingBlocks) Object.assign(landingDecls, parseDecls(block));
const landingTokenBlock = landingBlocks.find((b) => b.includes('--sm-paper'));

/** plain (non-custom) declaration lookup inside one rule block */
function decl(block: string | undefined, prop: string): string | undefined {
  if (!block) return undefined;
  const m = block.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`));
  return m?.[1].trim();
}
const landingRule = (selector: string) =>
  allTopLevelBlocks(landingCss, selector)[0];

describe('r142 parity — المائدة token block (the --sm-* identity, verbatim)', () => {
  it.each(
    [
      ['--sm-paper', '#F7F1E3'],
      ['--sm-paper-2', '#EFE5D0'],
      ['--sm-card', '#FFFDF7'],
      ['--sm-ink', '#2B2014'],
      ['--sm-ink-dim', '#67523B'],
      // Phase 5 (r152): the ember roster = the product terracotta family.
      ['--sm-ember', '#C2452D'],
      ['--sm-ember-ink', '#A93A26'],
      ['--sm-ember-deep', '#8A2B1D'],
      ['--sm-ember-bright', '#E89070'],
      ['--sm-ember-soft', 'rgb(194 69 45 / 0.12)'],
      ['--sm-line', 'rgb(43 32 20 / 0.16)'],
      ['--sm-line-soft', 'rgb(43 32 20 / 0.08)'],
      ['--sm-line-strong', 'rgb(43 32 20 / 0.30)'],
      ['--sm-grain-op', '0.05'],
      ['--sm-radius-pill', 'var(--r-full)'],
      ['--sm-h1', 'clamp(2.6rem, 6.6vw, 5.4rem)'],
      ['--sm-h1-lh', '1.14'],
      ['--sm-t-fast', 'var(--t-fast)'],
      ['--sm-t-base', 'var(--t-base)'],
      ['--sm-t-slow', 'var(--t-slow)'],
      ['--sm-t-cinema', 'var(--t-cinema)'],
      ['--sm-t-reveal', 'var(--motion-duration-reveal)'],
      ['--sm-ease', 'var(--ease)'],
      ['--sm-ease-out', 'var(--ease-out)'],
      ['--sm-ease-soft', 'var(--ease-soft)'],
      ['--sm-ease-spring', 'var(--ease-spring)'],
      ['--sm-ease-linear', 'var(--ease-linear)'],
      ['--sm-dur-marquee', '42s'],
    ] as const
  )('landing.css %s', (token, expected) => {
    expect(landingDecls[token], `landing.css ${token} drifted from the المائدة contract`).toBe(
      expected
    );
  });

  it('.landing base paints المائدة in both themes (background var(--sm-paper) / color var(--sm-ink))', () => {
    expect(decl(landingTokenBlock, 'background')).toBe('var(--sm-paper)');
    expect(decl(landingTokenBlock, 'color')).toBe('var(--sm-ink)');
  });

  it('.ln-hero-title rides the --sm-h1 clamp + --sm-h1-lh line-height', () => {
    const hero = landingRule('.landing .ln-hero-title');
    expect(decl(hero, 'font-size')).toBe('var(--sm-h1)');
    expect(decl(hero, 'line-height')).toBe('var(--sm-h1-lh)');
  });
});

describe('r142 parity — the marquee kit (kept seam contract from the r128 kit)', () => {
  it('@keyframes ln-marquee: translateX(0) → translateX(calc(50% + 24px))', () => {
    expect(landingCss).toMatch(
      /@keyframes ln-marquee\s*{[^}]*from\s*\{[^}]*translateX\(0\)[^}]*}\s*to\s*\{[^}]*translateX\(calc\(50% \+ 24px\)\)/
    );
  });

  it('seam lockstep: track gap 48px + keyframe correction +24px (24 = HALF of 48)', () => {
    const track = landingRule('.landing .ln-marquee-track');
    expect(decl(track, 'gap')).toBe('48px');
    expect(landingCss).toContain('translateX(calc(50% + 24px))');
  });

  it('track animation rides the token pair (ln-marquee var(--sm-dur-marquee) var(--sm-ease-linear) infinite)', () => {
    expect(decl(landingRule('.landing .ln-marquee-track'), 'animation')).toBe(
      'ln-marquee var(--sm-dur-marquee) var(--sm-ease-linear) infinite'
    );
  });

  it('marquee band is flat: hairline border-block var(--sm-line) on ground var(--sm-paper-2), no gradient', () => {
    const band = landingRule('.landing .ln-marquee');
    expect(decl(band, 'border-block')).toBe('1px solid var(--sm-line)');
    expect(decl(band, 'background')).toBe('var(--sm-paper-2)');
    expect(landingCss.slice(landingCss.indexOf('.landing .ln-marquee {'))).not.toMatch(
      /\.landing \.ln-marquee\s*{[^}]*gradient/
    );
  });

  it('prefers-reduced-motion kills the marquee (animation: none off-switch)', () => {
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    expect(
      prmBlocks.some(
        (b) => b.includes('.landing .ln-marquee-track') && /animation:\s*none/.test(b)
      )
    ).toBe(true);
  });
});

describe('r142 parity — the --sp scrub + scroll-spy (the r142 working-selector fix)', () => {
  it('.ln-journey-thread-ink scrubs stroke-dashoffset: calc(1 - var(--sp, 0.65))', () => {
    expect(decl(landingRule('.landing .ln-journey-thread-ink'), 'stroke-dashoffset')).toBe(
      'calc(1 - var(--sp, 0.65))'
    );
  });

  it('--sp consumption scale: ≥80 var(--sp) readers in the landing layer (105 at r142)', () => {
    expect((landingCss.match(/var\(--sp/g) ?? []).length).toBeGreaterThanOrEqual(80);
  });

  it.each(['menu', 'journey', 'ambience', 'owner'])(
    'scroll-spy: header[data-active-section="%s"] highlights .landing-nav-link[href="#%s"] — the WORKING selector form (r142 fixes the r128 mangled pin)',
    (id) => {
      // the r128 port pinned the Madarek source's MANGLED selectors
      // (`.landing-nav-linkref=`) — browsers dropped them wholesale, so the
      // highlight never rendered. The redesign ships the working form and
      // this pin locks it; regression to the mangled form must fail here.
      expect(landingCss).toContain(
        `.landing header[data-active-section="${id}"] .landing-nav-link[href="#${id}"]`
      );
      expect(landingCss).not.toContain('.landing-nav-linkref=');
    }
  );
});

describe('r142 parity — paper grain + scope isolation', () => {
  it('.ln-grain veil: fixed, z-index 2000, opacity var(--sm-grain-op), 200px stitchable tile', () => {
    const grain = landingRule('.landing .ln-grain');
    expect(decl(grain, 'position')).toBe('fixed');
    expect(decl(grain, 'z-index')).toBe('2000');
    expect(decl(grain, 'opacity')).toBe('var(--sm-grain-op)');
    expect(grain).toContain('background-size: 200px 200px');
  });

  it('the grain tile paints DARK espresso specks (paper tooth), never the old white-on-ink noise', () => {
    const grain = landingRule('.landing .ln-grain');
    expect(grain).toContain("0 0 0 0 0.17");
  });

  it('ONE texture veil inside .landing — legacy .grain-overlay suppressed', () => {
    expect(
      /\.landing \.grain-overlay \{\s*display:\s*none;?\s*\}/.test(landingCss)
    ).toBe(true);
  });

  it('scope isolation: globals.css (the product token file) declares ZERO --sm-* tokens', () => {
    expect(css.includes('--sm-'), 'a --sm-* token leaked into the product layer').toBe(
      false
    );
  });

  it('scope isolation: landing.css is imported ONLY by the landing page root', () => {
    const importers = walkSrc('src').filter((p) =>
      /import\s+['"][^'"]*landing\.css['"]/.test(raw(p))
    );
    expect(importers).toEqual(['src/components/landing/HomePage.tsx']);
  });
});

// ── r129: canonical differential pins (audit r129-A5 smartmenu-differential
// §7 proposals 1-20 + OrbitScene port pins + token-matrix SM rows) ──────────
// Sources: madarek/frontend @ cf7ffca (landing.css 2089 ln, tokens.css 1101,
// OrbitScene.tsx 635 ln, CollegeConstellation.tsx) — every pinned literal
// below was read from the canonical file at the cited lines.

const homePageRaw = raw('src/components/landing/HomePage.tsx');
const menuShowcaseRaw = raw('src/components/landing/MenuShowcaseSection.tsx');
const journeyRaw = raw('src/components/landing/JourneySection.tsx');
const rolesRaw = raw('src/components/landing/RolesSection.tsx');
const heroTableRaw = raw('src/components/landing/HeroTable.tsx');
const finaleRaw = raw('src/components/landing/FinaleCta.tsx');
const shareAfterOrderRaw = raw('src/components/loyalty/ShareAfterOrder.tsx');
const ownerLoyaltyRaw = raw('src/app/(protected)/owner/loyalty/page.tsx');

/** extract a full rule block for a selector from a (comment-stripped) sheet */
function ruleBlock(source: string, selector: string): string | undefined {
  const idx = source.indexOf(selector);
  if (idx === -1) return undefined;
  const open = source.indexOf('{', idx);
  if (open === -1) return undefined;
  let depth = 1;
  let j = open + 1;
  while (j < source.length && depth > 0) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}') depth -= 1;
    j += 1;
  }
  return source.slice(open + 1, j - 1);
}


/** LAST rule block for a selector (R6 cascade — later overlays win) */
function lastRule(selector: string): string | undefined {
  const blocks = allTopLevelBlocks(landingCss, selector);
  return blocks[blocks.length - 1];
}
/** declaration lookup with collapsed whitespace (multi-line values) */
function declN(block: string | undefined, prop: string): string | undefined {
  const v = decl(block, prop);
  return v === undefined ? undefined : norm(v);
}

describe('r129 parity — P0: ONE main landmark + WhatsApp brand stragglers', () => {
  it('HomePage declares NO <main> — the (public) layout owns the single main#main-content', () => {
    // the r128 port nested a second <main id="main-content"> inside the
    // layout's — invalid HTML + axe landmark-no-duplicate-main (audit P0-1)
    const homePageCode = homePageRaw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(homePageCode, 'HomePage must not re-declare a <main> element').not.toMatch(
      /<main[\s>]/
    );
    expect(homePageRaw, 'HomePage must not re-declare id="main-content"').not.toContain(
      'id="main-content"'
    );
    // the layout's main is the ONE landmark (exactly one declaration).
    // r133 (A11 S2): it carries tabIndex={-1} — Safari/Firefox leave keyboard
    // focus on the skip link after activation without it.
    expect((publicLayoutRaw.match(/<main id="main-content"/g) ?? []).length).toBe(1);
    expect(publicLayoutRaw).toContain('<main id="main-content" tabIndex={-1}');
  });

  it('WhatsApp/Instagram share texts brand «الربط الذكي» — the retired «المنيو الذكي» is absent from BOTH share components', () => {
    // audit P0-2: ShareAfterOrder.tsx:130/:142 + owner/loyalty/page.tsx:568
    expect(shareAfterOrderRaw).not.toContain('المنيو الذكي');
    expect(ownerLoyaltyRaw).not.toContain('المنيو الذكي');
    expect(shareAfterOrderRaw).toContain('ادعوك لتجربة الطلب عبر الربط الذكي');
    expect(ownerLoyaltyRaw).toContain('ادعوك لتجربة الربط الذكي');
  });

  it('brand negative: zero NON-COMMENT occurrences of «المنيو الذكي» across src/ (historic provenance comments excluded)', () => {
    // guards the r127 brand unification — diner-facing copy must never send
    // the retired brand; r129-audit §6 lists the historic-comment exemptions
    const offenders: string[] = [];
    for (const p of walkSrc('src')) {
      const stripped = raw(p)
        .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
        .replace(/^\s*\/\/.*$/gm, ' '); // line comments
      if (stripped.includes('المنيو الذكي')) offenders.push(p);
    }
    expect(offenders, `retired brand «المنيو الذكي» found in: ${offenders.join(', ')}`).toEqual(
      []
    );
  });
});

describe('r142 parity — mobile density + in-world focus (paper world)', () => {
  it('≤768 density pass: .ln-chapter clamp(60px, 9vh, 84px) + .ln-chapter-head clamp(24px, 3.5vh, 36px) / sp-4', () => {
    const m768 = allTopLevelBlocks(landingCss, '@media (max-width: 768px)').join('\n');
    expect(m768).toContain('.landing .ln-chapter { padding-block: clamp(60px, 9vh, 84px); }');
    expect(m768).toContain(
      '.landing .ln-chapter-head { margin-block-end: clamp(24px, 3.5vh, 36px); gap: var(--sp-4); }'
    );
  });

  it('universal in-world focus ring: .landing :focus-visible = 2px espresso ink, offset 3px (never the product gold --ring)', () => {
    expect(ruleBlock(landingCss, '.landing :focus-visible')).toContain(
      'outline: 2px solid var(--sm-ink)'
    );
    expect(ruleBlock(landingCss, '.landing :focus-visible')).toContain('outline-offset: 3px');
    // the button rings survive explicitly
    expect(ruleBlock(landingCss, '.landing .ln-btn-ember:focus-visible')).toContain(
      'outline: 2px solid var(--sm-ink)'
    );
    expect(ruleBlock(landingCss, '.landing .ln-btn-ghost:focus-visible')).toContain(
      'outline: 2px solid var(--sm-ink)'
    );
  });
});

describe('r129 parity — P2 value rows (measures · landscape · 1080 · depth · safe-area)', () => {
  it('measures ride the المائدة editorial values: hero-title 14ch / hero-sub 50ch · chapter-lede 64ch / cta-lede 60ch', () => {
    expect(decl(landingRule('.landing .ln-hero-title'), 'max-inline-size')).toBe('14ch');
    expect(decl(landingRule('.landing .ln-hero-sub'), 'max-inline-size')).toBe('50ch');
    expect(decl(landingRule('.landing .ln-chapter-lede'), 'max-inline-size')).toBe('64ch');
    expect(decl(landingRule('.landing .ln-cta-lede'), 'max-inline-size')).toBe('60ch');
  });

  it('landscape phones: max-height 560 hero compaction (min-block-size auto, 12px padding, 9vh title)', () => {
    const block = allTopLevelBlocks(
      landingCss,
      '@media (max-height: 560px) and (orientation: landscape)'
    )[0];
    expect(block, 'the landscape-phones hero block is missing').toBeDefined();
    expect(block).toContain('.landing .ln-hero {');
    expect(block).toContain('min-block-size: auto');
    expect(block).toContain('padding-block: 12px');
    expect(block).toContain('font-size: clamp(2rem, 9vh, 3.25rem)');
    expect(block).toContain('line-height: 1.14');
  });

  it('burger breakpoint = 1080px + the ≥1081 resize guard', () => {
    const m1080 = allTopLevelBlocks(landingCss, '@media (max-width: 1080px)')[0];
    expect(m1080, 'the 1080 nav-collapse block is missing').toBeDefined();
    expect(m1080).toContain('.landing .landing-nav-links { display: none; }');
    expect(m1080).toContain('.landing .landing-mobile-menu { display: flex; }');
    const guard = allTopLevelBlocks(landingCss, '@media (min-width: 1081px)')[0];
    expect(guard).toContain('.landing .landing-mobile-menu { display: none !important; }');
    // the old 1024 burger rules are gone (hero padding stays at ≤1024)
    const m1024 = allTopLevelBlocks(landingCss, '@media (max-width: 1024px)')[0];
    expect(m1024).not.toContain('landing-nav-links');
    expect(m1024).toContain('.landing .ln-hero { padding-block: clamp(104px, 14vh, 150px) 88px; }');
  });

  it('card depth shadows: the paper cards ride one quiet espresso recipe (menu detail + list + owner courses)', () => {
    expect(declN(lastRule('.landing .ln-menu-detail-card'), 'box-shadow')).toBe(
      '0 10px 24px -16px rgb(43 32 20 / 0.24)'
    );
    expect(declN(lastRule('.landing .ln-menu-list-wrap'), 'box-shadow')).toBe(
      '0 18px 36px -22px rgb(43 32 20 / 0.24)'
    );
    expect(declN(lastRule('.landing .ln-owner-list'), 'box-shadow')).toBe(
      '0 18px 36px -22px rgb(43 32 20 / 0.22)'
    );
  });

  it('mobile drawer safe-area: env(safe-area-inset-bottom, var(--sp-4)) @≤920', () => {
    const m920 = allTopLevelBlocks(landingCss, '@media (max-width: 920px)').join('\n');
    expect(m920).toContain(
      '.landing .landing-mobile-menu { padding-block-end: env(safe-area-inset-bottom, var(--sp-4)); }'
    );
  });

  it('RM press neutralizer: .ln-btn-ember:active { transform: none; background: #A93A26 } under prefers-reduced-motion', () => {
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    const off = prmBlocks.some(
      (b) =>
        b.includes('.landing .ln-btn-ember:active') &&
        /transform:\s*none/.test(b) &&
        /background:\s*#A93A26/.test(b)
    );
    expect(off, 'the RM press neutralizer was lost').toBe(true);
  });

  it('hover micro-verbs: scroll-line scaleY(1.3) + footer-link 2px underline @4px offset', () => {
    expect(ruleBlock(landingCss, '.landing .ln-hero-scroll:hover .ln-hero-scroll-line')).toContain(
      'transform: scaleY(1.3)'
    );
    expect(lastRule('.landing .landing-footer-link:hover')).toContain(
      'text-decoration: underline'
    );
    expect(lastRule('.landing .landing-footer-link:hover')).toContain(
      'text-underline-offset: 4px'
    );
  });

  it('≤390 trust band tightening (gap sp-3, 12.5px)', () => {
    const m390 = allTopLevelBlocks(landingCss, '@media (max-width: 390px)')[0];
    expect(m390).toContain('.landing .ln-trust-inner { gap: var(--sp-3); font-size: 12.5px; }');
  });

  it('in-world skip link: ink pill z 2100 above the grain + the shell pill hides while the landing is mounted (r142: the WORKING selector — the r129 rule was mangled twice and never hid anything)', () => {
    const skip = landingRule('.landing .ln-skip-link');
    expect(decl(skip, 'z-index')).toBe('2100');
    expect(decl(skip, 'background')).toBe('var(--sm-ink)');
    expect(decl(skip, 'color')).toBe('var(--sm-paper)');
    expect(landingCss).toContain('body:has(.landing) > a[href="#main-content"]');
    expect(homePageRaw).toContain('className="ln-skip-link"');
  });

  it('header CTA family: 44px pills, --sm-line hairline, quiet 0.05 tint hover', () => {
    expect(decl(landingRule('.landing .landing-header-cta .ln-btn-ghost'), 'min-block-size')).toBe(
      '44px'
    );
    expect(
      decl(landingRule('.landing .landing-header-cta .ln-btn-ghost'), 'border-color')
    ).toBe('var(--sm-line)');
    expect(
      decl(landingRule('.landing .landing-header-cta .ln-btn-ghost:hover'), 'background')
    ).toBe('rgb(43 32 20 / 0.05)');
    expect(decl(landingRule('.landing .landing-header-cta .ln-btn-ember'), 'min-block-size')).toBe(
      '44px'
    );
  });

  it('chapter titles carry the P4-19 opacity transition (var(--t-slow) var(--ease-out))', () => {
    expect(decl(lastRule('.landing .ln-chapter-title'), 'transition')).toBe(
      'opacity var(--t-slow) var(--ease-out)'
    );
  });
});

describe('r142 parity — المائدة chrome locks (gradient allowlist · buttons · header · ribbon)', () => {
  it('.ln-hero::before: the ONE sanctioned warm radial (α 0.12 ≤ 0.12 ceiling) — the paper light pool', () => {
    expect(decl(landingRule('.landing .ln-hero::before'), 'background')).toBe(
      'radial-gradient(48% 42% at 72% 38%, rgb(180 83 31 / 0.12) 0%, transparent 70%)'
    );
  });

  it('gradient allowlist: ZERO gradient occurrences outside the ONE sanctioned site (the hero light pool)', () => {
    const ALLOWED = ['.landing .ln-hero::before'];
    const sites = new Set<string>();
    for (const m of landingCss.matchAll(/([^{}]+)\{[^{}]*gradient/g)) {
      for (const sel of m[1].split(',')) {
        const s2 = sel.trim();
        if (s2 && s2.endsWith('{') === false) sites.add(s2);
      }
    }
    const offenders = [...sites].filter((s3) => !ALLOWED.some((a) => s3.startsWith(a)));
    expect(offenders, `non-allowlisted gradient sites: ${offenders.join(', ')}`).toEqual([]);
  });

  it('.ln-btn-ember:active composes translate(var(--mag-x,0), var(--mag-y,0)) scale(var(--press-scale,0.97))', () => {
    expect(decl(lastRule('.landing .ln-btn-ember:active'), 'transform')).toBe(
      'translate(var(--mag-x, 0), var(--mag-y, 0)) scale(var(--press-scale, 0.97))'
    );
  });

  it('.ln-btn-ember is the ONE filled surface: ember-deep fill + paper text + the canonical hover lift', () => {
    const btn = landingRule('.landing .ln-btn-ember');
    expect(decl(btn, 'background')).toBe('var(--sm-ember-deep)');
    expect(decl(btn, 'color')).toBe('var(--sm-paper)');
    expect(decl(landingRule('.landing .ln-btn-ember:hover'), 'transform')).toBe(
      'translate(var(--mag-x, 0), calc(var(--mag-y, 0) - 1px))'
    );
  });

  it('.landing-header.scrolled = solid paper @ 92% + --sm-line hairline', () => {
    expect(decl(landingRule('.landing .landing-header.scrolled'), 'background')).toBe(
      'rgb(247 241 227 / 0.92)'
    );
    expect(decl(landingRule('.landing .landing-header.scrolled'), 'border-block-end-color')).toBe(
      'var(--sm-line)'
    );
  });

  it('.landing-progress ribbon: fixed / 2px / z-90, bar = calc(var(--p,0) * 100%) flat ember', () => {
    const ribbon = landingRule('.landing .landing-progress');
    expect(decl(ribbon, 'position')).toBe('fixed');
    expect(decl(ribbon, 'block-size')).toBe('2px');
    expect(decl(ribbon, 'z-index')).toBe('90');
    expect(decl(landingRule('.landing .landing-progress-bar'), 'inline-size')).toBe(
      'calc(var(--p, 0) * 100%)'
    );
    expect(decl(landingRule('.landing .landing-progress-bar'), 'background')).toBe(
      'var(--sm-ember)'
    );
  });

  it('scroll-drip keyframes: translateY(-110%) → 260% + RM .ln-hero-scroll-line::after { animation: none }', () => {
    expect(landingCss).toMatch(/@keyframes ln-scroll-drip\s*{[^}]*translateY\(-110%\)[^}]*}\s*70%, 100% \{ transform: translateY\(260%\)/);
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    const off = prmBlocks.some(
      (b) => b.includes('.ln-hero-scroll-line::after') && /animation:\s*none/.test(b)
    );
    expect(off, 'the scroll-drip RM off-switch was lost').toBe(true);
  });

  it('reveal family: .landing .reveal-up rides var(--t-slower) var(--ease-out), d1-d5 = 80/160/240/320/400ms, RM opacity 1', () => {
    const reveal = landingRule('.landing .reveal-up');
    expect(decl(reveal, 'opacity')).toBe('0');
    expect(reveal).toContain('opacity var(--t-slower) var(--ease-out)');
    expect(decl(landingRule('.landing .reveal-d-1.in-view'), 'transition-delay')).toBe('80ms');
    expect(decl(landingRule('.landing .reveal-d-2.in-view'), 'transition-delay')).toBe('160ms');
    expect(decl(landingRule('.landing .reveal-d-3.in-view'), 'transition-delay')).toBe('240ms');
    expect(decl(landingRule('.landing .reveal-d-4.in-view'), 'transition-delay')).toBe('320ms');
    expect(decl(landingRule('.landing .reveal-d-5.in-view'), 'transition-delay')).toBe('400ms');
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    expect(
      prmBlocks.some((b) => b.includes('.landing .reveal-up { opacity: 1; transform: none; }'))
    ).toBe(true);
  });

  it('marquee duplication: LandingMarquee maps [...items, ...items]; HomePage ships the 12-item real vocabulary', () => {
    const src = raw('src/components/landing/LandingMarquee.tsx');
    expect(src).toContain('[...items, ...items]');
    const marqueeBlock = homePageRaw.match(
      /const MARQUEE_ITEMS = \[([\s\S]*?)\];/
    );
    expect(marqueeBlock).not.toBeNull();
    const itemCount = (marqueeBlock![1].match(/^\s*"/gm) ?? []).length;
    expect(itemCount).toBe(12);
  });
});

// ── r142 «المائدة» — the page-as-menu structure pins (task 2-b) ──────────────
// The redesign's narrative contract, pinned where the content lives: the
// hero leans a REAL menu card (data from landing-data.ts), the «المنيو
// الحي» board carries the REAL demo rows verbatim, the journey is the
// FOUR real product moments, the owner list is the honest course list,
// and the finale is the mandate's own line.

describe('r142 parity — المائدة structure: hero card · المنيو الحي · الرحلة · لصاحب المطعم · الختام', () => {
  it('the retired dark-world components are GONE (canvas, starfield, constellation, progress rings, restaurants plate, r141 plate, old light path)', () => {
    for (const f of [
      'src/components/landing/OrbitScene.tsx',
      'src/components/landing/HeroDepthLayer.tsx',
      'src/components/landing/CategoriesSection.tsx',
      'src/components/landing/ProgressSection.tsx',
      'src/components/landing/RestaurantsSection.tsx',
      'src/components/landing/HeroPlate.tsx',
      'src/components/landing/JourneyLightPath.tsx',
    ]) {
      expect(existsSync(f), `${f} must stay retired`).toBe(false);
    }
    // and the landing no longer imports them
    expect(homePageRaw).not.toContain('OrbitScene');
    expect(homePageRaw).not.toContain('HeroDepthLayer');
    expect(homePageRaw).not.toContain('CategoriesSection');
    expect(homePageRaw).not.toContain('ProgressSection');
    expect(homePageRaw).not.toContain('RestaurantsSection');
    expect(homePageRaw).not.toContain('HeroPlate');
  });

  it('the hero leans a REAL menu card: HeroTable picks one row per REAL category, dotted leaders, RTL-native money (r143 D8)', () => {
    expect(heroTableRaw).toContain("from './landing-data'");
    expect(heroTableRaw).toContain('DEMO_MENU.map((c) => ({ cat: c, item: c.items[0]! }))');
    expect(heroTableRaw).toContain('ln-hero-card-leader');
    expect(heroTableRaw).toContain('item.price.toFixed(2)');
    expect(heroTableRaw).toContain('priority');
  });

  it('«المنيو الحي» renders the REAL demo rows verbatim — 16 items, exact seed names + prices (nothing invented, r82)', () => {
    // the data lives in landing-data.ts, copied from the self-healing demo
    // seed (src/app/demo/route.ts → مقهى الواحة / /menu/al-waha-cafe)
    const dataRaw = raw('src/components/landing/landing-data.ts');
    for (const row of [
      "{ name: 'قهوة تركي', price: 3 },",
      "{ name: 'إسبريسو', price: 4 },",
      "{ name: 'كابتشينو', price: 5 },",
      "{ name: 'شاي', price: 2 },",
      "{ name: 'ليموناضة', price: 4 },",
      "{ name: 'سموثي', price: 6 },",
      "{ name: 'موهيتو', price: 5 },",
      "{ name: 'آيس كوفي', price: 5 },",
      "{ name: 'تشيز كيك', price: 7 },",
      "{ name: 'كنافة', price: 6 },",
      "{ name: 'كريب', price: 5 },",
      "{ name: 'بسبوسة', price: 4 },",
      "{ name: 'ساندويتش', price: 5 },",
      "{ name: 'بطاطس مقلية', price: 3 },",
      "{ name: 'سلطة', price: 4 },",
      "{ name: 'برجر', price: 7 },",
    ]) {
      expect(dataRaw).toContain(row);
    }
    // the seed is the source of truth — the same categories the demo writes
    for (const cat of ['مشروبات ساخنة', 'مشروبات باردة', 'حلويات', 'وجبات خفيفة']) {
      expect(dataRaw).toContain(cat);
    }
    // the board opens the REAL live demo menu
    expect(dataRaw).toContain("export const DEMO_MENU_URL = '/menu/al-waha-cafe'");
    expect(menuShowcaseRaw).toContain('DEMO_MENU_URL');
    // prices render in the platform money pattern (r143 D8: RTL-native —
    // the number leads logically, the currency lands to its visual LEFT in
    // the RTL base, matching the demo menu and every other surface; the
    // old dir="ltr" islands made the landing the ONLY currency-right
    // surface in the product)
    expect(menuShowcaseRaw).toContain('item.price.toFixed(2)');
    expect(menuShowcaseRaw).not.toContain('dir="ltr"');
    // the honesty note says the rows come from the live demo menu
    expect(menuShowcaseRaw).toContain('منسوخة حرفياً من منيو مقهى الواحة');
  });

  it('«المنيو الحي» WAI-ARIA tabs keep the RTL arrow grammar (ArrowRight = previous sibling, Home/End edges)', () => {
    expect(menuShowcaseRaw).toContain("role=\"tablist\"");
    expect(menuShowcaseRaw).toContain("e.key === 'ArrowRight') next = (catIdx - 1 + count) % count");
    expect(menuShowcaseRaw).toContain("e.key === 'ArrowLeft') next = (catIdx + 1) % count");
    expect(menuShowcaseRaw).toContain("e.key === 'Home') next = 0");
    expect(menuShowcaseRaw).toContain("e.key === 'End') next = count - 1");
  });

  it('«من الطاولة إلى المطبخ» is FOUR real product moments (QR → order → kitchen WhatsApp → review) scrubbed by --sp', () => {
    expect(journeyRaw).toContain('useSectionProgress');
    expect(journeyRaw).toContain('n: "01"');
    expect(journeyRaw).toContain('n: "02"');
    expect(journeyRaw).toContain('n: "03"');
    expect(journeyRaw).toContain('n: "04"');
    // every frame traces to a shipped surface, named in the desc
    expect(journeyRaw).toContain('امسح الرمز');
    expect(journeyRaw).toContain('يتصفح ويطلب');
    expect(journeyRaw).toContain('المطبخ يستقبل');
    expect(journeyRaw).toContain('العميل يقيّم');
    expect(journeyRaw).toContain('واتساب');
    // the thread rides the shared rAF belt and dies under RM
    expect(landingCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.landing \.ln-journey-thread-ink \{ stroke-dashoffset: 0; \}/);
  });

  it('«لصاحب المطعم» is the honest course list: the four shipped functions + the pricing route', () => {
    expect(rolesRaw).toContain('href="/pricing"');
    expect(rolesRaw).toContain('طلبات على واتساب');
    expect(rolesRaw).toContain('QR كود مخصص');
    expect(rolesRaw).toContain('لوحة تحكم عربية');
    expect(rolesRaw).toContain('ولاء ومكافآت');
    // and it says the honesty out loud
    expect(rolesRaw).toContain('هذه ليست قائمة وعود');
  });

  it('«الختام» is the espresso back-cover carrying the mandate line + the live stats with the honest fallback', () => {
    expect(finaleRaw).toContain('اجعل منيوك');
    expect(finaleRaw).toContain('يتحدث');
    expect(finaleRaw).toMatch(/stats\s*\?/);
    expect(finaleRaw).toContain('أرقام المنصّة تُجلب الآن من قاعدة البيانات…');
    // the back-cover paints espresso ink + paper text
    const cta = landingRule('.landing .ln-cta');
    expect(decl(cta, 'background')).toBe('var(--sm-ink)');
    expect(decl(cta, 'color')).toBe('var(--sm-paper)');
  });

  it('returning-visitor calm kept: product-scoped sessionStorage key smartmenu.intro.seen + data-intro-seen on the hero card', () => {
    expect(homePageRaw).toContain("'smartmenu.intro.seen'");
    expect(homePageRaw).toContain("data-intro-seen={introSeen ? 'true' : undefined}");
    expect(
      ruleBlock(landingCss, ".landing[data-intro-seen='true'] .ln-hero-card")
    ).toContain('animation: ln-float 7s var(--sm-ease-soft) infinite');
  });
});

describe('r142 parity — the hero menu-card entrance + the intro-seen calm contract', () => {
  it('returning-visitor calm: product-scoped sessionStorage key smartmenu.intro.seen, applied to the hero card (the canvas era is retired)', () => {
    expect(homePageRaw).toContain("'smartmenu.intro.seen'");
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    expect(
      prmBlocks.some((b) =>
        b.includes(".landing[data-intro-seen='true'] .ln-hero-card { animation: none; }"),
      ),
    ).toBe(true);
  });

  it('the hero-card family ships: breathing float + RM off-switch (the old canvas CSS grammar is retired with the engine)', () => {
    expect(landingCss).toContain('.landing .ln-hero-card');
    expect(landingCss).not.toContain('@keyframes ln-scene-in {');
    expect(existsSync('src/components/landing/OrbitScene.tsx')).toBe(false);
    expect(existsSync('src/components/landing/HeroOrbits.tsx')).toBe(false);
  });
});


describe('r129 parity — token-matrix SM rows (5 misvalued + 8 missing → canonical)', () => {
  it('easing ladder additions: --ease-spring-bounce + --ease-spring-snappy (canonical tokens.css:152-153)', () => {
    pin(dark, 'r129-dark', '--ease-spring-bounce', 'cubic-bezier(0.34, 1.56, 0.64, 1)');
    pin(dark, 'r129-dark', '--ease-spring-snappy', 'cubic-bezier(0.5, 1.6, 0.4, 1)');
  });

  it('--hover-lift: -1px (canonical tokens.css:171)', () => {
    pin(dark, 'r129-dark', '--hover-lift', '-1px');
  });

  it('blur register: --glass-blur 16px + --scrim-blur 4px, both themes (canonical :601/:607)', () => {
    pin(dark, 'r129-dark', '--glass-blur', '16px');
    pin(dark, 'r129-dark', '--scrim-blur', '4px');
    pin(light, 'r129-light', '--glass-blur', '16px');
    pin(light, 'r129-light', '--scrim-blur', '4px');
  });

  it('--brand-purple = the lavender ink chain (dark #B7A0DB / light #8A76C9)', () => {
    pin(dark, 'r129-dark', '--brand-purple', '#B7A0DB');
    pin(light, 'r129-light', '--brand-purple', '#8A76C9');
  });

  it('--gold-soft = the yellow bg chain (dark #33270F / light #F9EEDA)', () => {
    pin(dark, 'r129-dark', '--gold-soft', '#33270F');
    pin(light, 'r129-light', '--gold-soft', '#F9EEDA');
  });
});

// ── r130 (W2-3): product recipe pins — the canonical .btn recipe, the type
// ladder, the chart token consumption gate, the hero word-stagger, the CTA
// sheen, the canonical focus-ring values and the AA link hover. Sources:
// madarek components.css:266-311 (.btn) · tokens.css:71-118 (type/leading/
// tracking) · tokens.css:239-266 (§state) + 596-598 (premium shadows) ·
// landing.css:601-619 (.ln-w) + 421-431 (::after sheen) · base.css:69
// (a:hover accent-ink). ──────────────────────────────────────────────────────

const chartGeometryRaw = raw('src/lib/chart-geometry.ts');
const chartTokensRaw = raw('src/components/shared/chart-tokens.ts');
const areaChartRaw = raw('src/components/shared/AreaChart.tsx');
const doughnutRaw = raw('src/components/shared/DoughnutChart.tsx');
const cardRaw = raw('src/components/ui/card.tsx');
// comment-stripped chart-geometry — the retirement note mentions the old hex
// roster; the pin must only see CODE.
const chartGeometryCode = chartGeometryRaw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

describe('r130 parity — P0 button recipe (Madarek components.css .btn)', () => {
  it('radius/weight/label: rounded-md (10px) + font-semibold (600) + text-sm (13px rung) — no font-bold', () => {
    const baseMatch = buttonRaw.match(/cva\(\s*`?([\s\S]*?)`?\s*,\s*\{\s*variants/);
    const base = baseMatch?.[1] ?? '';
    expect(base, 'the cva base string should be extractable').toContain('rounded-md');
    expect(base).toContain('font-semibold');
    expect(base).not.toContain('font-bold');
    expect(base).toContain('text-sm');
  });

  it('size ladder: default h-11 (44px) · lg h-12 (48) · sm h-8 (32) · icon size-10 (utility rung)', () => {
    expect(buttonRaw).toContain("default: 'h-11");
    expect(buttonRaw).toContain("lg: 'h-12");
    expect(buttonRaw).toContain("sm: 'h-8");
    expect(buttonRaw).toContain("icon: 'size-10'");
  });

  it('primary hover = canonical −2px lift + neutral premium shadow pair; sheen sweep ONLY on the primary variant', () => {
    const orange = buttonRaw.split('orange:')[1]?.split(/,\s*\n\s*flame:/)[0] ?? '';
    expect(orange).toContain('shadow-[var(--shadow-card-premium)]');
    expect(orange).toContain('hover:-translate-y-[2px]');
    expect(orange).toContain('hover:shadow-[var(--shadow-card-premium-h)]');
    // no tinted glow anywhere in the primitive
    expect(buttonRaw).not.toContain('shadow-orange/');
    // the canonical bg-position sheen band lives in the primary variant only
    expect(orange).toContain('before:bg-[length:300%_100%]');
    expect(orange).toContain('before:bg-[position:160%_0]');
    expect(orange).toContain('hover:before:bg-[position:-60%_0]');
    // the retired translateX pseudo-sweep (scrollWidth overflow bug) is gone
    expect(buttonRaw).not.toContain('before:-translate-x-full');
    expect(buttonRaw).not.toContain('hover:before:translate-x-full');
    // the ambient ::after glow pseudo is gone
    expect(buttonRaw).not.toContain('after:bg-');
  });

  it('disabled opacity 0.55 (canonical .btn:disabled, components.css:311)', () => {
    expect(buttonRaw).toContain('disabled:opacity-55');
    expect(buttonRaw).not.toContain('disabled:opacity-50');
  });
});

describe('r130 parity — P0 type ladder + leading (canonical rungs 13/15/17/22/30)', () => {
  it('@theme text rungs: sm 13px / base 15px / lg 17px / xl 22px / 2xl 30px', () => {
    expect(theme['--text-sm']).toBe('0.8125rem');
    expect(theme['--text-base']).toBe('0.9375rem');
    expect(theme['--text-lg']).toBe('1.0625rem');
    expect(theme['--text-xl']).toBe('1.375rem');
    expect(theme['--text-2xl']).toBe('1.875rem');
  });

  it('leading: normal 1.65 / snug 1.20 (canonical --lh-base/--lh-snug) + body inherits 1.65', () => {
    expect(theme['--leading-normal']).toBe('1.65');
    expect(theme['--leading-snug']).toBe('1.2');
    pin(dark, 'r130', '--lh-base', '1.65');
    pin(dark, 'r130', '--lh-snug', '1.20');
    expect(globalsRaw).toContain('line-height: var(--lh-base, 1.65)');
  });

  it('tracking tight −0.022em (canonical --ls-tight) + the LTR heading guard matches', () => {
    expect(theme['--tracking-tight']).toBe('-0.022em');
    expect(globalsRaw).not.toContain('letter-spacing: -0.03em');
  });
});

describe('r130 parity — P0 charts consume the --chart-* token series (theme-aware)', () => {
  it('chart-geometry.ts is pure geometry: ZERO raw hex/oklch palette literals (SERIES_PALETTE retired)', () => {
    expect(chartGeometryCode).not.toContain('SERIES_PALETTE =');
    expect(chartGeometryCode).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(chartGeometryCode).not.toMatch(/oklch\(/);
  });

  it('chart-tokens.ts reads --chart-1..8 + --chart-1/--accent-hover at draw-time (night fallbacks only)', () => {
    expect(chartTokensRaw).toContain('--chart-${i + 1}');
    expect(chartTokensRaw).toContain('read("--chart-1"');
    expect(chartTokensRaw).toContain('read("--accent-hover"');
    // Phase 5: fallbacks match the LIGHT :root roster (the default theme);
    // the 6th series is the --chart-6 light value #8F6212.
    expect(chartTokensRaw).toContain('"#8F6212"');
    expect(chartTokensRaw).toContain('"#C2452D"');
  });

  it('DoughnutChart consumes the token series roster (no SERIES_PALETTE import)', () => {
    expect(doughnutRaw).not.toContain('SERIES_PALETTE');
    expect(doughnutRaw).toContain('tokens.series');
  });

  it('AreaChart rides the tokens: no #E9B44C/#F5D48A literals; stroke --chart-1 + top stop --accent-hover', () => {
    // comment-stripped — the provenance notes name the retired literals
    const areaChartCode = areaChartRaw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(areaChartCode).not.toContain('#E9B44C');
    expect(areaChartCode).not.toContain('#F5D48A');
    expect(areaChartCode).toContain('tokens.chart1');
    expect(areaChartCode).toContain('tokens.accentHover');
  });
});

describe('r142 parity — the hero LCP contract + the leaning card (word-stagger retired on purpose)', () => {
  // The r130 Madarek word-stagger (opacity-0 words riding an 85ms cadence)
  // is RETIRED with the dark world: المائدة's opening line is a printed
  // menu's headline — it paints INSTANTLY with the HTML (LCP doctrine),
  // and the life of the composition moved into the leaning card's
  // entrance + float (both RM-gated). The r92-A7 SSR pins stay the
  // enforceable LCP contract; these are the CSS-side twins.
  it('the hero title has NO entrance choreography left: no .ln-w spans, no per-word delays, no reveal gating on the LCP lines', () => {
    expect(homePageRaw).not.toContain('ln-w');
    expect(landingCss).not.toContain('.ln-w');
    expect(homePageRaw).not.toContain('ln-hero-gold');
  });

  it('the hero title is flat espresso at rest — no text-shadow games on paper', () => {
    const title = landingRule('.landing .ln-hero-title');
    expect(decl(title, 'color')).toBe('var(--sm-ink)');
    expect(title).not.toContain('text-shadow');
  });

  it('the ONE ember word rides the LARGE-text ember token (h1 sizes ≥24px — 4.4:1 passes AA-large)', () => {
    expect(homePageRaw).toContain('ln-hero-ember');
    expect(decl(landingRule('.landing .ln-hero-title em'), 'color')).toBe('var(--sm-ember)');
  });

  it('the leaning card: static 3D tilt (perspective, no JS) + 7s float + RM/returning-visitor off-switches', () => {
    const card = landingRule('.landing .ln-hero-card');
    expect(decl(card, 'transform')).toBe(
      'perspective(1100px) rotateX(6deg) rotateY(-7deg) rotate(1.4deg)'
    );
    expect(card).toContain('ln-float 7s var(--sm-ease-soft)');
    const prm = allTopLevelBlocks(landingCss, '@media (prefers-reduced-motion: reduce)');
    expect(
      prm.some((b) => b.includes('.ln-hero-card') && /animation:\s*none/.test(b)),
      'the hero-card RM off-switch was lost'
    ).toBe(true);
    // ≤1024 the tilt leaves (a leaning card at 390px reads broken)
    const m1024 = allTopLevelBlocks(landingCss, '@media (max-width: 1024px)').join('\n');
    expect(m1024).toContain('.landing .ln-hero-card {');
    expect(m1024).toContain('transform: none');
  });

  it('the steam wisps + dish arch + inset veils: all die or flatten under RM; the steam never survives it', () => {
    const prm = allTopLevelBlocks(landingCss, '@media (prefers-reduced-motion: reduce)');
    expect(
      prm.some((b) => b.includes('.ln-steam') && /opacity:\s*0/.test(b))
    ).toBe(true);
    expect(landingCss).toContain('@keyframes ln-steam-rise');
  });
});

describe('r130 parity — P1 focus ring + link hover AA + state/premium token families', () => {
  it('focus ring values: dark #E07856 / light #C2452D (terracotta cascade, both themes)', () => {
    pin(dark, 'r130', '--ring', '#E07856');
    pin(dark, 'r130', '--state-focus-ring-color', '#E07856');
    pin(light, 'r130', '--ring', '#C2452D');
    pin(light, 'r130', '--state-focus-ring-color', '#C2452D');
  });

  it('a:hover rides var(--accent-ink) — 10.29:1 on cream (AA fix; was var(--orange) 3.65:1)', () => {
    expect(globalsRaw).toMatch(/a:hover\s*\{[\s\S]*?color:\s*var\(--accent-ink\)/);
    expect(globalsRaw).not.toMatch(/a:hover\s*\{[\s\S]*?color:\s*var\(--orange\)/);
  });

  it('premium shadow tokens: --shadow-card-premium/-h multi-layer WARM neutral (no cold grays)', () => {
    // Phase 5: light = espresso-tinted rgba(64,46,28,*); dark = warm night.
    pin(light, 'r130', '--shadow-card-premium', '0 2px 4px rgba(64,46,28,0.05), 0 8px 24px rgba(64,46,28,0.09), 0 2px 8px rgba(64,46,28,0.05)');
    pin(light, 'r130', '--shadow-card-premium-h', '0 4px 8px rgba(64,46,28,0.07), 0 12px 32px rgba(64,46,28,0.11), 0 4px 12px rgba(64,46,28,0.06)');
    pin(dark, 'r130', '--shadow-card-premium', '0 2px 4px rgba(8,5,3,0.30), 0 8px 24px rgba(8,5,3,0.40), 0 2px 8px rgba(8,5,3,0.30)');
  });

  it('interaction-state family: --state-button/card/input/tab/link/loading-* present (tokens.css §state)', () => {
    for (const t of [
      '--state-button-hover-translate',
      // r134-W2 (#17): --state-button-pressed-scale removed — zero consumers
      // (the .btn reality presses at active:scale 0.97, not 0.98).
      // r134-V1: --state-button-pressed-duration removed too — consumer-dead
      // twin (buttons transition via --t-micro directly), madarek-matched.
      '--state-button-disabled-opacity',
      '--state-card-hover-elevation',
      '--state-card-hover-translate',
      '--state-card-hover-border',
      '--state-card-pressed-scale',
      '--state-card-selected-ring',
      '--state-input-focus-ring',
      '--state-input-focus-border',
      '--state-input-error-border',
      '--state-tab-active-indicator',
      '--state-tab-indicator-duration',
      '--state-link-hover-underline',
      '--state-loading-spinner-size',
      '--state-loading-spinner-stroke',
      '--state-loading-spinner-color',
    ]) {
      expect(dark[t], `${t} is missing from globals.css :root`).toBeDefined();
    }
    // the fill/stroke slots consume the SOLID accent (wash remap), and the
    // disabled opacity is the .btn:disabled reality (0.55)
    expect(dark['--state-card-selected-ring']).toContain('--accent-solid');
    expect(dark['--state-button-disabled-opacity']).toBe('0.55');
  });

  it('card press unified on --state-card-pressed-scale 0.99 (the 0.995 fork is dead)', () => {
    expect(globalsRaw).toContain('scale(var(--state-card-pressed-scale, 0.99))');
    expect(globalsRaw).not.toContain('scale(0.995)');
    expect(cardRaw).toContain('active:scale-[var(--state-card-pressed-scale,0.99)]');
  });

  it('browser surfaces: ::selection accent-solid 28% + var(--foreground); scrollbar 10px + padding-box inset', () => {
    expect(globalsRaw).toContain(
      'background: color-mix(in srgb, var(--accent-solid) 28%, transparent)'
    );
    const selBlock = ruleBlock(css, '::selection');
    expect(selBlock).toContain('color: var(--foreground)');
    const thumb = ruleBlock(css, '*::-webkit-scrollbar-thumb');
    expect(ruleBlock(css, '*::-webkit-scrollbar')).toContain('inline-size: 10px');
    expect(thumb).toContain('border: 2px solid transparent');
    expect(thumb).toContain('background-clip: padding-box');
    expect(thumb).toContain('border-radius: var(--r-full)');
  });

  it('single canonical smooth/quart curve — @theme and :root agree on (0.16, 1, 0.3, 1)', () => {
    expect(theme['--ease-smooth']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(theme['--ease-out-quart']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(dark['--ease-smooth']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(dark['--ease-out-quart']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('landing value rows: .ln-hero-scroll fold anchor +134px (canonical landing.css:686)', () => {
    expect(landingRule('.landing .ln-hero-scroll')).toContain('calc(100% - 100svh + 134px)');
    expect(landingCss).not.toContain('calc(100% - 100svh + 95px)');
  });

  it('WhatsApp ink tokenized: --whatsapp-ink both themes (mint-family shades), zero raw #0b3d2e in TSX', () => {
    pin(dark, 'r130', '--whatsapp-ink', '#0F241C');
    pin(light, 'r130', '--whatsapp-ink', '#1F4F30');
    expect(theme['--color-whatsapp-ink']).toBe('var(--whatsapp-ink)');
    const srcText = walkSrc('src')
      .filter((p) => !p.includes('app/globals.css'))
      .map(raw)
      .join('\n');
    expect(srcText).not.toContain('#0b3d2e');
    expect(srcText).toContain('text-whatsapp-ink');
  });

  it('table type rides the canonical .table rung (P2-9): cells text-sm (13px) · th text-2xs (11px) semibold muted', () => {
    const tableRaw = raw('src/components/ui/table.tsx');
    // cells: the table element carries the 13px label rung
    expect(tableRaw).toContain('"w-full caption-bottom text-sm"');
    // th: 11px (--fs-xxs) semibold muted (components.css:842-848)
    expect(tableRaw).toMatch(/text-2xs font-semibold whitespace-nowrap text-muted-foreground/);
    expect(tableRaw).not.toMatch(/align-middle font-medium/);
  });
});


// ── r131-F4: SM product-layer re-base — the family rogue comes home ─────────
// (R131-W1 fleet rulings: input 44/r10/16floor+halo · muted-foreground fleet
// pair · dialog solid r16+top hairline+560 · badge solid pastel 11/600/tnum ·
// empty 56 grey/18/600 · toasts bottom-end+hairline+28px well+manual error ·
// sidebar 30px r8 3px-START rail · skeleton 1200 linear · theme: one
// resolution path + runtime theme-color sync + grain follows the class.)
// NOTE: TSX raws are COMMENT-STRIPPED before the negative gates — the ruling
// comments intentionally quote the retired recipes ("was /15 washes"), and
// the gates must test shipped CLASS STRINGS, not documentation.

describe('r131-F4 parity — SM product primitives join the family', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  const inputCc = cc('src/components/ui/input.tsx');
  const textareaCc = cc('src/components/ui/textarea.tsx');
  const searchInputCc = cc('src/components/ui/search-input.tsx');
  const selectCc = cc('src/components/ui/select.tsx');
  const dialogCc = cc('src/components/ui/dialog.tsx');
  const sheetCc = cc('src/components/ui/sheet.tsx');
  const badgeCc = cc('src/components/ui/badge.tsx');
  const emptyCc = cc('src/components/ui/empty-state.tsx');
  const navCc = cc('src/components/shared/NavLink.tsx');
  const toastCc = cc('src/lib/premium-toast.tsx');
  const toasterCc = cc('src/components/ui/app-toaster.tsx');
  const syncCc = cc('src/components/shared/theme-color-sync.tsx');
  const brandCc = cc('src/lib/brand.ts');
  // Phase 5: the pre-paint boot script — light default, dark opt-in.
  const bootRaw = raw('src/lib/theme-boot.ts');
  const manifestRaw = raw('public/manifest.json');
  const sparkCc = cc('src/components/shared/MiniSparkline.tsx');
  const ordersListCc = cc('src/app/(protected)/owner/OwnerOrdersList.tsx');

  it('muted ladder: --muted-foreground #6B5D4F (light) | #CDBFA9 (dark) — faint tier --text-muted, placeholders keep --placeholder-text', () => {
    // Phase 5 re-grade: warm espresso tiers, all AA on their grounds.
    pin(light, 'r131', '--muted-foreground', '#6B5D4F');
    pin(dark, 'r131', '--muted-foreground', '#CDBFA9');
    pin(light, 'r131', '--text-muted', '#7A6A58');
    pin(dark, 'r131', '--text-muted', '#9A8977');
    pin(light, 'r131', '--placeholder-text', '#7E6E5C');
    pin(dark, 'r131', '--placeholder-text', '#9A8977');
  });

  it('input canon: 44px / r-md 10 / 16px floor at EVERY breakpoint + halo-only focus + AA placeholder (A1 P0-1)', () => {
    expect(inputCc).toMatch(/h-11 w-full min-w-0 rounded-md/);
    expect(inputCc).toContain('text-[16px]');
    expect(inputCc).not.toContain('md:text-sm');
    expect(inputCc).not.toContain('h-12 ');
    expect(inputCc).not.toContain('rounded-lg border');
    expect(inputCc).toContain('placeholder:text-placeholder-text');
    expect(inputCc).toContain('focus-visible:shadow-[var(--state-input-focus-halo)]');
    expect(inputCc).not.toMatch(/focus-visible:ring-2/);
    // stateful variants ride their own 3px/22% halos (tokens in globals :root)
    expect(dark['--state-input-error-halo']).toContain('0 0 0 3px');
    expect(dark['--state-input-error-halo']).toContain('22%');
    expect(dark['--state-input-success-halo']).toContain('var(--success) 22%');
    expect(dark['--state-input-warning-halo']).toContain('var(--warning) 22%');
    // textarea + search-input + select-trigger ride the same contract
    expect(textareaCc).toContain('rounded-md border border-input');
    expect(textareaCc).toContain('text-[16px]');
    expect(textareaCc).toContain('placeholder:text-placeholder-text');
    expect(textareaCc).toContain('shadow-[var(--state-input-focus-halo)]');
    expect(searchInputCc).toContain('placeholder:text-placeholder-text');
    expect(searchInputCc).toContain('shadow-[var(--state-input-focus-halo)]');
    expect(searchInputCc).not.toContain('ring-4');
    expect(selectCc).toContain('data-[size=default]:h-11');
    expect(selectCc).toContain('data-placeholder:text-placeholder-text');
    expect(selectCc).not.toContain('min-h-[48px]');
  });

  it('dialog canon: solid surface + plate-round 16 + 560px cap + top accent hairline (A1 P0-10 — Phase 6 r154: the plate rung)', () => {
    expect(dialogCc).toContain('rounded-lg border border-border bg-popover');
    expect(dialogCc).toContain('sm:max-w-[560px]');
    expect(dialogCc).toContain('shadow-[var(--shadow-modal)]');
    expect(dialogCc).toContain('before:bg-[linear-gradient(90deg,transparent,var(--accent-solid),transparent)]');
    expect(dialogCc).toContain('before:h-[3px]');
    expect(dialogCc).not.toContain('bg-popover/95');
    expect(dialogCc).not.toContain('backdrop-blur-md');
    expect(dialogCc).not.toContain('sm:max-w-sm');
    expect(dialogCc).not.toContain('rounded-2xl');
    expect(dialogCc).toMatch(/text-lg leading-none font-semibold/);
  });

  it('sheet canon: solid panel + min(420px,100%) + full slide + grabber + 4px scrim (A1 P1-14)', () => {
    expect(sheetCc).toContain('bg-popover text-sm text-popover-foreground shadow-[var(--shadow-modal)]');
    expect(sheetCc).toContain('sm:max-w-[420px]');
    expect(sheetCc).not.toContain('sm:max-w-sm');
    expect(sheetCc).toContain('data-starting-style:translate-x-[-100%]');
    expect(sheetCc).toContain('rounded-e-2xl');
    expect(sheetCc).toContain('w-10 shrink-0 rounded-full');
    expect(sheetCc).toContain('backdrop-blur-xs');
    expect(sheetCc).not.toContain('backdrop-blur-xl');
    expect(sheetCc).not.toContain('bg-popover/95');
    expect(sheetCc).not.toContain('2.5rem');
  });

  it('badge canon: 11px/600/tnum pill + SOLID pastel -bg/-deep pairs (A1 P0-5/P1-11)', () => {
    expect(badgeCc).toMatch(/text-2xs font-semibold tabular-nums/);
    expect(badgeCc).toContain('rounded-full');
    expect(badgeCc).not.toContain('rounded-4xl');
    expect(badgeCc).toContain('gold: "bg-(--c-copper-bg) text-(--c-copper-deep)');
    expect(badgeCc).toContain('bg-(--c-mint-bg) text-(--c-mint-deep)');
    expect(badgeCc).toContain('bg-(--c-rose-bg) text-(--c-rose-deep)');
    expect(badgeCc).toContain('bg-(--c-yellow-bg) text-(--c-yellow-deep)');
    expect(badgeCc).toContain('bg-(--c-sky-bg) text-(--c-sky-deep)');
    expect(badgeCc).not.toMatch(/\/15/);
    expect(badgeCc).not.toContain('bg-orange/15');
    expect(badgeCc).not.toContain('bg-gradient-to-r');
  });

  it('empty-state canon: 56px warm PLATE well (rounded-lg 16) + 18/600 title + 42ch desc (A11 SM-1 — Phase 6 r154: the grey tile retires)', () => {
    expect(emptyCc).toMatch(/size-14 items-center justify-center rounded-lg/);
    // the warm tint families — terracotta plate default, sage/amber tones,
    // rose for danger; the Madarek grey tile is gone.
    expect(emptyCc).toContain('bg-(--c-copper-bg) text-(--c-copper-ink)');
    expect(emptyCc).toContain('bg-(--c-mint-bg) text-(--c-mint-ink)');
    expect(emptyCc).toContain('bg-(--c-yellow-bg) text-(--c-yellow-ink)');
    expect(emptyCc).toContain('bg-(--c-rose-bg) text-(--c-rose-ink)');
    expect(emptyCc).not.toContain('bg-(--c-grey-bg)');
    expect(emptyCc).toMatch(/text-lg font-semibold text-foreground/);
    expect(emptyCc).toContain('max-w-[42ch]');
    expect(emptyCc).not.toContain('bg-orange/8');
    expect(emptyCc).not.toContain('size-16');
    expect(emptyCc).not.toMatch(/text-sm font-bold/);
  });

  it('sidebar canon: 30px compact r-sm + 3x16px inline-START rail, no icon bounce (A1 P0-7)', () => {
    expect(navCc).toContain('min-h-[30px]');
    expect(navCc).toContain('rounded-sm');
    expect(navCc).not.toContain('min-h-11');
    expect(navCc).not.toContain('rounded-xl px-3');
    expect(navCc).toContain('-start-[3px]');
    // r133 (D3 lint:idioms): the 2px literal → rounded-e-full — a 3px rail
    // clamps to fully-rounded ends either way (identical render, ladder-clean).
    expect(navCc).toContain('h-4 w-[3px] rounded-e-full');
    expect(navCc).not.toContain('end-0 top-1/2 h-6 w-0.5');
    expect(navCc).not.toContain('scale-110');
    expect(navCc).not.toContain('drop-shadow');
  });

  it('night-shell gradient on both dashboard rails (SO shell.tsx port, A1 P2-3 — Phase 6 r154: the warm night kitchen repaint)', () => {
    for (const shell of [cc('src/app/(protected)/owner/OwnerShell.tsx'), cc('src/components/layout/AdminSidebar.tsx')]) {
      // r154: the retired gold/indigo/sand gradient re-pins to the terracotta
      // ember glow + espresso ladder (the «مطبخ ليلي دافئ» contract).
      expect(shell).toContain('dark:bg-[radial-gradient(340px_200px_at_82%_-60px,rgb(224_120_86/0.08),transparent_72%)');
      expect(shell).toContain('rgb(224_120_86/0.08)');
      expect(shell).not.toContain('rgb(233_180_76');
      expect(shell).not.toContain('rgb(111_168_255');
      expect(shell).toContain('border-e border-border/60 bg-card');
      expect(shell).not.toContain('border-s border-border/50 bg-card/80');
      expect(shell).not.toContain('backdrop-blur-md');
    }
  });

  it('toast canon: bottom-end shell + 28px pastel wells + 1px status hairline + alert family manual-dismiss (A1 P0-9, A11 SM-4)', () => {
    expect(toasterCc).toContain('position="bottom-left"');
    expect(toasterCc).not.toContain('richColors');
    expect(toasterCc).not.toContain('top-center');
    expect(toasterCc).toContain('containerAriaLabel');
    expect(toastCc).toContain('size-7 min-h-[28px]');
    expect(toastCc).not.toContain('size-10');
    expect(toastCc).toContain('borderInlineStartColor');
    expect(toastCc).toContain('Infinity : 4000');
    expect(toastCc).not.toContain('rtl:flex-row-reverse');
    expect(toastCc).not.toContain('backdrop-blur-xl');
    expect(cc('src/components/layout/OrderNotifier.tsx')).toContain('premiumToast');
  });

  it('theme system: ONE resolution path — LIGHT default + enableSystem OFF + pre-paint boot + runtime theme-color sync #FBF7F0 (A10 F2/F3/SM-2, Phase 5)', () => {
    for (const layout of [publicLayoutRaw, protectedLayoutRaw]) {
      expect(layout).not.toMatch(/<ThemeProvider[^>]*enableSystem/);
      expect(layout).toContain('disableTransitionOnChange');
      // Phase 5: the provider + the boot script both default LIGHT.
      expect(layout).toContain('defaultTheme="light"');
      expect(layout).toContain('THEME_BOOT_SCRIPT');
      expect(layout).toContain('<AppToaster />');
      expect(layout).toContain('<ThemeColorSync />');
    }
    expect(bootRaw).toContain("if(t==='dark')");
    expect(bootRaw).toContain("classList.add('light')");
    expect(brandCc).toContain('"#1D1410"');           // warm night kitchen (dark tint)
    expect(brandCc).toContain('"#FBF7F0"');           // cream ground (light tint)
    expect(manifestRaw).toContain('"theme_color": "#FBF7F0"');
    expect(syncCc).toContain('dark: "#1D1410"');
    expect(syncCc).toContain('light: "#FBF7F0"');
    // grain follows the .dark class, not the OS (SO pattern) — light default
    expect(globalsRaw).toContain('.dark .grain-overlay::before { opacity: 0.022; }');
    expect(globalsRaw).not.toMatch(/@media \(prefers-color-scheme: light\) \{ \.grain-overlay/);
    // sparkline gradient follows --accent-hover (A10 SM-4)
    expect(sparkCc).toContain('stopColor="var(--accent-hover, #A93A26)"');
    expect(ordersListCc).not.toContain('ring-black/5');
  });

  it('button destructive = solid danger; skeleton rides 1200ms LINEAR (fleet rulings)', () => {
    expect(buttonRaw).toMatch(/'bg-destructive text-destructive-foreground border-0 shadow-\[var\(--shadow-card-premium\)\]/);
    expect(noCc(buttonRaw)).not.toContain('bg-destructive/10');
    const skeletonRule = noCc(globalsRaw.slice(globalsRaw.indexOf('.skeleton {'), globalsRaw.indexOf('.skeleton {') + 800));
    const shimmerRule = noCc(globalsRaw.slice(globalsRaw.indexOf('.shimmer {'), globalsRaw.indexOf('.shimmer {') + 800));
    expect(skeletonRule).toMatch(/shimmer var\(--motion-duration-skeleton, 1\.2s\) linear infinite/);
    expect(shimmerRule).toMatch(/shimmer var\(--motion-duration-skeleton, 1\.2s\) linear infinite/);
    expect(skeletonRule).not.toContain('ease-in-out');
    expect(shimmerRule).not.toContain('ease-in-out');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// r133 (F2+G2) — "The Finest Details" web wave: money/A11y/microcopy pins
// (A3 S1-S6 · A10 · A11 · A12 · A9 · A13 · A14-D3 rulings R1-R16)
// ════════════════════════════════════════════════════════════════════════════
describe('r133 parity — finest details: money seam, focus grammar, microcopy sweeps', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  const whatsappCc = cc('src/lib/whatsapp.ts');
  const formatCc = cc('src/lib/format.ts');
  const seoCc = cc('src/lib/seo.ts');
  const cartCc = cc('src/store/cart.ts');
  const buttonCc2 = cc('src/components/ui/button.tsx');
  const inputCc2 = cc('src/components/ui/input.tsx');
  const switchCc2 = cc('src/components/ui/switch.tsx');
  const tableCc2 = cc('src/components/ui/table.tsx');
  const ordersTableCc = cc('src/app/(protected)/owner/orders/OrdersTable.tsx');
  const globalsCc = noCc(raw('src/app/globals.css')).replace(/@media[^{]+\{/g, '{');
  const ownerMenuCc = cc('src/app/(protected)/owner/menu/page.tsx');
  const menuSkeletonCc = cc('src/components/menu/MenuSkeleton.tsx');
  const protectedLayoutCc2 = cc('src/app/(protected)/layout.tsx');
  const publicLayoutCc2 = cc('src/app/(public)/layout.tsx');
  const stickyHeaderCc = cc('src/components/menu/StickyMenuHeader.tsx');
  const ownerRestaurantsCc = cc('src/app/(protected)/owner/restaurants/page.tsx');
  const menuSlugCc = cc('src/app/(public)/menu/[slug]/page.tsx');
  const paymentDialogCc = cc('src/components/shared/PaymentDialog.tsx');
  const navLinkCc2 = cc('src/components/shared/NavLink.tsx');

  it('A12-M1: normalizeWaNumber folds Eastern digits BEFORE the \\d strip (dead wa.me links)', () => {
    expect(whatsappCc).toContain('const western = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));');
    expect(whatsappCc).toContain('let digits = western.replace(/[^\\d]/g, "");');
    // order matters: the fold MUST precede the ASCII strip
    expect(whatsappCc.indexOf('const western')).toBeLessThan(whatsappCc.indexOf('let digits'));
  });

  it('A12-M2 + R14: formatDateTripoli pins Africa/Tripoli server-side; formatPrice groups ar-LY dots ≥1000', () => {
    expect(formatCc).toContain("timeZone: 'Africa/Tripoli'");
    expect(formatCc).toContain("hourCycle: 'h23'");
    // S12: search normalizer folds Eastern digits too
    expect(formatCc).toContain('.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))');
    // R6/R14 grouping — hand-rolled, hydration-safe (SO money.ts twin)
    expect(formatCc).toContain('function groupDots(intStr: string): string {');
    expect(formatCc).toContain('intStr.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".")');
  });

  it('A12-S11/R14: the restaurant WhatsApp forward is a money document — explicit 2 decimals', () => {
    const waRoute = cc('src/app/api/whatsapp/generate/route.ts');
    expect(waRoute).toContain("formatPrice(Number(oi.price), { decimals: 2 })");
    expect(waRoute).toContain("formatPrice(m.priceDelta, { decimals: 2 })");
    expect(waRoute).toContain("formatPrice(Number(order.total), { decimals: 2 })");
    expect(waRoute).toContain('formatDateTripoli(order.createdAt)');
    expect(waRoute).not.toContain('formatDate(order.createdAt)');
  });

  it('A3-S5: ONE origin seam — NEXT_PUBLIC_APP_URL wins, DOMAIN stays the alias; print-QR + copy-link ride it', () => {
    expect(seoCc).toContain('process.env.NEXT_PUBLIC_APP_URL ||');
    expect(seoCc).toContain('process.env.NEXT_PUBLIC_DOMAIN ||');
    expect(seoCc).toContain("'https://menu.smart-link.ly'");
    const printCc = cc('src/app/(public)/menu/[slug]/print/page.tsx');
    expect(printCc).toContain('`${SITE_ORIGIN}/menu/${slug}`');
    expect(printCc).not.toContain('NEXT_PUBLIC_APP_URL ??');
    expect(ownerRestaurantsCc).toContain('`${SITE_ORIGIN}/menu/${slug}`');
    expect(ownerRestaurantsCc).not.toContain('https://menu.smart-link.ly/menu/');
  });

  it('A12-N7: JSON-LD price is a STRING, never a number primitive', () => {
    // r136: العرض صار يعتمد السعر الفعّال (المخفَّض إن وُجد) — نية N7
    // نفسها (نص دائماً، لا number primitive) مع تغطية الخصم.
    expect(menuSlugCc).toContain('price: String(i.discountedPrice ?? i.price)');
    expect(menuSlugCc).not.toContain('price: Number(i.price)');
  });

  it('A3-S1: updateQuantity(qty≤0) mirrors removeItem — the undo banner covers the minus path', () => {
    expect(cartCc).toContain('const removed = s.items.find((i) => i.id === id);');
    expect(cartCc).toContain('...(removed ? { lastRemoved: removed } : {})');
  });

  it('A3-S2/S3: bounded auto-retry (max 3, linear backoff) + the shared ConfirmDialog', () => {
    expect(ownerMenuCc).toContain('const RETRY_MAX = 3;');
    expect(ownerMenuCc).toContain('3000 * attempt');
    expect(ownerMenuCc).toContain('retryCountRef.current = 0; // success ends the cycle');
    expect(ownerMenuCc).toContain("import { ConfirmDialog } from '@/components/shared/ConfirmDialog';");
    expect(ownerMenuCc).toContain('confirmLabel="حذف"');
    expect(ownerMenuCc).not.toContain('<DialogContent>');
  });

  it('A3-S6: MenuSkeleton hero block mirrors the real MenuHero geometry (QR first paint)', () => {
    expect(menuSkeletonCc).toContain('min-h-[80vh] md:min-h-[70vh]');
    expect(menuSkeletonCc).toContain('size-28 md:size-32');
    expect(menuSkeletonCc).toContain('text-center');
  });

  it('A10 Must-1: busy Button announces «جارٍ التحميل…» to screen readers', () => {
    expect(buttonCc2).toContain('جارٍ التحميل…');
    expect(buttonCc2).toContain('aria-hidden="true"');
  });

  it('A10: ONE focus indicator — the 7 audited split-brain sites ride the global outline', () => {
    // primitives: the ring utilities are gone file-wide (aria-invalid:ring is an
    // error-state indicator, not focus — allowed to stay)
    expect(buttonCc2).not.toContain('focus-visible:ring-2');
    expect(buttonCc2).not.toContain('focus-visible:ring-offset-2');
    expect(switchCc2).not.toContain('focus-visible:ring-2');
    // card root: the ring + offset retired (offset was this file's only site)
    const menuItemCc = cc('src/components/menu/MenuItemCard.tsx');
    expect(menuItemCc).not.toContain('focus-visible:ring-offset-2');
    // empty-menu money CTAs: brightness + ring retired together
    const menuPageCc = cc('src/components/menu/MenuPageClient.tsx');
    expect(menuPageCc).toContain('hover:bg-orange/95 transition-[background-color]');
    // segmented pickup radio: transition list only (no ring utilities)
    // r139 (J7): whitespace-nowrap + px-1 ينضمان للقائمة — التسمية المضغوطة
    // «توصيل +5 د.ل» لا تكسر 360px (لا حلقات تركيز هنا كالمعتاد)
    const orderDialogCc = cc('src/components/menu/OrderDialog.tsx');
    expect(orderDialogCc).toContain("justify-center rounded-lg text-sm font-medium transition-[color,background-color] whitespace-nowrap px-1'");
    // new-orders bar dismiss: hover grammar only
    const newOrdersBarCc = cc('src/components/orders/NewOrdersBar.tsx');
    expect(newOrdersBarCc).toContain('hover:bg-muted hover:text-foreground"');
  });

  it('A10: no brightness-filter hovers (flame + the 4 money-path CTAs)', () => {
    expect(buttonCc2).not.toContain('hover:brightness-110');
    expect(cc('src/components/menu/MenuItemCard.tsx')).not.toContain('hover:brightness-110');
    expect(cc('src/components/menu/MenuPageClient.tsx')).not.toContain('hover:brightness-110');
  });

  it('A10: input/select/textarea hover borders + autofill/caret theming + default-easing bridge', () => {
    expect(inputCc2).toContain('hover:border-(--border-strong)');
    expect(cc('src/components/ui/select.tsx')).toContain('hover:border-(--border-strong)');
    expect(cc('src/components/ui/textarea.tsx')).toContain('hover:border-(--border-strong)');
    expect(globalsCc).toContain('--default-transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);');
    expect(globalsCc).toContain('caret-color: var(--accent-ink);');
    expect(globalsCc).toContain('input:-webkit-autofill,');
    expect(globalsCc).toContain('input:autofill,');
  });

  it('A11-S10: TableHead carries scope="col"; the empty actions header is named', () => {
    expect(tableCc2).toContain('scope="col"');
    expect(ordersTableCc).toContain('aria-label="إجراءات"');
  });

  it('A11-S2: both layout mains are programmatically focusable skip targets', () => {
    expect(publicLayoutCc2).toContain('<main id="main-content" tabIndex={-1}');
    expect(protectedLayoutCc2).toContain('<main tabIndex={-1}');
  });

  it('A12-S8/R10: phone mask is exactly 10 glyphs (09XXXXXXXX), never 11', () => {
    expect(paymentDialogCc).toContain('placeholder="09XXXXXXXX"');
    expect(paymentDialogCc).not.toContain('09XXXXXXXXX');
    expect(cc('src/app/(protected)/cart/CustomerInfoCard.tsx')).not.toContain('09XXXXXXXXX');
    expect(cc('src/app/(protected)/owner/settings/page.tsx')).not.toContain('09XXXXXXXXX');
  });

  it('A11/R11: og:locale is ar_AR on all six surfaces', () => {
    expect(publicLayoutCc2).toContain("locale: 'ar_AR'");
    expect(protectedLayoutCc2).toContain("locale: 'ar_AR'");
    expect(menuSlugCc).toContain("locale: 'ar_AR'");
    expect(cc('src/app/(public)/pricing/layout.tsx')).toContain("locale: 'ar_AR'");
    expect(cc('src/app/(public)/privacy/page.tsx')).toContain("locale: 'ar_AR'");
    expect(cc('src/app/(public)/terms/page.tsx')).toContain("locale: 'ar_AR'");
  });

  it('A3-N5: dual favicon consolidated — no explicit /favicon.png link', () => {
    expect(publicLayoutCc2).not.toContain('href="/favicon.png"');
    expect(protectedLayoutCc2).not.toContain('href="/favicon.png"');
  });

  it('A3-N12: mobile drawer closes on outside-click (invisible scrim)', () => {
    expect(stickyHeaderCc).toContain('onPointerDown={() => setMobileOpen(false)}');
    expect(stickyHeaderCc).toContain('aria-hidden="true"');
  });

  it('A3-N8: external open rides rel="noopener noreferrer" (no bare window.open _blank)', () => {
    expect(ownerRestaurantsCc).toContain('rel="noopener noreferrer"');
    expect(ownerRestaurantsCc).not.toContain("window.open(`/menu/");
  });

  it('A14-D3: no 2-3px radius literals (lint:idioms idiom-4) on the four retired sites', () => {
    expect(navLinkCc2).toContain('rounded-e-full');
    expect(navLinkCc2).not.toContain('rounded-e-[2px]');
    expect(cc('src/app/(protected)/admin/users/page.tsx')).not.toContain('rounded-e-[2px]');
    expect(cc('src/app/(protected)/login/LoginForm.tsx')).not.toContain('rounded-b-[2px]');
    expect(cc('src/components/ui/dialog.tsx')).not.toContain('rounded-b-[3px]');
  });

  it('A9/R1-R7: microcopy sweeps hold repo-wide (comment-stripped)', () => {
    // R3: shadda + فشل ban (user-facing; code comments stripped)
    expect(formatCc).not.toContain('فشل');
    expect(cc('src/lib/get-error-message.ts')).not.toContain('فشل');
    expect(cc('src/lib/env.ts')).not.toContain('فشل');
    // R7: تليجرام spelling; R5: ASCII percent; R1: عميل (user-facing)
    const searchInputCc2 = cc('src/components/ui/search-input.tsx');
    expect(searchInputCc2).toContain('placeholder = \'ابحث…\'');
    expect(cc('src/components/landing/HomePage.tsx')).not.toContain('زبون');
    expect(cc('src/components/landing/RolesSection.tsx')).not.toContain('الزبون');
    expect(cc('src/app/(protected)/admin/restaurants/RestaurantTable.tsx')).toContain('لا توجد مطاعم مسجلة');
    // R6: «…» single-char ellipsis on the two stragglers F2 missed (G2 closed)
    expect(cc('src/app/(protected)/admin/audit-logs/page.tsx')).toContain('وعناوين IP…');
    expect(cc('src/components/shared/DashboardSkeletons.tsx')).toContain('جارٍ تحميل رمز QR…');
    // docblock usage example (a comment) — read RAW, not comment-stripped
    const laRaw = raw('src/components/ui/loading-announcer.tsx');
    expect(laRaw).toContain('جارٍ تحميل البيانات…');
    expect(laRaw).not.toContain('جاري تحميل');
  });

  it('A13-S-02: SubscribeForm restaurant blocks carry stable draft keys', () => {
    const formCc = cc('src/app/(protected)/subscribe/SubscribeForm.tsx');
    expect(formCc).toContain('key={restaurant._key ?? `menu-${index}`}');
    expect(formCc).toContain('nextMenuDraftKey()');
  });

  it('A3-N1: the r119 dead intermediate is collapsed (constLoadingMore)', () => {
    const ordersCc = cc('src/app/(protected)/owner/orders/page.tsx');
    expect(ordersCc).not.toContain('const constLoadingMore');
    expect(ordersCc).toContain('const [loadingMore, setLoadingMore] = useState(false);');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// r134 (W2) — fix-wave pins: mobile money-path twins (Eastern-digit fold ·
// ar-LY grouping · search fold — mobile harness carries its own), the
// OrderDialog double-tap guard + tel contract + lazy isMobile, the spin
// 700ms @theme bridge, the JSON-LD E.164 telephone, the SW privacy skip,
// and the copy unifications (تخطَّ · فئة).
// ════════════════════════════════════════════════════════════════════════════
describe('r134 parity — W2 fix wave: money-path UX, spin canon, SW privacy, copy', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('#11: animate-spin rides the 700ms canon via the @theme bridge (+ explicit keyframes)', () => {
    expect(theme['--animate-spin']).toBe('spin 700ms linear infinite');
    // the bridge must not depend on Tailwind's default-theme keyframes
    expect(globalsRaw).toContain('@keyframes spin { to { transform: rotate(360deg); } }');
  });

  it('#5: JSON-LD telephone is E.164 — the raw owner string rides normalizeWaNumber', () => {
    const menuSlugCc = cc('src/app/(public)/menu/[slug]/page.tsx');
    expect(menuSlugCc).toContain("import { normalizeWaNumber } from '@/lib/whatsapp';");
    expect(menuSlugCc).toContain('const wa = normalizeWaNumber(restaurant.phone || restaurant.whatsapp);');
    expect(menuSlugCc).toContain('telephone: wa ? `+${wa}` : undefined');
  });

  it('#2/#3/#12: OrderDialog — addLockRef double-tap guard, no dead submitting spinner, tel contract, lazy isMobile', () => {
    const s = cc('src/components/menu/OrderDialog.tsx');
    // the H1 twin of MenuPageClient's quick-add lock
    expect(s).toContain('if (addLockRef.current) return;');
    expect(s).toContain('addLockTimerRef.current = setTimeout(() => {');
    expect(s).toContain('}, 400);');
    // the synchronous submitting flag + its never-rendering spinner are gone
    expect(s).not.toContain('setSubmitting');
    expect(s).not.toContain('submitting ||');
    // phone input: numeric keyboard + autofill contract
    expect(s).toContain('type="tel"');
    expect(s).toContain('inputMode="tel"');
    expect(s).toContain('autoComplete="tel"');
    // mobile surface detected on FIRST render (no desktop Dialog flash)
    expect(s).toContain("window.matchMedia('(min-width: 640px)').matches");
    expect(s).not.toContain('window.innerWidth < 640');
  });

  it('#6/#7: skip-link shadda تخطَّ on both shells; the filter surface says فئة, not قسم', () => {
    for (const p of [
      'src/app/(public)/layout.tsx',
      'src/app/(protected)/layout.tsx',
    ]) {
      const l = cc(p);
      expect(l, p).toContain('تخطَّ إلى المحتوى الرئيسي');
      expect(l, p).not.toContain('تخطى إلى المحتوى الرئيسي');
    }
    const tabsCc = cc('src/components/menu/CategoryTabs.tsx');
    expect(tabsCc).toContain('aria-label="تصفية الأصناف حسب الفئة"');
    expect(tabsCc).toContain('اختيار فئة يعرض أصنافها فقط في القائمة أدناه');
    expect(tabsCc).not.toContain('حسب القسم');
    // the twin empty-state copy already said فئة (MenuPageClient 462/469)
    const menuPageCc = cc('src/components/menu/MenuPageClient.tsx');
    expect(menuPageCc).toContain("'لا توجد أصناف في هذه الفئة'");
    expect(menuPageCc).toContain("'اختر فئة أخرى'");
  });

  it('#9/#10: SW never caches protected navigation HTML; the dead navigation regex is gone; cache bumped', () => {
    const sw = raw('public/sw.js');
    expect(sw).toContain("const PROTECTED_NAVIGATION = [/^\\/(owner|admin|cart|order-confirmed|subscribe|login)(\\/|$)/];");
    expect(sw).toContain('const isProtected = PROTECTED_NAVIGATION.some((re) => re.test(url.pathname));');
    expect(sw).toContain('if (!isProtected) {');
    // the empty-alternation discriminator that matched EVERY pathname is gone
    // from CODE (comment-stripped — the fix's own explanatory comment names it)
    const swCc = noCc(sw);
    expect(swCc).not.toContain('/^\\/([^.]*|$)/');
    // version bumped with this file's policy change (also purges v7's
    // already-cached protected HTML on shared devices);
    // Phase 5 (r152): v8 → v9 — re-rendered brand assets + manifest +
    // offline.html joined the precache (terracotta identity) + the Baloo
    // arabic display face. The pin follows the CURRENT canon version.
    expect(sw).toContain("const CACHE_NAME = 'smart-menu-v9';");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// r137 — الساعات المهيكلة (ساعات الدوام) + رسوم التوصيل/الحد الأدنى.
// المسامير تحرس العقود عبر الملفات المصدرية (نفس أسلوب r133/r134: قراءة
// خام + قراءة مقشورة التعليقات):
//   - الشارة عميلية فقط (الصفحة ISR — لا حساب خادمي للحالة أبدًا)
//   - الحالة الفارغة غير مرئية (لا شارة بلا ساعات، لا سطر رسوم بلا قيمة)
//   - الرسوم تُفرض خادميًا (total = subtotal + fee من صف المطعم، لا العميل)
//   - الهجرتان zz_round137_* بنمط المستودع + القيد الفريد المركّب
//   - لا بوابة خطة (أمانة منيو جوهرية — كل الباقات)
// ════════════════════════════════════════════════════════════════════════════
describe('r137 parity — structured opening hours + delivery fee/min-order (Libya-first)', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('S1: OpenStatusBadge — عميلي فقط، aria-live، النصان القانونيان، وميض-صفر حتى التركيب', () => {
    const s = raw('src/components/menu/OpenStatusBadge.tsx');
    expect(s).toContain("'use client'");
    expect(s).toContain('aria-live="polite"');
    expect(s).toContain('مفتوح الآن · يغلق');
    expect(s).toContain('مغلق حاليًا');
    expect(s).toContain('computeOpenStatus(hours, tripoliWallClock())');
    // السكوت الصادق: لا ساعات → لا شارة
    expect(s).toContain('if (!hours || hours.length === 0) return;');
  });

  it('S2: الحساب عميلي فقط — شارة القلب لا تُحسب في مكون خادمي أبدًا', () => {
    // MenuHero خادمي (server hero r86-B6) — يستورد الشارة كجزيرة، لا الحساب
    const heroCc = cc('src/components/menu/MenuHero.tsx');
    expect(heroCc).toContain("import { OpenStatusBadge } from './OpenStatusBadge'");
    expect(heroCc).toContain('<OpenStatusBadge hours={restaurant.hours} />');
    expect(heroCc).not.toContain('computeOpenStatus');
    // صفحة المنيو (RSC خادمية) لا تحسب الحالة أيضًا — البيانات الخام فقط
    const pageCc = cc('src/app/(public)/menu/[slug]/page.tsx');
    expect(pageCc).not.toContain('computeOpenStatus');
    // العارض النصي الحر (workingHours pill) باقٍ بجانب الشارة
    expect(heroCc).toContain('{restaurant.workingHours}');
  });

  it('S3: المخطط والهجرات — نمط zz_round137_* + القيد الفريد المركّب + نفس نوع مال MenuItem.price', () => {
    const schema = raw('prisma/schema.prisma');
    // مطابقة متسامحة مع المسافات (المسامير تثبّت القيم لا التنسيق)
    const schemaSquashed = schema.replace(/\s+/g, ' ');
    expect(schema).toContain('model OpeningHours {');
    expect(schema).toContain('@@unique([restaurantId, dayOfWeek])');
    expect(schemaSquashed).toContain('hours OpeningHours[]');
    // نفس عائلة الحقيقة المالية: Decimal(10,2) — لا Int ملّيم ولا String
    expect(schemaSquashed).toContain('deliveryFee Decimal? @db.Decimal(10, 2)');
    expect(schemaSquashed).toContain('minOrder Decimal? @db.Decimal(10, 2)');
    // الهجرتان بالتسمية القانونية
    expect(existsSync('prisma/migrations/zz_round137_opening_hours/migration.sql')).toBe(true);
    expect(existsSync('prisma/migrations/zz_round137_delivery_meta/migration.sql')).toBe(true);
    const hoursSql = raw('prisma/migrations/zz_round137_opening_hours/migration.sql');
    expect(hoursSql).toContain('CREATE TABLE "OpeningHours"');
    expect(hoursSql).toContain('ON DELETE CASCADE');
    expect(hoursSql).toContain('"OpeningHours_restaurantId_dayOfWeek_key"');
  });

  it('S4: محرّر الأسبوع — السبت أولًا (الأسبوع الليبي)، مغلق-طوال-اليوم، input[type=time]', () => {
    const s = cc('src/components/owner/WeeklyHoursEditor.tsx');
    expect(s).toContain('LIBYAN_WEEK_ORDER.map((day)');
    expect(s).toContain('مغلق طوال اليوم');
    expect(s).toContain('type="time"');
    // المحرّر مشترك بين المالك والأدمن (توأم واحد لا نسختان)
    expect(cc('src/app/(protected)/owner/settings/page.tsx')).toContain('WeeklyHoursEditor');
    expect(cc('src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx')).toContain('WeeklyHoursEditor');
  });

  it('S5: workingHours النصي صار «ملاحظات دوام إضافية» في المحرّرين، يُعرض كما هو في المنيو', () => {
    expect(cc('src/app/(protected)/owner/settings/page.tsx')).toContain('ملاحظات دوام إضافية');
    expect(cc('src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx')).toContain('ملاحظات دوام إضافية');
  });

  it('S6: الرسوم خادمية الحقيقة — تضاف إلى total في المعاملة من صف المطعم، لا الحمولة', () => {
    const s = cc('src/app/api/orders/route.ts');
    expect(s).toContain('const feeTotal = deliveryFeeFor(effectivePickupType, deliveryMeta);');
    expect(s).toContain('total: recalcSubtotal - discount + feeTotal');
    expect(s).toContain('isBelowMinOrder(recalcSubtotal, effectivePickupType, deliveryMeta)');
    // 422 بنص الواجهة نفسه (نفس minOrderMessage)
    expect(s).toContain('minOrderMessage(deliveryMeta.minOrder!)');
  });

  it('S7: خيار التوصيل يعلن رسومه — OrderDialog + صفحة السلة (r139 J7: الصيغة المضغوطة الوحيدة الحية)', () => {
    const od = cc('src/components/menu/OrderDialog.tsx');
    expect(od).toContain('deliveryFeeLabelCompact(deliveryFee)');
    const cart = cc('src/app/(protected)/cart/page.tsx');
    expect(cart).toContain('deliveryFeeLabelCompact(deliveryMeta.fee!)');
    expect(cart).toContain('import {');
    // r139 anti-bloat: التسمية الكاملة حُذفت مع آخر مستخدم إنتاجي — لا دالة
    // تسمية ميتة تُبقيها الاختبارات حية؛ الدلالة الكاملة تعيش في سطر
    // «رسوم التوصيل» المستقل (الملخص/المراجعة/الورقة — S8)
    const libCc = cc('src/lib/delivery-meta.ts');
    expect(libCc).toContain('توصيل +${formatPrice(fee)}');
    expect(libCc).not.toContain('رسومًا)');
  });

  it('S8: فصل الرسوم الصادق — سطر مستقل في الملخص والمراجعة والفاتورة، لا ذوبان في المجموع', () => {
    expect(cc('src/app/(protected)/cart/CartSummaryCard.tsx')).toContain('رسوم التوصيل');
    expect(cc('src/app/(protected)/cart/ReviewDialog.tsx')).toContain('رسوم التوصيل');
    expect(cc('src/components/menu/CartSlideOver.tsx')).toContain('شامل رسوم توصيل');
    const receipt = cc('src/lib/receipt.ts');
    expect(receipt).toContain('رسوم التوصيل');
    // صفحة السلة: grandTotal = subtotal + fee (بعد المجموع، لا قبله)
    const cart = cc('src/app/(protected)/cart/page.tsx');
    expect(cart).toContain('const grandTotal = subtotal + deliveryFeeAmount;');
  });

  it('S9: بوابة الحد الأدنى — شريط عربي صادق + scroll-to-error + الفحص قبل قفل الإرسال', () => {
    const cart = cc('src/app/(protected)/cart/page.tsx');
    expect(cart).toContain('id="min-order-error"');
    expect(cart).toContain("document.getElementById('min-order-error')");
    expect(cart).toContain('scrollIntoView({ behavior: \'smooth\', block: \'center\' })');
    // الفحص قبل submittingRef (زر قابل لإعادة المحاولة — نمط r121 H-2)
    expect(cart.indexOf('if (belowMinOrder) {')).toBeLessThan(cart.indexOf('submittingRef.current = true;'));
  });

  it('S10: لا بوابة خطة — أمانة المنيو الجوهرية لا تُقيد بـ maxItems/maxOrders', () => {
    // المكتبة المالية المشتركة لا تعرف شيئًا عن حدود الخطة أصلاً
    const libCc = cc('src/lib/delivery-meta.ts');
    expect(libCc).not.toContain('plan-limit');
    expect(libCc).not.toContain('subscription');
    // ولا مسار الطلبات: لا PlanLimitError على مسار الرسوم/الحد
    const ordersCc = cc('src/app/api/orders/route.ts');
    expect(ordersCc.indexOf('isBelowMinOrder')).toBeGreaterThan(-1);
    // (PlanLimitError يبقى حصريًا على فحص السقف داخل المعاملة كما كان)
  });

  it('S11: البيانات تعبر السلك — المنيو العام (الجوال) + إسقاط getRestaurantBySlug', () => {
    const publicMenuCc = cc('src/app/api/public/menu/[slug]/route.ts');
    expect(publicMenuCc).toContain('deliveryFee == null ? null : Number(restaurant.deliveryFee)');
    expect(publicMenuCc).toContain('hours: restaurant.hours');
    const queriesCc = cc('src/lib/menu-queries.ts');
    expect(queriesCc).toContain('deliveryFee: true');
    expect(queriesCc).toContain('minOrder: true');
  });

  it('S12: صفحة الطباعة تحمل سطر الدوام المهيكل تحت الترويسة (إن وُجد)', () => {
    const printCc = cc('src/app/(public)/menu/[slug]/print/page.tsx');
    expect(printCc).toContain('formatHoursForPrint(restaurant.hours)');
    // السطر يعتمد المكتبة المشتركة (لا منطق دوام منفصل في الورقة)
    expect(printCc).toContain("import { formatHoursForPrint } from '@/lib/opening-hours'");
  });
});

describe('r139 — طابور r138 المكتمل: وسم النافد، سعر الاقتراح، تخطيط 360px، صدق الرسوم', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('r139-J5: الرفض الخادمي يسمّي الأصناف ويحمل الـids — الواجهة تسم الأسطر لا تصطادها', () => {
    const s = cc('src/app/api/orders/route.ts');
    // الظرف: الأسماء في الرسالة + unavailableItemIds للوسم الآلي
    expect(s).toContain('unavailableItemIds');
    expect(s).toContain('هذه الأصناف لم تعد متوفرة');
    expect(s).toContain('وغيرها'); // أكثر من ٣ → أول ثلاثة + «وغيرها»
    // الواجهة: القراءة → الحالة → التمرير للسطر
    const cart = cc('src/app/(protected)/cart/page.tsx');
    expect(cart).toContain('unavailableItemIds');
    expect(cart).toContain('unavailableIds.includes(item.itemId)');
    expect(cart).toContain('setUnavailableIds([])'); // النجاح يمسح الوسم
    // السطر: الشارة النصية (لا لونًا وحده) + تعطيل التعديل وإبقاء الحذف
    const line = cc('src/app/(protected)/cart/CartLineItem.tsx');
    expect(line).toContain('لم يعد متوفرًا');
    expect(line).toContain('unavailable || item.quantity <= 0');
    expect(line).toContain('disabled={unavailable}'); // الملاحظات
  });

  it('r139-J6: اقتراح البحث يعرض المخفّض — لا سعران متناقضان على الشاشة نفسها', () => {
    const t = cc('src/components/menu/MenuToolbar.tsx');
    // النوع يحمل المخفّض + العرض بشروط البطاقة (مخفّض حقيقي < الأصلي)
    expect(t).toContain('discountedPrice?: number | null');
    expect(t).toContain('s.discountedPrice < s.price');
    expect(t).toContain('text-success-ink'); // نفس دلالة الموفِر في البطاقة
    expect(t).toContain('line-through'); // والأصلي مشطوب كما في البطاقة
  });

  it('r139-J7: المقسّمات لا تنكسر على 360px — الصيغة المضغوطة + سطر واحد', () => {
    const od = cc('src/components/menu/OrderDialog.tsx');
    expect(od).toContain('whitespace-nowrap');
    const sel = cc('src/app/(protected)/cart/PickupTypeSelector.tsx');
    expect(sel).toContain('whitespace-nowrap');
    // والتسمية الكاملة تعيش حيث يتسع الفراغ (S8 أعلاه: الملخص/المراجعة)
    expect(cc('src/app/(protected)/cart/CartSummaryCard.tsx')).toContain('رسوم التوصيل');
  });

  it('r139-J17: رسوم التوصيل في الورقة الجانبية — لا إجمالي أنقص بصت', () => {
    const s = cc('src/components/menu/CartSlideOver.tsx');
    // حالة الجلب معلنة، والسطر الصادق يظهر عند المجهولية (جارٍ أو فاشل)
    expect(s).toContain("'idle' | 'pending' | 'known' | 'unknown'");
    expect(s).toContain('رسوم توصيل (تُحدَّد عند إتمام الطلب)');
    expect(s).toContain("feeStatus === 'pending' || feeStatus === 'unknown'");
    // مطعم جديد = وصف مجهول (لا تُورّث رسوم المطعم السابق أثناء الجلب)
    expect(s).toContain('setDeliveryMeta({ fee: null, minOrder: null })');
  });
});

describe('r139 — أحبار الحالة في الأسطح الإدارية + حالات مسموعة + housekeeping', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('r139-أحبار: توأمات -ink تحل محل أحبار التعبئة كنص في admin/owner/login — والداكن لا يتغير', () => {
    // الجسر الرابع المفقود: info-ink (sky-deep في الفاتح 10.57:1 —
    // text-info كان 3.21:1 = يفشل 4.5:1 للنص)
    expect(cc('src/app/globals.css')).toContain('--color-info-ink: var(--info-ink);');
    // عينة من الأسطح المُكنّسة: الأرقام الكبيرة والشارات في admin/owner
    const adminOrders = cc('src/app/(protected)/admin/orders/page.tsx');
    expect(adminOrders).toContain('text-success-ink');
    expect(adminOrders).toContain('text-warning-ink');
    expect(adminOrders).toContain('text-info-ink');
    expect(adminOrders).not.toMatch(/(?<!dark:)text-success(?![-\w])/);
    const subs = cc('src/app/(protected)/admin/subscriptions/page.tsx');
    expect(subs).toContain('text-success-ink');
    const login = cc('src/app/(protected)/login/LoginForm.tsx');
    expect(login).toContain('text-success-ink');
    // الداكن: ink === base (وثيقة العائلة في globals — صفر تغيير عرضي)
    const g = raw('src/app/globals.css');
    expect(g).toMatch(/--success-ink:\s+var\(--c-mint-ink\);/);
  });

  it('r139-P2-8: حالات الإرسال/الجلب مسموعة — سبينر بلا نص لا يوجد بعد الآن', () => {
    const rs = cc('src/components/menu/ReviewSheet.tsx');
    expect(rs).toContain('جارٍ إرسال التقييم');
    expect(rs).toContain('جارٍ تحميل المزيد من التقييمات');
    // النجاح له توست والفشل له نص خطأ — لا رسالة اكتمال تكذب على قارئ الشاشة
    expect(rs).toContain('completedMessage=""');
    const rd = cc('src/app/(protected)/cart/ReviewDialog.tsx');
    expect(rd).toContain('جارٍ إرسال الطلب إلى المطعم');
    expect(rd).toContain('جارٍ إرسال الطلب</span>');
  });

  it('r139-P3-10: شريحة المعرض التفاعلية تعلن دورها — role=button (4.1.2)', () => {
    const g = cc('src/components/menu/GalleryCarousel.tsx');
    expect(g).toContain('role="button"');
    expect(g).toContain('aria-roledescription="شريحة"');
    // «group» غادر الملف كله — لا دور غامض لشريحة تُفعَّل بـEnter/Space
    expect(g).not.toContain('role="group"');
  });

  it('r139-housekeeping: requireAdmin حُذف وعقده انتقل صريحًا إلى مساريه', () => {
    // الرمز ذهب…
    const auth = cc('src/lib/auth.ts');
    expect(auth).not.toContain('export async function requireAdmin');
    // …وعقد 401/403 حي في المسارين (audit-logs: super فقط؛ seed: الأدوار الثلاثة)
    const audit = cc('src/app/api/admin/audit-logs/route.ts');
    expect(audit).toContain("requireAuth");
    expect(audit).toContain("auth.role !== 'super_admin'");
    const seed = cc('src/app/api/seed/route.ts');
    expect(seed).toContain('auth.role !== "admin" && auth.role !== "sub_admin" && auth.role !== "super_admin"');
    // وحارس المسارات تابع بالعلامتين الحيتين
    const guard = raw('scripts/check-api-auth.mjs');
    expect(guard).not.toContain('"requireAdmin("');
  });

  it('r139-knip: أثر التدوين خارج التحليل والإيجابيات الكاذبة الثلاث مغلقة', () => {
    const k = raw('knip.config.ts');
    expect(k).toContain("'scripts/archive/**'");
    expect(k).not.toMatch(/'sharp',/);
    expect(k).toContain("ignoreBinaries: ['expo', 'expo-doctor']");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 6 (r154) — Smart-Menu web deep completion pins
   The Phase-5 token flip left the owner/admin surfaces TOKEN-ONLY with live
   retired-Madarek paint in the dark rails and grey-tile state anatomy. These
   pins lock the Phase-6 culinary completion: the night-kitchen rail repaint,
   the warm state family, the dot-leader money surfaces, the plate geometry.
   ═══════════════════════════════════════════════════════════════════════════ */
describe('phase6 r154 — ليلة المطبخ: قتل أحرف مدارك المتقاعدة في السكك الداكنة', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('السكة الليلية للمالك والأدمن: توهّج جمرة التراكوتا + نقش كوكبات الإسبريسو — لا ذهب ولا نيلي', () => {
    for (const rail of [
      'src/app/(protected)/owner/OwnerShell.tsx',
      'src/components/layout/AdminSidebar.tsx',
    ]) {
      const s = cc(rail);
      // التوهّج: جمرة التراكوتا المضيئة (E07856) علوية + المكبوسة (C2452D) سفلية
      expect(s).toContain('rgb(224_120_86/0.08)');
      expect(s).toContain('rgb(194_69_45/0.05)');
      // الكوكبات: رمح الإسبريسو الدافئ (سلّم 241811 المصبوغ) + شرارات جمرة
      expect(s).toContain('rgb(205_191_169/0.20)');
      expect(s).toContain('rgb(154_137_119/0.16)');
      expect(s).toContain('rgb(229_217_196/0.15)');
      // والأحرف المدركية المتقاعدة لم تعد حية في أي سكة
      for (const retired of [
        'rgb(233_180_76', 'rgb(111_168_255', 'rgb(242_239_230', 'rgb(142_151_184',
      ]) {
        expect(s).not.toContain(retired);
      }
    }
  });

  it('هالة التنقل النشط الداكنة: تراكوتا — لا توهج الذهب المدركي', () => {
    const s = cc('src/components/shared/NavLink.tsx');
    expect(s).toContain('dark:shadow-[0_0_18px_-4px_rgb(224_120_86/0.18),inset_0_0_0_1px_rgb(224_120_86/0.10)]');
    expect(s).not.toContain('rgb(233_180_76');
  });

  it('صيد الأحرف: صفر أحرف مدارك متقاعدة حية عبر src/ (التعليقات الموثقة معفوّة)', () => {
    // النسخة المنزوعة التعليقات: التعليقات التي توثّق التقاعد مسموحة،
    // الأحرف الحية في القيم لا. (المرجع: قرار بوابة parity r152.)
    const retiredLive = [
      /#E9B44C/i, /#F5D48A/i, /#F2EFE6/i, /#070B16/i, /#0D1428/i,
      /rgba?\(\s*233\s*,\s*180\s*,\s*76/i, /rgba?\(\s*111\s*,\s*168\s*,\s*255/i,
      /rgba?\(\s*242\s*,\s*239\s*,\s*230/i, /rgba?\(\s*142\s*,\s*151\s*,\s*184/i,
      /rgb\(\s*233_180_76/, /rgb\(\s*111_168_255/, /rgb\(\s*242_239_230/, /rgb\(\s*142_151_184/,
      /#7A6BF2/i, /#C3C8DC/i,
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!/\.(tsx?|css|mjs)$/.test(entry)) continue;
        const stripped = noCc(readFileSync(full, 'utf8'));
        for (const rx of retiredLive) {
          if (rx.test(stripped)) offenders.push(`${full}: ${rx}`);
        }
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });
});

describe('phase6 r154 — عائلة الحالة: بئر الطبق الدافئ + ترقيم الهياكل العظمية', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('بئر الخطأ الدافئ: طبق وردة بحلقة حبر دقيقة + عنوان 18/600 (نفس عقد العائلة)', () => {
    const s = cc('src/components/shared/ErrorState.tsx');
    expect(s).toMatch(/size-14 shrink-0 items-center justify-center rounded-lg/);
    expect(s).toContain('bg-[var(--danger-soft)]');
    expect(s).toContain('ring-1 ring-inset ring-[color:var(--danger-ink)]/25');
    expect(s).toMatch(/text-lg font-semibold leading-snug text-foreground/);
    // a11y contract intact: role=alert + retry CTA
    expect(s).toContain('role="alert"');
    expect(s).toContain('variant="orange"');
  });

  it('الهياكل العظمية: طبق 16 للأصداف ونقش الأطباق (rounded-full) للآبار', () => {
    const s = cc('src/components/shared/DashboardSkeletons.tsx');
    // shells land on the plate card rung…
    expect(s).toContain('rounded-lg border border-border/50 bg-card/80');
    expect(s).not.toMatch(/rounded-xl border/);
    // …and the icon/avatar wells become plates
    expect(s).toContain('size-11 rounded-full');
    expect(s).toContain('size-8 rounded-full');
    expect(s).toContain('size-9 rounded-full');
  });

  it('احتياطي /menu بلا مطاعم: حالة فارغة مؤلَّفة (بئر + عنوان + CTA) لا نصين عاريين', () => {
    const s = cc('src/app/(public)/menu/page.tsx');
    expect(s).toContain('<EmptyState');
    expect(s).toContain('icon={UtensilsCrossed}');
    expect(s).toContain('title="لا توجد مطاعم متاحة حالياً"');
    expect(s).toContain('العودة للرئيسية');
    // the honest redirect contract is untouched (demo slug first, then first active)
    expect(s).toContain("const DEMO_SLUG = 'al-waha-cafe-demo'");
  });
});

describe('phase6 r154 — أسطح المالك: القواعد الكاملة (قادة النقاط · أطباق · بالو للفقرات · غسل تراكوتا)', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('قادة النقاط على كل سطح مالي في لوحة المالك (آخر الطلبات · الأكثر طلباً · جدول الطلبات · تفاصيل الطلب · معاملات الولاء · صفوف المنيو)', () => {
    expect(cc('src/app/(protected)/owner/OwnerOrdersList.tsx')).toContain('menu-leader-rule');
    const ot = cc('src/app/(protected)/owner/orders/OrdersTable.tsx');
    expect(ot).toContain('menu-leader-rule');
    // the totals cell + the mobile card BOTH carry the leader
    expect(ot.match(/menu-leader-rule/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const detail = cc('src/app/(protected)/owner/orders/[id]/page.tsx');
    expect(detail).toContain('menu-leader');
    // subtotal + total + item rows — at least three leaders
    expect(detail.match(/menu-leader-rule/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(cc('src/app/(protected)/owner/loyalty/TransactionTable.tsx')).toContain('menu-leader-rule');
    expect(cc('src/app/(protected)/owner/menu/CategoriesList.tsx')).toContain('menu-leader-rule');
  });

  it('بطاقة KPI: بئر الطبق الدائري بحافة تراكوتا + عنوان بالو + أرقام جدولية', () => {
    const k = cc('src/components/shared/KpiCard.tsx');
    expect(k).toContain("'rounded-full p-3 ring-[1.5px] ring-inset ring-[color:var(--accent-solid)]/30");
    expect(k).toContain('font-heading text-xs font-semibold');
    expect(k).toContain('text-3xl font-bold tracking-normal tabular-nums');
    expect(k).not.toContain('rounded-xl');
  });

  it('الجداول: ترويسة بالو صغيرة + غسل صف تراكوتا دافئ (الببدائية + جدول الطلبات)', () => {
    const t = cc('src/components/ui/table.tsx');
    expect(t).toContain('font-heading text-2xs font-semibold');
    expect(t).toContain('hover:bg-orange/5');
    const ot = cc('src/app/(protected)/owner/orders/OrdersTable.tsx');
    expect(ot).toContain('font-heading text-2xs font-semibold');
    expect(ot).toContain('hover:bg-orange/5');
    expect(ot).toContain('rounded-lg border border-border/60 bg-card');
  });

  it('الفلترة: شرائح تراكوتا صلبة (لا تدرج لا توهج) + hover دافئ', () => {
    const f = cc('src/app/(protected)/owner/orders/OrdersFilters.tsx');
    expect(f).toContain("'bg-orange text-orange-foreground shadow-sm'");
    expect(f).not.toContain('bg-gradient-to-r from-orange to-orange/80');
    expect(f).not.toContain('shadow-lg shadow-orange/25');
    expect(f).toContain('hover:border-orange/30 hover:bg-orange-muted/40');
  });

  it('الولاء: حالات فارغة على العائلة الدافئة (نعناع/عنبر) + رمز إحالة بحبر التراكوتا', () => {
    const tx = cc('src/app/(protected)/owner/loyalty/TransactionTable.tsx');
    expect(tx).toContain('tone="sage"');
    expect(tx).not.toContain('rounded-md bg-muted/50');
    const rl = cc('src/app/(protected)/owner/loyalty/ReferrerList.tsx');
    expect(rl).toContain('tone="amber"');
    const qr = cc('src/app/(protected)/owner/loyalty/ReferralQR.tsx');
    expect(qr).toContain("dark: '#8A2B1D'");
    expect(qr).not.toContain("dark: '#000'");
  });

  it('هندسة الطبق 16 على أصداف المالك — صفر rounded-xl حية على البطاقات', () => {
    const files = [
      'src/app/(protected)/owner/page.tsx',
      'src/app/(protected)/owner/OwnerOrdersList.tsx',
      'src/app/(protected)/owner/orders/OrdersTable.tsx',
      'src/app/(protected)/owner/orders/[id]/page.tsx',
      'src/app/(protected)/owner/menu/CategoriesList.tsx',
      'src/app/(protected)/owner/restaurants/page.tsx',
      'src/app/(protected)/owner/reviews/page.tsx',
      'src/app/(protected)/owner/loyalty/page.tsx',
      'src/app/(protected)/owner/loyalty/ReferralQR.tsx',
      'src/app/(protected)/owner/qr/page.tsx',
      'src/app/(protected)/owner/OwnerShell.tsx',
      'src/app/(protected)/owner/settings/page.tsx',
      'src/app/(protected)/owner/OwnerCharts.tsx',
    ];
    for (const f of files) {
      expect(cc(f), f).not.toContain('rounded-xl');
    }
  });
});

describe('phase6 r154 — أسطح الأدمن: القواعد الكاملة (قادة النقاط · أطباق · بالو للفقرات · غسل تراكوتا)', () => {
  const noCc = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const cc = (p: string) => noCc(raw(p));

  it('قادة النقاط على كل صف مالي في سكك الأدمن (بطاقات الطلبات · ملخص تفاصيل الطلب وسطور الأصناف · مبلغ الاشتراكات · صفوف منيو الأدمن)', () => {
    expect(cc('src/app/(protected)/admin/orders/page.tsx')).toContain('menu-leader-rule');
    const detail = cc('src/app/(protected)/admin/orders/[id]/page.tsx');
    expect(detail).toContain('menu-leader');
    // subtotal + total + item rows — at least three leaders
    expect(detail.match(/menu-leader-rule/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    // the subscriptions amount row is a full leader line (totals showcase)
    expect(cc('src/app/(protected)/admin/subscriptions/page.tsx')).toContain('menu-leader-rule');
    expect(cc('src/app/(protected)/admin/menu/page.tsx')).toContain('menu-leader-rule');
  });

  it('الجداول: ترويسة بالو صغيرة + غسل صف تراكوتا دافئ + صدفة الطبق (المستخدمون + سجل التدقيق)', () => {
    const u = cc('src/app/(protected)/admin/users/page.tsx');
    expect(u).toContain('font-heading text-2xs font-semibold');
    expect(u).toContain('hover:bg-orange/5');
    expect(u).toContain('rounded-lg border border-border/60 bg-card');
    const a = cc('src/app/(protected)/admin/audit-logs/page.tsx');
    expect(a).toContain('font-heading text-2xs font-semibold');
    expect(a).toContain('hover:bg-orange/5');
    expect(a).toContain('rounded-lg border border-border/30 bg-card/50');
  });

  it('الفلترة: شرائح تراكوتا صلبة (لا تدرج لا توهج) + خمول بحدود دافئة (تبويبات الطلبات · حبوب التدقيق · حبوب أحداث النظام)', () => {
    const o = cc('src/app/(protected)/admin/orders/page.tsx');
    // the TABS ride double-quoted className literals — pin the fill, not the quotes
    expect(o).toContain('"bg-orange text-orange-foreground shadow-sm"');
    expect(o).not.toContain('bg-gradient-to-r from-orange to-orange/80 text-orange-foreground shadow-lg');
    expect(o).toContain('hover:bg-orange-muted/40');
    const a = cc('src/app/(protected)/admin/audit-logs/page.tsx');
    expect(a).toContain("'bg-orange text-orange-foreground shadow-sm'");
    expect(a).not.toContain("'bg-muted text-muted-foreground hover:bg-muted/80'");
    const s = cc('src/app/(protected)/admin/system-events/client.tsx');
    expect(s).toContain("'bg-orange text-orange-foreground shadow-sm'");
    expect(s).toContain('hover:bg-orange-muted/40');
  });

  it('بطاقات الإحصاء: طبق 16 + عنوان بالو + بئر أيقونة دائري (اللوحة · الاشتراكات · المستخدمين · المسؤولين · منيو الأدمن)', () => {
    const stats = [
      'src/app/(protected)/admin/page.tsx',
      'src/app/(protected)/admin/orders/page.tsx',
      'src/app/(protected)/admin/subscriptions/page.tsx',
      'src/app/(protected)/admin/users/page.tsx',
      'src/app/(protected)/admin/admins/page.tsx',
      'src/app/(protected)/admin/menu/page.tsx',
    ];
    for (const f of stats) {
      expect(cc(f), f).toContain('font-heading text-xs font-semibold');
      expect(cc(f), f).toContain('rounded-lg');
    }
    expect(cc('src/app/(protected)/admin/restaurants/RestaurantTable.tsx')).toContain(
      'rounded-full bg-gradient-to-br flex items-center justify-center'
    );
  });

  it('حوار نموذج المطعم: صفر تجاوزات خارج القانون (طبق 16 + تاج التراكوتا يملكه البدائي، لا rounded-md/max-w-lg)', () => {
    const d = cc('src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx');
    expect(d).toContain('<DialogContent className="max-h-[85dvh] overflow-y-auto">');
    expect(d).not.toContain('rounded-md max-h-[85dvh]');
    expect(d).not.toContain('max-w-lg');
    expect(d).not.toContain('rounded-xl');
  });

  it('هندسة الطبق 16 على أصداف الأدمن — صفر rounded-xl حية', () => {
    const files = [
      'src/app/(protected)/admin/page.tsx',
      'src/app/(protected)/admin/AdminShell.tsx',
      'src/app/(protected)/admin/orders/page.tsx',
      'src/app/(protected)/admin/orders/[id]/page.tsx',
      'src/app/(protected)/admin/restaurants/page.tsx',
      'src/app/(protected)/admin/restaurants/RestaurantTable.tsx',
      'src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx',
      'src/app/(protected)/admin/users/page.tsx',
      'src/app/(protected)/admin/admins/page.tsx',
      'src/app/(protected)/admin/subscriptions/page.tsx',
      'src/app/(protected)/admin/telegram/page.tsx',
      'src/app/(protected)/admin/telegram/TelegramConfigSection.tsx',
      'src/app/(protected)/admin/telegram/BroadcastTargetsSection.tsx',
      'src/app/(protected)/admin/telegram/DiagnosticsSection.tsx',
      'src/app/(protected)/admin/settings/page.tsx',
      'src/app/(protected)/admin/audit-logs/page.tsx',
      'src/app/(protected)/admin/menu/page.tsx',
      'src/app/(protected)/admin/qr/page.tsx',
      'src/components/admin/ConfigEditor.tsx',
    ];
    for (const f of files) {
      expect(cc(f), f).not.toContain('rounded-xl');
    }
  });
});

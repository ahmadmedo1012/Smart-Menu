/**
 * test(r125 → r126) — Madarek parity snapshot: pin the canonical design tokens.
 * (Task 11-a, Wave B; source of truth: madarek/frontend/src/styles/tokens.css
 * + download/madarek-reference-digest.md — §1 dark · §2 light · §3 radius ·
 * §4 motion · §5 elevation.)
 *
 * WHAT THIS FILE IS
 * ─────────────────
 * A CI-able snapshot of the Madarek canonical values, asserted against
 * src/app/globals.css (the repo's single token file). Madarek carries its own
 * snapshot suite; the four siblings did not — this closes that gap so any
 * future token edit that drifts from the SSOT fails `pnpm test` immediately,
 * with a message naming the exact token and both values.
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
 *   - the 12-face IBM Plex @font-face manifest (family/weight/style/display/
 *     unicode-range per face) + on-disk existence of every woff2
 *     (public/fonts/fonts.css);
 *   - the full prefers-contrast: more port (15 tokens × 2 themes) and the
 *     prefers-reduced-motion token zeroing;
 *   - CONSUMPTION gates (smart-order's r126 pattern): pinned tokens must
 *     have ≥1 real consumer — definitions without adoption were the exact
 *     debt class the P4-A1 audit found.
 *
 * HOW IT READS THE CSS
 * ─────────────────────
 * - Only the theme blocks matter: :root (night, the default) and .light
 *   (paper) — extracted brace-matched from the TOP LEVEL so @media
 *   (prefers-contrast / reduced-motion) overrides can never mask the resting
 *   values.
 * - The light scope is the real cascade: {.light} overlays {:root}; tokens
 *   .light does not redefine (radius, motion, …) inherit :root.
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

const dark = parseDecls(topLevelBlock(css, ':root'));
// real cascade: .light overlays :root; everything else inherits
const light: Record<string, string> = { ...dark, ...parseDecls(topLevelBlock(css, '.light')) };
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

// ── canonical snapshot (madarek tokens.css, live-verified) ──────────────────

const GROUNDS_DARK: Record<string, string> = {
  '--bg': '#070B16', // neutral-50 night
  '--bg-soft': '#121A36',
  '--surface': '#0D1428', // neutral-0
  '--surface-2': '#121A36',
  '--surface-3': '#182142',
  '--text': '#F2EFE6', // neutral-900 sand
  '--text-secondary': '#C3C8DC',
  '--text-muted': '#8E97B8',
  '--text-faint': '#7A83A0',
  '--border': '#1B2444', // neutral-200 hairline (family token)
  '--border-strong': '#263052',
};
const GROUNDS_LIGHT: Record<string, string> = {
  '--bg': '#FBFAF9', // neutral-50 cream
  '--bg-soft': '#F7F6F3',
  '--surface': '#FFFFFF',
  '--surface-2': '#F7F6F3',
  '--surface-3': '#F1EFEC',
  '--text': '#191918',
  '--text-secondary': '#4F4D48',
  '--text-muted': '#6E6C65', // WCAG literal (not neutral-500) — Madarek T3-F4
  '--text-faint': '#74706A', // WCAG literal
  '--border': '#E9E7E2',
  '--border-strong': '#D9D6D0',
};
const ACCENT_DARK: Record<string, string> = {
  '--accent-solid': '#E9B44C', // Madarek --accent (their --accent is the 15% wash twin)
  '--accent-hover': '#F5D48A',
  '--accent-soft': '#2C2312', // resolves var(--c-copper-bg)
  '--accent-strong': '#C9962F',
  '--accent-fg': '#05070F',
  '--accent-ink': '#E9B44C',
};
const ACCENT_LIGHT: Record<string, string> = {
  '--accent-solid': '#B57438',
  '--accent-hover': '#9A5F25',
  '--accent-soft': '#F4E4D2',
  '--accent-strong': '#5C3416',
  '--accent-fg': '#1A0F06',
  '--accent-ink': '#5C3416',
};
const STATUS_DARK: Record<string, string> = {
  '--success': '#7FD39A', '--success-soft': '#0F241C', '--success-ink': '#7FD39A',
  '--warning': '#ECC97D', '--warning-soft': '#2C2410', '--warning-ink': '#ECC97D',
  '--danger': '#F0938F', '--danger-soft': '#2C1620', '--danger-ink': '#F0938F',
  '--danger-fg': '#05070F',
  '--info': '#8FBBF2', '--info-soft': '#14213A', '--info-ink': '#8FBBF2',
};
const STATUS_LIGHT: Record<string, string> = {
  '--success': '#4FA66D', '--success-soft': '#DCF1E2', '--success-ink': '#1F4F30',
  '--warning': '#D6A330', '--warning-soft': '#FCF1CD', '--warning-ink': '#6B4C0B',
  '--danger': '#DD6E78', '--danger-soft': '#FCE0E2', '--danger-ink': '#6B2128',
  '--danger-fg': '#191918',
  '--info': '#5C8FCE', '--info-soft': '#DDEBF7', '--info-ink': '#1F3D63',
};
const FAMILIES_DARK: Record<string, [string, string, string]> = {
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
const FAMILIES_LIGHT: Record<string, [string, string, string]> = {
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
const RADIUS: Record<string, string> = {
  '--r-xs': '6px', '--r-sm': '8px', '--r-md': '10px', '--r-lg': '12px',
  '--r-xl': '16px', '--r-2xl': '20px', '--r-3xl': '28px', '--r-full': '9999px',
};
const MOTION: Record<string, string> = {
  '--t-micro': '80ms', '--t-fast': '160ms', '--t-base': '240ms',
  '--t-slow': '380ms', '--t-slower': '520ms', '--t-cinema': '720ms',
  '--motion-duration-page': '320ms', '--motion-duration-reveal': '360ms',
  '--motion-duration-stat': '700ms', '--motion-duration-skeleton': '1200ms',
};
const ELEV_DARK: Record<string, string> = {
  '--elev-1': '0 1px 2px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)',
  '--elev-2': '0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  '--elev-3': '0 8px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
  '--elev-4': '0 16px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
  '--elev-5': '0 32px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
};
const ELEV_LIGHT: Record<string, string> = {
  '--elev-1': '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.06)',
  '--elev-2': '0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
  '--elev-3': '0 8px 16px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.05)',
  '--elev-4': '0 16px 32px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
  '--elev-5': '0 32px 64px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.08)',
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

describe('r125 Madarek parity — glass ground (§1.8)', () => {
  it('dark rgba(11,16,32,0.78) · light rgba(251,250,249,0.78)', () => {
    pin(dark, 'glass', '--glass-bg', 'rgba(11, 16, 32, 0.78)');
    pin(light, 'glass', '--glass-bg', 'rgba(251, 250, 249, 0.78)');
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
const THEME_RADIUS_BRIDGE: Record<string, string> = {
  '--radius-xs': '6px', '--radius-sm': '8px', '--radius-md': '10px',
  '--radius-lg': '12px', '--radius-xl': '16px', '--radius-2xl': '20px',
  '--radius-3xl': '28px',
};
const THEME_FONTS: Record<string, string> = {
  // resolved through the @theme scope: --font-sans/-arabic keep their leading
  // var(--font-cairo) reference (no fallback arg — the shim lives in
  // :root/fonts.css), while --font-heading's var(--font-cairo, "Cairo")
  // resolves its fallback here. Pinning the RESOLVED stacks proves both
  // chain shapes are well-formed.
  '--font-sans': 'var(--font-cairo), "Cairo", "Noto Sans Arabic", system-ui, sans-serif',
  '--font-mono': '"IBM Plex Mono", "IBM Plex Sans Arabic", ui-monospace, "Courier New", monospace',
  '--font-arabic': 'var(--font-cairo), "Cairo", "Noto Sans Arabic", system-ui, sans-serif',
  '--font-heading': '"IBM Plex Sans Arabic", "Cairo", "Noto Sans Arabic", system-ui, sans-serif',
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
  it('radius: rounded-xs..3xl carry the Madarek 6..28 ladder', () => {
    for (const [token, value] of Object.entries(THEME_RADIUS_BRIDGE)) {
      pin(theme, 'theme', token, value);
    }
  });
  it('font stacks: IBM Plex Sans Arabic is THE family (sans/arabic/heading), Plex Mono for digits', () => {
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
  it('dark: --ring #C9962F + --state-focus-ring-* 2px/2px + shorthand + input halo', () => {
    pin(dark, 'focus-dark', '--ring', '#C9962F'); // --accent-strong, 7.87:1 on night
    pin(dark, 'focus-dark', '--state-focus-ring-color', '#C9962F'); // resolves var(--accent-strong)
    pin(dark, 'focus-dark', '--state-focus-ring-width', '2px');
    pin(dark, 'focus-dark', '--state-focus-ring-offset', '2px');
    pin(
      dark,
      'focus-dark',
      '--state-focus-ring',
      // pinned RESOLVED — proves the shorthand chain (width × color) resolves
      // to the live 2px × --accent-strong ring in the dark cascade
      '0 0 0 2px #C9962F'
    );
    pin(
      dark,
      'focus-dark',
      '--state-input-focus-halo',
      // pinned RESOLVED — the halo chain lands on the live dark accent
      '0 0 0 3px color-mix(in srgb, #E9B44C 22%, transparent)'
    );
  });
  it('light: --ring #5C3416 (10.29:1) + inherited width/offset (no dark-only drift)', () => {
    pin(light, 'focus-light', '--ring', '#5C3416');
    pin(light, 'focus-light', '--state-focus-ring-color', '#5C3416'); // light --accent-strong
    pin(light, 'focus-light', '--state-focus-ring-width', '2px'); // inherited from :root
    pin(light, 'focus-light', '--state-focus-ring-offset', '2px'); // inherited from :root
  });
});

// ── r126: z-order ladder (audit B4/J-1 — the float/modal layering) ──────────

const Z_LADDER: Record<string, string> = {
  '--z-base': '0',
  '--z-dropdown': '100',
  '--z-popover': '200',
  '--z-tooltip': '250',
  '--z-sheet': '300',
  '--z-modal': '400',
  '--z-toast': '500',
  '--z-lightbox': '600',
};

describe('r126 parity — z-order ladder (§1.11, theme-independent :root)', () => {
  it('8 rungs 0/100/200/250/300/400/500/600 in both cascades (floats never cover modals)', () => {
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

// ── r126: the 12-face IBM Plex manifest (fonts.css + on-disk woff2) ─────────

const FONT_MANIFEST: ReadonlyArray<readonly [file: string, family: string, weight: string, style: string]> = [
  ['plex-sans-arabic-400-normal-arabic.woff2', 'IBM Plex Sans Arabic', '400', 'normal'],
  ['plex-sans-arabic-500-normal-arabic.woff2', 'IBM Plex Sans Arabic', '500', 'normal'],
  ['plex-sans-arabic-600-normal-arabic.woff2', 'IBM Plex Sans Arabic', '600', 'normal'],
  ['plex-sans-arabic-700-normal-arabic.woff2', 'IBM Plex Sans Arabic', '700', 'normal'],
  ['plex-sans-arabic-400-normal-latin.woff2', 'IBM Plex Sans Arabic', '400', 'normal'],
  ['plex-sans-arabic-500-normal-latin.woff2', 'IBM Plex Sans Arabic', '500', 'normal'],
  ['plex-sans-arabic-600-normal-latin.woff2', 'IBM Plex Sans Arabic', '600', 'normal'],
  ['plex-sans-arabic-700-normal-latin.woff2', 'IBM Plex Sans Arabic', '700', 'normal'],
  ['plex-serif-400-italic-latin.woff2', 'IBM Plex Serif', '400', 'italic'],
  ['plex-serif-500-italic-latin.woff2', 'IBM Plex Serif', '500', 'italic'],
  ['plex-mono-400-normal-latin.woff2', 'IBM Plex Mono', '400', 'normal'],
  ['plex-mono-500-normal-latin.woff2', 'IBM Plex Mono', '500', 'normal'],
];

describe('r126 parity — the 12-face IBM Plex manifest (public/fonts/fonts.css)', () => {
  it('declares exactly 12 Plex faces (Cairo/Noto/Readex fallbacks ride alongside)', () => {
    const plexFaces = fontFaces.filter((b) => /url\(['"]\/fonts\/plex-/.test(b));
    expect(
      plexFaces.length,
      'the IBM Plex manifest must declare exactly 12 faces'
    ).toBe(12);
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

const CONTRAST_DARK: Record<string, string> = {
  '--elev-1': '0 0 0 1px rgba(255,255,255,0.36)',
  '--elev-2': '0 0 0 1.5px rgba(255,255,255,0.44)',
  '--elev-3': '0 0 0 2px rgba(255,255,255,0.52)',
  '--elev-4': '0 0 0 2.5px rgba(255,255,255,0.60)',
  '--elev-5': '0 0 0 3px rgba(255,255,255,0.68)',
  '--glass-bg': 'var(--surface)', // glass goes SOLID under increased contrast
  '--glass-bg-strong': 'var(--surface)',
  '--glass-border': 'rgba(255,255,255,0.36)',
  '--glass-border-strong': 'rgba(255,255,255,0.64)',
  '--surface-border': 'rgba(255,255,255,0.36)',
  '--surface-divider': 'rgba(255,255,255,0.24)',
  '--border': 'rgba(255,255,255,0.48)',
  '--border-strong': 'rgba(255,255,255,0.64)',
  '--input': 'rgba(255,255,255,0.48)',
  '--rule': 'rgba(255,255,255,0.48)',
};
const CONTRAST_LIGHT: Record<string, string> = {
  '--elev-1': '0 0 0 1px rgba(0,0,0,0.32)',
  '--elev-2': '0 0 0 1.5px rgba(0,0,0,0.40)',
  '--elev-3': '0 0 0 2px rgba(0,0,0,0.48)',
  '--elev-4': '0 0 0 2.5px rgba(0,0,0,0.56)',
  '--elev-5': '0 0 0 3px rgba(0,0,0,0.64)',
  '--glass-bg': 'var(--surface)',
  '--glass-bg-strong': 'var(--surface)',
  '--glass-border': 'rgba(0,0,0,0.32)',
  '--glass-border-strong': 'rgba(0,0,0,0.60)',
  '--surface-border': 'rgba(0,0,0,0.32)',
  '--surface-divider': 'rgba(0,0,0,0.20)',
  '--border': 'rgba(0,0,0,0.42)',
  '--border-strong': 'rgba(0,0,0,0.60)',
  '--input': 'rgba(0,0,0,0.42)',
  '--rule': 'rgba(0,0,0,0.42)',
};

describe('r126 parity — prefers-contrast: more port (WCAG 1.4.11)', () => {
  it('dark: elevations collapse to luminous solid rings, glass goes solid, hairlines strengthen', () => {
    const contrastMedia = topLevelBlock(css, '@media (prefers-contrast: more)');
    const scope = parseDecls(topLevelBlock(contrastMedia, ':root'));
    for (const [token, value] of Object.entries(CONTRAST_DARK)) {
      pin(scope, 'contrast-dark', token, value);
    }
  });
  it('light: the same port with ink solid rings', () => {
    const contrastMedia = topLevelBlock(css, '@media (prefers-contrast: more)');
    const scope = parseDecls(topLevelBlock(contrastMedia, 'html.light'));
    for (const [token, value] of Object.entries(CONTRAST_LIGHT)) {
      pin(scope, 'contrast-light', token, value);
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
    'the sonner Toaster rides the --z-toast rung in BOTH layouts (pinned off its 999999999 default)',
    () =>
      publicLayoutRaw.includes("zIndex: 'var(--z-toast, 500)'") &&
      protectedLayoutRaw.includes("zIndex: 'var(--z-toast, 500)'"),
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
    'the Button primitive consumes the motion ladder (duration-[var(--t-fast)] + before:duration-cinema + after:duration-slower)',
    () =>
      buttonRaw.includes('duration-[var(--t-fast,160ms)]') &&
      buttonRaw.includes('before:duration-cinema') &&
      buttonRaw.includes('after:duration-slower'),
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
  it('text-2xs ≥40 TSX consumers across src/ (48 at r127-F4)', () => {
    expect((srcTextR127.match(/\btext-2xs\b/g) ?? []).length).toBeGreaterThanOrEqual(40);
  });
  it('text-3xs ≥40 TSX consumers across src/ (48 at r127-F4)', () => {
    expect((srcTextR127.match(/\btext-3xs\b/g) ?? []).length).toBeGreaterThanOrEqual(40);
  });
});

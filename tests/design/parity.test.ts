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
  // r129 token-matrix fix: the canonical Madarek stacks verbatim
  // (tokens.css:47-50). --font-sans/-arabic are the full canonical chain
  // (Tajawal + system-ui + -apple-system + Segoe UI + Roboto tail);
  // --font-display is the canonical display stack, with --font-heading
  // as its bridge twin; --font-mono is the canonical mono stack (the
  // mixed-script Sans-Arabic mono fallback lives only in the landing
  // layer's --ln-mono, byte-equal to Madarek landing.css:54).
  '--font-sans': '"IBM Plex Sans Arabic", "Tajawal", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--font-mono': '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
  '--font-arabic': '"IBM Plex Sans Arabic", "Tajawal", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--font-display': '"IBM Plex Sans Arabic", system-ui, sans-serif',
  '--font-heading': '"IBM Plex Sans Arabic", system-ui, sans-serif',
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

// ── r128-F5 landing Orbit-Ink layer pins (PORT-KIT §1/§3/§7; F1a/F1b) ────────
// The landing world lives in src/app/landing.css, scoped `.landing` (kit §7
// discipline: everything behind the wrapper, product tokens untouched). These
// pins lock the PORT-KIT contract so a future edit can't silently drift the
// layer: the §1 token block VERBATIM (grounds, accents, hairlines, grain,
// pill/h1, t/ease aliases, marquee duration), the §3 marquee seam math, the
// --sp scrub consumers, the canonical scroll-spy selectors (the Madarek
// source shipped them mangled — this port must never regress to that), the
// grain veil, the RM off-switch, and the SCOPE ISOLATION: no --ln-* token may
// ever leak into a product surface, and landing.css may be imported by the
// landing page alone.

const landingCssRaw = readFileSync('src/app/landing.css', 'utf8');
const landingCss = landingCssRaw.replace(/\/\*[\s\S]*?\*\//g, ' ');

// merge ALL top-level `.landing` blocks in cascade order (the R6 additions
// overlay the §1 token block; parseDecls keeps the last write per token)
const landingBlocks = allTopLevelBlocks(landingCss, '.landing');
const landingDecls: Record<string, string> = {};
for (const block of landingBlocks) Object.assign(landingDecls, parseDecls(block));
const landingTokenBlock = landingBlocks.find((b) => b.includes('--ln-ink'));

/** plain (non-custom) declaration lookup inside one rule block */
function decl(block: string | undefined, prop: string): string | undefined {
  if (!block) return undefined;
  const m = block.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`));
  return m?.[1].trim();
}
const landingRule = (selector: string) =>
  allTopLevelBlocks(landingCss, selector)[0];

describe('r128 parity — landing Orbit-Ink token block (PORT-KIT §1 verbatim)', () => {
  it.each([
    ['--ln-ink', '#252A3E'],
    ['--ln-ink-2', '#1C2032'],
    ['--ln-cream', '#F5F3E7'],
    ['--ln-cream-dim', '#C9C6B4'],
    ['--ln-lime', '#DFEDB2'],
    ['--ln-lime-deep', '#B9D778'],
    ['--ln-violet', '#7A6BF2'],
    ['--ln-violet-deep', '#4E2FB8'],
    ['--ln-line', 'rgba(245,243,231,0.14)'],
    ['--ln-line-soft', 'rgba(245,243,231,0.07)'],
    ['--ln-grain-op', '0.075'],
    ['--ln-radius-pill', 'var(--r-full)'],
    ['--ln-h1', 'clamp(2.75rem, 8.2vw, 6.75rem)'],
    ['--ln-h1-lh', '1.04'],
    ['--ln-t-fast', 'var(--t-fast)'],
    ['--ln-t-base', 'var(--t-base)'],
    ['--ln-t-slow', 'var(--t-slow)'],
    ['--ln-t-cinema', 'var(--t-cinema)'],
    ['--ln-t-reveal', 'var(--motion-duration-reveal)'],
    ['--ln-ease', 'var(--ease)'],
    ['--ln-ease-out', 'var(--ease-out)'],
    ['--ln-ease-soft', 'var(--ease-soft)'],
    ['--ln-ease-spring', 'var(--ease-spring)'],
    ['--ln-ease-linear', 'var(--ease-linear)'],
    ['--ln-dur-marquee', '42s'],
  ])('%s = %s', (token, expected) => {
    expect(landingDecls[token], `landing.css ${token} drifted from PORT-KIT §1`).toBe(
      expected
    );
  });

  it('.landing base paints Orbit-Ink in both themes (R4: background var(--ln-ink) / color var(--ln-cream))', () => {
    expect(decl(landingTokenBlock, 'background')).toBe('var(--ln-ink)');
    expect(decl(landingTokenBlock, 'color')).toBe('var(--ln-cream)');
  });

  it('.ln-hero-title rides the --ln-h1 clamp + --ln-h1-lh line-height', () => {
    const hero = landingRule('.landing .ln-hero-title');
    expect(decl(hero, 'font-size')).toBe('var(--ln-h1)');
    expect(decl(hero, 'line-height')).toBe('var(--ln-h1-lh)');
  });
});

describe('r128 parity — landing marquee kit (PORT-KIT §3 + seam contract)', () => {
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

  it('track animation rides the token pair (ln-marquee var(--ln-dur-marquee) var(--ln-ease-linear) infinite)', () => {
    expect(decl(landingRule('.landing .ln-marquee-track'), 'animation')).toBe(
      'ln-marquee var(--ln-dur-marquee) var(--ln-ease-linear) infinite'
    );
  });

  it('marquee band is flat: hairline border-block var(--ln-line) on ground var(--ln-ink), no gradient', () => {
    const band = landingRule('.landing .ln-marquee');
    expect(decl(band, 'border-block')).toBe('1px solid var(--ln-line)');
    expect(decl(band, 'background')).toBe('var(--ln-ink)');
    expect(landingCss.slice(landingCss.indexOf('.landing .ln-marquee {'))).not.toMatch(
      /\.landing \.ln-marquee\s*{[^}]*gradient/
    );
  });

  it('prefers-reduced-motion kills the marquee (animation: none off-switch)', () => {
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    const off = prmBlocks.some(
      (b) => b.includes('.landing .ln-marquee-track') && /animation:\s*none/.test(b)
    );
    expect(off, 'the marquee RM off-switch was lost').toBe(true);
  });
});

describe('r128 parity — landing --sp scrub consumers + scroll-spy', () => {
  it('.ln-journey-path-light scrubs stroke-dashoffset: calc(1 - var(--sp, 0))', () => {
    expect(decl(landingRule('.landing .ln-journey-path-light'), 'stroke-dashoffset')).toBe(
      'calc(1 - var(--sp, 0))'
    );
  });

  it('--sp consumption scale: ≥60 var(--sp) readers in the landing layer (66 at r128-F1b)', () => {
    expect((landingCss.match(/var\(--sp/g) ?? []).length).toBeGreaterThanOrEqual(60);
  });

  it.each(['trust', 'categories', 'journey', 'progress', 'restaurants', 'roles'])(
    'scroll-spy: header[data-active-section="%s"] highlights .landing-nav-link[href="#%s"] in CANONICAL form',
    (id) => {
      // the Madarek source shipped these selectors mangled (missing "[h") and
      // browsers dropped them wholesale — this pin guards the restored form
      expect(landingCss).toContain(
        `.landing header[data-active-section="${id}"] .landing-nav-link[href="#${id}"]`
      );
    }
  );
});

describe('r128 parity — landing grain veil + scope isolation (kit §7)', () => {
  it('.ln-grain veil: fixed, z-index 2000, opacity var(--ln-grain-op), 200px stitchable tile', () => {
    const grain = landingRule('.landing .ln-grain');
    expect(decl(grain, 'position')).toBe('fixed');
    expect(decl(grain, 'z-index')).toBe('2000');
    expect(decl(grain, 'opacity')).toBe('var(--ln-grain-op)');
    expect(decl(grain, 'background-size')).toBe('200px 200px');
  });

  it('r129: grain 0.075 canonical (P3-22 landing override, Madarek landing.css:58)', () => {
    expect(landingCssRaw.includes('--ln-grain-op:   0.075')).toBe(true);
    expect(landingCssRaw.includes('--ln-grain-op:   0.05;')).toBe(false);
  });

  it('r129: ONE texture veil inside .landing — legacy .grain-overlay suppressed', () => {
    expect(
      /\.landing \.grain-overlay \{\s*display:\s*none;?\s*\}/.test(landingCss)
    ).toBe(true);
  });

  it('scope isolation: globals.css (the product token file) declares ZERO --ln-* tokens', () => {
    expect(css.includes('--ln-'), 'a --ln-* token leaked into the product layer').toBe(
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
const orbitSceneRaw = raw('src/components/landing/OrbitScene.tsx');
const categoriesRaw = raw('src/components/landing/CategoriesSection.tsx');
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
    // the layout's main is the ONE landmark (exactly one declaration)
    expect((publicLayoutRaw.match(/<main id="main-content">/g) ?? []).length).toBe(1);
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

describe('r129 parity — P1: lime roster + mobile density + in-world focus', () => {
  it('constellation roster: idle pins are flat cream 0.65 — lime reserved for the ONE hovered/focused pin', () => {
    // canonical CollegeConstellation.tsx:50-54 + landing.css:897-900
    expect(categoriesRaw).toContain('const DOT_IDLE = "rgba(245,243,231,0.65)"');
    expect(categoriesRaw).toContain('const DOT_LIME = "var(--ln-lime, #DFEDB2)"');
    // negative: no always-lime --dot default — the paint is state-driven
    expect(categoriesRaw).not.toMatch(/["']--dot["']\s*:\s*DOT_LIME\b/);
    expect(ruleBlock(landingCss, '.landing .ln-constellation-dot:hover')).toContain(
      'background: var(--ln-lime)'
    );
  });

  it('constellation resting life: .is-resting scale(1.45) + flat cream ring + the 4s RM-gated IO-paused cycle', () => {
    expect(decl(landingRule('.landing .ln-constellation-dot.is-resting'), 'transform')).toBe(
      'scale(1.45)'
    );
    expect(
      decl(landingRule('.landing .ln-constellation-dot.is-resting'), 'box-shadow')
    ).toBe('0 0 0 4px rgb(245 243 231 / 0.1)');
    expect(categoriesRaw).toContain('const REST_CYCLE_MS = 4000');
    expect(categoriesRaw).toContain('(prefers-reduced-motion: reduce)');
    expect(categoriesRaw).toContain('IntersectionObserver');
    // canonical idle dot geometry: 8×8 pin + ≥44px hit span
    expect(categoriesRaw).toContain('inlineSize: 8, blockSize: 8');
    expect(categoriesRaw).toMatch(/inlineSize: 44/);
  });

  it('≤768 density pass: .ln-chapter clamp(60px, 9vh, 84px) + .ln-chapter-head clamp(24px, 3.5vh, 36px) / sp-4', () => {
    const m768 = allTopLevelBlocks(landingCss, '@media (max-width: 768px)').join('\n');
    expect(m768).toContain('.landing .ln-chapter { padding-block: clamp(60px, 9vh, 84px); }');
    expect(m768).toContain(
      '.landing .ln-chapter-head { margin-block-end: clamp(24px, 3.5vh, 36px); gap: var(--sp-4); }'
    );
  });

  it('universal in-world focus ring: .landing :focus-visible = 2px cream, offset 3px (never the product gold --ring)', () => {
    expect(ruleBlock(landingCss, '.landing :focus-visible')).toContain(
      'outline: 2px solid var(--ln-cream)'
    );
    expect(ruleBlock(landingCss, '.landing :focus-visible')).toContain('outline-offset: 3px');
    // P4-09: the button rings survive explicitly (canonical 1971-1977)
    expect(ruleBlock(landingCss, '.landing .ln-btn-gold:focus-visible')).toContain(
      'outline: 2px solid var(--ln-cream)'
    );
    expect(ruleBlock(landingCss, '.landing .ln-btn-ghost:focus-visible')).toContain(
      'outline: 2px solid var(--ln-cream)'
    );
  });
});

describe('r129 parity — P2 value rows (measures · landscape · 1080 · depth · safe-area)', () => {
  it('measures ride the canonical P4-10 effective values: hero-title 20ch / hero-sub 72ch / chapter-lede 72ch / cta-lede 72ch', () => {
    expect(decl(landingRule('.landing .ln-hero-title'), 'max-inline-size')).toBe('20ch');
    expect(decl(landingRule('.landing .ln-hero-sub'), 'max-inline-size')).toBe('72ch');
    expect(decl(landingRule('.landing .ln-chapter-lede'), 'max-inline-size')).toBe('72ch');
    expect(decl(landingRule('.landing .ln-cta-lede'), 'max-inline-size')).toBe('72ch');
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
    expect(block).toContain('line-height: 1.12');
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

  it('card depth shadows: station/stat cards + role hover 0 1px 2px rgba(0,0,0,0.06); progress visual inset cream 0.04', () => {
    expect(declN(lastRule('.landing .ln-station-card'), 'box-shadow')).toBe(
      '0 1px 2px rgba(0, 0, 0, 0.06)'
    );
    expect(declN(lastRule('.landing .ln-stat'), 'box-shadow')).toBe('0 1px 2px rgba(0, 0, 0, 0.06)');
    expect(declN(lastRule('.landing .ln-role-row:hover'), 'box-shadow')).toBe(
      '0 1px 2px rgba(0, 0, 0, 0.06)'
    );
    expect(declN(lastRule('.landing .ln-progress-visual'), 'box-shadow')).toBe(
      'inset 0 1px 0 rgba(245, 243, 231, 0.04)'
    );
  });

  it('mobile drawer safe-area: env(safe-area-inset-bottom, var(--sp-4)) @≤920', () => {
    const m920 = allTopLevelBlocks(landingCss, '@media (max-width: 920px)').join('\n');
    expect(m920).toContain(
      '.landing .landing-mobile-menu { padding-block-end: env(safe-area-inset-bottom, var(--sp-4)); }'
    );
  });

  it('RM press neutralizer: .ln-btn-gold:active { transform: none; background: var(--ln-lime-deep) } under prefers-reduced-motion', () => {
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    const off = prmBlocks.some(
      (b) =>
        b.includes('.landing .ln-btn-gold:active') &&
        /transform:\s*none/.test(b) &&
        /background:\s*var\(--ln-lime-deep\)/.test(b)
    );
    expect(off, 'the RM press neutralizer (canonical P4-07) was lost').toBe(true);
  });

  it('hover micro-verbs: scroll-line scaleY(1.3) + footer-link 2px underline @4px offset', () => {
    expect(ruleBlock(landingCss, '.landing .ln-hero-scroll:hover .ln-hero-scroll-line')).toContain(
      'transform: scaleY(1.3)'
    );
    expect(lastRule('.landing .landing-footer-link:hover')).toContain(
      'text-decoration: underline'
    );
    expect(lastRule('.landing .landing-footer-link:hover')).toContain(
      'text-decoration-thickness: 2px'
    );
    expect(lastRule('.landing .landing-footer-link:hover')).toContain(
      'text-underline-offset: 4px'
    );
  });

  it('≤390 trust band tightening (gap sp-3, 12.5px)', () => {
    const m390 = allTopLevelBlocks(landingCss, '@media (max-width: 390px)')[0];
    expect(m390).toContain('.landing .ln-trust-inner { gap: var(--sp-3); font-size: 12.5px; }');
  });

  it('in-world skip link: lime pill z 2100 above the grain + the shell pill hides while the landing is mounted', () => {
    const skip = landingRule('.landing .ln-skip-link');
    expect(decl(skip, 'z-index')).toBe('2100');
    expect(decl(skip, 'background')).toBe('var(--ln-lime)');
    expect(decl(skip, 'color')).toBe('var(--ln-ink)');
    expect(landingCss).toContain('body:has(> .landing) > a[href="#main-content"]');
    expect(homePageRaw).toContain('className="ln-skip-link"');
  });

  it('header CTA family: canonical .btn re-skin values — 44px pills, --ln-line hairline, quiet 0.05 tint hover', () => {
    expect(decl(landingRule('.landing .landing-header-cta .ln-btn-ghost'), 'min-block-size')).toBe(
      '44px'
    );
    expect(
      decl(landingRule('.landing .landing-header-cta .ln-btn-ghost'), 'border-color')
    ).toBe('var(--ln-line)');
    expect(
      decl(landingRule('.landing .landing-header-cta .ln-btn-ghost:hover'), 'background')
    ).toBe('rgb(245 243 231 / 0.05)');
    expect(decl(landingRule('.landing .landing-header-cta .ln-btn-gold'), 'min-block-size')).toBe(
      '44px'
    );
  });

  it('chapter titles carry the P4-19 opacity transition (var(--t-slow) var(--ease-out))', () => {
    expect(decl(lastRule('.landing .ln-chapter-title'), 'transition')).toBe(
      'opacity var(--t-slow) var(--ease-out)'
    );
  });
});

describe('r129 parity — hero-sky gradient allowlist + chrome locks (audit §7 #2-#6, #17, #18)', () => {
  it('.ln-hero-sky: the ONE sanctioned violet radial (α 0.10 ≤ 0.12 ceiling) + ::after cream 0.02 breath', () => {
    expect(decl(landingRule('.landing .ln-hero-sky'), 'background')).toBe(
      'radial-gradient(46% 54% at 30% 44%, rgb(122 107 242 / 0.10) 0%, transparent 70%)'
    );
    const after = allTopLevelBlocks(landingCss, '.landing .ln-hero-sky::after')[0];
    expect(after).toContain('radial-gradient(ellipse at 70% 60%, rgba(245,243,231,0.02) 0%, transparent 60%)');
  });

  it('gradient allowlist: ZERO gradient occurrences outside the five sanctioned sites (hero sky ×2, trust/footer scrims, constellation heart)', () => {
    const ALLOWED = [
      '.landing .ln-hero-sky',
      '.landing .ln-hero-sky::after',
      '.landing .ln-trust::before',
      '.landing .landing-footer::before',
      '.landing .ln-constellation-stage',
    ];
    const sites = new Set<string>();
    for (const m of landingCss.matchAll(/([^{}]+)\{[^{}]*gradient/g)) {
      for (const sel of m[1].split(',')) {
        const s = sel.trim();
        if (s && s.endsWith('{') === false) sites.add(s);
      }
    }
    const offenders = [...sites].filter((s) => !ALLOWED.some((a) => s.startsWith(a)));
    expect(offenders, `non-allowlisted gradient sites: ${offenders.join(', ')}`).toEqual([]);
  });

  it('.ln-btn-gold:active composes translate(var(--mag-x,0), var(--mag-y,0)) scale(var(--press-scale,0.97))', () => {
    expect(decl(lastRule('.landing .ln-btn-gold:active'), 'transform')).toBe(
      'translate(var(--mag-x, 0), var(--mag-y, 0)) scale(var(--press-scale, 0.97))'
    );
  });

  it('.ln-btn-gold shadow triple (rest) + the canonical hover lift', () => {
    expect(declN(landingRule('.landing .ln-btn-gold'), 'box-shadow')).toBe(
      '0 1px 2px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(245, 243, 231, 0.08)'
    );
    expect(decl(landingRule('.landing .ln-btn-gold:hover'), 'transform')).toBe(
      'translate(var(--mag-x, 0), calc(var(--mag-y, 0) - 1px))'
    );
  });

  it('.landing-header.scrolled = solid ink-2 @ 92% + --ln-line hairline', () => {
    expect(decl(landingRule('.landing .landing-header.scrolled'), 'background')).toBe(
      'rgb(28 32 50 / 0.92)'
    );
    expect(decl(landingRule('.landing .landing-header.scrolled'), 'border-block-end-color')).toBe(
      'var(--ln-line)'
    );
  });

  it('.landing-progress ribbon: fixed / 2px / z-90, bar = calc(var(--p,0) * 100%) flat cream', () => {
    const ribbon = landingRule('.landing .landing-progress');
    expect(decl(ribbon, 'position')).toBe('fixed');
    expect(decl(ribbon, 'block-size')).toBe('2px');
    expect(decl(ribbon, 'z-index')).toBe('90');
    expect(decl(landingRule('.landing .landing-progress-bar'), 'inline-size')).toBe(
      'calc(var(--p, 0) * 100%)'
    );
    expect(decl(landingRule('.landing .landing-progress-bar'), 'background')).toBe(
      'var(--ln-cream)'
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

  it('JourneyLightPath: LIGHT_STROKE rgba(223,237,178,0.85), filter none, STATIC_DASHOFFSET 0.65', () => {
    const src = raw('src/components/landing/JourneyLightPath.tsx');
    expect(src).toContain('const LIGHT_STROKE = "rgba(223,237,178,0.85)"');
    expect(src).toContain('const STATIC_DASHOFFSET = 0.65');
    expect(src).toContain('filter: "none"');
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

describe('r129 parity — OrbitScene canvas port (madarek OrbitScene.tsx @ cf7ffca)', () => {
  it('palette triplets are hardcoded (canvas cannot read CSS vars): cream/lime/violet', () => {
    expect(orbitSceneRaw).toContain('[245, 243, 231] as const');
    expect(orbitSceneRaw).toContain('[223, 237, 178] as const');
    expect(orbitSceneRaw).toContain('[122, 107, 242] as const');
  });

  it('orbit table: omega stays RADIANS PER MILLISECOND (0.00016/0.00011/0.00006) — never converted', () => {
    expect(orbitSceneRaw).toContain('{ f: 0.4, rot: -0.34, omega: 0.00016, mist: 0.42 }');
    expect(orbitSceneRaw).toContain('{ f: 0.61, rot: -0.28, omega: 0.00011, mist: 0.33 }');
    expect(orbitSceneRaw).toContain('{ f: 1, rot: -0.16, omega: 0.00006, mist: 0.24 }');
  });

  it('performance guards: DPR cap 1.5 · dt clamp 48ms · intro bloom 1400ms · TRAIL_MAX 16', () => {
    expect(orbitSceneRaw).toContain('Math.min(window.devicePixelRatio || 1, 1.5)');
    expect(orbitSceneRaw).toContain('Math.min(48, now - last || 16)');
    expect(orbitSceneRaw).toContain('dtGlobal / 1400');
    expect(orbitSceneRaw).toContain('const TRAIL_MAX = 16');
  });

  it('containment-first geometry + parallax + magnetism constants', () => {
    expect(orbitSceneRaw).toContain('orbitR = Math.min(w, h) * 0.45');
    expect(orbitSceneRaw).toContain('squash = w < h ? 0.72 : 0.52');
    expect(orbitSceneRaw).toContain('linkDist = Math.min(190, orbitR * 0.7)');
    expect(orbitSceneRaw).toContain('(mouse.sx - 0.5) * 13');
    expect(orbitSceneRaw).toContain('(mouse.sy - 0.5) * 10');
    expect(orbitSceneRaw).toContain('if (dist < 170 && dist > 0.001)');
    expect(orbitSceneRaw).toContain('(1 - dist / 170) * 14');
  });

  it('pause discipline: IO rootMargin 80px 0px + visibilitychange + scroll fade floor 0.45', () => {
    expect(orbitSceneRaw).toContain("{ rootMargin: '80px 0px' }");
    expect(orbitSceneRaw).toContain("'visibilitychange'");
    expect(orbitSceneRaw).toContain('const fade = 1 - scrollP * 0.55;');
  });

  it('reduced-motion = ONE composed static frame (drawStatic), never a loop; density tiers on saveData/deviceMemory', () => {
    expect(orbitSceneRaw).toContain('function drawStatic()');
    expect(orbitSceneRaw).toContain('if (reducedMotion) return; // static path never loops');
    expect(orbitSceneRaw).toContain('navigator as { deviceMemory?: number }');
    expect(orbitSceneRaw).toContain("density ?? (saveData || lowMemory ? 'low' : 'full')");
  });

  it('hero mount: OrbitScene biasX={-0.35} above depth, below content + the retired horizon span; flat HeroOrbits retired', () => {
    expect(homePageRaw).toContain('<OrbitScene className="ln-hero-canvas" biasX={-0.35} />');
    expect(homePageRaw).toContain('<span className="ln-hero-horizon" />');
    expect(homePageRaw).not.toContain('HeroOrbits');
    expect(decl(landingRule('.landing .ln-hero-horizon'), 'display')).toBe('none');
    expect(existsSync('src/components/landing/HeroOrbits.tsx')).toBe(false);
  });

  it('canvas CSS grammar: ln-scene-in/ln-scene-in-dim keyframes + ≤768 dim (--ln-canvas-op 0.35) + RM off-switch', () => {
    expect(landingCss).toContain('@keyframes ln-scene-in { to { opacity: 1; } }');
    expect(landingCss).toContain('@keyframes ln-scene-in-dim { to { opacity: 0.35; } }');
    const m768 = allTopLevelBlocks(landingCss, '@media (max-width: 768px)').join('\n');
    expect(m768).toContain(
      '.landing .ln-hero-canvas { --ln-canvas-op: 0.35; animation-name: ln-scene-in-dim; }'
    );
    const prmBlocks = allTopLevelBlocks(
      landingCss,
      '@media (prefers-reduced-motion: reduce)'
    );
    expect(
      prmBlocks.some(
        (b) =>
          b.includes('.landing .ln-hero-canvas { animation: none; opacity: var(--ln-canvas-op, 1); }')
      )
    ).toBe(true);
  });

  it('returning-visitor calm: product-scoped sessionStorage key smartmenu.intro.seen + data-intro-seen entrance rule', () => {
    expect(homePageRaw).toContain("'smartmenu.intro.seen'");
    expect(homePageRaw).toContain("data-intro-seen={introSeen ? 'true' : undefined}");
    expect(
      ruleBlock(landingCss, ".landing[data-intro-seen='true'] .ln-hero-canvas")
    ).toContain('animation-duration: var(--ln-t-fast)');
    expect(
      ruleBlock(landingCss, ".landing[data-intro-seen='true'] .ln-hero-canvas")
    ).toContain('animation-delay: 0s');
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

  it('--font-serif: IBM Plex Serif + Georgia (canonical tokens.css:50)', () => {
    pin(dark, 'r129-dark', '--font-serif', '"IBM Plex Serif", Georgia, serif');
  });

  it('--brand-purple = the lavender ink chain (dark #B7A0F4 / light #8A6FE0)', () => {
    pin(dark, 'r129-dark', '--brand-purple', '#B7A0F4');
    pin(light, 'r129-light', '--brand-purple', '#8A6FE0');
  });

  it('--gold-soft = the yellow bg chain (dark #2C2410 / light #FCF1CD)', () => {
    pin(dark, 'r129-dark', '--gold-soft', '#2C2410');
    pin(light, 'r129-light', '--gold-soft', '#FCF1CD');
  });
});

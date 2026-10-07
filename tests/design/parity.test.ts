/**
 * test(r125) — Madarek parity snapshot: pin the canonical design tokens.
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
 *
 * Every pinned literal below was cross-checked against the live SSOT by
 * scripts/parity_matrix.py (download/madarek-parity-matrix.md) — 144/144
 * tokens green at the time of authoring.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── token file → theme scopes ────────────────────────────────────────────────

const css = readFileSync('src/app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

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
    if (source.slice(i, open).trim() === prelude) return source.slice(open + 1, j - 1);
    i = j;
  }
  throw new Error(`top-level block not found: ${prelude}`);
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

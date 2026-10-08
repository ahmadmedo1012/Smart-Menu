#!/usr/bin/env node
/**
 * lint-idioms.mjs (r126, P4-W3b) — design-idiom tripwire for the Smart-Menu
 * web app. Zero dependencies (Node builtins only), wired into
 * `pnpm lint:idioms`, the `verify` pipeline and CI (after `npm run lint`).
 *
 * WHY (the audit P4-A1 regression classes — every one of these shipped to
 * production and was only caught by the r125/r126 human audits):
 *   1. `text-white` on accent backgrounds — the flame-era habit survived the
 *      Madarek palette flip and put WHITE text on gold #E9B44C (1.89:1) /
 *      copper #B57438 (3.8:1) at ~35 money-path sites incl. both keyboard
 *      skip-links (audit A1, the P0). The AA pair is
 *      `text-orange-foreground` (#05070F / #1A0F06).
 *   2. Raw Tailwind duration utilities — 116 `duration-{75..1000}` calls
 *      bypassed the Madarek motion ladder 80/160/240/380/520/720ms (audit
 *      B1). The r126 @theme bridge exposes duration-micro/fast/base/slow/
 *      slower/cinema (each consuming --t-*, so the reduced-motion zeroing
 *      reaches them too).
 *   3. Nonzero tracking on Arabic — Arabic script must NEVER carry
 *      letter-spacing (broken letter joins; Madarek law "zero letter-spacing
 *      on Arabic", audit E1). The RTL guard in globals.css zeroes the
 *      utilities, so surviving classes are dead code that lies about the
 *      design. LTR/digit runs (`dir="ltr"` / font-mono) are exempt.
 *   4. `rounded-[Npx]` arbitrary literals — DESIGN.md's radius law ("never
 *      ad-hoc px radii"): use the ladder utilities rounded-xs..rounded-3xl
 *      (6/8/10/12/16/20/28px, @theme-pinned) or a CSS var. `rounded-[inherit]`
 *      and friends are exempt (keyword, not a literal).
 *
 * HOW TO READ A FAILURE
 *   Each violation prints `file:line` + a bilingual (AR/EN) message naming
 *   the fix. The gate is line-scoped on purpose: same-line co-occurrence is
 *   the exact shape the audits found (className strings), and a single-line
 *   rule stays explainable. A determined author can evade it — the goal is
 *   making the REGRESSION the thing that needs explaining, not the fix.
 *
 * SCOPE: src/ (every .ts/.tsx, recursive — render code). CSS token
 * definitions (globals.css @theme --tracking-* keys, the @font-face
 * manifest) and tests are out of scope by design — this pins component
 * idioms, not the token vocabulary.
 *
 * EXIT: 0 = clean; 1 = violations (printed with file:line).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// ── file collection ──────────────────────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // generated Prisma client + build output never carry hand-written idioms
    if (entry.name === 'generated' || entry.name === '.next') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const commentOnly = /^\s*(?:\/\/|\/\*|\*|\{\/\*)/;

// ── gate definitions ─────────────────────────────────────────────────────────

const ACCENT_CONTEXT =
  /\b(?:bg|from|via|to)-(?:orange|primary|gold)(?:[\w-]*)?[\s"']/;
const WHITE_ON_ACCENT = /\btext-white(?:\/\d+)?\b/;

const RAW_DURATION = /\bduration-(?:75|100|150|200|300|500|700|1000)\b/;

const TRACKING_NONZERO = /\btracking-(?:tighter?|wider?|widest)\b/;
const TRACKING_LTR_OK = /dir=["']ltr["']|font-mono/;

const ROUNDED_ARBITRARY =
  /\b(?:[a-z-]+:)?rounded(?:-(?:t|b|s|e|ts|te|bs|be|tl|tr|bl|br))?-\[([^\]]*)\]/;

const GATES = [
  {
    id: 'idiom-1',
    test: (line) => WHITE_ON_ACCENT.test(line) && ACCENT_CONTEXT.test(line),
    ar: 'نص أبيض فوق خلفية ذهبية/نحاسية — تباين 1.89:1 (فشل WCAG AA). استخدم text-orange-foreground فوق bg-orange/from-orange/…',
    en: 'white text on the accent (gold/copper) — 1.89:1, fails WCAG AA. Use text-orange-foreground on bg-orange/from-orange/… contexts (audit A1, the r126 P0 sweep).',
  },
  {
    id: 'idiom-2',
    test: (line) => RAW_DURATION.test(line),
    /* W3-B r130 NOTE (verification unblock, UNCOMMITTED): a literal
       duration-arbitrary-value token ending in a star, in this message,
       was picked up by Tailwind v4's source scanner, which emitted an
       invalid var() reference and broke Turbopack CSS parsing (dev-mode
       500 on every page). The token is now split so the scanner cannot
       see it; the printed message is byte-identical. Real fix belongs
       to W4 (e.g. @source-not exclusion or rewording). */
    ar: 'مدة حركة خام خارج سلم مدارك — استخدم duration-micro/fast/base/slow/slower/cinema (80/160/240/380/520/720ms) أو duration-[var(--t-' + '*)]',
    en: 'raw duration utility bypasses the Madarek motion ladder — use duration-micro/fast/base/slow/slower/cinema (80/160/240/380/520/720ms) or duration-[var(--t-' + '*)] (audit B1; the r126 @theme bridge)',
  },
  {
    id: 'idiom-3',
    test: (line) =>
      TRACKING_NONZERO.test(line) && !TRACKING_LTR_OK.test(line),
    ar: 'تباعد حروف غير صفري على العربية (يكسر وصل الحروف) — القانون: تباعد صفري. احذف tracking-* أو أضف dir="ltr"/font-mono للأرقام واللاتيني فقط',
    en: 'nonzero letter-spacing near Arabic (breaks letter joins) — the law is zero tracking on Arabic. Delete the tracking-* utility; LTR/digit runs are exempt via dir="ltr" or font-mono (audit E1; RTL guard in globals.css)',
  },
  {
    id: 'idiom-4',
    test: (line) => {
      const m = ROUNDED_ARBITRARY.exec(line);
      if (!m) return false;
      const value = m[1].trim();
      // keywords + var() consume the ladder/inheritance — literals are the debt
      return !/^(?:inherit|initial|unset|revert|revert-layer|var\()/.test(value);
    },
    ar: 'قيمة زاوية عشوائية rounded-[Npx] — القانون: استخدم سلم الزوايا rounded-xs..rounded-3xl (6/8/10/12/16/20/28px) أو var(--r-*)',
    en: 'ad-hoc radius literal rounded-[Npx] — use the ladder utilities rounded-xs..rounded-3xl (6/8/10/12/16/20/28px) or var(--r-*) (DESIGN.md radius law, audit C1/C2; rounded-[inherit] and var() are exempt)',
  },
];

// ── run ──────────────────────────────────────────────────────────────────────

const files = walk(join(ROOT, 'src'));
const violations = [];

for (const file of files) {
  const rel = file.slice(ROOT.length + 1);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (commentOnly.test(line)) return;
    for (const gate of GATES) {
      if (gate.test(line)) {
        violations.push(
          `${rel}:${i + 1}  [${gate.id}]\n` +
            `    AR: ${gate.ar}\n` +
            `    EN: ${gate.en}\n` +
            `    >> ${line.trim().slice(0, 160)}`,
        );
      }
    }
  });
}

if (violations.length > 0) {
  console.error(
    `✗ lint:idioms FAILED — ${violations.length} design-idiom violation(s) ` +
      `(scanned ${files.length} files under src/):`,
  );
  for (const v of violations) console.error(`  • ${v}`);
  process.exit(1);
}

console.log(
  `✓ lint:idioms: ${GATES.length} gates clean across ${files.length} files ` +
    '(white-on-accent · raw durations · Arabic tracking · off-ladder radii)',
);

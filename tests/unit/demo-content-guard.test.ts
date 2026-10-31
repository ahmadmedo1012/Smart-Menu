/**
 * P40-5c (P2-10/P1) — demo-content guard (cheap regression insurance).
 *
 * PRODUCTION TRUTH THAT MOTIVATED IT: the two test artifacts «TestLimitItem»
 * and «كابتشينو اختبار 2» render as (greyed-out) orderable-looking cards on
 * BOTH live demo tenants — https://menu.smart-link.ly/menu/al-waha-cafe and
 * /menu/al-waha-cafe-demo (P40 coordinator live fetch, r145 forensics:
 * created from the OWNER DASHBOARD into the deployed tenant DBs — a
 * repo-wide search found ZERO seed sources; owner cleanup runbook:
 * docs/demo-content-runbook.md). The repo-side sources are clean today —
 * this guard keeps them that way: a future seed/fixture edit that plants a
 * test-artifact name into any public demo-menu source fails CI here.
 *
 * WHAT IS SWEPT (the repo-side sources of PUBLIC demo-menu content):
 *   1. src/app/demo/route.ts — the self-healing demo tenant seed
 *      (al-waha-cafe; production-blocked since round90-F6, still the local
 *      demo session + the landing mirror's documented source of truth).
 *   2. prisma/migrations/20260909_round96_demo_menu/migration.sql — the
 *      curated al-waha-cafe-demo data migration (the QA-journey demo).
 *   3. src/components/landing/landing-data.ts — the landing's verbatim
 *      DEMO_MENU mirror («copied VERBATIM from that seed — nothing
 *      invented», r142).
 *   4. scripts/qa-seed.mjs — ONLY the al-waha-cafe-demo fallback block
 *      (the file intentionally names QA restaurants like «مطعم الاختبار
 *      الثالث» OUTSIDE the demo block — those are auth/IDOR fixtures, not
 *      public menu content, and are deliberately not swept).
 *   5. scripts/round83-seed.mjs — the local verification DB fixture for
 *      al-waha-cafe (e2e showcase plumbing; defines the menu a local run
 *      sees under the flagship demo slug).
 *
 * NOT swept (deliberate): scripts/r93-sim-seed.mjs + scripts/archive/* —
 * hostile-simulation/QA fixtures that never render under a public demo slug.
 *
 * The banned patterns are the two live artifacts plus the generic Arabic
 * test-word family (اختبار) — «تجريبي» is NOT banned: it is the honest
 * demo-labeling vocabulary (P29-D2) the curated demos are REQUIRED to carry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raw = (p: string) =>
        readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), 'utf8');

const DEMO_SOURCES = [
        'src/app/demo/route.ts',
        'prisma/migrations/20260909_round96_demo_menu/migration.sql',
        'src/components/landing/landing-data.ts',
        'scripts/round83-seed.mjs',
] as const;

/** Banned test-artifact vocabulary in public demo-menu content. */
const BANNED = [
        { needle: 'TestLimitItem', label: 'TestLimitItem (the live P40 artifact)' },
        { needle: 'اختبار', label: 'اختبار (test-word family — demo items must be real food)' },
] as const;

describe('P40-5c — no demo/seed source carries test-artifact item names', () => {
        it('every swept source file exists (deleting one must fail loudly, not pass silently)', () => {
                for (const p of DEMO_SOURCES) {
                        expect(() => raw(p), p).not.toThrow();
                }
                // the qa-seed demo block is extracted below — the file must exist too
                expect(() => raw('scripts/qa-seed.mjs')).not.toThrow();
        });

        for (const p of DEMO_SOURCES) {
                it(`${p} carries no banned artifact vocabulary`, () => {
                        const src = raw(p);
                        for (const { needle, label } of BANNED) {
                                expect(src.includes(needle), `${p} → ${label}`).toBe(false);
                        }
                });
        }

        it('scripts/qa-seed.mjs — the al-waha-cafe-demo fallback block carries no banned vocabulary', () => {
                const src = raw('scripts/qa-seed.mjs');
                // the demo block: from the team2-customer comment to the plans section
                const start = src.indexOf('team2-customer journeys');
                const end = src.indexOf('team4-payments');
                expect(start, 'qa-seed demo block start marker').toBeGreaterThan(-1);
                expect(end, 'qa-seed demo block end marker').toBeGreaterThan(start);
                const block = src.slice(start, end);
                // sanity: the extracted block really is the demo-menu section
                expect(block).toContain('al-waha-cafe-demo');
                expect(block.includes('اختبار'), 'qa-seed demo block → اختبار').toBe(false);
                expect(block.includes('TestLimitItem'), 'qa-seed demo block → TestLimitItem').toBe(false);
        });
});

/* ── the landing mirror stays VERBATIM to the demo seed (r142 doctrine) ──
 *
 * landing-data.ts documents «Names, order and prices are copied VERBATIM
 * from that seed — nothing invented (r82)». Nothing enforced that claim —
 * a future edit to either side would silently diverge the landing's
 * «المنيو الحي» chapter from the menu the links actually open. This pin
 * extracts (name, price) pairs from BOTH sources and requires equality.
 */
describe('P40-5c — the landing DEMO_MENU mirror matches the demo seed verbatim', () => {
        const seedSrc = raw('src/app/demo/route.ts');
        const landingSrc = raw('src/components/landing/landing-data.ts');

        /** route.ts createMany rows: name: 'X',\n price: N, (multiline, in order). */
        const seedPairs = [...seedSrc.matchAll(/name:\s*'([^']+)',\s*\n\s*price:\s*(\d+(?:\.\d+)?),/g)].map(
                (m) => [m[1]!, Number(m[2])] as const,
        );
        /** landing-data rows: { name: 'X', price: N } (in order). */
        const landingPairs = [...landingSrc.matchAll(/\{\s*name:\s*'([^']+)',\s*price:\s*(\d+(?:\.\d+)?)\s*\}/g)].map(
                (m) => [m[1]!, Number(m[2])] as const,
        );

        it('both sides expose the curated 16-item demo menu (4 categories × 4)', () => {
                expect(seedPairs).toHaveLength(16);
                expect(landingPairs).toHaveLength(16);
        });

        it('names AND prices are byte-identical, in the same order', () => {
                expect(landingPairs).toEqual(seedPairs);
        });
});

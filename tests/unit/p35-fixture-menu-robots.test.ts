/**
 * P35 — the menu-page fixture robots gate (the fixture doctrine's THIRD
 * surface, after the sitemap P29-D1 and the featured surfaces r92-A1).
 *
 * PRODUCTION TRUTH THAT MOTIVATED IT: the live page
 * https://menu.smart-link.ly/menu/al-waha-cafeewewe served with NO robots
 * meta and the title «مقهى الواحة» — a QA fixture (r96 local-DB residue
 * leaked into production, name cloning the demo cafe, keyboard-mash slug)
 * presenting as a fully indexable real restaurant. The sitemap and every
 * featured surface already exclude the fixture slugs; the PAGE METADATA
 * was the remaining leak — an external link or a direct crawl bypasses
 * both gates and lands the fixture in the search index.
 *
 * These tests pin:
 *   1. isTestFixtureMenu matches exactly TEST_FIXTURE_SLUGS — and never
 *      the curated demos or a genuine slug (over-exclusion is a defect:
 *      the r91-era lesson that wrongly classified al-waha-cafeewewe as a
 *      demo is the cautionary tale pinned in r92-landing-fixtures),
 *   2. generateMetadata: fixture slug → robots noindex,follow (the route
 *      stays reachable — family policy: exclusion is crawl budget, never
 *      a broken link),
 *   3. generateMetadata: a genuine slug AND both curated demos → NO
 *      robots key at all (byte-identical output — indexability and the
 *      honest demo «تجريبي» labeling are untouched),
 *   4. source-contract: the page imports the shared helper (no private
 *      copy of the slug list — the r92-A1 single-source doctrine).
 *
 * Pattern: the r92-landing-fixtures sibling — vi.hoisted mocks, mocked
 * menu-queries + components, no network, no DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockGetRestaurantBySlug = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: { $queryRaw: vi.fn() },
        getUserById: vi.fn(),
        withRetry: vi.fn(),
}));

vi.mock('@/lib/menu-queries', () => ({
        getRestaurantBySlug: mockGetRestaurantBySlug,
}));

vi.mock('next/navigation', () => ({
        notFound: vi.fn(() => {
                throw new Error('notFound() must not fire for these tests');
        }),
}));

vi.mock('@/components/menu/MenuHero', () => ({ MenuHero: () => null }));
vi.mock('@/components/menu/MenuClientSection', () => ({ MenuClientSection: () => null }));
vi.mock('@/components/menu/ReferralHandler', () => ({ ReferralHandler: () => null }));

import { generateMetadata } from '@/app/(public)/menu/[slug]/page';
import { isTestFixtureMenu, TEST_FIXTURE_SLUGS } from '@/lib/landing';

// ── fixtures ────────────────────────────────────────────────────────────

const restaurant = (over: Record<string, unknown> = {}) => ({
        id: 1,
        name: 'مقهى الواحة',
        slug: 'al-waha-cafe',
        description: 'مقهى عائلي بروح ليبية',
        logo: '',
        ...over,
});

const meta = (slug: string) =>
        generateMetadata({ params: Promise.resolve({ slug }) }) as Promise<{
                title?: string;
                robots?: { index: boolean; follow: boolean };
        }>;

beforeEach(() => {
        vi.clearAllMocks();
        mockGetRestaurantBySlug.mockImplementation(async (slug: string) =>
                restaurant({ slug }),
        );
});

// ── 1. the helper is exactly the shared fixture list ───────────────────

describe('isTestFixtureMenu (the shared gate)', () => {
        it('matches every TEST_FIXTURE_SLUGS entry', () => {
                for (const slug of TEST_FIXTURE_SLUGS) {
                        expect(isTestFixtureMenu(slug), slug).toBe(true);
                }
        });

        it('NEVER matches the curated demos or a genuine slug (over-exclusion is a defect)', () => {
                expect(isTestFixtureMenu('al-waha-cafe')).toBe(false);
                expect(isTestFixtureMenu('al-waha-cafe-demo')).toBe(false);
                expect(isTestFixtureMenu('brgr-haws')).toBe(false);
                expect(isTestFixtureMenu('')).toBe(false);
        });
});

// ── 2/3. generateMetadata behavior per slug class ──────────────────────

describe('menu generateMetadata — the fixture robots gate', () => {
        it('a QA-fixture slug gets robots noindex,follow (the live al-waha-cafeewewe defect)', async () => {
                const m = await meta('al-waha-cafeewewe');
                expect(m.robots).toEqual({ index: false, follow: true });
        });

        it('every TEST_FIXTURE_SLUGS entry gets noindex,follow', async () => {
                for (const slug of TEST_FIXTURE_SLUGS) {
                        const m = await meta(slug);
                        expect(m.robots, slug).toEqual({ index: false, follow: true });
                }
        });

        it('a genuine menu renders NO robots meta at all (byte-identical indexable output)', async () => {
                const m = await meta('brgr-haws');
                expect(m.robots).toBeUndefined();
        });

        it('both curated demos stay indexable AND keep the honest «تجريبي» label', async () => {
                for (const slug of ['al-waha-cafe', 'al-waha-cafe-demo']) {
                        const m = await meta(slug);
                        expect(m.robots, slug).toBeUndefined();
                        expect(m.title, slug).toContain('تجريبي');
                }
        });
});

// ── 4. source-contract: the page consumes the shared helper ────────────

describe('wiring (source-contract)', () => {
        it('menu/[slug]/page.tsx imports the shared isTestFixtureMenu — no private slug copy', () => {
                const src = readFileSync(
                        join(process.cwd(), 'src/app/(public)/menu/[slug]/page.tsx'),
                        'utf8',
                );
                expect(src).toContain("isTestFixtureMenu");
                expect(src).toContain("from '@/lib/landing'");
        });
});

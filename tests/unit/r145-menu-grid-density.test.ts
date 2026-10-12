/**
 * r145 (15-SM / Phase-4 final correction wave) — menu grid density pins.
 *
 * Source contracts (the r121-cart-ux + r138 J13 pattern): pin the two live
 * acceptance defects against silent regression.
 *
 *   P1 — sub-640 card blowout: the demo menu grids had NO explicit template
 *   below sm, so the single implicit column track sized `auto` = widest item
 *   max-content. The skipped (content-visibility:auto) wrappers contributed
 *   their `contain-intrinsic-size` WIDTH fallback (480px — `auto 480px` is
 *   two-axis) → every card rendered 480px inside the 358px container at 390,
 *   clipped ~106px past the viewport start edge («أضف» unreachable).
 *   Pin: both MenuPageClient grids + the MenuSkeleton mirror carry explicit
 *   `grid-cols-1` (minmax(0,1fr) — the track clamps to the container), and
 *   the intrinsic-size fallback is width-0 / height-480 (one axis each).
 *
 *   P2 — 2× density (backlog W1 P2-6): the r140 sizes equation assumed the
 *   old max-w-4xl-only container; r142 widened it to xl:max-w-6xl (4 cols
 *   = 268px, featured 2/4 = 552px) but the tail candidates stayed 212px /
 *   440px → the optimizer served 212px-wide images into 266px slots (upscale,
 *   soft even at DPR1; 2× soft on retina). Pin: the exact tail candidates of
 *   both imageSizes equations in MenuItemCard.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('r145 P1 — menu grids declare an explicit sub-640 column (no implicit auto track)', () => {
        const page = src('src/components/menu/MenuPageClient.tsx');
        const skeleton = src('src/components/menu/MenuSkeleton.tsx');

        it('the popular grid starts at grid-cols-1 (minmax(0,1fr) clamps the track)', () => {
                expect(page).toContain('"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"');
        });

        it('the normal grid starts at grid-cols-1 (minmax(0,1fr) clamps the track)', () => {
                expect(page).toContain('"grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"');
        });

        it('the MenuSkeleton mirror grid carries the same explicit first column', () => {
                expect(skeleton).toContain('"grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"');
        });

        it('no menu grid is left template-less below sm (the defect shape is banned)', () => {
                // a `grid gap-*`/`grid` className that jumps straight to sm:grid-cols-*
                // without a base grid-cols-* is exactly the implicit-track trap
                const offenders = [...page.matchAll(/className="grid (?!grid-cols-1)[^"]*sm:grid-cols-2[^"]*"/g)]
                        .map((m) => m[0]);
                expect(offenders).toEqual([]);
                expect(skeleton).not.toMatch(/className="grid (?!grid-cols-1)[^"]*sm:grid-cols-2/);
        });

        it('contain-intrinsic-size fallback is width-0 / height-480 (one axis each)', () => {
                expect(page).toContain("containIntrinsicSize: '0 auto 480px'");
                // the two-axis «auto 480px» (which also set a 480px WIDTH fallback) is gone
                expect(page).not.toContain("containIntrinsicSize: 'auto 480px'");
        });
});

describe('r145 P2 — MenuItemCard imageSizes tails match the r142 container (2× density)', () => {
        const card = src('src/components/menu/MenuItemCard.tsx');

        it('normal cards fetch 268px at ≥1280 (4 cols × max-w-6xl) — was 212px', () => {
                expect(card).toContain(
                        "'(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 24px), (max-width: 1280px) 288px, 268px'",
                );
                expect(card).not.toContain('288px, 212px');
        });

        it('featured cards fetch 552px at ≥1280 (2 of 4 cols) — was 440px', () => {
                expect(card).toContain(
                        "'(max-width: 640px) calc(100vw - 32px), (max-width: 768px) calc(50vw - 24px), (max-width: 1024px) calc(100vw - 32px), (max-width: 1280px) 576px, 552px'",
                );
                expect(card).not.toContain('576px, 440px');
        });
});

/**
 * round92-A9 — cart count grammar for screen readers (live audit A9).
 *
 * The cart trigger's aria-label read «السلة - 1 أصناف» (and the sheet header
 * «1 أصناف») — a singular count glued to a plural noun: broken Arabic read
 * aloud by assistive tech. Both surfaces now call cartCountPhrase(), which
 * routes through the project's src/lib/arabic-plural.ts (six noun-number
 * states). These tests pin the phrase for the required values 0/1/2/5/15 —
 * plus the CLDR boundary the shared lib pins (11 vs 103) and a wiring guard
 * that the component actually uses the helper (not a re-inlined copy).
 *
 * The sibling lib rules themselves are already pinned by
 * tests/unit/arabic-plural.test.ts (untouched — r92 adds, never modifies).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cartCountPhrase } from '@/components/menu/CartSlideOver';

describe('cartCountPhrase — السلة count grammar (round92-A9)', () => {
    it('the five audited values: 0/1/2/5/15', () => {
        // 0 → «فارغة» (component hides the trigger at 0, but the phrase stays total)
        expect(cartCountPhrase(0)).toBe('فارغة');
        // 1 → singular, count carried grammatically by «واحد»
        expect(cartCountPhrase(1)).toBe('صنف واحد');
        // 2 → dual
        expect(cartCountPhrase(2)).toBe('صنفان');
        // 3–10 → plural with the numeral
        expect(cartCountPhrase(5)).toBe('5 أصناف');
        // 11+ → accusative singular with the numeral
        expect(cartCountPhrase(15)).toBe('15 صنفًا');
    });

    it('never regresses to the audited broken form «N أصناف» for singular/dual', () => {
        expect(cartCountPhrase(1)).not.toContain('أصناف');
        expect(cartCountPhrase(2)).not.toContain('أصناف');
    });

    it('follows the shared lib CLDR boundaries (11 many / 103 few)', () => {
        expect(cartCountPhrase(11)).toBe('11 صنفًا'); // 11..99 → many → singular
        expect(cartCountPhrase(99)).toBe('99 صنفًا');
        expect(cartCountPhrase(103)).toBe('103 أصناف'); // 103 % 100 = 3 → few
        expect(cartCountPhrase(100)).toBe('100 صنفًا'); // CLDR other → many
    });

    it('wiring guard: the component uses cartCountPhrase in both surfaces', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/components/menu/CartSlideOver.tsx'),
            'utf8',
        );
        // the trigger aria-label routes through the helper…
        expect(src).toContain('aria-label={`السلة - ${cartCountPhrase(totalItems)}`}');
        // …and the sheet header count does too
        expect(src).toMatch(/\{cartCountPhrase\(totalItems\)\}<\/span>/);
        // the broken audited form must not come back
        expect(src).not.toContain('أصناف`}');
    });
});

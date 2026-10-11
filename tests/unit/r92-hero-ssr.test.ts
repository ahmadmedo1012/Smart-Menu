/**
 * round92-A7 — hero LCP visibility (SSR contract). r128-F1b: carried to
 * the Madarek-journey hero inside HomePage.
 *
 * Live-audit A7: the hero h1 entered via framer-motion `hidden` variants, so
 * SSR emitted `<h1 style="opacity:0; transform:translateY(16px)">` — the LCP
 * text waited for JS hydration, not the network (prod TTFB 99ms / LCP
 * 1832–3052ms). The fix renders the h1 as a plain element (visible in the
 * SSR HTML on first paint). The r128-F1b journey hero keeps the contract
 * the strong way: the h1 AND the sub paint inline with no reveal class, no
 * entrance animation and no style attribute at all — the eyebrow/actions
 * meta ride the observer-gated reveal family around them. These tests pin
 * that so a future "hidden initial" cannot silently regress it:
 *   - h1 markup carries NO pre-hydration hidden inline style and NO
 *     reveal gating (the observer never gates the LCP text),
 *   - the LCP headline text + sub + CTAs are present in the rendered
 *     output.
 *
 * Rendered with react-dom/server (same path Next.js SSR takes for the
 * client-component island) — no DOM environment needed.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { HomePage } from '@/components/landing/HomePage';

describe('journey hero SSR — round92-A7 LCP visibility (r128-F1b)', () => {
    const html = renderToString(createElement(HomePage, {}));

    it('renders the LCP headline text in the server HTML', () => {
        /* r142 «المائدة»: the hero copy became the menu's opening line —
           the LCP doctrine is unchanged: h1 + sub paint server-side. */
        expect(html).toContain('منيوٌ يُقرأ بشهية،');
        expect(html).toContain('على واتساب');
        // the sub paints inline too (no reveal gate on the LCP pair)
        expect(html).toContain('يحوّل منيو مطعمك إلى مائدة رقمية');
        // CTA buttons render server-side too (no hydration gate for CTAs)
        expect(html).toContain('ابدأ مجاناً');
    });

    it('h1 carries NO hidden pre-hydration style (the A7 regression guard)', () => {
        const h1 = html.match(/<h1[^>]*>/);
        expect(h1).not.toBeNull();
        // the exact A7 evidence: framer initial hidden inline styles
        expect(h1![0]).not.toMatch(/opacity:\s*0/);
        expect(h1![0]).not.toMatch(/translateY\(\s*16px\s*\)/);
        // and it is a plain element (no motion-variant span wrappers either)
        expect(h1![0]).not.toContain('style=');
    });

    it('the h1 never rides the observer-gated reveal family (LCP needs no JS)', () => {
        const h1 = html.match(/<h1[^>]*>/);
        expect(h1).not.toBeNull();
        expect(h1![0]).not.toContain('reveal-up');
    });
});

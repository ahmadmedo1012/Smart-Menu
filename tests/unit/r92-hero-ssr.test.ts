/**
 * round92-A7 — hero LCP visibility (SSR contract).
 *
 * Live-audit A7: the hero h1 entered via framer-motion `hidden` variants, so
 * SSR emitted `<h1 style="opacity:0; transform:translateY(16px)">` — the LCP
 * text waited for JS hydration, not the network (prod TTFB 99ms / LCP
 * 1832–3052ms). The fix renders the h1 as a plain element (visible in the
 * SSR HTML on first paint) with a pure-CSS settle animation whose keyframe
 * starts VISIBLE. These tests pin the SSR contract so a future framer
 * "hidden initial" cannot silently regress it:
 *   - h1 markup carries NO pre-hydration hidden inline style,
 *   - the entrance stylesheet ships in the server HTML (no JS gate),
 *   - the LCP headline text + CTAs are present in the rendered output.
 *
 * Rendered with react-dom/server (same path Next.js SSR takes for the
 * client-component island) — no DOM environment needed.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { HeroSection } from '@/components/landing/HeroSection';

describe('HeroSection SSR — round92-A7 LCP visibility', () => {
    const html = renderToString(createElement(HeroSection, {}));

    it('renders the LCP headline text in the server HTML', () => {
        expect(html).toContain('منيو رقمي لمطعمك');
        expect(html).toContain('الطلبات تصل');
        // CTA buttons render server-side too (no hydration gate for CTAs)
        expect(html).toContain('ابدأ مجاناً');
        expect(html).toContain('تسجيل الدخول');
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

    it('the CSS-only entrance ships in the server HTML (works without JS)', () => {
        // hoisted React 19 style resource, present in the first-paint payload
        expect(html).toContain('<style data-precedence="high" data-href="r92-hero-entrance"');
        // the settle keyframe — starts VISIBLE (translate-only, opacity never 0)
        expect(html).toContain('@keyframes r92-hero-settle');
        expect(html).not.toMatch(/@keyframes r92-hero-settle\{[^}]*opacity:\s*0/);
        // the h1 opts into it via class
        expect(html).toMatch(/<h1 class="[^"]*r92-hero-settle/);
    });
});
